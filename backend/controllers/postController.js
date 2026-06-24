const Post = require('../models/Post');

const getPosts = async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createPost = async (req, res) => {
  const { title, description, authorName, flatNo } = req.body;
  try {
    const newPost = new Post({
      title,
      description,
      authorName,
      flatNo
    });
    const saved = await newPost.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getPosts,
  createPost
};
