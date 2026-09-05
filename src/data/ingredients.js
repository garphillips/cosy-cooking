// All ingredients. `method` is the gathering interaction; `value` is a rough CP worth used for
// balancing and for the till summary. Rarity affects spawn odds (see spawns.js).
export const INGREDIENTS = {
  carrot:          { name: 'Carrot',          category: 'vegetable', rarity: 'common',   icon: '🥕', method: 'pull',   value: 10, color: 0xe8772a },
  onion:           { name: 'Onion',           category: 'vegetable', rarity: 'common',   icon: '🧅', method: 'pull',   value: 10, color: 0xd9b48a },
  potato:          { name: 'Potato',          category: 'vegetable', rarity: 'common',   icon: '🥔', method: 'pull',   value: 10, color: 0xb98d5a },
  tomato:          { name: 'Tomato',          category: 'vegetable', rarity: 'common',   icon: '🍅', method: 'pick',   value: 12, color: 0xd9452e },
  pumpkin:         { name: 'Pumpkin',         category: 'vegetable', rarity: 'uncommon', icon: '🎃', method: 'pick',   value: 30, color: 0xe58a2e },
  herb:            { name: 'Garden Herbs',    category: 'herb',      rarity: 'common',   icon: '🌿', method: 'pick',   value: 8,  color: 0x5f9a4a },
  wild_thyme:      { name: 'Wild Thyme',      category: 'herb',      rarity: 'uncommon', icon: '🪴', method: 'pick',   value: 18, color: 0x7aa86a },
  golden_sage:     { name: 'Golden Sage',     category: 'herb',      rarity: 'rare',     icon: '✨', method: 'pick',   value: 60, color: 0xe6c24a },
  flower:          { name: 'Edible Flowers',  category: 'herb',      rarity: 'uncommon', icon: '🌸', method: 'pick',   value: 16, color: 0xf0a3c0 },
  berry:           { name: 'Blueberries',     category: 'fruit',     rarity: 'common',   icon: '🫐', method: 'pick',   value: 12, color: 0x4b5aa8 },
  strawberry:      { name: 'Strawberries',    category: 'fruit',     rarity: 'uncommon', icon: '🍓', method: 'pick',   value: 20, color: 0xe0405a },
  apple:           { name: 'Apple',           category: 'fruit',     rarity: 'common',   icon: '🍎', method: 'shake',  value: 12, color: 0xd93a3a },
  pear:            { name: 'Pear',            category: 'fruit',     rarity: 'uncommon', icon: '🍐', method: 'shake',  value: 20, color: 0xb9c95a },
  mushroom:        { name: 'Mushroom',        category: 'mushroom',  rarity: 'common',   icon: '🍄', method: 'forage', value: 14, color: 0xc9a07a },
  golden_mushroom: { name: 'Golden Mushroom', category: 'mushroom',  rarity: 'rare',     icon: '🌟', method: 'forage', value: 70, color: 0xf2c94c },
  egg:             { name: 'Fresh Egg',       category: 'egg',       rarity: 'common',   icon: '🥚', method: 'forage', value: 10, color: 0xf3ead8 },
  milk:            { name: 'Milk',            category: 'dairy',     rarity: 'uncommon', icon: '🥛', method: 'pick',   value: 18, color: 0xfaf6ee },
  wheat:           { name: 'Wheat',           category: 'grain',     rarity: 'common',   icon: '🌾', method: 'pick',   value: 8,  color: 0xe0c274 },
  honey:           { name: 'Honey',           category: 'honey',     rarity: 'uncommon', icon: '🍯', method: 'forage', value: 24, color: 0xe8a63a },
  honeycomb:       { name: 'Honeycomb',       category: 'honey',     rarity: 'rare',     icon: '🐝', method: 'forage', value: 65, color: 0xf0b83a },
};

export const QUALITY_MULT = { 1: 1.0, 2: 1.15, 3: 1.3 };
export const RARITY_ORDER = { common: 0, uncommon: 1, rare: 2 };

export function ingredientName(id) { return INGREDIENTS[id]?.name || id; }
export function ingredientIcon(id) { return INGREDIENTS[id]?.icon || '❔'; }
export function stars(n) { return '★'.repeat(n) + '☆'.repeat(3 - n); }
