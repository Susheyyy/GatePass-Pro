const Visitor = require('../models/Visitor');
const FailedAttempt = require('../models/FailedAttempt');

const getVisitors = async (req, res) => {
  try {
    const { flatNo, search, page = 1, limit = 50 } = req.query;
    let query = {};
    if (flatNo) {
      query.flatNo = flatNo;
    }
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: searchRegex },
        { type: searchRegex },
        { purpose: searchRegex },
        { vehicleNumber: searchRegex },
        { passcode: searchRegex }
      ];
    }
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;
    const [visitors, total] = await Promise.all([
      Visitor.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Visitor.countDocuments(query)
    ]);
    const visitorsWithOverdue = visitors.map(v => {
      const vObj = v.toObject();
      vObj.isOverdue = v.status === 'Checked In' && v.checkedInAt && (Date.now() - new Date(v.checkedInAt).getTime() > 24 * 60 * 60 * 1000);
      return vObj;
    });
    res.status(200).json({
      visitors: visitorsWithOverdue,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addVisitor = async (req, res) => {
  try {
    const { name, type, mobile, flatNo, status, purpose, vehicleNumber } = req.body;
    if (!name || !type || !flatNo) {
      return res.status(400).json({ message: 'Name, type, and flat number are required' });
    }

    const SystemSetting = require('../models/SystemSetting');
    const isLockdown = await SystemSetting.findOne({ key: 'lockdown' });
    if (isLockdown && isLockdown.value === true) {
      return res.status(403).json({ message: 'Emergency Lockdown Active: All entry permits suspended.' });
    }

    const Blocklist = require('../models/Blocklist');
    const isBlocked = await Blocklist.findOne({ mobile });
    if (isBlocked) {
      return res.status(400).json({ message: `Visitor mobile ${mobile} is blacklisted: ${isBlocked.reason || 'Security Alert'}` });
    }

    if (/[<>]/.test(name) || (vehicleNumber && /[<>]/.test(vehicleNumber)) || (purpose && /[<>]/ .test(purpose))) {
      return res.status(400).json({ message: 'Input contains invalid HTML characters.' });
    }
    if (name.length < 2 || name.length > 50) {
      return res.status(400).json({ message: 'Visitor name must be between 2 and 50 characters.' });
    }
    if (!['Guest', 'Delivery', 'Cab', 'Maintenance', 'Other'].includes(type)) {
      return res.status(400).json({ message: 'Invalid visitor type.' });
    }
    if (!/^\d{8,15}$/.test(mobile)) {
      return res.status(400).json({ message: 'Mobile number must contain 8 to 15 digits.' });
    }
    if (!/^[a-zA-Z]+-\d+$/.test(flatNo.trim())) {
      return res.status(400).json({ message: 'Flat number must be in Alphabet-number format (e.g. A-102).' });
    }
    if (vehicleNumber && vehicleNumber.length > 15) {
      return res.status(400).json({ message: 'Vehicle number must be under 15 characters.' });
    }
    if (purpose && purpose.length > 100) {
      return res.status(400).json({ message: 'Purpose description must be under 100 characters.' });
    }
    const generatedPasscode = Math.floor(100000 + Math.random() * 900000).toString();
    const visitor = await Visitor.create({
      name,
      type,
      mobile,
      flatNo,
      passcode: generatedPasscode,
      status: status || 'Pending',
      purpose,
      vehicleNumber
    });

    if (req.io) {
      const roomFlat = `room_flat_${flatNo.toUpperCase().trim()}`;
      req.io.to(roomFlat).emit('visitor_check_status', visitor);
      req.io.to('room_security').emit('visitor_approval_changed', visitor);
      req.io.to('room_admins').emit('visitor_approval_changed', visitor);
    }

    res.status(201).json(visitor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateVisitor = async (req, res) => {
  try {
    const { status } = req.body;
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) {
      return res.status(404).json({ message: 'Visitor not found' });
    }
    if (status) {
      visitor.status = status;
      if (status === 'Approved' || status === 'Rejected') {
        if (req.user.role === 'resident') {
          visitor.approvedBy = req.user.residentId;
        }
      }
      if (status === 'Checked In') {
        visitor.checkedInAt = new Date();
        try {
          const Notification = require('../models/Notification');
          const newNotif = await Notification.create({
            recipient: visitor.flatNo,
            title: 'Visitor Checked In',
            message: `${visitor.name} (${visitor.type}) has checked in to your flat.`,
            type: 'visitor_checkin'
          });
          if (req.io) {
            req.io.to(`room_flat_${visitor.flatNo.toUpperCase().trim()}`).emit('new_notification', newNotif);
          }
        } catch (err) {
        }
      } else if (status === 'Checked Out') {
        visitor.checkedOutAt = new Date();
        try {
          const Notification = require('../models/Notification');
          const newNotif = await Notification.create({
            recipient: visitor.flatNo,
            title: 'Visitor Checked Out',
            message: `${visitor.name} (${visitor.type}) has checked out from your flat.`,
            type: 'visitor_checkout'
          });
          if (req.io) {
            req.io.to(`room_flat_${visitor.flatNo.toUpperCase().trim()}`).emit('new_notification', newNotif);
          }
        } catch (err) {
        }
      }
    }
    const updatedVisitor = await visitor.save();

    if (req.io) {
      const roomFlat = `room_flat_${visitor.flatNo.toUpperCase().trim()}`;
      req.io.to(roomFlat).emit('visitor_check_status', updatedVisitor);
      req.io.to('room_security').emit('visitor_approval_changed', updatedVisitor);
      req.io.to('room_admins').emit('visitor_approval_changed', updatedVisitor);
    }

    res.status(200).json(updatedVisitor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteVisitor = async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) {
      return res.status(404).json({ message: 'Visitor not found' });
    }
    if (['Approved', 'Checked In', 'Checked Out'].includes(visitor.status)) {
      return res.status(400).json({ message: 'Approved or checked-in/out visitor records cannot be removed' });
    }
    await visitor.deleteOne();
    res.status(200).json({ message: 'Visitor removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const verifyPasscode = async (req, res) => {
  try {
    const { flatNo, passcode } = req.body;
    if (!flatNo || !passcode) {
      return res.status(400).json({ message: 'Flat number and passcode are required' });
    }

    const flatKey = flatNo.trim().toUpperCase();
    const attempts = await FailedAttempt.findOne({ flatNo: flatKey }) || { count: 0, lockedUntil: null };

    if (attempts.lockedUntil && attempts.lockedUntil > new Date()) {
      const remainingTime = Math.ceil((attempts.lockedUntil - new Date()) / 1000 / 60);
      return res.status(403).json({ message: `Flat ${flatNo} is locked out. Try again in ${remainingTime} minutes.` });
    }

    const visitors = await Visitor.find({ flatNo: new RegExp(`^${flatKey}$`, 'i') });
    let visitor = null;
    for (const v of visitors) {
      const isMatch = await v.matchPasscode(passcode.trim());
      if (isMatch) {
        visitor = v;
        break;
      }
    }

    if (!visitor) {
      const newCount = (attempts.count || 0) + 1;
      const locked = newCount >= 3;
      await FailedAttempt.findOneAndUpdate(
        { flatNo: flatKey },
        { count: newCount, lockedUntil: locked ? new Date(Date.now() + 15 * 60 * 1000) : null },
        { upsert: true, new: true }
      );
      if (locked) {
        return res.status(403).json({ message: `Too many invalid attempts. Flat ${flatNo} is locked out for 15 minutes.` });
      }
      return res.status(400).json({ message: `Invalid passcode. Attempts remaining for flat: ${3 - newCount}` });
    }

    if (visitor.status === 'Checked In' || visitor.status === 'Checked Out') {
      return res.status(400).json({ message: 'This passcode has already been used.' });
    }

    const createdTime = new Date(visitor.createdAt);
    if (Date.now() - createdTime.getTime() > 24 * 60 * 60 * 1000) {
      return res.status(400).json({ message: 'This passcode has expired.' });
    }

    await FailedAttempt.findOneAndDelete({ flatNo: flatKey });

    visitor.status = 'Checked In';
    visitor.checkedInAt = new Date();
    const updatedVisitor = await visitor.save();

    try {
      const Notification = require('../models/Notification');
      const newNotif = await Notification.create({
        recipient: visitor.flatNo,
        title: 'Visitor Checked In',
        message: `${visitor.name} (${visitor.type}) has checked in to your flat.`,
        type: 'visitor_checkin'
      });
      if (req.io) {
        req.io.to(`room_flat_${visitor.flatNo.toUpperCase().trim()}`).emit('new_notification', newNotif);
      }
    } catch (err) {}

    if (req.io) {
      const roomFlat = `room_flat_${visitor.flatNo.toUpperCase().trim()}`;
      req.io.to(roomFlat).emit('visitor_check_status', updatedVisitor);
      req.io.to('room_security').emit('visitor_approval_changed', updatedVisitor);
      req.io.to('room_admins').emit('visitor_approval_changed', updatedVisitor);
    }

    res.status(200).json(updatedVisitor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const exportVisitorsCSV = async (req, res) => {
  try {
    const visitors = await Visitor.find({}).sort({ createdAt: -1 });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=visitors_log.csv');
    
    let csv = 'Name,Type,Mobile,Flat Number,Status,Purpose,Vehicle Number,Passcode,Checked In,Checked Out,Created At\n';
    visitors.forEach(v => {
      const checkedInStr = v.checkedInAt ? v.checkedInAt.toISOString() : '';
      const checkedOutStr = v.checkedOutAt ? v.checkedOutAt.toISOString() : '';
      const createdAtStr = v.createdAt ? v.createdAt.toISOString() : '';
      csv += `"${v.name}","${v.type}","${v.mobile}","${v.flatNo}","${v.status}","${v.purpose || ''}","${v.vehicleNumber || ''}","[MASKED]","${checkedInStr}","${checkedOutStr}","${createdAtStr}"\n`;
    });
    res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleLockdown = async (req, res) => {
  try {
    const { lockdown } = req.body;
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const SystemSetting = require('../models/SystemSetting');
    let setting = await SystemSetting.findOne({ key: 'lockdown' });
    if (!setting) {
      setting = await SystemSetting.create({ key: 'lockdown', value: false });
    }
    setting.value = lockdown;
    await setting.save();

    if (req.io) {
      req.io.emit('lockdown_status_changed', { lockdown });
    }

    res.status(200).json({ lockdown: setting.value });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getLockdownStatus = async (req, res) => {
  try {
    const SystemSetting = require('../models/SystemSetting');
    const setting = await SystemSetting.findOne({ key: 'lockdown' });
    res.status(200).json({ lockdown: setting ? setting.value : false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addBlocklist = async (req, res) => {
  try {
    const { mobile, reason } = req.body;
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const Blocklist = require('../models/Blocklist');
    let blocked = await Blocklist.findOne({ mobile });
    if (blocked) {
      return res.status(400).json({ message: 'Mobile number is already blacklisted.' });
    }
    blocked = await Blocklist.create({ mobile, reason });
    res.status(201).json(blocked);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getBlocklist = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const Blocklist = require('../models/Blocklist');
    const list = await Blocklist.find({}).sort({ createdAt: -1 });
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const removeBlocklist = async (req, res) => {
  try {
    const { mobile } = req.params;
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const Blocklist = require('../models/Blocklist');
    await Blocklist.deleteOne({ mobile });
    res.status(200).json({ message: 'Mobile number removed from blocklist.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getVisitors,
  addVisitor,
  updateVisitor,
  deleteVisitor,
  verifyPasscode,
  exportVisitorsCSV,
  toggleLockdown,
  getLockdownStatus,
  addBlocklist,
  getBlocklist,
  removeBlocklist
};
