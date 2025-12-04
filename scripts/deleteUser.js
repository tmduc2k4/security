/**
 * Script xóa user theo username
 * Chạy: node scripts/deleteUser.js username
 * Ví dụ: node scripts/deleteUser.js admin
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const deleteUser = async () => {
  try {
    // Lấy username từ command line
    const username = process.argv[2];
    
    if (!username) {
      console.log('✗ Thiếu username!');
      console.log('Cách dùng: node scripts/deleteUser.js <username>');
      console.log('Ví dụ: node scripts/deleteUser.js admin\n');
      process.exit(1);
    }

    // Kết nối MongoDB
    console.log('Đang kết nối MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Kết nối thành công!\n');

    // Tìm user
    const user = await User.findOne({ username });
    
    if (!user) {
      console.log(`✗ Không tìm thấy user: ${username}\n`);
      await mongoose.connection.close();
      process.exit(1);
    }

    // Hiển thị thông tin user
    console.log('Tìm thấy user:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Username:', user.username);
    console.log('Email:', user.email);
    console.log('Full Name:', user.fullName);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Xóa user
    await User.deleteUser(user._id);
    
    console.log(`✓ Đã xóa user: ${username}\n`);

    // Đóng kết nối
    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('✗ Lỗi:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Chạy script
deleteUser();
