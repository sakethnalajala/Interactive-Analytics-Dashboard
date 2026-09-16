import mongoose from 'mongoose';

/** Singleton organisation settings document (key = 'org'). */
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'org', unique: true },
    orgName: { type: String, default: 'Nova Commerce', maxlength: 80 },
    currency: { type: String, enum: ['USD', 'EUR', 'GBP', 'INR'], default: 'USD' },
    timezone: { type: String, default: 'UTC' },
    fiscalYearStartMonth: { type: Number, min: 1, max: 12, default: 1 },
    lowStockThreshold: { type: Number, min: 0, default: 15 },
    weekStartsOn: { type: String, enum: ['monday', 'sunday'], default: 'monday' },
  },
  { timestamps: true },
);

settingSchema.statics.get = async function () {
  return (await this.findOne({ key: 'org' })) || (await this.create({ key: 'org' }));
};

export const Setting = mongoose.model('Setting', settingSchema);
