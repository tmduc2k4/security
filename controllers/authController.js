const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { validationResult } = require('express-validator');

// Hiển thị trang đăng ký
const showRegisterPage = (req, res) => {
  res.render('register', { error: null });
};

// Xử lý đăng ký
const register = async (req, res) => {
  try {
    // Kiểm tra validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('register', { 
        error: errors.array()[0].msg 
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
      error: error.message || 'Đăng ký thất bại, vui lòng thử lại' 
    });
  }
};

// Hiển thị trang đăng nhập
const showLoginPage = (req, res) => {
  const redirect = req.query.redirect || '/profile';
  res.render('login', { error: null, redirect });
};

// Xử lý đăng nhập
const login = async (req, res) => {
  try {
    // Kiểm tra validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('login', { 
        error: errors.array()[0].msg,
        redirect: req.body.redirect || '/profile'
      });
    }

    const { username, password } = req.body;

    // Xác thực user
    const user = await User.authenticate(username, password);
    if (!user) {
      return res.status(401).render('login', { 
        error: 'Tên đăng nhập hoặc mật khẩu không đúng',
        redirect: req.body.redirect || '/profile'
      });
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

    // Redirect về trang trước đó hoặc profile
    const redirectUrl = req.body.redirect || '/profile';
    res.redirect(redirectUrl);

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).render('login', { 
      error: 'Đăng nhập thất bại, vui lòng thử lại',
      redirect: req.body.redirect || '/profile'
    });
  }
};

// Đăng xuất
const logout = (req, res) => {
  // Xóa cookie token
  res.clearCookie('token');
  res.redirect('/?message=' + encodeURIComponent('Đã đăng xuất thành công'));
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
