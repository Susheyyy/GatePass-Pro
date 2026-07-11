const Resident = require('../models/Resident');
const { sendEmail } = require('../config/mailer');

const getResidents = async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    let query = {};

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: searchRegex },
        { flatNo: searchRegex },
        { vehicles: searchRegex }
      ];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;
    const [residents, total] = await Promise.all([
      Resident.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Resident.countDocuments(query)
    ]);
    res.status(200).json({
      residents,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
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

    if (isResidentAdding) {
      const authHeader = req.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authentication required to add co-residents' });
      }
      const token = authHeader.split(' ')[1];
      const jwt = require('jsonwebtoken');
      const jwtSecret = process.env.JWT_SECRET || 'fallback_secret';
      let decoded;
      try {
        decoded = jwt.verify(token, jwtSecret);
      } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
      }
      if (decoded.role !== 'resident') {
        return res.status(403).json({ message: 'Forbidden: Only residents can add co-residents' });
      }
      if (decoded.flatNo !== flatNo) {
        return res.status(403).json({ message: 'Forbidden: You can only add co-residents to your own flat' });
      }
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
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
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
    const link = `${frontendUrl}/login?email=${generatedEmail}`;
    
    

    console.log(`\n=================== REGISTRATION RECEIVED EMAIL PENDING SEND ===================\nTo: ${gmail}\nRegistration pending admin approval.\n================================================================================\n`);
    sendEmail({
      to: gmail,
      subject: 'GatePass Pro - Registration Received',
      text: `Hello ${name},\n\nYour resident account registration request for Flat ${flatNo} has been received and is currently pending administrator approval.\n\nOnce approved, you will receive a follow-up email with your login credentials and verification code.`
    })
      .catch((mailError) => {
        console.log(`[Email Workaround] Registration received email failed to send to ${gmail}`);
      });
    
    const responseObj = resident.toObject();
    delete responseObj.otp;
    delete responseObj.password;
    res.status(201).json(responseObj);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateResident = async (req, res) => {
  try {
    const { flatNo, name, mobile, gmail, members, status, password, otp, distressMessage, sender, bio, location, address, clearDistress, currentPassword, newPassword, distressStatus, vehicles } = req.body;
    const resident = await Resident.findById(req.params.id);
    
    if (!resident) {
      return res.status(404).json({ message: 'Resident not found' });
    }
    
    if (currentPassword && newPassword) {
      const bcrypt = require('bcryptjs');
      const isMatch = await bcrypt.compare(currentPassword, resident.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Incorrect current password' });
      }
      resident.password = newPassword;
      resident.isFirstLogin = false;
    } else if (password && otp) {
      if (resident.otp !== otp) {
        return res.status(400).json({ message: 'Invalid verification OTP' });
      }
      if (resident.otpExpiresAt && resident.otpExpiresAt < new Date()) {
        return res.status(400).json({ message: 'Verification OTP has expired. Please request a new one.' });
      }
      resident.password = password;
      resident.isFirstLogin = false;
      resident.otp = '';
      resident.otpExpiresAt = null;
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
      if (status && status !== resident.status) {
        if (!req.user || req.user.role !== 'admin') {
          return res.status(403).json({ message: 'Forbidden: Only administrators can update resident status' });
        }
        resident.status = status;
      }
      
      if (status === 'Approved' && wasPending) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const link = `${frontendUrl}/login?email=${resident.email}&otp=${resident.otp}`;
        
        

        console.log(`\n=================== APPROVAL EMAIL PENDING SEND ===================\nTo: ${resident.gmail}\nUsername: ${resident.email}\nDefault Password: resident123\nVerification OTP: ${resident.otp}\nLogin Link: ${link}\n=======================================================================\n`);
        sendEmail({
          to: resident.gmail,
          subject: 'GatePass Pro - Resident Account Approved',
          text: `Hello ${resident.name},\n\nYour resident account registration request has been approved.\n\nUsername: ${resident.email}\nDefault Password: resident123\nVerification OTP: ${resident.otp}\n\nPlease click the link below to verify and sign in:\n${link}`
        })
          .catch((mailError) => {
            console.log(`[Email Workaround] Retrievable credentials: User=${resident.email}, OTP=${resident.otp}, Link=${link}`);
          });
      }
      resident.bio = bio !== undefined ? bio : resident.bio;
      resident.location = location !== undefined ? location : resident.location;
      resident.address = address !== undefined ? address : resident.address;
      resident.vehicles = vehicles !== undefined ? vehicles : resident.vehicles;
      if (distressStatus && distressStatus !== resident.distressStatus) {
        resident.distressStatus = distressStatus;
        if (distressStatus === 'Resolved' || distressStatus === 'Dismissed') {
          if (req.io) {
            req.io.to('room_admins').emit('distress_resolved', { residentId: resident._id });
          }
          try {
            const Notification = require('../models/Notification');
            const newNotif = await Notification.create({
              recipient: resident.flatNo,
              title: `Distress Alert ${distressStatus}`,
              message: `Your distress alert has been marked as ${distressStatus.toLowerCase()} by the administrator.`,
              type: 'distress_reply'
            });
            if (req.io) {
              req.io.to(`room_flat_${resident.flatNo.toUpperCase().trim()}`).emit('new_notification', newNotif);
            }
          } catch (notifErr) {}
        }
      }
      if (clearDistress) {
        resident.distressMessages = [];
        resident.distressStatus = 'None';
        if (req.io) {
          req.io.to('room_admins').emit('distress_resolved', { residentId: resident._id });
        }
      }
      if (distressMessage) {
        const msgSender = sender || 'resident';
        resident.distressMessages.push({
          message: distressMessage,
          sender: msgSender
        });
        if (msgSender !== 'admin') {
          resident.distressStatus = 'Active';
          if (req.io) {
            req.io.to('room_admins').emit('distress_alert', {
              residentId: resident._id,
              flatNo: resident.flatNo,
              name: resident.name,
              distressStatus: 'Active',
              messages: resident.distressMessages
            });
          }
        }
        try {
          const Notification = require('../models/Notification');
          if (msgSender === 'admin') {
            const newNotif = await Notification.create({
              recipient: resident.flatNo,
              title: 'New Distress Response',
              message: `Admin replied: "${distressMessage.length > 50 ? distressMessage.substring(0, 50) + '...' : distressMessage}"`,
              type: 'distress_reply'
            });
            if (req.io) {
              req.io.to(`room_flat_${resident.flatNo.toUpperCase().trim()}`).emit('new_notification', newNotif);
            }
          } else {
            const newNotif = await Notification.create({
              recipient: 'admin',
              title: 'Distress Alert Received',
              message: `${resident.name} (Flat ${resident.flatNo}) distress: "${distressMessage.length > 50 ? distressMessage.substring(0, 50) + '...' : distressMessage}"`,
              type: 'distress_reply'
            });
            if (req.io) {
              req.io.to('room_admins').emit('new_notification', newNotif);
            }
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
    resident.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await resident.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const link = `${frontendUrl}/login?email=${resident.email}`;
    
    

    console.log(`\n=================== RESEND OTP EMAIL PENDING SEND ===================\nTo: ${resident.gmail}\nUsername: ${resident.email}\nNew OTP: ${generatedOtp}\nLogin Link: ${link}\n======================================================================\n`);
    sendEmail({
      to: resident.gmail,
      subject: 'GatePass Pro - New Verification OTP',
      text: `Hello ${resident.name},\n\nYour new verification OTP has been generated.\n\nUsername: ${resident.email}\nDefault Password: resident123\nNew Verification OTP: ${generatedOtp}\n\nPlease click the link below to login:\n${link}`
    })
      .catch((mailError) => {
        console.log(`[Email Workaround] Retrievable credentials: User=${resident.email}, New OTP=${generatedOtp}, Link=${link}`);
      });

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
    resident.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await resident.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const link = `${frontendUrl}/login?email=${resident.email}`;

    

    console.log(`\n=================== FORGOT PASSWORD EMAIL PENDING SEND ===================\nTo: ${resident.gmail}\nUsername: ${resident.email}\nReset OTP: ${generatedOtp}\nReset Link: ${link}\n=========================================================================\n`);
    sendEmail({
      to: resident.gmail,
      subject: 'GatePass Pro - Password Reset OTP',
      text: `Hello ${resident.name},\n\nWe received a request to reset your password.\n\nUsername: ${resident.email}\nVerification OTP: ${generatedOtp}\n\nPlease click the link below to verify and choose a new password:\n${link}`
    })
      .catch((mailError) => {
        console.log(`[Email Workaround] Retrievable credentials: User=${resident.email}, OTP=${generatedOtp}, Link=${link}`);
      });

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
    if (resident.otpExpiresAt && resident.otpExpiresAt < new Date()) {
      return res.status(400).json({ message: 'Verification OTP has expired. Please request a new one.' });
    }
    resident.password = password;
    resident.isFirstLogin = false;
    resident.otp = '';
    resident.otpExpiresAt = null;
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
    const jwt = require('jsonwebtoken');
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret';

    if (formattedEmail === 'admin@gatepass.com') {
      const SystemCredential = require('../models/SystemCredential');
      let adminCred = await SystemCredential.findOne({ role: 'admin' });
      let isMatch = false;
      if (adminCred) {
        const bcrypt = require('bcryptjs');
        isMatch = await bcrypt.compare(password, adminCred.password);
      } else {
        isMatch = (password === (process.env.ADMIN_PASSWORD || 'admin123'));
      }
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid password' });
      }
      const token = jwt.sign({ role: 'admin', email: formattedEmail }, jwtSecret, { expiresIn: '1d' });
      return res.status(200).json({
        message: 'Login successful',
        token,
        role: 'admin',
        email: formattedEmail
      });
    }

    if (formattedEmail === 'security@gatepass.com') {
      const SystemCredential = require('../models/SystemCredential');
      let securityCred = await SystemCredential.findOne({ role: 'security' });
      let isMatch = false;
      if (securityCred) {
        const bcrypt = require('bcryptjs');
        isMatch = await bcrypt.compare(password, securityCred.password);
      } else {
        isMatch = (password === (process.env.SECURITY_PASSWORD || 'security123'));
      }
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid password' });
      }
      const token = jwt.sign({ role: 'security', email: formattedEmail }, jwtSecret, { expiresIn: '1d' });
      return res.status(200).json({
        message: 'Login successful',
        token,
        role: 'security',
        email: formattedEmail
      });
    }

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
    const isMatch = await bcrypt.compare(password, resident.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    const token = jwt.sign(
      { role: 'resident', email: resident.email, residentId: resident._id, flatNo: resident.flatNo },
      jwtSecret,
      { expiresIn: '1d' }
    );

    const responseObj = resident.toObject();
    delete responseObj.password;

    res.status(200).json({
      message: 'Login successful',
      token,
      role: 'resident',
      resident: responseObj
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const sanitizeFormula = (val) => {
  if (typeof val === 'string') {
    const clean = val.trim();
    if (/^[=+\-@]/.test(clean)) {
      return `'` + clean;
    }
    return clean;
  }
  return val;
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

      const cleanFlatNo = sanitizeFormula(flatNo.toString());
      const cleanName = sanitizeFormula(name.toString());
      const cleanMobile = sanitizeFormula(mobile.toString());
      const cleanGmail = sanitizeFormula(gmail.toString());

      if (!/^[a-zA-Z]+-\d+$/.test(cleanFlatNo)) {
        errors.push(`Flat ${flatNo}: Invalid Flat Number format (must be Alphabet-number)`);
        continue;
      }
      if (!/^\d+$/.test(cleanMobile)) {
        errors.push(`Flat ${flatNo}: Mobile Number must contain only digits`);
        continue;
      }
      if (!/^[a-zA-Z0-9._%+-]+@(gmail\.com|yahoo\.com|outlook\.com|hotmail\.com|icloud\.com|proton\.me|protonmail\.com)$/i.test(cleanGmail)) {
        errors.push(`Flat ${flatNo}: Invalid Gmail Address provider`);
        continue;
      }

      const formattedGmail = cleanGmail.toLowerCase();
      const existingGmail = await Resident.findOne({ gmail: formattedGmail });
      if (existingGmail) {
        errors.push(`Flat ${flatNo}: A resident with Gmail ${gmail} already exists`);
        continue;
      }

      const existingFlat = await Resident.findOne({ flatNo: cleanFlatNo });
      if (existingFlat) {
        errors.push(`Flat ${flatNo}: Already registered`);
        continue;
      }

      const firstName = cleanName.split(' ')[0].toLowerCase();
      const flatClean = cleanFlatNo.toLowerCase().replace(/[^a-z0-9]/g, '');
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
        flatNo: cleanFlatNo,
        name: cleanName,
        mobile: cleanMobile,
        email: generatedEmail,
        gmail: formattedGmail,
        members: parseInt(members) || 1,
        otp: generatedOtp,
        password: 'resident123',
        isFirstLogin: true,
        communityId: generatedCommunityId,
        status: 'Approved',
        address: `Flat ${cleanFlatNo}, GatePass Residency`
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const link = `${frontendUrl}/login?email=${generatedEmail}&otp=${generatedOtp}`;
      

      console.log(`\n=================== BULK IMPORT EMAIL PENDING SEND ===================\nTo: ${formattedGmail}\nUsername: ${generatedEmail}\nDefault Password: resident123\nVerification OTP: ${generatedOtp}\nLogin Link: ${link}\n=======================================================================\n`);
      sendEmail({
        to: formattedGmail,
        subject: 'GatePass Pro - Resident Account Created',
        text: `Hello ${cleanName},\n\nYour resident account has been created.\n\nUsername: ${generatedEmail}\nDefault Password: resident123\nVerification OTP: ${generatedOtp}\n\nPlease click the link below to login:\n${link}`
      })
        .catch((mailError) => {
          console.log(`[Email Workaround] Retrievable credentials: User=${generatedEmail}, OTP=${generatedOtp}, Link=${link}`);
        });

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

const getResidentById = async (req, res) => {
  try {
    const resident = await Resident.findById(req.params.id).select('-password');
    if (!resident) {
      return res.status(404).json({ message: 'Resident not found' });
    }
    res.status(200).json(resident);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const changeSystemPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (req.user.role !== 'admin' && req.user.role !== 'security') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const SystemCredential = require('../models/SystemCredential');
    let cred = await SystemCredential.findOne({ role: req.user.role });
    const defaultPassword = req.user.role === 'admin' ? (process.env.ADMIN_PASSWORD || 'admin123') : (process.env.SECURITY_PASSWORD || 'security123');
    
    const bcrypt = require('bcryptjs');
    let isMatch = false;
    if (cred) {
      isMatch = await bcrypt.compare(currentPassword, cred.password);
    } else {
      isMatch = (currentPassword === defaultPassword);
    }

    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    if (cred) {
      cred.password = hashedPassword;
      await cred.save();
    } else {
      await SystemCredential.create({
        role: req.user.role,
        password: hashedPassword
      });
    }
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSystemProfile = async (req, res) => {
  try {
    const { role } = req.query;
    if (role !== 'admin' && role !== 'security') {
      return res.status(400).json({ message: 'Invalid role' });
    }
    const SystemProfile = require('../models/SystemProfile');
    let profile = await SystemProfile.findOne({ role });
    if (!profile) {
      const defaultProfile = role === 'admin' ? {
        role: 'admin',
        name: 'System Administrator',
        email: 'admin@gatepass.com',
        mobile: 'N/A',
        communityId: 'ADMIN',
        bio: 'Main system administrator for GatePass Pro security controls.',
        location: 'Central Security Tower',
        address: 'Gate Control Room'
      } : {
        role: 'security',
        name: 'Security Desk Officer',
        email: 'security@gatepass.com',
        mobile: 'N/A',
        communityId: 'SECURITY',
        bio: 'Gate supervisor for community guest validation and check-ins.',
        location: 'Main Entry Gate 1',
        address: 'Security Cabin'
      };
      profile = await SystemProfile.create(defaultProfile);
    }
    res.status(200).json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateSystemProfile = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'security') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { bio, location, address, mobile, gmail } = req.body;
    const SystemProfile = require('../models/SystemProfile');
    let profile = await SystemProfile.findOne({ role: req.user.role });
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    profile.bio = bio !== undefined ? bio : profile.bio;
    profile.location = location !== undefined ? location : profile.location;
    profile.address = address !== undefined ? address : profile.address;
    profile.mobile = mobile !== undefined ? mobile : profile.mobile;
    profile.email = gmail !== undefined ? gmail : profile.email;
    
    await profile.save();
    res.status(200).json(profile);
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
  bulkCreateResidents,
  getResidentById,
  changeSystemPassword,
  getSystemProfile,
  updateSystemProfile
};
