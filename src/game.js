'use strict';

const db = require('./db');
const { ROOMS, ITEM_TEMPLATES } = require('./world');

const DIRECTION_ALIASES = {
  n: 'north',
  s: 'south',
  e: 'east',
  w: 'west',
  u: 'up',
  d: 'down',
  ne: 'northeast',
  nw: 'northwest',
  se: 'southeast',
  sw: 'southwest',
};

const EXP_PER_LEVEL = 100; // experience needed per level

// ---- Character helpers ----

function loadCharacter(userId) {
  let char = db.getCharacterByUserId(userId);
  if (!char) return null;
  char.inventory = JSON.parse(char.inventory || '[]');
  return char;
}

function persistCharacter(char) {
  db.saveCharacter(char);
}

// ---- Command dispatcher ----

function processCommand(char, rawInput, sendFn) {
  const input = (rawInput || '').trim();
  if (!input) return;

  const [cmd, ...args] = input.toLowerCase().split(/\s+/);
  const rest = args.join(' ');

  switch (cmd) {
    case 'look':
    case 'l':
      return cmdLook(char, sendFn);

    case 'north':
    case 'south':
    case 'east':
    case 'west':
    case 'up':
    case 'down':
    case 'northeast':
    case 'northwest':
    case 'southeast':
    case 'southwest':
    case 'go':
      return cmdMove(char, cmd === 'go' ? rest : cmd, sendFn);

    case 'n':
    case 's':
    case 'e':
    case 'w':
    case 'u':
    case 'd':
    case 'ne':
    case 'nw':
    case 'se':
    case 'sw':
      return cmdMove(char, DIRECTION_ALIASES[cmd], sendFn);

    case 'inventory':
    case 'inv':
    case 'i':
      return cmdInventory(char, sendFn);

    case 'stats':
    case 'score':
    case 'sc':
      return cmdStats(char, sendFn);

    case 'eat':
      return cmdEat(char, rest, sendFn);

    case 'drink':
      return cmdDrink(char, rest, sendFn);

    case 'say':
      return cmdSay(char, rest, sendFn);

    case 'help':
    case '?':
      return cmdHelp(sendFn);

    case 'quit':
    case 'exit':
      sendFn({ type: 'output', text: 'Farewell, adventurer! Your progress has been saved.' });
      sendFn({ type: 'quit' });
      return;

    default:
      sendFn({ type: 'output', text: `Unknown command: '${cmd}'. Type 'help' for a list of commands.` });
  }
}

// ---- Commands ----

function cmdLook(char, sendFn) {
  const room = ROOMS[char.current_room];
  if (!room) {
    sendFn({ type: 'output', text: 'You are lost in a void. There is nothing here.' });
    return;
  }

  const exitList = Object.keys(room.exits).join(', ');
  const lines = [
    `<strong>${room.title}</strong>`,
    room.description,
    `Exits: ${exitList || 'none'}`,
  ];
  sendFn({ type: 'output', text: lines.join('\n') });
}

function cmdMove(char, direction, sendFn) {
  const room = ROOMS[char.current_room];
  if (!room) {
    sendFn({ type: 'output', text: 'You cannot move from here.' });
    return;
  }
  const target = room.exits[direction];
  if (!target) {
    sendFn({ type: 'output', text: `You cannot go ${direction} from here.` });
    return;
  }
  char.current_room = target;
  persistCharacter(char);
  cmdLook(char, sendFn);
}

function cmdInventory(char, sendFn) {
  if (!char.inventory || char.inventory.length === 0) {
    sendFn({ type: 'output', text: 'You are carrying nothing.' });
    return;
  }
  const lines = char.inventory.map((item) => `  - ${item.name}`);
  sendFn({ type: 'output', text: 'You are carrying:\n' + lines.join('\n') });
}

function cmdStats(char, sendFn) {
  const lines = [
    `<strong>Character: ${char.name}</strong>`,
    `Level      : ${char.level}`,
    `HP         : ${char.hp} / ${char.max_hp}`,
    `MP         : ${char.mp} / ${char.max_mp}`,
    `Experience : ${char.experience} / ${char.level * EXP_PER_LEVEL}`,
    `Gold       : ${char.gold}`,
    `Strength   : ${char.strength}`,
    `Dexterity  : ${char.dexterity}`,
    `Intelligence: ${char.intelligence}`,
    `Location   : ${ROOMS[char.current_room] ? ROOMS[char.current_room].title : char.current_room}`,
  ];
  sendFn({ type: 'output', text: lines.join('\n') });
}

function cmdEat(char, itemName, sendFn) {
  return useConsumable(char, itemName, 'eat', sendFn);
}

function cmdDrink(char, itemName, sendFn) {
  return useConsumable(char, itemName, 'drink', sendFn);
}

function useConsumable(char, itemName, action, sendFn) {
  if (!itemName) {
    sendFn({ type: 'output', text: `${action} what?` });
    return;
  }
  const idx = char.inventory.findIndex((i) =>
    i.name.toLowerCase().includes(itemName.toLowerCase())
  );
  if (idx === -1) {
    sendFn({ type: 'output', text: `You don't have a '${itemName}'.` });
    return;
  }
  const item = char.inventory[idx];
  if (item.type !== 'consumable') {
    sendFn({ type: 'output', text: `You can't ${action} that.` });
    return;
  }
  let msg = `You ${action} the ${item.name}.`;
  if (item.heal_hp) {
    const healed = Math.min(item.heal_hp, char.max_hp - char.hp);
    char.hp = Math.min(char.hp + item.heal_hp, char.max_hp);
    msg += ` You feel better. (+${healed} HP)`;
  }
  char.inventory.splice(idx, 1);
  persistCharacter(char);
  sendFn({ type: 'output', text: msg });
  sendFn({ type: 'stats', hp: char.hp, max_hp: char.max_hp, mp: char.mp, max_mp: char.max_mp });
}

function cmdSay(char, message, sendFn) {
  if (!message) {
    sendFn({ type: 'output', text: 'Say what?' });
    return;
  }
  sendFn({ type: 'output', text: `You say, "${message}"` });
}

function cmdHelp(sendFn) {
  const lines = [
    '<strong>Available Commands</strong>',
    '  look / l          – Describe your surroundings',
    '  north/south/east/west/up/down  – Move in a direction (or n/s/e/w/u/d)',
    '  go <direction>    – Same as typing the direction',
    '  inventory / inv   – List what you carry',
    '  stats / score     – Show your character statistics',
    '  eat <item>        – Eat a consumable item',
    '  drink <item>      – Drink a consumable item',
    '  say <message>     – Say something aloud',
    '  help / ?          – Show this help',
    '  quit              – Save and disconnect',
  ];
  sendFn({ type: 'output', text: lines.join('\n') });
}

// ---- New character initialisation ----

function initNewCharacter(userId, name) {
  const result = db.createCharacter(userId, name);
  const char = db.getCharacterByUserId(userId);
  char.inventory = [
    { ...ITEM_TEMPLATES.short_sword },
    { ...ITEM_TEMPLATES.bread },
    { ...ITEM_TEMPLATES.healing_potion },
  ];
  char.gold = 10;
  db.saveCharacter({ ...char, inventory: JSON.stringify(char.inventory) });
  return char;
}

module.exports = { loadCharacter, initNewCharacter, processCommand, persistCharacter };
