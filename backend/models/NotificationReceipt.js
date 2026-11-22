const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
  notificationId: { type: mongoose.Schema.Types.ObjectId, required: true },
  principal: { type: String, required: true },
  readAt: Date,
  dismissedAt: Date,
  expiresAt: { type: Date, required: true }
});

receiptSchema.index({ principal: 1, notificationId: 1 }, { unique: true });
receiptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model('NotificationReceipt', receiptSchema);
