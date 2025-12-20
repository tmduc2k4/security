const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Define User Schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username là bắt buộc'],
    unique: true,
    trim: true,
    minlength: [3, 'Username phải có ít nhất 3 ký tự'],
    maxlength: [30, 'Username không được quá 30 ký tự'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username chỉ được chứa chữ, số và dấu gạch dưới']
  },
  email: {
    type: String,
    required: [true, 'Email là bắt buộc'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email không hợp lệ']
  },
  password: {
    type: String,
    required: [true, 'Password là bắt buộc'],
    minlength: [12, 'Password phải có ít nhất 12 ký tự']
  },
  fullName: {
    type: String,
    trim: true,
    default: function() { return this.username; }
  },
  // Security enhancements
  twoFactorSecret: {
    type: String,
    default: null
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  lastPasswordChange: {
    type: Date,
    default: Date.now
  },
  passwordHistory: [{
    password: String,
    changedAt: Date
  }],
  passwordExpiresAt: {
    type: Date,
    default: function() {
      // Password expires after 90 days
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 90);
      return expiryDate;
    }
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  accountLockedUntil: {
    type: Date,
    default: null
  },
  requiresCaptcha: {
    type: Boolean,
    default: false
  },
  // Password reset fields
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetExpiresAt: {
    type: Date,
    default: null
  },
  // Role-Based Access Control
  role: {
    type: String,
    enum: ['user', 'admin', 'superadmin'],
    default: 'user'
  },
  permissions: [{
    type: String,
    enum: [
      'view_profile',
      'edit_profile',
      'view_users',
      'edit_users',
      'delete_users',
      'view_logs',
      'manage_roles',
      'manage_system'
    ]
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true, // Tự động thêm createdAt và updatedAt
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.password; // Không trả về password trong JSON
      return ret;
    }
  }
});

// Hash password trước khi save
userSchema.pre('save', async function() {
  // Chỉ hash nếu password được modify
  if (!this.isModified('password')) {
    return;
  }
  
  // Lưu password cũ vào history (nếu không phải user mới)
  if (!this.isNew && this.password) {
    this.passwordHistory.push({
      password: this.password,
      changedAt: new Date()
    });
    
    // Giữ tối đa 5 password gần nhất
    if (this.passwordHistory.length > 5) {
      this.passwordHistory = this.passwordHistory.slice(-5);
    }
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  
  // Cập nhật lastPasswordChange và passwordExpiresAt
  this.lastPasswordChange = new Date();
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 90);
  this.passwordExpiresAt = expiryDate;
});

// Instance method: So sánh password
userSchema.methods.comparePassword = async function(inputPassword) {
  try {
    if (!inputPassword) {
      throw new Error('Password không được để trống');
    }
    if (!this.password) {
      throw new Error('User không có mật khẩu');
    }
    return await bcrypt.compare(inputPassword, this.password);
  } catch (error) {
    console.error('Error in comparePassword:', error);
    throw new Error(`Lỗi xác minh mật khẩu: ${error.message}`);
  }
};

// Instance method: Kiểm tra password đã dùng trước đó chưa
userSchema.methods.isPasswordInHistory = async function(newPassword) {
  for (const oldPass of this.passwordHistory) {
    const isMatch = await bcrypt.compare(newPassword, oldPass.password);
    if (isMatch) {
      return true;
    }
  }
  return false;
};

// Instance method: Kiểm tra password đã hết hạn chưa
userSchema.methods.isPasswordExpired = function() {
  return this.passwordExpiresAt && this.passwordExpiresAt < new Date();
};

// Instance method: Kiểm tra account có bị lock không
userSchema.methods.isAccountLocked = function() {
  return this.accountLockedUntil && this.accountLockedUntil > new Date();
};

// Instance method: Tăng failed login attempts
userSchema.methods.incrementFailedAttempts = async function() {
  this.failedLoginAttempts += 1;
  
  // Yêu cầu CAPTCHA sau 5 lần thất bại
  if (this.failedLoginAttempts === 5) {
    this.requiresCaptcha = true;
  }
  
  // Lock account sau 10 lần thất bại (10 phút)
  if (this.failedLoginAttempts >= 10) {
    const lockUntil = new Date();
    lockUntil.setMinutes(lockUntil.getMinutes() + 10);
    this.accountLockedUntil = lockUntil;
  }
  
  await this.save();
};

// Instance method: Reset failed attempts sau login thành công
userSchema.methods.resetFailedAttempts = async function() {
  this.failedLoginAttempts = 0;
  this.accountLockedUntil = null;
  this.requiresCaptcha = false;
  await this.save();
};

// Static method: Tìm user và authenticate
userSchema.statics.authenticate = async function(username, password) {
  const user = await this.findOne({ username });
  if (!user) {
    return null;
  }
  
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return null;
  }
  
  return user;
};

// Static method: Lấy tất cả users (không bao gồm password)
userSchema.statics.findAll = async function() {
  return await this.find({}).select('-password');
};

// Static method: Update user
userSchema.statics.updateUser = async function(id, updateData) {
  const user = await this.findById(id);
  if (!user) {
    throw new Error('User không tồn tại');
  }

  // Cập nhật các field được phép
  if (updateData.fullName) user.fullName = updateData.fullName;
  if (updateData.email) {
    // Kiểm tra email mới không trùng với user khác
    const existingUser = await this.findOne({ email: updateData.email, _id: { $ne: id } });
    if (existingUser) {
      throw new Error('Email đã được sử dụng');
    }
    user.email = updateData.email;
  }
  if (updateData.password) {
    user.password = updateData.password; // Pre-save hook sẽ tự hash
  }
  
  await user.save();
  return user;
};

// Static method: Delete user
userSchema.statics.deleteUser = async function(id) {
  const result = await this.findByIdAndDelete(id);
  if (!result) {
    throw new Error('User không tồn tại');
  }
  return true;
};

const User = mongoose.model('User', userSchema);

module.exports = User;

module.exports = User;
