// Shop inventory + free starter cosmetics. `slot` is the rig socket the cosmetic occupies.
// `starter: true` items are owned from the beginning and used by the character creator.
// Non-cosmetic upgrades use slot 'upgrade' / 'decor' / 'recipe'.
export const ITEMS = {
  // ---- Hair (starter, free) ----
  hair_bun:        { name: 'Bun',          slot: 'hair', price: 0, starter: true, icon: '👱‍♀️' },
  hair_ponytail:   { name: 'Ponytail',     slot: 'hair', price: 0, starter: true, icon: '👱‍♀️' },
  hair_braids:     { name: 'Twin Braids',  slot: 'hair', price: 0, starter: true, icon: '👱‍♀️' },
  hair_bob:        { name: 'Bob',          slot: 'hair', price: 0, starter: true, icon: '👱‍♀️' },
  hair_long:       { name: 'Long',         slot: 'hair', price: 0, starter: true, icon: '👱‍♀️' },
  hair_curls:      { name: 'Short Curls',  slot: 'hair', price: 0, starter: true, icon: '👱‍♀️' },
  hair_tints:      { name: 'Hair Colour Tints', slot: 'unlock', price: 400, icon: '🎨', desc: 'Unlocks the hair colour slider in the wardrobe.' },

  // ---- Headwear ----
  hat_none:        { name: 'No Headwear',  slot: 'hat', price: 0, starter: true, icon: '🚫' },
  hat_scarf_yellow:{ name: 'Polka-dot Headscarf', slot: 'hat', price: 0, starter: true, icon: '🎀', color: 0xf0b32e },
  hat_straw:       { name: 'Straw Hat',    slot: 'hat', price: 150, icon: '👒', color: 0xe6c988 },
  hat_beret:       { name: 'Red Beret',    slot: 'hat', price: 180, icon: '🧢', color: 0xc84a3a },
  hat_flowers:     { name: 'Flower Crown', slot: 'hat', price: 220, icon: '🌼', color: 0xf0a3c0 },
  hat_beanie:      { name: 'Sage Beanie',  slot: 'hat', price: 160, icon: '🧶', color: 0x7fa06a },
  hat_chef:        { name: 'Chef Hat',     slot: 'hat', price: 260, icon: '👩‍🍳', color: 0xf8f4ea },
  hat_bunny:       { name: 'Bunny Ears',   slot: 'hat', price: 300, icon: '🐰', color: 0xf3e8e8 },
  hat_witch:       { name: 'Witch Hat',    slot: 'hat', price: 350, icon: '🧙‍♀️', color: 0x4a3a6a },

  // ---- Tops ----
  top_blouse:      { name: 'White Blouse', slot: 'top', price: 0, starter: true, icon: '👚', color: 0xf6efe2 },
  top_tee_sage:    { name: 'Sage Tee',     slot: 'top', price: 0, starter: true, icon: '👕', color: 0x7fa06a },
  top_tee_rose:    { name: 'Rose Tee',     slot: 'top', price: 0, starter: true, icon: '👕', color: 0xe6a0b0 },
  top_tee_sky:     { name: 'Sky Tee',      slot: 'top', price: 0, starter: true, icon: '👕', color: 0x9ccbe0 },
  top_cardigan:    { name: 'Mustard Cardigan', slot: 'top', price: 220, icon: '🧥', color: 0xd9a52a },
  top_sailor:      { name: 'Sailor Top',   slot: 'top', price: 260, icon: '⛵', color: 0xf4f1ea, accent: 0x2f4a7a },
  top_hoodie:      { name: 'Lilac Hoodie', slot: 'top', price: 240, icon: '🧥', color: 0xb8a0d8 },
  top_apron_red:   { name: 'Red Apron',    slot: 'top', price: 280, icon: '🥼', color: 0xd9603a },
  top_stripes:     { name: 'Stripy Sweater', slot: 'top', price: 300, icon: '🧶', color: 0xf0e8d0, accent: 0xd9603a },
  top_floral:      { name: 'Floral Blouse', slot: 'top', price: 320, icon: '🌸', color: 0xfbe4ec, accent: 0xe07090 },

  // ---- Bottoms / dresses ----
  bot_green_apron: { name: 'Green Apron Dress', slot: 'bottom', price: 0, starter: true, icon: '👗', color: 0x5c7d4a },
  bot_skirt_brown: { name: 'Brown Skirt',  slot: 'bottom', price: 0, starter: true, icon: '👗', color: 0x8b5a2b },
  bot_shorts_blue: { name: 'Blue Shorts',  slot: 'bottom', price: 0, starter: true, icon: '🩳', color: 0x4a6a9a },
  bot_dress_cream: { name: 'Cream Dress',  slot: 'bottom', price: 0, starter: true, icon: '👗', color: 0xf3e6c8 },
  bot_sunflower:   { name: 'Sunflower Dress', slot: 'bottom', price: 300, icon: '🌻', color: 0xf2c94c },
  bot_dungarees:   { name: 'Dungarees',    slot: 'bottom', price: 340, icon: '👖', color: 0x4a6a9a },
  bot_tartan:      { name: 'Tartan Skirt', slot: 'bottom', price: 280, icon: '🏴', color: 0x9a3a3a },
  bot_sky_dress:   { name: 'Sky Dress',    slot: 'bottom', price: 320, icon: '👗', color: 0xa9d3e6 },
  bot_strawberry:  { name: 'Strawberry Dress', slot: 'bottom', price: 450, icon: '🍓', color: 0xe0405a },

  // ---- Shoes ----
  shoe_boots:      { name: 'Brown Boots',  slot: 'shoes', price: 0, starter: true, icon: '🥾', color: 0x6b4423 },
  shoe_red:        { name: 'Red Shoes',    slot: 'shoes', price: 0, starter: true, icon: '👞', color: 0xc84a3a },
  shoe_sandals:    { name: 'Sandals',      slot: 'shoes', price: 0, starter: true, icon: '👡', color: 0xc9a06a },
  shoe_clogs:      { name: 'Clogs',        slot: 'shoes', price: 0, starter: true, icon: '🥿', color: 0xd9b48a },
  shoe_wellies:    { name: 'Yellow Wellies', slot: 'shoes', price: 180, icon: '👢', color: 0xf2c94c },
  shoe_trainers:   { name: 'White Trainers', slot: 'shoes', price: 200, icon: '👟', color: 0xf6f2ea },
  shoe_maryjanes:  { name: 'Mary Janes',   slot: 'shoes', price: 220, icon: '👠', color: 0x3a2a2a },
  shoe_cat:        { name: 'Cat Slippers', slot: 'shoes', price: 260, icon: '🐱', color: 0x9a9aa8 },

  // ---- Accessories ----
  acc_none:        { name: 'No Accessory', slot: 'accessory', price: 0, starter: true, icon: '🚫' },
  acc_glasses:     { name: 'Glasses',      slot: 'accessory', price: 0, starter: true, icon: '👓', color: 0x4a3420 },
  acc_satchel:     { name: 'Satchel',      slot: 'accessory', price: 0, starter: true, icon: '👜', color: 0x8b5a2b },
  acc_flower:      { name: 'Hair Flower',  slot: 'accessory', price: 0, starter: true, icon: '🌼', color: 0xf2c94c },
  acc_round_glasses:{ name: 'Round Glasses', slot: 'accessory', price: 150, icon: '🕶️', color: 0xc84a3a },
  acc_scarf:       { name: 'Knitted Scarf', slot: 'accessory', price: 200, icon: '🧣', color: 0xd9603a },
  acc_basket_bag:  { name: 'Basket Bag',   slot: 'accessory', price: 240, icon: '🧺', color: 0xd9b48a },
  acc_teacup:      { name: 'Teacup Bag',   slot: 'accessory', price: 320, icon: '☕', color: 0xf6efe2 },
  acc_ribbon:      { name: 'Ribbon Bow',   slot: 'accessory', price: 130, icon: '🎀', color: 0xe0405a },
  acc_wings:       { name: 'Butterfly Wings', slot: 'accessory', price: 500, icon: '🦋', color: 0xa9d3e6 },

  // ---- Sprout ----
  cat_green:       { name: 'Green Scarf',  slot: 'cat', price: 0, starter: true, icon: '🟢', color: 0x5c7d4a },
  cat_red:         { name: 'Red Collar',   slot: 'cat', price: 0, starter: true, icon: '🔴', color: 0xc84a3a },
  cat_blue:        { name: 'Blue Collar',  slot: 'cat', price: 0, starter: true, icon: '🔵', color: 0x4a6a9a },
  cat_yellow:      { name: 'Yellow Collar', slot: 'cat', price: 0, starter: true, icon: '🟡', color: 0xf2c94c },
  cat_gingham:     { name: 'Gingham Bandana', slot: 'cat', price: 120, icon: '🟩', color: 0x8fbf7a },
  cat_bell:        { name: 'Bell Collar',  slot: 'cat', price: 160, icon: '🔔', color: 0xd9a52a },
  cat_bowtie:      { name: 'Bow Tie',      slot: 'cat', price: 200, icon: '🎀', color: 0x3a2a2a },
  cat_hat:         { name: 'Tiny Hat',     slot: 'cat', price: 300, icon: '🎩', color: 0x4a3a6a },

  // ---- Upgrades ----
  basket_1:        { name: 'Bigger Basket (10)', slot: 'upgrade', price: 250, icon: '🧺', desc: 'Basket holds 10 ingredients.', effect: { basket: 10 } },
  basket_2:        { name: 'Biggest Basket (12)', slot: 'upgrade', price: 500, icon: '🧺', desc: 'Basket holds 12 ingredients.', effect: { basket: 12 }, requires: 'basket_1' },
  fourth_table:    { name: 'Fourth Table',  slot: 'upgrade', price: 600, icon: '🪑', desc: 'One more regular can be seated per visit.', effect: { tables: 4 } },

  // ---- Recipe cards ----
  recipe_honey_pancakes: { name: 'Recipe: Honey Pancakes', slot: 'recipe', price: 200, icon: '🥞', recipe: 'honey_pancakes' },
  recipe_apple_crumble:  { name: 'Recipe: Apple Crumble',  slot: 'recipe', price: 220, icon: '🍮', recipe: 'apple_crumble' },
  recipe_herb_bread:     { name: 'Recipe: Herb Bread',     slot: 'recipe', price: 180, icon: '🍞', recipe: 'herb_bread' },
  recipe_pumpkin_pie:    { name: 'Recipe: Pumpkin Pie',    slot: 'recipe', price: 350, icon: '🥧', recipe: 'pumpkin_pie' },

  // ---- Restaurant decorations ----
  decor_curtains_gingham: { name: 'Gingham Curtains', slot: 'decor', price: 200, icon: '🪟', decor: 'curtains', color: 0x8fbf7a },
  decor_pot_blue:         { name: 'Blue Pot',         slot: 'decor', price: 180, icon: '🫕', decor: 'pot', color: 0x4a7aa8 },
  decor_tablecloth_red:   { name: 'Red Tablecloths',  slot: 'decor', price: 220, icon: '🟥', decor: 'tablecloth', color: 0xd9603a },
  decor_wall_sunflower:   { name: 'Sunflower Painting', slot: 'decor', price: 260, icon: '🖼️', decor: 'wallart', color: 0xf2c94c },
  decor_chalkboard:       { name: 'Fancy Chalkboard', slot: 'decor', price: 240, icon: '📋', decor: 'chalkboard', color: 0x2f3a2a },
};

export const ITEM_IDS = Object.keys(ITEMS);
export const COSMETIC_SLOTS = ['hair', 'hat', 'top', 'bottom', 'shoes', 'accessory', 'cat'];
export const SLOT_NAMES = { hair: 'Hairstyle', hat: 'Headwear', top: 'Top', bottom: 'Bottom / Dress', shoes: 'Shoes', accessory: 'Accessory', cat: 'Sprout', upgrade: 'Upgrades', recipe: 'Recipe Cards', decor: 'Restaurant Decor', unlock: 'Unlocks' };
export const STARTER_ITEMS = ITEM_IDS.filter((id) => ITEMS[id].starter);
export const DEFAULT_EQUIPPED = { hair: 'hair_bun', hat: 'hat_scarf_yellow', top: 'top_blouse', bottom: 'bot_green_apron', shoes: 'shoe_boots', accessory: 'acc_none', cat: 'cat_green' };

/** Deterministic "New today" shelf: 3 non-starter items seeded by the real-world date. */
export function newTodayItems(date = new Date()) {
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  let s = seed;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const pool = ITEM_IDS.filter((id) => !ITEMS[id].starter && ['hat', 'top', 'bottom', 'shoes', 'accessory', 'cat'].includes(ITEMS[id].slot));
  const out = [];
  while (out.length < 3 && pool.length) { const i = Math.floor(rnd() * pool.length); out.push(pool.splice(i, 1)[0]); }
  return out;
}
