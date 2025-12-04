# MongoDB Atlas + Render Deployment Guide

## Bước 1: Setup MongoDB Atlas (5 phút)

### 1.1 Tạo tài khoản MongoDB Atlas
1. Truy cập: https://www.mongodb.com/cloud/atlas/register
2. Đăng ký miễn phí (hoặc đăng nhập nếu đã có tài khoản)

### 1.2 Tạo Cluster
1. Chọn **"Build a Database"**
2. Chọn **FREE tier (M0)** - 512MB storage miễn phí
3. Chọn Provider: **AWS** hoặc **Google Cloud**
4. Chọn Region gần Việt Nam nhất: **Singapore (ap-southeast-1)**
5. Đặt tên Cluster: `laptopstore-cluster` (hoặc tên bạn thích)
6. Click **"Create"** và đợi 1-3 phút

### 1.3 Tạo Database User
1. Trong menu bên trái, chọn **Database Access**
2. Click **"Add New Database User"**
3. Authentication Method: **Password**
4. Username: `laptopstore_admin` (hoặc tên bạn thích)
5. Password: **Tạo mật khẩu mạnh** (LƯU LẠI mật khẩu này!)
6. Database User Privileges: **Read and write to any database**
7. Click **"Add User"**

### 1.4 Whitelist IP Address
1. Trong menu bên trái, chọn **Network Access**
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (0.0.0.0/0)
   - Hoặc chỉ thêm IP của Render sau khi deploy
4. Click **"Confirm"**

### 1.5 Lấy Connection String
1. Quay lại **Database** (menu bên trái)
2. Click **"Connect"** trên cluster của bạn
3. Chọn **"Connect your application"**
4. Driver: **Node.js** version **5.5 or later**
5. Copy connection string, sẽ có dạng:
   ```
   mongodb+srv://laptopstore_admin:<password>@laptopstore-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. **QUAN TRỌNG:** Thay `<password>` bằng mật khẩu bạn đã tạo ở bước 1.3
7. Thêm tên database sau `.net/`: 
   ```
   mongodb+srv://laptopstore_admin:yourpassword@laptopstore-cluster.xxxxx.mongodb.net/laptopstore?retryWrites=true&w=majority
   ```

---

## Bước 2: Deploy lên Render (5 phút)

### 2.1 Push code lên GitHub
```bash
# Trong terminal VS Code
git add .
git commit -m "Add MongoDB integration for deployment"
git push origin main
```

### 2.2 Tạo tài khoản Render
1. Truy cập: https://render.com/
2. Click **"Get Started"**
3. Đăng nhập bằng **GitHub** (dễ nhất)

### 2.3 Tạo Web Service mới
1. Click **"New +"** → **"Web Service"**
2. Connect GitHub repository: **tmduc2k4/security**
3. Click **"Connect"** repository

### 2.4 Cấu hình Web Service
**Basic Settings:**
- **Name:** `laptopstore-security` (hoặc tên bạn thích)
- **Region:** **Singapore** (gần Việt Nam nhất)
- **Branch:** `main`
- **Root Directory:** để trống
- **Runtime:** **Node**
- **Build Command:** `npm install`
- **Start Command:** `node app.js`

**Instance Type:**
- Chọn **Free** ($0/month)

### 2.5 Environment Variables (QUAN TRỌNG!)
Scroll xuống phần **"Environment Variables"** và thêm:

1. Click **"Add Environment Variable"**
2. Thêm các biến sau:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `MONGODB_URI` | `mongodb+srv://laptopstore_admin:yourpassword@...` (từ bước 1.5) |
| `JWT_SECRET` | `your-super-secret-jwt-key-2025-change-this` (tạo random string) |
| `JWT_EXPIRES_IN` | `7d` |
| `RATE_LIMIT_MAX` | `100` |
| `STRICT_RATE_LIMIT_MAX` | `5` |
| `ALLOWED_ORIGINS` | `https://laptopstore-security.onrender.com` (thay bằng URL của bạn) |

**Lưu ý:** 
- Thay `yourpassword` trong MONGODB_URI bằng mật khẩu thực
- Thay URL trong ALLOWED_ORIGINS sau khi biết domain Render của bạn

### 2.6 Deploy
1. Click **"Create Web Service"**
2. Render sẽ tự động:
   - Clone code từ GitHub
   - Chạy `npm install`
   - Chạy `node app.js`
   - Deploy lên internet

3. Đợi 3-5 phút, xem logs để check:
   ```
   ✓ MongoDB Connected: laptopstore-cluster-shard-00-00...
   ✓ Database: laptopstore
   ✓ Server đang chạy tại http://0.0.0.0:3000
   ✓ Security features enabled
   ```

### 2.7 Truy cập website
- URL sẽ có dạng: `https://laptopstore-security.onrender.com`
- Copy URL này và update lại `ALLOWED_ORIGINS` trong Environment Variables
- Click **"Save Changes"** → Render sẽ tự deploy lại

---

## Bước 3: Kiểm tra deployment

### 3.1 Test các trang
1. **Homepage:** https://your-app.onrender.com
2. **Đăng ký:** https://your-app.onrender.com/register
3. **Đăng nhập:** https://your-app.onrender.com/login
4. **Laptops:** https://your-app.onrender.com/laptops

### 3.2 Test authentication
1. Đăng ký tài khoản mới
2. Đăng nhập
3. Xem profile: https://your-app.onrender.com/profile
4. Cập nhật thông tin
5. Đăng xuất

### 3.3 Kiểm tra MongoDB Atlas
1. Quay lại MongoDB Atlas → **Browse Collections**
2. Chọn database `laptopstore` → collection `users`
3. Xem users đã đăng ký có xuất hiện không

---

## Lưu ý quan trọng

### Free Tier Limitations
**Render Free Tier:**
- ✅ 750 giờ/tháng (đủ chạy 24/7)
- ⚠️ **Sleep sau 15 phút không hoạt động** (lần truy cập đầu cần đợi 30s-1 phút)
- ✅ SSL certificate tự động
- ⚠️ 100GB bandwidth/tháng

**MongoDB Atlas Free Tier:**
- ✅ 512MB storage
- ✅ Shared CPU/RAM
- ✅ Đủ cho hàng nghìn users

### Auto-deploy từ GitHub
- Mỗi khi push code mới lên GitHub, Render tự động deploy lại
- Xem logs deployment trong Render Dashboard

### Monitoring
- **Render Dashboard:** Xem logs, metrics, uptime
- **MongoDB Atlas:** Monitor database performance, queries

---

## Troubleshooting

### Lỗi: "MongoServerError: bad auth"
- Kiểm tra username/password trong MONGODB_URI
- Đảm bảo đã URL encode password (nếu có ký tự đặc biệt)

### Lỗi: "Connection timed out"
- Kiểm tra Network Access trong MongoDB Atlas
- Đảm bảo đã allow 0.0.0.0/0

### Website bị sleep (Render Free)
- Đây là hành vi bình thường của Free tier
- Lần truy cập đầu sẽ chậm (30s-1 phút)
- Giải pháp: Upgrade lên Paid tier ($7/tháng)

### CORS errors
- Kiểm tra ALLOWED_ORIGINS trong Environment Variables
- Phải match chính xác với domain Render

---

## Nâng cấp Production (Optional)

### 1. Custom Domain
1. Mua domain (Namecheap, GoDaddy, etc.)
2. Trong Render → Settings → Custom Domain
3. Add domain và update DNS records

### 2. SSL Certificate
- Render tự động cấp SSL certificate miễn phí
- Không cần làm gì thêm

### 3. Upgrade tiers
- **Render Starter:** $7/month (không sleep, 512MB RAM)
- **MongoDB M2:** $9/month (2GB storage, dedicated RAM)

---

## Thông tin hỗ trợ

- **Render Docs:** https://render.com/docs
- **MongoDB Atlas Docs:** https://docs.atlas.mongodb.com/
- **GitHub Repository:** https://github.com/tmduc2k4/security

**Email:** tmduc2k4@example.com (thay bằng email thực của bạn)
