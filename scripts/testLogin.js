/**
 * Test đăng nhập admin
 * Chạy: node scripts/testLogin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const testLogin = async () => {
  try {
    console.log('Đang kết nối MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Kết nối thành công!\n');

    const username = 'admin';
    const password = 'Admin@123456';

    console.log('Testing login với:');
    console.log('Username:', username);
    console.log('Password:', password);
    console.log('');

    // Test 1: Tìm user
    console.log('1. Kiểm tra user có tồn tại...');
    const user = await User.findOne({ username });
    if (!user) {
      console.log('✗ User không tồn tại!\n');
      await mongoose.connection.close();
      process.exit(1);
    }
    console.log('✓ User tồn tại');
    console.log('  - ID:', user._id);
    console.log('  - Email:', user.email);
    console.log('  - Password hash:', user.password.substring(0, 20) + '...\n');

    // Test 2: So sánh password
    console.log('2. Kiểm tra password...');
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('✗ Password không khớp!\n');
      await mongoose.connection.close();
      process.exit(1);
    }
    console.log('✓ Password khớp!\n');

    // Test 3: Authenticate method
    console.log('3. Test authenticate method...');
    const authenticatedUser = await User.authenticate(username, password);
    if (!authenticatedUser) {
      console.log('✗ Authenticate method thất bại!\n');
      await mongoose.connection.close();
      process.exit(1);
    }
    console.log('✓ Authenticate thành công!');
    console.log('  - Username:', authenticatedUser.username);
    console.log('  - Email:', authenticatedUser.email);
    console.log('  - Full Name:', authenticatedUser.fullName);
    console.log('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✓ TẤT CẢ TESTS PASSED!');
    console.log('Đăng nhập nên hoạt động bình thường.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('✗ Lỗi:', error.message);
    console.error(error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

testLogin();
