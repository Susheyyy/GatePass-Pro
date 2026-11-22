const mongoose = require('mongoose');
const { definitions } = require('../services/residentValidation');

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
    type: String,
    select: false
  },
  otpPurpose: { type: String, enum: ['activate', 'reset'] },
  otpAttempts: { type: Number, default: 0 },
  tokenVersion: { type: Number, default: 0 },
  occupancyId: { type: String, index: true },
  occupancyStartedAt: Date,
  deletedAt: { type: Date, default: null },
  otpExpiresAt: {
    type: Date
  },
  password: {
    type: String,
    select: false
  },
  isFirstLogin: {
    type: Boolean,
    default: true
  },
  distressMessages: [{
    message: { type: String, required: true },
    sender: { type: String, default: 'resident' },
    createdAt: { type: Date, default: Date.now }
  }],
  distressStatus: {
    type: String,
    enum: ['Active', 'Resolved', 'Dismissed', 'None'],
    default: 'None'
  },
  communityId: {
    type: String,
    unique: true
  },
  bio: {
    type: String,
    default: 'Resident of GatePass Pro Community.'
  },
  location: {
    type: String,
    default: 'GatePass Residency'
  },
  address: {
    type: String,
    default: ''
  },
  vehicles: {
    type: [String],
    default: []
  },
  avatar: {
    type: String,
    default: 'avatar1'
  }
}, {
  timestamps: true,
  optimisticConcurrency: true
});

const bcrypt = require('bcryptjs');

residentSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

residentSchema.index({ name: 'text', flatNo: 'text', vehicles: 'text' });
residentSchema.index({ deletedAt: 1, createdAt: -1, _id: -1 });
residentSchema.index({ gmail: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
residentSchema.index({ email: 1 }, { unique: true });
for (const [field, validate] of Object.entries(definitions)) residentSchema.path(field).validate(validate, `Invalid ${field}`);

module.exports = mongoose.model('Resident', residentSchema);
