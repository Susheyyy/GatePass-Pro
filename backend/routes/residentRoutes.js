const express = require('express');
const router = express.Router();
const {
  getResidents,
  addResident,
  updateResident,
  deleteResident,
  resendOtp,
  forgotPassword,
  resetForgotPassword,
  loginResident,
  bulkCreateResidents,
  getResidentById
} = require('../controllers/residentController');

const { loginLimiter } = require('../middleware/visitorLimiter');

const { protectRoute, restrictToRoles, authorizeResidentAccess } = require('../middleware/authMiddleware');

router.route('/')
  .get(protectRoute, restrictToRoles('admin', 'resident'), getResidents)
  .post(addResident);

router.post('/bulk', protectRoute, restrictToRoles('admin'), bulkCreateResidents);
router.post('/login', loginLimiter, loginResident);
router.post('/forgot-password', loginLimiter, forgotPassword);
router.post('/reset-password', resetForgotPassword);

router.route('/:id')
  .get(protectRoute, authorizeResidentAccess, getResidentById)
  .put(protectRoute, authorizeResidentAccess, updateResident)
  .delete(protectRoute, restrictToRoles('admin'), deleteResident);

router.route('/:id/resend-otp')
  .post(protectRoute, restrictToRoles('admin'), resendOtp);

module.exports = router;
