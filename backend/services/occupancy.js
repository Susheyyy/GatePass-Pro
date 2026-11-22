const { randomUUID } = require('node:crypto');
const Resident = require('../models/Resident');
const Visitor = require('../models/Visitor');
const Household = require('../models/Household');

const occupancyRoom = id => `occupancy:${id}`;
const activeResidents = flatNo => ({ flatNo, status: 'Approved', isFirstLogin: false, deletedAt: null });

async function audience(flatNo) {
  const filter = { status: 'Approved', isFirstLogin: false, deletedAt: null, occupancyId: { $type: 'string' } };
  if (flatNo) filter.flatNo = flatNo;
  const residents = await Resident.find(filter).select('occupancyId');
  return residents.map(r => r.occupancyId).filter(Boolean);
}

async function bindHost(flatNo, requestedId, user) {
  const filter = activeResidents(flatNo);
  if (user.role === 'resident') filter._id = user.residentId;
  else if (requestedId) filter._id = requestedId;
  const hosts = await Resident.find(filter).select('_id flatNo occupancyId').limit(2);
  if (hosts.length !== 1 || !hosts[0].occupancyId) throw new Error(hosts.length > 1 ? 'Choose the host resident for this visit' : 'An active, activated host is required');
  return hosts[0];
}

async function activeHost(visit) {
  if (!visit.hostResidentId || !visit.hostOccupancyId) return false;
  return Boolean(await Resident.exists({ ...activeResidents(visit.flatNo), _id: visit.hostResidentId, occupancyId: visit.hostOccupancyId }));
}

async function revokePasses(id, occupancyId) {
  await Visitor.updateMany({ hostResidentId: id, hostOccupancyId: occupancyId, status: { $in: ['Pending', 'Approved'] } }, { $set: { status: 'Rejected', revokedAt: new Date() } });
}

async function householdFor(resident, update = false, newOccupancy = false) {
  const others = await Resident.exists({ flatNo: resident.flatNo, _id: { $ne: resident._id }, status: 'Approved', deletedAt: null });
  const members = resident.members || 1;
  return Household.findOneAndUpdate({ flatNo: resident.flatNo }, update || (newOccupancy && !others) ? { $set: { members } } : { $setOnInsert: { members } }, { upsert: true, returnDocument: 'after', runValidators: true });
}

async function backfillOccupancies() {
  for await (const resident of Resident.find({ occupancyId: { $exists: false }, deletedAt: null }).select('_id')) {
    await Resident.updateOne({ _id: resident._id, occupancyId: { $exists: false } }, { $set: { occupancyId: randomUUID(), occupancyStartedAt: new Date() }, $inc: { tokenVersion: 1 } });
  }
  const households = await Resident.aggregate([{ $match: { status: 'Approved', deletedAt: null } }, { $group: { _id: '$flatNo', members: { $max: '$members' } } }]);
  for (const household of households) await Household.updateOne({ flatNo: household._id }, { $setOnInsert: { members: household.members || 1 } }, { upsert: true, runValidators: true });
}

module.exports = { occupancyRoom, activeResidents, audience, bindHost, activeHost, revokePasses, householdFor, backfillOccupancies };
