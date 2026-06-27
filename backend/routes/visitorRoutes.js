const express = require('express');
const router = express.Router();
const {
  getVisitors,
  addVisitor,
  updateVisitor,
  deleteVisitor
} = require('../controllers/visitorController');
const { protectRoute, authorizeVisitorAccess } = require('../middleware/authMiddleware');

router.route('/')
  .get(protectRoute, authorizeVisitorAccess, getVisitors)
  .post(protectRoute, authorizeVisitorAccess, addVisitor);

router.route('/:id')
  .put(protectRoute, authorizeVisitorAccess, updateVisitor)
  .delete(protectRoute, authorizeVisitorAccess, deleteVisitor);

module.exports = router;
