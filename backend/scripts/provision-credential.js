require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const SystemCredential = require('../models/SystemCredential');
const { validPassword, jwtSecret } = require('../config/security');

async function main() {
  const role = process.argv[2];
  if (!['admin', 'security'].includes(role)) throw new Error('Usage: npm run provision:credential -- admin|security');
  jwtSecret();
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  const password = process.env[`${role.toUpperCase()}_PASSWORD`];
  if (!validPassword(password)) throw new Error('Configure the role password with 12 to 72 UTF-8 bytes');
  await mongoose.connect(process.env.MONGO_URI);
  await SystemCredential.init();
  await SystemCredential.updateOne({ role }, { $set: { password: await bcrypt.hash(password, 12) }, $inc: { tokenVersion: 1 } }, { upsert: true });
  console.log('Credential provisioned. Existing sessions for this role are revoked.');
}
main().catch(() => { console.error('Credential provisioning failed. Check the role, password policy and database configuration.'); process.exitCode = 1; }).finally(() => mongoose.disconnect());
