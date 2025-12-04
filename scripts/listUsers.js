/**
 * Script liệt kê tất cả users
 * Chạy: node scripts/listUsers.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const listUsers = async () => {
  try {
    // Kết nối MongoDB
    console.log('Đang kết nối MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Kết nối thành công!\n');

    // Lấy tất cả users
    const users = await User.find({}).select('-password');
    
    if (users.length === 0) {
      console.log('⚠ Chưa có user nào trong database');
      console.log('Chạy: node scripts/createAdmin.js để tạo admin\n');
    } else {
      console.log(`Tìm thấy ${users.length} user(s):\n`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      users.forEach((user, index) => {
        console.log(`${index + 1}. Username: ${user.username}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Full Name: ${user.fullName}`);
        console.log(`   Created: ${user.createdAt.toLocaleString()}`);
        console.log('   ─────────────────────────────────────────────────');
      });
    }

    // Đóng kết nối
    await mongoose.connection.close();
    console.log('\n✓ Hoàn tất!\n');
    process.exit(0);

  } catch (error) {
    console.error('✗ Lỗi:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Chạy script
listUsers();
