const mongoose = require('mongoose');

const keywordSchema = new mongoose.Schema(
  {
    keyword: { type: String, required: true },
    status: {
      type: String,
      enum: ['present', 'missing', 'partial'],
      required: true,
    },
    importance: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    suggestion: { type: String, default: '' },
  },
  { _id: false }
);

const breakdownSchema = new mongoose.Schema(
  {
    skills: { type: Number, min: 0, max: 100, default: 0 },
    experience: { type: Number, min: 0, max: 100, default: 0 },
    keywords: { type: Number, min: 0, max: 100, default: 0 },
    qualifications: { type: Number, min: 0, max: 100, default: 0 },
  },
  { _id: false }
);

const scanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['queued', 'parsing', 'scoring', 'fetching_jobs', 'done', 'failed'],
      default: 'queued',
      index: true,
    },
    error: { type: String, default: null },
    resumeText: { type: String, select: false },
    jdText: { type: String, select: false },
    resumeFileName: { type: String, default: '' },
    jdFileName: { type: String, default: '' },
    matchScore: { type: Number, min: 0, max: 100, default: null },
    breakdown: { type: breakdownSchema, default: null },
    keywords: { type: [keywordSchema], default: [] },
    resumeEmbedding: { type: [Number], select: false },
    jdEmbedding: { type: [Number], select: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Scan', scanSchema);