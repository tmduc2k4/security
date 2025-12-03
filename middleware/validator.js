const { body, param, query, validationResult } = require('express-validator');

// Middleware xử lý lỗi validation
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Dữ liệu không hợp lệ',
      details: errors.array() 
    });
  }
  next();
};

// Validation rules cho contact form
const validateContactForm = [
  body('name')
    .trim()
    .notEmpty().withMessage('Họ tên không được để trống')
    .isLength({ min: 2, max: 100 }).withMessage('Họ tên phải từ 2-100 ký tự')
    .matches(/^[a-zA-ZÀ-ỹ\s]+$/).withMessage('Họ tên chỉ được chứa chữ cái')
    .escape(),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email không được để trống')
    .isEmail().withMessage('Email không hợp lệ')
    .normalizeEmail()
    .isLength({ max: 100 }).withMessage('Email quá dài'),
  
  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9]{10,11}$/).withMessage('Số điện thoại phải có 10-11 chữ số')
    .escape(),
  
  body('message')
    .trim()
    .notEmpty().withMessage('Tin nhắn không được để trống')
    .isLength({ min: 10, max: 1000 }).withMessage('Tin nhắn phải từ 10-1000 ký tự')
    .escape(),
  
  handleValidationErrors
];

// Validation cho laptop ID
const validateLaptopId = [
  param('id')
    .isInt({ min: 1, max: 9999 }).withMessage('ID sản phẩm không hợp lệ')
    .toInt(),
  
  handleValidationErrors
];

// Validation cho search query
const validateSearchQuery = [
  query('q')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Từ khóa tìm kiếm quá dài')
    .matches(/^[a-zA-Z0-9À-ỹ\s-]+$/).withMessage('Từ khóa chứa ký tự không hợp lệ')
    .escape(),
  
  query('sort')
    .optional()
    .isIn(['price-asc', 'price-desc', 'name-asc', 'name-desc']).withMessage('Tham số sắp xếp không hợp lệ'),
  
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 }).withMessage('Số trang không hợp lệ')
    .toInt(),
  
  handleValidationErrors
];

// Sanitize HTML input - loại bỏ các thẻ HTML nguy hiểm
const sanitizeHtml = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
};

// Middleware tổng quát để sanitize tất cả input
const sanitizeAllInputs = (req, res, next) => {
  // Sanitize body
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeHtml(req.body[key]);
      }
    });
  }
  
  // Sanitize query
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeHtml(req.query[key]);
      }
    });
  }
  
  // Sanitize params
  if (req.params) {
    Object.keys(req.params).forEach(key => {
      if (typeof req.params[key] === 'string') {
        req.params[key] = sanitizeHtml(req.params[key]);
      }
    });
  }
  
  next();
};

module.exports = {
  validateContactForm,
  validateLaptopId,
  validateSearchQuery,
  sanitizeAllInputs,
  handleValidationErrors
};
