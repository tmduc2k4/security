/**
 * Role-Based Access Control (RBAC) Middleware
 * Kiểm tra quyền hạn dựa trên role của user
 */

/**
 * Middleware kiểm tra role
 * Usage: app.get('/admin', requireRole('admin'), handler)
 */
const requireRole = (allowedRoles) => {
  // Nếu allowedRoles là string, convert thành array
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    // Kiểm tra user đã login chưa
    if (!req.user) {
      return res.status(401).render('error', {
        message: 'Vui lòng đăng nhập trước',
        currentUser: null
      });
    }

    // Kiểm tra role
    if (!roles.includes(req.user.role)) {
      return res.status(403).render('error', {
        message: 'Bạn không có quyền truy cập trang này',
        currentUser: req.user
      });
    }

    // Kiểm tra tài khoản có active không
    if (!req.user.isActive) {
      return res.status(403).render('error', {
        message: 'Tài khoản của bạn đã bị vô hiệu hóa',
        currentUser: req.user
      });
    }

    next();
  };
};

/**
 * Middleware kiểm tra permission cụ thể
 * Usage: app.get('/users', requirePermission('view_users'), handler)
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    // Kiểm tra user đã login chưa
    if (!req.user) {
      return res.status(401).render('error', {
        message: 'Vui lòng đăng nhập trước',
        currentUser: null
      });
    }

    // SuperAdmin có tất cả permissions
    if (req.user.role === 'superadmin') {
      return next();
    }

    // Kiểm tra permission
    if (!req.user.permissions.includes(permission)) {
      return res.status(403).render('error', {
        message: 'Bạn không có quyền thực hiện hành động này',
        currentUser: req.user
      });
    }

    next();
  };
};

/**
 * Middleware kiểm tra role và permission
 * Usage: app.get('/users', requireRoleAndPermission(['admin', 'superadmin'], 'view_users'), handler)
 */
const requireRoleAndPermission = (allowedRoles, permission) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    // Kiểm tra user đã login chưa
    if (!req.user) {
      return res.status(401).render('error', {
        message: 'Vui lòng đăng nhập trước',
        currentUser: null
      });
    }

    // Kiểm tra role
    if (!roles.includes(req.user.role)) {
      return res.status(403).render('error', {
        message: 'Bạn không có quyền truy cập',
        currentUser: req.user
      });
    }

    // SuperAdmin bypass permission check
    if (req.user.role === 'superadmin') {
      return next();
    }

    // Kiểm tra permission
    if (!req.user.permissions.includes(permission)) {
      return res.status(403).render('error', {
        message: 'Bạn không có quyền thực hiện hành động này',
        currentUser: req.user
      });
    }

    next();
  };
};

/**
 * Middleware set default permissions dựa trên role
 */
const setDefaultPermissions = (req, res, next) => {
  if (!req.user) {
    return next();
  }

  // Nếu chưa có permissions, set default dựa trên role
  if (!req.user.permissions || req.user.permissions.length === 0) {
    switch (req.user.role) {
      case 'superadmin':
        req.user.permissions = [
          'view_profile',
          'edit_profile',
          'view_users',
          'edit_users',
          'delete_users',
          'view_logs',
          'manage_roles',
          'manage_system'
        ];
        break;
      case 'admin':
        req.user.permissions = [
          'view_profile',
          'edit_profile',
          'view_users',
          'edit_users',
          'delete_users',
          'view_logs'
        ];
        break;
      case 'user':
      default:
        req.user.permissions = [
          'view_profile',
          'edit_profile'
        ];
        break;
    }
  }

  next();
};

module.exports = {
  requireRole,
  requirePermission,
  requireRoleAndPermission,
  setDefaultPermissions
};
