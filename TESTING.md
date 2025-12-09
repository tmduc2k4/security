# Security Testing Guide - LaptopShop

## Giới thiệu

File `test-security-advanced.js` cung cấp test suite toàn diện để kiểm tra các lỏ hổng bảo mật phổ biến:

- **SQL Injection** - Kiểm tra khả năng chặn SQL injection attacks
- **XSS** - Kiểm tra chống Cross-Site Scripting
- **DDoS/Rate Limiting** - Kiểm tra rate limiting chống DDoS
- **NoSQL Injection** - Kiểm tra MongoDB injection attacks
- **Path Traversal** - Kiểm tra chống truy cập file bất hợp pháp
- **CSRF** - Kiểm tra Cross-Site Request Forgery protection

## Cách chạy

### 1. Khởi động server

```bash
npm start
```

Server sẽ chạy tại `http://localhost:3000`

### 2. Chạy test security

Mở terminal khác và chạy:

```bash
node test-security-advanced.js
```

### 3. Xem kết quả

Test sẽ gửi các payload nguy hiểm và kiểm tra:
- Nếu server chặn (status 403, 429) → ✓ Bảo mật hoạt động
- Nếu server cho qua (status 200) → ⚠ Cảnh báo, cần xem xét

## Chi tiết các test

### 1. SQL Injection Tests

Kiểm tra 5 loại SQL injection phổ biến:

```javascript
// Test 1: OR 1=1
' OR '1'='1

// Test 2: UNION SELECT
' UNION SELECT * FROM users --

// Test 3: DROP TABLE
'; DROP TABLE users; --

// Test 4: INSERT
'; INSERT INTO users VALUES ('hacker', 'pass'); --

// Test 5: EXEC Command
'; EXEC xp_cmdshell 'dir'; --
```

**Kỳ vọng:** Tất cả phải trả về status 403 (Forbidden)

### 2. XSS Tests

Kiểm tra 5 loại XSS phổ biến:

```javascript
// Test 1: Script Tag
<script>alert("XSS")</script>

// Test 2: Event Handler
<img src=x onerror="alert('XSS')">

// Test 3: SVG
<svg onload="alert('XSS')">

// Test 4: iFrame
<iframe src="javascript:alert('XSS')"></iframe>

// Test 5: JavaScript Protocol
<a href="javascript:alert('XSS')">Click</a>
```

**Kỳ vọng:** Dangerous content bị remove hoặc request bị block

### 3. DDoS/Rate Limiting Test

Gửi 120 requests nhanh liên tiếp để kiểm tra rate limiting:

```
Limit chung: 100 requests/15 phút
Limit nghiêm ngặt: 5 requests/15 phút (cho sensitive endpoints)
```

**Kỳ vọng:** Một số requests trả về status 429 (Too Many Requests)

### 4. NoSQL Injection Tests

Kiểm tra MongoDB operator injection:

```javascript
// Test 1: $ne operator
{ $ne: null }

// Test 2: $gt operator
{ $gt: '' }

// Test 3: $where operator
{ $where: '1==1' }
```

**Kỳ vọng:** Tất cả phải bị block hoặc sanitize

### 5. Path Traversal Tests

Kiểm tra truy cập file bất hợp pháp:

```javascript
// Test 1: Unix path
../../etc/passwd

// Test 2: Windows path
..\\..\\windows\\system32

// Test 3: Encoded path
%2e%2e%2f%2e%2e%2fetc%2fpasswd
```

**Kỳ vọng:** Tất cả phải trả về status 403

### 6. CSRF Test

Gửi POST request mà không có CSRF token:

```
POST /register
{
  "username": "testuser",
  "email": "test@test.com",
  "password": "Test123!@#"
}
```

**Kỳ vọng:** Có thể bị block hoặc require CSRF token

## Diễn giải kết quả

### Ký hiệu

- `✓` **Green** - Bảo mật hoạt động (tấn công bị chặn)
- `⚠` **Yellow** - Cảnh báo (cần xem xét)
- `✗` **Red** - Lỗi/không hoạt động

### Status Codes

| Code | Ý nghĩa |
|------|---------|
| 200 | OK - Request thành công |
| 400 | Bad Request - Input không hợp lệ |
| 403 | Forbidden - Attack bị chặn |
| 429 | Too Many Requests - Rate limit |

## Ví dụ output

```
========== SQL INJECTION TESTS ==========

Test: Classic SQL Injection - OR 1=1
Payload: ' OR '1'='1
✓ BLOCKED - Status: 403
✓ SQL Injection protection ACTIVE

========== XSS Tests ==========

Test: Basic Script Injection
Payload: <script>alert("XSS")</script>
✓ SANITIZED - Dangerous content removed
✓ XSS protection ACTIVE

========== DDoS & RATE LIMITING TESTS ==========

Results:
  Total requests sent: 120
  Successful (200): 100
  Rate limited (429): 20
  Other status codes: 0

✓ RATE LIMITING ACTIVE - 16.67% of requests were blocked
✓ DDoS protection is working
```

## Sửa lỗi bảo mật

Nếu test phát hiện lỗi:

### SQL Injection không bị block

**Vấn đề:** Middleware `sqlInjectionProtection` chưa hoạt động

**Giải pháp:**
```javascript
// Kiểm tra app.js có áp dụng middleware không
app.use(sqlInjectionProtection);
```

### XSS không bị sanitize

**Vấn đề:** `xss-clean` middleware chưa được cài

**Giải pháp:**
```bash
npm install xss-clean
```

### Rate Limiting không hoạt động

**Vấn đề:** Rate limiter chưa áp dụng cho routes

**Giải pháp:**
```javascript
app.use(limiter); // Apply globally
app.post('/login', strictLimiter, authController.login);
```

### DDoS vẫn thành công

**Vấn đề:** Cần tăng rate limit strength

**Giải pháp:** Điều chỉnh `.env`
```
RATE_LIMIT_MAX=50
STRICT_RATE_LIMIT_MAX=5
```

## Best Practices

1. **Chạy test định kỳ** - Kiểm tra sau mỗi update
2. **Không test trên production** - Chỉ test trên local/staging
3. **Giữ dependencies cập nhật** - npm update thường xuyên
4. **Xem logs** - Kiểm tra application logs khi có cảnh báo

## Tài liệu thêm

- [SECURITY.md](./SECURITY.md) - Chi tiết các biện pháp bảo mật
- [http://localhost:3000/security](http://localhost:3000/security) - Security Dashboard
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) - Top 10 Web Vulnerabilities

## Liên hệ

Nếu phát hiện lỗ hổng bảo mật, vui lòng báo cáo ngay.

---

**Lần cập nhật cuối:** December 2025
