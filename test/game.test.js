'use strict';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

// ---- Use a temporary DB for each test run ----
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dikumud-game-test-'));
process.env.DB_PATH = path.join(tmpDir, 'test.db');

const db   = require('../src/db');
const game = require('../src/game');

after(() => {
  db._closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function makeChar() {
  const u = db.createUser('player_' + Date.now() + Math.random(), 'hash');
  const char = game.initNewCharacter(u.lastInsertRowid, 'Hero');
  return char;
}

function collectMessages(char, cmd) {
  const msgs = [];
  game.processCommand(char, cmd, (msg) => msgs.push(msg));
  return msgs;
}

// ---- look ----

test('look describes the current room', () => {
  const char = makeChar();
  char.current_room = 'town_square';
  const msgs = collectMessages(char, 'look');
  const output = msgs.find((m) => m.type === 'output');
  assert.ok(output, 'should have an output message');
  assert.ok(output.text.includes('Town Square'));
});

test('look shows exits', () => {
  const char = makeChar();
  char.current_room = 'town_square';
  const msgs = collectMessages(char, 'look');
  const output = msgs.find((m) => m.type === 'output');
  assert.ok(output.text.includes('north') || output.text.includes('Exits'));
});

// ---- movement ----

test('moving north from town_square reaches temple', () => {
  const char = makeChar();
  char.current_room = 'town_square';
  collectMessages(char, 'north');
  assert.equal(char.current_room, 'temple');
});

test('moving to invalid direction shows error', () => {
  const char = makeChar();
  char.current_room = 'temple'; // temple only has south exit
  const msgs = collectMessages(char, 'north');
  const output = msgs.find((m) => m.type === 'output');
  assert.ok(output.text.includes('cannot go'));
});

test('direction alias n works', () => {
  const char = makeChar();
  char.current_room = 'town_square';
  collectMessages(char, 'n');
  assert.equal(char.current_room, 'temple');
});

// ---- inventory ----

test('inventory lists starting items', () => {
  const char = makeChar();
  const msgs = collectMessages(char, 'inventory');
  const output = msgs.find((m) => m.type === 'output');
  assert.ok(output.text.includes('short sword') || output.text.includes('carrying'));
});

// ---- stats ----

test('stats shows character info', () => {
  const char = makeChar();
  const msgs = collectMessages(char, 'stats');
  const output = msgs.find((m) => m.type === 'output');
  assert.ok(output.text.includes('Level'));
  assert.ok(output.text.includes('HP'));
});

// ---- eat ----

test('eat a bread item heals HP and removes it from inventory', () => {
  const char = makeChar();
  char.hp = 50;
  char.max_hp = 100;
  const before = char.inventory.length;
  collectMessages(char, 'eat bread');
  assert.ok(char.hp > 50, 'HP should increase after eating bread');
  assert.equal(char.inventory.length, before - 1, 'bread should be removed');
});

test('eat unknown item shows error', () => {
  const char = makeChar();
  const msgs = collectMessages(char, 'eat dragon');
  const output = msgs.find((m) => m.type === 'output');
  assert.ok(output.text.includes("don't have"));
});

// ---- help ----

test('help lists commands', () => {
  const char = makeChar();
  const msgs = collectMessages(char, 'help');
  const output = msgs.find((m) => m.type === 'output');
  assert.ok(output.text.includes('look'));
  assert.ok(output.text.includes('inventory'));
});

// ---- unknown command ----

test('unknown command shows error', () => {
  const char = makeChar();
  const msgs = collectMessages(char, 'frobnicate');
  const output = msgs.find((m) => m.type === 'output');
  assert.ok(output.text.includes('Unknown command'));
});

// ---- quit ----

test('quit sends quit message', () => {
  const char = makeChar();
  const msgs = collectMessages(char, 'quit');
  assert.ok(msgs.some((m) => m.type === 'quit'));
});
