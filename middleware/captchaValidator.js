/**
 * CAPTCHA Validation Middleware
 * Xác thực Google reCAPTCHA khi đăng nhập sai 5+ lần
 */

const https = require('https');

const SECRET_KEY = '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe'; // Demo key

/**
 * Verify CAPTCHA response
 */
async function verifyCaptcha(captchaResponse) {
  return new Promise((resolve, reject) => {
    const postData = `secret=${SECRET_KEY}&response=${captchaResponse}`;

    const options = {
      hostname: 'www.google.com',
      port: 443,
      path: '/recaptcha/api/siteverify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Middleware: Validate CAPTCHA if required
 */
const validateCaptcha = async (req, res, next) => {
  // Only validate on login POST request
  if (req.method === 'POST' && req.path === '/login') {
    const { username, 'g-recaptcha-response': captchaResponse } = req.body;

    // Check if user has CAPTCHA requirement
    const User = require('../models/User');
    const user = await User.findOne({ username });

    // If user requires CAPTCHA, verify it
    if (user && user.requiresCaptcha && user.failedLoginAttempts >= 5) {
      if (!captchaResponse) {
        return res.status(400).render('login', {
          error: 'Vui lòng hoàn thành xác thực CAPTCHA',
          redirect: req.body.redirect || '/profile',
          require2FA: false,
          requireCaptcha: true,
          failedAttempts: user.failedLoginAttempts,
          username: username
        });
      }

      try {
        const result = await verifyCaptcha(captchaResponse);

        // In demo mode, accept any response
        // In production, check: result.success && result.score > 0.5
        if (process.env.NODE_ENV === 'production' && !result.success) {
          return res.status(400).render('login', {
            error: 'Xác thực CAPTCHA thất bại. Vui lòng thử lại.',
            redirect: req.body.redirect || '/profile',
            require2FA: false,
            requireCaptcha: true,
            failedAttempts: user.failedLoginAttempts,
            username: username
          });
        }
      } catch (error) {
        console.error('CAPTCHA verification error:', error);
        // In development, allow login to proceed if verification fails
        if (process.env.NODE_ENV === 'production') {
          return res.status(500).json({ error: 'Lỗi xác thực CAPTCHA' });
        }
      }
    }
  }

  next();
};

module.exports = {
  validateCaptcha,
  verifyCaptcha
};
