const bcrypt = require('bcryptjs');

// In-memory user storage (thay bằng database trong production)
const users = [];
let userIdCounter = 1;

class User {
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.email = data.email;
    this.password = data.password; // Hashed password
    this.fullName = data.fullName;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Hash password trước khi lưu
  static async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  }

  // So sánh password
  static async comparePassword(inputPassword, hashedPassword) {
    return await bcrypt.compare(inputPassword, hashedPassword);
  }

  // Tạo user mới
  static async create(userData) {
    // Validate dữ liệu
    if (!userData.username || !userData.email || !userData.password) {
      throw new Error('Thiếu thông tin bắt buộc');
    }

    // Kiểm tra username đã tồn tại
    if (users.find(u => u.username === userData.username)) {
      throw new Error('Username đã tồn tại');
    }

    // Kiểm tra email đã tồn tại
    if (users.find(u => u.email === userData.email)) {
      throw new Error('Email đã được sử dụng');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(userData.password);

    // Tạo user mới
    const newUser = new User({
      id: userIdCounter++,
      username: userData.username,
      email: userData.email,
      password: hashedPassword,
      fullName: userData.fullName || userData.username,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    users.push(newUser);
    return newUser;
  }

  // Tìm user theo ID
  static findById(id) {
    return users.find(u => u.id === parseInt(id));
  }

  // Tìm user theo username
  static findByUsername(username) {
    return users.find(u => u.username === username);
  }

  // Tìm user theo email
  static findByEmail(email) {
    return users.find(u => u.email === email);
  }

  // Lấy tất cả users (không bao gồm password)
  static findAll() {
    return users.map(u => {
      const { password, ...userWithoutPassword } = u;
      return userWithoutPassword;
    });
  }

  // Xác thực user (login)
  static async authenticate(username, password) {
    const user = this.findByUsername(username);
    if (!user) {
      return null;
    }

    const isMatch = await this.comparePassword(password, user.password);
    if (!isMatch) {
      return null;
    }

    // Trả về user không có password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Cập nhật user
  static async update(id, updateData) {
    const user = this.findById(id);
    if (!user) {
      throw new Error('User không tồn tại');
    }

    // Cập nhật các field được phép
    if (updateData.fullName) user.fullName = updateData.fullName;
    if (updateData.email) {
      // Kiểm tra email mới không trùng với user khác
      const existingUser = users.find(u => u.email === updateData.email && u.id !== id);
      if (existingUser) {
        throw new Error('Email đã được sử dụng');
      }
      user.email = updateData.email;
    }
    if (updateData.password) {
      user.password = await this.hashPassword(updateData.password);
    }
    
    user.updatedAt = new Date();
    return user;
  }

  // Xóa user
  static delete(id) {
    const index = users.findIndex(u => u.id === parseInt(id));
    if (index === -1) {
      throw new Error('User không tồn tại');
    }
    users.splice(index, 1);
    return true;
  }

  // Lấy user object không có password
  toJSON() {
    const { password, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }
}

module.exports = User;
