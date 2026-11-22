const rateLimit = require('express-rate-limit');
const { createHash } = require('node:crypto');

const accountKey = req => createHash('sha256').update(typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : String(req.params.id || 'invalid')).digest('hex');
const resetIpLimiter = rateLimit({ windowMs: 15 * 60000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many verification requests. Try again later.' } });
const resetAccountLimiter = rateLimit({ windowMs: 15 * 60000, limit: 10, keyGenerator: accountKey, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many verification attempts for this account.' } });
const challengeLimiter = rateLimit({ windowMs: 15 * 60000, limit: 3, keyGenerator: accountKey, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many code requests for this account. Try again later.' } });

const passcodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: { message: 'Too many verification attempts from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: { message: 'Too many login attempts from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { message: 'Too many registration requests from this IP. Please try again after an hour.' },
  standardHeaders: true,
  legacyHeaders: false
});
const authenticatedRegistrationLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 100, keyGenerator: req => `${req.user.role}:${req.user.actorId}`, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many resident creation requests for this account' } });

module.exports = { passcodeLimiter, loginLimiter, registrationLimiter, authenticatedRegistrationLimiter, resetIpLimiter, resetAccountLimiter, challengeLimiter };
