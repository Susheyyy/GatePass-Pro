const mongoose = require('mongoose');

const householdSchema = new mongoose.Schema({
  flatNo: { type: String, required: true, unique: true },
  members: { type: Number, required: true, min: 1, max: 50 }
}, { timestamps: true });

module.exports = mongoose.model('Household', householdSchema);
