'use strict';

const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

// ---- Use a temporary DB for each test run ----
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dikumud-test-'));
process.env.DB_PATH = path.join(tmpDir, 'test.db');

const db = require('../src/db');

after(() => {
  db._closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ---- Users ----

test('createUser and getUserByUsername', () => {
  db.createUser('alice', 'hash_alice');
  const user = db.getUserByUsername('alice');
  assert.equal(user.username, 'alice');
  assert.equal(user.password_hash, 'hash_alice');
  assert.ok(user.id > 0);
});

test('getUserByUsername is case-insensitive', () => {
  db.createUser('BobUser', 'hash_bob');
  const user = db.getUserByUsername('bobuser');
  assert.ok(user, 'should find user regardless of case');
  assert.equal(user.username, 'BobUser');
});

test('getUserByUsername returns undefined for unknown user', () => {
  const user = db.getUserByUsername('no_such_user');
  assert.equal(user, undefined);
});

test('duplicate username throws', () => {
  db.createUser('charlie', 'h1');
  assert.throws(() => db.createUser('charlie', 'h2'));
});

test('getUserById returns correct user', () => {
  const result = db.createUser('diana', 'hash_diana');
  const user = db.getUserById(result.lastInsertRowid);
  assert.equal(user.username, 'diana');
});

// ---- Characters ----

test('createCharacter and getCharacterByUserId', () => {
  const u = db.createUser('eve', 'hash_eve');
  db.createCharacter(u.lastInsertRowid, 'Evelyn');
  const char = db.getCharacterByUserId(u.lastInsertRowid);
  assert.equal(char.name, 'Evelyn');
  assert.equal(char.level, 1);
  assert.equal(char.hp, 100);
  assert.equal(char.current_room, 'town_square');
});

test('saveCharacter persists changes', () => {
  const u = db.createUser('frank', 'hash_frank');
  db.createCharacter(u.lastInsertRowid, 'Franklin');
  const char = db.getCharacterByUserId(u.lastInsertRowid);
  char.hp = 42;
  char.current_room = 'forest_edge';
  char.inventory = JSON.stringify([{ name: 'sword', type: 'weapon' }]);
  db.saveCharacter(char);

  const updated = db.getCharacterByUserId(u.lastInsertRowid);
  assert.equal(updated.hp, 42);
  assert.equal(updated.current_room, 'forest_edge');
  assert.ok(updated.inventory.includes('sword'));
});
