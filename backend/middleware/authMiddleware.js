const Resident = require('../models/Resident');
const SystemCredential = require('../models/SystemCredential');
const Visitor = require('../models/Visitor');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/security');

async function authenticate(token) {
  const decoded = jwt.verify(token, jwtSecret(), { algorithms: ['HS256'] });
  if (!['admin', 'security', 'resident'].includes(decoded.role)) throw new Error('Invalid role');
  if (decoded.role === 'resident') {
    const resident = await Resident.findById(decoded.residentId);
    if (!resident || resident.status !== 'Approved' || resident.isFirstLogin || decoded.tokenVersion !== (resident.tokenVersion || 0)) throw new Error('Inactive or revoked account');
    return { role: 'resident', email: resident.email, residentId: resident._id, flatNo: resident.flatNo };
  }
  const credential = await SystemCredential.findOne({ role: decoded.role });
  if (!credential || decoded.tokenVersion !== (credential.tokenVersion || 0)) throw new Error('Revoked account');
  return { role: decoded.role, email: decoded.email };
}

const protectRoute = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'Authentication required' });
  try {
    req.user = await authenticate(header.slice(7));
    next();
  } catch {
    res.status(401).json({ message: 'Invalid, expired or revoked session. Please sign in again.' });
  }
};

const restrictToRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden: You do not have permission to perform this action' });
  next();
};

const authorizeResidentAccess = (req, res, next) => {
  if (req.user.role === 'admin' || (req.user.role === 'resident' && req.params.id === String(req.user.residentId))) return next();
  return res.status(403).json({ message: 'Forbidden: You cannot access another resident profile' });
};

const authorizeVisitorAccess = async (req, res, next) => {
  if (req.user.role !== 'resident') return next();
  // Express 5 query is a getter; enforce read scope in the controller.
  if (req.method === 'GET') return next();
  if (req.method === 'POST') {
    if (typeof req.body.flatNo !== 'string' || req.body.flatNo.trim().toUpperCase() !== req.user.flatNo) return res.status(403).json({ message: 'You can only create visits for your own flat' });
    return next();
  }
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ message: 'Visitor not found' });
    if (visitor.flatNo !== req.user.flatNo) return res.status(403).json({ message: 'You can only modify visits for your own flat' });
    next();
  } catch {
    res.status(400).json({ message: 'Invalid visitor identifier' });
  }
};

module.exports = { authenticate, protectRoute, restrictToRoles, authorizeResidentAccess, authorizeVisitorAccess };
