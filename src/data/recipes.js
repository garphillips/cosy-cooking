// Recipes. `ingredients` is a multiset of ingredient ids. `steps` are prep micro-games,
// `cook` is the cook-phase micro-game. `tags` are used for vague customer hints.
// `known: true` = known from the start. Others are discovered by Freestyle or bought as cards.
export const RECIPES = {
  garden_soup:      { name: 'Garden Soup',       icon: '🍲', price: 100, known: true,  ingredients: ['carrot', 'onion', 'potato', 'herb'],  steps: ['peel', 'chop', 'season'], cook: 'stir', heat: 'medium', tags: ['warm', 'savoury', 'veg'],   desc: 'Chunky, golden and gently seasoned.' },
  berry_jam:        { name: 'Berry Jam',         icon: '🫙', price: 80,  known: true,  ingredients: ['berry', 'berry', 'apple'],            steps: ['chop', 'measure'],         cook: 'stir', heat: 'low',    tags: ['sweet', 'berries', 'fruit'], desc: 'Slow-stirred until glossy.' },
  mushroom_omelette:{ name: 'Mushroom Omelette', icon: '🍳', price: 110, known: true,  ingredients: ['mushroom', 'egg', 'herb'],            steps: ['chop', 'whisk', 'season'], cook: 'flip', heat: 'medium', tags: ['warm', 'savoury', 'eggs'],  desc: 'Fluffy, folded and full of mushrooms.' },
  tomato_tart:      { name: 'Tomato Tart',       icon: '🥧', price: 130, known: true,  ingredients: ['tomato', 'wheat', 'egg'],             steps: ['chop', 'whisk', 'season'], cook: 'heat', heat: 'high',   tags: ['warm', 'savoury', 'veg'],   desc: 'Crisp pastry, sweet roasted tomatoes.' },
  honey_pancakes:   { name: 'Honey Pancakes',    icon: '🥞', price: 150, known: false, ingredients: ['wheat', 'egg', 'milk', 'honey'],      steps: ['measure', 'whisk'],        cook: 'flip', heat: 'medium', tags: ['sweet', 'warm', 'breakfast'], desc: 'A tall stack with a golden drizzle.' },
  apple_crumble:    { name: 'Apple Crumble',     icon: '🍮', price: 160, known: false, ingredients: ['apple', 'apple', 'wheat'],            steps: ['peel', 'chop', 'measure'], cook: 'heat', heat: 'high',   tags: ['sweet', 'warm', 'fruit'],   desc: 'Buttery crumble over soft apples.' },
  herb_bread:       { name: 'Herb Bread',        icon: '🍞', price: 90,  known: false, ingredients: ['wheat', 'wheat', 'herb'],             steps: ['measure', 'chop', 'season'], cook: 'heat', heat: 'high', tags: ['warm', 'savoury', 'bread'], desc: 'Crusty, fragrant, still warm.' },
  pumpkin_pie:      { name: 'Pumpkin Pie',       icon: '🥧', price: 200, known: false, ingredients: ['pumpkin', 'wheat', 'egg'],            steps: ['peel', 'chop', 'whisk'],   cook: 'heat', heat: 'medium', tags: ['sweet', 'warm', 'autumn'],  desc: 'Spiced and silky. An autumn treat.', season: 'autumn' },
  strawberry_cream: { name: 'Strawberry Cream',  icon: '🍓', price: 140, known: false, ingredients: ['strawberry', 'milk'],                 steps: ['chop', 'whisk'],           cook: 'stir', heat: 'low',    tags: ['sweet', 'berries', 'fresh', 'fruit'], desc: 'Whipped cream and ripe strawberries.' },
  forest_stew:      { name: 'Forest Stew',       icon: '🥘', price: 170, known: false, ingredients: ['mushroom', 'potato', 'onion', 'wild_thyme'], steps: ['peel', 'chop', 'season'], cook: 'stir', heat: 'low', tags: ['warm', 'savoury', 'veg'], desc: 'Deep, earthy and thyme-scented.' },
  golden_pie:       { name: 'Golden Mushroom Pie', icon: '✨', price: 320, known: false, ingredients: ['golden_mushroom', 'wheat', 'egg', 'herb'], steps: ['chop', 'whisk', 'season'], cook: 'heat', heat: 'medium', tags: ['warm', 'savoury', 'special'], desc: 'Glowing faintly. Tastes like sunshine.' },
  pear_tart:        { name: 'Pear Tart',         icon: '🍐', price: 150, known: false, ingredients: ['pear', 'wheat', 'egg'],               steps: ['peel', 'chop', 'whisk'],   cook: 'heat', heat: 'medium', tags: ['sweet', 'warm', 'fruit'],   desc: 'Elegant fanned pears on pastry.' },
  flower_salad:     { name: 'Flower Salad',      icon: '🌸', price: 120, known: false, ingredients: ['flower', 'herb', 'tomato'],           steps: ['chop', 'season'],          cook: 'stir', heat: 'low',    tags: ['fresh', 'savoury', 'veg'],  desc: 'Pretty enough to frame.' },
  honey_apples:     { name: 'Honey Baked Apples', icon: '🍯', price: 180, known: false, ingredients: ['apple', 'honey', 'wheat'],           steps: ['peel', 'measure'],         cook: 'heat', heat: 'medium', tags: ['sweet', 'warm', 'fruit'],   desc: 'Sticky, soft and golden.' },
  sage_risotto:     { name: 'Golden Sage Risotto', icon: '🌟', price: 300, known: false, ingredients: ['golden_sage', 'wheat', 'onion', 'milk'], steps: ['chop', 'measure', 'season'], cook: 'stir', heat: 'low', tags: ['warm', 'savoury', 'special'], desc: 'Creamy, rare and quietly magical.' },
  honeycomb_toast:  { name: 'Honeycomb Toast',   icon: '🐝', price: 260, known: false, ingredients: ['honeycomb', 'wheat', 'milk'],         steps: ['measure', 'chop'],         cook: 'heat', heat: 'high',   tags: ['sweet', 'warm', 'special'], desc: 'Crunchy honeycomb on thick toast.' },
};

export const RECIPE_IDS = Object.keys(RECIPES);

/** Canonical key for a multiset of ingredient ids, used for Freestyle matching. */
export function comboKey(ids) { return [...ids].sort().join('+'); }
const KEY_TO_RECIPE = {};
for (const id of RECIPE_IDS) KEY_TO_RECIPE[comboKey(RECIPES[id].ingredients)] = id;
export function findRecipeByCombo(ids) { return KEY_TO_RECIPE[comboKey(ids)] || null; }

// Vague hint definitions: what a customer might say, and which recipes satisfy it.
export const HINTS = {
  warm:    { text: 'something warm…',      test: (r) => r.tags.includes('warm') },
  sweet:   { text: 'something sweet!',     test: (r) => r.tags.includes('sweet') },
  berries: { text: 'anything with berries', test: (r) => r.tags.includes('berries') },
  savoury: { text: 'something savoury',    test: (r) => r.tags.includes('savoury') },
  fruit:   { text: 'something fruity',     test: (r) => r.tags.includes('fruit') },
  veg:     { text: 'lots of veg please',   test: (r) => r.tags.includes('veg') },
};
