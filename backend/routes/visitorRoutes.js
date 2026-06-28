const express = require('express');
const router = express.Router();
const {
  getVisitors,
  addVisitor,
  updateVisitor,
  deleteVisitor,
  verifyPasscode
} = require('../controllers/visitorController');
const { protectRoute, authorizeVisitorAccess } = require('../middleware/authMiddleware');
const { passcodeLimiter } = require('../middleware/visitorLimiter');

router.route('/')
  .get(protectRoute, authorizeVisitorAccess, getVisitors)
  .post(protectRoute, authorizeVisitorAccess, addVisitor);

router.post('/verify', protectRoute, passcodeLimiter, authorizeVisitorAccess, verifyPasscode);

router.route('/:id')
  .put(protectRoute, authorizeVisitorAccess, updateVisitor)
  .delete(protectRoute, authorizeVisitorAccess, deleteVisitor);

module.exports = router;
