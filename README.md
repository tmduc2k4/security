# LaptopStore - Website Bán Laptop Với Hệ Thống Xác Thực Bảo Mật

## 📋 Tổng Quan Đề Tài

**LaptopStore** là một ứng dụng web bán laptop được xây dựng với **Node.js**, **Express.js** và **MongoDB**, tập trung vào việc cung cấp hệ thống xác thực và bảo mật hiện đại.

### Mục Tiêu Dự Án
- ✅ Cung cấp nền tảng e-commerce bán laptop an toàn
- ✅ Triển khai hệ thống xác thực (Authentication) & Ủy quyền (Authorization) toàn diện
- ✅ Áp dụng các best practices về bảo mật web
- ✅ Bảo vệ chống lại các cuộc tấn công OWASP Top 10
- ✅ Cung cấp giao diện người dùng thân thiện

### Tính Năng Chính
- **E-Commerce:** Danh sách sản phẩm, chi tiết sản phẩm, giỏ hàng, thanh toán
- **Xác Thực:** Đăng ký, đăng nhập, đăng xuất, JWT tokens
- **Bảo Mật:** Password hashing, CSRF protection, account lockout, rate limiting, CAPTCHA
- **Quản Lý Tài Khoản:** Profile cá nhân, đổi mật khẩu, quên mật khẩu, 2FA
- **Audit & Logging:** Ghi lại tất cả các hoạt động đăng nhập
- **Thiết Kế Responsive:** Hỗ trợ tất cả các thiết bị


---

## 👥 Danh Sách Thành Viên & Phân Chia Công Việc

| STT | Tên Thành Viên | Vai Trò | Công Việc |
|-----|---|---|---|
| 1 | Trương Minh Đức | **Trưởng Nhóm** | • Thiết kế kiến trúc ứng dụng<br>• Cài đặt hệ thống xác thực (JWT, bcrypt)<br>• Triển khai bảo mật (Helmet, Rate Limit, Input Validation)<br>• Tích hợp MongoDB<br>• Code review & testing |
| 2 | Thành Viên 2 | Lập Trình Viên | • Phát triển giao diện (EJS templates)<br>• Xây dựng các trang sản phẩm<br>• Thiết kế CSS responsive<br>• Tích hợp CAPTCHA & 2FA |
| 3 | Thành Viên 3 | Lập Trình Viên | • Phát triển các API endpoints<br>• Xây dựng chức năng quên mật khẩu<br>• Tích hợp email verification<br>• Testing & bug fixing |
| 4 | Thành Viên 4 | Tester / Ops | • Kiểm thử bảo mật<br>• Đánh giá vulnerabilities<br>• Cấu hình môi trường & deployment<br>• Viết tài liệu |

---

## 🚀 Hướng Dẫn Sử Dụng

### 🌐 Truy Cập Web Đã Deploy
```
URL: https://tmd1907.id.vn
```

**Các chức năng chính:**
1. **Xem sản phẩm:** Trang chủ & danh sách laptop
2. **Đăng ký / Đăng nhập:** Tạo tài khoản hoặc đăng nhập
3. **Quên mật khẩu:** Nhập email để reset
4. **Bảo mật tài khoản:** 2FA, account lockout, CAPTCHA
5. **Dashboard bảo mật:** Xem các feature bảo mật

---

### 1️⃣ Đăng Ký Tài Khoản Mới

1. Truy cập: https://tmd1907.id.vn/register
2. Nhập thông tin:
   - **Tên đăng nhập:** demo_user (3-30 ký tự, [a-zA-Z0-9_])
   - **Email:** your-email@example.com
   - **Mật khẩu:** Demo123 (phải có chữ hoa, chữ thường, số)
   - **Họ tên:** Tên của bạn
3. Click "Đăng ký"
4. Email xác thực sẽ được gửi
5. Click link trong email để xác minh
6. Đăng nhập và dùng bình thường

---

### 2️⃣ Đăng Nhập

1. Truy cập: https://tmd1907.id.vn/login
2. Nhập username/email và mật khẩu
3. Nếu bật 2FA → nhập mã 6 số từ authenticator app
4. Chuyển tới trang dashboard

**⚠️ Account Lockout:**
- Sai mật khẩu 5 lần → yêu cầu CAPTCHA
- Sai mật khẩu 10 lần → tài khoản khóa 10 phút

---

### 3️⃣ Quên Mật Khẩu

1. Truy cập: https://tmd1907.id.vn/forgot-password
2. Nhập email tài khoản
3. Nhận email reset password
4. Click link, đặt mật khẩu mới
5. Đăng nhập lại

---

### 4️⃣ Bảo Mật Tài Khoản (2FA)

1. Truy cập: https://tmd1907.id.vn/profile
2. Click "Thiết lập 2FA"
3. Scan QR code bằng Google Authenticator / Authy
4. Nhập mã 6 số để xác thực
5. Lần sau đăng nhập sẽ yêu cầu mã 2FA

---

### 5️⃣ Xem Dashboard Bảo Mật

Truy cập: https://tmd1907.id.vn/security-dashboard

Xem các feature được triển khai:
- ✅ Rate Limiting (DDoS & Brute Force)
- ✅ Password Hashing (bcrypt)
- ✅ CSRF Protection
- ✅ Account Lockout
- ✅ CAPTCHA
- ✅ 2FA (2-Factor Authentication)
- ✅ Email Verification
- ✅ Audit Logging
- ✅ Input Validation
- ✅ SQL/NoSQL Injection Prevention
```
┌─────────────────────────────────────┐
│     🔐 Đăng Ký Tài Khoản            │
├─────────────────────────────────────┤
│                                     │
│  👤 Tên đăng nhập: [______________] │
│  📧 Email:         [______________] │
│  🔑 Mật khẩu:      [______________] │
│  📋 Họ tên:        [______________] │
│                                     │
│             [    Đăng Ký    ]       │
│                                     │
│  Đã có tài khoản? Đăng nhập →      │
│                                     │
└─────────────────────────────────────┘
```

#### 🔑 Trang Đăng Nhập (Thành Công)
```
┌─────────────────────────────────────┐
│       🔐 Đăng Nhập                  │
├─────────────────────────────────────┤
│                                     │
│  📧 Email:    [______________]      │
│  🔑 Mật khẩu: [______________]      │
│                                     │
│             [    Đăng Nhập    ]     │
│                                     │
│  Quên mật khẩu?                     │
│  Chưa có tài khoản? Đăng ký →      │
│                                     │
└─────────────────────────────────────┘

Kết quả: ✅ Đăng nhập thành công
         Chuyển đến trang /profile
         Cookie lưu JWT token 7 ngày
```

#### 🔒 Account Lockout (10 lần sai)
```
┌─────────────────────────────────────┐
│        🔐 Đăng Nhập                 │
├─────────────────────────────────────┤
│                                     │
│           🔒 Tài khoản bị khóa     │
│                                     │
│  Bạn đã nhập sai mật khẩu 10 lần   │
│                                     │
│  Tài khoản sẽ mở khóa sau:          │
│  ┌─────────────────────────────┐   │
│  │      10:00 (phút : giây)    │   │
│  └─────────────────────────────┘   │
│                                     │
│  ℹ️ Thông tin:                       │
│  • Bảo vệ khỏi truy cập trái phép   │
│  • 10 phút kể từ lần sai thứ 10     │
│  • Hãy nhớ mật khẩu chính xác       │
│                                     │
│  [❓ Quên mật khẩu?]                │
│                                     │
│  📝 Đầu vào bị vô hiệu hóa         │
│                                     │
└─────────────────────────────────────┘
```

#### 🤖 CAPTCHA (Sau 5 lần sai)
```
┌─────────────────────────────────────┐
│       🔐 Đăng Nhập                  │
├─────────────────────────────────────┤
│                                     │
│  ⚠️ Cảnh báo - CAPTCHA yêu cầu!     │
│  Bạn đã nhập sai 5 lần              │
│  Còn 5 lần để thử                   │
│                                     │
│  📧 Email:    [______________]      │
│  🔑 Mật khẩu: [______________]      │
│                                     │
│  🤖 Xác thực:                        │
│  ┌─────────────────────────────┐   │
│  │   [Tích vào reCAPTCHA ☐]   │   │
│  │   "I'm not a robot"         │   │
│  └─────────────────────────────┘   │
│                                     │
│             [    Đăng Nhập    ]     │
│                                     │
└─────────────────────────────────────┘
```

#### 👤 Trang Profile (Đã Đăng Nhập)
```
┌──────────────────────────────────────┐
│ 🏪 LaptopStore      👤 demo_user [🚪]│
├──────────────────────────────────────┤
│                                      │
│        📋 Thông Tin Tài Khoản        │
│                                      │
│  👤 Username:  demo_user             │
│  📧 Email:     demo@example.com      │
│  📝 Họ tên:    Demo User             │
│  📅 Tham gia:  20/12/2025            │
│  ✅ Trạng thái: Hoạt động            │
│                                      │
│  [✏️ Cập Nhật Thông Tin]             │
│  [🔐 Đổi Mật Khẩu]                  │
│  [🔑 Bật 2FA]                        │
│  [📜 Lịch Sử Đăng Nhập]              │
│                                      │
└──────────────────────────────────────┘
```

#### 🔐 Đổi Mật Khẩu
```
┌─────────────────────────────────────┐
│      🔑 Đổi Mật Khẩu                │
├─────────────────────────────────────┤
│                                     │
│  🔑 Mật khẩu hiện tại:              │
│     [__________________________]    │
│                                     │
│  🔑 Mật khẩu mới:                   │
│     [__________________________]    │
│                                     │
│  🔑 Xác nhận mật khẩu:              │
│     [__________________________]    │
│                                     │
│  ✅ Yêu cầu:                         │
│  ☑ Tối thiểu 6 ký tự                │
│  ☑ Có chữ hoa (A-Z)                 │
│  ☑ Có chữ thường (a-z)              │
│  ☑ Có số (0-9)                      │
│                                     │
│      [    Cập Nhật Mật Khẩu    ]    │
│                                     │
└─────────────────────────────────────┘
```

#### 📊 Lịch Sử Đăng Nhập
```
┌──────────────────────────────────────────┐
│      📜 Lịch Sử Đăng Nhập               │
├──────────────────────────────────────────┤
│                                          │
│  Thời gian          │ Trạng thái │ IP   │
│  ─────────────────────────────────────── │
│  20/12/2025 10:30   │ ✅ Thành công│ ...│
│  20/12/2025 10:25   │ ❌ Sai mật khẩu  │
│  20/12/2025 10:20   │ ❌ Sai mật khẩu  │
│  19/12/2025 15:45   │ ✅ Thành công│ ...│
│  19/12/2025 14:20   │ ✅ Thành công│ ...│
│                                          │
│  [<  Trang trước ] [ Trang tiếp theo >] │
│                                          │
└──────────────────────────────────────────┘
```

---

## 🛠️ Scripts Hữu Ích

```bash
# Chạy ứng dụng
npm start                 # Production
npm run dev               # Development (auto-reload)

# Kiểm tra bảo mật
npm run security-check    # Quét vulnerabilities
npm run security-fix      # Tự động fix vulnerabilities

# Quản lý
npm run update-check      # Kiểm tra packages cũ
```

---

## 🔒 Các Tính Năng Bảo Mật Chính

| Tính Năng | Mô Tả | Status |
|-----------|-------|--------|
| **Password Hashing** | bcryptjs (10 rounds, ~150ms) | ✅ |
| **JWT Authentication** | Token 7 ngày, httpOnly cookies | ✅ |
| **Account Lockout** | 10 lần sai → khóa 10 phút | ✅ |
| **CAPTCHA** | Google reCAPTCHA v2 + Fallback | ✅ |
| **Rate Limiting** | 100/15min (general), 5/15min (login) | ✅ |
| **CSRF Protection** | Double-submit token | ✅ |
| **Input Validation** | express-validator + sanitization | ✅ |
| **XSS Protection** | helmet.js + xss-clean | ✅ |
| **NoSQL Injection** | express-mongo-sanitize | ✅ |
| **Secure Headers** | helmet.js (CSP, HSTS, etc.) | ✅ |
| **Audit Logging** | Ghi lại tất cả hoạt động | ✅ |

---

## 📚 Công Nghệ Stack

**Backend:** Node.js, Express.js, MongoDB, EJS  
**Bảo Mật:** bcryptjs, jsonwebtoken, helmet, express-rate-limit  
**Validation:** express-validator, hpp, xss-clean  
**Database:** MongoDB 7.0+  

---

## 📞 Liên Hệ & Support

**Repository:** [github.com/tmduc2k4/security](https://github.com/tmduc2k4/security)  
**Issues:** Báo cáo lỗi qua GitHub Issues  
**Author:** Trương Minh Đức

---

## 📄 License
ISC 
