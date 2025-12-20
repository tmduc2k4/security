const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { validationResult } = require('express-validator');
const auditService = require('../services/auditService');

// Hiển thị trang đăng ký
const showRegisterPage = (req, res) => {
  res.render('register', { 
    error: null,
    csrfToken: req.session?.csrfToken || ''
  });
};

// Xử lý đăng ký
const register = async (req, res) => {
  try {
    // Kiểm tra validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('register', { 
        error: errors.array()[0].msg,
        username: req.body.username || '',
        email: req.body.email || '',
        csrfToken: req.session?.csrfToken || ''
      });
    }

    const { username, email, password, fullName } = req.body;

    // Tạo user mới
    const newUser = await User.create({
      username,
      email,
      password,
      fullName
    });

    // Tạo JWT token (sử dụng _id của MongoDB)
    const token = generateToken(newUser._id.toString());

    // Lưu token vào cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
      sameSite: 'strict'
    });

    // Redirect về profile hoặc trang trước đó
    const redirectUrl = req.query.redirect || '/profile';
    res.redirect(redirectUrl);

  } catch (error) {
    console.error('Register error:', error);
    res.status(400).render('register', { 
      error: error.message || 'Đăng ký thất bại, vui lòng thử lại',
      username: req.body.username || '',
      email: req.body.email || '',
      csrfToken: req.session?.csrfToken || ''
    });
  }
};

// Hiển thị trang đăng nhập
const showLoginPage = (req, res) => {
  const redirect = req.query.redirect || '/profile';
  
  // Generate fallback CAPTCHA for session (for demonstration purposes)
  // In production, generate this only when CAPTCHA is required
  // to prevent pre-computation attacks
  const generateFallbackCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10);
    const num2 = Math.floor(Math.random() * 10);
    const operations = ['+', '-'];
    const op = operations[Math.floor(Math.random() * operations.length)];
    
    let answer;
    if (op === '+') {
      answer = (num1 + num2).toString();
    } else {
      answer = (num1 - num2).toString();
    }
    
    return {
      question: `${num1} ${op} ${num2} = ?`,
      answer: answer
    };
  };
  
  const captcha = generateFallbackCaptcha();
  req.session.captchaQuestion = captcha.question;
  req.session.captchaAnswer = captcha.answer;
  
  res.render('login', { 
    error: null, 
    redirect,
    require2FA: false,
    requireCaptcha: false,
    failedAttempts: 0,
    username: '',
    csrfToken: req.session?.csrfToken || '',
    captchaQuestion: captcha.question
  });
};

// Xử lý đăng nhập
const login = async (req, res) => {
  try {
    // Kiểm tra validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('login', { 
        error: errors.array()[0].msg,
        redirect: req.body.redirect || '/profile',
        require2FA: false,
        username: req.body.username || '',
        csrfToken: req.session?.csrfToken || ''
      });
    }

    const { username, password, twoFactorToken } = req.body;

    // Tìm user qua username
    const user = await User.findOne({ username });
    if (!user) {
      // Log failed login attempt
      await auditService.logAction('login_failed', 'account', {
        username: username || 'unknown',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        description: 'Invalid username',
        severity: 'warning',
        success: false
      });

      return res.status(401).render('login', { 
        error: 'Tên đăng nhập hoặc mật khẩu không đúng',
        redirect: req.body.redirect || '/profile',
        require2FA: false,
        username: username || '',
        csrfToken: req.session?.csrfToken || '',
        requireCaptcha: false,
        failedAttempts: 0
      });
    }

    // Kiểm tra account có bị lock không
    if (user.isAccountLocked()) {
      const minutesLeft = Math.ceil((user.accountLockedUntil - new Date()) / 60000);
      
      // Log account lock attempt
      await auditService.logAction('login_failed', 'account', {
        userId: user._id,
        username: user.username,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        description: `Account locked. ${minutesLeft} minutes remaining`,
        severity: 'critical',
        success: false
      });

      return res.status(401).render('login', {
        error: `Tài khoản bị khóa do đăng nhập sai quá nhiều lần. Thử lại sau ${minutesLeft} phút.`,
        redirect: req.body.redirect || '/profile',
        require2FA: false,
        username: username || '',
        csrfToken: req.session?.csrfToken || ''
      });
    }

    // ✅ NEW: Kiểm tra CAPTCHA requirement TRƯỚC validate password
    if (user.requiresCaptcha && user.failedLoginAttempts >= 5) {
      const { 'g-recaptcha-response': captchaResponse, captcha_answer: fallbackAnswer } = req.body;
      
      if (!captchaResponse && !fallbackAnswer) {
        return res.status(400).render('login', {
          error: `Đã nhập sai ${user.failedLoginAttempts} lần. Vui lòng hoàn thành xác thực CAPTCHA.`,
          redirect: req.body.redirect || '/profile',
          require2FA: false,
          requireCaptcha: true,
          failedAttempts: user.failedLoginAttempts,
          username: username || '',
          csrfToken: req.session?.csrfToken || ''
        });
      }

      // Verify CAPTCHA token (ReCAPTCHA)
      if (captchaResponse) {
        try {
          const { verifyCaptcha } = require('../middleware/captchaValidator');
          const result = await verifyCaptcha(captchaResponse);
          
          // In production, check: result.success && result.score > 0.5
          if (process.env.NODE_ENV === 'production' && !result.success) {
            return res.status(400).render('login', {
              error: 'Xác thực CAPTCHA thất bại. Vui lòng thử lại.',
              redirect: req.body.redirect || '/profile',
              require2FA: false,
              requireCaptcha: true,
              failedAttempts: user.failedLoginAttempts,
              username: username || '',
              csrfToken: req.session?.csrfToken || ''
            });
          }
        } catch (captchaError) {
          console.error('CAPTCHA verification error:', captchaError);
          if (process.env.NODE_ENV === 'production') {
            return res.status(500).json({ error: 'Lỗi xác thực CAPTCHA' });
          }
          // In development, allow to continue
        }
      }

      // Verify fallback CAPTCHA (simple math CAPTCHA)
      if (fallbackAnswer && !captchaResponse) {
        const sessionCaptcha = req.session.captchaAnswer;
        
        if (!sessionCaptcha || fallbackAnswer !== sessionCaptcha) {
          // Clear the session CAPTCHA to prevent reuse
          delete req.session.captchaAnswer;
          
          return res.status(400).render('login', {
            error: `Mã xác thực không chính xác. Còn ${10 - user.failedLoginAttempts} lần để thử.`,
            redirect: req.body.redirect || '/profile',
            require2FA: false,
            requireCaptcha: true,
            failedAttempts: user.failedLoginAttempts,
            username: username || '',
            csrfToken: req.session?.csrfToken || ''
          });
        }
        
        // Valid fallback CAPTCHA - clear it from session
        delete req.session.captchaAnswer;
      }
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      try {
        await user.incrementFailedAttempts();
      } catch (lockError) {
        console.error('Error incrementing failed attempts:', lockError);
      }
      
      // Log failed login attempt
      await auditService.logAction('login_failed', 'account', {
        userId: user._id,
        username: user.username,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        description: `Invalid password (attempt ${user.failedLoginAttempts})`,
        severity: 'warning',
        success: false
      });

      // Hiển thị thông báo khác nhau theo số lần sai
      let errorMsg = 'Tên đăng nhập hoặc mật khẩu không đúng';
      let showCaptcha = false;
      
      if (user.failedLoginAttempts >= 5 && user.failedLoginAttempts < 10) {
        errorMsg = `Sai ${user.failedLoginAttempts} lần. Vui lòng hoàn thành CAPTCHA.`;
        showCaptcha = true;
      } else if (user.failedLoginAttempts >= 10) {
        errorMsg = `Tài khoản bị cấm đăng nhập trong 10 phút do đăng nhập sai quá nhiều lần.`;
      }

      return res.status(401).render('login', { 
        error: errorMsg,
        redirect: req.body.redirect || '/profile',
        require2FA: false,
        requireCaptcha: showCaptcha,
        failedAttempts: user.failedLoginAttempts,
        username: username || '',
        csrfToken: req.session?.csrfToken || ''
      });
    }

    // Kiểm tra 2FA nếu được bật
    if (user.twoFactorEnabled) {
      if (!twoFactorToken) {
        // Yêu cầu nhập mã 2FA
        return res.render('login', {
          error: null,
          redirect: req.body.redirect || '/profile',
          require2FA: true,
          userId: user._id,
          email: user.email,
          csrfToken: req.session?.csrfToken || ''
        });
      }

      // Verify 2FA token
      const speakeasy = require('speakeasy');
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: twoFactorToken,
        window: 2
      });

      if (!verified) {
        return res.status(401).render('login', {
          error: 'Mã 2FA không đúng',
          redirect: req.body.redirect || '/profile',
          require2FA: true,
          userId: user._id,
          email: user.email,
          csrfToken: req.session?.csrfToken || ''
        });
      }
    }

    // Reset failed attempts
    await user.resetFailedAttempts();

    // Kiểm tra password đã hết hạn chưa
    if (user.isPasswordExpired()) {
      return res.redirect('/profile?passwordExpired=true&message=' + 
        encodeURIComponent('Mật khẩu của bạn đã hết hạn (90 ngày). Vui lòng đổi mật khẩu ngay!'));
    }

    // Tạo JWT token (sử dụng _id của MongoDB)
    const token = generateToken(user._id.toString());

    // Lưu token vào cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
      sameSite: 'strict'
    });

    // Log successful login
    await auditService.logAction('login_success', 'account', {
      userId: user._id,
      username: user.username,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      statusCode: 200,
      severity: 'info'
    });

    // Redirect về trang trước đó hoặc profile
    const redirectUrl = req.body.redirect || '/profile';
    res.redirect(redirectUrl);

  } catch (error) {
    console.error('❌ Login error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', { username: req.body.username, csrfToken: req.body._csrf ? '***' : 'missing' });
    
    // Kiểm tra loại lỗi
    let errorMessage = 'Đăng nhập thất bại, vui lòng thử lại';
    if (error.message.includes('CSRF')) {
      errorMessage = 'CSRF token không hợp lệ. Vui lòng load lại trang.';
      console.error('⚠️ CSRF Error detected');
    } else if (error.message.includes('validation')) {
      errorMessage = 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.';
    } else if (error.message.includes('connection') || error.message.includes('database')) {
      errorMessage = 'Lỗi kết nối cơ sở dữ liệu. Vui lòng thử lại sau.';
      console.error('⚠️ Database Error detected');
    } else if (error.message.includes('compare')) {
      errorMessage = 'Lỗi xác minh mật khẩu. Vui lòng thử lại.';
      console.error('⚠️ Password comparison error');
    }
    
    return res.status(500).render('login', { 
      error: errorMessage,
      redirect: req.body.redirect || '/profile',
      require2FA: false,
      requireCaptcha: false,
      failedAttempts: 0,
      username: req.body.username || '',
      csrfToken: req.session?.csrfToken || ''
    });
  }
};

// Đăng xuất
const logout = async (req, res) => {
  try {
    // Log logout
    if (req.user) {
      await auditService.logAction('logout', 'account', {
        userId: req.user._id,
        username: req.user.username,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'info'
      });
    }

    // Xóa cookie token
    res.clearCookie('token');
    res.redirect('/?message=' + encodeURIComponent('Đã đăng xuất thành công'));
  } catch (error) {
    console.error('Logout error:', error);
    res.clearCookie('token');
    res.redirect('/');
  }
};

// Hiển thị trang profile
const showProfile = (req, res) => {
  // req.user được gắn bởi requireAuth middleware
  res.render('profile', { 
    user: req.user,
    success: req.query.success || null,
    error: req.query.error || null
  });
};

// Cập nhật profile
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('profile', { 
        user: req.user,
        error: errors.array()[0].msg,
        success: null
      });
    }

    const { fullName, email, currentPassword, newPassword } = req.body;
    const updateData = {};

    // Cập nhật tên
    if (fullName && fullName !== req.user.fullName) {
      updateData.fullName = fullName;
    }

    // Cập nhật email
    if (email && email !== req.user.email) {
      updateData.email = email;
    }

    // Cập nhật password
    if (newPassword) {
      // Kiểm tra current password
      const user = await User.findById(req.userId);
      const isValidPassword = await user.comparePassword(currentPassword);
      if (!isValidPassword) {
        return res.status(400).render('profile', {
          user: req.user,
          error: 'Mật khẩu hiện tại không đúng',
          success: null
        });
      }
      
      // Kiểm tra password có trùng với 5 password gần nhất không
      const isInHistory = await user.isPasswordInHistory(newPassword);
      if (isInHistory) {
        return res.status(400).render('profile', {
          user: req.user,
          error: 'Không được sử dụng lại mật khẩu đã dùng gần đây. Vui lòng chọn mật khẩu khác.',
          success: null
        });
      }
      
      updateData.password = newPassword;
    }

    // Cập nhật user
    await User.updateUser(req.userId, updateData);

    // Lấy user mới sau khi cập nhật
    const updatedUser = await User.findById(req.userId);

    res.render('profile', {
      user: updatedUser,
      success: 'Cập nhật thông tin thành công!',
      error: null
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).render('profile', {
      user: req.user,
      error: error.message || 'Cập nhật thất bại, vui lòng thử lại',
      success: null
    });
  }
};

// API endpoints (JSON responses)
const apiLogin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: errors.array()[0].msg 
      });
    }

    const { username, password } = req.body;
    const user = await User.authenticate(username, password);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Tên đăng nhập hoặc mật khẩu không đúng' 
      });
    }

    const token = generateToken(user.id);
    res.json({ 
      success: true, 
      token, 
      user 
    });

  } catch (error) {
    console.error('API Login error:', error);
    res.status(500).json({ error: 'Đăng nhập thất bại' });
  }
};

const apiRegister = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: errors.array()[0].msg 
      });
    }

    const { username, email, password, fullName } = req.body;
    const newUser = await User.create({
      username,
      email,
      password,
      fullName
    });

    const token = generateToken(newUser.id);
    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({ 
      success: true, 
      token, 
      user: userWithoutPassword 
    });

  } catch (error) {
    console.error('API Register error:', error);
    res.status(400).json({ 
      error: error.message || 'Đăng ký thất bại' 
    });
  }
};

module.exports = {
  showRegisterPage,
  register,
  showLoginPage,
  login,
  logout,
  showProfile,
  updateProfile,
  apiLogin,
  apiRegister
};
