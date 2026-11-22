const Resident = require('../models/Resident');
const SystemCredential = require('../models/SystemCredential');
const Session = require('../models/Session');
const Visitor = require('../models/Visitor');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/security');
const { actorKey } = require('../services/sessions');

async function authenticate(token) {
  const decoded = jwt.verify(token, jwtSecret(), { algorithms: ['HS256'] });
  if (!['admin', 'security', 'resident'].includes(decoded.role) || typeof decoded.sid !== 'string' || !Number.isFinite(decoded.exp)) throw new Error('Invalid session');
  const session = await Session.findById(decoded.sid);
  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.role !== decoded.role || session.tokenVersion !== decoded.tokenVersion) throw new Error('Revoked session');
  let user;
  if (decoded.role === 'resident') {
    const resident = await Resident.findById(decoded.residentId);
    if (!resident || resident.deletedAt || resident.status !== 'Approved' || resident.isFirstLogin || !resident.occupancyId || decoded.tokenVersion !== (resident.tokenVersion || 0) || session.occupancyId !== resident.occupancyId) throw new Error('Inactive or revoked account');
    user = { role: 'resident', actorId: String(resident._id), name: resident.name, email: resident.email, residentId: resident._id, flatNo: resident.flatNo, occupancyId: resident.occupancyId, occupancyStartedAt: resident.occupancyStartedAt };
  } else {
    const credential = await SystemCredential.findOne({ role: decoded.role });
    if (!credential || decoded.tokenVersion !== (credential.tokenVersion || 0)) throw new Error('Revoked account');
    user = { role: decoded.role, actorId: String(credential._id), email: `${decoded.role}@gatepass.com` };
  }
  if (session.actorKey !== actorKey(user.role, user.actorId)) throw new Error('Session identity mismatch');
  return { ...user, sessionId: decoded.sid, expiresAt: session.expiresAt };
}

const protectRoute = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'Authentication required' });
  try {
    req.user = await authenticate(header.slice(7));
    next();
  } catch (error) {
    if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError') return res.status(503).json({ message: 'Authentication service unavailable' });
    res.status(401).json({ message: 'Invalid, expired or revoked session. Please sign in again.' });
  }
};

const optionalAuthentication = (req, res, next) => req.headers.authorization ? protectRoute(req, res, next) : next();
const restrictToRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden: You do not have permission to perform this action' });
  next();
};
const authorizeResidentAccess = (req, res, next) => {
  if (req.user.role === 'admin' || (req.user.role === 'resident' && req.params.id === String(req.user.residentId))) return next();
  return res.status(403).json({ message: 'Forbidden: You cannot access another resident profile' });
};
const authorizeVisitorAccess = async (req, res, next) => {
  if (req.user.role !== 'resident' || req.method === 'GET') return next();
  if (req.method === 'POST') {
    if (typeof req.body.flatNo !== 'string' || req.body.flatNo.trim().toUpperCase() !== req.user.flatNo) return res.status(403).json({ message: 'You can only create visits for your own flat' });
    return next();
  }
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ message: 'Visitor not found' });
    if (visitor.flatNo !== req.user.flatNo || !visitor.audienceOccupancyIds?.includes(req.user.occupancyId)) return res.status(403).json({ message: 'This visit does not belong to your current occupancy' });
    next();
  } catch { res.status(400).json({ message: 'Invalid visitor identifier' }); }
};
module.exports = { authenticate, protectRoute, optionalAuthentication, restrictToRoles, authorizeResidentAccess, authorizeVisitorAccess };
