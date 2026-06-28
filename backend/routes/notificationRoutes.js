const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  clearAllNotifications,
  createNotification
} = require('../controllers/notificationController');
const { protectRoute, restrictToRoles } = require('../middleware/authMiddleware');

router.route('/')
  .get(protectRoute, getNotifications)
  .post(protectRoute, restrictToRoles('admin'), createNotification)
  .delete(protectRoute, clearAllNotifications);

router.route('/:id/read')
  .put(protectRoute, markAsRead);

module.exports = router;
