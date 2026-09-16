import mongoose from 'mongoose';

/** Ordered funnel — a session records the deepest stage it reached. */
export const FUNNEL_STAGES = ['visit', 'product_view', 'add_to_cart', 'checkout', 'purchase'];
export const DEVICES = ['desktop', 'mobile', 'tablet'];
export const SOURCES = ['organic', 'direct', 'paid', 'social', 'email', 'referral'];

const sessionSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null, index: true },
    startedAt: { type: Date, required: true, index: true },
    durationSec: { type: Number, required: true, min: 0 },
    pageViews: { type: Number, required: true, min: 1 },
    device: { type: String, enum: DEVICES, required: true },
    source: { type: String, enum: SOURCES, required: true },
    funnelStage: { type: String, enum: FUNNEL_STAGES, required: true, index: true },
    // 0..4 numeric index of funnelStage so "reached >= stage" is a cheap comparison
    funnelIndex: { type: Number, required: true, min: 0, max: 4 },
    country: { type: String, required: true },
  },
  { timestamps: false },
);

sessionSchema.index({ startedAt: 1, funnelIndex: 1 });

export const Session = mongoose.model('Session', sessionSchema);
