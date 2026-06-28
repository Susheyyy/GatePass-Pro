const Notification = require('../models/Notification');

const getNotifications = async (req, res) => {
  try {
    const { role, flatNo } = req.query;
    if (!role) {
      return res.status(400).json({ message: 'Role is required' });
    }
    if (req.user.role !== 'admin' && req.user.role !== role) {
      return res.status(403).json({ message: 'Forbidden: Role mismatch' });
    }
    if (req.user.role === 'resident' && req.user.flatNo !== flatNo) {
      return res.status(403).json({ message: 'Forbidden: Flat number mismatch' });
    }
    const recipientValue = role === 'admin' ? 'admin' : flatNo;
    if (!recipientValue) {
      return res.status(400).json({ message: 'Flat number is required for residents' });
    }

    const notifications = await Notification.find({
      recipient: { $in: [recipientValue, 'all'] }
    }).sort({ createdAt: -1 });

    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    if (req.user.role !== 'admin' && notification.recipient !== 'all' && notification.recipient !== req.user.flatNo) {
      return res.status(403).json({ message: 'Forbidden: Cannot access this notification' });
    }
    notification.isRead = true;
    await notification.save();
    res.status(200).json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const clearAllNotifications = async (req, res) => {
  try {
    const { role, flatNo } = req.query;
    if (!role) {
      return res.status(400).json({ message: 'Role is required' });
    }
    if (req.user.role !== 'admin' && req.user.role !== role) {
      return res.status(403).json({ message: 'Forbidden: Role mismatch' });
    }
    if (req.user.role === 'resident' && req.user.flatNo !== flatNo) {
      return res.status(403).json({ message: 'Forbidden: Flat number mismatch' });
    }
    const recipientValue = role === 'admin' ? 'admin' : flatNo;
    if (!recipientValue) {
      return res.status(400).json({ message: 'Flat number is required' });
    }

    if (req.user.role === 'admin') {
      await Notification.deleteMany({ recipient: recipientValue });
    } else {
      await Notification.deleteMany({ recipient: recipientValue });
    }

    res.status(200).json({ message: 'Notifications cleared successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createNotification = async (req, res) => {
  try {
    const { recipient, title, message, type } = req.body;
    const notification = await Notification.create({
      recipient: recipient || 'all',
      title,
      message,
      type: type || 'admin_broadcast'
    });
    res.status(201).json(notification);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  clearAllNotifications,
  createNotification
};
