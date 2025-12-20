# 🔍 CAPTCHA Logic Analysis - Vấn đề Tìm Thấy

## Tóm Tắt Vấn Đề

CAPTCHA logic có **3 vấn đề chính** cần sửa:

---

## 🔴 Vấn Đề 1: Logic CAPTCHA Check Không Hoàn Chỉnh

### Current Logic (Sai)

**File:** `middleware/captchaValidator.js` line 60

```javascript
if (user && user.requiresCaptcha && user.failedLoginAttempts >= 5) {
  // Validate CAPTCHA
}
```

### Vấn Đề

1. **requiresCaptcha được set chỉ 1 lần**
   ```javascript
   // User.js line 188
   if (this.failedLoginAttempts === 5) {
     this.requiresCaptcha = true;  // ← Chỉ set khi === 5
   }
   ```

2. **failedLoginAttempts tiếp tục tăng 6, 7, 8, 9, 10**
   ```
   Lần 1: attempts = 1, requiresCaptcha = false
   Lần 2: attempts = 2, requiresCaptcha = false
   ...
   Lần 5: attempts = 5, requiresCaptcha = true ✓
   Lần 6: attempts = 6, requiresCaptcha = true (still)
   ...
   Lần 10: attempts = 10, requiresCaptcha = true, THEN accountLocked = true
   ```

3. **Khi account bị lock → CAPTCHA check không còn có ý nghĩa**
   ```javascript
   // authController.js line 114
   if (user.isAccountLocked()) {
     // Account locked! 10 phút
     return res.status(401).render('login', {
       error: `Tài khoản bị khóa do đăng nhập sai quá nhiều lần...`
     });
   }
   // CAPTCHA validator ở middleware không bao giờ reach được vì 
   // account đã bị lock rồi
   ```

### Flow Sai

```
Lần 5 sai:
  1. authController increment failed → attempts = 5, requiresCaptcha = true ✓
  2. Render login: requireCaptcha = true, hiển thị CAPTCHA ✓

Lần 6 sai (mà KHÔNG submit CAPTCHA):
  1. validateCaptcha middleware check:
     if (requiresCaptcha && failedLoginAttempts >= 5) 
     → TRUE (requiresCaptcha = true từ lần 5, attempts = 5)
  2. Nếu không có captchaResponse → reject với "Vui lòng hoàn thành CAPTCHA"
  3. Nhưng user chưa increment failed attempts!
  4. failedLoginAttempts vẫn = 5!

Lần 6 sai (nhưng submit CAPTCHA):
  1. validateCaptcha middleware verify CAPTCHA ✓
  2. Tiếp tục → authController.login
  3. authController increment failed → attempts = 6
  4. Render login: requireCaptcha = true, hiển thị CAPTCHA lại

...

Lần 10 sai:
  1. authController increment failed → attempts = 10, accountLocked = true
  2. Check isAccountLocked() → return true
  3. Reject ngay: "Account locked 10 phút"
  4. CAPTCHA không được display
```

---

## 🔴 Vấn Đề 2: requiresCaptcha Flag Management

### Vấn đề Chi Tiết

**requiresCaptcha được set lần duy nhất:**
```javascript
// User.js line 188
if (this.failedLoginAttempts === 5) {
  this.requiresCaptcha = true;
}
```

**Các trường hợp:**
1. Lần 5 sai login → `failedLoginAttempts = 5` → `requiresCaptcha = true` ✓
2. Lần 6 sai login → `failedLoginAttempts = 6` → không có code set nó lại (vẫn = true) ✓
3. Login thành công → `resetFailedAttempts()` → `requiresCaptcha = false` ✓
4. Nhưng nếu user bị lock ở lần 10 → account locked 10 phút → password không được check → `resetFailedAttempts()` không được gọi

**Kết quả:** Nếu account unlock sau 10 phút:
- `failedLoginAttempts` vẫn = 10 (không reset)
- `requiresCaptcha` vẫn = true (không reset)
- User lại phải submit CAPTCHA, nhưng attempts vẫn = 10 → bị lock lại!

---

## 🔴 Vấn Đề 3: Middleware Order Sai

**Current Order:**
```javascript
app.post('/login',
  requireGuest,           // 1. Check user chưa login
  generateCSRFToken,      // 2. Create/get CSRF token
  loginValidation,        // 3. Validate input format
  verifyCsrfToken,        // 4. Verify CSRF token
  validateCaptcha,        // 5. ← Check CAPTCHA (EARLY!)
  authController.login    // 6. ← Validate password & increment (LATE!)
);
```

**Vấn đề:** `validateCaptcha` chạy **trước** password validation, nhưng kiểm tra `failedLoginAttempts >= 5` mà lúc này chưa increment!

**Flow sai:**

```
Lần 1 login sai:
  1. validateCaptcha: user.failedLoginAttempts = 0 → không check CAPTCHA ✓
  2. authController: validate password sai → increment 0→1 ✓
  3. Render login: requireCaptcha = false, failedAttempts = 1 ✓

...

Lần 5 login sai:
  1. validateCaptcha: user.failedLoginAttempts = 4 (từ lần 4) 
     → failedAttempts < 5 → không check CAPTCHA! ❌
  2. authController: validate password sai → increment 4→5
     → set requiresCaptcha = true
  3. Render login: requireCaptcha = true, failedAttempts = 5

Lần 6 login sai (submit CAPTCHA từ lần 5):
  1. validateCaptcha: user.failedLoginAttempts = 5, requiresCaptcha = true
     → Check CAPTCHA ✓
  2. authController: validate password sai → increment 5→6
  3. Render login: requireCaptcha = true, failedAttempts = 6
```

**Kết quả:** Lần 5 sai không được bắt bởi validateCaptcha! User không biết phải submit CAPTCHA cho lần 6 nếu họ không submit password lại.

---

## ✅ Giải Pháp

### Solution 1: Sửa requiresCaptcha Logic

Thay vì check `failedLoginAttempts === 5`, nên check `failedLoginAttempts >= 5 && failedLoginAttempts < 10`:

```javascript
// User.js
if (this.failedLoginAttempts >= 5 && this.failedLoginAttempts < 10) {
  this.requiresCaptcha = true;
}

// Khi lock account, clear CAPTCHA flag (hoặc giữ để sau khi unlock)
if (this.failedLoginAttempts >= 10) {
  // Tùy logic - có thể giữ requiresCaptcha = true
  // để sau unlock vẫn phải CAPTCHA
}
```

### Solution 2: Sửa Middleware Order

Chuyển `validateCaptcha` **sau** `authController.login` nhưng **trước** password increment:

```javascript
// Option A: Custom middleware trong authController
app.post('/login',
  requireGuest,
  generateCSRFToken,
  loginValidation,
  verifyCsrfToken,
  authController.loginWithCaptcha  // Combined middleware
);

// Option B: Sửa flow trong authController
// 1. Check account locked
// 2. Check requiresCaptcha → validate CAPTCHA
// 3. Validate password
// 4. Increment failed attempts
```

### Solution 3: Xử Lý Account Unlock

Khi account auto-unlock sau 10 phút, reset flags:

```javascript
// User.js
userSchema.pre('findOne', function(next) {
  // Check nếu accountLockedUntil < now → unlock
  if (this.accountLockedUntil && this.accountLockedUntil < new Date()) {
    this.accountLockedUntil = null;
    this.failedLoginAttempts = 0;
    this.requiresCaptcha = false;
    this.save();
  }
  next();
});
```

---

## 📊 Recommended Flow

```
┌─────────────────────────────────────────┐
│ POST /login (username + password)       │
└──────────────┬──────────────────────────┘
               │
               ▼
    ┌──────────────────────────────┐
    │ Middleware 1: Validation     │
    │ - requireGuest               │
    │ - generateCSRFToken          │
    │ - loginValidation            │
    │ - verifyCsrfToken            │
    └──────────────┬───────────────┘
                   │
                   ▼
    ┌──────────────────────────────┐
    │ authController.login START    │
    │                              │
    │ 1. Find user by username     │
    │ 2. Check isAccountLocked()   │
    │    → locked? return 401      │
    │ 3. Check requiresCaptcha     │
    │    → need CAPTCHA?           │
    │       Check g-recaptcha-resp │
    │       → invalid? return 400  │
    │ 4. Validate password         │
    │    → invalid?                │
    │       - Increment attempts   │
    │       - Set requiresCaptcha  │
    │       - Check lock (>= 10)   │
    │       - Return 401           │
    │ 5. Login success             │
    │    - Reset failedAttempts    │
    │    - Create JWT              │
    │    - Redirect /profile       │
    └──────────────────────────────┘
```

---

## 🎯 Kiểm tra chi tiết

Các điểm cần kiểm tra:

1. ✅ **failedLoginAttempts increment logic**
   - Chỉ increment khi password sai
   - NOT increment khi CAPTCHA sai
   - NOT increment khi account bị lock

2. ✅ **requiresCaptcha flag logic**
   - Set = true khi failedLoginAttempts >= 5
   - Set = false khi login success hoặc account unlock

3. ✅ **Account lock logic**
   - Lock khi failedLoginAttempts >= 10
   - Auto unlock sau 10 phút
   - Reset flags khi unlock

4. ✅ **CAPTCHA validation order**
   - Check requiresCaptcha BEFORE password validation
   - Reject nếu CAPTCHA required nhưng không có/sai
   - Cho phép tiếp tục nếu CAPTCHA đúng

5. ✅ **Error messages**
   - Lần 1-4: "Tên đăng nhập hoặc mật khẩu không đúng"
   - Lần 5-9: "Vui lòng hoàn thành CAPTCHA" (nếu không submit) hoặc "Sai X lần"
   - Lần 10+: "Tài khoản bị khóa 10 phút"

---

## Current Status

❌ **NOT WORKING CORRECTLY**
- Logic phức tạp, nhiều trường hợp sai
- Cần refactor toàn bộ

✅ **Recommended fix**
- Chuyển logic vào authController
- Đơn giản hóa requiresCaptcha flag management
- Thêm proper account unlock handling
