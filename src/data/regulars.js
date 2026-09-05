// The small recurring cast of customers. `likes` biases which recipes they request.
// `hints` are the vague-request keys (see recipes.js HINTS) they might use.
export const REGULARS = {
  bertie:   { name: 'Bertie the Baker', short: 'Bertie', color: 0xd9a52a, likes: ['bread', 'sweet', 'warm'], hints: ['warm', 'sweet'], line: 'Smells like home in here.', pets: true },
  pip:      { name: 'Pip',              short: 'Pip',    color: 0x4a6a9a, likes: ['sweet', 'berries'],       hints: ['sweet', 'berries'], line: '...could I have… um…', shy: true },
  marigold: { name: 'Mrs Marigold',     short: 'Marigold', color: 0x7fa06a, likes: ['veg', 'savoury'],      hints: ['veg', 'savoury'], line: 'Grew those myself, I expect!', pets: true },
  wren:     { name: 'Wren the Painter', short: 'Wren',   color: 0xb8a0d8, likes: ['fruit', 'fresh', 'special'], hints: ['fruit', 'sweet'], line: 'The light in here is perfect.' },
  twins:    { name: 'Tilly & Tom',      short: 'Twins',  color: 0xe0405a, likes: ['sweet', 'breakfast'],    hints: ['sweet', 'warm'], line: 'We want the SAME thing!', pets: true },
  fern:     { name: 'Fern the Postie',  short: 'Fern',   color: 0xd9603a, likes: ['warm', 'savoury', 'eggs'], hints: ['warm', 'savoury'], line: 'Just a quick bite, on my round.' },
};
export const REGULAR_IDS = Object.keys(REGULARS);
// Sprout's favourite regular buys unsold specials at closing.
export const SPROUT_FAVOURITE = 'marigold';
