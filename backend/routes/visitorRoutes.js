const express = require('express');
const router = express.Router();
const {
  getVisitors,
  addVisitor,
  updateVisitor,
  deleteVisitor
} = require('../controllers/visitorController');

router.route('/')
  .get(getVisitors)
  .post(addVisitor);

router.route('/:id')
  .put(updateVisitor)
  .delete(deleteVisitor);

module.exports = router;
