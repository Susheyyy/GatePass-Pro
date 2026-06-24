const Resident = require('../models/Resident');

// @route   GET /api/residents
const getResidents = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: searchRegex },
        { flatNo: searchRegex }
      ];
    }
    
    const residents = await Resident.find(query).sort({ createdAt: -1 });
    res.status(200).json(residents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   POST /api/residents - create resident
const addResident = async (req, res) => {
  try {
    const { flatNo, name, mobile, email, members } = req.body;
    
    if (!flatNo || !name || !mobile || !email || !members) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    const resident = await Resident.create({
      flatNo,
      name,
      mobile,
      email,
      members
    });
    
    res.status(201).json(resident);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @route   PUT /api/residents/:id (update resident details)
const updateResident = async (req, res) => {
  try {
    const { flatNo, name, mobile, email, members } = req.body;
    const resident = await Resident.findById(req.params.id);
    
    if (!resident) {
      return res.status(404).json({ message: 'Resident not found' });
    }
    
    resident.flatNo = flatNo || resident.flatNo;
    resident.name = name || resident.name;
    resident.mobile = mobile || resident.mobile;
    resident.email = email || resident.email;
    resident.members = members !== undefined ? members : resident.members;
    
    const updatedResident = await resident.save();
    res.status(200).json(updatedResident);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @route   DELETE /api/residents/:id (delete resident info)
const deleteResident = async (req, res) => {
  try {
    const resident = await Resident.findById(req.params.id);
    
    if (!resident) {
      return res.status(404).json({ message: 'Resident not found' });
    }
    
    await resident.deleteOne();
    res.status(200).json({ message: 'Resident removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getResidents,
  addResident,
  updateResident,
  deleteResident
};
