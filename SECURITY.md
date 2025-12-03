# Tài liệu Bảo mật - LaptopStore

## Tổng quan về các biện pháp bảo mật đã triển khai

### 1. Web Application Firewall (WAF)

#### Helmet.js - HTTP Headers Security
- **Content Security Policy (CSP)**: Ngăn chặn XSS bằng cách kiểm soát nguồn tài nguyên
- **HTTP Strict Transport Security (HSTS)**: Bắt buộc sử dụng HTTPS
- **X-Frame-Options**: Ngăn chặn Clickjacking
- **X-Content-Type-Options**: Ngăn MIME type sniffing
- **Referrer-Policy**: Kiểm soát thông tin referrer

### 2. Rate Limiting - Chống tấn công DDoS & Brute Force

- **Rate Limit chung**: 100 requests/15 phút mỗi IP
- **Rate Limit nghiêm ngặt**: 5 requests/15 phút cho các endpoint nhạy cảm (contact form)
- Tự động block IP vi phạm tạm thời

### 3. Input Validation & Sanitization

#### Express Validator
- Validation email, số điện thoại, tên
- Giới hạn độ dài input
- Whitelist các ký tự được phép

#### XSS Protection
- `xss-clean`: Tự động làm sạch các ký tự nguy hiểm
- Custom sanitization cho HTML tags
- Escape output trong EJS templates

#### SQL Injection Protection
- Pattern matching cho SQL keywords
- Chặn các ký tự đặc biệt (`'`, `--`, `;`)
- Validation tất cả query parameters

#### NoSQL Injection Protection
- `express-mongo-sanitize`: Loại bỏ `$` và `.` trong input
- Validation object keys

#### Path Traversal Protection
- Phát hiện pattern `../` trong đường dẫn
- Chặn truy cập file system không hợp lệ

### 4. HTTP Parameter Pollution (HPP) Protection

- `hpp` middleware ngăn chặn duplicate parameters
- Tránh lỗi logic khi xử lý query parameters

### 5. CORS Configuration

- Whitelist domains được phép truy cập
- Cấu hình thông qua biến môi trường

### 6. Security Logging

- Log tất cả các request đáng ngờ
- Ghi lại IP, timestamp, payload
- Cảnh báo real-time cho các mẫu tấn công

### 7. Error Handling

- Không expose stack trace trong production
- Generic error messages cho người dùng
- Detailed logging cho developers

### 8. Environment Variables

- Sensitive data được lưu trong `.env`
- `.env` không được commit vào Git
- Template `.env.example` cho setup

## Checklist Bảo mật

### Đã triển khai ✓
- [x] Helmet.js cho HTTP headers security
- [x] Rate limiting cho tất cả endpoints
- [x] Input validation và sanitization
- [x] XSS protection
- [x] SQL Injection protection
- [x] NoSQL Injection protection
- [x] Path Traversal protection
- [x] HPP protection
- [x] CORS configuration
- [x] Security logging
- [x] Error handling
- [x] Environment variables
- [x] Payload size limiting (10kb)

### Nên triển khai thêm (Tương lai)
- [ ] HTTPS/SSL certificates
- [ ] Authentication & Authorization (JWT)
- [ ] CSRF protection
- [ ] Session management
- [ ] Database encryption
- [ ] File upload validation
- [ ] API rate limiting per user
- [ ] Security headers monitoring
- [ ] Automated security testing
- [ ] Dependency vulnerability scanning (npm audit)
- [ ] Web Application Firewall (WAF) nâng cao (CloudFlare, AWS WAF)

## Cập nhật Phần mềm

### Kiểm tra bảo mật định kỳ

```bash
# Kiểm tra các lỗ hổng bảo mật trong dependencies
npm run security-check

# Tự động fix các lỗ hổng (nếu có patch)
npm run security-fix

# Kiểm tra các package đã lỗi thời
npm run update-check
```

### Lịch trình cập nhật

1. **Hàng tuần**: Chạy `npm audit` để kiểm tra vulnerabilities
2. **Hàng tháng**: Cập nhật minor versions của dependencies
3. **Hàng quý**: Review và cập nhật major versions
4. **Khi có CVE nghiêm trọng**: Cập nhật ngay lập tức

### Quy trình cập nhật

```bash
# 1. Backup code hiện tại
git commit -am "Backup before update"

# 2. Kiểm tra outdated packages
npm outdated

# 3. Cập nhật tất cả packages
npm update

# 4. Kiểm tra lại bảo mật
npm audit

# 5. Test ứng dụng
npm test  # (nếu có tests)
npm start

# 6. Commit nếu mọi thứ OK
git commit -am "Update dependencies"
```

## Giám sát & Phản ứng

### Các dấu hiệu cần chú ý

1. **Rate limit triggers**: Nhiều IP bị block
2. **Security warnings**: Log cảnh báo tăng đột biến
3. **Error rates**: Tỷ lệ lỗi 400/403/500 tăng cao
4. **Performance degradation**: Server chậm bất thường

### Khi phát hiện tấn công

1. Kiểm tra security logs
2. Block IP nguy hiểm ở firewall level
3. Tăng rate limiting tạm thời
4. Review và patch lỗ hổng
5. Notify admin/team

## Liên hệ Bảo mật

Nếu phát hiện lỗ hổng bảo mật, vui lòng liên hệ:
- Email: security@laptopstore.com
- Report tại: [GitHub Security](https://github.com/tmduc2k4/security/security)

## Tham khảo

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
