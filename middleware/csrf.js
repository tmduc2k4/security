/**
 * CSRF (Cross-Site Request Forgery) Protection Middleware
 * Bảo vệ form submission khỏi CSRF attacks
 */

const crypto = require('crypto');

/**
 * Middleware tạo CSRF token
 */
const generateCSRFToken = (req, res, next) => {
  if (!req.session) {
    return next();
  }

  // Tạo token mới nếu chưa có
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }

  // Lưu token vào local variable để dùng trong template
  res.locals.csrfToken = req.session.csrfToken;

  next();
};

/**
 * Middleware kiểm tra CSRF token
 * Sử dụng cho POST, PUT, DELETE requests
 */
const verifyCsrfToken = (req, res, next) => {
  // Bỏ qua check cho GET requests
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  // Kiểm tra session
  if (!req.session || !req.session.csrfToken) {
    console.warn('CSRF token missing from session');
    
    if (req.headers['content-type']?.includes('application/json')) {
      return res.status(403).json({ 
        error: 'CSRF token không hợp lệ. Vui lòng load lại trang.' 
      });
    }
    
    return res.status(403).redirect('/login?error=CSRF%20token%20hết%20hạn');
  }

  // Lấy token từ request (3 cách)
  const token = req.body._csrf || req.headers['x-csrf-token'] || req.query._csrf;

  // So sánh token
  if (!token || token !== req.session.csrfToken) {
    console.warn(`CSRF token mismatch for user ${req.user ? req.user.username : 'unknown'}`);
    
    // Xử lý CSRF token mismatch
    if (req.headers['content-type']?.includes('application/json')) {
      return res.status(403).json({ 
        error: 'CSRF token không hợp lệ' 
      });
    }
    
    // Redirect về login với message
    return res.status(403).redirect('/login?error=CSRF%20token%20không%20hợp%20lệ');
  }

  next();
};

/**
 * Middleware làm mới CSRF token sau mỗi request
 */
const refreshCSRFToken = (req, res, next) => {
  if (req.session) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    res.locals.csrfToken = req.session.csrfToken;
  }
  next();
};

module.exports = {
  generateCSRFToken,
  verifyCsrfToken,
  refreshCSRFToken
};
