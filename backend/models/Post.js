const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Post title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Post description is required'],
    trim: true
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
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Post', postSchema);
