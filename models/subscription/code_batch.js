// File: models/CodeBatch.js 
const mongoose = require('mongoose');

const CodeBatchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    trim: true
  },
  plan: {
    type: String,
    enum: ['1year', '6months', '3months', '3days'],
    required: true
  },
  totalCodes: {
    type: Number,
    required: true,
    min: 1
  },
  codesGenerated: {
    type: Number,
    default: 0
  },
  codesUsed: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'archived'],
    default: 'active'
  },
  expiresAt: {
    type: Date,
    default: null
  },
  generationStats: {
    averageAttempts: Number,
    collisionRate: Number,
    generationTimeMs: Number
  }
}, { timestamps: true });

// Indexes
CodeBatchSchema.index({ createdBy: 1, createdAt: -1 });
CodeBatchSchema.index({ plan: 1, status: 1 });
CodeBatchSchema.index({ name: 1, createdBy: 1 }, { unique: true });

module.exports = mongoose.model('CodeBatch', CodeBatchSchema);