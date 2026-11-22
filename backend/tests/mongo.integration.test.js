const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { createApplication } = require('../server');
const Resident = require('../models/Resident');
const Visitor = require('../models/Visitor');
const FailedAttempt = require('../models/FailedAttempt');
const SystemCredential = require('../models/SystemCredential');
const Post = require('../models/Post');
const { issueOtp } = require('../config/security');


test('MongoDB-backed role isolation, pass races, lockouts and reset consumption', { skip: !process.env.TEST_MONGO_URI, timeout: 60000 }, async () => {
  process.env.JWT_SECRET = randomBytes(48).toString('hex');
  const dbName = `gatepass_test_${randomBytes(12).toString('hex')}`;
  let server, io;
  try {
    await mongoose.connect(process.env.TEST_MONGO_URI, { dbName, serverSelectionTimeoutMS: 5000 });
    await Promise.all([Resident.init(), Visitor.init(), FailedAttempt.init(), SystemCredential.init(), Post.init()]);
    await SystemCredential.create({ role: 'security', password: await bcrypt.hash('integration-guard-password', 10) });
    const resident = await Resident.create({ name: 'Integration Resident', email: 'resident@example.com', gmail: 'resident@example.com', mobile: '1234567890', flatNo: 'A-101', members: 2, communityId: 'test-community', occupancyId: randomUUID(), occupancyStartedAt: new Date(), password: 'integration-resident-password', status: 'Approved', isFirstLogin: false });
    ({ server, io } = createApplication());
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    let ip = 1;
    const call = async (path, method = 'GET', body, token) => {
      const result = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `198.51.100.${ip++}`, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      return { status: result.status, body: await result.json() };
    };
    const guard = (await call('/residents/login', 'POST', { email: 'security@gatepass.com', password: 'integration-guard-password' })).body.token;
    const user = (await call('/residents/login', 'POST', { email: resident.email, password: 'integration-resident-password' })).body.token;
    assert.ok(guard); assert.ok(user);
    const post = await call('/posts', 'POST', { title: 'Test post', description: 'Community notice' }, user);
    assert.equal(post.status, 201);
    const feed = await call('/posts?page=1&limit=1', 'GET', undefined, user);
    assert.equal(feed.status, 200);
    assert.equal(feed.body.posts[0]._id, post.body._id);
    assert.equal(feed.body.page, 1);
    assert.equal(feed.body.total, 1);
    const neighbor = await Resident.create({ name: 'Co Resident', email: 'neighbor@example.com', gmail: 'neighbor@example.com', mobile: '1234567891', flatNo: 'A-101', members: 2, communityId: 'neighbor-community', occupancyId: randomUUID(), occupancyStartedAt: new Date(), password: 'integration-neighbor-password', status: 'Approved', isFirstLogin: false });
    const neighborToken = (await call('/residents/login', 'POST', { email: neighbor.email, password: 'integration-neighbor-password' })).body.token;
    assert.ok(neighborToken);
    assert.equal((await call(`/posts/${post.body._id}`, 'DELETE', undefined, neighborToken)).status, 404);
    // Race four appends against a single remaining slot. Exactly one may win.
    await Post.updateOne({ _id: post.body._id }, { $set: { comments: Array.from({ length: 199 }, () => ({ text: 'Existing comment', authorName: 'Resident', flatNo: 'A-101' })) } });
    const comments = await Promise.all([1, 2, 3, 4].map(i => call(`/posts/${post.body._id}/comments`, 'POST', { text: `Comment ${i}` }, user)));
    assert.equal(comments.filter(result => result.status === 201).length, 1);
    assert.equal(comments.filter(result => result.status === 409).length, 3);
    assert.equal((await Post.findById(post.body._id)).comments.length, 200);
    assert.equal((await call(`/posts/${post.body._id}`, 'DELETE', undefined, user)).status, 200);
    assert.equal((await call(`/residents/${resident._id}`, 'PUT', { password: 'bypass-password', otp: '123456' })).status, 401);
    const visitor = await Visitor.create({ name: 'Guest', flatNo: 'A-101', mobile: '1234567890', type: 'Guest', status: 'Approved', hostResidentId: resident._id, hostOccupancyId: resident.occupancyId, audienceOccupancyIds: [resident.occupancyId], passcode: '123456' });
    assert.equal((await call(`/visitors/${visitor._id}`, 'PUT', { status: 'Checked In' }, user)).status, 403);
    const attempts = await Promise.all([1, 2].map(() => call('/visitors/verify', 'POST', { flatNo: 'A-101', passcode: '123456' }, guard)));
    assert.equal(attempts.filter(r => r.status === 200).length, 1);
    assert.ok(attempts.every(r => [200, 400, 409].includes(r.status)));
    assert.equal(attempts.find(r => r.status === 200).body.passcode, undefined);
    assert.equal(await Visitor.countDocuments({ _id: visitor._id, status: 'Checked In' }), 1);
    const failures = await Promise.all([1, 2, 3].map(() => call('/visitors/verify', 'POST', { flatNo: 'A-101', passcode: '000000' }, guard)));
    assert.ok(failures.some(r => r.status === 429));
    const locked = await FailedAttempt.findOne({ flatNo: 'A-101' });
    assert.equal(locked.count, 3); assert.ok(locked.lockedUntil > new Date());
    await FailedAttempt.updateOne({ flatNo: 'A-101' }, { $set: { lockedUntil: new Date(Date.now() - 1000) } });
    await call('/visitors/verify', 'POST', { flatNo: 'A-101', passcode: '000000' }, guard);
    assert.equal((await FailedAttempt.findOne({ flatNo: 'A-101' })).count, 1);
    const challenge = issueOtp(resident.email, 'reset');
    await Resident.updateOne({ _id: resident._id }, { $set: challenge.fields });
    const resets = await Promise.all([1, 2].map(() => call('/residents/reset-password', 'POST', { email: resident.email, otp: challenge.code, password: 'replacement-resident-password' })));
    assert.deepEqual(resets.map(r => r.status).sort(), [200, 400]);
    assert.deepEqual(Object.keys(resets.find(r => r.status === 200).body).sort(), ['email', 'message']);
    assert.equal((await call('/residents', 'GET', undefined, user)).status, 401);
  } finally {
    if (io) await new Promise(resolve => io.close(resolve));
    else if (server) await new Promise(resolve => server.close(resolve));
    if (mongoose.connection.readyState === 1 && mongoose.connection.name === dbName) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});
