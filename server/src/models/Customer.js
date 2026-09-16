import mongoose from 'mongoose';

export const SEGMENTS = ['new', 'regular', 'vip', 'inactive'];

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    country: { type: String, required: true, index: true },
    city: { type: String, default: '' },
    segment: { type: String, enum: SEGMENTS, default: 'new', index: true },
    avatarColor: { type: String, default: '#4318FF' },
    // Denormalised for fast list views; maintained by seed and order status updates.
    totalSpent: { type: Number, default: 0, min: 0 },
    orderCount: { type: Number, default: 0, min: 0 },
    lastOrderAt: { type: Date },
    lastActiveAt: { type: Date },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

customerSchema.index({ totalSpent: -1 });

export const Customer = mongoose.model('Customer', customerSchema);
