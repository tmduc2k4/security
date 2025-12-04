/**
 * Script tạo tài khoản admin
 * Chạy: node scripts/createAdmin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const createAdmin = async () => {
  try {
    // Kết nối MongoDB
    console.log('Đang kết nối MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Kết nối thành công!\n');

    // Thông tin admin
    const adminData = {
      username: 'admin',
      email: 'admin@laptopstore.com',
      password: 'Admin@123456',
      fullName: 'Administrator'
    };

    // Kiểm tra admin đã tồn tại chưa
    const existingAdmin = await User.findOne({ username: adminData.username });
    if (existingAdmin) {
      console.log('⚠ Admin đã tồn tại!');
      console.log('Username:', existingAdmin.username);
      console.log('Email:', existingAdmin.email);
      console.log('\nĐể reset mật khẩu, xóa user cũ trước:');
      console.log('> Vào MongoDB Atlas → Browse Collections → users → Xóa document admin');
      await mongoose.connection.close();
      return;
    }

    // Tạo admin mới
    console.log('Đang tạo tài khoản admin...');
    const admin = await User.create(adminData);

    console.log('\n✓ Tạo tài khoản admin thành công!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Username:', adminData.username);
    console.log('Email:', adminData.email);
    console.log('Password:', adminData.password);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠ QUAN TRỌNG: Đổi mật khẩu ngay sau khi đăng nhập!');
    console.log('Login tại: http://localhost:3000/login');
    console.log('hoặc: https://your-app.onrender.com/login\n');

    // Đóng kết nối
    await mongoose.connection.close();
    console.log('✓ Hoàn tất!\n');
    process.exit(0);

  } catch (error) {
    console.error('✗ Lỗi:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Chạy script
createAdmin();
