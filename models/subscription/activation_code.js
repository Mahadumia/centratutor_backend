
// File: models/ActivationCode.js (Enhanced)
const mongoose = require('mongoose');

const ActivationCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    length: 10,
    index: true
  },
  plan: {
    type: String,
    enum: ['1year', '6months', '3months', '3days'],
    required: true
  },
  isUsed: {
    type: Boolean,
    default: false,
    index: true
  },
  usedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  usedAt: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Batch support fields
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CodeBatch',
    default: null,
    index: true
  },
  batchName: {
    type: String,
    default: null,
    index: true
  },
  // Security metadata
  entropyAnalysis: {
    shannonEntropy: Number,
    entropyRatio: Number,
    isHighEntropy: Boolean
  },
  generationAttempts: {
    type: Number,
    default: 1
  }
}, { timestamps: true });

// Compound indexes for efficient queries
ActivationCodeSchema.index({ plan: 1, isUsed: 1 });
ActivationCodeSchema.index({ batchName: 1, createdAt: -1 });
ActivationCodeSchema.index({ createdBy: 1, createdAt: -1 });

// Method to format code for display
ActivationCodeSchema.methods.getFormattedCode = function() {
  return `${this.code.slice(0, 4)}-${this.code.slice(4, 8)}-${this.code.slice(8, 10)}`;
};

module.exports = mongoose.model('ActivationCode', ActivationCodeSchema);
