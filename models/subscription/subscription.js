// File: models/subscription/subscription.js - FIXED ENUM VALUES
const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  plan: {
    type: String,
    enum: ['1year', '6months', '3months', '3days'],
    required: true
  },
  totalDays: {
    type: Number,
    required: true
  },
  active: {
    type: Boolean,
    default: true
  },
  activatedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  activationMethod: {
    type: String,
    enum: ['code', 'payment', 'signup'], // FIXED: Added 'signup' to enum
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual field to calculate days remaining dynamically
SubscriptionSchema.virtual('daysRemaining').get(function() {
  if (!this.active || !this.expiresAt) {
    return 0;
  }
  
  const now = new Date();
  const expiry = new Date(this.expiresAt);
  
  // If already expired, return 0
  if (now >= expiry) {
    return 0;
  }
  
  // Calculate remaining time in milliseconds
  const timeDiff = expiry.getTime() - now.getTime();
  
  // Convert to days and round up
  const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  
  return Math.max(0, daysRemaining);
});

// Virtual field to check if subscription is expired
SubscriptionSchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) {
    return true;
  }
  
  return new Date() >= new Date(this.expiresAt);
});

// Pre-save middleware to update active status based on expiry
SubscriptionSchema.pre('save', function(next) {
  // Set expiresAt if not already set
  if (!this.expiresAt && this.activatedAt && this.totalDays) {
    const expiryDate = new Date(this.activatedAt);
    expiryDate.setDate(expiryDate.getDate() + this.totalDays);
    this.expiresAt = expiryDate;
  }
  
  // Update active status based on expiry
  if (this.expiresAt && new Date() >= new Date(this.expiresAt)) {
    this.active = false;
  }
  
  next();
});

// Helper function to calculate days based on plan
SubscriptionSchema.statics.getPlanDays = function(plan) {
  switch (plan) {
    case '1year': return 365;
    case '6months': return 182;
    case '3months': return 91;
    case '3days': return 3;
    default: return 0;
  }
};

// FIXED: Method to extend subscription with plan update support
SubscriptionSchema.methods.extend = function(additionalDays, newPlan = null) {
  console.log(`🔍 SUBSCRIPTION MODEL: Extending subscription by ${additionalDays} days`);
  console.log(`🔍 SUBSCRIPTION MODEL: Current plan: ${this.plan}, New plan: ${newPlan || 'not provided'}`);
  
  if (!this.expiresAt) {
    // If no expiry date, start from now
    this.expiresAt = new Date();
  }
  
  // If subscription is expired, start from current date
  const startDate = this.isExpired ? new Date() : new Date(this.expiresAt);
  
  // Add additional days
  startDate.setDate(startDate.getDate() + additionalDays);
  this.expiresAt = startDate;
  this.totalDays += additionalDays;
  this.active = true;
  
  // Update plan if a new plan is provided
  if (newPlan && newPlan !== this.plan) {
    console.log(`🔍 SUBSCRIPTION MODEL: Updating plan from ${this.plan} to ${newPlan}`);
    this.plan = newPlan;
  }
  
  console.log(`🔍 SUBSCRIPTION MODEL: Extended subscription - Plan: ${this.plan}, Total days: ${this.totalDays}, Expires: ${this.expiresAt}`);
  
  return this;
};

// FIXED: Method to upgrade plan (used when activating codes/payments)
SubscriptionSchema.methods.upgradePlan = function(newPlan) {
  const planPriority = { 
    '3days': 1, 
    '3months': 2, 
    '6months': 3, 
    '1year': 4 
  };
  
  const currentPriority = planPriority[this.plan] || 0;
  const newPriority = planPriority[newPlan] || 0;
  
  // Only upgrade if new plan has higher priority
  if (newPriority > currentPriority) {
    console.log(`🔍 SUBSCRIPTION MODEL: Upgrading plan from ${this.plan} to ${newPlan}`);
    this.plan = newPlan;
    return true;
  }
  
  console.log(`🔍 SUBSCRIPTION MODEL: No plan upgrade needed. Current: ${this.plan}, Attempted: ${newPlan}`);
  return false;
};

// Static method to find active subscriptions
SubscriptionSchema.statics.findActive = function() {
  return this.find({
    active: true,
    expiresAt: { $gt: new Date() }
  });
};

module.exports = mongoose.model('Subscription', SubscriptionSchema);