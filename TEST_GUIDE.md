# Hướng dẫn kiểm tra bảo mật - LaptopStore

## 📋 Mục lục
1. [Chuẩn bị](#chuẩn-bị)
2. [Test SQL Injection](#test-sql-injection)
3. [Test DDoS Protection](#test-ddos-protection)
4. [Test XSS Protection](#test-xss-protection)
5. [Test Path Traversal](#test-path-traversal)
6. [Test Security Headers](#test-security-headers)
7. [Test bằng công cụ chuyên nghiệp](#test-bằng-công-cụ-chuyên-nghiệp)

---

## Chuẩn bị

### 1. Khởi động server
```bash
npm start
```
Server sẽ chạy tại: http://localhost:3000

### 2. Chạy automated test suite
```bash
node test-security.js
```

---

## Test SQL Injection

### ✅ Phương pháp 1: Test thủ công qua Browser

#### Test 1: SQL Injection trong URL parameter
```
http://localhost:3000/laptop/1' OR '1'='1
http://localhost:3000/laptop/1; DROP TABLE users--
http://localhost:3000/laptop/1 UNION SELECT * FROM users--
http://localhost:3000/laptop/1' AND '1'='1'--
```

**Kết quả mong đợi:**
- ✅ Status Code: **403 Forbidden**
- ✅ Message: "Yêu cầu không hợp lệ - Phát hiện nội dung nguy hiểm"

#### Test 2: SQL Injection trong Query String
```
http://localhost:3000/laptops?sort=price'; DROP TABLE products--
http://localhost:3000/laptops?search=laptop' OR '1'='1
```

**Kết quả mong đợi:**
- ✅ Status Code: **403 Forbidden**
- ✅ SQL keywords được phát hiện và chặn

#### Test 3: SQL Injection trong Form (Login)

Mở Console trong browser và chạy:
```javascript
fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: "admin' OR '1'='1'--",
    password: "anything"
  })
})
.then(r => r.json())
.then(console.log);
```

**Kết quả mong đợi:**
- ✅ Error: "Username không được để trống" hoặc validation error
- ✅ Payload bị sanitize

### ✅ Phương pháp 2: Test bằng cURL

```bash
# Test 1: URL parameter
curl "http://localhost:3000/laptop/1' OR '1'='1"

# Test 2: Login form
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin' OR '1'='1'--\",\"password\":\"test\"}"

# Test 3: Query parameter
curl "http://localhost:3000/laptops?sort=price'; DROP TABLE users--"
```

### ✅ Phương pháp 3: Test bằng Postman

1. **Import Collection:**
   - Method: POST
   - URL: `http://localhost:3000/api/auth/login`
   - Body (JSON):
   ```json
   {
     "username": "admin' OR '1'='1'--",
     "password": "anything"
   }
   ```

2. **Các payload khác cần test:**
   ```json
   {
     "username": "admin'; DROP TABLE users--",
     "password": "test"
   }
   ```
   ```json
   {
     "username": "1' UNION SELECT * FROM users--",
     "password": "test"
   }
   ```

**Kết quả mong đợi:**
- ✅ Status: 403 hoặc 400
- ✅ Không có SQL được execute
- ✅ Error message an toàn

---

## Test DDoS Protection (Rate Limiting)

### ✅ Test 1: Normal Rate Limit (100 requests/15 min)

#### Sử dụng JavaScript Console
```javascript
// Gửi 110 requests nhanh liên tục
async function testRateLimit() {
  const results = { success: 0, blocked: 0, error: 0 };
  
  for (let i = 0; i < 110; i++) {
    try {
      const response = await fetch('http://localhost:3000/');
      if (response.status === 200) results.success++;
      else if (response.status === 429) results.blocked++;
    } catch (e) {
      results.error++;
    }
  }
  
  console.log('Rate Limit Test Results:', results);
  return results;
}

testRateLimit();
```

**Kết quả mong đợi:**
- ✅ Sau ~100 requests: Status 429 (Too Many Requests)
- ✅ Header `X-RateLimit-Limit: 100`
- ✅ Header `X-RateLimit-Remaining: 0`
- ✅ Header `Retry-After: <seconds>`
- ✅ Message: "Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 15 phút"

#### Sử dụng Bash Script
```bash
# test-rate-limit.sh
#!/bin/bash
for i in {1..110}; do
  echo "Request $i:"
  curl -s -w "\nStatus: %{http_code}\n" http://localhost:3000/ | head -n 1
  sleep 0.1
done
```

```bash
chmod +x test-rate-limit.sh
./test-rate-limit.sh
```

#### Sử dụng PowerShell
```powershell
# Test rate limiting với PowerShell
for ($i=1; $i -le 110; $i++) {
    Write-Host "Request $i" -ForegroundColor Yellow
    $response = Invoke-WebRequest -Uri "http://localhost:3000/" -ErrorAction SilentlyContinue
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor $(if($response.StatusCode -eq 200){"Green"}else{"Red"})
    Start-Sleep -Milliseconds 100
}
```

### ✅ Test 2: Strict Rate Limit (5 requests/15 min)

Test với endpoint có strict limit (contact form, nếu có):

```javascript
async function testStrictRateLimit() {
  for (let i = 0; i < 10; i++) {
    const response = await fetch('http://localhost:3000/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test',
        email: 'test@test.com',
        phone: '0123456789',
        message: 'Test message'
      })
    });
    console.log(`Request ${i+1}: ${response.status}`);
  }
}

testStrictRateLimit();
```

**Kết quả mong đợi:**
- ✅ Request 1-5: Success (200 hoặc 404)
- ✅ Request 6+: Blocked (429)

### ✅ Test 3: Xem Security Logs

Check console của server để xem logs:
```
[SECURITY WARNING] Suspicious request detected:
IP: ::1
Method: GET
Path: /laptop/1' OR '1'='1
Time: 2025-12-03T...
```

---

## Test XSS Protection

### ✅ Test XSS trong Registration Form

```javascript
fetch('http://localhost:3000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: "<script>alert('XSS')</script>",
    email: "test@test.com",
    password: "Test123",
    fullName: "<img src=x onerror=alert('XSS')>"
  })
})
.then(r => r.json())
.then(console.log);
```

**Kết quả mong đợi:**
- ✅ Validation error hoặc XSS tags bị escape
- ✅ Không có script nào được execute

### ✅ Test các XSS payloads khác

```javascript
const xssPayloads = [
  "<script>alert('XSS')</script>",
  "<img src=x onerror=alert('XSS')>",
  "<svg onload=alert('XSS')>",
  "javascript:alert('XSS')",
  "<iframe src=javascript:alert('XSS')>",
  "<<SCRIPT>alert('XSS');//<</SCRIPT>"
];

// Test mỗi payload
xssPayloads.forEach(async (payload) => {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: payload,
      password: "test"
    })
  });
  console.log(`Payload: ${payload}, Status: ${response.status}`);
});
```

---

## Test Path Traversal

### ✅ Test Path Traversal Attacks

```bash
# Linux path traversal
curl "http://localhost:3000/laptop/../../etc/passwd"
curl "http://localhost:3000/laptop/../../../etc/hosts"

# Windows path traversal
curl "http://localhost:3000/laptop/..\\..\\windows\\system32\\config\\sam"

# Query parameter
curl "http://localhost:3000/laptops?file=../../../etc/passwd"
```

**Kết quả mong đợi:**
- ✅ Status: **403 Forbidden**
- ✅ Message: "Yêu cầu không hợp lệ - Đường dẫn không được phép"
- ✅ Không có file system access

---

## Test Security Headers

### ✅ Kiểm tra HTTP Security Headers

```bash
curl -I http://localhost:3000/
```

**Headers mong đợi:**
```
HTTP/1.1 200 OK
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; ...
```

### ✅ Test từng header cụ thể

```javascript
fetch('http://localhost:3000/')
  .then(response => {
    console.log('Security Headers:');
    console.log('X-Content-Type-Options:', response.headers.get('X-Content-Type-Options'));
    console.log('X-Frame-Options:', response.headers.get('X-Frame-Options'));
    console.log('Strict-Transport-Security:', response.headers.get('Strict-Transport-Security'));
    console.log('Content-Security-Policy:', response.headers.get('Content-Security-Policy'));
  });
```

---

## Test bằng công cụ chuyên nghiệp

### 1. OWASP ZAP (Zed Attack Proxy)

```bash
# Download: https://www.zaproxy.org/download/
# Automated Scan:
zap-cli quick-scan http://localhost:3000

# Spider và Active Scan:
1. Mở ZAP GUI
2. Enter URL: http://localhost:3000
3. Click "Automated Scan"
4. Review results
```

### 2. Burp Suite Community Edition

```bash
# Download: https://portswigger.net/burp/communitydownload
1. Configure browser proxy to 127.0.0.1:8080
2. Browse http://localhost:3000
3. Use Scanner to check vulnerabilities
4. Use Intruder for rate limit testing
```

### 3. SQLMap (SQL Injection Scanner)

```bash
# Install
pip install sqlmap

# Test SQL injection
sqlmap -u "http://localhost:3000/laptop/1" --batch --risk=3 --level=5

# Test POST form
sqlmap -u "http://localhost:3000/api/auth/login" \
  --data="username=test&password=test" \
  --method=POST \
  --batch
```

### 4. OWASP Dependency-Check

```bash
# Check for vulnerable dependencies
npm install -g dependency-check

dependency-check --project "LaptopStore" \
  --scan . \
  --format HTML \
  --out ./dependency-check-report.html
```

### 5. npm audit

```bash
# Check vulnerabilities
npm audit

# Auto-fix if possible
npm audit fix

# Force fix (may break compatibility)
npm audit fix --force
```

---

## ✅ Checklist Bảo mật

### SQL Injection
- [ ] URL parameters được validate
- [ ] Query strings được sanitize
- [ ] Form inputs được escape
- [ ] Không có SQL keywords trong logs
- [ ] 403 response cho SQL payloads

### DDoS Protection
- [ ] Rate limit 100 req/15min hoạt động
- [ ] Strict limit 5 req/15min hoạt động
- [ ] Headers X-RateLimit-* hiển thị đúng
- [ ] 429 status khi vượt limit
- [ ] Retry-After header có giá trị

### XSS Protection
- [ ] Script tags bị escape
- [ ] HTML attributes bị sanitize
- [ ] JavaScript URLs bị chặn
- [ ] Không execute malicious code
- [ ] CSP headers đúng

### Path Traversal
- [ ] `../` patterns bị chặn
- [ ] `..\\` patterns bị chặn
- [ ] 403 response cho path traversal
- [ ] Không leak file paths

### Security Headers
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY
- [ ] Strict-Transport-Security có
- [ ] Content-Security-Policy có
- [ ] X-XSS-Protection: 0 (modern)

---

## 📊 Kết quả mong đợi

Sau khi chạy tất cả tests:

```
✓ SQL Injection: BLOCKED (8/8 tests)
✓ DDoS Protection: ACTIVE (Rate limited after 100 requests)
✓ XSS Protection: SANITIZED (All payloads escaped)
✓ Path Traversal: BLOCKED (3/3 tests)
✓ Security Headers: PRESENT (5/5 headers)

Overall Security Score: EXCELLENT ✅
```

---

## 🔧 Troubleshooting

### Server không chặn SQL Injection?
```bash
# Check middleware order trong app.js
# sqlInjectionProtection phải ở TRƯỚC routes
```

### Rate Limiting không hoạt động?
```bash
# Kiểm tra trust proxy setting
app.set('trust proxy', 1);

# Restart server
npm start
```

### Headers không hiển thị?
```bash
# Check helmetConfig được apply
app.use(helmetConfig);
```

---

## 📚 Tài liệu tham khảo

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
