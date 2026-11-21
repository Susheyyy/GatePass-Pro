import { test } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { startDemoSession, endDemoSession, isDemoSession, apiStorage } from './demo.js';
import { residentApi, visitorApi, postApi, notificationApi, getUserFromToken } from './api.js';
import { connectSocket, getSocket } from './socket.js';

// Match the enumerable keys and string values exposed by browser Storage.
const storage = () => ({
  getItem(key) { return Object.hasOwn(this, key) ? this[key] : null; },
  setItem(key, value) { this[key] = String(value); },
  removeItem(key) { delete this[key]; }
});

test('demo roles, mutations and cleanup remain isolated from real data and network', async () => {
  globalThis.localStorage = storage();
  globalThis.sessionStorage = storage();
  globalThis.window = new EventTarget();
  localStorage.setItem('gatepass_residents', '[{"_id":"real-resident"}]');
  localStorage.setItem('gatepass_visitors', '[{"_id":"real-visitor"}]');
  localStorage.setItem('gatepass_admin_password', 'real-password');
  sessionStorage.setItem('unrelated', 'preserve');
  const originalLocal = JSON.stringify(localStorage);
  const originalAdapter = axios.defaults.adapter;
  let networkRequests = 0;
  axios.defaults.adapter = async () => {
    networkRequests++;
    throw new Error('Unexpected network request');
  };
  try {
    for (const [role, destination] of [['admin', '/'], ['security', '/visitors'], ['resident', '/resident-dashboard']]) {
      assert.equal(startDemoSession(role), destination);
      assert.equal(getUserFromToken().role, role);
      assert.equal(getUserFromToken().demo, true);
      assert.equal(connectSocket(role, 'A-101'), null);
      assert.equal(getSocket(), null);
      assert.equal((await residentApi.getAll()).length, 3);
      assert.equal((await visitorApi.getAll()).length, 4);
    }
    assert.equal((await residentApi.getById(getUserFromToken().residentId)).flatNo, 'A-101');
    assert.equal((await visitorApi.getAll({ flatNo: 'A-101' })).length, 3);
    assert.equal((await visitorApi.verifyPasscode({ flatNo: 'A-101', passcode: '123456' })).status, 'Checked In');
    await assert.rejects(visitorApi.verifyPasscode({ flatNo: 'A-101', passcode: '123456' }), /already been used/);
    await postApi.create('Demo announcement', 'Sample content', 'General');
    assert.equal((await postApi.getAll()).length, 2);
    assert.ok((await notificationApi.getAll('resident', 'A-101')).length >= 2);
    apiStorage.setItem('gatepass_admin_password', 'demo-only');
    assert.equal(localStorage.getItem('gatepass_admin_password'), 'real-password');
    assert.equal(networkRequests, 0);
    assert.equal(JSON.stringify(localStorage), originalLocal);
    startDemoSession('admin');
    assert.equal((await postApi.getAll()).length, 1);
    assert.equal((await visitorApi.getAll()).find(v => v._id === 'demo-visitor-1').status, 'Approved');
    assert.throws(() => startDemoSession('invalid'), /valid demo role/);
    endDemoSession();
    assert.equal(isDemoSession(), false);
    assert.equal(sessionStorage.getItem('gatepass_token'), null);
    assert.equal(Object.keys(sessionStorage).filter(key => key.startsWith('gatepass_demo:')).length, 0);
    assert.equal(sessionStorage.getItem('unrelated'), 'preserve');
    assert.equal(JSON.stringify(localStorage), originalLocal);
    assert.equal(apiStorage.getItem('gatepass_admin_password'), 'real-password');
  } finally {
    axios.defaults.adapter = originalAdapter;
  }
});

test('every real API operation rejects network and HTTP errors without changing local records', async () => {
  globalThis.localStorage = storage();
  globalThis.sessionStorage = storage();
  globalThis.window = new EventTarget();
  localStorage.setItem('gatepass_residents', JSON.stringify([{ _id: 'real-resident', email: 'admin@gatepass.com', password: 'admin123' }]));
  localStorage.setItem('gatepass_visitors', '[]');
  const before = JSON.stringify(localStorage);
  const originalAdapter = axios.defaults.adapter;
  let requests = 0;
  try {
    for (const httpStatus of [null, 401, 403, 429, 500]) {
      axios.defaults.adapter = async () => {
        requests++;
        const error = new Error('Network unavailable');
        if (httpStatus) error.response = { status: httpStatus, data: { message: `HTTP ${httpStatus}` } };
        throw error;
      };
      for (const api of [residentApi, visitorApi, postApi, notificationApi]) {
        for (const operation of Object.values(api)) await assert.rejects(operation());
      }
      assert.equal(JSON.stringify(localStorage), before);
      assert.equal(sessionStorage.getItem('gatepass_token'), null);
    }
    assert.ok(requests > 100);
    await assert.rejects(residentApi.login('admin@gatepass.com', 'admin123'));
  } finally {
    axios.defaults.adapter = originalAdapter;
  }
});

test('normal sessions reject mock, expired and unknown-role token payloads', () => {
  globalThis.sessionStorage = storage();
  const token = payload => `header.${btoa(JSON.stringify(payload))}.signature`;
  for (const payload of [{ role: 'admin' }, { role: 'admin', exp: 1 }, { role: 'owner', exp: Date.now() / 1000 + 1000 }, { role: 'admin', demo: true, exp: Date.now() / 1000 + 1000 }]) {
    sessionStorage.setItem('gatepass_token', token(payload));
    assert.equal(getUserFromToken(), null);
  }
  sessionStorage.setItem('gatepass_token', token({ role: 'resident', exp: Date.now() / 1000 + 1000 }));
  assert.equal(getUserFromToken().role, 'resident');
});
