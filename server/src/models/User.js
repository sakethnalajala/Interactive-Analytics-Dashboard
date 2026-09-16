import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const ROLES = ['super_admin', 'admin', 'analyst', 'viewer'];
export const DATE_PRESETS = ['7d', '30d', '90d', '12m', 'ytd'];

const refreshTokenSchema = new mongoose.Schema(
  {
    jti: { type: String, required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    userAgent: { type: String, default: '' },
    usedAt: { type: Date }, // set on rotation; token is honoured for a short grace window afterwards
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'viewer', index: true },
    isActive: { type: Boolean, default: true },
    avatarColor: { type: String, default: '#4318FF' },
    jobTitle: { type: String, default: '', maxlength: 80 },
    preferences: {
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
      defaultDateRange: { type: String, enum: DATE_PRESETS, default: '30d' },
      compactTables: { type: Boolean, default: false },
    },
    lastLoginAt: { type: Date },
    refreshTokens: { type: [refreshTokenSchema], default: [], select: false },
  },
  { timestamps: true },
);

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.statics.hashPassword = function (plain) {
  return bcrypt.hash(plain, 12);
};

/** Public projection — never leaks hashes or tokens. */
userSchema.methods.toPublic = function () {
  return {
    id: String(this._id),
    name: this.name,
    email: this.email,
    role: this.role,
    isActive: this.isActive,
    avatarColor: this.avatarColor,
    jobTitle: this.jobTitle,
    preferences: this.preferences,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model('User', userSchema);
