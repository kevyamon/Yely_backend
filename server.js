// backend/server.js
import path from 'path';
import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { Server } from 'socket.io';
import http from 'http';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import { execSync } from 'child_process';

// Chargement des variables d'environnement
dotenv.config();

// Importations des configurations
import connectDB from './config/db.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import socketManager from './utils/socketManager.js';

// Importations des Routes
import userRoutes from './routes/userRoutes.js';
import rideRoutes from './routes/rideRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

// Connexion à la base de données MongoDB
connectDB();

const app = express();

// --- CORRECTION RENDER (TRUST PROXY) ---
// Indispensable pour que le rateLimit fonctionne sur Render/Heroku/AWS
app.set('trust proxy', 1); 
// ---------------------------------------

const port = process.env.PORT || 5000;

// --- BOUCLIERS DE LA FORTERESSE (SÉCURITÉ MAX) ---

// 1. Helmet
app.use(helmet());

// 2. Mongo Sanitize
app.use(mongoSanitize());

// 3. XSS Clean
app.use(xss());

// 4. Rate Limit (C'est lui qui posait problème sans le 'trust proxy')
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limite à 100 requêtes
  message: 'La forteresse détecte une activité suspecte. Réessayez plus tard.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Configuration CORS
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'https://yely-frontend.onrender.com', // (Au cas où tu déploies le front aussi)
    'http://localhost:3000'
  ],
  credentials: true,
};
app.use(cors(corsOptions));

// --- CONFIGURATION DU TEMPS RÉEL (SOCKET.IO) ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: corsOptions.origin,
    methods: ['GET', 'POST'],
  },
});

socketManager.init(io);

app.use((req, res, next) => {
  req.io = io;
  next();
});

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- ROUTES ---
app.use('/api/users', userRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);

// --- VERSIONING ---
const getGitCommitHash = () => {
  try {
    return execSync('git rev-parse HEAD').toString().trim();
  } catch (e) {
    return 'mode_developpement';
  }
};

app.get('/api/version', async (req, res) => {
  try {
    const packageJsonPath = path.resolve(process.cwd(), 'package.json');
    const packageJsonData = await fs.readFile(packageJsonPath, 'utf8');
    const { version } = JSON.parse(packageJsonData);
    const commitHash = getGitCommitHash();
    res.json({ version, commitHash });
  } catch (error) {
    res.status(500).json({ message: "Erreur de lecture de version" });
  }
});

app.get('/', (req, res) => {
  res.send("🚀 LA FORTERESSE YÉLY EST OPÉRATIONNELLE - MAFÉRÉ TECH CITY");
});

// --- GESTION DES ERREURS ---
app.use(notFound);
app.use(errorHandler);

// Allumage
server.listen(port, () =>
  console.log(`🚀 Serveur Yély en ligne sur le port ${port}`)
);