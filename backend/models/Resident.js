const mongoose = require('mongoose');

const residentSchema = new mongoose.Schema({
  flatNo: {
    type: String,
    required: [true, 'Flat number is required'],
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Resident name is required'],
    trim: true
  },
  mobile: {
    type: String,
    required: [true, 'Mobile number is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email address is required'],
    trim: true,
    lowercase: true
  },
  members: {
    type: Number,
    required: [true, 'Number of members is required'],
    min: [1, 'Must have at least 1 member']
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  gmail: {
    type: String,
    required: [true, 'Gmail address is required'],
    trim: true,
    lowercase: true
  },
  otp: {
    type: String
  },
  password: {
    type: String,
    default: 'resident123'
  },
  isFirstLogin: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

residentSchema.index({ name: 'text', flatNo: 'text' });

module.exports = mongoose.model('Resident', residentSchema);
