const Visitor = require('../models/Visitor');

const getVisitors = async (req, res) => {
  try {
    const { flatNo, search } = req.query;
    let query = {};
    if (flatNo) {
      query.flatNo = flatNo;
    }
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: searchRegex },
        { type: searchRegex }
      ];
    }
    const visitors = await Visitor.find(query).sort({ createdAt: -1 });
    res.status(200).json(visitors);
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
