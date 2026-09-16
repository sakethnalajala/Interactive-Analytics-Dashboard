import mongoose from 'mongoose';

export const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
/** Statuses whose totals count towards revenue. */
export const REVENUE_STATUSES = ['processing', 'shipped', 'delivered'];
export const PAYMENT_METHODS = ['card', 'paypal', 'bank_transfer', 'wallet', 'cod'];
export const CHANNELS = ['web', 'mobile_app', 'marketplace'];

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true }, // snapshot at purchase time
    category: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    unitCost: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    customerName: { type: String, required: true }, // snapshot for fast list rendering & search
    customerEmail: { type: String, required: true },
    items: { type: [orderItemSchema], required: true, validate: (v) => v.length > 0 },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    shipping: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending', index: true },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    channel: { type: String, enum: CHANNELS, default: 'web' },
    country: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

orderSchema.index({ createdAt: -1, status: 1 });
orderSchema.index({ customerName: 1 });

export const Order = mongoose.model('Order', orderSchema);
