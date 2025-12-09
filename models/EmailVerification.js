const mongoose = require('mongoose');
const crypto = require('crypto');

const emailVerificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  token: {
    type: String,
    required: true
  },
  tokenHash: {
    type: String,
    required: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    index: { expireAfterSeconds: 86400 } // Auto-delete after 24 hours
  },
  attempts: {
    type: Number,
    default: 0
  },
  lastAttempt: Date
}, {
  timestamps: true
});

// Index cho nhanh chóng
emailVerificationSchema.index({ tokenHash: 1 });
emailVerificationSchema.index({ userId: 1 });

module.exports = mongoose.model('EmailVerification', emailVerificationSchema);
