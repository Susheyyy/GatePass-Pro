const Visitor = require('../models/Visitor');
const FailedAttempt = require('../models/FailedAttempt');
const Blocklist = require('../models/Blocklist');
const Resident = require('../models/Resident');
const Notification = require('../models/Notification');
const { randomInt } = require('node:crypto');
const { audience, occupancyRoom, bindHost, activeHost } = require('../services/occupancy');
const { publishNotification } = require('../services/notifications');

const safeVisitor = document => {
  const value = document.toObject ? document.toObject() : { ...document };
  delete value.passcode;
  return value;
};
const escaped = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function emitVisitor(req, visitor) {
  const safe = safeVisitor(visitor);
  for (const id of visitor.audienceOccupancyIds || []) req.io?.to(occupancyRoom(id)).emit('visitor_check_status', safe);
  req.io?.to('room_security').emit('visitor_approval_changed', safe);
  req.io?.to('room_admins').emit('visitor_approval_changed', safe);
}
async function notifyVisit(req, visitor, checkedIn) {
  try {
    await publishNotification(req, { recipient: visitor.flatNo, title: checkedIn ? 'Visitor Checked In' : 'Visitor Checked Out', message: `${visitor.name} (${visitor.type}) has ${checkedIn ? 'checked in' : 'checked out'}.`, type: checkedIn ? 'visitor_checkin' : 'visitor_checkout' }, visitor.audienceOccupancyIds || []);
  } catch { console.error('Visitor notification persistence failed'); }
}

const getVisitors = async (req, res) => {
  try {
    const query = {};
    if (req.user.role === 'resident') { query.flatNo = req.user.flatNo; query.audienceOccupancyIds = req.user.occupancyId || '__no_occupancy__'; }
    else if (req.query.flatNo) query.flatNo = String(req.query.flatNo).trim().toUpperCase();
    if (req.query.search) {
      const search = new RegExp(escaped(req.query.search), 'i');
      query.$or = ['name', 'type', 'purpose', 'vehicleNumber'].map(field => ({ [field]: search }));
    }
    const page = Math.max(1, Number.parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number.parseInt(req.query.limit) || 50));
    const [visitors, total] = await Promise.all([Visitor.find(query).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit), Visitor.countDocuments(query)]);
    res.json({ visitors: visitors.map(v => ({ ...safeVisitor(v), isOverdue: v.status === 'Checked In' && Date.now() - new Date(v.checkedInAt).getTime() > 86400000 })), total, page, pages: Math.ceil(total / limit) });
  } catch { res.status(500).json({ message: 'Unable to load visits' }); }
};

const addVisitor = async (req, res) => {
  try {
    const { name, type, mobile, purpose = '', vehicleNumber = '' } = req.body;
    const flatNo = typeof req.body.flatNo === 'string' ? req.body.flatNo.trim().toUpperCase() : '';
    const status = req.body.status || (req.user.role === 'resident' ? 'Approved' : 'Pending');
    const allowed = req.user.role === 'resident' || req.user.role === 'admin' ? ['Pending', 'Approved'] : ['Pending'];
    if (!allowed.includes(status)) return res.status(403).json({ message: 'Register a pending visit or a permitted pre-approval; entry requires pass verification' });
    if (typeof name !== 'string' || name.trim().length < 2 || name.length > 50 || !['Guest', 'Delivery', 'Cab', 'Maintenance', 'Other'].includes(type) || typeof mobile !== 'string' || !/^\d{8,15}$/.test(mobile) || !/^[A-Z]+-\d+$/.test(flatNo) || typeof purpose !== 'string' || purpose.length > 100 || typeof vehicleNumber !== 'string' || vehicleNumber.length > 15) return res.status(400).json({ message: 'Provide valid visitor details and destination flat' });
    if (req.user.role === 'resident' && flatNo !== req.user.flatNo) return res.status(403).json({ message: 'You can only create visits for your own flat' });
    const host = await bindHost(flatNo, req.body.hostResidentId, req.user);
    const audienceOccupancyIds = await audience(flatNo);
    if (await Blocklist.exists({ mobile })) return res.status(403).json({ message: 'This visitor is blocked' });
    const passcode = randomInt(100000, 1000000).toString();
    const visitor = await Visitor.create({ name: name.trim(), type, mobile, flatNo, purpose, vehicleNumber, status, passcode, hostResidentId: host._id, hostOccupancyId: host.occupancyId, audienceOccupancyIds, ...(req.user.role === 'resident' && status === 'Approved' ? { approvedBy: req.user.residentId } : {}) });
    emitVisitor(req, visitor);

    res.status(201).json({ ...safeVisitor(visitor), passcode });
  } catch (error) { res.status(400).json({ message: error.message === 'Choose the host resident for this visit' || error.message === 'An active, activated host is required' ? error.message : 'Unable to register visitor' }); }
};

const updateVisitor = async (req, res) => {
  try {
    const { status } = req.body;
    const role = req.user.role;
    let previous;
    if (['Approved', 'Rejected'].includes(status) && ['resident', 'admin'].includes(role)) previous = 'Pending';
    else if (status === 'Checked Out' && ['security', 'admin'].includes(role)) previous = 'Checked In';
    else return res.status(403).json({ message: 'Transition not permitted. Check-in requires passcode verification.' });
    const filter = { _id: req.params.id, status: previous };
    if (role === 'resident') { filter.flatNo = req.user.flatNo; filter.audienceOccupancyIds = req.user.occupancyId || '__no_occupancy__'; }
    if (status === 'Approved') {
      const pending = await Visitor.findOne(filter);
      if (!pending || !await activeHost(pending)) return res.status(409).json({ message: 'The host is no longer active. Register a new visit.' });
    }
    const update = { status };
    if (role === 'resident') update.approvedBy = req.user.residentId;
    if (status === 'Checked Out') update.checkedOutAt = new Date();
    const visitor = await Visitor.findOneAndUpdate(filter, { $set: update }, { returnDocument: 'after', runValidators: true });
    if (!visitor) return res.status(409).json({ message: 'Visit changed or this transition is no longer allowed. Refresh the list.' });
    emitVisitor(req, visitor);
    if (status === 'Checked Out') await notifyVisit(req, visitor, false);
    res.json(safeVisitor(visitor));
  } catch { res.status(400).json({ message: 'Invalid visitor update' }); }
};

const deleteVisitor = async (req, res) => {
  try {
    const filter = { _id: req.params.id, status: { $in: ['Pending', 'Rejected'] } };
    if (req.user.role === 'resident') { filter.flatNo = req.user.flatNo; filter.audienceOccupancyIds = req.user.occupancyId || '__no_occupancy__'; }
    const deleted = await Visitor.findOneAndDelete(filter);
    if (!deleted) return res.status(409).json({ message: 'Only pending or rejected visits can be removed' });
    res.json({ message: 'Visitor removed' });
  } catch { res.status(400).json({ message: 'Invalid visitor identifier' }); }
};

async function recordFailure(flatNo) {
  const now = new Date();
  const expired = { $and: [{ $ne: [{ $ifNull: ['$lockedUntil', null] }, null] }, { $lte: ['$lockedUntil', now] }] };
  const active = { $gt: ['$lockedUntil', now] };
  const pipeline = [
    { $set: { flatNo, count: { $cond: [active, '$count', { $add: [{ $cond: [expired, 0, { $ifNull: ['$count', 0] }] }, 1] }] }, lockedUntil: { $cond: [expired, null, { $ifNull: ['$lockedUntil', null] }] } } },
    { $set: { lockedUntil: { $cond: [{ $gte: ['$count', 3] }, { $ifNull: ['$lockedUntil', new Date(now.getTime() + 900000)] }, null] } } }
  ];
  try {
    return await FailedAttempt.findOneAndUpdate({ flatNo }, pipeline, { upsert: true, returnDocument: 'after', updatePipeline: true });
  } catch (error) {
    if (error.code !== 11000) throw error;

    return FailedAttempt.findOneAndUpdate({ flatNo }, pipeline, { returnDocument: 'after', updatePipeline: true });
  }
}

const verifyPasscode = async (req, res) => {
  if (!['admin', 'security'].includes(req.user.role)) return res.status(403).json({ message: 'Only gate staff can admit visitors' });
  const { passcode } = req.body;
  const flatNo = typeof req.body.flatNo === 'string' ? req.body.flatNo.trim().toUpperCase() : '';
  if (!/^[A-Z]+-\d+$/.test(flatNo) || typeof passcode !== 'string' || !/^\d{6}$/.test(passcode)) return res.status(400).json({ message: 'Enter a valid flat and 6-digit passcode' });
  try {
    const attempts = await FailedAttempt.findOne({ flatNo });
    if (attempts?.lockedUntil > new Date()) return res.status(429).json({ message: 'This flat is locked for 15 minutes after repeated invalid attempts' });
    const cutoff = new Date(Date.now() - 86400000);
    const candidates = await Visitor.find({ flatNo, status: 'Approved', createdAt: { $gt: cutoff } }).select('+passcode');
    let matched;
    for (const candidate of candidates) if (await candidate.matchPasscode(passcode)) { matched = candidate; break; }
    if (!matched) {
      const failure = await recordFailure(flatNo);
      return res.status(failure.count >= 3 ? 429 : 400).json({ message: failure.count >= 3 ? 'Too many invalid attempts. Flat locked for 15 minutes.' : 'Invalid, unapproved, expired or already used passcode' });
    }
    if (!await activeHost(matched)) return res.status(403).json({ message: 'The host membership is no longer active. This pass cannot be used.' });
    if (await Blocklist.exists({ mobile: matched.mobile })) return res.status(403).json({ message: 'This visitor is blocked' });
    if (await FailedAttempt.exists({ flatNo, lockedUntil: { $gt: new Date() } })) return res.status(429).json({ message: 'This flat is locked for 15 minutes' });
    const visitor = await Visitor.findOneAndUpdate({ _id: matched._id, hostResidentId: matched.hostResidentId, hostOccupancyId: matched.hostOccupancyId, revokedAt: null, status: 'Approved', createdAt: { $gt: new Date(Date.now() - 86400000) } }, { $set: { status: 'Checked In', checkedInAt: new Date() } }, { returnDocument: 'after' });
    if (!visitor) return res.status(409).json({ message: 'Passcode already used or expired. Refresh the list.' });

    if (attempts) {
      try { await FailedAttempt.updateOne({ _id: attempts._id, count: attempts.count, updatedAt: attempts.updatedAt }, { $set: { count: 0, lockedUntil: null } }); }
      catch { console.error('Admission saved; failed-attempt cleanup will be retried by a later verification'); }
    }
    emitVisitor(req, visitor);
    await notifyVisit(req, visitor, true);
    res.json(safeVisitor(visitor));
  } catch { res.status(500).json({ message: 'Unable to verify entry. No local entry has been recorded.' }); }
};

const csvCell = value => '"' + String(value ?? '').replace(/^[=+@\-]/, "'$&").replace(/"/g, '""') + '"';
const exportVisitorsCSV = async (req, res) => {
  try {
    const visitors = await Visitor.find({}).sort({ createdAt: -1, _id: -1 });
    const fields = ['name', 'type', 'mobile', 'flatNo', 'status', 'purpose', 'vehicleNumber', 'checkedInAt', 'checkedOutAt', 'createdAt'];
    const csv = [fields.join(','), ...visitors.map(v => fields.map(field => csvCell(v[field])).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=visitors_log.csv');
    res.send(csv);
  } catch { res.status(500).json({ message: 'Unable to export visitors' }); }
};
const addBlocklist = async (req, res) => {
  if (typeof req.body.mobile !== 'string' || !/^\d{8,15}$/.test(req.body.mobile) || (req.body.reason && (typeof req.body.reason !== 'string' || req.body.reason.length > 200))) return res.status(400).json({ message: 'Invalid mobile or reason' });
  try { res.status(201).json(await Blocklist.create({ mobile: req.body.mobile, reason: req.body.reason })); }
  catch { res.status(400).json({ message: 'Unable to block visitor' }); }
};
const getBlocklist = async (req, res) => {
  try { res.json(await Blocklist.find({}).sort({ createdAt: -1, _id: -1 })); }
  catch { res.status(500).json({ message: 'Unable to load blocklist' }); }
};
const removeBlocklist = async (req, res) => {
  try { await Blocklist.deleteOne({ mobile: req.params.mobile }); res.json({ message: 'Visitor removed from blocklist' }); }
  catch { res.status(500).json({ message: 'Unable to update blocklist' }); }
};
module.exports = { getVisitors, addVisitor, updateVisitor, deleteVisitor, verifyPasscode, exportVisitorsCSV, addBlocklist, getBlocklist, removeBlocklist };
