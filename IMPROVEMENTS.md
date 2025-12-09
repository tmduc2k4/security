# Web Security Enhancements

Cải thiện bảo mật dựa trên dự án Nodejs backend. Thêm 5 tính năng chính:

## 1. Role-Based Access Control (RBAC)

**Mô tả:** Quản lý quyền hạn dựa trên vai trò (role)

**Vai trò:**
- `user` - Người dùng thường
- `admin` - Quản trị viên
- `superadmin` - Siêu quản trị

**Tệp:**
- `models/User.js` - Thêm fields: `role`, `permissions`, `isActive`
- `middleware/rbac.js` - 4 middleware:
  - `requireRole(role)` - Kiểm tra vai trò
  - `requirePermission(permission)` - Kiểm tra quyền hạn
  - `requireRoleAndPermission(role, permission)` - Kiểm tra cả hai
  - `setDefaultPermissions()` - Set quyền mặc định

**Cách dùng:**
```javascript
// Chỉ admin có thể truy cập
app.get('/admin', requireAuth, requireRole('admin'), handler);

// Phải có quyền view_users
app.get('/users', requireAuth, requirePermission('view_users'), handler);

// Phải là admin hoặc superadmin VÀ có quyền edit_users
app.post('/users/:id', requireRoleAndPermission(['admin', 'superadmin'], 'edit_users'), handler);
```

**Quyền hạn:**
- `view_profile` - Xem hồ sơ
- `edit_profile` - Sửa hồ sơ
- `view_users` - Xem danh sách người dùng
- `edit_users` - Sửa thông tin người dùng
- `delete_users` - Xóa người dùng
- `view_logs` - Xem nhật ký hoạt động
- `manage_roles` - Quản lý vai trò
- `manage_system` - Quản lý hệ thống

---

## 2. Audit Logging System

**Mô tả:** Ghi lại tất cả hoạt động của người dùng để tracking và security monitoring

**Các hành động được ghi:**
- `login_success` - Đăng nhập thành công
- `login_failed` - Đăng nhập thất bại
- `password_change` - Thay đổi mật khẩu
- `2fa_enable` - Bật xác thực 2 yếu tố
- `2fa_disable` - Tắt xác thực 2 yếu tố
- `user_delete` - Xóa người dùng
- `role_change` - Thay đổi vai trò
- ... và nhiều hành động khác

**Thông tin được ghi:**
- User ID, Username
- IP Address, User Agent
- Thời gian, Mức độ ảnh hưởng (severity)
- Thay đổi (changes) trước/sau
- Kết quả (success/failed)

**Tệp:**
- `models/AuditLog.js` - Schema để lưu trữ
- `services/auditService.js` - 5 hàm:
  - `logAction()` - Ghi hành động
  - `getUserLogs()` - Xem nhật ký của user
  - `getSystemLogs()` - Xem nhật ký hệ thống (admin)
  - `getSuspiciousActivities()` - Các hoạt động đáng ngờ
  - `getActivityStats()` - Thống kê hoạt động

**Cách dùng:**
```javascript
const auditService = require('./services/auditService');

// Ghi hành động
await auditService.logAction('login_success', 'account', {
  userId: user._id,
  username: user.username,
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  statusCode: 200,
  severity: 'info'
});

// Xem nhật ký người dùng
const logs = await auditService.getUserLogs(userId, {
  action: 'login_success',
  limit: 20,
  page: 0
});

// Xem các hoạt động đáng ngờ
const suspicious = await auditService.getSuspiciousActivities({
  hours: 24,
  ipAddress: '192.168.1.1'
});
```

---

## 3. CSRF Protection

**Mô tả:** Bảo vệ chống Cross-Site Request Forgery (CSRF) attacks

**Cách hoạt động:**
- Mỗi session có CSRF token duy nhất
- Token được gửi vào form và verify lại
- Token thay đổi sau mỗi request

**Tệp:**
- `middleware/csrf.js` - 3 middleware:
  - `generateCSRFToken()` - Tạo token cho request
  - `verifyCsrfToken()` - Kiểm tra token
  - `refreshCSRFToken()` - Làm mới token

**Cách dùng:**

HTML form:
```html
<form method="POST" action="/submit">
  <input type="hidden" name="_csrf" value="<%= csrfToken %>">
  <input type="text" name="username">
  <button type="submit">Submit</button>
</form>
```

AJAX request:
```javascript
fetch('/api/submit', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': document.querySelector('[name="_csrf"]').value
  },
  body: JSON.stringify(data)
});
```

Express middleware:
```javascript
app.post('/submit', verifyCsrfToken, handler);
```

---

## 4. Email Verification

**Mô tả:** Xác thực email khi người dùng đăng ký

**Quy trình:**
1. User đăng ký → Tạo token xác thực
2. Gửi email với link verify
3. User click link trong email
4. Verify token → Mark email as verified
5. User có thể sử dụng tài khoản

**Token:**
- Tạo random 32 bytes
- Hash SHA256 để lưu database
- Gửi unhashed version qua email
- Hết hạn sau 24 giờ

**Tệp:**
- `models/EmailVerification.js` - Schema
- `services/emailVerificationService.js` - 5 hàm:
  - `generateVerificationToken()` - Tạo token
  - `sendVerificationEmail()` - Gửi email
  - `verifyEmail()` - Xác thực token
  - `isEmailVerified()` - Kiểm tra đã verify chưa
  - `resendVerificationEmail()` - Gửi lại email

**Cách dùng:**
```javascript
const emailService = require('./services/emailVerificationService');

// Khi user đăng ký
const newUser = new User({username, email, password});
await newUser.save();
await emailService.sendVerificationEmail(newUser);

// Khi user click link verify
app.get('/verify-email', async (req, res) => {
  const user = await emailService.verifyEmail(req.query.token);
  res.render('verified', {user});
});

// Gửi lại email
app.post('/resend-verification', async (req, res) => {
  await emailService.resendVerificationEmail(req.body.email);
  res.json({message: 'Email đã được gửi'});
});
```

---

## 5. Session Management

**Mô tả:** Quản lý session người dùng, cho phép logout khỏi các device khác

**Features:**
- Secure session cookies (httpOnly, sameSite)
- Session expiry tự động (24 giờ)
- Tracking multiple sessions per user
- Logout khỏi các thiết bị khác

**Tệp:**
- `middleware/session.js` (cần tạo)
- `models/Session.js` (cần tạo)

**Cách dùng:**
```javascript
// Đăng nhập → tạo session
app.post('/login', async (req, res) => {
  const session = await sessionService.createSession(user._id, req);
  res.cookie('sessionId', session.sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
  });
});

// Xem tất cả sessions
app.get('/profile/sessions', requireAuth, async (req, res) => {
  const sessions = await sessionService.getUserSessions(req.user._id);
  res.json(sessions);
});

// Logout khỏi tất cả devices
app.post('/logout-all', requireAuth, async (req, res) => {
  await sessionService.terminateAllSessions(req.user._id);
  res.json({message: 'Đã logout khỏi tất cả thiết bị'});
});

// Logout khỏi 1 device cụ thể
app.post('/sessions/:sessionId/revoke', requireAuth, async (req, res) => {
  await sessionService.revokeSession(req.params.sessionId);
  res.json({message: 'Session đã bị thu hồi'});
});
```

---

## Installation & Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Environment variables
```bash
# .env file
PORT=3000
MONGODB_URI=mongodb://localhost:27017/security
JWT_SECRET=your-secret-key
SESSION_SECRET=your-session-secret
GMAIL_USER=your_email@gmail.com
GMAIL_PASSWORD=your_app_password
APP_URL=http://localhost:3000
NODE_ENV=development
```

### 3. Create admin account
```bash
npm run create-admin
```

### 4. Start server
```bash
npm start
# hoặc dev mode
npm run dev
```

---

## Testing

### Test RBAC
```bash
# Login as admin
# Try accessing /admin page
curl -b cookies.txt http://localhost:3000/admin
```

### Test Audit Logging
```bash
# View audit logs
curl -b cookies.txt http://localhost:3000/admin/audit-logs

# View your activity
curl -b cookies.txt http://localhost:3000/profile/activity
```

### Test CSRF
```bash
# CSRF token được tự động include trong session
# Form sẽ có hidden field _csrf
# Nếu token sai, request sẽ bị từ chối
```

### Test Email Verification
```bash
# Đăng ký account mới
# Email verify sẽ được gửi tới email đã register
# Click link trong email để verify
# Email sẽ được marked as verified
```

---

## Security Features Summary

### Existing (từ phase trước)
✅ JWT Authentication (7 days)
✅ Bcryptjs password hashing
✅ Strong password policy (12+ chars, special chars)
✅ Password history (5 passwords)
✅ Password expiry (90 days)
✅ 2FA/MFA with TOTP
✅ Account lockout (5 attempts, 30 min)
✅ Password reset with email
✅ Rate limiting (100 req/15 min)
✅ Helmet WAF protection
✅ SQL injection prevention
✅ XSS protection
✅ NoSQL injection prevention
✅ HPP protection
✅ Path traversal prevention

### New (từ phase này)
✅ Role-Based Access Control (RBAC)
✅ Audit Logging System
✅ CSRF Protection
✅ Email Verification
⏳ Session Management (coming)

---

## Architecture Diagram

```
User Request
    ↓
Helmet WAF Middleware
    ↓
Rate Limiting
    ↓
CSRF Token Validation
    ↓
JWT Authentication
    ↓
Authorization (RBAC)
    ↓
Route Handler
    ↓
Audit Logger (log action)
    ↓
Response
```

---

## Database Schema

### User
```javascript
{
  username: String (unique),
  email: String (unique),
  password: String (bcrypt),
  role: Enum ('user', 'admin', 'superadmin'),
  permissions: [String],
  emailVerified: Boolean,
  twoFactorEnabled: Boolean,
  passwordHistory: [{password, changedAt}],
  passwordExpiresAt: Date,
  accountLockedUntil: Date,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### AuditLog
```javascript
{
  userId: ObjectId,
  username: String,
  action: String (enum),
  resourceType: String (enum),
  ipAddress: String,
  userAgent: String,
  changes: Map,
  severity: String (info/warning/critical),
  success: Boolean,
  timestamp: Date
}
```

### EmailVerification
```javascript
{
  userId: ObjectId,
  email: String,
  tokenHash: String,
  verified: Boolean,
  expiresAt: Date (24 hours),
  attempts: Number
}
```

---

## Next Steps

1. **Create Admin Dashboard** - UI để quản lý users, roles, logs
2. **Implement Session Management** - Logout khỏi devices khác
3. **Add API Rate Limiting per User** - Prevent abuse
4. **Implement Email Service** - Queue email tasks
5. **Add 2FA Recovery Codes** - Backup codes để khôi phục 2FA
6. **Implement User Notifications** - Email alerts cho activities
7. **Add IP Whitelist/Blacklist** - Trusted devices
8. **Implement Web Activity Tracking** - Page views, interactions

---

## References

- [OWASP Top 10 Security Risks](https://owasp.org/www-project-top-ten/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Node.js Security Checklist](https://blog.npmjs.org/post/173912649832/nodejs-npm-security)
- [CSRF Protection](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Role-Based Access Control](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
