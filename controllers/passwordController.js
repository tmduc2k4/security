const crypto = require('crypto');
const User = require('../models/User');
const { sendResetEmail } = require('../config/email');

// Hiển thị trang quên mật khẩu
const showForgotPasswordPage = (req, res) => {
  res.render('forgot-password', { 
    error: null,
    message: null
  });
};

// Xử lý yêu cầu quên mật khẩu
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).render('forgot-password', {
        error: 'Vui lòng nhập email',
        message: null
      });
    }

    // Tìm user theo email
    const user = await User.findOne({ email });
    if (!user) {
      // Không báo cho attacker biết email có tồn tại không (security)
      return res.render('forgot-password', {
        error: null,
        message: 'Nếu email tồn tại, link đặt lại mật khẩu sẽ được gửi trong vòng vài phút.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Lưu token (hash) vào database
    user.passwordResetToken = resetTokenHash;
    user.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 phút
    await user.save();

    // Gửi email
    try {
      await sendResetEmail(email, resetToken, user.fullName || user.username);
      console.log(`✓ Reset email sent to ${email}`);
    } catch (emailError) {
      console.error('Email error:', emailError);
      // Clear token nếu email gửi thất bại
      user.passwordResetToken = null;
      user.passwordResetExpiresAt = null;
      await user.save();
      
      return res.status(500).render('forgot-password', {
        error: 'Lỗi khi gửi email. Vui lòng thử lại.',
        message: null
      });
    }

    res.render('forgot-password', {
      error: null,
      message: 'Email đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra inbox (hoặc thư rác).'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).render('forgot-password', {
      error: 'Có lỗi xảy ra. Vui lòng thử lại.',
      message: null
    });
  }
};

// Hiển thị trang reset mật khẩu
const showResetPasswordPage = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).render('error', {
        message: 'Link không hợp lệ',
        error: { status: 400 }
      });
    }

    // Hash token từ query string
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Tìm user với token và kiểm tra còn hạn không
    const user = await User.findOne({
      passwordResetToken: resetTokenHash,
      passwordResetExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).render('error', {
        message: 'Link đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu đặt lại mật khẩu mới.',
        error: { status: 400 }
      });
    }

    res.render('reset-password', {
      token,
      error: null,
      message: null
    });

  } catch (error) {
    console.error('Reset password page error:', error);
    res.status(500).render('error', {
      message: 'Có lỗi xảy ra',
      error
    });
  }
};

// Xử lý reset mật khẩu
const resetPassword = async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      return res.status(400).render('reset-password', {
        token,
        error: 'Vui lòng điền tất cả trường',
        message: null
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).render('reset-password', {
        token,
        error: 'Xác nhận mật khẩu không khớp',
        message: null
      });
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{12,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).render('reset-password', {
        token,
        error: 'Mật khẩu phải có ít nhất 12 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt',
        message: null
      });
    }

    // Hash token từ form
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Tìm user
    const user = await User.findOne({
      passwordResetToken: resetTokenHash,
      passwordResetExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).render('reset-password', {
        token,
        error: 'Link đã hết hạn. Vui lòng yêu cầu đặt lại mật khẩu mới.',
        message: null
      });
    }

    // Kiểm tra password không nằm trong lịch sử
    const isInHistory = await user.isPasswordInHistory(password);
    if (isInHistory) {
      return res.status(400).render('reset-password', {
        token,
        error: 'Không được sử dụng mật khẩu đã dùng gần đây.',
        message: null
      });
    }

    // Update password
    user.password = password;
    user.passwordResetToken = null;
    user.passwordResetExpiresAt = null;
    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;
    await user.save();

    res.render('reset-password', {
      token,
      error: null,
      message: '✅ Mật khẩu đã được đặt lại thành công! Vui lòng <a href="/login">đăng nhập</a> với mật khẩu mới.',
      success: true
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).render('reset-password', {
      token: req.body.token,
      error: 'Có lỗi xảy ra. Vui lòng thử lại.',
      message: null
    });
  }
};

module.exports = {
  showForgotPasswordPage,
  forgotPassword,
  showResetPasswordPage,
  resetPassword
};
