const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  clearAllNotifications,
  createNotification
} = require('../controllers/notificationController');

router.route('/')
  .get(getNotifications)
  .post(createNotification)
  .delete(clearAllNotifications);

router.route('/:id/read')
  .put(markAsRead);

module.exports = router;
