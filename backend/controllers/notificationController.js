const Notification = require('../models/Notification');

const getNotifications = async (req, res) => {
  try {
    const { role, flatNo } = req.query;
    if (!role) {
      return res.status(400).json({ message: 'Role is required' });
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
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
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
    const recipientValue = role === 'admin' ? 'admin' : flatNo;
    if (!recipientValue) {
      return res.status(400).json({ message: 'Flat number is required' });
    }

    await Notification.deleteMany({
      recipient: { $in: [recipientValue, 'all'] }
    });

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
