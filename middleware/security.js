const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const hpp = require('hpp');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');

// Rate limiting - Ngăn chặn tấn công brute force và DDoS
// Có thể điều chỉnh qua .env cho development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: process.env.RATE_LIMIT_MAX || 100, // Default 100, có thể tăng lên cho dev
  message: 'Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 15 phút',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Đếm cả request thành công
  skipFailedRequests: false, // Đếm cả request thất bại
});

// Stricter rate limit cho các endpoint nhạy cảm
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.STRICT_RATE_LIMIT_MAX || 5,
  message: 'Quá nhiều lần thử, vui lòng thử lại sau 15 phút',
});

// Cấu hình Helmet - WAF cơ bản
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  xssFilter: true,
  noSniff: true,
  ieNoOpen: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
});

// Middleware để log các request đáng ngờ
const securityLogger = (req, res, next) => {
  const suspiciousPatterns = [
    /<script>/i,
    /javascript:/i,
    /on\w+=/i,
    /<iframe>/i,
    /\.\.\/\.\.\//,
    /union.*select/i,
    /insert.*into/i,
    /delete.*from/i,
    /drop.*table/i,
  ];

  const checkData = JSON.stringify({
    query: req.query,
    body: req.body,
    params: req.params
  });

  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(checkData)
  );

  if (isSuspicious) {
    console.warn(`[SECURITY WARNING] Suspicious request detected:
    IP: ${req.ip}
    Method: ${req.method}
    Path: ${req.path}
    Data: ${checkData}
    Time: ${new Date().toISOString()}`);
  }

  next();
};

// Middleware kiểm tra SQL Injection trong query parameters
const sqlInjectionProtection = (req, res, next) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(union.*select|insert.*into|delete.*from)/gi,
    /('|(--)|;|\/\*|\*\/)/g
  ];

  const checkInput = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        for (let pattern of sqlPatterns) {
          if (pattern.test(obj[key])) {
            return true;
          }
        }
      } else if (typeof obj[key] === 'object') {
        if (checkInput(obj[key])) {
          return true;
        }
      }
    }
    return false;
  };

  if (checkInput(req.query) || checkInput(req.body) || checkInput(req.params)) {
    console.error(`[SECURITY BLOCK] SQL Injection attempt blocked from IP: ${req.ip}`);
    return res.status(403).json({ 
      error: 'Yêu cầu không hợp lệ - Phát hiện nội dung nguy hiểm' 
    });
  }

  next();
};

// Middleware chặn Path Traversal
const pathTraversalProtection = (req, res, next) => {
  const pathTraversalPattern = /(\.\.(\/|\\))+/;
  
  const checkPath = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string' && pathTraversalPattern.test(obj[key])) {
        return true;
      }
    }
    return false;
  };

  if (checkPath(req.params) || checkPath(req.query) || checkPath(req.body)) {
    console.error(`[SECURITY BLOCK] Path Traversal attempt blocked from IP: ${req.ip}`);
    return res.status(403).json({ 
      error: 'Yêu cầu không hợp lệ - Đường dẫn không được phép' 
    });
  }

  next();
};

module.exports = {
  limiter,
  strictLimiter,
  helmetConfig,
  hpp,
  xss,
  mongoSanitize,
  securityLogger,
  sqlInjectionProtection,
  pathTraversalProtection
};
