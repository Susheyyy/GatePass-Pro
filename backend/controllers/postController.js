const mongoose = require('mongoose');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const Resident = require('../models/Resident');

const getPosts = async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createPost = async (req, res) => {
  const { title, description, category } = req.body;
  try {
    let authorName = 'System Admin';
    let flatNo = 'Admin';

    if (req.user.role === 'resident') {
      const resident = await Resident.findOne({ email: req.user.email });
      if (!resident) {
        return res.status(404).json({ message: 'Resident account not found' });
      }
      authorName = resident.name;
      flatNo = resident.flatNo;
    }

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
        req.io.to('room_admins').emit('new_notification', newNotif);
        const uniqueFlats = await Resident.distinct('flatNo');
        uniqueFlats.forEach(flat => {
          req.io.to(`room_flat_${flat.toUpperCase().trim()}`).emit('new_notification', newNotif);
        });
      }
    } catch (err) {
    }

    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const addComment = async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Post not found' });
    }
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    let authorName = 'System Admin';
    let flatNo = 'Admin';

    if (req.user.role === 'resident') {
      const resident = await Resident.findOne({ email: req.user.email });
      if (!resident) {
        return res.status(404).json({ message: 'Resident account not found' });
      }
      authorName = resident.name;
      flatNo = resident.flatNo;
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
      if (req.io) {
        if (isSystemAdmin) {
          req.io.to('room_admins').emit('new_notification', newNotif);
          const uniqueFlats = await Resident.distinct('flatNo');
          uniqueFlats.forEach(flat => {
            req.io.to(`room_flat_${flat.toUpperCase().trim()}`).emit('new_notification', newNotif);
          });
        } else {
          req.io.to('room_admins').emit('new_notification', newNotif);
        }
      }

    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deletePost = async (req, res) => {
  const { id } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Post not found' });
    }
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (req.user.role !== 'admin') {
      const resident = await Resident.findOne({ email: req.user.email });
      if (!resident || resident.flatNo !== post.flatNo) {
        return res.status(403).json({ message: 'Forbidden: You cannot delete this post' });
      }
    }

    await post.deleteOne();
    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPosts,
  createPost,
  addComment,
  deletePost
};
