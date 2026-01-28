// routes/subscriptionRoutes.js

import express from 'express';
const router = express.Router();
import { protect } from '../middleware/authMiddleware.js';
import { submitProof, checkStatus } from '../controllers/subscriptionController.js';

// Configuration Multer pour Cloudinary
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js'; // Assure-toi que ce fichier existe

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'yely_proofs', // Dossier dans Cloudinary
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});

const upload = multer({ storage: storage });

// Routes
router.post('/submit-proof', protect, upload.single('proofImage'), submitProof);
router.get('/status', protect, checkStatus);

export default router;