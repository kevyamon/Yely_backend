// server.js
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

// Importations des configurations et des outils de sécurité
import connectDB from './config/db.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import socketManager from './utils/socketManager.js';

// Importations des panneaux indicateurs (Routes)
import userRoutes from './routes/userRoutes.js';
import rideRoutes from './routes/rideRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';

// Connexion à la base de données MongoDB
connectDB();

const app = express();
const port = process.env.PORT || 5000;

// --- BOUCLIERS DE LA FORTERESSE (SÉCURITÉ MAX) ---

// 1. Helmet : Cache les détails techniques du serveur (Empêche les pirates d'étudier nos murs)
app.use(helmet());

// 2. Mongo Sanitize : Empêche les injections de code malveillant dans la base de données
app.use(mongoSanitize());

// 3. XSS Clean : Nettoie les données entrantes pour éviter l'exécution de scripts pirates
app.use(xss());

// 4. Rate Limit : Empêche les robots de saturer le serveur en frappant trop vite à la porte
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limite à 100 requêtes par IP
  message: 'La forteresse détecte une activité suspecte. Réessayez plus tard.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Configuration CORS (Définit qui a le droit d'entrer dans le château)
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true, // Crucial pour que le badge de sécurité (Cookie JWT) puisse circuler
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

// Initialisation du gestionnaire de radio (Mapping et alertes)
socketManager.init(io);

// Rend "io" accessible partout pour envoyer des messages instantanés
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Middlewares pour lire les données (JSON, Formulaires et Cookies)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Pour lire le badge de sécurité invisible

// --- ROUTES DE L'APPLICATION (LES COULOIRS DU CHÂTEAU) ---

// Gestion des comptes, profil et rôles
app.use('/api/users', userRoutes);

// Gestion des trajets, mapping et prix calculés par le serveur
app.use('/api/rides', rideRoutes);

// Gestion de l'argent, recharges Wave et retraits chauffeurs
app.use('/api/payments', paymentRoutes);

// --- LA PÉPITE DE VERSIONING (GIT SYNC - LOGIQUE GTY EXPRESS) ---
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

// Message d'accueil de la Forteresse
app.get('/', (req, res) => {
  res.send("🚀 LA FORTERESSE YÉLY EST OPÉRATIONNELLE - MAFÉRÉ TECH CITY");
});

// --- GESTION DES ERREURS (FILETS DE SÉCURITÉ) ---
app.use(notFound);
app.use(errorHandler);

// Allumage final du moteur
server.listen(port, () =>
  console.log(`🚀 Serveur Yély en ligne sur le port ${port}`)
);