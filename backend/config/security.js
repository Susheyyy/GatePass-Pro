const { randomInt, createHmac } = require('node:crypto');

function jwtSecret() {
  const value = process.env.JWT_SECRET;
  if (!value || Buffer.byteLength(value) < 32 || /fallback_secret|your_jwt_secret/i.test(value)) {
    throw new Error('JWT_SECRET must be a unique random secret of at least 32 bytes');
  }
  return value;
}

function validateConfig() {
  jwtSecret();
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  for (const key of ['ADMIN_PASSWORD', 'SECURITY_PASSWORD']) {
    if (process.env[key] && !validPassword(process.env[key])) {
      throw new Error(`${key} must contain 12 to 72 UTF-8 bytes`);
    }
  }
}

function validPassword(value) {
  return typeof value === 'string' && Buffer.byteLength(value) >= 12 && Buffer.byteLength(value) <= 72;
}

function otpHash(email, purpose, otp) {
  return createHmac('sha256', jwtSecret()).update(`${email.toLowerCase()}:${purpose}:${otp}`).digest('hex');
}

function issueOtp(email, purpose) {
  const code = randomInt(100000, 1000000).toString();
  return { code, fields: { otp: otpHash(email, purpose, code), otpPurpose: purpose, otpAttempts: 0, otpExpiresAt: new Date(Date.now() + 15 * 60000) } };
}

const residentFields = '_id flatNo name mobile email gmail members status isFirstLogin distressMessages distressStatus communityId bio location address vehicles avatar occupancyId occupancyStartedAt createdAt updatedAt';
function publicResident(document) {
  const source = document.toObject ? document.toObject() : document;
  return Object.fromEntries(residentFields.split(' ').filter(key => source[key] !== undefined).map(key => [key, source[key]]));
}

module.exports = { jwtSecret, validateConfig, validPassword, otpHash, issueOtp, residentFields, publicResident };
