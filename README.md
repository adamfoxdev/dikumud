# DikuMUD

A classic text-based MUD (Multi-User Dungeon) game with a **mobile-friendly web interface**, a **SQLite database backend**, and **simple username/password authentication**.

---

## Features

- 🗺️ **Text-based game world** – rooms, movement (N/S/E/W/U/D), inventory, stats, consumables
- 📱 **Mobile-first UI** – responsive layout with a direction pad, quick-action buttons and command history
- 🔐 **Simple auth** – register/login with username & password (bcrypt-hashed, JWT sessions)
- 🗄️ **SQLite backend** – characters and accounts persisted with `better-sqlite3`
- 🔌 **Real-time WebSocket** – instant command/response without page reloads

---

## Requirements

- Node.js 18 or higher
- npm

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the server (default port 3000)
npm start

# 3. Open a browser (desktop or mobile)
open http://localhost:3000
```

Set `PORT` to change the listening port, and `JWT_SECRET` to a strong random string in production:

```bash
PORT=8080 JWT_SECRET=your-secret npm start
```

The SQLite database file is stored at `data/dikumud.db` by default (created automatically).

---

## Running Tests

```bash
npm test
```

All unit tests use Node's built-in `node:test` runner – no extra test framework needed.

---

## Project Structure

```
.
├── server.js          # Express + WebSocket server
├── src/
│   ├── auth.js        # Registration, login, JWT verification
│   ├── db.js          # SQLite database helpers
│   ├── game.js        # Game engine – commands, character management
│   └── world.js       # Static world data – rooms, item templates
├── public/
│   ├── index.html     # Single-page mobile-friendly UI
│   ├── style.css      # Dark theme, responsive CSS
│   └── app.js         # Client-side WebSocket game client
├── test/
│   ├── db.test.js     # Database layer tests
│   ├── auth.test.js   # Auth tests
│   └── game.test.js   # Game engine tests
└── data/              # (auto-created) SQLite database lives here
```

---

## Commands In-Game

| Command | Description |
|---------|-------------|
| `look` / `l` | Describe your current room |
| `north` / `n`, `south` / `s`, … | Move in a direction |
| `go <dir>` | Alternative movement syntax |
| `inventory` / `inv` | List carried items |
| `stats` / `score` | Show character statistics |
| `eat <item>` | Eat a consumable item |
| `drink <item>` | Drink a consumable item |
| `say <message>` | Say something aloud |
| `help` / `?` | List available commands |
| `quit` | Save and disconnect |

---

## Security Notes

- Passwords are stored as bcrypt hashes (cost factor 10).
- JWT tokens expire after 24 hours.
- **Always set `JWT_SECRET` to a strong random value in production.**
- SQLite WAL mode and foreign-key enforcement are enabled by default.
