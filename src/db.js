'use strict';

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'dikumud.db');

let db;

function getDb() {
  if (!db) {
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      username  TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS characters (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name         TEXT    NOT NULL,
      level        INTEGER NOT NULL DEFAULT 1,
      hp           INTEGER NOT NULL DEFAULT 100,
      max_hp       INTEGER NOT NULL DEFAULT 100,
      mp           INTEGER NOT NULL DEFAULT 50,
      max_mp       INTEGER NOT NULL DEFAULT 50,
      strength     INTEGER NOT NULL DEFAULT 10,
      dexterity    INTEGER NOT NULL DEFAULT 10,
      intelligence INTEGER NOT NULL DEFAULT 10,
      experience   INTEGER NOT NULL DEFAULT 0,
      gold         INTEGER NOT NULL DEFAULT 0,
      current_room TEXT    NOT NULL DEFAULT 'town_square',
      inventory    TEXT    NOT NULL DEFAULT '[]',
      created_at   INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
  `);
}

// ---- User helpers ----

function createUser(username, passwordHash) {
  const stmt = getDb().prepare(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)'
  );
  return stmt.run(username, passwordHash);
}

function getUserByUsername(username) {
  return getDb().prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function getUserById(id) {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id);
}

// ---- Character helpers ----

function createCharacter(userId, name) {
  const stmt = getDb().prepare(
    `INSERT INTO characters (user_id, name) VALUES (?, ?)`
  );
  return stmt.run(userId, name);
}

function getCharacterByUserId(userId) {
  return getDb().prepare('SELECT * FROM characters WHERE user_id = ?').get(userId);
}

function saveCharacter(character) {
  const stmt = getDb().prepare(`
    UPDATE characters SET
      hp           = ?,
      max_hp       = ?,
      mp           = ?,
      max_mp       = ?,
      level        = ?,
      experience   = ?,
      gold         = ?,
      strength     = ?,
      dexterity    = ?,
      intelligence = ?,
      current_room = ?,
      inventory    = ?
    WHERE id = ?
  `);
  return stmt.run(
    character.hp,
    character.max_hp,
    character.mp,
    character.max_mp,
    character.level,
    character.experience,
    character.gold,
    character.strength,
    character.dexterity,
    character.intelligence,
    character.current_room,
    typeof character.inventory === 'string'
      ? character.inventory
      : JSON.stringify(character.inventory),
    character.id
  );
}

// ---- In-test helper ----
function _closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  getDb,
  createUser,
  getUserByUsername,
  getUserById,
  createCharacter,
  getCharacterByUserId,
  saveCharacter,
  _closeDb,
};
