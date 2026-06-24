const express = require('express');
const router = express.Router();
const { getPosts, createPost, addComment } = require('../controllers/postController');

router.route('/')
  .get(getPosts)
  .post(createPost);

router.route('/:id/comments')
  .post(addComment);

module.exports = router;
