# 🛡️ CSRF Protection - Cơ chế Chi Tiết

## 1. CSRF là gì?

**CSRF (Cross-Site Request Forgery)** - Tấn công giả mạo yêu cầu theo trang

### Ví dụ tấn công CSRF

```html
<!-- Attacker website (attacker.com) -->
<img src="https://tmd1907.id.vn/transfer?to=hacker&amount=1000">

<!-- Hoặc form tự động submit -->
<form action="https://tmd1907.id.vn/transfer" method="POST">
  <input type="hidden" name="to" value="hacker">
  <input type="hidden" name="amount" value="1000">
</form>
<script>
  document.forms[0].submit();  // Tự động submit
</script>
```

**Điều gì xảy ra:**
1. User đang đăng nhập vào tmd1907.id.vn ✓ (Cookie lưu JWT token)
2. User vô tình vào attacker.com
3. attacker.com gửi request transfer tiền tới tmd1907.id.vn
4. Browser tự động gửi cookie theo request → Request được chấp nhận ❌
5. Tiền bị chuyển mà user không biết!

---

## 2. Cơ chế CSRF Protection

### Token-Based CSRF Protection (Double-Submit Token Pattern)

```
┌────────────────────────────────────────────────────────────┐
│ User truy cập trang login                                  │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │ Server tạo CSRF token        │
        │ 1. Random 32-byte            │
        │ 2. Lưu vào session (server)  │
        │ 3. Gửi trong HTML form       │
        └──────────────┬───────────────┘
                       │
┌──────────────────────▼───────────────────────────────────┐
│ Browser nhận HTML form                                   │
│ <form action="/login" method="POST">                     │
│   <input type="hidden" name="_csrf"                      │
│           value="a1b2c3d4e5f6...">                      │
│   <input type="text" name="username">                    │
│   <input type="password" name="password">                │
│ </form>                                                  │
└──────────────┬───────────────────────────────────────────┘
               │
               ▼
    User nhập username + password
    Browser submit form
               │
┌──────────────▼───────────────────────────────────────────┐
│ Request được gửi tới server                              │
│ POST /login                                              │
│ Body: {                                                  │
│   username: "user",                                      │
│   password: "pass",                                      │
│   _csrf: "a1b2c3d4e5f6..."  ← Token từ form             │
│ }                                                        │
└──────────────┬───────────────────────────────────────────┘
               │
               ▼
    ┌──────────────────────────────────┐
    │ Server kiểm tra CSRF token       │
    │ - Lấy token từ session           │
    │ - So sánh với token trong request│
    │                                  │
    │ Token match? → ✅ Tiếp tục       │
    │ Token khác? → ❌ Reject 403      │
    └──────────────────────────────────┘
```

---

## 3. Implementation Chi Tiết

### A. Tạo CSRF Token (generateCSRFToken middleware)

**File:** `middleware/csrf.js`

```javascript
const generateCSRFToken = (req, res, next) => {
  if (!req.session) {
    return next();
  }

  // Tạo token mới nếu chưa có
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    // Ví dụ: "7f3e9a2b1c4d8e5f6a9b3c2d1e4f8a7b6c9d2e1f3a4b5c6d7e8f9a0b1c2d"
  }

  // Lưu vào res.locals để dùng trong EJS template
  res.locals.csrfToken = req.session.csrfToken;

  next();
};
```

**Quy trình:**
1. ✅ Mỗi khi user request GET /login → tạo token ngẫu nhiên
2. ✅ Lưu vào `req.session.csrfToken` (server-side, bằng secure session cookie)
3. ✅ Truyền vào template qua `res.locals.csrfToken`
4. ✅ HTML form render token: `<input type="hidden" name="_csrf" value="<%= csrfToken %>">`

### B. Kiểm tra CSRF Token (verifyCsrfToken middleware)

**File:** `middleware/csrf.js`

```javascript
const verifyCsrfToken = (req, res, next) => {
  // 1. Bỏ qua check cho GET/HEAD/OPTIONS
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  // 2. Kiểm tra session có token không
  if (!req.session || !req.session.csrfToken) {
    console.warn('CSRF token missing from session');
    return res.status(403).redirect('/login?error=CSRF%20token%20hết%20hạn');
  }

  // 3. Lấy token từ 3 nơi có thể có
  const token = req.body._csrf ||              // Form body
                req.headers['x-csrf-token'] ||  // Header
                req.query._csrf;                // Query string

  // 4. So sánh token (must match exactly)
  if (!token || token !== req.session.csrfToken) {
    console.warn(`CSRF token mismatch`);
    return res.status(403).redirect('/login?error=CSRF');
  }

  // ✅ Token hợp lệ, tiếp tục
  next();
};
```

**Quy trình kiểm tra:**
```
Token trong request === Token trong session?
  ✅ YES → next() → Xử lý request
  ❌ NO  → 403 Forbidden → Reject
```

### C. Sử dụng trong Routes

**File:** `app.js` (line 186)

```javascript
app.post('/login', 
  requireGuest,           // Chỉ guest có thể login
  generateCSRFToken,      // Tạo token nếu chưa có
  loginValidation,        // Validate input
  verifyCsrfToken,        // ← Kiểm tra CSRF token
  authController.login    // Xử lý login
);
```

**Thứ tự middleware:**
1. generateCSRFToken → tạo token nếu chưa có
2. loginValidation → kiểm tra username/password format
3. verifyCsrfToken → **kiểm tra CSRF token** (bước quan trọng)
4. authController.login → xử lý login nếu mọi check pass

---

## 4. Trong HTML Form

**File:** `views/login.ejs` (line 190-195)

```html
<form action="/login" method="POST" id="loginForm">
  <!-- CSRF token hidden field -->
  <input type="hidden" name="redirect" value="<%= redirect || '/profile' %>">
  <input type="hidden" name="_csrf" value="<%= csrfToken || '' %>">
  
  <!-- Thông tin đăng nhập -->
  <div class="form-group">
    <label for="username">👤 Tên đăng nhập</label>
    <input type="text" id="username" name="username" required>
  </div>
  
  <div class="form-group">
    <label for="password">🔑 Mật khẩu</label>
    <input type="password" id="password" name="password" required>
  </div>
  
  <button type="submit">Đăng nhập</button>
</form>
```

**Form submission:**
```
POST /login
Content-Type: application/x-www-form-urlencoded

username=user&password=pass&_csrf=7f3e9a2b1c4d8e5f...
                               ↑
                          CSRF token được gửi kèm
```

---

## 5. Tại sao CSRF Protection Hiệu Quả?

### 🎯 Vấn đề CSRF không bảo vệ được:

```html
<!-- Attacker web site (attacker.com) -->
<img src="https://tmd1907.id.vn/transfer?to=hacker&amount=1000">
```

Browser gửi request này, **có cookie nhưng không có CSRF token**:
```
GET /transfer?to=hacker&amount=1000
Cookie: authToken=jwt_token...
<!-- Không có _csrf parameter! -->
```

### ✅ Server kiểm tra:

```javascript
const token = req.body._csrf || req.query._csrf;

if (!token || token !== req.session.csrfToken) {
  // token là undefined → reject ❌
  return res.status(403).redirect('/login?error=CSRF');
}
```

### 🛡️ Tại sao Attacker không thể lấy token?

1. **CSRF token lưu trên server** (không visible từ attacker site)
2. **Same-Origin Policy** ngăn JavaScript từ attacker.com đọc token
3. **HttpOnly cookie** không thể access từ JavaScript

```javascript
// Attacker thử lấy token
// ❌ FAIL - attacker.com không thể gửi request đến tmd1907.id.vn
fetch('https://tmd1907.id.vn/login')
  .then(r => r.text())
  .then(html => {
    // CORS error! Same-Origin Policy
    // attacker.com !== tmd1907.id.vn
  });
```

---

## 6. CSRF Protection Stack

### Layer 1: Token-Based CSRF
```
generateCSRFToken → Tạo unique token
verifyCsrfToken   → Kiểm tra token
```

### Layer 2: SameSite Cookie Attribute
```javascript
// middleware/csrf.js (line 60)
res.cookie('authToken', token, {
  sameSite: 'Strict'  // ← Cookie chỉ gửi từ same-site
});
```

**SameSite modes:**
- `Strict` → Cookie **không** gửi trong cross-site requests
- `Lax` → Cookie gửi trong top-level navigations (GET links)
- `None` → Cookie gửi trong tất cả requests (cần Secure flag)

### Layer 3: Custom Headers
```javascript
// Lấy token từ header thay vì body
const token = req.headers['x-csrf-token'];

// Attacker không thể set custom header từ `<img>` tag
```

---

## 7. Test CSRF Vulnerability

### ❌ Test 1: CSRF Attack (không có token)

```bash
# Attacker gửi request mà không có CSRF token
curl -X POST http://localhost:3000/login \
  -d "username=user&password=pass" \
  -H "Cookie: authToken=..."

# Server response:
# 403 Forbidden
# "CSRF token không hợp lệ"
```

### ✅ Test 2: Valid Request (có token)

```bash
# User gửi request từ form (có token)
curl -X POST http://localhost:3000/login \
  -d "username=user&password=pass&_csrf=a1b2c3d4e5f6..." \
  -H "Cookie: authToken=..."

# Server response:
# 200 OK / 401 Unauthorized (tùy username/password)
```

---

## 8. Security Checklist

| Yếu tố | Cài đặt | Trạng thái |
|--------|--------|-----------|
| CSRF Token Generation | `generateCSRFToken` | ✅ Hoàn thành |
| CSRF Token Verification | `verifyCsrfToken` | ✅ Hoàn thành |
| SameSite Cookie | `sameSite: 'strict'` | ✅ Hoàn thành |
| HttpOnly Flag | `httpOnly: true` | ✅ Hoàn thành |
| Secure Flag (HTTPS) | `secure: true` (production) | ✅ Hoàn thành |
| Custom Headers Support | `x-csrf-token` | ✅ Hoàn thành |
| Token Randomness | `crypto.randomBytes(32)` | ✅ Hoàn thành |
| Session Validation | Check `req.session` | ✅ Hoàn thành |

---

## 9. CSRF Flow Diagram (Detailed)

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: User navigates to https://tmd1907.id.vn/login          │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────────┐
        │ Server receives GET /login           │
        │ Middleware chain:                    │
        │ 1. express-session middleware        │
        │    → Creates req.session             │
        │ 2. generateCSRFToken middleware      │
        │    → if (!req.session.csrfToken)     │
        │        req.session.csrfToken =       │
        │          crypto.randomBytes(32)      │
        │          .toString('hex')            │
        │    → res.locals.csrfToken = token    │
        │ 3. Render login.ejs template         │
        └──────────┬───────────────────────────┘
                   │
                   ▼
        Session data (Server):
        {
          csrfToken: "7f3e9a2b1c4d8e5f6a9b..."
        }
                   │
                   ▼
        Set-Cookie header:
        connect.sid=s:abc123....; HttpOnly; Secure; SameSite=Strict
                   │
                   ▼
        HTML Response with embedded CSRF token:
        <input type="hidden" name="_csrf" 
               value="7f3e9a2b1c4d8e5f6a9b...">
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────┐
│ Step 2: User fills form and submits (POST /login)              │
│ Browser sends:                                                   │
│ - Form data: {username, password, _csrf token}                 │
│ - Cookie: connect.sid (session cookie)                         │
└──────────────┬───────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│ Step 3: Server receives POST /login                             │
│ Middleware: verifyCsrfToken                                    │
│                                                                  │
│ 1. Check if POST/PUT/DELETE: YES ✓                            │
│ 2. Retrieve req.session.csrfToken from server                 │
│    → "7f3e9a2b1c4d8e5f6a9b..."                                │
│ 3. Retrieve _csrf from req.body                                │
│    → req.body._csrf = "7f3e9a2b1c4d8e5f6a9b..."              │
│ 4. Compare tokens                                               │
│    "7f3e9a2b..." === "7f3e9a2b..." → ✅ TRUE                  │
│ 5. Call next() → Continue to authController.login              │
└──────────────┬───────────────────────────────────────────────────┘
               │
               ▼
        authController.login processes request
        (Validate password, etc.)
```

### Attack Scenario (Blocked by CSRF Protection)

```
┌─────────────────────────────────────────────────────────────────┐
│ Attacker creates malicious HTML (attacker.com)                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
<img src="https://tmd1907.id.vn/transfer?to=hacker&amount=1000">

OR

<form action="https://tmd1907.id.vn/transfer" method="POST">
  <input name="to" value="hacker">
  <input name="amount" value="1000">
  <!-- NO CSRF TOKEN! -->
</form>
<script>document.forms[0].submit();</script>
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ User visits attacker.com while logged into tmd1907.id.vn      │
│ Browser automatically sends request with session cookie        │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
POST /transfer?to=hacker&amount=1000
Cookie: connect.sid=s:abc123... (session exists)
/* NO _csrf token in body/header/query */
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ Server: verifyCsrfToken middleware                             │
│                                                                  │
│ const token = req.body._csrf ||                                │
│               req.headers['x-csrf-token'] ||                   │
│               req.query._csrf;                                 │
│ → token = undefined                                             │
│                                                                  │
│ if (!token || token !== req.session.csrfToken) {               │
│   ❌ REJECT: 403 Forbidden                                     │
│   return res.status(403).redirect(                             │
│     '/login?error=CSRF'                                        │
│   );                                                            │
│ }                                                               │
└──────────────┬───────────────────────────────────────────────────┘
               │
               ▼
        ❌ Request BLOCKED
        🛡️ User's money is SAFE
```

---

## 10. Best Practices

✅ **DO:**
- Always include CSRF token in forms
- Validate token on server for state-changing requests
- Use `SameSite=Strict` cookie attribute
- Use `HttpOnly` flag for session cookies
- Use HTTPS (Secure flag)
- Regenerate token after authentication

❌ **DON'T:**
- Expose CSRF token in URL (use POST body instead)
- Use same token for multiple users
- Store token in localStorage (XSS vulnerable)
- Skip CSRF check for "trusted" IPs
- Use weak random token generators

---

## 📚 References

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN: Cross-Site Request Forgery (CSRF)](https://developer.mozilla.org/en-US/docs/Glossary/CSRF)
- [SameSite Cookie Explained](https://web.dev/samesite-cookies-explained/)

---

**Created:** 20 December 2025
**CSRF Protection Status:** ✅ FULLY IMPLEMENTED
