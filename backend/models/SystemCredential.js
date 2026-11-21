const mongoose = require('mongoose');

const systemCredentialSchema = new mongoose.Schema({
  role: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  tokenVersion: { type: Number, default: 0 }
});

module.exports = mongoose.model('SystemCredential', systemCredentialSchema);
