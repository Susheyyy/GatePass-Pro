const Resident = require('../models/Resident');
const Visitor = require('../models/Visitor');

const jwt = require('jsonwebtoken');

const protectRoute = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret';

    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    req.user = {
      role: decoded.role,
      email: decoded.email,
      residentId: decoded.residentId,
      flatNo: decoded.flatNo
    };

    if (decoded.role === 'admin' || decoded.role === 'security') {
      return next();
    }

    const resident = await Resident.findOne({ email: decoded.email });
    if (!resident) {
      return res.status(401).json({ message: 'Resident account not found' });
    }

    req.user.flatNo = resident.flatNo;
    req.user.residentId = resident._id;
    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const authorizeVisitorAccess = async (req, res, next) => {
  try {
    if (req.user.role === 'admin' || req.user.role === 'security') {
      return next();
    }

    // Residents should only be allowed to fetch visitors for their own flatNo.
    if (req.method === 'GET') {
      req.query.flatNo = req.user.flatNo;
      return next();
    }

    // Residents should only be allowed to create visitors for their own flatNo.
    if (req.method === 'POST') {
      if (req.body.flatNo !== req.user.flatNo) {
        return res.status(403).json({ message: 'Forbidden: You can only create visitor logs for your own flat.' });
      }
      return next();
    }

    // Resident must own the visitor log (the visitor's flatNo must match resident's flatNo).
    if (req.params.id) {
      const visitor = await Visitor.findById(req.params.id);
      if (!visitor) {
        return res.status(404).json({ message: 'Visitor log not found' });
      }
      if (visitor.flatNo !== req.user.flatNo) {
        return res.status(403).json({ message: 'Forbidden: You cannot modify or delete visitor logs of other flats.' });
      }
    }
    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const restrictToRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to perform this action' });
    }
    next();
  };
};

const authorizeResidentAccess = async (req, res, next) => {
  try {
    if (req.user.role === 'admin') {
      return next();
    }
    if (req.params.id && req.params.id !== req.user.residentId.toString()) {
      return res.status(403).json({ message: 'Forbidden: You cannot modify another resident\'s profile' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  protectRoute,
  authorizeVisitorAccess,
  restrictToRoles,
  authorizeResidentAccess
};
