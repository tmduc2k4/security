const { body } = require('express-validator');

// Validation cho đăng ký
const registerValidation = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username không được để trống')
    .isLength({ min: 3, max: 30 }).withMessage('Username phải từ 3-30 ký tự')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username chỉ được chứa chữ cái, số và dấu gạch dưới')
    .escape(),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email không được để trống')
    .isEmail().withMessage('Email không hợp lệ')
    .normalizeEmail()
    .isLength({ max: 100 }).withMessage('Email quá dài'),
  
  body('password')
    .notEmpty().withMessage('Mật khẩu không được để trống')
    .isLength({ min: 12, max: 100 }).withMessage('Mật khẩu phải từ 12-100 ký tự')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/).withMessage('Mật khẩu phải chứa ít nhất: 1 chữ thường, 1 chữ hoa, 1 số và 1 ký tự đặc biệt (!@#$%^&*...)'),
  
  body('confirmPassword')
    .notEmpty().withMessage('Vui lòng xác nhận mật khẩu')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Mật khẩu xác nhận không khớp');
      }
      return true;
    }),
  
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Họ tên phải từ 2-100 ký tự')
    .escape()
];

// Validation cho đăng nhập
const loginValidation = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username không được để trống')
    .escape(),
  
  body('password')
    .notEmpty().withMessage('Mật khẩu không được để trống')
];

// Validation cho cập nhật profile
const updateProfileValidation = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Họ tên phải từ 2-100 ký tự')
    .escape(),
  
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Email không hợp lệ')
    .normalizeEmail()
    .isLength({ max: 100 }).withMessage('Email quá dài'),
  
  body('newPassword')
    .optional()
    .isLength({ min: 6, max: 100 }).withMessage('Mật khẩu mới phải từ 6-100 ký tự')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Mật khẩu phải chứa ít nhất 1 chữ thường, 1 chữ hoa và 1 số'),
  
  body('currentPassword')
    .if(body('newPassword').exists())
    .notEmpty().withMessage('Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu mới')
];

module.exports = {
  registerValidation,
  loginValidation,
  updateProfileValidation
};
