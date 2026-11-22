const { test } = require('node:test');
const assert = require('node:assert/strict');
const Post = require('../models/Post');
const posts = require('../controllers/postController');
const Notification = require('../models/Notification');

const id = '507f1f77bcf86cd799439011';
const user = { role: 'resident', residentId: id, name: 'Resident', flatNo: 'A-101', occupancyId: 'current' };
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const request = (actor = user, body = {}) => ({ user: actor, body, params: { id }, query: {} });

test('post deletion uses immutable author and occupancy identity in the atomic delete', async t => {
  const principal = posts.authorIdentity(user).authorPrincipal;
  t.mock.method(Post, 'findOneAndDelete', async filter => filter.authorPrincipal === principal || !filter.authorPrincipal ? { _id: id } : null);
  for (const [actor, expected] of [[user, 200], [{ ...user, residentId: 'other' }, 404], [{ ...user, occupancyId: 'next' }, 404], [{ ...user, role: 'admin' }, 200]]) {
    const res = response();
    await posts.deletePost(request(actor), res);
    assert.equal(res.code, expected);
  }
});

test('legacy posts cannot be claimed by a resident sharing the original flat', async t => {
  t.mock.method(Post, 'findOneAndDelete', async filter => {
    assert.equal(filter.authorPrincipal, posts.authorIdentity(user).authorPrincipal);
    assert.equal(filter.flatNo, undefined);
    return null;
  });
  const res = response(); await posts.deletePost(request(), res);
  assert.equal(res.code, 404);
});

test('comments enforce the capacity and append with one atomic update', async t => {
  t.mock.method(Post, 'findById', () => assert.fail('Read-modify-save must not be used'));
  t.mock.method(Post, 'findOneAndUpdate', async (filter, update, options) => {
    assert.deepEqual(filter[`comments.${posts.MAX_COMMENTS - 1}`], { $exists: false });
    assert.equal(update.$push.comments.authorPrincipal, posts.authorIdentity(user).authorPrincipal);
    assert.equal(update.$push.comments.text, 'New comment');
    assert.equal(options.runValidators, true);
    return null;
  });
  const res = response(); await posts.addComment(request(user, { text: ' New comment ' }), res);
  assert.equal(res.code, 409);
});

test('malformed and oversized posts and comments are rejected before database access', async t => {
  t.mock.method(Post, 'create', () => assert.fail('Invalid post reached database'));
  t.mock.method(Post, 'findOneAndUpdate', () => assert.fail('Invalid comment reached database'));
  for (const text of ['', ' ', 'x'.repeat(2001), { $ne: null }]) {
    const res = response(); await posts.addComment(request(user, { text }), res); assert.equal(res.code, 400);
  }
  for (const body of [{ title: 'x'.repeat(121), description: 'Valid' }, { title: 'Valid', description: 'x'.repeat(5001) }, { title: 'Valid', description: 'Valid', category: 'unknown' }]) {
    const res = response(); await posts.createPost(request(user, body), res); assert.equal(res.code, 400);
  }
});

test('post creation takes author fields from authentication rather than request data', async t => {
  t.mock.method(Post, 'create', async data => {
    assert.equal(data.authorPrincipal, posts.authorIdentity(user).authorPrincipal);
    assert.equal(data.authorName, user.name);
    return { _id: id, ...data };
  });
  t.mock.method(Notification, 'create', async () => ({}));
  // Avoid a database audience lookup while verifying the saved author boundary.
  t.mock.method(require('../models/Resident'), 'find', () => ({ select: async () => [] }));
  const res = response();
  await posts.createPost(request(user, { title: 'Notice', description: 'Test', authorPrincipal: 'someone-else', authorName: 'Admin' }), res);
  assert.equal(res.code, 201);
});
