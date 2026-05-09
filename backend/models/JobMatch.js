const mongoose = require('mongoose');

const jobMatchSchema = new mongoose.Schema(
  {
    scanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scan',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    title: { type: String, required: true },
    company: { type: String, default: '' },
    location: { type: String, default: '' },
    source: { type: String, default: '' },
    applyUrl: { type: String, default: '' },
    postedAt: { type: String, default: '' },

    salaryMin: { type: Number, default: null },
    salaryMax: { type: Number, default: null },
    salaryPeriod: { type: String, default: null },

    descriptionSnippet: { type: String, default: '' },
    requiredSkills: { type: [String], default: [] },

    matchScore: { type: Number, min: 0, max: 100, default: null },
    matchedKeywords: { type: [String], default: [] },

    appliedAt: { type: Date, default: null },
    saved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

jobMatchSchema.index({ scanId: 1, matchScore: -1 });

module.exports = mongoose.model('JobMatch', jobMatchSchema);