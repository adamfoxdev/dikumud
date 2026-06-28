'use strict';

/**
 * Static world data – rooms, items, and NPCs.
 * Each room has a unique string id, a short title, a long description,
 * and an exits map (direction -> roomId).
 */

const ROOMS = {
  town_square: {
    id: 'town_square',
    title: 'Town Square',
    description:
      'You stand in the bustling town square of Midgaard. Cobblestones pave the ground ' +
      'beneath your feet. A great fountain gurgles in the center, its water sparkling in ' +
      'the light. Merchants call out their wares from canvas stalls lining the edges.',
    exits: { north: 'temple', east: 'market', south: 'south_road', west: 'inn' },
  },
  temple: {
    id: 'temple',
    title: 'Temple of the Gods',
    description:
      'Tall stone columns support a vaulted ceiling. The air smells of incense and old ' +
      'parchment. A robed priest tends to the altar at the far end, murmuring quiet prayers. ' +
      'Soft light filters through stained-glass windows.',
    exits: { south: 'town_square' },
  },
  market: {
    id: 'market',
    title: 'Market District',
    description:
      'Rows of stalls overflow with produce, weapons, armour, and strange curios. ' +
      'Haggling voices mix into a cheerful din. The smell of fresh bread drifts from ' +
      'a bakery stall to your left.',
    exits: { west: 'town_square', north: 'blacksmith' },
  },
  blacksmith: {
    id: 'blacksmith',
    title: "Forge & Anvil - The Blacksmith's",
    description:
      'Heat radiates from a roaring forge. A muscled dwarf hammers rhythmically on a ' +
      'glowing sword blank. Tools and weapons hang from every wall. Sparks dance ' +
      'through the smoky air.',
    exits: { south: 'market' },
  },
  south_road: {
    id: 'south_road',
    title: 'South Road',
    description:
      'A dirt road winds southward toward the distant forest. Wheel-ruts from merchant ' +
      'carts scar the earth. A wooden signpost reads: \'Midgaard – 1 league north.\'',
    exits: { north: 'town_square', south: 'forest_edge' },
  },
  forest_edge: {
    id: 'forest_edge',
    title: 'Edge of the Dark Forest',
    description:
      'Ancient oaks press close on either side. The canopy is so thick that only dappled ' +
      'light reaches the mossy ground. Strange sounds echo deeper in the woods. ' +
      'Something watches you from the shadows.',
    exits: { north: 'south_road', east: 'forest_clearing' },
  },
  forest_clearing: {
    id: 'forest_clearing',
    title: 'Forest Clearing',
    description:
      'A small clearing offers a brief respite from the dense trees. A crumbling stone ' +
      'well sits in the centre, its bucket long since rotted away. Wildflowers push ' +
      'through the cracked earth around it.',
    exits: { west: 'forest_edge' },
  },
  inn: {
    id: 'inn',
    title: 'The Prancing Pony Inn',
    description:
      'Warm firelight fills this cosy common room. A stout innkeeper polishes tankards ' +
      'behind a long oak bar. Several adventurers swap tales at rough-hewn tables. ' +
      'A staircase leads up to the sleeping quarters.',
    exits: { east: 'town_square', up: 'inn_room' },
  },
  inn_room: {
    id: 'inn_room',
    title: 'Inn Room',
    description:
      'A modest room with a straw mattress, a wash-basin, and a single candle. ' +
      'It is clean enough. Through a small window you can see the town square below.',
    exits: { down: 'inn' },
  },
};

/**
 * Static item templates.
 */
const ITEM_TEMPLATES = {
  short_sword: {
    id: 'short_sword',
    name: 'short sword',
    description: 'A well-balanced short sword with a leather-wrapped hilt.',
    type: 'weapon',
    damage: 6,
    value: 25,
    weight: 3,
  },
  leather_armour: {
    id: 'leather_armour',
    name: 'leather armour',
    description: 'Supple leather armour that offers modest protection.',
    type: 'armour',
    defence: 3,
    value: 30,
    weight: 5,
  },
  bread: {
    id: 'bread',
    name: 'a loaf of bread',
    description: 'A fresh, crusty loaf of bread – restores a few hit points when eaten.',
    type: 'consumable',
    heal_hp: 15,
    value: 5,
    weight: 1,
  },
  healing_potion: {
    id: 'healing_potion',
    name: 'healing potion',
    description: 'A small vial of shimmering red liquid. Drinking it restores hit points.',
    type: 'consumable',
    heal_hp: 40,
    value: 50,
    weight: 0,
  },
  gold_coin: {
    id: 'gold_coin',
    name: 'gold coin',
    description: 'A shiny gold coin stamped with a royal crest.',
    type: 'currency',
    value: 1,
    weight: 0,
  },
};

module.exports = { ROOMS, ITEM_TEMPLATES };
