const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
require('dotenv').config();

// Import database connection
const connectDB = require('./config/database');

// Import security middleware
const {
  limiter,
  strictLimiter,
  helmetConfig,
  hpp,
  xss,
  mongoSanitize,
  securityLogger,
  sqlInjectionProtection,
  pathTraversalProtection
} = require('./middleware/security');

const {
  validateContactForm,
  validateLaptopId,
  sanitizeAllInputs
} = require('./middleware/validator');

const { optionalAuth, requireAuth, requireGuest } = require('./middleware/auth');
const { requireRole, setDefaultPermissions } = require('./middleware/rbac');
const { generateCSRFToken, verifyCsrfToken } = require('./middleware/csrf');
const { validateCaptcha } = require('./middleware/captchaValidator');

const authController = require('./controllers/authController');
const twoFactorController = require('./controllers/twoFactorController');
const passwordController = require('./controllers/passwordController');
const { registerValidation, loginValidation, updateProfileValidation } = require('./middleware/authValidator');

// Kết nối MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy - Important for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Cấu hình EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Security Middleware - Apply BEFORE other middleware
app.use(helmetConfig); // WAF - Web Application Firewall
app.use(limiter); // Rate limiting
app.use(hpp()); // Prevent HTTP Parameter Pollution
app.use(xss()); // Prevent XSS attacks
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(cors({ origin: process.env.ALLOWED_ORIGINS || '*' })); // CORS protection

// Body parsing middleware
app.use(express.json({ limit: '10kb' })); // Limit payload size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser()); // Parse cookies

// Session configuration for CSRF and user tracking
// Note: Using MemoryStore for development only. For production, use MongoDB session store
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};

// For production, consider using express-session-mongodb or similar
if (process.env.NODE_ENV === 'production') {
  console.warn('⚠️ Warning: Using MemoryStore for sessions. Consider using MongoDB session store for production.');
}

app.use(session(sessionConfig));

// Custom security middleware
app.use(securityLogger); // Log suspicious activities
app.use(validateCaptcha); // Validate CAPTCHA if required
app.use(sqlInjectionProtection); // Block SQL injection
app.use(pathTraversalProtection); // Block path traversal
app.use(sanitizeAllInputs); // Sanitize all inputs
app.use(optionalAuth); // Load user info if logged in
app.use(setDefaultPermissions); // Set default permissions based on role
app.use(generateCSRFToken); // Generate CSRF token

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Dữ liệu mẫu về laptop
const laptops = [
  {
    id: 1,
    name: 'Dell XPS 13',
    price: 25000000,
    image: 'https://via.placeholder.com/300x200?text=Dell+XPS+13',
    description: 'Laptop cao cấp với thiết kế sang trọng, màn hình InfinityEdge',
    specs: {
      cpu: 'Intel Core i7-1165G7',
      ram: '16GB',
      storage: '512GB SSD',
      screen: '13.4" FHD+'
    }
  },
  {
    id: 2,
    name: 'MacBook Air M2',
    price: 28000000,
    image: 'https://via.placeholder.com/300x200?text=MacBook+Air+M2',
    description: 'Laptop mỏng nhẹ với chip M2 mạnh mẽ, pin trâu',
    specs: {
      cpu: 'Apple M2',
      ram: '8GB',
      storage: '256GB SSD',
      screen: '13.6" Retina'
    }
  },
  {
    id: 3,
    name: 'Lenovo ThinkPad X1',
    price: 30000000,
    image: 'https://via.placeholder.com/300x200?text=Lenovo+ThinkPad+X1',
    description: 'Laptop doanh nhân bền bỉ, bảo mật cao',
    specs: {
      cpu: 'Intel Core i7-1185G7',
      ram: '16GB',
      storage: '1TB SSD',
      screen: '14" FHD'
    }
  },
  {
    id: 4,
    name: 'HP Pavilion 15',
    price: 15000000,
    image: 'https://via.placeholder.com/300x200?text=HP+Pavilion+15',
    description: 'Laptop giá rẻ cho sinh viên và văn phòng',
    specs: {
      cpu: 'Intel Core i5-1135G7',
      ram: '8GB',
      storage: '512GB SSD',
      screen: '15.6" FHD'
    }
  },
  {
    id: 5,
    name: 'ASUS ROG Strix G15',
    price: 35000000,
    image: 'https://via.placeholder.com/300x200?text=ASUS+ROG+Strix',
    description: 'Laptop gaming mạnh mẽ với card đồ họa RTX',
    specs: {
      cpu: 'AMD Ryzen 9 5900HX',
      ram: '16GB',
      storage: '1TB SSD',
      screen: '15.6" FHD 144Hz'
    }
  },
  {
    id: 6,
    name: 'Acer Swift 3',
    price: 18000000,
    image: 'https://via.placeholder.com/300x200?text=Acer+Swift+3',
    description: 'Laptop mỏng nhẹ, giá phải chăng cho công việc',
    specs: {
      cpu: 'Intel Core i5-1135G7',
      ram: '8GB',
      storage: '512GB SSD',
      screen: '14" FHD'
    }
  }
];

// Auth Routes
app.get('/register', requireGuest, authController.showRegisterPage);
app.post('/register', requireGuest, generateCSRFToken, registerValidation, verifyCsrfToken, authController.register);
app.get('/login', requireGuest, authController.showLoginPage);
app.post('/login', requireGuest, generateCSRFToken, loginValidation, verifyCsrfToken, authController.login);
app.get('/logout', authController.logout);
app.get('/profile', requireAuth, authController.showProfile);
app.post('/profile/update', requireAuth, updateProfileValidation, authController.updateProfile);

// Password Reset Routes
app.get('/forgot-password', passwordController.showForgotPasswordPage);
app.post('/forgot-password', passwordController.forgotPassword);
app.get('/reset-password', passwordController.showResetPasswordPage);
app.post('/reset-password', passwordController.resetPassword);

// 2FA Routes
app.get('/2fa/setup', requireAuth, twoFactorController.show2FASetupPage);
app.post('/2fa/enable', requireAuth, twoFactorController.enable2FA);
app.post('/2fa/disable', requireAuth, twoFactorController.disable2FA);
app.post('/2fa/verify', twoFactorController.verify2FALogin);

// API Auth Routes (JSON)
app.post('/api/auth/register', registerValidation, authController.apiRegister);
app.post('/api/auth/login', loginValidation, authController.apiLogin);

// Admin Routes (Role-based)
app.get('/admin', requireAuth, requireRole('admin'), (req, res) => {
  res.render('admin/dashboard', { currentUser: req.user });
});

app.get('/admin/users', requireAuth, requireRole('admin'), (req, res) => {
  // TODO: Fetch users from database
  res.render('admin/users', { currentUser: req.user });
});

app.get('/admin/audit-logs', requireAuth, requireRole('admin'), (req, res) => {
  // TODO: Fetch audit logs from database
  res.render('admin/audit-logs', { currentUser: req.user });
});

// User activity logs
app.get('/profile/activity', requireAuth, (req, res) => {
  // TODO: Fetch user's audit logs
  res.render('profile/activity', { currentUser: req.user });
});

// Public Routes
app.get('/', (req, res) => {
  res.render('index', { laptops: laptops.slice(0, 6) });
});

// Security Dashboard
app.get('/security', (req, res) => {
  res.render('security-dashboard');
});

app.get('/laptops', (req, res) => {
  res.render('laptops', { laptops });
});

app.get('/laptop/:id', validateLaptopId, (req, res) => {
  const laptop = laptops.find(l => l.id === parseInt(req.params.id));
  if (laptop) {
    res.render('laptop-detail', { laptop });
  } else {
    res.status(404).send('Không tìm thấy sản phẩm');
  }
});

app.get('/about', (req, res) => {
  res.render('about');
});

app.get('/contact', (req, res) => {
  res.render('contact');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Đã xảy ra lỗi, vui lòng thử lại sau' 
      : err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { 
    url: req.originalUrl 
  });
});

// Khởi động server
const server = app.listen(PORT, () => {
  console.log(`✓ Server đang chạy tại http://localhost:${PORT}`);
  console.log(`✓ Security features enabled`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

module.exports = app;
