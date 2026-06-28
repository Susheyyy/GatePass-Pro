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
  bulkCreateResidents
} = require('../controllers/residentController');

const { loginLimiter } = require('../middleware/visitorLimiter');

const { protectRoute, restrictToRoles } = require('../middleware/authMiddleware');

router.route('/')
  .get(protectRoute, restrictToRoles('admin', 'resident'), getResidents)
  .post(addResident);

router.post('/bulk', bulkCreateResidents);
router.post('/login', loginLimiter, loginResident);
router.post('/forgot-password', loginLimiter, forgotPassword);
router.post('/reset-password', resetForgotPassword);

router.route('/:id')
  .put(updateResident)
  .delete(deleteResident);

router.route('/:id/resend-otp')
  .post(resendOtp);

module.exports = router;
