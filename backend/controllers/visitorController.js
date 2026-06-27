const Visitor = require('../models/Visitor');

const getVisitors = async (req, res) => {
  try {
    const { flatNo, search } = req.query;
    let query = {};
    if (flatNo) {
      query.flatNo = flatNo;
    }
    
    let visitors;
    
    if (search && /^\d{6}$/.test(search.trim())) {
      const allVisitors = await Visitor.find(query).sort({ createdAt: -1 });
      const matched = [];
      const bcrypt = require('bcryptjs');
      for (const v of allVisitors) {
        if (v.passcode && (v.passcode.startsWith('$2') || v.passcode.length > 10)) {
          if (bcrypt.compareSync(search.trim(), v.passcode)) {
            matched.push(v);
          }
        } else if (v.passcode === search.trim()) {
          matched.push(v);
        }
      }
      visitors = matched;
    } else {
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        query.$or = [
          { name: searchRegex },
          { type: searchRegex }
        ];
      }
      visitors = await Visitor.find(query).sort({ createdAt: -1 });
    }

    const masked = visitors.map(v => {
      const obj = v.toObject();
      obj.passcode = '••••••';
      return obj;
    });

    res.status(200).json(masked);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addVisitor = async (req, res) => {
  try {
    const { name, type, mobile, flatNo, status } = req.body;
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
      status: status || 'Approved'
    });
    
    const responseObj = visitor.toObject();
    responseObj.passcode = generatedPasscode;
    
    res.status(201).json(responseObj);
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
          await Notification.create({
            recipient: visitor.flatNo,
            title: 'Visitor Checked In',
            message: `${visitor.name} (${visitor.type}) has checked in to your flat.`,
            type: 'visitor_checkin'
          });
        } catch (err) {
          console.error('Failed to create check-in notification:', err);
        }
      } else if (status === 'Checked Out') {
        visitor.checkedOutAt = new Date();
        try {
          const Notification = require('../models/Notification');
          await Notification.create({
            recipient: visitor.flatNo,
            title: 'Visitor Checked Out',
            message: `${visitor.name} (${visitor.type}) has checked out from your flat.`,
            type: 'visitor_checkout'
          });
        } catch (err) {
          console.error('Failed to create check-out notification:', err);
        }
      }
    }
    const updatedVisitor = await visitor.save();
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
    await visitor.deleteOne();
    res.status(200).json({ message: 'Visitor removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getVisitors,
  addVisitor,
  updateVisitor,
  deleteVisitor
};
