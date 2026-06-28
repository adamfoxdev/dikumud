'use strict';

const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');
const auth = require('./src/auth');
const game = require('./src/game');
const db = require('./src/db');

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---- Simple in-memory rate limiter ----
// Limits auth endpoints to maxRequests per windowMs per IP.

function createRateLimiter({ windowMs = 60_000, maxRequests = 10 } = {}) {
  const hits = new Map(); // ip -> { count, resetAt }
  return function rateLimiter(req, res, next) {
    const ip = req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    let record = hits.get(ip);
    if (!record || now > record.resetAt) {
      record = { count: 0, resetAt: now + windowMs };
      hits.set(ip, record);
    }
    record.count += 1;
    if (record.count > maxRequests) {
      return res.status(429).json({ ok: false, message: 'Too many requests. Please wait and try again.' });
    }
    next();
  };
}

const authLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });

// ---- REST auth routes ----

app.post('/api/register', authLimiter, async (req, res) => {
  const { username, password, characterName } = req.body || {};
  try {
    const { userId } = await auth.register(username, password);
    const charName = (characterName || username).trim().slice(0, 20);
    game.initNewCharacter(userId, charName);
    res.json({ ok: true, message: 'Account created. You may now log in.' });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
});

app.post('/api/login', authLimiter, async (req, res) => {
  const { username, password } = req.body || {};
  try {
    const result = await auth.login(username, password);
    res.json({ ok: true, token: result.token, username: result.username });
  } catch (err) {
    res.status(401).json({ ok: false, message: err.message });
  }
});

// ---- HTTP server ----

const server = http.createServer(app);

// ---- WebSocket server ----

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  let char = null;

  function send(payload) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  ws.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      send({ type: 'error', text: 'Malformed message.' });
      return;
    }

    // Authentication handshake
    if (msg.type === 'auth') {
      const payload = auth.verifyToken(msg.token);
      if (!payload) {
        send({ type: 'error', text: 'Invalid or expired token. Please log in again.' });
        ws.close();
        return;
      }
      char = game.loadCharacter(payload.userId);
      if (!char) {
        send({ type: 'error', text: 'Character not found.' });
        ws.close();
        return;
      }
      send({
        type: 'welcome',
        text: `Welcome back, ${char.name}!`,
        stats: {
          name: char.name,
          level: char.level,
          hp: char.hp,
          max_hp: char.max_hp,
          mp: char.mp,
          max_mp: char.max_mp,
        },
      });
      // Show room on connect
      game.processCommand(char, 'look', send);
      return;
    }

    // All other messages require authentication
    if (!char) {
      send({ type: 'error', text: 'Not authenticated.' });
      return;
    }

    if (msg.type === 'command') {
      game.processCommand(char, msg.text, (payload) => {
        send(payload);
        // After command, send updated stats if HP/MP may have changed
        if (payload.type === 'output') {
          send({
            type: 'stats',
            hp: char.hp,
            max_hp: char.max_hp,
            mp: char.mp,
            max_mp: char.max_mp,
            level: char.level,
            gold: char.gold,
          });
        }
      });
    }
  });

  ws.on('close', () => {
    if (char) {
      game.persistCharacter(char);
    }
  });
});

// ---- Start ----

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`DikuMUD server running at http://localhost:${PORT}`);
  });
}

module.exports = { app, server };
