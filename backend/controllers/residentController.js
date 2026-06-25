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

    const existingGmail = await Resident.findOne({ gmail: gmail.toLowerCase() });
    if (existingGmail) {
      return res.status(400).json({ message: 'A resident with this Gmail address already exists' });
    }

    const existingFlat = await Resident.findOne({ flatNo });
    if (existingFlat) {
      return res.status(400).json({ message: 'A resident is already registered for this flat' });
    }
    
    const firstName = name.trim().split(' ')[0].toLowerCase();
    const flatClean = flatNo.toLowerCase().replace(/[^a-z0-9]/g, '');
    const generatedEmail = `${firstName}.${flatClean}@gatepass.com`;
    
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const generatedCommunityId = Math.floor(10000 + Math.random() * 90000).toString();
    
    const resident = await Resident.create({
      flatNo,
      name,
      mobile,
      email: generatedEmail,
      gmail,
      members,
      otp: generatedOtp,
      password: 'resident123',
      isFirstLogin: true,
      communityId: generatedCommunityId,
      address: `Flat ${flatNo}, GatePass Residency`
    });
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const link = `${frontendUrl}/login?email=${generatedEmail}&otp=${generatedOtp}`;
    
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
    const { flatNo, name, mobile, gmail, members, status, password, otp, distressMessage, bio, location, address, clearDistress } = req.body;
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
      resident.bio = bio !== undefined ? bio : resident.bio;
      resident.location = location !== undefined ? location : resident.location;
      resident.address = address !== undefined ? address : resident.address;
      if (clearDistress) {
        resident.distressMessages = [];
      }
      if (distressMessage) {
        resident.distressMessages.push({ message: distressMessage });
      }
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

const resendOtp = async (req, res) => {
  try {
    const resident = await Resident.findById(req.params.id);
    if (!resident) {
      return res.status(404).json({ message: 'Resident not found' });
    }
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    resident.otp = generatedOtp;
    await resident.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const link = `${frontendUrl}/login?email=${resident.email}&otp=${generatedOtp}`;
    
    const mailOptions = {
      from: process.env.SMTP_MAIL,
      to: resident.gmail,
      subject: 'GatePass Pro - New Verification OTP',
      text: `Hello ${resident.name},\n\nYour new verification OTP has been generated.\n\nUsername: ${resident.email}\nDefault Password: resident123\nNew Verification OTP: ${generatedOtp}\n\nPlease click the link below to login:\n${link}`
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (mailError) {
      console.error(mailError);
    }

    res.status(200).json({ message: 'New OTP sent successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }
    const formattedEmail = email.trim().toLowerCase();
    const resident = await Resident.findOne({
      $or: [
        { email: formattedEmail },
        { gmail: formattedEmail }
      ]
    });
    if (!resident) {
      return res.status(404).json({ message: 'Resident not found with this email' });
    }
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    resident.otp = generatedOtp;
    await resident.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const link = `${frontendUrl}/login?email=${resident.email}&otp=${generatedOtp}`;

    const mailOptions = {
      from: process.env.SMTP_MAIL,
      to: resident.gmail,
      subject: 'GatePass Pro - Password Reset OTP',
      text: `Hello ${resident.name},\n\nWe received a request to reset your password.\n\nUsername: ${resident.email}\nVerification OTP: ${generatedOtp}\n\nPlease click the link below to verify and choose a new password:\n${link}`
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (mailError) {
      console.error(mailError);
    }

    res.status(200).json({ message: 'Verification OTP sent to your registered Gmail address' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const resetForgotPassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    if (!email || !otp || !password) {
      return res.status(400).json({ message: 'All fields (email, otp, new password) are required' });
    }
    const formattedEmail = email.trim().toLowerCase();
    const resident = await Resident.findOne({
      $or: [
        { email: formattedEmail },
        { gmail: formattedEmail }
      ]
    });
    if (!resident) {
      return res.status(404).json({ message: 'Resident not found' });
    }
    if (resident.otp !== otp.trim()) {
      return res.status(400).json({ message: 'Invalid verification OTP' });
    }
    resident.password = password;
    resident.isFirstLogin = false;
    resident.otp = '';
    await resident.save();
    res.status(200).json(resident);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getResidents,
  addResident,
  updateResident,
  deleteResident,
  resendOtp,
  forgotPassword,
  resetForgotPassword
};
