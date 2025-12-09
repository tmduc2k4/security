# Bước cài đặt Nodemailer cho tính năng Forgot Password

## 1. Cài package
npm install nodemailer

## 2. Setup Gmail (Free)

### Nếu chưa bật 2-Step Verification:
1. Vào: https://myaccount.google.com/
2. Click "Security" ở menu bên trái
3. Scroll đến "How you sign in to Google"
4. Click "2-Step Verification" → Enable nó

### Tạo App Password:
1. Vào: https://myaccount.google.com/apppasswords
2. Select: Mail + Windows Computer
3. Google sẽ generate 16-ký tự password
4. COPY nó (ví dụ: xxxx xxxx xxxx xxxx)

## 3. Lưu vào .env
GMAIL_USER=your_email@gmail.com
GMAIL_PASSWORD=xxxx xxxx xxxx xxxx

## 4. Ready!
Emails sẽ gửi từ Gmail account của bạn
