const mongoose = require('mongoose');
const Post = require('../models/Post');
const { publishNotification } = require('../services/notifications');

const MAX_COMMENTS = 200;
const categories = ['Notice', 'Event', 'Complaint', 'Lost & Found', 'General'];
const validText = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;

function authorIdentity(user) {
  const id = user.actorId || user.residentId;
  if (!id || (user.role === 'resident' && !user.occupancyId)) throw new Error('Authenticated author identity required');
  return {
    authorPrincipal: `${user.role}:${id}:${user.occupancyId || ''}`,
    authorName: user.role === 'resident' ? user.name : user.role === 'admin' ? 'System Admin' : 'Security Officer',
    flatNo: user.role === 'resident' ? user.flatNo : user.role === 'admin' ? 'Admin' : 'Security'
  };
}

async function notify(req, data) {
  try { await publishNotification(req, { ...data, type: 'community' }); }
  catch { console.error('Community notification delivery failed'); }
}

const getPosts = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number.parseInt(req.query.limit) || 50));
    const [posts, total] = await Promise.all([
      Post.find().sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit),
      Post.countDocuments({})
    ]);
    res.json({ posts, total, page, pages: Math.ceil(total / limit) });
  } catch { res.status(500).json({ message: 'Unable to load community posts' }); }
};

const createPost = async (req, res) => {
  const { title, description, category = 'General' } = req.body;
  if (!validText(title, 120) || !validText(description, 5000) || !categories.includes(category)) return res.status(400).json({ message: 'Provide a title up to 120 characters, a description up to 5000 characters, and a valid category' });
  try {
    const author = authorIdentity(req.user);
    const saved = await Post.create({ title: title.trim(), description: description.trim(), category, ...author });
    await notify(req, { recipient: 'all', title: 'New Community Announcement', message: `${author.authorName} (Flat ${author.flatNo}) posted: "${saved.title}"` });
    res.status(201).json(saved);
  } catch { res.status(500).json({ message: 'Unable to create community post' }); }
};

const addComment = async (req, res) => {
  const { text } = req.body;
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ message: 'Post not found' });
  if (!validText(text, 2000)) return res.status(400).json({ message: 'Comment must contain 1 to 2000 characters' });
  try {
    const author = authorIdentity(req.user);
    // The size guard and append share one atomic update. Concurrent writers
    // cannot overwrite each other or exceed the embedded collection's limit.
    const saved = await Post.findOneAndUpdate({ _id: req.params.id, [`comments.${MAX_COMMENTS - 1}`]: { $exists: false } },
      { $push: { comments: { text: text.trim(), ...author, createdAt: new Date() } } },
      { returnDocument: 'after', runValidators: true });
    if (!saved) return res.status(409).json({ message: 'Post unavailable or comment limit reached. Refresh the board.' });
    await notify(req, { recipient: req.user.role === 'admin' ? 'all' : 'admin', title: 'New Comment on Post', message: `${author.authorName} (${author.flatNo}): "${text.trim().slice(0, 50)}" on post "${saved.title}"` });
    res.status(201).json(saved);
  } catch { res.status(500).json({ message: 'Unable to add comment' }); }
};

const deletePost = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ message: 'Post not found' });
  try {
    const filter = { _id: req.params.id };
    // Legacy posts without an author principal remain administrator-managed.
    if (req.user.role !== 'admin') filter.authorPrincipal = authorIdentity(req.user).authorPrincipal;
    const deleted = await Post.findOneAndDelete(filter);
    if (!deleted) return res.status(404).json({ message: 'Post not found or you do not own it' });
    res.json({ message: 'Post deleted successfully' });
  } catch { res.status(500).json({ message: 'Unable to delete post' }); }
};

module.exports = { getPosts, createPost, addComment, deletePost, authorIdentity, MAX_COMMENTS };
