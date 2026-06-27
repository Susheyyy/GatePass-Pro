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
    required: true
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

module.exports = mongoose.model('Visitor', visitorSchema);
