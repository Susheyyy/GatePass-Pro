const express = require('express');
const router = express.Router();

const {
  getVisitors,
  addVisitor,
  updateVisitor,
  deleteVisitor,
  verifyPasscode,
  exportVisitorsCSV,
  toggleLockdown,
  getLockdownStatus,
  addBlocklist,
  getBlocklist,
  removeBlocklist
} = require('../controllers/visitorController');
const { protectRoute, authorizeVisitorAccess, restrictToRoles } = require('../middleware/authMiddleware');
const { passcodeLimiter } = require('../middleware/visitorLimiter');

router.route('/')
  .get(protectRoute, authorizeVisitorAccess, getVisitors)
  .post(protectRoute, authorizeVisitorAccess, addVisitor);

router.get('/export', protectRoute, restrictToRoles('admin'), exportVisitorsCSV);

router.route('/system/lockdown')
  .get(protectRoute, getLockdownStatus)
  .post(protectRoute, restrictToRoles('admin'), toggleLockdown);

router.route('/blocklist')
  .get(protectRoute, restrictToRoles('admin'), getBlocklist)
  .post(protectRoute, restrictToRoles('admin'), addBlocklist);

router.route('/blocklist/:mobile')
  .delete(protectRoute, restrictToRoles('admin'), removeBlocklist);

router.post('/verify', protectRoute, passcodeLimiter, authorizeVisitorAccess, verifyPasscode);

router.route('/:id')
  .put(protectRoute, authorizeVisitorAccess, updateVisitor)
  .delete(protectRoute, authorizeVisitorAccess, deleteVisitor);

module.exports = router;
