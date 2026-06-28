/* jshint esversion: 11 */
'use strict';

// ============================================================
//  DikuMUD – Client-side application
// ============================================================

const API_BASE = '';          // same origin
const WS_PROTOCOL = location.protocol === 'https:' ? 'wss' : 'ws';
const WS_URL = `${WS_PROTOCOL}://${location.host}`;

const TOKEN_KEY = 'dikumud_token';

let ws = null;
let cmdHistory = [];
let historyIdx = -1;

// ---- DOM helpers ----

const $ = (id) => document.getElementById(id);

const authScreen  = $('auth-screen');
const gameScreen  = $('game-screen');
const output      = $('output');
const cmdInput    = $('cmd-input');
const sendBtn     = $('send-btn');
const logoutBtn   = $('logout-btn');
const statName    = $('stat-name');
const statHp      = $('stat-hp');
const statMp      = $('stat-mp');
const statLevel   = $('stat-level');

// ---- Output ----

function appendOutput(html, cssClass) {
  const line = document.createElement('div');
  line.className = 'output-line' + (cssClass ? ' ' + cssClass : '');
  line.innerHTML = html;
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
}

function appendText(text, cssClass) {
  // Replace \n with <br> and preserve HTML tags that the server may emit (strong)
  const safe = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Re-allow <strong> and </strong> tags for bold formatting
    .replace(/&lt;strong&gt;/g, '<strong>')
    .replace(/&lt;\/strong&gt;/g, '</strong>')
    .replace(/\n/g, '<br>');
  appendOutput(safe, cssClass);
}

// ---- Screen switching ----

function showGame() {
  authScreen.classList.remove('active');
  gameScreen.classList.add('active');
  cmdInput.focus();
}

function showAuth() {
  gameScreen.classList.remove('active');
  authScreen.classList.add('active');
  output.innerHTML = '';
}

// ---- Auth tabs ----

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab + '-form').classList.add('active');
  });
});

// ---- Register ----

$('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username      = $('reg-username').value.trim();
  const password      = $('reg-password').value;
  const characterName = $('reg-charname').value.trim();
  const errEl  = $('reg-error');
  const succEl = $('reg-success');
  errEl.textContent  = '';
  succEl.textContent = '';

  try {
    const res  = await fetch(`${API_BASE}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, characterName }),
    });
    const data = await res.json();
    if (data.ok) {
      succEl.textContent = data.message + ' Switching to login…';
      setTimeout(() => {
        succEl.textContent = '';
        document.querySelector('.tab[data-tab="login"]').click();
        $('login-username').value = username;
      }, 1500);
    } else {
      errEl.textContent = data.message;
    }
  } catch {
    errEl.textContent = 'Network error. Is the server running?';
  }
});

// ---- Login ----

$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = $('login-username').value.trim();
  const password = $('login-password').value;
  const errEl    = $('login-error');
  errEl.textContent = '';

  try {
    const res  = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.ok) {
      sessionStorage.setItem(TOKEN_KEY, data.token);
      connectGame(data.token);
    } else {
      errEl.textContent = data.message;
    }
  } catch {
    errEl.textContent = 'Network error. Is the server running?';
  }
});

// ---- Logout ----

logoutBtn.addEventListener('click', () => {
  if (ws) {
    ws.close();
    ws = null;
  }
  sessionStorage.removeItem(TOKEN_KEY);
  showAuth();
});

// ---- WebSocket connection ----

function connectGame(token) {
  if (ws) {
    ws.close();
  }
  ws = new WebSocket(WS_URL);

  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({ type: 'auth', token }));
  });

  ws.addEventListener('message', (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      appendText('[Parse error]', 'system');
      return;
    }
    handleServerMessage(msg);
  });

  ws.addEventListener('close', () => {
    appendText('— Connection closed —', 'system');
  });

  ws.addEventListener('error', () => {
    appendText('— WebSocket error. Please refresh and try again. —', 'system');
  });

  showGame();
}

function handleServerMessage(msg) {
  switch (msg.type) {
    case 'welcome':
      appendText(msg.text, 'system');
      if (msg.stats) updateStats(msg.stats);
      break;

    case 'output':
      appendText(msg.text);
      break;

    case 'stats':
      updateStats(msg);
      break;

    case 'error':
      appendText('Error: ' + msg.text, 'system');
      break;

    case 'quit':
      if (ws) { ws.close(); ws = null; }
      sessionStorage.removeItem(TOKEN_KEY);
      showAuth();
      break;

    default:
      // Unknown message type – ignore silently
  }
}

// ---- Stats bar ----

function updateStats(s) {
  if (s.name != null)   statName.textContent  = s.name;
  if (s.hp != null)     statHp.textContent    = `${s.hp}/${s.max_hp}`;
  if (s.mp != null)     statMp.textContent    = `${s.mp}/${s.max_mp}`;
  if (s.level != null)  statLevel.textContent = s.level;
}

// ---- Send command ----

function sendCommand(text) {
  const cmd = text.trim();
  if (!cmd) return;
  appendText('> ' + cmd, 'cmd');
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'command', text: cmd }));
    // track history
    if (cmdHistory[0] !== cmd) cmdHistory.unshift(cmd);
    if (cmdHistory.length > 50) cmdHistory.pop();
    historyIdx = -1;
  } else {
    appendText('Not connected. Please log in again.', 'system');
  }
  cmdInput.value = '';
}

sendBtn.addEventListener('click', () => sendCommand(cmdInput.value));

cmdInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    sendCommand(cmdInput.value);
    return;
  }
  // Command history navigation
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    historyIdx = Math.min(historyIdx + 1, cmdHistory.length - 1);
    cmdInput.value = cmdHistory[historyIdx] || '';
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    historyIdx = Math.max(historyIdx - 1, -1);
    cmdInput.value = historyIdx === -1 ? '' : cmdHistory[historyIdx];
  }
});

// ---- Direction pad ----

document.querySelectorAll('.dir-btn').forEach((btn) => {
  btn.addEventListener('click', () => sendCommand(btn.dataset.dir));
  // Prevent double-tap zoom on iOS
  btn.addEventListener('touchend', (e) => {
    e.preventDefault();
    sendCommand(btn.dataset.dir);
  });
});

// ---- Quick-action buttons ----

document.querySelectorAll('.quick-btn').forEach((btn) => {
  btn.addEventListener('click', () => sendCommand(btn.dataset.cmd));
  btn.addEventListener('touchend', (e) => {
    e.preventDefault();
    sendCommand(btn.dataset.cmd);
  });
});

// ---- Auto-reconnect with stored token ----

(function init() {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) {
    connectGame(token);
  }
})();
