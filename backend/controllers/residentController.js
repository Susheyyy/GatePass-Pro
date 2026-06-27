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
    
    const residents = await Resident.find(query).select('-password').sort({ createdAt: -1 });
    res.status(200).json(residents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addResident = async (req, res) => {
  try {
    const { flatNo, name, mobile, gmail, members, isSelfRegistration, isResidentAdding } = req.body;
    
    if (!flatNo || !name || !mobile || !gmail || !members) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!/^[a-zA-Z]+-\d+$/.test(flatNo.trim())) {
      return res.status(400).json({ message: 'Flat Number must be in Alphabet-number format (e.g. A-102)' });
    }
    if (!/^\d+$/.test(mobile.trim())) {
      return res.status(400).json({ message: 'Mobile Number must contain only digits' });
    }
    if (!/^[a-zA-Z0-9._%+-]+@(gmail\.com|yahoo\.com|outlook\.com|hotmail\.com|icloud\.com|proton\.me|protonmail\.com)$/i.test(gmail.trim())) {
      return res.status(400).json({ message: 'Gmail Address must end with a standard provider (e.g. @gmail.com, @yahoo.com)' });
    }
    if (!/^\d+$/.test(members.toString().trim())) {
      return res.status(400).json({ message: 'Total Family Members must contain only digits' });
    }

    const formattedGmail = gmail.trim().toLowerCase();
    const existingGmail = await Resident.findOne({ gmail: formattedGmail });
    if (existingGmail) {
      return res.status(400).json({ message: 'A resident with this Gmail address already exists' });
    }

    if (!isSelfRegistration && !isResidentAdding) {
      const existingFlat = await Resident.findOne({ flatNo });
      if (existingFlat) {
        return res.status(400).json({ message: 'A resident is already registered for this flat. Additional residents must register themselves or be added by the flat owner.' });
      }
    }
    
    const firstName = name.trim().split(' ')[0].toLowerCase();
    const flatClean = flatNo.toLowerCase().replace(/[^a-z0-9]/g, '');
    let generatedEmail = `${firstName}.${flatClean}@gatepass.com`;
    let emailExists = await Resident.findOne({ email: generatedEmail });
    let counter = 1;
    while (emailExists) {
      generatedEmail = `${firstName}.${flatClean}${counter}@gatepass.com`;
      emailExists = await Resident.findOne({ email: generatedEmail });
      counter++;
    }
    
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
      status: isResidentAdding ? 'Approved' : 'Pending',
      address: `Flat ${flatNo}, GatePass Residency`
    });

    try {
      const Notification = require('../models/Notification');
      await Notification.create({
        recipient: 'admin',
        title: 'New Resident Registration',
        message: `${name} requested registration for Flat ${flatNo}. Approval required.`,
        type: 'admin_broadcast'
      });
    } catch (notifErr) {
    }
    
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
    const { flatNo, name, mobile, gmail, members, status, password, otp, distressMessage, sender, bio, location, address, clearDistress, currentPassword, newPassword, distressStatus } = req.body;
    const resident = await Resident.findById(req.params.id);
    
    if (!resident) {
      return res.status(404).json({ message: 'Resident not found' });
    }
    
    if (currentPassword && newPassword) {
      if (resident.password !== currentPassword) {
        return res.status(400).json({ message: 'Incorrect current password' });
      }
      resident.password = newPassword;
      resident.isFirstLogin = false;
    } else if (password && otp) {
      if (resident.otp !== otp) {
        return res.status(400).json({ message: 'Invalid verification OTP' });
      }
      resident.password = password;
      resident.isFirstLogin = false;
      resident.otp = '';
    } else {
      if (flatNo && !/^[a-zA-Z]+-\d+$/.test(flatNo.trim())) {
        return res.status(400).json({ message: 'Flat Number must be in Alphabet-number format (e.g. A-102)' });
      }
      if (mobile && !/^\d+$/.test(mobile.trim())) {
        return res.status(400).json({ message: 'Mobile Number must contain only digits' });
      }
      if (gmail && !/^[a-zA-Z0-9._%+-]+@(gmail\.com|yahoo\.com|outlook\.com|hotmail\.com|icloud\.com|proton\.me|protonmail\.com)$/i.test(gmail.trim())) {
        return res.status(400).json({ message: 'Gmail Address must end with a standard provider (e.g. @gmail.com, @yahoo.com)' });
      }
      if (members !== undefined && !/^\d+$/.test(members.toString().trim())) {
        return res.status(400).json({ message: 'Total Family Members must contain only digits' });
      }

      resident.flatNo = flatNo || resident.flatNo;
      resident.name = name || resident.name;
      resident.mobile = mobile || resident.mobile;
      if (gmail) {
        const formattedGmail = gmail.trim().toLowerCase();
        if (formattedGmail !== resident.gmail.trim().toLowerCase()) {
          const existingGmail = await Resident.findOne({ gmail: formattedGmail });
          if (existingGmail) {
            return res.status(400).json({ message: 'A resident with this Gmail address already exists' });
          }
        }
        resident.gmail = formattedGmail;
      }
      resident.members = members !== undefined ? (parseInt(members) || resident.members) : resident.members;
      const wasPending = resident.status === 'Pending';
      resident.status = status || resident.status;
      
      if (status === 'Approved' && wasPending) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const link = `${frontendUrl}/login?email=${resident.email}&otp=${resident.otp}`;
        
        const mailOptions = {
          from: process.env.SMTP_MAIL,
          to: resident.gmail,
          subject: 'GatePass Pro - Resident Account Approved',
          text: `Hello ${resident.name},\n\nYour resident account registration request has been approved.\n\nUsername: ${resident.email}\nDefault Password: resident123\nVerification OTP: ${resident.otp}\n\nPlease click the link below to verify and sign in:\n${link}`
        };
        
        try {
          await transporter.sendMail(mailOptions);
        } catch (mailError) {
          console.error(mailError);
        }
      }
      resident.bio = bio !== undefined ? bio : resident.bio;
      resident.location = location !== undefined ? location : resident.location;
      resident.address = address !== undefined ? address : resident.address;
      if (distressStatus && distressStatus !== resident.distressStatus) {
        resident.distressStatus = distressStatus;
        if (distressStatus === 'Resolved' || distressStatus === 'Dismissed') {
          try {
            const Notification = require('../models/Notification');
            await Notification.create({
              recipient: resident.flatNo,
              title: `Distress Alert ${distressStatus}`,
              message: `Your distress alert has been marked as ${distressStatus.toLowerCase()} by the administrator.`,
              type: 'distress_reply'
            });
          } catch (notifErr) {}
        }
      }
      if (clearDistress) {
        resident.distressMessages = [];
        resident.distressStatus = 'None';
      }
      if (distressMessage) {
        const msgSender = sender || 'resident';
        resident.distressMessages.push({
          message: distressMessage,
          sender: msgSender
        });
        if (msgSender !== 'admin') {
          resident.distressStatus = 'Active';
        }
        try {
          const Notification = require('../models/Notification');
          if (msgSender === 'admin') {
            await Notification.create({
              recipient: resident.flatNo,
              title: 'New Distress Response',
              message: `Admin replied: "${distressMessage.length > 50 ? distressMessage.substring(0, 50) + '...' : distressMessage}"`,
              type: 'distress_reply'
            });
          } else {
            await Notification.create({
              recipient: 'admin',
              title: 'Distress Alert Received',
              message: `${resident.name} (Flat ${resident.flatNo}) distress: "${distressMessage.length > 50 ? distressMessage.substring(0, 50) + '...' : distressMessage}"`,
              type: 'distress_reply'
            });
          }
        } catch (err) {
          console.error('Error creating distress notification:', err);
        }
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

const loginResident = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
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

    if (resident.status === 'Pending') {
      return res.status(400).json({ message: 'Your account is pending administrator approval.' });
    }
    if (resident.status === 'Rejected') {
      return res.status(400).json({ message: 'Your registration request has been rejected.' });
    }

    const bcrypt = require('bcryptjs');
    let isMatch = false;
    if (resident.password.startsWith('$2') || resident.password.length > 10) {
      isMatch = await bcrypt.compare(password, resident.password);
    } else {
      isMatch = resident.password === password;
    }

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    const responseObj = resident.toObject();
    delete responseObj.password;

    res.status(200).json({
      message: 'Login successful',
      resident: responseObj
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const bulkCreateResidents = async (req, res) => {
  try {
    const { residents } = req.body;
    if (!residents || !Array.isArray(residents)) {
      return res.status(400).json({ message: 'Residents array is required' });
    }

    const created = [];
    const errors = [];

    for (const data of residents) {
      const { flatNo, name, mobile, gmail, members } = data;
      if (!flatNo || !name || !mobile || !gmail) {
        errors.push(`Flat ${flatNo || 'unknown'}: missing name, mobile, or gmail`);
        continue;
      }

      if (!/^[a-zA-Z]+-\d+$/.test(flatNo.toString().trim())) {
        errors.push(`Flat ${flatNo}: Invalid Flat Number format (must be Alphabet-number)`);
        continue;
      }
      if (!/^\d+$/.test(mobile.toString().trim())) {
        errors.push(`Flat ${flatNo}: Mobile Number must contain only digits`);
        continue;
      }
      if (!/^[a-zA-Z0-9._%+-]+@(gmail\.com|yahoo\.com|outlook\.com|hotmail\.com|icloud\.com|proton\.me|protonmail\.com)$/i.test(gmail.toString().trim())) {
        errors.push(`Flat ${flatNo}: Invalid Gmail Address provider`);
        continue;
      }

      const formattedGmail = gmail.toString().trim().toLowerCase();
      const existingGmail = await Resident.findOne({ gmail: formattedGmail });
      if (existingGmail) {
        errors.push(`Flat ${flatNo}: A resident with Gmail ${gmail} already exists`);
        continue;
      }

      const existingFlat = await Resident.findOne({ flatNo: flatNo.toString().trim() });
      if (existingFlat) {
        errors.push(`Flat ${flatNo}: Already registered`);
        continue;
      }

      const firstName = name.toString().trim().split(' ')[0].toLowerCase();
      const flatClean = flatNo.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
      let generatedEmail = `${firstName}.${flatClean}@gatepass.com`;
      let emailExists = await Resident.findOne({ email: generatedEmail });
      let counter = 1;
      while (emailExists) {
        generatedEmail = `${firstName}.${flatClean}${counter}@gatepass.com`;
        emailExists = await Resident.findOne({ email: generatedEmail });
        counter++;
      }
      
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const generatedCommunityId = Math.floor(10000 + Math.random() * 90000).toString();

      const newResident = await Resident.create({
        flatNo: flatNo.toString().trim(),
        name: name.toString().trim(),
        mobile: mobile.toString().trim(),
        email: generatedEmail,
        gmail: formattedGmail,
        members: parseInt(members) || 1,
        otp: generatedOtp,
        password: 'resident123',
        isFirstLogin: true,
        communityId: generatedCommunityId,
        status: 'Approved',
        address: `Flat ${flatNo}, GatePass Residency`
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const link = `${frontendUrl}/login?email=${generatedEmail}&otp=${generatedOtp}`;
      const mailOptions = {
        from: process.env.SMTP_MAIL,
        to: formattedGmail,
        subject: 'GatePass Pro - Resident Account Created',
        text: `Hello ${name},\n\nYour resident account has been created.\n\nUsername: ${generatedEmail}\nDefault Password: resident123\nVerification OTP: ${generatedOtp}\n\nPlease click the link below to login:\n${link}`
      };

      try {
        await transporter.sendMail(mailOptions);
      } catch (mailError) {
        console.error(mailError);
      }

      created.push(newResident);
    }

    if (errors.length > 0 && created.length === 0) {
      return res.status(400).json({ message: errors.join('; ') });
    }

    res.status(201).json({
      message: `Successfully imported ${created.length} residents.`,
      createdCount: created.length,
      errors: errors.length > 0 ? errors : undefined
    });
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
  resetForgotPassword,
  loginResident,
  bulkCreateResidents
};
