const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Secret key cho JWT (nên lưu trong .env)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Tạo JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Middleware xác thực user đã đăng nhập
const requireAuth = async (req, res, next) => {
  try {
    // Kiểm tra token từ cookie hoặc header
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      if (req.headers['content-type']?.includes('application/json')) {
        return res.status(401).json({ error: 'Vui lòng đăng nhập để tiếp tục' });
      }
      return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      if (req.headers['content-type']?.includes('application/json')) {
        return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
      }
      return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
    }

    // Lấy user từ database
    const user = await User.findById(decoded.userId);
    if (!user) {
      if (req.headers['content-type']?.includes('application/json')) {
        return res.status(401).json({ error: 'User không tồn tại' });
      }
      return res.redirect('/login');
    }

    // Gắn user vào request
    req.user = user;
    req.userId = user._id.toString();
    res.locals.user = user; // Để sử dụng trong EJS templates
    next();
  } catch (error) {
    console.error('Auth error:', error);
    if (req.headers['content-type']?.includes('application/json')) {
      return res.status(500).json({ error: 'Lỗi xác thực' });
    }
    return res.redirect('/login');
  }
};

// Middleware kiểm tra user chưa đăng nhập (cho trang login/register)
const requireGuest = (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      return res.redirect('/profile');
    }
  }
  
  next();
};

// Middleware optional auth - không bắt buộc đăng nhập nhưng load user nếu có
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        const user = await User.findById(decoded.userId);
        if (user) {
          req.user = user;
          req.userId = user._id.toString();
          res.locals.user = user;
        }
      }
    }
    
    res.locals.user = res.locals.user || null;
    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    res.locals.user = null;
    next();
  }
};

module.exports = {
  generateToken,
  verifyToken,
  requireAuth,
  requireGuest,
  optionalAuth,
  JWT_SECRET
};
