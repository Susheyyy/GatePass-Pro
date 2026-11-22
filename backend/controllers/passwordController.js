const bcrypt = require('bcryptjs');
const { timingSafeEqual } = require('node:crypto');
const Resident = require('../models/Resident');
const { sendEmail } = require('../config/mailer');
const { issueOtp, otpHash, validPassword } = require('../config/security');
const { revokeActor } = require('../services/sessions');

const emailFilter = email => ({ $or: [{ email }, { gmail: email }] });
const validEmail = email => typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

async function sendChallenge(resident, purpose) {
  const challenge = issueOtp(resident.email, purpose);

  const issued = await Resident.updateOne({ _id: resident._id, $or: [{ otpExpiresAt: { $exists: false } }, { otpExpiresAt: null }, { otpExpiresAt: { $lte: new Date() } }] }, { $set: challenge.fields });
  if (!issued.modifiedCount) return;
  try {
    await sendEmail({
      to: resident.gmail,
      subject: purpose === 'activate' ? 'GatePass Pro - Activate your account' : 'GatePass Pro - Reset your password',
      text: `Hello ${resident.name},\n\nYour ${purpose === 'activate' ? 'activation' : 'password reset'} code is ${challenge.code}. It expires in 15 minutes.\n\nUsername: ${resident.email}\nOpen ${(process.env.FRONTEND_URL || 'http://localhost:5173')}/login?email=${encodeURIComponent(resident.email)}${purpose === 'activate' ? '&activate=1' : ''}\n\nNever share this code with anyone.`
    });
  } catch {

    console.error('Account verification email delivery failed');
    await Resident.updateOne({ _id: resident._id, otp: challenge.fields.otp }, { $unset: { otp: 1, otpPurpose: 1, otpExpiresAt: 1 }, $set: { otpAttempts: 5 } });
    throw new Error('Unable to deliver verification email. Please try again later.');
  }
}

const requestPassword = purpose => async (req, res) => {
  if (!validEmail(req.body?.email)) return res.status(400).json({ message: 'Enter a valid email address' });
  const email = req.body.email.trim().toLowerCase();
  try {
    const resident = await Resident.findOne({ ...emailFilter(email), status: 'Approved', deletedAt: null });
    if (resident && (purpose === 'activate' ? resident.isFirstLogin : !resident.isFirstLogin)) {

      if (!resident.otpExpiresAt || resident.otpExpiresAt <= new Date()) await sendChallenge(resident, purpose);
    }
    return res.json({ message: 'If an eligible account exists, a verification code has been sent.' });
  } catch {
    return res.status(503).json({ message: 'Unable to deliver verification email. Please try again later.' });
  }
};

const completePassword = purpose => async (req, res) => {
  const { email, otp, password } = req.body || {};
  if (!validEmail(email) || typeof otp !== 'string' || !/^\d{6}$/.test(otp) || !validPassword(password)) {
    return res.status(400).json({ message: 'Provide a valid email, 6-digit code and a password of 12 to 72 UTF-8 bytes' });
  }
  try {
    const now = new Date();
    const eligibility = { ...emailFilter(email.trim().toLowerCase()), status: 'Approved', deletedAt: null, isFirstLogin: purpose === 'activate', otpPurpose: purpose, otpExpiresAt: { $gt: now }, otpAttempts: { $lt: 5 } };

    const resident = await Resident.findOneAndUpdate(eligibility, { $inc: { otpAttempts: 1 } }, { returnDocument: 'after' }).select('+otp');
    const digest = resident && otpHash(resident.email, purpose, otp);
    if (!resident || typeof resident.otp !== 'string' || resident.otp.length !== digest.length || !timingSafeEqual(Buffer.from(resident.otp), Buffer.from(digest))) return res.status(400).json({ message: 'Invalid, expired or exhausted verification code' });
    const hashedPassword = await bcrypt.hash(password, 12);

    const updated = await Resident.findOneAndUpdate({ _id: resident._id, status: 'Approved', deletedAt: null, isFirstLogin: purpose === 'activate', otp: digest, otpPurpose: purpose, otpExpiresAt: { $gt: new Date() }, otpAttempts: { $lte: 5 } }, {
      $set: { password: hashedPassword, isFirstLogin: false, otpAttempts: 0 },
      $unset: { otp: 1, otpPurpose: 1, otpExpiresAt: 1 },
      $inc: { tokenVersion: 1, __v: 1 }
    }, { returnDocument: 'after' });
    if (!updated) return res.status(400).json({ message: 'Invalid, expired or exhausted verification code' });
    await revokeActor('resident', resident._id, req.io);
    return res.json({ message: 'Password saved. Please sign in.', email: updated.email });
  } catch {
    return res.status(500).json({ message: 'Unable to complete password verification' });
  }
};

module.exports = { sendChallenge, requestActivation: requestPassword('activate'), activate: completePassword('activate'), forgotPassword: requestPassword('reset'), resetForgotPassword: completePassword('reset') };
