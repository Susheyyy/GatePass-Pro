const mongoose = require('mongoose');

const systemProfileSchema = new mongoose.Schema({
  role: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  mobile: { type: String, required: true },
  communityId: { type: String, required: true },
  bio: { type: String, required: true },
  location: { type: String, required: true },
  address: { type: String, required: true }
});

module.exports = mongoose.model('SystemProfile', systemProfileSchema);
