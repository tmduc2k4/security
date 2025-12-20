# Login View Structure Fix

## Problem Description
The login.ejs view had broken HTML structure that was causing:
1. Orphaned HTML elements appearing when account was NOT locked
2. Countdown timer script placed in wrong code block
3. Locked form appearing in the `else` block instead of the `if (failedAttempts >= 10)` block
4. User confusion from seeing both error message and locked account UI simultaneously

### Visual Issue (User's Screenshot)
```
Error Message: "Đã nhập sai 11 lần. Vui lòng hoàn thành xác thực CAPTCHA."
[Locked Account UI with 09:29 countdown]
[Disabled Login Form]
```

This created confusion because:
- The error message suggests CAPTCHA is needed
- But the locked account section shows the account is locked
- And the form is disabled anyway

## Root Cause
The hidden form and countdown timer script for the locked state were placed INSIDE the `else` block (normal login state) instead of being part of the `if (failedAttempts >= 10)` block.

### Before (Broken Structure)
```html
<% if (failedAttempts && failedAttempts >= 10) { %>
  <!-- Locked Account Display -->
  ...
  <a href="/forgot-password">❓ Quên mật khẩu?</a>
</div>

<!-- ❌ WRONG PLACE: These should be ABOVE the else block -->
<form style="opacity: 0.5; pointer-events: none;">
  <!-- Hidden locked form -->
</form>

<% } else { %>
  <!-- Normal login state -->
  <% if (error) { %>
    <div class="error-message"><%= error %></div>
  <% } %>
  
  <!-- ❌ ORPHANED HTML from above -->
  </p></div>
  ...
  <!-- ❌ ORPHANED FORM from locked state -->
  <!-- ❌ ORPHANED COUNTDOWN SCRIPT from locked state -->
<% } %>
```

### After (Fixed Structure)
```html
<% if (failedAttempts && failedAttempts >= 10) { %>
  <!-- Locked Account Display -->
  ...
  <a href="/forgot-password">❓ Quên mật khẩu?</a>
</div>

<!-- ✅ NOW IN CORRECT PLACE: Inside the if block -->
<form style="opacity: 0.5; pointer-events: none;">
  <!-- Hidden locked form -->
</form>

<script>
  // Countdown timer for locked account
  function startCountdown() { ... }
</script>

<% } else { %>
  <!-- ✅ Normal login state -->
  <% if (error) { %>
    <div class="error-message"><%= error %></div>
  <% } %>
  
  <!-- ✅ Warning message section (only shows for 5-9 attempts) -->
  <% if (failedAttempts && failedAttempts > 0) { %>
    <!-- Warning for attempts < 10 -->
  <% } %>
<% } %>

<!-- Normal login/2FA form -->
```

## Changes Made

### File: views/login.ejs

**Line 191-237:** Locked account section (if `failedAttempts >= 10`)
- ✅ Correct placement (inside if block)
- Shows professional locked account UI
- Shows countdown timer
- Shows password reset link

**Lines 239-281:** Hidden form + countdown timer script
- ✅ FIXED: Moved these lines BEFORE the `<% } else { %>` block
- This is where they belong (inside the locked account if block)
- Countdown timer now runs only when account is locked

**Lines 282-287:** Transition to normal login state
- ✅ Now properly starts the `else` block
- Contains error message display logic

**Lines 304-318:** Warning message section
- ✅ Only displays for attempts >= 5 and < 10
- Shows countdown to account lockout

**Lines 320+:** Normal login/2FA form
- ✅ Displays normally when account is not locked

## Expected Behavior After Fix

### When Account is NOT Locked (failedAttempts < 10)
1. **No Failed Attempts (0):** Normal login form displays
2. **Failed Attempts 1-4:** 
   - Error message shows (if any)
   - Warning message shows (e.g., "Bạn đã nhập sai X lần")
   - Login form displays with no CAPTCHA
3. **Failed Attempts 5-9:**
   - Error message shows (if any)
   - Warning message shows (e.g., "Bạn đã nhập sai X lần, CAPTCHA yêu cầu!")
   - Login form displays with CAPTCHA

### When Account IS Locked (failedAttempts >= 10)
1. Professional locked account display shows:
   - 🔒 Large lock icon
   - "Tài khoản bị khóa" title
   - "Bạn đã nhập sai mật khẩu 10 lần" info
   - Countdown timer (10:00 → 00:00)
   - Info box explaining the lockout
   - Password reset link
2. Hidden disabled form prevents interaction
3. Countdown timer script runs on page load
4. When timer reaches 00:00, display changes to "✅ Tài khoản đã mở khóa"

### Error Messages
- **Locked Account:** Server returns: `error: "Tài khoản bị khóa do đăng nhập sai quá nhiều lần. Thử lại sau X phút."` (but NOT shown because account displays cleanly)
- **CAPTCHA Required:** Server returns: `error: "Đã nhập sai X lần. Vui lòng hoàn thành xác thực CAPTCHA."` (only shows if CAPTCHA is missing)
- **Password Wrong:** Server returns: `error: "Tên đăng nhập hoặc mật khẩu không đúng"` (only shows for attempts < 5)

## Commit Information

- **Commit Hash:** 9d2c94b
- **Commit Message:** "Fix: Correct HTML structure for locked account display - move countdown timer and form inside if block"
- **Files Changed:** views/login.ejs
- **Lines Modified:** 191-318 (restructured)

## Testing Checklist

- [ ] Test with 0 failed attempts: Normal login form displays
- [ ] Test with 3 failed attempts: Error + warning message + form
- [ ] Test with 6 failed attempts: Error + warning (CAPTCHA required) + CAPTCHA form
- [ ] Test with 10 failed attempts: Locked account screen only (no error/form)
- [ ] Verify countdown timer appears and decrements
- [ ] Verify timer reaches 00:00 and page reloads
- [ ] Verify after unlock, account can login normally

## Notes for Production

The fix ensures:
1. Clean, professional UI when account is locked
2. No redundant error messages or orphaned HTML
3. Proper CAPTCHA display for 5-9 attempts
4. Countdown timer only runs when needed
5. Better user experience and reduced confusion

All changes are backward compatible and don't affect the backend authentication logic.
