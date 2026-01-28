// kevyamon/yely_backend/models/transactionModel.js
import mongoose from 'mongoose';

const transactionSchema = mongoose.Schema(
  {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: { type: Number, required: true },
    type: {
      type: String,
      enum: ['WEEKLY', 'MONTHLY'],
      required: true,
    },
    paymentPhoneNumber: { type: String, required: true },
    proofImageUrl: { type: String, required: true },
    proofImagePublicId: { type: String, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    assignedTo: {
      type: String,
      enum: ['SUPERADMIN', 'PARTNER'],
      required: true,
    },
    validatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;