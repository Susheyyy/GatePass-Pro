// Review evidence only: these checks intentionally reproduce CURRENT defects.
// They are not passing security regressions and are not part of `npm test`.
// No application database, email provider, or remote service is contacted.
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Resident = require('../models/Resident');
const Visitor = require('../models/Visitor');
const FailedAttempt = require('../models/FailedAttempt');
const Blocklist = require('../models/Blocklist');
const Notification = require('../models/Notification');
const Post = require('../models/Post');
const residentController = require('../controllers/residentController');
const visitorController = require('../controllers/visitorController');
const notificationController = require('../controllers/notificationController');
const postController = require('../controllers/postController');
const { createApplication } = require('../server');
const { authenticate } = require('../middleware/authMiddleware');
const { io: socketClient } = require('../../frontend/node_modules/socket.io-client');

const query = value => ({ select() { return this; }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const resident = () => ({ _id: '507f1f77bcf86cd799439011', name: 'Audit resident', flatNo: 'A-101', email: 'audit@example.com', gmail: 'audit@example.com', status: 'Approved', isFirstLogin: false, tokenVersion: 0, distressStatus: 'None', distressMessages: [] });
const request = (body = {}, role = 'resident') => ({ body, params: { id: '507f1f77bcf86cd799439011' }, query: {}, user: { role, residentId: '507f1f77bcf86cd799439011', flatNo: 'A-101', email: 'audit@example.com' } });
const patches = [];
function patch(object, key, replacement) { const original = object[key]; object[key] = replacement; patches.push(() => { object[key] = original; }); }
async function reproduce(id, run) {
  try { const evidence = await run(); console.log(JSON.stringify({ id, confirmed: true, evidence })); }
  finally { while (patches.length) patches.pop()(); }
}
function event(target, name) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${name}`)), 3000);
    target.once(name, value => { clearTimeout(timer); resolve(value); });
  });
}

async function main() {
  await reproduce('A01', async () => {
    const visitor = { _id: 'visitor', flatNo: 'A-101', name: 'Audit guest', mobile: '1234567890', type: 'Guest', status: 'Approved', matchPasscode: async () => true };
    let committed = false;
    patch(FailedAttempt, 'findOne', () => query({ _id: 'attempt', count: 1, updatedAt: new Date() }));
    patch(FailedAttempt, 'exists', () => query(null));
    patch(Visitor, 'find', () => query([visitor]));
    patch(Blocklist, 'exists', () => query(null));
    patch(Visitor, 'findOneAndUpdate', () => { committed = true; return query({ ...visitor, status: 'Checked In' }); });
    patch(FailedAttempt, 'updateOne', async () => { throw new Error('Injected post-commit cleanup failure'); });
    const res = response();
    await visitorController.verifyPasscode(request({ flatNo: 'A-101', passcode: '123456' }, 'security'), res);
    assert.equal(committed, true); assert.equal(res.statusCode, 500);
    return { visitorCommittedAsCheckedIn: committed, responseStatus: res.statusCode };
  });

  await reproduce('A02', async () => {
    let saved = false;
    const record = { ...resident(), save: async () => { saved = true; } };
    patch(Resident, 'findById', () => query(record));
    patch(Notification, 'create', async () => { throw new Error('Injected notification failure'); });
    const res = response();
    await residentController.updateResident(request({ distressMessage: 'Audit emergency' }), res);
    assert.equal(saved, false); assert.equal(res.statusCode, 400);
    return { emergencyPersisted: saved, responseStatus: res.statusCode };
  });

  await reproduce('A03', async () => {
    const record = { ...resident(), distressStatus: 'Active', distressMessages: [{ message: 'Audit emergency' }], save: async () => record };
    patch(Resident, 'findById', () => query(record));
    const res = response();
    await residentController.updateResident(request({ clearDistress: true }), res);
    assert.equal(res.statusCode, 200); assert.equal(record.distressStatus, 'None'); assert.equal(record.distressMessages.length, 0);
    return { residentClearedActiveEmergency: true, retainedMessages: record.distressMessages.length };
  });

  await reproduce('A04', async () => {
    let deleted;
    patch(Notification, 'deleteMany', filter => { deleted = filter; return query({ deletedCount: 2 }); });
    const req = request({}, 'security'); req.query = { role: 'security', flatNo: 'B-202' };
    const res = response(); await notificationController.clearAllNotifications(req, res);
    assert.equal(res.statusCode, 200); assert.equal(deleted.recipient, 'B-202');
    return { guardSelectedAnotherFlat: 'B-202', deletionFilter: deleted, responseStatus: res.statusCode };
  });

  await reproduce('A05', async () => {
    const record = { recipient: 'all', isRead: false, save: async () => record };
    patch(Notification, 'findById', () => query(record));
    const res = response(); await notificationController.markAsRead(request(), res);
    assert.equal(record.isRead, true); assert.equal(res.statusCode, 200);
    return { broadcastSharedDocumentMarkedRead: record.isRead, hasPerUserReceipt: false };
  });

  await reproduce('A06', async () => {
    patch(Post.collection, 'insertOne', async () => ({ acknowledged: true }));
    patch(Notification, 'create', async () => ({}));
    const res = response();
    await postController.createPost(request({ title: 'Audit notice', description: 'Audit content', category: 'Notice' }, 'security'), res);
    assert.equal(res.statusCode, 201); assert.equal(res.body.authorName, 'System Admin'); assert.equal(res.body.flatNo, 'Admin');
    return { actingRole: 'security', storedAuthor: res.body.authorName, responseStatus: res.statusCode };
  });

  await reproduce('A07', async () => {
    const record = { title: 'Audit post', comments: [], save: async () => record };
    let emitted = 0;
    patch(Post, 'findById', () => query(record));
    patch(Notification, 'create', async () => ({ _id: 'audit-notification' }));
    const req = request({ text: 'Audit comment' }, 'admin');
    req.io = { to: () => ({ emit: () => { emitted++; } }) };
    const res = response(); await postController.addComment(req, res);
    assert.equal(res.statusCode, 201); assert.equal(emitted, 0); assert.equal(record.comments.length, 1);
    return { commentSaved: true, socketEvents: emitted, responseStatus: res.statusCode };
  });

  await reproduce('A08', async () => {
    let emitted = 0;
    patch(Notification, 'create', async body => body);
    const req = request({ title: 'Audit broadcast', message: 'Audit content' }, 'admin');
    req.io = { to: () => ({ emit: () => { emitted++; } }) };
    const res = response(); await notificationController.createNotification(req, res);
    assert.equal(res.statusCode, 201); assert.equal(emitted, 0);
    return { broadcastSaved: true, socketEvents: emitted };
  });

  await reproduce('A09', async () => {
    const { server, io } = createApplication();
    try {
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      const result = await fetch(`http://127.0.0.1:${server.address().port}/api/health`);
      assert.equal(mongoose.connection.readyState, 0); assert.equal(result.status, 200);
      await result.json();
      return { databaseConnected: false, healthStatus: result.status };
    } finally { await new Promise(resolve => io.close(resolve)); }
  });

  await reproduce('A10', async () => {
    const secret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = randomBytes(48).toString('hex');
    const record = resident();
    patch(Resident, 'findById', () => query({ ...record }));
    const token = jwt.sign({ role: 'resident', residentId: record._id, tokenVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '1m' });
    const { server, io } = createApplication();
    let client;
    try {
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      const joined = new Promise(resolve => io.on('connection', socket => socket.once('join_room', resolve)));
      client = socketClient(`http://127.0.0.1:${server.address().port}`, { autoConnect: false, transports: ['websocket'], reconnection: false, auth: { token } });
      const connected = event(client, 'connect'); client.connect(); await connected;
      client.emit('join_room'); await joined;
      record.tokenVersion = 1;
      await assert.rejects(authenticate(token));
      const received = event(client, 'new_notification');
      io.to('room_flat_A-101').emit('new_notification', { message: 'Audit event after revocation' });
      assert.equal((await received).message, 'Audit event after revocation');
      return { sessionRejectedOnReauthentication: true, existingSocketStillReceives: true };
    } finally {
      client?.disconnect();
      await new Promise(resolve => io.close(resolve));
      if (secret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = secret;
    }
  });

  await reproduce('A11', async () => {
    let created = 0;
    patch(Resident, 'exists', () => query(null));
    patch(Resident, 'create', async body => ({ ...body, _id: `audit-resident-${++created}` }));
    patch(Notification, 'create', async () => ({}));
    const body = { name: 'Audit Resident', flatNo: 'A-101', mobile: '1234567890', gmail: 'same@example.com', members: 1 };
    const responses = [response(), response()];
    await Promise.all(responses.map(res => residentController.addResident(request(body), res)));
    assert.equal(created, 2); assert.ok(responses.every(res => res.statusCode === 201));
    assert.equal(Resident.schema.path('gmail').options.unique, undefined);
    return { concurrentSameEmailRegistrations: created, uniqueEmailIndexDeclared: false };
  });

  await reproduce('A12', async () => {
    const record = { ...resident(), otp: 'audit-existing-challenge-hash', otpPurpose: 'reset', otpExpiresAt: new Date(Date.now() + 60000), save: async () => record };
    patch(Resident, 'findById', () => query(record));
    const res = response(); await residentController.updateResident(request({ gmail: 'changed@example.com' }), res);
    assert.equal(res.statusCode, 200); assert.equal(record.gmail, 'changed@example.com');
    assert.equal(record.otp, 'audit-existing-challenge-hash'); assert.equal(record.tokenVersion, 0);
    return { recoveryMailboxChangedWithoutStepUp: true, oldChallengeStillPresent: true, tokenVersionUnchanged: true };
  });
}

main().catch(error => { console.error(`Audit reproduction did not complete: ${error.message}`); process.exitCode = 1; });
