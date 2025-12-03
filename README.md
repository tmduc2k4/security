# LaptopStore - Website bán laptop với hệ thống xác thực

Website bán laptop được xây dựng bằng Node.js, Express và EJS với tính năng đăng nhập/đăng ký đầy đủ.

## Tính năng

### Chức năng chính
- ✅ Trang chủ với sản phẩm nổi bật
- ✅ Danh sách tất cả sản phẩm laptop
- ✅ Trang chi tiết sản phẩm với thông số kỹ thuật
- ✅ Trang giới thiệu
- ✅ Trang liên hệ
- ✅ Thiết kế responsive

### Hệ thống xác thực (MỚI)
- ✅ **Đăng ký tài khoản** với validation mạnh
  - Username (3-30 ký tự, chỉ chữ, số, gạch dưới)
  - Email hợp lệ
  - Password mạnh (tối thiểu 6 ký tự, có chữ hoa, chữ thường, số)
- ✅ **Đăng nhập** với JWT token
- ✅ **Trang cá nhân** (Profile)
  - Xem thông tin tài khoản
  - Cập nhật thông tin cá nhân
  - Đổi mật khẩu
- ✅ **Bảo mật**
  - JWT authentication với cookie httpOnly
  - Password hashing với bcrypt
  - Protected routes
  - Token expires sau 7 ngày

### Bảo mật
- 🛡️ Web Application Firewall (Helmet.js)
- 🛡️ Rate Limiting (chống DDoS)
- 🛡️ Input validation & sanitization
- 🛡️ XSS protection
- 🛡️ SQL/NoSQL injection protection
- 🛡️ Path traversal protection
- 🛡️ HPP protection
- 🛡️ CORS configuration

## Cài đặt

1. Clone repository:
```bash
git clone https://github.com/tmduc2k4/security.git
cd security
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Tạo file `.env` (copy từ `.env.example`):
```bash
cp .env.example .env
```

4. Cập nhật file `.env`:
```env
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
```

5. Chạy server:
```bash
npm start
```

Hoặc chạy ở chế độ development với nodemon:
```bash
npm run dev
```

6. Mở trình duyệt và truy cập: http://localhost:3000

## Sử dụng

### Đăng ký tài khoản
1. Truy cập `/register`
2. Nhập thông tin (username, email, password)
3. Password phải có ít nhất:
   - 6 ký tự
   - 1 chữ thường (a-z)
   - 1 chữ hoa (A-Z)
   - 1 số (0-9)
4. Sau khi đăng ký thành công, bạn sẽ được tự động đăng nhập

### Đăng nhập
1. Truy cập `/login`
2. Nhập username và password
3. Token sẽ được lưu trong cookie (7 ngày)

### Quản lý Profile
1. Sau khi đăng nhập, click vào username trên navbar
2. Xem thông tin tài khoản
3. Cập nhật họ tên, email
4. Đổi mật khẩu (yêu cầu mật khẩu hiện tại)

## API Endpoints

### Public Routes
- `GET /` - Trang chủ
- `GET /laptops` - Danh sách sản phẩm
- `GET /laptop/:id` - Chi tiết sản phẩm
- `GET /about` - Giới thiệu
- `GET /contact` - Liên hệ

### Auth Routes (Web)
- `GET /register` - Trang đăng ký
- `POST /register` - Xử lý đăng ký
- `GET /login` - Trang đăng nhập
- `POST /login` - Xử lý đăng nhập
- `GET /logout` - Đăng xuất
- `GET /profile` - Trang cá nhân (yêu cầu đăng nhập)
- `POST /profile/update` - Cập nhật profile (yêu cầu đăng nhập)

### Auth API Routes (JSON)
- `POST /api/auth/register` - Đăng ký (JSON response)
- `POST /api/auth/login` - Đăng nhập (JSON response)

## Cấu trúc dự án

```
├── app.js                    # File server chính
├── package.json              # Dependencies
├── .env                      # Environment variables (không commit)
├── .env.example              # Template cho .env
├── models/
│   └── User.js              # User model với authentication
├── middleware/
│   ├── auth.js              # JWT authentication middleware
│   ├── authValidator.js     # Validation rules cho auth
│   ├── security.js          # WAF và security middleware
│   └── validator.js         # Input validation
├── controllers/
│   └── authController.js    # Auth logic (login, register, profile)
├── views/                   # EJS templates
│   ├── index.ejs           # Trang chủ
│   ├── laptops.ejs         # Danh sách sản phẩm
│   ├── laptop-detail.ejs   # Chi tiết sản phẩm
│   ├── about.ejs           # Giới thiệu
│   ├── contact.ejs         # Liên hệ
│   ├── login.ejs           # Đăng nhập
│   ├── register.ejs        # Đăng ký
│   ├── profile.ejs         # Trang cá nhân
│   └── 404.ejs             # Error page
└── public/                 # Static files
    └── css/
        └── style.css       # CSS styling
```

## Công nghệ sử dụng

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **EJS** - Template engine

### Authentication
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT tokens
- **cookie-parser** - Cookie management

### Security
- **helmet** - HTTP headers security
- **express-rate-limit** - Rate limiting
- **express-validator** - Input validation
- **hpp** - HTTP Parameter Pollution protection
- **xss-clean** - XSS protection
- **express-mongo-sanitize** - NoSQL injection protection
- **cors** - CORS configuration
- **dotenv** - Environment variables

## Security Best Practices

### Đã triển khai
- ✅ Password hashing với bcrypt (10 rounds)
- ✅ JWT với httpOnly cookies
- ✅ Input validation và sanitization
- ✅ Rate limiting (100 req/15min)
- ✅ XSS protection
- ✅ SQL/NoSQL injection protection
- ✅ Secure HTTP headers (Helmet)
- ✅ Environment variables cho secrets

### Khuyến nghị cho production
- [ ] Sử dụng HTTPS/SSL
- [ ] Lưu users vào database (MongoDB/PostgreSQL)
- [ ] Email verification
- [ ] Password reset functionality
- [ ] Two-factor authentication (2FA)
- [ ] Session management với Redis
- [ ] Logging và monitoring
- [ ] CSRF protection

## Scripts

```bash
npm start              # Chạy server
npm run dev            # Chạy với nodemon (auto-reload)
npm run security-check # Kiểm tra vulnerabilities
npm run security-fix   # Tự động fix vulnerabilities
npm run update-check   # Kiểm tra outdated packages
```

## Testing

### Test đăng ký
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test123",
    "fullName": "Test User"
  }'
```

### Test đăng nhập
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "Test123"
  }'
```

## Troubleshooting

### Port đã được sử dụng
```bash
# Windows
Get-Process -Name node | Stop-Process -Force

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### JWT Secret không được set
Đảm bảo file `.env` có:
```env
JWT_SECRET=your-secret-key-here
```

## Tài liệu tham khảo
- [Express.js Documentation](https://expressjs.com/)
- [JWT.io](https://jwt.io/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

## License
ISC

## Author
GitHub: [@tmduc2k4](https://github.com/tmduc2k4) 
