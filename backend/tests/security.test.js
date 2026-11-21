const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Resident = require('../models/Resident');
const Visitor = require('../models/Visitor');
const FailedAttempt = require('../models/FailedAttempt');
const SystemCredential = require('../models/SystemCredential');
const Blocklist = require('../models/Blocklist');
const Notification = require('../models/Notification');
const { publicResident, issueOtp, otpHash, jwtSecret, validateConfig } = require('../config/security');
const { protectRoute, authenticate } = require('../middleware/authMiddleware');
const residents = require('../controllers/residentController');
const visitors = require('../controllers/visitorController');
const passwords = require('../controllers/passwordController');

process.env.JWT_SECRET = randomBytes(48).toString('hex');
const query = value => ({ select() { return this; }, sort() { return this; }, skip() { return this; }, limit() { return this; }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });
const response = () => ({ code: 200, status(value) { this.code = value; return this; }, json(value) { this.body = value; return this; } });
const id = '507f1f77bcf86cd799439011';
const account = { _id: id, name: 'Test Resident', email: 'test@example.com', gmail: 'test@example.com', flatNo: 'A-101', status: 'Approved', isFirstLogin: false, tokenVersion: 0 };
const request = (body = {}, role = 'admin') => ({ body, user: { role, residentId: id, flatNo: 'A-101' }, params: { id }, query: {} });

test('configuration rejects missing/known signing keys and weak bootstrap passwords', t => {
  const secret = process.env.JWT_SECRET;
  t.mock.method(process, 'emitWarning', () => {});
  delete process.env.JWT_SECRET;
  assert.throws(jwtSecret);
  process.env.JWT_SECRET = 'fallback_secret';
  assert.throws(jwtSecret);
  process.env.JWT_SECRET = secret;
  const uri = process.env.MONGO_URI;
  const admin = process.env.ADMIN_PASSWORD;
  process.env.MONGO_URI = 'mongodb://localhost/test';
  process.env.ADMIN_PASSWORD = 'admin123';
  assert.throws(validateConfig, /ADMIN_PASSWORD/);
  if (uri === undefined) delete process.env.MONGO_URI; else process.env.MONGO_URI = uri;
  if (admin === undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD = admin;
});

test('all resident response fields are allowlisted', () => {
  const safe = publicResident({ ...account, password: 'hash', otp: 'hash', otpExpiresAt: new Date(), otpPurpose: 'reset', otpAttempts: 2, tokenVersion: 5, unexpectedSecret: 'hidden' });
  for (const key of ['password', 'otp', 'otpExpiresAt', 'otpPurpose', 'otpAttempts', 'tokenVersion', 'unexpectedSecret']) assert.equal(safe[key], undefined);
  assert.equal(safe.email, account.email);
});

test('OTP challenges are random, hashed and bound to account and purpose', () => {
  const first = issueOtp(account.email, 'reset');
  const second = issueOtp(account.email, 'reset');
  assert.match(first.code, /^\d{6}$/);
  assert.notEqual(first.fields.otp, first.code);
  assert.notEqual(first.fields.otp, otpHash('other@example.com', 'reset', first.code));
  assert.notEqual(first.fields.otp, otpHash(account.email, 'activate', first.code));
  assert.ok(first.fields.otpExpiresAt > new Date());
  assert.notEqual(first.fields, second.fields);
});

test('password/OTP bodies cannot bypass authentication', async () => {
  const res = response();
  await protectRoute({ method: 'PUT', body: { password: 'long-password', otp: '123456' }, headers: {} }, res, () => assert.fail('Unauthorized request passed'));
  assert.equal(res.code, 401);
});

test('resident sessions require approval, completed activation and current token version', async t => {
  const record = { ...account };
  t.mock.method(Resident, 'findById', () => query(record));
  const token = jwt.sign({ role: 'resident', residentId: id, tokenVersion: 0 }, process.env.JWT_SECRET);
  assert.equal((await authenticate(token)).flatNo, 'A-101');
  record.status = 'Rejected';
  await assert.rejects(authenticate(token));
  record.status = 'Approved'; record.isFirstLogin = true;
  await assert.rejects(authenticate(token));
  record.isFirstLogin = false; record.tokenVersion = 1;
  await assert.rejects(authenticate(token));
  await assert.rejects(authenticate(jwt.sign({ role: 'owner' }, process.env.JWT_SECRET)));
});

test('privileged defaults and first-login residents never receive a JWT', async t => {
  t.mock.method(SystemCredential, 'findOne', () => query(null));
  for (const [email, password] of [['admin@gatepass.com', 'admin123'], ['security@gatepass.com', 'security123']]) {
    const res = response(); await residents.loginResident(request({ email, password }), res);
    assert.equal(res.code, 401); assert.equal(res.body.token, undefined);
  }
  t.mock.method(Resident, 'findOne', () => query({ ...account, isFirstLogin: true }));
  const res = response(); await residents.loginResident(request({ email: account.email, password: 'resident123' }), res);
  assert.equal(res.code, 401); assert.equal(res.body.token, undefined);
});

test('resident list scopes to their flat and strips co-resident contact information', async t => {
  let filter;
  t.mock.method(Resident, 'find', value => { filter = value; return query([{ ...account, otp: 'secret' }, { ...account, _id: 'other-id', email: 'private@example.com', gmail: 'private@example.com', mobile: '1234567890' }]); });
  t.mock.method(Resident, 'countDocuments', () => query(2));
  const res = response(); await residents.getResidents(request({}, 'resident'), res);
  assert.equal(filter.flatNo, 'A-101');
  assert.equal(res.body.residents[0].otp, undefined);
  for (const field of ['email', 'gmail', 'mobile']) assert.equal(res.body.residents[1][field], undefined);
});

test('visitor reads ignore client-supplied cross-flat scope', async t => {
  let filter;
  t.mock.method(Visitor, 'find', value => { filter = value; return query([]); });
  t.mock.method(Visitor, 'countDocuments', () => query(0));
  const req = request({}, 'resident'); req.query.flatNo = 'B-202';
  await visitors.getVisitors(req, response());
  assert.equal(filter.flatNo, 'A-101');
});

test('residents and guards cannot register an already checked-in visitor', async () => {
  for (const role of ['resident', 'security', 'admin']) {
    const res = response(); await visitors.addVisitor(request({ status: 'Checked In' }, role), res);
    assert.equal(res.code, 403);
  }
});

test('status updates cannot bypass pass verification or gate roles', async () => {
  for (const [role, status] of [['resident', 'Checked In'], ['resident', 'Checked Out'], ['security', 'Approved'], ['security', 'Rejected'], ['admin', 'Checked In']]) {
    const res = response(); await visitors.updateVisitor(request({ status }, role), res);
    assert.equal(res.code, 403);
  }
});

test('approval and checkout enforce previous state with compare-and-swap', async t => {
  const filters = [];
  t.mock.method(Visitor, 'findOneAndUpdate', filter => { filters.push(filter); return query(null); });
  for (const [role, status] of [['resident', 'Approved'], ['security', 'Checked Out']]) {
    const res = response(); await visitors.updateVisitor(request({ status }, role), res);
    assert.equal(res.code, 409);
  }
  assert.equal(filters[0].status, 'Pending'); assert.equal(filters[0].flatNo, 'A-101');
  assert.equal(filters[1].status, 'Checked In');
});

test('unapproved, expired or used passes are not candidates; failure updates are atomic pipelines', async t => {
  let filter, pipeline, options;
  t.mock.method(FailedAttempt, 'findOne', () => query(null));
  t.mock.method(Visitor, 'find', value => { filter = value; return query([]); });
  t.mock.method(FailedAttempt, 'findOneAndUpdate', (f, p, o) => { pipeline = p; options = o; return query({ count: 3 }); });
  const res = response(); await visitors.verifyPasscode(request({ flatNo: 'A-101', passcode: '123456' }, 'security'), res);
  assert.equal(res.code, 429); assert.equal(filter.status, 'Approved');
  assert.ok(filter.createdAt.$gt instanceof Date);
  assert.equal(options.updatePipeline, true); assert.equal(options.upsert, true);
  assert.ok(Array.isArray(pipeline)); assert.match(JSON.stringify(pipeline), /\$add/);
});

test('active flat lockouts reject even a correct code before lookup', async t => {
  t.mock.method(FailedAttempt, 'findOne', () => query({ lockedUntil: new Date(Date.now() + 60000) }));
  t.mock.method(Visitor, 'find', () => assert.fail('Lookup during lockout'));
  const res = response(); await visitors.verifyPasscode(request({ flatNo: 'A-101', passcode: '123456' }, 'security'), res);
  assert.equal(res.code, 429);
});

test('concurrent correct verifications consume a pass once and never return the hash', async t => {
  const visitor = { _id: id, name: 'Guest', flatNo: 'A-101', mobile: '1234567890', type: 'Guest', status: 'Approved', passcode: 'stored-hash', matchPasscode: async () => true };
  let state = 'Approved';
  t.mock.method(FailedAttempt, 'findOne', () => query(null));
  t.mock.method(FailedAttempt, 'exists', () => query(null));
  t.mock.method(Blocklist, 'exists', () => query(null));
  t.mock.method(Visitor, 'find', () => query([visitor]));
  t.mock.method(Visitor, 'findOneAndUpdate', filter => {
    assert.equal(filter.status, 'Approved'); assert.ok(filter.createdAt.$gt instanceof Date);
    if (state !== filter.status) return query(null);
    state = 'Checked In'; return query({ ...visitor, status: state });
  });
  t.mock.method(Notification, 'create', () => Promise.resolve({}));
  const responses = [response(), response()];
  await Promise.all(responses.map(res => visitors.verifyPasscode(request({ flatNo: 'A-101', passcode: '123456' }, 'security'), res)));
  assert.deepEqual(responses.map(res => res.code).sort(), [200, 409]);
  assert.equal(responses.find(res => res.code === 200).body.passcode, undefined);
});

test('malformed reset payloads are rejected before touching the database', async t => {
  t.mock.method(Resident, 'findOneAndUpdate', () => assert.fail('Invalid reset touched database'));
  for (const body of [{ email: { $ne: null }, otp: '123456', password: 'strong-password' }, { email: account.email, otp: '', password: 'strong-password' }, { email: account.email, otp: '123456', password: 'short' }]) {
    const res = response(); await passwords.resetForgotPassword(request(body), res); assert.equal(res.code, 400);
  }
});

test('reset attempts are bounded and a correct challenge can be consumed only once', async t => {
  const challenge = issueOtp(account.email, 'reset');
  const record = { ...account, ...challenge.fields };
  t.mock.method(Resident, 'findOneAndUpdate', (filter, update) => {
    if (update.$inc?.otpAttempts) {
      assert.equal(filter.otpAttempts.$lt, 5); assert.equal(filter.otpPurpose, 'reset');
      if (record.otpAttempts >= 5 || !record.otp || record.otpExpiresAt <= new Date()) return query(null);
      record.otpAttempts++; return query({ ...record });
    }
    assert.ok(filter.otpExpiresAt.$gt instanceof Date); assert.equal(filter.otp, challenge.fields.otp);
    if (record.otp !== filter.otp) return query(null);
    delete record.otp; record.tokenVersion++; record.password = update.$set.password;
    return query({ email: account.email });
  });
  const responses = [response(), response()];
  await Promise.all(responses.map(res => passwords.resetForgotPassword(request({ email: account.email, otp: challenge.code, password: 'my-new-strong-password' }), res)));
  assert.deepEqual(responses.map(res => res.code).sort(), [200, 400]);
  const success = responses.find(res => res.code === 200);
  assert.deepEqual(Object.keys(success.body).sort(), ['email', 'message']);
  assert.equal(record.tokenVersion, 1); assert.ok(await bcrypt.compare('my-new-strong-password', record.password));
});

test('exhausted and expired reset challenges fail closed', async t => {
  t.mock.method(Resident, 'findOneAndUpdate', () => query(null));
  const res = response();
  await passwords.resetForgotPassword(request({ email: account.email, otp: '123456', password: 'my-new-strong-password' }), res);
  assert.equal(res.code, 400);
});

test('Mongoose save hooks hash visitor passes and resident passwords without callback middleware', async t => {
  t.mock.method(Visitor.collection, 'insertOne', () => Promise.resolve({ acknowledged: true }));
  t.mock.method(Resident.collection, 'insertOne', () => Promise.resolve({ acknowledged: true }));
  const visitor = new Visitor({ name: 'Test Guest', mobile: '1234567890', flatNo: 'A-101', passcode: '123456', type: 'Guest' });
  await visitor.save(); assert.notEqual(visitor.passcode, '123456'); assert.ok(await visitor.matchPasscode('123456'));
  const resident = new Resident({ ...account, mobile: '1234567890', members: 1, communityId: 'test-community', password: 'my-strong-password' });
  await resident.save(); assert.notEqual(resident.password, 'my-strong-password'); assert.ok(await bcrypt.compare('my-strong-password', resident.password));
});

test('failure update pipelines execute through the installed Mongoose query layer', async t => {
  t.mock.method(FailedAttempt, 'findOne', () => query(null));
  t.mock.method(Visitor, 'find', () => query([]));
  let received;
  t.mock.method(FailedAttempt.collection, 'findOneAndUpdate', async (filter, pipeline, options) => {
    received = { filter, pipeline, options };
    return { _id: new (require('mongoose').Types.ObjectId)(), flatNo: 'A-101', count: 1, lockedUntil: null };
  });
  const res = response(); await visitors.verifyPasscode(request({ flatNo: 'A-101', passcode: '000000' }, 'security'), res);
  assert.equal(res.code, 400);
  assert.equal(received.filter.flatNo, 'A-101'); assert.equal(received.options.upsert, true);
  assert.ok(Array.isArray(received.pipeline));
});

test('HTTP routes deny the old reset bypass and rate-limit recovery by account across IPs', async t => {
  const { createApplication } = require('../server');
  t.mock.method(Resident, 'findOneAndUpdate', () => query(null));
  t.mock.method(Resident, 'findOne', () => query(null));
  const { server, io } = createApplication();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let ip = 1;
  const call = (path, method, body) => fetch(`http://127.0.0.1:${server.address().port}/api/residents${path}`, { method, headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `203.0.113.${ip++}` }, body: JSON.stringify(body) });
  try {
    assert.equal((await call(`/${id}`, 'PUT', { password: 'bypass-password', otp: '123456' })).status, 401);
    for (let attempt = 0; attempt < 11; attempt++) {
      const result = await call('/reset-password', 'POST', { email: 'rate-limit@example.com', otp: '123456', password: 'strong-password-123' });
      assert.equal(result.status, attempt < 10 ? 400 : 429);
      await result.text();
    }
    for (let attempt = 0; attempt < 4; attempt++) {
      const result = await call('/forgot-password', 'POST', { email: 'request-limit@example.com' });
      assert.equal(result.status, attempt < 3 ? 200 : 429);
      if (attempt < 3) assert.match((await result.json()).message, /If an eligible account exists/);
      else await result.text();
    }
  } finally { await new Promise(resolve => io.close(resolve)); }
});
