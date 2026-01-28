// kevyamon/yely_backend/routes/subscriptionRoutes.js
import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/authMiddleware.js'; // Note le .js !
import { submitSubscriptionProof } from '../controllers/subscriptionController.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post(
  '/submit-proof',
  protect,
  upload.single('proofImage'), 
  submitSubscriptionProof
);

export default router;