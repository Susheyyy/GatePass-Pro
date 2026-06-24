const Resident = require('../models/Resident');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_MAIL,
    pass: process.env.SMTP_PASSWORD
  }
});

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

const addResident = async (req, res) => {
  try {
    const { flatNo, name, mobile, gmail, members } = req.body;
    
    if (!flatNo || !name || !mobile || !gmail || !members) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    const firstName = name.trim().split(' ')[0].toLowerCase();
    const flatClean = flatNo.toLowerCase().replace(/[^a-z0-9]/g, '');
    const generatedEmail = `${firstName}.${flatClean}@gatepass.com`;
    
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    
    const resident = await Resident.create({
      flatNo,
      name,
      mobile,
      email: generatedEmail,
      gmail,
      members,
      otp: generatedOtp,
      password: 'resident123',
      isFirstLogin: true
    });
    
    const link = `http://localhost:5173/login?email=${generatedEmail}&otp=${generatedOtp}`;
    
    const mailOptions = {
      from: process.env.SMTP_MAIL,
      to: gmail,
      subject: 'GatePass Pro - Resident Account Created',
      text: `Hello ${name},\n\nYour resident account has been created.\n\nUsername: ${generatedEmail}\nDefault Password: resident123\nVerification OTP: ${generatedOtp}\n\nPlease click the link below to login:\n${link}\n\nUpon first login, you will be required to change your password using the OTP.`
    };
    
    try {
      await transporter.sendMail(mailOptions);
    } catch (mailError) {
      console.error(mailError);
    }
    
    res.status(201).json(resident);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateResident = async (req, res) => {
  try {
    const { flatNo, name, mobile, gmail, members, status, password, otp } = req.body;
    const resident = await Resident.findById(req.params.id);
    
    if (!resident) {
      return res.status(404).json({ message: 'Resident not found' });
    }
    
    if (password && otp) {
      if (resident.otp !== otp) {
        return res.status(400).json({ message: 'Invalid verification OTP' });
      }
      resident.password = password;
      resident.isFirstLogin = false;
      resident.otp = '';
    } else {
      resident.flatNo = flatNo || resident.flatNo;
      resident.name = name || resident.name;
      resident.mobile = mobile || resident.mobile;
      resident.gmail = gmail || resident.gmail;
      resident.members = members !== undefined ? members : resident.members;
      resident.status = status || resident.status;
    }
    
    const updatedResident = await resident.save();
    res.status(200).json(updatedResident);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

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
