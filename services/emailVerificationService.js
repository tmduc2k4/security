/**
 * Email Verification Service
 * Xác thực email khi user đăng ký
 */

const crypto = require('crypto');
const EmailVerification = require('../models/EmailVerification');
const User = require('../models/User');
const { sendVerificationEmail } = require('../config/email');

/**
 * Tạo token xác thực email
 */
async function generateVerificationToken(userId, email) {
  try {
    // Xóa token cũ nếu có
    await EmailVerification.deleteOne({ userId });

    // Tạo token random
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Lưu vào database
    const verification = new EmailVerification({
      userId,
      email,
      token: tokenHash,
      tokenHash: tokenHash
    });

    await verification.save();

    // Trả về unhashed token (để gửi qua email)
    return token;
  } catch (error) {
    console.error('Error generating verification token:', error);
    throw error;
  }
}

/**
 * Gửi email xác thực
 */
async function sendVerificationEmail(user) {
  try {
    const token = await generateVerificationToken(user._id, user.email);

    const verificationLink = `${process.env.APP_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

    await sendVerificationEmail({
      to: user.email,
      username: user.username,
      verificationLink
    });

    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
}

/**
 * Xác thực email token
 */
async function verifyEmail(token) {
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Tìm verification record
    const verification = await EmailVerification.findOne({ tokenHash });

    if (!verification) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn');
    }

    // Kiểm tra hết hạn
    if (new Date() > verification.expiresAt) {
      await EmailVerification.deleteOne({ _id: verification._id });
      throw new Error('Token đã hết hạn. Vui lòng yêu cầu email xác thực mới');
    }

    // Kiểm tra số lần thử quá nhiều
    if (verification.attempts >= 5) {
      throw new Error('Quá nhiều lần thử. Vui lòng yêu cầu email xác thực mới');
    }

    // Đánh dấu email đã xác thực
    verification.verified = true;
    await verification.save();

    // Update user
    const user = await User.findByIdAndUpdate(
      verification.userId,
      { emailVerified: true },
      { new: true }
    );

    return user;
  } catch (error) {
    // Tăng số lần thử
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await EmailVerification.findOneAndUpdate(
      { tokenHash },
      {
        $inc: { attempts: 1 },
        lastAttempt: new Date()
      }
    );

    throw error;
  }
}

/**
 * Kiểm tra email đã xác thực chưa
 */
async function isEmailVerified(userId) {
  try {
    const verification = await EmailVerification.findOne({ userId, verified: true });
    return !!verification;
  } catch (error) {
    console.error('Error checking email verification:', error);
    return false;
  }
}

/**
 * Yêu cầu gửi lại email xác thực
 */
async function resendVerificationEmail(email) {
  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      throw new Error('Email không tìm thấy');
    }

    // Xóa token cũ
    await EmailVerification.deleteOne({ userId: user._id });

    // Gửi email xác thực mới
    await sendVerificationEmail(user);

    return true;
  } catch (error) {
    console.error('Error resending verification email:', error);
    throw error;
  }
}

module.exports = {
  generateVerificationToken,
  sendVerificationEmail,
  verifyEmail,
  isEmailVerified,
  resendVerificationEmail
};
