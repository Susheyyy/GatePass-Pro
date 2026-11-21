const { randomBytes } = require('node:crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Resident = require('../models/Resident');
const SystemCredential = require('../models/SystemCredential');
const SystemProfile = require('../models/SystemProfile');
const Notification = require('../models/Notification');
const { jwtSecret, validPassword, publicResident, residentFields } = require('../config/security');
const { sendChallenge } = require('./passwordController');
const { authenticate } = require('../middleware/authMiddleware');

const pageOptions = query => ({ page: Math.max(1, Number.parseInt(query.page) || 1), limit: Math.min(200, Math.max(1, Number.parseInt(query.limit) || 50)) });
const escaped = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getResidents = async (req, res) => {
  try {
    const query = req.user.role === 'resident' ? { flatNo: req.user.flatNo } : {};
    if (req.query.search) {
      const search = new RegExp(escaped(req.query.search), 'i');
      query.$or = [{ name: search }, { flatNo: search }, { vehicles: search }];
    }
    const { page, limit } = pageOptions(req.query);
    const [residents, total] = await Promise.all([
      Resident.find(query).select(residentFields).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Resident.countDocuments(query)
    ]);
    // Co-residents get household identity, not another member's profile/contact details.
    const result = residents.map(r => req.user.role === 'resident' && String(r._id) !== String(req.user.residentId)
      ? { _id: r._id, name: r.name, flatNo: r.flatNo, status: r.status, vehicles: r.vehicles }
      : publicResident(r));
    res.json({ residents: result, total, page, pages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ message: 'Unable to load residents' });
  }
};

const getVehicleDirectory = async (req, res) => {
  try {
    const projection = req.user.role === 'resident' ? '_id name flatNo vehicles' : '_id name flatNo vehicles mobile';
    const residents = await Resident.find({ status: 'Approved', 'vehicles.0': { $exists: true } }).select(projection).limit(1000);
    res.json(residents);
  } catch {
    res.status(500).json({ message: 'Unable to load vehicle directory' });
  }
};

function registrationData(body) {
  const { name, mobile, gmail, members } = body;
  if (typeof body.flatNo !== 'string' || !/^[A-Z]+-\d+$/.test(body.flatNo.trim().toUpperCase()) || typeof name !== 'string' || name.trim().length < 2 || name.length > 80 || typeof mobile !== 'string' || !/^\d{8,15}$/.test(mobile) || typeof gmail !== 'string' || gmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gmail) || !Number.isInteger(Number(members)) || Number(members) < 1 || Number(members) > 50) throw new Error('Provide a valid flat, name, mobile, email and household size (1-50)');
  return { flatNo: body.flatNo.trim().toUpperCase(), name: name.trim(), mobile, gmail: gmail.trim().toLowerCase(), members: Number(members) };
}

async function createResident(data, approved) {
  if (await Resident.exists({ gmail: data.gmail })) throw new Error('A resident with this email already exists');
  const email = `${data.name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '')}.${data.flatNo.toLowerCase().replace('-', '')}.${randomBytes(3).toString('hex')}@gatepass.com`;
  const resident = await Resident.create({ ...data, email, password: randomBytes(32).toString('hex'), status: approved ? 'Approved' : 'Pending', isFirstLogin: true, communityId: randomBytes(10).toString('hex'), address: `Flat ${data.flatNo}, GatePass Residency` });
  if (approved) {
    try { await sendChallenge(resident, 'activate'); } catch { /* Admin can resend after mail configuration is corrected. */ }
  }
  return resident;
}

const addResident = async (req, res) => {
  try {
    const data = registrationData(req.body);
    let coResident = false;
    if (req.body.isResidentAdding) {
      let user;
      try { user = await authenticate((req.headers.authorization || '').replace(/^Bearer /, '')); }
      catch { return res.status(401).json({ message: 'Authentication required to add household members' }); }
      if (user.role !== 'resident' || user.flatNo !== data.flatNo) return res.status(403).json({ message: 'You can only add members to your own flat' });
      coResident = true;
    }
    const resident = await createResident(data, coResident);
    try {
      await Notification.create({ recipient: 'admin', title: 'Resident registration', message: `${resident.name} registered for ${resident.flatNo}.`, type: 'admin_broadcast' });
    } catch { console.error('Registration notification persistence failed'); }
    res.status(201).json(publicResident(resident));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateResident = async (req, res) => {
  try {
    const body = req.body;
    if (body.password !== undefined || body.otp !== undefined) return res.status(400).json({ message: 'Use the dedicated activation or password reset endpoint' });
    const resident = await Resident.findById(req.params.id).select('+password');
    if (!resident) return res.status(404).json({ message: 'Resident not found' });
    if (req.user.role !== 'admin' && ((body.flatNo !== undefined && body.flatNo !== resident.flatNo) || (body.status !== undefined && body.status !== resident.status))) return res.status(403).json({ message: 'Only administrators can change flat assignment or approval status' });
    if (body.currentPassword !== undefined || body.newPassword !== undefined) {
      if (typeof body.currentPassword !== 'string' || !validPassword(body.newPassword)) return res.status(400).json({ message: 'New password must contain 12 to 72 UTF-8 bytes' });
      if (!resident.password || !await bcrypt.compare(body.currentPassword, resident.password)) return res.status(400).json({ message: 'Incorrect current password' });
      // Atomic update also invalidates outstanding reset challenges and all sessions.
      const updated = await Resident.findOneAndUpdate({ _id: resident._id, password: resident.password }, { $set: { password: await bcrypt.hash(body.newPassword, 12) }, $inc: { tokenVersion: 1 }, $unset: { otp: 1, otpPurpose: 1, otpExpiresAt: 1 } }, { returnDocument: 'after' });
      if (!updated) return res.status(409).json({ message: 'Password changed concurrently. Please sign in again.' });
      return res.json(publicResident(updated));
    }
    const wasPending = resident.status !== 'Approved';
    if (body.flatNo !== undefined) {
      if (typeof body.flatNo !== 'string' || !/^[A-Z]+-\d+$/.test(body.flatNo.trim().toUpperCase())) return res.status(400).json({ message: 'Invalid flat number' });
      resident.flatNo = body.flatNo.trim().toUpperCase();
    }
    for (const key of ['name', 'mobile', 'gmail', 'members', 'bio', 'location', 'address', 'avatar', 'vehicles']) if (body[key] !== undefined) resident[key] = body[key];
    if (body.status !== undefined) resident.status = body.status;
    if (body.distressStatus !== undefined) {
      if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only administrators can resolve alerts' });
      resident.distressStatus = body.distressStatus;
    }
    if (body.clearDistress) {
      resident.distressMessages = [];
      resident.distressStatus = 'None';
    }
    if (body.distressMessage) {
      if (typeof body.distressMessage !== 'string' || body.distressMessage.length > 1000) return res.status(400).json({ message: 'Alert message must be at most 1000 characters' });
      const sender = req.user.role === 'admin' ? 'admin' : 'resident';
      resident.distressMessages.push({ message: body.distressMessage, sender });
      if (sender === 'resident') resident.distressStatus = 'Active';
      const notification = await Notification.create({ recipient: sender === 'admin' ? resident.flatNo : 'admin', title: sender === 'admin' ? 'New Distress Response' : 'Distress Alert Received', message: body.distressMessage, type: 'distress_reply' });
      req.io?.to(sender === 'admin' ? `room_flat_${resident.flatNo}` : 'room_admins').emit('new_notification', notification);
    }
    await resident.save();
    if (resident.status === 'Approved' && wasPending && resident.isFirstLogin) {
      try { await sendChallenge(resident, 'activate'); } catch { /* Resend is available to administrators. */ }
    }
    if (resident.distressStatus === 'Active') req.io?.to('room_admins').emit('distress_alert', { residentId: resident._id, flatNo: resident.flatNo, name: resident.name, distressStatus: resident.distressStatus, messages: resident.distressMessages });
    else req.io?.to('room_admins').emit('distress_resolved', { residentId: resident._id });
    res.json(publicResident(resident));
  } catch {
    res.status(400).json({ message: 'Unable to update resident. Check the supplied fields.' });
  }
};

const deleteResident = async (req, res) => {
  try {
    const resident = await Resident.findByIdAndDelete(req.params.id);
    if (!resident) return res.status(404).json({ message: 'Resident not found' });
    res.json({ message: 'Resident removed successfully' });
  } catch { res.status(400).json({ message: 'Invalid resident identifier' }); }
};

const resendOtp = async (req, res) => {
  try {
    const resident = await Resident.findById(req.params.id);
    if (!resident || resident.status !== 'Approved' || !resident.isFirstLogin) return res.status(400).json({ message: 'No pending activation for this account' });
    await sendChallenge(resident, 'activate');
    res.json({ message: 'Activation requested. An existing unexpired code remains valid.' });
  } catch { res.status(503).json({ message: 'Unable to deliver verification email' }); }
};

const loginResident = async (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string' || email.length > 254 || Buffer.byteLength(password) > 72) return res.status(400).json({ message: 'Email and password are required' });
  const formattedEmail = email.trim().toLowerCase();
  try {
    const role = formattedEmail === 'admin@gatepass.com' ? 'admin' : formattedEmail === 'security@gatepass.com' ? 'security' : 'resident';
    if (role !== 'resident') {
      const credential = await SystemCredential.findOne({ role });
      // Previously seeded defaults cannot be used after this upgrade.
      if (['admin123', 'security123'].includes(password) || !credential || !await bcrypt.compare(password, credential.password)) return res.status(401).json({ message: 'Invalid email or password' });
      const token = jwt.sign({ role, email: formattedEmail, tokenVersion: credential.tokenVersion || 0 }, jwtSecret(), { algorithm: 'HS256', expiresIn: '8h' });
      return res.json({ token, role, email: formattedEmail });
    }
    const resident = await Resident.findOne({ $or: [{ email: formattedEmail }, { gmail: formattedEmail }] }).select('+password');
    if (!resident || resident.status !== 'Approved' || resident.isFirstLogin || !resident.password || !await bcrypt.compare(password, resident.password)) return res.status(401).json({ message: 'Invalid credentials or inactive account. New residents must activate their account first.' });
    const token = jwt.sign({ role, email: resident.email, residentId: resident._id, flatNo: resident.flatNo, tokenVersion: resident.tokenVersion || 0 }, jwtSecret(), { algorithm: 'HS256', expiresIn: '8h' });
    res.json({ token, role, resident: publicResident(resident) });
  } catch { res.status(503).json({ message: 'Unable to sign in. Please try again later.' }); }
};

const bulkCreateResidents = async (req, res) => {
  if (!Array.isArray(req.body.residents) || req.body.residents.length > 200) return res.status(400).json({ message: 'Provide up to 200 residents per import' });
  let count = 0;
  const errors = [];
  for (const body of req.body.residents) {
    try { await createResident(registrationData(body), true); count++; }
    catch (error) { errors.push(error.message); }
  }
  res.status(count ? 201 : 400).json({ message: `Imported ${count} residents`, createdCount: count, errors });
};

const getResidentById = async (req, res) => {
  try {
    const resident = await Resident.findById(req.params.id).select(residentFields);
    if (!resident) return res.status(404).json({ message: 'Resident not found' });
    res.json(publicResident(resident));
  } catch { res.status(400).json({ message: 'Invalid resident identifier' }); }
};

const changeSystemPassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!['admin', 'security'].includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
  if (typeof currentPassword !== 'string' || !validPassword(newPassword)) return res.status(400).json({ message: 'New password must contain 12 to 72 UTF-8 bytes' });
  try {
    const credential = await SystemCredential.findOne({ role: req.user.role });
    if (!credential || !await bcrypt.compare(currentPassword, credential.password)) return res.status(400).json({ message: 'Incorrect current password' });
    const updated = await SystemCredential.findOneAndUpdate({ _id: credential._id, password: credential.password }, { $set: { password: await bcrypt.hash(newPassword, 12) }, $inc: { tokenVersion: 1 } });
    if (!updated) return res.status(409).json({ message: 'Password changed concurrently' });
    res.json({ message: 'Password updated. Please sign in again.' });
  } catch { res.status(500).json({ message: 'Unable to change password' }); }
};

const getSystemProfile = async (req, res) => {
  if (!['admin', 'security'].includes(req.user.role) || (req.query.role && req.query.role !== req.user.role)) return res.status(403).json({ message: 'Forbidden' });
  try {
    const role = req.user.role;
    const profile = await SystemProfile.findOneAndUpdate({ role }, { $setOnInsert: { role, name: role === 'admin' ? 'System Administrator' : 'Security Desk Officer', email: `${role}@gatepass.com`, communityId: role.toUpperCase(), mobile: 'N/A', bio: 'GatePass Pro team', location: 'GatePass Residency', address: 'Gate Control Room' } }, { upsert: true, returnDocument: 'after', runValidators: true });
    res.json(profile);
  } catch { res.status(500).json({ message: 'Unable to load profile' }); }
};

const updateSystemProfile = async (req, res) => {
  if (!['admin', 'security'].includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
  try {
    const update = {};
    for (const field of ['bio', 'location', 'address', 'mobile']) if (req.body[field] !== undefined) update[field] = req.body[field];
    if (req.body.gmail !== undefined) update.email = req.body.gmail;
    const profile = await SystemProfile.findOneAndUpdate({ role: req.user.role }, { $set: update }, { returnDocument: 'after', runValidators: true });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.json(profile);
  } catch { res.status(400).json({ message: 'Unable to update profile' }); }
};

module.exports = { getResidents, getVehicleDirectory, addResident, updateResident, deleteResident, resendOtp, loginResident, bulkCreateResidents, getResidentById, changeSystemPassword, getSystemProfile, updateSystemProfile };
