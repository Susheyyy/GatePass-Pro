const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Visitor name is required'],
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Visitor type is required'],
    enum: ['Guest', 'Delivery', 'Cab', 'Maintenance', 'Other'],
    default: 'Guest'
  },
  mobile: {
    type: String,
    required: [true, 'Mobile number is required'],
    trim: true
  },
  flatNo: {
    type: String,
    required: [true, 'Flat number is required'],
    trim: true
  },
  passcode: {
    type: String,
    required: true,
    select: false
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Checked In', 'Checked Out'],
    default: 'Pending'
  },
  purpose: {
    type: String,
    trim: true
  },
  vehicleNumber: {
    type: String,
    trim: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident'
  },
  isBlacklisted: {
    type: Boolean,
    default: false
  },
  time: {
    type: Date,
    default: Date.now
  },
  checkedInAt: {
    type: Date
  },
  checkedOutAt: {
    type: Date
  }
}, {
  timestamps: true
});

const bcrypt = require('bcryptjs');

visitorSchema.pre('save', async function() {
  if (!this.isModified('passcode')) return;
  this.passcode = await bcrypt.hash(this.passcode, 10);
});

visitorSchema.methods.matchPasscode = async function(enteredPasscode) {
  return await bcrypt.compare(enteredPasscode, this.passcode);
};

module.exports = mongoose.model('Visitor', visitorSchema);
