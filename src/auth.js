'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');

const SALT_ROUNDS = 10;
const DEFAULT_SECRET = 'dikumud-dev-secret-change-in-production';
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable must be set in production.');
}
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_SECRET;
const JWT_EXPIRES_IN = '24h';

const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
const PASSWORD_MIN = 6;

async function register(username, password) {
  if (!USERNAME_RE.test(username)) {
    throw new Error('Username must be 3–20 alphanumeric characters or underscores.');
  }
  if (typeof password !== 'string' || password.length < PASSWORD_MIN) {
    throw new Error(`Password must be at least ${PASSWORD_MIN} characters.`);
  }
  const existing = db.getUserByUsername(username);
  if (existing) {
    throw new Error('Username already taken.');
  }
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = db.createUser(username, hash);
  return { userId: result.lastInsertRowid };
}

async function login(username, password) {
  const user = db.getUserByUsername(username);
  if (!user) {
    throw new Error('Invalid username or password.');
  }
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    throw new Error('Invalid username or password.');
  }
  const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
  return { token, userId: user.id, username: user.username };
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = { register, login, verifyToken };
