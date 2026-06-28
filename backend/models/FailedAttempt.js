const mongoose = require('mongoose');

const failedAttemptSchema = new mongoose.Schema({
  flatNo: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  count: {
    type: Number,
    default: 0
  },
  lockedUntil: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

failedAttemptSchema.index({ lockedUntil: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('FailedAttempt', failedAttemptSchema);
