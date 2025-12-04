const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');

// Hiển thị trang setup 2FA
const show2FASetupPage = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (user.twoFactorEnabled) {
      return res.redirect('/profile?message=' + encodeURIComponent('2FA đã được kích hoạt'));
    }

    // Generate secret key
    const secret = speakeasy.generateSecret({
      name: `LaptopStore (${user.username})`,
      issuer: 'LaptopStore'
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.render('2fa-setup', {
      user,
      secret: secret.base32,
      qrCode: qrCodeUrl,
      error: null
    });

  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).render('error', { 
      message: 'Lỗi khi setup 2FA',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Verify và enable 2FA
const enable2FA = async (req, res) => {
  try {
    const { secret, token } = req.body;
    const user = await User.findById(req.userId);

    if (!secret || !token) {
      return res.status(400).json({ 
        success: false, 
        message: 'Thiếu thông tin xác thực' 
      });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps before/after
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Mã xác thực không đúng. Vui lòng thử lại.'
      });
    }

    // Save secret and enable 2FA
    user.twoFactorSecret = secret;
    user.twoFactorEnabled = true;
    await user.save();

    res.json({
      success: true,
      message: '2FA đã được kích hoạt thành công!'
    });

  } catch (error) {
    console.error('Enable 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi kích hoạt 2FA'
    });
  }
};

// Disable 2FA
const disable2FA = async (req, res) => {
  try {
    const { password, token } = req.body;
    const user = await User.findById(req.userId);

    // Verify password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu không đúng'
      });
    }

    // Verify 2FA token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Mã 2FA không đúng'
      });
    }

    // Disable 2FA
    user.twoFactorSecret = null;
    user.twoFactorEnabled = false;
    await user.save();

    res.json({
      success: true,
      message: '2FA đã được tắt'
    });

  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tắt 2FA'
    });
  }
};

// Verify 2FA token khi login
const verify2FALogin = async (req, res) => {
  try {
    const { userId, token } = req.body;
    
    if (!userId || !token) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin xác thực'
      });
    }

    const user = await User.findById(userId);
    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Người dùng không hợp lệ'
      });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Mã xác thực không đúng'
      });
    }

    res.json({
      success: true,
      message: 'Xác thực thành công'
    });

  } catch (error) {
    console.error('Verify 2FA login error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xác thực'
    });
  }
};

module.exports = {
  show2FASetupPage,
  enable2FA,
  disable2FA,
  verify2FALogin
};
