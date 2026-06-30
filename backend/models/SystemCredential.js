const mongoose = require('mongoose');

const systemCredentialSchema = new mongoose.Schema({
  role: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

module.exports = mongoose.model('SystemCredential', systemCredentialSchema);
