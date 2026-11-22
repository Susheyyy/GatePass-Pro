const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  actorKey: { type: String, required: true, index: true },
  role: { type: String, enum: ['admin', 'security', 'resident'], required: true },
  tokenVersion: { type: Number, required: true },
  occupancyId: String,
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null }
}, { timestamps: true });

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model('Session', sessionSchema);
