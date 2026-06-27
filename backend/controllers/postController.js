const mongoose = require('mongoose');
const Post = require('../models/Post');
const Notification = require('../models/Notification');

const getPosts = async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createPost = async (req, res) => {
  const { title, description, authorName, flatNo, category } = req.body;
  try {
    const newPost = new Post({
      title,
      description,
      authorName,
      flatNo,
      category: category || 'General'
    });
    const saved = await newPost.save();
    try {
      const newNotif = await Notification.create({
        recipient: 'all',
        title: 'New Community Announcement',
        message: `${authorName} (Flat ${flatNo}) posted: "${title}"`,
        type: 'community'
      });
      if (req.io) {
        req.io.emit('new_notification', newNotif);
      }
    } catch (err) {
      console.error('Error creating notification:', err);
    }

    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const addComment = async (req, res) => {
  const { id } = req.params;
  const { text, authorName, flatNo } = req.body;
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Post not found' });
    }
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    post.comments.push({ text, authorName, flatNo });
    const saved = await post.save();
    try {
      const isSystemAdmin = flatNo === 'Admin' || authorName === 'System Admin' || authorName === 'System Administrator';
      await Notification.create({
        recipient: isSystemAdmin ? 'all' : 'admin',
        title: isSystemAdmin ? 'Admin Commented on Post' : 'New Comment on Post',
        message: `${authorName} (${flatNo}): "${text.length > 50 ? text.substring(0, 50) + '...' : text}" on post "${post.title}"`,
        type: 'community'
      });
    } catch (err) {
      console.error('Error creating notification:', err);
    }

    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getPosts,
  createPost,
  addComment
};
