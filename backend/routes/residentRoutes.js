const express = require('express');
const router = express.Router();
const {
  getResidents,
  addResident,
  updateResident,
  deleteResident
} = require('../controllers/residentController');

router.route('/')
  .get(getResidents)
  .post(addResident);

router.route('/:id')
  .put(updateResident)
  .delete(deleteResident);

module.exports = router;
