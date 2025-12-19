# 📊 Hướng dẫn Test Rate Limiting

## 1. Rate Limit Configuration

**Current Config:**
```javascript
// Strict limiter for /login endpoint
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                     // Max 5 requests
  message: 'Quá nhiều request, vui lòng thử lại sau'
});

app.post('/login', strictLimiter, ...);
```

**Tức là:** 
- Maximum **5 requests/15 minutes** trên endpoint `/login`
- Request thứ 6 sẽ nhận HTTP **429 Too Many Requests**
- Sau 15 phút, counter reset

---

## 2. Test Methods

### Method 1: Dùng Script Node.js (Recommended)

#### Test 1: Basic Rate Limit Test
```bash
node test-rate-limit.js
```

**Kết quả mong đợi:**
```
[Request 1] ✅ ALLOWED (401)
[Request 2] ✅ ALLOWED (401)
[Request 3] ✅ ALLOWED (401)
[Request 4] ✅ ALLOWED (401)
[Request 5] ✅ ALLOWED (401)
[Request 6] ✋ BLOCKED (429 Too Many Requests)
[Request 7] ✋ BLOCKED (429 Too Many Requests)
...

✅ RATE LIMITING WORKS!
After 5 allowed requests, 5 requests were blocked with HTTP 429
```

#### Test 2: Advanced Scenarios
```bash
node test-rate-limit-advanced.js
```

**Test scenarios:**
1. **Rapid Fire** - 10 requests immediately
2. **Throttled** - 10 requests với 100ms delay
3. **Slow** - 5 requests với 500ms delay

---

### Method 2: Dùng cURL

#### Test single request
```bash
curl -X POST http://tmd1907.id.vn/login \
  -d "username=testuser&password=wrong" \
  -i
```

**Response 1-5:**
```
HTTP/1.1 401 Unauthorized
...
```

**Response 6:**
```
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{"message":"Quá nhiều request, vui lòng thử lại sau"}
```

#### Test rapid requests
```bash
for i in {1..10}; do
  echo "Request $i:"
  curl -s -X POST http://tmd1907.id.vn/login \
    -d "username=testuser&password=wrong" \
    -w "Status: %{http_code}\n\n"
  sleep 0.1
done
```

---

### Method 3: Dùng Postman

1. **Create new request**
   - Method: POST
   - URL: `http://tmd1907.id.vn/login`
   - Body (form-data):
     ```
     username: testuser
     password: wrongpassword
     ```

2. **Send 10 times quickly**
   - Click "Send" button 10 lần
   - Observe status codes:
     - Requests 1-5: **401** (Invalid credentials)
     - Requests 6+: **429** (Rate limited)

3. **Check Response Headers**
   - `RateLimit-Limit: 5`
   - `RateLimit-Remaining: 0` (after request 5)
   - `RateLimit-Reset: 1234567890` (Unix timestamp)

---

### Method 4: Dùng Browser Developer Tools

#### Test with JavaScript
```javascript
// Open browser console (F12) → Console tab
// Paste this code:

async function testRateLimit() {
  for (let i = 1; i <= 10; i++) {
    const response = await fetch('http://tmd1907.id.vn/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'username=testuser&password=wrong'
    });
    console.log(`Request ${i}: ${response.status}`);
    await new Promise(r => setTimeout(r, 200));
  }
}

testRateLimit();
```

**Console output:**
```
Request 1: 401
Request 2: 401
Request 3: 401
Request 4: 401
Request 5: 401
Request 6: 429
Request 7: 429
Request 8: 429
Request 9: 429
Request 10: 429
```

---

## 3. Understanding Response Codes

### 401 - Invalid Credentials (ALLOWED)
```json
{
  "error": "Tên đăng nhập hoặc mật khẩu không đúng"
}
```
✅ Request được chấp nhận, nhưng credentials sai

### 429 - Too Many Requests (BLOCKED)
```json
{
  "message": "Quá nhiều request, vui lòng thử lại sau"
}
```
✋ Request bị chặn bởi rate limit

### 403 - Forbidden (CSRF Error)
```json
{
  "error": "CSRF token không hợp lệ"
}
```
❌ CSRF token missing/invalid (test script không gửi CSRF token)

---

## 4. Testing with CSRF Token

### Get CSRF Token First
```javascript
// 1. GET /login để lấy form + CSRF token
const loginPage = await fetch('http://tmd1907.id.vn/login');
const html = await loginPage.text();
const csrfMatch = html.match(/name="_csrf"\s*value="([^"]+)"/);
const csrfToken = csrfMatch ? csrfMatch[1] : '';

// 2. POST /login với CSRF token
const response = await fetch('http://tmd1907.id.vn/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: `username=testuser&password=wrong&_csrf=${csrfToken}`
});
```

---

## 5. Rate Limit Reset

### Scenario 1: Wait 15 Minutes
```
Time 0:00   → Request 1-5: ✅ Allowed
Time 0:00   → Request 6-10: ✋ Blocked (429)
Time 15:00  → Request 11: ✅ Allowed (counter reset)
```

### Scenario 2: Clear Rate Limit Locally
```bash
# Restart server (resets in-memory rate limit store)
npm start
```

**Note:** express-rate-limit stores data in memory by default
- Server restart = rate limit reset
- Production should use Redis/store for persistence

---

## 6. Rate Limit Headers

Each response includes:
```
RateLimit-Limit: 5
RateLimit-Remaining: 4
RateLimit-Reset: 1639921200
```

**Meaning:**
- `RateLimit-Limit`: Maximum requests allowed (5)
- `RateLimit-Remaining`: Requests left in window (4 after first request)
- `RateLimit-Reset`: Unix timestamp when counter resets

---

## 7. Troubleshooting

### Problem: All requests return 401, never 429
**Solution:**
```
1. Check window timing - maybe 15 min already passed
2. Make sure using same endpoint (/login)
3. Check IP address - rate limit keyed by IP
```

### Problem: Getting 403 instead of 401/429
**Solution:**
```
1. CSRF token is missing or invalid
2. For testing, send CSRF token from form
3. Or disable CSRF temporarily (not recommended)
```

### Problem: Server not running
**Solution:**
```bash
# Make sure server is running
npm start
# Or for local:
node app.js
```

---

## 8. Sample Test Results

### Test 1: Basic Script (node test-rate-limit.js)
```
🔍 RATE LIMIT TEST
Target: http://localhost:3000/login
Config: Max 5 requests / 15 minutes
Test: Gửi 10 requests liên tiếp

[10:30:45] Request 1: ✅ ALLOWED (401)
[10:30:45] Request 2: ✅ ALLOWED (401)
[10:30:45] Request 3: ✅ ALLOWED (401)
[10:30:46] Request 4: ✅ ALLOWED (401)
[10:30:46] Request 5: ✅ ALLOWED (401)
[10:30:46] Request 6: ✋ BLOCKED (429)
[10:30:46] Request 7: ✋ BLOCKED (429)
[10:30:47] Request 8: ✋ BLOCKED (429)
[10:30:47] Request 9: ✋ BLOCKED (429)
[10:30:47] Request 10: ✋ BLOCKED (429)

📊 RATE LIMIT TEST SUMMARY
✅ Allowed Requests: 5
✋ Blocked Requests: 5
❌ Errors: 0

✅ RATE LIMITING WORKS!
After 5 allowed requests, 5 requests were blocked with HTTP 429
```

---

## 9. Production Testing

### Test on Live Server
```bash
# Using node script
node test-rate-limit-advanced.js

# Server should be: https://tmd1907.id.vn
# Output:
🎯 Target: Production (https://tmd1907.id.vn)
📊 Rate Limit: 5 requests / 15 minutes on /login
⏱️ Each test has ~200ms delay between requests

Scenario 1: Rapid Fire (10 requests immediately)
...
✅ ALLOWED (401)
✅ ALLOWED (401)
✅ ALLOWED (401)
✅ ALLOWED (401)
✅ ALLOWED (401)
✋ BLOCKED (429)
```

---

## 10. Summary

| Method | Ease | Accuracy | Time |
|--------|------|----------|------|
| Node Script | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Fast |
| cURL | ⭐⭐⭐ | ⭐⭐⭐⭐ | Medium |
| Postman | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Medium |
| Browser Console | ⭐⭐⭐⭐ | ⭐⭐⭐ | Medium |

**Recommended:** Use `node test-rate-limit.js` for quickest verification
