'use strict';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

// ---- Use a temporary DB for each test run ----
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dikumud-auth-test-'));
process.env.DB_PATH = path.join(tmpDir, 'test.db');

const auth = require('../src/auth');
const db   = require('../src/db');

after(() => {
  db._closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('register creates a user with a hashed password', async () => {
  const { userId } = await auth.register('testuser', 'password123');
  assert.ok(userId > 0);
  const user = db.getUserById(userId);
  assert.equal(user.username, 'testuser');
  assert.notEqual(user.password_hash, 'password123');
});

test('register rejects invalid username', async () => {
  await assert.rejects(
    () => auth.register('ab', 'password123'),
    /Username must be/
  );
  await assert.rejects(
    () => auth.register('has space', 'password123'),
    /Username must be/
  );
});

test('register rejects short password', async () => {
  await assert.rejects(
    () => auth.register('validuser', '123'),
    /at least 6 characters/
  );
});

test('register rejects duplicate username', async () => {
  await auth.register('dupuser', 'password123');
  await assert.rejects(
    () => auth.register('dupuser', 'otherpass'),
    /already taken/
  );
});

test('login returns a token for valid credentials', async () => {
  await auth.register('loginuser', 'securepass');
  const result = await auth.login('loginuser', 'securepass');
  assert.ok(result.token);
  assert.equal(result.username, 'loginuser');
});

test('login rejects wrong password', async () => {
  await auth.register('wrongpw', 'correctpass');
  await assert.rejects(
    () => auth.login('wrongpw', 'wrongpass'),
    /Invalid username or password/
  );
});

test('login rejects unknown user', async () => {
  await assert.rejects(
    () => auth.login('nobody', 'anything'),
    /Invalid username or password/
  );
});

test('verifyToken returns payload for valid token', async () => {
  await auth.register('tokenuser', 'tokenpass');
  const { token } = await auth.login('tokenuser', 'tokenpass');
  const payload = auth.verifyToken(token);
  assert.ok(payload);
  assert.equal(payload.username, 'tokenuser');
});

test('verifyToken returns null for invalid token', () => {
  const result = auth.verifyToken('not.a.real.token');
  assert.equal(result, null);
});
