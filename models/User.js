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
    minlength: [6, 'Password phải có ít nhất 6 ký tự']
  },
  fullName: {
    type: String,
    trim: true,
    default: function() { return this.username; }
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
userSchema.pre('save', async function(next) {
  // Chỉ hash nếu password được modify
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method: So sánh password
userSchema.methods.comparePassword = async function(inputPassword) {
  return await bcrypt.compare(inputPassword, this.password);
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
