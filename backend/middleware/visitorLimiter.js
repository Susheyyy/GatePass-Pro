const rateLimit = require('express-rate-limit');

const passcodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many verification attempts from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { passcodeLimiter };
