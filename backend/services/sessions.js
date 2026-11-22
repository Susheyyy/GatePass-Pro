const { randomUUID } = require('node:crypto');
const jwt = require('jsonwebtoken');
const Session = require('../models/Session');
const { jwtSecret } = require('../config/security');

const actorKey = (role, id) => `${role}:${id}`;
const actorRoom = (role, id) => `actor:${actorKey(role, id)}`;
const sessionRoom = id => `session:${id}`;

async function createSession(user, id, version) {
  const sid = randomUUID();
  const expiresAt = new Date(Date.now() + 8 * 3600000);
  await Session.create({ _id: sid, actorKey: actorKey(user.role, id), role: user.role, tokenVersion: version || 0, occupancyId: user.occupancyId, expiresAt });
  return jwt.sign({ ...user, sid, tokenVersion: version || 0 }, jwtSecret(), { algorithm: 'HS256', expiresIn: '8h' });
}

async function revokeActor(role, id, io) {
  io?.in(actorRoom(role, id)).disconnectSockets(true);
  try { await Session.updateMany({ actorKey: actorKey(role, id), revokedAt: null }, { $set: { revokedAt: new Date() } }); }
  catch { console.error('Session revocation persistence failed; account version remains authoritative'); }
}

async function logout(req, res) {
  await Session.updateOne({ _id: req.user.sessionId, revokedAt: null }, { $set: { revokedAt: new Date() } });
  req.io?.in(sessionRoom(req.user.sessionId)).disconnectSockets(true);
  res.json({ message: 'Signed out' });
}

module.exports = { actorKey, actorRoom, sessionRoom, createSession, revokeActor, logout };
