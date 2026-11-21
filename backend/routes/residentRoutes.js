const express = require('express');
const router = express.Router();
const controller = require('../controllers/residentController');
const passwords = require('../controllers/passwordController');
const { protectRoute, restrictToRoles, authorizeResidentAccess } = require('../middleware/authMiddleware');
const { loginLimiter, registrationLimiter, resetIpLimiter, resetAccountLimiter, challengeLimiter } = require('../middleware/visitorLimiter');

router.route('/')
  .get(protectRoute, restrictToRoles('admin', 'resident'), controller.getResidents)
  .post(registrationLimiter, controller.addResident);
router.get('/vehicle-directory', protectRoute, controller.getVehicleDirectory);
router.post('/bulk', protectRoute, restrictToRoles('admin'), controller.bulkCreateResidents);
router.post('/login', loginLimiter, controller.loginResident);
router.post('/request-activation', resetIpLimiter, challengeLimiter, passwords.requestActivation);
router.post('/activate', resetIpLimiter, resetAccountLimiter, passwords.activate);
router.post('/forgot-password', resetIpLimiter, challengeLimiter, passwords.forgotPassword);
router.post('/reset-password', resetIpLimiter, resetAccountLimiter, passwords.resetForgotPassword);
router.put('/system/change-password', protectRoute, controller.changeSystemPassword);
router.route('/system/profile').get(protectRoute, controller.getSystemProfile).put(protectRoute, controller.updateSystemProfile);
router.route('/:id')
  .get(protectRoute, authorizeResidentAccess, controller.getResidentById)
  .put(protectRoute, authorizeResidentAccess, controller.updateResident)
  .delete(protectRoute, restrictToRoles('admin'), controller.deleteResident);
router.post('/:id/resend-otp', protectRoute, restrictToRoles('admin'), resetIpLimiter, challengeLimiter, controller.resendOtp);
module.exports = router;
