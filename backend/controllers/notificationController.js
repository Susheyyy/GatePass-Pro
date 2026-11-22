const Notification = require('../models/Notification');
const Receipt = require('../models/NotificationReceipt');
const { notificationScope, publishNotification } = require('../services/notifications');

const principal = user => `${user.role}:${user.actorId || user.residentId}:${user.occupancyId || ''}`;
const expiresAt = notification => new Date(new Date(notification.createdAt).getTime() + 7 * 86400000);

const getNotifications = async (req, res) => {
  const notifications = await Notification.find(notificationScope(req.user)).sort({ createdAt: -1 }).limit(200);
  const receipts = await Receipt.find({ principal: principal(req.user), notificationId: { $in: notifications.map(n => n._id) } });
  const byId = new Map(receipts.map(r => [String(r.notificationId), r]));
  res.json(notifications.filter(n => !byId.get(String(n._id))?.dismissedAt).map(n => ({ ...n.toObject(), isRead: Boolean(byId.get(String(n._id))?.readAt) })));
};

const markAsRead = async (req, res) => {
  const notification = await Notification.findOne({ _id: req.params.id, ...notificationScope(req.user) });
  if (!notification) return res.status(404).json({ message: 'Notification not found' });
  await Receipt.updateOne({ principal: principal(req.user), notificationId: notification._id }, { $set: { readAt: new Date(), expiresAt: expiresAt(notification) } }, { upsert: true });
  res.json({ ...notification.toObject(), isRead: true });
};

const clearAllNotifications = async (req, res) => {
  if ((req.query.role && req.query.role !== req.user.role) || (req.query.flatNo && req.query.flatNo !== req.user.flatNo)) return res.status(403).json({ message: 'Cannot dismiss another recipient\'s notifications' });
  const notifications = await Notification.find(notificationScope(req.user)).select('_id createdAt');
  if (notifications.length) await Receipt.bulkWrite(notifications.map(n => ({ updateOne: { filter: { principal: principal(req.user), notificationId: n._id }, update: { $set: { dismissedAt: new Date(), expiresAt: expiresAt(n) } }, upsert: true } })));
  res.json({ message: 'Your notifications were dismissed' });
};

const createNotification = async (req, res) => {
  const { recipient = 'all', title, message } = req.body;
  if (typeof recipient !== 'string' || (!['all', 'admin', 'security'].includes(recipient) && !/^[A-Z]{1,12}-\d{1,8}$/.test(recipient)) || typeof title !== 'string' || !title.trim() || title.length > 120 || typeof message !== 'string' || !message.trim() || message.length > 2000) return res.status(400).json({ message: 'Invalid notification details' });
  res.status(201).json(await publishNotification(req, { recipient, title: title.trim(), message: message.trim(), type: 'admin_broadcast' }));
};

module.exports = { getNotifications, markAsRead, clearAllNotifications, createNotification, principal };
