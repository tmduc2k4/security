const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: String,
  action: {
    type: String,
    enum: [
      'login_success',
      'login_failed',
      'logout',
      'register',
      'password_change',
      'password_reset',
      'profile_update',
      '2fa_enable',
      '2fa_disable',
      '2fa_verify',
      'user_create',
      'user_update',
      'user_delete',
      'role_change',
      'permission_grant',
      'account_lock',
      'account_unlock',
      'email_verify',
      'profile_view',
      'settings_change'
    ],
    required: true
  },
  resourceType: {
    type: String,
    enum: ['user', 'profile', 'security', 'account', 'system'],
    required: true
  },
  resourceId: mongoose.Schema.Types.ObjectId,
  description: String,
  ipAddress: String,
  userAgent: String,
  statusCode: Number,
  changes: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info'
  },
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: String
}, {
  timestamps: {
    createdAt: 'timestamp',
    updatedAt: false
  },
  collection: 'audit_logs'
});

// Index cho query nhanh
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ ipAddress: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
