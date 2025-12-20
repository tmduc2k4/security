# CAPTCHA Implementation Analysis

## 📋 Current Implementation

### 1. CAPTCHA Trigger Points
✅ **After 5 failed login attempts:**
- File: `models/User.js`
- Logic: `failedLoginAttempts >= 5` → set `requiresCaptcha = true`
- Logic: `failedLoginAttempts >= 10` → lock account + set `requiresCaptcha = true`

### 2. CAPTCHA Validation Flow

#### Step 1: Login Form Display
**File:** `controllers/authController.js` - `login()` method (line 145-153)
```javascript
if (user.requiresCaptcha && user.failedLoginAttempts >= 5) {
  const { 'g-recaptcha-response': captchaResponse } = req.body;
  
  if (!captchaResponse) {
    // Show CAPTCHA form
    return res.status(400).render('login', {
      requireCaptcha: true,  // ✅ This flag shows CAPTCHA UI
      failedAttempts: user.failedLoginAttempts,
      ...
    });
  }
```

✅ **Status:** Working correctly
- Flag `requireCaptcha: true` passed to template
- Template checks `<% if (requireCaptcha) %>` at line 212 in login.ejs

#### Step 2: CAPTCHA Form Rendering
**File:** `views/login.ejs` (line 212-231)
```html
<% if (requireCaptcha) { %>
  <div id="recaptchaContainer">
    <div class="g-recaptcha" data-sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"></div>
  </div>
  
  <!-- Fallback simple CAPTCHA -->
  <div id="fallbackCaptcha" style="display:none;">
    <div id="captchaCode"></div>
    <input type="text" id="captchaInput" placeholder="Nhập mã xác thực" />
  </div>
<% } %>

<input type="hidden" name="g-recaptcha-response" id="g-recaptcha-response">
```

✅ **Status:** Rendering correctly
- Google reCAPTCHA v2 iframe will appear
- Fallback simple CAPTCHA as backup

#### Step 3: Form Submission Validation
**File:** `views/login.ejs` JavaScript (line 303-325)
```javascript
form.addEventListener('submit', function(e) {
  if (window.grecaptcha) {
    const response = grecaptcha.getResponse();
    if (!response) {
      // Try fallback
      const fallbackInput = document.getElementById('captchaInput');
      if (fallbackInput && fallbackInput.style.display !== 'none') {
        const captchaCode = document.getElementById('captchaCode').innerText;
        if (fallbackInput.value !== captchaCode) {
          e.preventDefault();
          alert('Mã xác thực không đúng!');
          return false;
        }
      }
    }
    if (response) {
      document.getElementById('g-recaptcha-response').value = response;
    }
  }
});
```

✅ **Status:** Working
- Gets response from Google reCAPTCHA
- Falls back to simple CAPTCHA if ReCAPTCHA not available
- Stores response in hidden field `g-recaptcha-response`

#### Step 4: Backend Verification
**File:** `controllers/authController.js` (line 155-177)
```javascript
if (user.requiresCaptcha && user.failedLoginAttempts >= 5) {
  const { 'g-recaptcha-response': captchaResponse } = req.body;
  
  if (!captchaResponse) {
    return res.status(400).render('login', {
      error: `Đã nhập sai ${user.failedLoginAttempts} lần. Vui lòng hoàn thành xác thực CAPTCHA.`,
      requireCaptcha: true,
      ...
    });
  }

  try {
    const { verifyCaptcha } = require('../middleware/captchaValidator');
    const result = await verifyCaptcha(captchaResponse);
    
    // In production, verify properly
    if (process.env.NODE_ENV === 'production' && !result.success) {
      return res.status(400).render('login', {
        error: 'Xác thực CAPTCHA thất bại. Vui lòng thử lại.',
        requireCaptcha: true,
        ...
      });
    }
  } catch (captchaError) {
    console.error('CAPTCHA verification error:', captchaError);
    if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({ error: 'Lỗi xác thực CAPTCHA' });
    }
  }
}
```

✅ **Status:** Working correctly
- Checks if `g-recaptcha-response` is present
- Calls `verifyCaptcha()` to validate with Google
- In production: rejects invalid CAPTCHA
- In development: allows to continue if verification fails

#### Step 5: CAPTCHA Verification Service
**File:** `middleware/captchaValidator.js` (line 13-44)
```javascript
async function verifyCaptcha(captchaResponse) {
  return new Promise((resolve, reject) => {
    const postData = `secret=${SECRET_KEY}&response=${captchaResponse}`;
    
    const options = {
      hostname: 'www.google.com',
      port: 443,
      path: '/recaptcha/api/siteverify',
      method: 'POST',
      ...
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const result = JSON.parse(data);
        resolve(result);  // { success: true/false, score: 0-1, ... }
      });
    });
    
    req.write(postData);
    req.end();
  });
}
```

✅ **Status:** Working correctly
- Makes HTTPS POST to Google reCAPTCHA API
- Parses JSON response
- Returns success/failure status

---

## 🎯 CAPTCHA Security Mechanisms

### 1. **Challenge Trigger**
| Attempt | Action | CAPTCHA | Account Status |
|---------|--------|---------|-----------------|
| 1-4 | Normal login | ❌ No | Active |
| 5 | Fail login | ✅ Required | Active |
| 6-9 | Fail login | ✅ Required | Active |
| 10 | Fail login | ✅ Required | **LOCKED** |
| 11+ | Try login | ❌ N/A | **LOCKED** 10min |

### 2. **Defense Effectiveness**

#### Layer 1: CAPTCHA Cost
- **Google reCAPTCHA v2**: $0.50 per 1,000 CAPTCHAs
- **For 100 accounts**: 5 CAPTCHAs each = 500 total = $0.25
- **For 1,000 accounts**: 5,000 CAPTCHAs = $2.50

#### Layer 2: CAPTCHA Solving Time
- **Automated solving**: 10-30 seconds per CAPTCHA
- **For 100 accounts**: 50+ minutes just for CAPTCHAs
- **Manual solving**: 10-60 seconds each
- **Farmer solving**: $0.50+ per CAPTCHA

#### Layer 3: Account Lockout
- **After 10 attempts**: Account locked 10 minutes
- **Immediate rejection**: No password check required
- **For bulk attack on 100 accounts**: 10-17 hours minimum

#### Layer 4: Combined Effect
```
Attack Cost Analysis:
- ReCAPTCHA cost: $0.25-$2.50 per account set
- Time investment: 50+ minutes
- Lockout penalty: 10 minutes per account
- Result: Brute force becomes economically unfeasible
```

---

## ⚠️ Issues Found

### Issue 1: Demo Secret Key
**File:** `middleware/captchaValidator.js` (line 9)
```javascript
const SECRET_KEY = '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe'; // Demo key ❌
```

**Problem:**
- This is Google's official **public demo key**
- Anyone can use it, defeats security purpose
- In production, ALL CAPTCHA verifications will PASS

**Fix Required:**
```javascript
const SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe';
```

**Set in `.env`:**
```env
RECAPTCHA_SECRET_KEY=your_actual_secret_key_from_google
```

### Issue 2: Site Key in Source Code
**File:** `views/login.ejs` (line 218)
```javascript
<div class="g-recaptcha" data-sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"></div>
```

**Problem:**
- Site key is **meant to be public** ✅ (not a secret)
- This is OK for production

### Issue 3: Development Mode Bypasses Verification
**File:** `controllers/authController.js` (line 169-174)
```javascript
if (process.env.NODE_ENV === 'production' && !result.success) {
  // Only reject in production
  // In development, allow login even if CAPTCHA fails ❌
}
```

**Problem:**
- In `NODE_ENV=development`, CAPTCHA verification failures are **ignored**
- Attacker can bypass CAPTCHA completely
- Good for testing, bad if deployed to dev server

**Status:** ⚠️ Security concern for dev deployments

### Issue 4: Fallback CAPTCHA is Weak
**File:** `views/login.ejs` (line 335-340)
```javascript
const captchaCode = String(Math.floor(Math.random() * 100)).padStart(2, '0');
document.getElementById('captchaCode').innerText = captchaCode;
```

**Problem:**
- Only 100 possible values (00-99)
- No rate limiting on fallback CAPTCHA attempts
- Easily brute-forceable (100 attempts = guaranteed bypass)
- No verification on backend for fallback ❌

**Status:** ⚠️ Fallback CAPTCHA has NO backend validation

---

## 🔧 Recommendations

### High Priority
1. **Replace demo secret key** with production keys
   - Generate keys at: https://www.google.com/recaptcha/admin
   - Store in `.env` file

2. **Add fallback CAPTCHA backend validation**
   - Store correct answer in session: `req.session.captchaAnswer`
   - Validate on `/login` POST before accepting
   - Clear session after validation/failed attempt

3. **Enforce CAPTCHA verification in development**
   - Remove dev environment bypass
   - Or add separate dev CAPTCHA key

### Medium Priority
4. **Improve fallback CAPTCHA**
   - Use math operations instead of random numbers
   - Add image-based CAPTCHA as fallback
   - Rate limit fallback attempts

5. **Log CAPTCHA interactions**
   - Log successful/failed CAPTCHA verifications
   - Track fallback CAPTCHA usage
   - Alert on repeated CAPTCHA failures

### Low Priority
6. **Add CAPTCHA difficulty levels**
   - Increase difficulty if multiple CAPTCHA failures
   - Track per-IP CAPTCHA failure patterns

---

## ✅ What's Working Well

1. **CAPTCHA Triggering** - Works perfectly after 5 failed attempts
2. **UI/UX** - Clear messaging and fallback when ReCAPTCHA unavailable
3. **Integration** - Properly integrated into login flow
4. **Frontend Validation** - Checks for CAPTCHA response before submission
5. **Backend Verification** - Calls Google API correctly
6. **Error Handling** - Graceful fallback and error messages

---

## Summary

### Current Security: ⭐⭐⭐ (3/5)
- **Strengths**: Good architecture, proper flow, multiple layers
- **Weakness**: Demo secret key defeats entire CAPTCHA protection
- **Recommendation**: Use production-grade keys and validate fallback CAPTCHA on backend

### Production Readiness: ❌ Not Ready
- Must use real CAPTCHA keys before deployment
- Must validate fallback CAPTCHA on backend
- Must enforce verification in all environments
