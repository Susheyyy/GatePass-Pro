const { randomBytes, randomUUID } = require('node:crypto');
const bcrypt = require('bcryptjs');
const Resident = require('../models/Resident');
const SystemCredential = require('../models/SystemCredential');
const SystemProfile = require('../models/SystemProfile');
const Notification = require('../models/Notification');
const { validPassword, publicResident, residentFields } = require('../config/security');
const { sendChallenge } = require('./passwordController');
const Household = require('../models/Household');
const { residentInput } = require('../services/residentValidation');
const { householdFor, revokePasses, audience, occupancyRoom, activeResidents } = require('../services/occupancy');
const { createSession, revokeActor } = require('../services/sessions');
const { publishNotification } = require('../services/notifications');

const pageOptions = query => ({ page: Math.max(1, Number.parseInt(query.page) || 1), limit: Math.min(200, Math.max(1, Number.parseInt(query.limit) || 50)) });
const escaped = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getResidents = async (req, res) => {
  try {
    const query = req.user.role === 'resident' ? { flatNo: req.user.flatNo, deletedAt: null } : { deletedAt: null };
    if (req.query.search) {
      const search = new RegExp(escaped(req.query.search), 'i');
      query.$or = [{ name: search }, { flatNo: search }, { vehicles: search }];
    }
    const { page, limit } = pageOptions(req.query);
    const [residents, total] = await Promise.all([
      Resident.find(query).select(residentFields).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit),
      Resident.countDocuments(query)
    ]);

    const householdRows = await Household.find({ flatNo: { $in: residents.map(r => r.flatNo) } });
    const sizes = new Map(householdRows.map(h => [h.flatNo, h.members]));
    const result = residents.map(r => req.user.role === 'resident' && String(r._id) !== String(req.user.residentId)
      ? { _id: r._id, name: r.name, flatNo: r.flatNo, status: r.status, vehicles: r.vehicles }
      : { ...publicResident(r), members: sizes.get(r.flatNo) || r.members });
    res.json({ residents: result, total, page, pages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ message: 'Unable to load residents' });
  }
};

const getVehicleDirectory = async (req, res) => {
  try {
    const projection = req.user.role === 'resident' ? '_id name flatNo vehicles' : '_id name flatNo vehicles mobile';
    const residents = await Resident.find({ status: 'Approved', deletedAt: null, 'vehicles.0': { $exists: true } }).select(projection).limit(1000);
    res.json(residents);
  } catch {
    res.status(500).json({ message: 'Unable to load vehicle directory' });
  }
};

const registrationData = body => residentInput(body);

async function createResident(data, approved) {
  if (await Resident.exists({ gmail: data.gmail, deletedAt: null })) throw new Error('A resident with this email already exists');
  const email = `${data.name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '')}.${data.flatNo.toLowerCase().replace('-', '')}.${randomBytes(3).toString('hex')}@gatepass.com`;
  const resident = await Resident.create({ ...data, email, password: randomBytes(32).toString('hex'), status: approved ? 'Approved' : 'Pending', isFirstLogin: true, communityId: randomBytes(10).toString('hex'), occupancyId: randomUUID(), occupancyStartedAt: new Date(), address: `Flat ${data.flatNo}, GatePass Residency` });
  if (approved) {
    await householdFor(resident, false, true);
    try { await sendChallenge(resident, 'activate'); } catch {                                                               }
  }
  return resident;
}

const addResident = async (req, res) => {
  try {
    const data = registrationData(req.body);
    let coResident = false;
    if (req.body.isResidentAdding) {
      if (!req.user || req.user.role !== 'resident' || req.user.flatNo !== data.flatNo) return res.status(403).json({ message: 'You can only add members to your own flat' });
      coResident = true;
    } else if (req.user && req.user.role !== 'admin') return res.status(403).json({ message: 'Use household invitations to add a resident' });
    const resident = await createResident(data, coResident);
    try {
      await publishNotification(req, { recipient: 'admin', title: 'Resident registration', message: `${resident.name} registered for ${resident.flatNo}.`, type: 'admin_broadcast' });
    } catch { console.error('Registration notification persistence failed'); }
    res.status(201).json(publicResident(resident));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateResident = async (req, res) => {
  try {
    const body = req.body || {};
    const validated = residentInput(body, true);
    if (body.password !== undefined || body.otp !== undefined) return res.status(400).json({ message: 'Use the dedicated activation or password reset endpoint' });
    const resident = await Resident.findById(req.params.id).select('+password');
    if (!resident || resident.deletedAt) return res.status(404).json({ message: 'Resident not found' });
    if (req.user.role !== 'admin' && ((body.flatNo !== undefined && body.flatNo !== resident.flatNo) || (body.status !== undefined && body.status !== resident.status))) return res.status(403).json({ message: 'Only administrators can change flat assignment or approval status' });
    if (body.currentPassword !== undefined || body.newPassword !== undefined) {
      if (typeof body.currentPassword !== 'string' || !validPassword(body.newPassword)) return res.status(400).json({ message: 'New password must contain 12 to 72 UTF-8 bytes' });
      if (!resident.password || !await bcrypt.compare(body.currentPassword, resident.password)) return res.status(400).json({ message: 'Incorrect current password' });

      const updated = await Resident.findOneAndUpdate({ _id: resident._id, password: resident.password }, { $set: { password: await bcrypt.hash(body.newPassword, 12) }, $inc: { tokenVersion: 1, __v: 1 }, $unset: { otp: 1, otpPurpose: 1, otpExpiresAt: 1 } }, { returnDocument: 'after' });
      if (!updated) return res.status(409).json({ message: 'Password changed concurrently. Please sign in again.' });
      await revokeActor('resident', resident._id, req.io);
      return res.json(publicResident(updated));
    }
    const wasPending = resident.status !== 'Approved';
    const oldFlat = resident.flatNo;
    const oldOccupancy = resident.occupancyId;
    const oldDistressStatus = resident.distressStatus;
    const lifecycleChanged = (validated.flatNo !== undefined && validated.flatNo !== oldFlat) || (body.status !== undefined && body.status !== resident.status);
    if (validated.members !== undefined && req.user.role !== 'admin' && validated.members !== resident.members) return res.status(403).json({ message: 'Only administrators can change household size' });
    if (lifecycleChanged) {
      resident.tokenVersion = (resident.tokenVersion || 0) + 1;
      resident.occupancyId = randomUUID();
      resident.occupancyStartedAt = new Date();
      resident.otp = undefined;
      resident.otpPurpose = undefined;
      resident.otpExpiresAt = undefined;
    }
    Object.assign(resident, validated);
    if (body.status !== undefined) resident.status = body.status;
    if (body.distressStatus !== undefined) {
      if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only administrators can resolve alerts' });
      resident.distressStatus = body.distressStatus;
    }
    if (body.clearDistress) return res.status(403).json({ message: 'Emergency history cannot be erased through profile edits' });
    if (body.distressMessage) {
      if (typeof body.distressMessage !== 'string' || body.distressMessage.length > 1000) return res.status(400).json({ message: 'Alert message must be at most 1000 characters' });
      const sender = req.user.role === 'admin' ? 'admin' : 'resident';
      resident.distressMessages.push({ message: body.distressMessage, sender });
      if (sender === 'resident') resident.distressStatus = 'Active';

    }
    await resident.save();
    if (lifecycleChanged) {
      await revokeActor('resident', resident._id, req.io);
      try { await revokePasses(resident._id, oldOccupancy); } catch { console.error('Pass revocation cleanup failed; host validation remains authoritative'); }
    }
    if (resident.status === 'Approved') await householdFor(resident, req.user.role === 'admin' && validated.members !== undefined, lifecycleChanged);
    if (body.distressMessage) {
      try {
        await publishNotification(req, { recipient: req.user.role === 'admin' ? resident.flatNo : 'admin', title: req.user.role === 'admin' ? 'New Distress Response' : 'Distress Alert Received', message: body.distressMessage, type: 'distress_reply' });
      } catch { console.error('Emergency notification delivery failed'); }
    }
    if (resident.status === 'Approved' && wasPending && resident.isFirstLogin) {
      try { await sendChallenge(resident, 'activate'); } catch {                                              }
    }
    if (resident.distressStatus === 'Active' && (oldDistressStatus !== 'Active' || body.distressMessage)) req.io?.to('room_admins').emit('distress_alert', { residentId: resident._id, flatNo: resident.flatNo, name: resident.name, distressStatus: resident.distressStatus, messages: resident.distressMessages });
    else if (oldDistressStatus === 'Active' && resident.distressStatus !== 'Active') req.io?.to('room_admins').emit('distress_resolved', { residentId: resident._id });
    res.json(publicResident(resident));
  } catch (error) {
    res.status(error.name === 'VersionError' ? 409 : 400).json({ message: error.name === 'VersionError' ? 'Resident changed concurrently. Refresh and retry.' : 'Unable to update resident. Check the supplied fields.' });
  }
};

const deleteResident = async (req, res) => {
  try {
    const resident = await Resident.findById(req.params.id);
    if (!resident || resident.deletedAt) return res.status(404).json({ message: 'Resident not found' });
    const oldOccupancy = resident.occupancyId;
    resident.deletedAt = new Date();
    resident.status = 'Rejected';
    resident.tokenVersion = (resident.tokenVersion || 0) + 1;
    resident.occupancyId = randomUUID();
    resident.occupancyStartedAt = new Date();
    resident.otp = undefined;
    resident.otpPurpose = undefined;
    resident.otpExpiresAt = undefined;
    await resident.save();
    await revokeActor('resident', resident._id, req.io);
    try { await revokePasses(resident._id, oldOccupancy); } catch { console.error('Pass revocation cleanup failed; host validation remains authoritative'); }
    if (!resident) return res.status(404).json({ message: 'Resident not found' });
    res.json({ message: 'Resident removed successfully' });
  } catch { res.status(400).json({ message: 'Invalid resident identifier' }); }
};

const resendOtp = async (req, res) => {
  try {
    const resident = await Resident.findById(req.params.id);
    if (!resident || resident.deletedAt || !resident.occupancyId || resident.status !== 'Approved' || !resident.isFirstLogin) return res.status(400).json({ message: 'No pending activation for this account' });
    await sendChallenge(resident, 'activate');
    res.json({ message: 'Activation requested. An existing unexpired code remains valid.' });
  } catch { res.status(503).json({ message: 'Unable to deliver verification email' }); }
};

const loginResident = async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || email.length > 254 || Buffer.byteLength(password) > 72) return res.status(400).json({ message: 'Email and password are required' });
  const formattedEmail = email.trim().toLowerCase();
  try {
    const role = formattedEmail === 'admin@gatepass.com' ? 'admin' : formattedEmail === 'security@gatepass.com' ? 'security' : 'resident';
    if (role !== 'resident') {
      const credential = await SystemCredential.findOne({ role });

      if (['admin123', 'security123'].includes(password) || !credential || !await bcrypt.compare(password, credential.password)) return res.status(401).json({ message: 'Invalid email or password' });
      const token = await createSession({ role, email: formattedEmail }, credential._id, credential.tokenVersion);
      return res.json({ token, role, email: formattedEmail });
    }
    const resident = await Resident.findOne({ deletedAt: null, $or: [{ email: formattedEmail }, { gmail: formattedEmail }] }).select('+password');
    if (!resident || resident.status !== 'Approved' || resident.isFirstLogin || !resident.password || !await bcrypt.compare(password, resident.password)) return res.status(401).json({ message: 'Invalid credentials or inactive account. New residents must activate their account first.' });
    const token = await createSession({ role, email: resident.email, residentId: resident._id, flatNo: resident.flatNo, occupancyId: resident.occupancyId }, resident._id, resident.tokenVersion);
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
    if (!resident || resident.deletedAt) return res.status(404).json({ message: 'Resident not found' });
    const household = await Household.findOne({ flatNo: resident.flatNo });
    res.json({ ...publicResident(resident), members: household?.members || resident.members });
  } catch { res.status(400).json({ message: 'Invalid resident identifier' }); }
};

const changeSystemPassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!['admin', 'security'].includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
  if (typeof currentPassword !== 'string' || !validPassword(newPassword)) return res.status(400).json({ message: 'New password must contain 12 to 72 UTF-8 bytes' });
  try {
    const credential = await SystemCredential.findOne({ role: req.user.role });
    if (!credential || !await bcrypt.compare(currentPassword, credential.password)) return res.status(400).json({ message: 'Incorrect current password' });
    const updated = await SystemCredential.findOneAndUpdate({ _id: credential._id, password: credential.password }, { $set: { password: await bcrypt.hash(newPassword, 12) }, $inc: { tokenVersion: 1 } });
    if (!updated) return res.status(409).json({ message: 'Password changed concurrently' });
    await revokeActor(req.user.role, credential._id, req.io);
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

const getHosts = async (req, res) => {
  if (typeof req.query.flatNo !== 'string') return res.status(400).json({ message: 'Flat number is required' });
  const data = await Resident.find(activeResidents(req.query.flatNo.trim().toUpperCase())).select('_id name flatNo').sort({ name: 1 }).limit(100);
  res.json(data);
};

const getHouseholdStats = async (req, res) => {
  const units = await Resident.aggregate([{ $match: { status: 'Approved', deletedAt: null } }, { $group: { _id: '$flatNo', registered: { $sum: 1 } } }]);
  const sizes = await Household.find({ flatNo: { $in: units.map(u => u._id) } });
  const members = new Map(sizes.map(h => [h.flatNo, h.members]));
  const totalMembers = units.reduce((total, unit) => total + Math.max(unit.registered, members.get(unit._id) || 0), 0);
  const totalResidents = await Resident.countDocuments({ deletedAt: null });
  res.json({ totalResidents, totalMembers, occupiedUnits: units.length });
};

module.exports = { getHosts, getHouseholdStats, getResidents, getVehicleDirectory, addResident, updateResident, deleteResident, resendOtp, loginResident, bulkCreateResidents, getResidentById, changeSystemPassword, getSystemProfile, updateSystemProfile };
