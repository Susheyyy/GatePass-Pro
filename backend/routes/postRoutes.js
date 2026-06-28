const express = require('express');
const router = express.Router();
const { getPosts, createPost, addComment, deletePost } = require('../controllers/postController');
const { protectRoute } = require('../middleware/authMiddleware');

router.route('/')
  .get(protectRoute, getPosts)
  .post(protectRoute, createPost);

router.route('/:id')
  .delete(protectRoute, deletePost);

router.route('/:id/comments')
  .post(protectRoute, addComment);

module.exports = router;
