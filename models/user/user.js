// File: models/user/user.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true,
    maxlength: [100, 'Country name cannot exceed 100 characters']
  },
  interest: { 
    type: String,
    required: [true, 'Interest is required'],
    enum: {
      values: ['Skill-Up', 'University', 'Jamb', 'Jupeb', 'Waec', 'Just want to explore'],
      message: 'Interest must be one of: Skill-Up, University, Jamb, Jupeb, Waec, Just want to explore'
    }
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationCode: {
    type: String,
    default: undefined
  },
  emailVerificationExpiry: {
    type: Date,
    default: undefined
  },
  passwordResetCode: {
    type: String,
    default: undefined
  },
  passwordResetExpiry: {
    type: Date,
    default: undefined
  },
  passwordResetSessionToken: {
    type: String,
    default: undefined
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  accountLocked: {
    type: Boolean,
    default: false
  },
  lockUntil: {
    type: Date,
    default: undefined
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
UserSchema.index({ email: 1 });
UserSchema.index({ emailVerificationCode: 1 });
UserSchema.index({ passwordResetCode: 1 });
UserSchema.index({ passwordResetSessionToken: 1 });

// Password hashing middleware
UserSchema.pre('save', async function(next) {
  // Only hash password if it's modified
  if (!this.isModified('password')) return next();
  
  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Password comparison method
UserSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Handle failed login attempts
UserSchema.methods.handleFailedLogin = async function() {
  this.loginAttempts += 1;
  
  // Lock account after 5 failed attempts for 30 minutes
  if (this.loginAttempts >= 5) {
    this.accountLocked = true;
    this.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  }
  
  await this.save();
};

// Check if account is locked
UserSchema.methods.isLocked = function() {
  return this.accountLocked && this.lockUntil && this.lockUntil > Date.now();
};

// Virtual for full name (if needed later)
UserSchema.virtual('fullName').get(function() {
  return this.name;
});

// Remove sensitive fields from JSON output
UserSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.emailVerificationCode;
  delete user.emailVerificationExpiry;
  delete user.passwordResetCode;
  delete user.passwordResetExpiry;
  delete user.passwordResetSessionToken;
  delete user.loginAttempts;
  delete user.accountLocked;
  delete user.lockUntil;
  return user;
};

module.exports = mongoose.model('User', UserSchema);