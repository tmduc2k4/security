# LaptopStore - Website bán laptop đơn giản

Website bán laptop được xây dựng bằng Node.js, Express và EJS.

## Cài đặt

1. Cài đặt các dependencies:
```bash
npm install
```

2. Chạy server:
```bash
npm start
```

Hoặc chạy ở chế độ development với nodemon:
```bash
npm run dev
```

3. Mở trình duyệt và truy cập: http://localhost:3000

## Tính năng

- Trang chủ với sản phẩm nổi bật
- Danh sách tất cả sản phẩm laptop
- Trang chi tiết sản phẩm với thông số kỹ thuật
- Trang giới thiệu
- Trang liên hệ
- Thiết kế responsive

## Cấu trúc dự án

```
├── app.js              # File server chính
├── package.json        # Dependencies
├── views/              # EJS templates
│   ├── index.ejs       # Trang chủ
│   ├── laptops.ejs     # Danh sách sản phẩm
│   ├── laptop-detail.ejs # Chi tiết sản phẩm
│   ├── about.ejs       # Giới thiệu
│   └── contact.ejs     # Liên hệ
└── public/             # Static files
    └── css/
        └── style.css   # CSS styling
```

## Công nghệ sử dụng

- Node.js
- Express.js
- EJS (Template engine)
- CSS3
"# security" 
