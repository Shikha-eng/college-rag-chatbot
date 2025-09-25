const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema for Students and Admin
 * Supports both student login and admin authentication
 */
const userSchema = new mongoose.Schema({
  // Basic Information
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  
  // User Role
  role: {
    type: String,
    enum: ['student', 'admin'],
    default: 'student'
  },
  
  // Student-specific fields
  studentId: {
    type: String,
    sparse: true, // Allows multiple null values
    unique: true
  },
  course: {
    type: String,
    trim: true
  },
  year: {
    type: Number,
    min: 1,
    max: 6
  },
  
  // Contact Information
  phone: {
    type: String,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number']
  },
  whatsappNumber: {
    type: String,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid WhatsApp number']
  },
  
  // Language Preferences
  preferredLanguages: [{
    type: String,
    enum: ['hindi', 'english', 'marathi', 'marwari', 'mewadi', 'dhundhari'],
    default: 'english'
  }],
  primaryLanguage: {
    type: String,
    enum: ['hindi', 'english', 'marathi', 'marwari', 'mewadi', 'dhundhari'],
    default: 'english'
  },
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // Verification
  verificationToken: String,
  verificationExpires: Date,
  
  // Password Reset
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  
  // Login Tracking
  lastLogin: Date,
  loginCount: {
    type: Number,
    default: 0
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ studentId: 1 });
userSchema.index({ role: 1 });
userSchema.index({ whatsappNumber: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update timestamp
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to generate auth token (placeholder for JWT)
userSchema.methods.generateAuthToken = function() {
  // This will be implemented with JWT
  return {
    userId: this._id,
    email: this.email,
    role: this.role,
    name: this.name
  };
};

// Static method to find user by credentials
userSchema.statics.findByCredentials = async function(email, password) {
  const user = await this.findOne({ email, isActive: true });
  if (!user) {
    throw new Error('Invalid login credentials');
  }
  
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error('Invalid login credentials');
  }
  
  // Update login tracking
  user.lastLogin = new Date();
  user.loginCount += 1;
  await user.save();
  
  return user;
};

// Virtual for full name (if needed)
userSchema.virtual('profile').get(function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    studentId: this.studentId,
    course: this.course,
    year: this.year,
    primaryLanguage: this.primaryLanguage,
    isVerified: this.isVerified,
    createdAt: this.createdAt
  };
});

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.verificationToken;
  delete user.resetPasswordToken;
  delete user.__v;
  return user;
};

module.exports = mongoose.model('User', userSchema);