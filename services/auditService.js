/**
 * Audit Logging Service
 * Log tất cả user actions để tracking và security monitoring
 */

const AuditLog = require('../models/AuditLog');

/**
 * Log user action
 * @param {String} action - Action name (login_success, password_change, etc.)
 * @param {String} resourceType - Resource type (user, profile, security, account, system)
 * @param {Object} options - Additional options
 *   - userId: User ID
 *   - resourceId: Resource ID (optional)
 *   - ipAddress: IP address
 *   - userAgent: User agent string
 *   - description: Action description
 *   - changes: Object with before/after values
 *   - success: true/false
 *   - errorMessage: Error message if failed
 */
async function logAction(action, resourceType, options = {}) {
  try {
    // userId is optional - for anonymous/failed login attempts
    const log = new AuditLog({
      userId: options.userId || null,  // Allow null for anonymous actions
      username: options.username || 'unknown',
      action,
      resourceType,
      resourceId: options.resourceId,
      description: options.description,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      statusCode: options.statusCode,
      changes: options.changes,
      severity: options.severity || getSeverity(action),
      success: options.success !== false,
      errorMessage: options.errorMessage
    });

    await log.save();
    return log;
  } catch (error) {
    console.error('Failed to log action:', error);
  }
}

/**
 * Determine severity based on action
 */
function getSeverity(action) {
  const criticalActions = [
    'password_change',
    'password_reset',
    '2fa_enable',
    'role_change',
    'user_delete',
    'permission_grant'
  ];

  const warningActions = [
    'login_failed',
    'account_lock'
  ];

  if (criticalActions.includes(action)) return 'critical';
  if (warningActions.includes(action)) return 'warning';
  return 'info';
}

/**
 * Get user activity logs
 */
async function getUserLogs(userId, options = {}) {
  const query = { userId };

  if (options.action) {
    query.action = options.action;
  }

  if (options.startDate || options.endDate) {
    query.timestamp = {};
    if (options.startDate) {
      query.timestamp.$gte = new Date(options.startDate);
    }
    if (options.endDate) {
      query.timestamp.$lte = new Date(options.endDate);
    }
  }

  const limit = options.limit || 50;
  const skip = (options.page || 0) * limit;

  const logs = await AuditLog.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip);

  const total = await AuditLog.countDocuments(query);

  return {
    logs,
    total,
    page: options.page || 0,
    limit,
    pages: Math.ceil(total / limit)
  };
}

/**
 * Get all system logs (admin only)
 */
async function getSystemLogs(options = {}) {
  const query = {};

  if (options.action) {
    query.action = options.action;
  }

  if (options.userId) {
    query.userId = options.userId;
  }

  if (options.ipAddress) {
    query.ipAddress = options.ipAddress;
  }

  if (options.severity) {
    query.severity = options.severity;
  }

  if (options.startDate || options.endDate) {
    query.timestamp = {};
    if (options.startDate) {
      query.timestamp.$gte = new Date(options.startDate);
    }
    if (options.endDate) {
      query.timestamp.$lte = new Date(options.endDate);
    }
  }

  const limit = options.limit || 100;
  const skip = (options.page || 0) * limit;

  const logs = await AuditLog.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip);

  const total = await AuditLog.countDocuments(query);

  return {
    logs,
    total,
    page: options.page || 0,
    limit,
    pages: Math.ceil(total / limit)
  };
}

/**
 * Get suspicious activities (failed logins, lockouts, etc.)
 */
async function getSuspiciousActivities(options = {}) {
  const query = {
    action: { $in: ['login_failed', 'account_lock'] }
  };

  if (options.ipAddress) {
    query.ipAddress = options.ipAddress;
  }

  if (options.hours) {
    const since = new Date(Date.now() - options.hours * 60 * 60 * 1000);
    query.timestamp = { $gte: since };
  }

  const logs = await AuditLog.find(query)
    .sort({ timestamp: -1 })
    .limit(options.limit || 50);

  return logs;
}

/**
 * Get activity stats
 */
async function getActivityStats(options = {}) {
  const match = {};

  if (options.startDate || options.endDate) {
    match.timestamp = {};
    if (options.startDate) {
      match.timestamp.$gte = new Date(options.startDate);
    }
    if (options.endDate) {
      match.timestamp.$lte = new Date(options.endDate);
    }
  }

  const stats = await AuditLog.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  return stats;
}

module.exports = {
  logAction,
  getUserLogs,
  getSystemLogs,
  getSuspiciousActivities,
  getActivityStats
};
