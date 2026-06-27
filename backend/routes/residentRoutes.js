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

router.route('/')
  .get(getResidents)
  .post(addResident);

router.post('/bulk', bulkCreateResidents);
router.post('/login', loginResident);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetForgotPassword);

router.route('/:id')
  .put(updateResident)
  .delete(deleteResident);

router.route('/:id/resend-otp')
  .post(resendOtp);

module.exports = router;
