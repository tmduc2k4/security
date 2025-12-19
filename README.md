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

### Prerequisites
- Node.js (v14+)
- MongoDB (local hoặc cloud - xem phần "Setup MongoDB" bên dưới)
- npm hoặc yarn

### Bước 1: Clone repository
```bash
git clone https://github.com/tmduc2k4/security.git
cd security
```

### Bước 2: Cài đặt dependencies
```bash
npm install
```

### Bước 3: Setup MongoDB

#### Cách 1: Dùng MongoDB Atlas (Cloud - Khuyến nghị cho Production)

1. Truy cập [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Tạo tài khoản và đăng nhập
3. Tạo cluster mới (Free tier đủ dùng)
4. Lấy connection string:
   - Click "Connect" → "Drivers" → Copy connection string
   - String sẽ như: `mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority`

5. Cập nhật file `.env`:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/security?retryWrites=true&w=majority
```

#### Cách 2: Dùng MongoDB Local (Development)

**Windows:**
```bash
# Tải MongoDB Community Edition từ https://www.mongodb.com/try/download/community
# Sau khi cài đặt, MongoDB sẽ chạy tự động

# Hoặc chạy mongod thủ công:
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"
```

**Mac:**
```bash
# Cài MongoDB qua Homebrew
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB service
brew services start mongodb-community
```

**Linux (Ubuntu):**
```bash
# Cài MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB service
sudo systemctl start mongod
```

### Bước 4: Tạo file `.env`
```bash
cp .env.example .env
```

Cập nhật file `.env`:
```env
PORT=3000
NODE_ENV=development

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/security

# JWT Configuration
JWT_SECRET=your-super-secret-key-here-change-in-production
JWT_EXPIRES_IN=7d

# Session
SESSION_SECRET=your-session-secret-here

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Email (Optional - cấu hình cho forgot password)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Rate Limiting
RATE_LIMIT_MAX=100
STRICT_RATE_LIMIT_MAX=5

# Captcha (Optional)
RECAPTCHA_SITE_KEY=your-site-key
RECAPTCHA_SECRET_KEY=your-secret-key
```

### Bước 5: Chạy server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

### Bước 6: Xác minh setup
- Mở http://localhost:3000 trong trình duyệt
- Kiểm tra console để thấy:
  - ✓ Server đang chạy tại http://localhost:3000
  - ✓ MongoDB Connected: [connection-string]

Nếu thấy lỗi MongoDB, đảm bảo MongoDB service đang chạy!

---

### Kiểm tra trạng thái MongoDB

**Windows:**
```bash
# Kiểm tra MongoDB service
Get-Service MongoDB
```

**Mac/Linux:**
```bash
# Kiểm tra MongoDB service
sudo systemctl status mongod
```

**Sử dụng MongoDB Compass (GUI):**
- Tải từ [mongodb.com/products/compass](https://www.mongodb.com/products/compass)
- Connect tới `mongodb://localhost:27017`
- Xem databases và collections

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
2. Nhập **email** và password
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

## Database Configuration

### Connection String
- **Local:** `mongodb://localhost:27017/security`
- **Atlas:** `mongodb+srv://username:password@cluster.mongodb.net/security`

### Kiểm tra connection

```bash
# Dùng MongoDB Compass
# Connect to mongodb://localhost:27017

# Hoặc dùng mongosh CLI
mongosh mongodb://localhost:27017/security
```

### Reset Database (Development only)

```bash
# Xóa database
db.dropDatabase()

# Hoặc xóa từ code
use security
db.users.deleteMany({})
```

---



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
    "email": "test@example.com",
    "password": "Test123"
  }'
```

## Troubleshooting

### ❌ MongoDB Connection Error: ECONNREFUSED

**Vấn đề:** `connect ECONNREFUSED 127.0.0.1:27017`

**Giải pháp:**

1. **Kiểm tra MongoDB service:**
   ```bash
   # Windows
   Get-Service MongoDB
   
   # Mac
   brew services list | grep mongodb
   
   # Linux
   sudo systemctl status mongod
   ```

2. **Start MongoDB:**
   ```bash
   # Windows (nếu dùng Docker)
   docker start mongodb
   
   # Mac
   brew services start mongodb-community
   
   # Linux
   sudo systemctl start mongod
   ```

3. **Dùng MongoDB Atlas (Cloud):**
   - Đổi `MONGODB_URI` trong `.env` sang connection string từ MongoDB Atlas
   - Không cần MongoDB local

4. **Dùng Docker:**
   ```bash
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

### ❌ Port 3000 đã được sử dụng

```bash
# Windows
Get-Process -Name node | Stop-Process -Force

# Linux/Mac
lsof -ti:3000 | xargs kill -9

# Hoặc dùng port khác
PORT=3001 npm start
```

### ❌ JWT Secret không được set
Đảm bảo file `.env` có:
```env
JWT_SECRET=your-secret-key-here
```

### ❌ npm install failed
```bash
# Xóa package-lock.json và node_modules
rm -r node_modules package-lock.json

# Cài lại
npm install --legacy-peer-deps
```

### ❌ CSRF token errors trên production
Đảm bảo:
1. Session secret được set trong `.env`
2. Dùng HTTPS (secure cookies)
3. Cookie domain match với domain thực tế

## Tài liệu tham khảo
- [Express.js Documentation](https://expressjs.com/)
- [JWT.io](https://jwt.io/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

## License
ISC

## Author
GitHub: [@tmduc2k4](https://github.com/tmduc2k4) 
