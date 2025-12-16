# CAPTCHA & Account Lockout System

## 📋 Tính năng

Hệ thống bảo mật thêm 2 lớp bảo vệ cho trang đăng nhập:

### 1️⃣ **Yêu cầu CAPTCHA sau 5 lần đăng nhập sai**
- Thông báo cảnh báo: "⚠️ Đã đăng nhập sai 5/10 lần"
- Người dùng phải hoàn thành Google reCAPTCHA v3
- Cho phép tiếp tục nếu CAPTCHA valid

### 2️⃣ **Cấm đăng nhập 10 phút sau 10 lần sai**
- Tài khoản tự động khóa sau 10 lần thất bại
- Thông báo: "Tài khoản bị cấm đăng nhập trong 10 phút"
- Khóa tự động mở sau 10 phút

---

## 🔧 Cấu trúc kỹ thuật

### User Model (`models/User.js`)
```javascript
failedLoginAttempts: Number (0)
accountLockedUntil: Date (null)
requiresCaptcha: Boolean (false)
```

**Logic:**
- `failedLoginAttempts === 5` → Set `requiresCaptcha = true`
- `failedLoginAttempts >= 10` → Set `accountLockedUntil` (10 phút)

### Login Controller (`controllers/authController.js`)
```javascript
// Sai password → incrementFailedAttempts()
if (user.failedLoginAttempts >= 5 && < 10) {
  showCaptcha = true;
  errorMsg = "Sai 5 lần. Vui lòng hoàn thành CAPTCHA.";
}

if (user.failedLoginAttempts >= 10) {
  errorMsg = "Tài khoản bị cấm đăng nhập trong 10 phút";
}
```

### CAPTCHA Validation (`middleware/captchaValidator.js`)
- Verify Google reCAPTCHA v3 token
- Check `result.success` và `result.score > 0.5` (production)
- Demo mode: chấp nhận mọi response

### Login Template (`views/login.ejs`)
```html
<!-- Hiển thị nếu requireCaptcha === true -->
<% if (requireCaptcha) { %>
  <div class="g-recaptcha" data-sitekey="..."></div>
<% } %>

<!-- Warning message -->
<% if (failedAttempts >= 5 && < 10) { %>
  ⚠️ Đã đăng nhập sai <%= failedAttempts %>/10 lần.
<% } %>
```

---

## 🔑 Google reCAPTCHA Configuration

### Demo Keys (cho testing)
```
Site Key:   6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
Secret Key: 6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe
```

### Production Setup
1. Truy cập: https://www.google.com/recaptcha/admin
2. Tạo project mới (v3)
3. Update `SECRET_KEY` trong `captchaValidator.js`
4. Update `data-sitekey` trong `login.ejs`

---

## 📊 Quy trình đăng nhập

```
┌─────────────────────────────────────┐
│   User nhập username + password     │
└──────────────────┬──────────────────┘
                   │
        ┌──────────▼──────────┐
        │  Password sai?      │
        └──────────┬──────────┘
                   │ NO
        ┌──────────▼──────────┐
        │  Increment counter  │
        └──────────┬──────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
    ▼ (5x)         ▼ (6-9x)       ▼ (10x+)
 CAPTCHA      CAPTCHA         ACCOUNT LOCKED
 Required     Required        (10 minutes)
    │              │              │
    ▼              ▼              ▼
  Show          Show            Show
 CAPTCHA      CAPTCHA          Error
 Form         Form             Message
```

---

## 🧪 Testing

### Test CAPTCHA Display
```bash
# 1. Truy cập http://localhost:3000/login
# 2. Nhập sai password 5 lần (username/password khác nhau)
# 3. Lần thứ 5: CAPTCHA sẽ xuất hiện
# 4. Nhập sai thêm 5 lần (tổng 10 lần)
# 5. Lần thứ 10: Hiện thông báo "Tài khoản bị cấm 10 phút"
```

### Kiểm tra Database
```bash
# View user attempts
db.users.findOne({username: "test"})
# Output:
# failedLoginAttempts: 5
# requiresCaptcha: true
# accountLockedUntil: 2025-12-16T10:30:00Z
```

### Reset Testing
```bash
# Clear attempts (sử dụng admin script)
node scripts/resetFailedAttempts.js <username>
```

---

## 🔒 Security Benefits

| Feature | Protection | Difficulty |
|---------|-----------|------------|
| **CAPTCHA at 5** | Slow brute-force | Medium |
| **Lock at 10 (10 min)** | Fast brute-force | High |
| **Failed logging** | Detection | Very High |
| **Account isolation** | System load | Very High |

---

## ⚙️ Configuration

### Adjust Thresholds
**File:** `models/User.js`

```javascript
// Captcha trigger
if (this.failedLoginAttempts === 5) { ... }

// Lock trigger (change to 3 for stricter)
if (this.failedLoginAttempts >= 10) { ... }

// Lock duration (change 10 to 30 for 30 minutes)
lockUntil.setMinutes(lockUntil.getMinutes() + 10);
```

### Switch CAPTCHA Validation
**File:** `middleware/captchaValidator.js`

```javascript
// Demo mode: Always pass
if (process.env.NODE_ENV === 'production' && !result.success) {
  // Only fail in production
}

// Production mode: Check score
if (result.score < 0.5) {
  // Reject if suspicions activity
}
```

---

## 📝 Audit Logging

Tất cả đăng nhập sai được ghi lại:

```javascript
await auditService.logAction('login_failed', 'account', {
  userId: user._id,
  username: user.username,
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  description: `Invalid password (attempt 5)`, // ← Shows count
  severity: 'warning',
  success: false
});
```

Admin có thể xem lịch sử:
- `/admin/audit-logs` - All failed login attempts
- Filter by: username, IP, timestamp, severity

---

## 🚀 Deployment

### Production Checklist
- [ ] Update CAPTCHA secret key từ Google
- [ ] Set `NODE_ENV=production`
- [ ] Enable strict CAPTCHA validation
- [ ] Test account lockout (10 phút)
- [ ] Monitor failed login attempts
- [ ] Alert on suspicious IP addresses

---

## 📞 Support

**Questions?**
- Check audit logs: `/admin/audit-logs`
- Reset user: `node scripts/resetFailedAttempts.js username`
- View user: `node scripts/listUsers.js`
