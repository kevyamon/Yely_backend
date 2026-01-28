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
import { promises as fsPromises } from 'fs';
import fs from 'fs';
import { execSync } from 'child_process';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import connectDB from './config/db.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import socketManager from './utils/socketManager.js';

import userRoutes from './routes/userRoutes.js';
import rideRoutes from './routes/rideRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import adminValidationRoutes from './routes/adminValidationRoutes.js';
import adminDashboardRoutes from './routes/adminDashboardRoutes.js';

connectDB();

const app = express();

app.set('trust proxy', 1);

const port = process.env.PORT || 5000;

app.use(helmet());
app.use(mongoSanitize());
app.use(xss());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'La forteresse détecte une activité suspecte. Réessayez plus tard.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

const corsOptions = {
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'https://yely-frontend.onrender.com',
    'http://localhost:3000'
  ],
  credentials: true,
};
app.use(cors(corsOptions));

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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
    console.log('📁 Dossier uploads créé avec succès.');
}

app.use('/api/users', userRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/admin/validations', adminValidationRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);

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
    const packageJsonData = await fsPromises.readFile(packageJsonPath, 'utf8');
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

app.use(notFound);
app.use(errorHandler);

server.listen(port, () =>
  console.log(`🚀 Serveur Yély en ligne sur le port ${port}`)
);