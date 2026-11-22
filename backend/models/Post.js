const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Post title is required'],
    trim: true,
    maxlength: 120
  },
  description: {
    type: String,
    required: [true, 'Post description is required'],
    trim: true,
    maxlength: 5000
  },
  authorName: {
    type: String,
    required: [true, 'Author name is required'],
    trim: true
  },
  flatNo: {
    type: String,
    required: [true, 'Flat number is required'],
    trim: true
  },
  // Display names and flat numbers are mutable; never use them for ownership.
  authorPrincipal: { type: String, immutable: true, index: true },
  category: {
    type: String,
    enum: ['Notice', 'Event', 'Complaint', 'Lost & Found', 'General'],
    default: 'General'
  },
  comments: [{
    text: { type: String, required: true, maxlength: 2000 },
    authorPrincipal: String,
    authorName: { type: String, required: true },
    flatNo: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

postSchema.index({ createdAt: -1, _id: -1 });

module.exports = mongoose.model('Post', postSchema);
