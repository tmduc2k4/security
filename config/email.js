const nodemailer = require('nodemailer');

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || 'your_email@gmail.com',
    pass: process.env.GMAIL_PASSWORD || 'your_app_password'
  }
});

// Send password reset email
const sendResetEmail = async (email, resetToken, userName) => {
  const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: '🔐 Đặt lại mật khẩu - LaptopStore',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">Đặt lại mật khẩu của bạn</h2>
        
        <p>Xin chào ${userName},</p>
        
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
        
        <p style="margin: 2rem 0;">
          <a href="${resetUrl}" style="
            display: inline-block;
            padding: 12px 30px;
            background-color: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
          ">
            Đặt lại mật khẩu
          </a>
        </p>
        
        <p style="color: #666;">Hoặc copy link này vào browser:</p>
        <p style="background: #f5f5f5; padding: 10px; border-radius: 3px; word-break: break-all; color: #666;">
          ${resetUrl}
        </p>
        
        <p style="color: #999; font-size: 12px;">
          <strong>⚠️ Lưu ý quan trọng:</strong><br>
          - Link này hết hạn sau 15 phút<br>
          - Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này<br>
          - Không chia sẻ link này với ai
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 2rem 0;">
        
        <p style="color: #999; font-size: 12px; text-align: center;">
          © 2025 LaptopStore - Website bán laptop an toàn<br>
          Email này được gửi tự động, vui lòng không reply
        </p>
      </div>
    `
  };
  
  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Email send error:', error);
        reject(error);
      } else {
        console.log('Email sent:', info.response);
        resolve(info);
      }
    });
  });
};

module.exports = {
  sendResetEmail
};
