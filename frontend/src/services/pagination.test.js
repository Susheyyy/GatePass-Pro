import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchCollection } from './pagination.js';

test('collection traversal retains filters, reads all pages, and deduplicates moving records', async () => {
  const calls = [];
  const client = { async get(url, { params }) {
    calls.push({ url, ...params });
    return { data: { page: params.page, pages: 2, visitors: params.page === 1 ? [{ _id: 'one' }, { _id: 'two' }] : [{ _id: 'two' }, { _id: 'three' }] } };
  } };
  const records = await fetchCollection(client, '/api/visitors', 'visitors', { search: 'Guest', flatNo: 'A-101' });
  assert.deepEqual(records.map(row => row._id), ['one', 'two', 'three']);
  assert.deepEqual(calls.map(call => call.page), [1, 2]);
  assert.ok(calls.every(call => call.search === 'Guest' && call.flatNo === 'A-101' && call.limit === 200));
});

test('page failures reject the entire collection instead of returning partial reports', async () => {
  const client = { async get(url, { params }) {
    assert.equal(url, '/residents');
    if (params.page === 2) throw new Error('Database unavailable');
    return { data: { page: 1, pages: 2, residents: [{ _id: 'one' }] } };
  } };
  await assert.rejects(fetchCollection(client, '/residents', 'residents'), /Database unavailable/);
});

test('pagination fails closed on malformed metadata and accepts empty and legacy lists', async () => {
  for (const data of [{ page: 1, pages: 1001, posts: [] }, { page: 2, pages: 2, posts: [] }, { page: 1, pages: 2, posts: [] }, { page: 1, pages: 1, posts: [{}] }]) {
    await assert.rejects(fetchCollection({ get: async () => ({ data }) }, '/posts', 'posts'));
  }
  for (const data of [[], { page: 1, pages: 0, posts: [] }]) {
    assert.deepEqual(await fetchCollection({ get: async () => ({ data }) }, '/posts', 'posts'), []);
  }
});
