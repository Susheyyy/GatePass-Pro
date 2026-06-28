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
    res.status(200).json({
      visitors,
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

    const visitor = await Visitor.findOne({ flatNo: new RegExp(`^${flatKey}$`, 'i'), passcode: passcode.trim() });

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

module.exports = {
  getVisitors,
  addVisitor,
  updateVisitor,
  deleteVisitor,
  verifyPasscode
};
