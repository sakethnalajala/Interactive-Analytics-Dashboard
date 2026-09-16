import mongoose from 'mongoose';

export const CATEGORIES = ['Electronics', 'Apparel', 'Home & Living', 'Beauty', 'Sports', 'Books', 'Toys', 'Grocery'];

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120, index: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    category: { type: String, enum: CATEGORIES, required: true, index: true },
    price: { type: Number, required: true, min: 0 },
    cost: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    reviewCount: { type: Number, min: 0, default: 0 },
    description: { type: String, default: '', maxlength: 1000 },
    color: { type: String, default: '#4318FF' },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const Product = mongoose.model('Product', productSchema);
