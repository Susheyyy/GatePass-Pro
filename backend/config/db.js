const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const SystemCredential = require('../models/SystemCredential');
const { validPassword } = require('./security');


async function seedCredentials() {
  for (const role of ['admin', 'security']) {
    const password = process.env[`${role.toUpperCase()}_PASSWORD`];
    if (!password) continue;
    if (!validPassword(password)) throw new Error('Bootstrap passwords must contain 12 to 72 UTF-8 bytes');
    await SystemCredential.updateOne({ role }, { $setOnInsert: { password: await bcrypt.hash(password, 12), tokenVersion: 0 } }, { upsert: true });
  }
}

async function connectDB() {
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([require('../models/FailedAttempt').init(), require('../models/Resident').init(), SystemCredential.init()]);
  await Promise.all([require('../models/Session').init(), require('../models/Household').init(), require('../models/NotificationReceipt').init()]);
  await require('../services/occupancy').backfillOccupancies();
  await seedCredentials();
}

module.exports = connectDB;
