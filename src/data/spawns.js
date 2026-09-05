// Hand-laid spawn points for each gathering area. Each point has a position and a list of
// ingredient ids it may spawn (weighted by rarity). `kind` fixes the visual/interaction type.
// Positions are in the area's local space (metres). The map is not procedural; only which
// ingredient appears at each point is randomised per visit.

const W = { common: 1.0, uncommon: 0.45, rare: 0.12 };
export const RARITY_WEIGHT = W;

export const AREAS = {
  garden: {
    name: 'The Garden',
    size: { w: 34, d: 30 },
    gate: { x: 0, z: 13 },
    spawns: [
      // vegetable beds (pull)
      { x: -9, z: -4, kind: 'pull', pool: ['carrot', 'onion', 'potato'] },
      { x: -7, z: -4, kind: 'pull', pool: ['carrot', 'onion', 'potato'] },
      { x: -5, z: -4, kind: 'pull', pool: ['carrot', 'onion', 'potato'] },
      { x: -9, z: -1, kind: 'pull', pool: ['carrot', 'potato'] },
      { x: -7, z: -1, kind: 'pull', pool: ['onion', 'potato'] },
      { x: -5, z: -1, kind: 'pull', pool: ['carrot', 'onion'] },
      { x: -9, z: 2, kind: 'pull', pool: ['carrot', 'onion', 'potato'] },
      { x: -7, z: 2, kind: 'pull', pool: ['carrot', 'onion', 'potato'] },
      // tomato & herb bed (pick)
      { x: 0, z: -6, kind: 'pick', pool: ['tomato', 'tomato', 'pumpkin'] },
      { x: 2, z: -6, kind: 'pick', pool: ['tomato'] },
      { x: 4, z: -6, kind: 'pick', pool: ['tomato', 'pumpkin'] },
      { x: 0, z: -3, kind: 'pick', pool: ['herb'] },
      { x: 2, z: -3, kind: 'pick', pool: ['herb', 'flower'] },
      { x: 4, z: -3, kind: 'pick', pool: ['herb', 'golden_sage'] },
      // berry hedge
      { x: 9, z: -8, kind: 'pick', pool: ['berry'] },
      { x: 11, z: -6, kind: 'pick', pool: ['berry', 'strawberry'] },
      { x: 12, z: -3, kind: 'pick', pool: ['berry'] },
      // wheat patch
      { x: 8, z: 2, kind: 'pick', pool: ['wheat'] },
      { x: 10, z: 2, kind: 'pick', pool: ['wheat'] },
      { x: 12, z: 2, kind: 'pick', pool: ['wheat'] },
      { x: 9, z: 5, kind: 'pick', pool: ['wheat'] },
      { x: 11, z: 5, kind: 'pick', pool: ['wheat'] },
      // apple trees (shake)
      { x: -12, z: -10, kind: 'shake', pool: ['apple'] },
      { x: 12, z: 9, kind: 'shake', pool: ['apple'] },
      // forage: mushrooms in the shady corner, hens by the coop
      { x: -12, z: 8, kind: 'forage', pool: ['mushroom', 'mushroom', 'golden_mushroom'] },
      { x: -10, z: 10, kind: 'forage', pool: ['mushroom'] },
      { x: -13, z: 5, kind: 'forage', pool: ['mushroom', 'golden_mushroom'] },
      { x: 3, z: 8, kind: 'forage', pool: ['egg'] },
      { x: 5, z: 9, kind: 'forage', pool: ['egg'] },
      { x: 4, z: 6, kind: 'forage', pool: ['egg'] },
    ],
  },
  meadow: {
    name: 'The Meadow',
    size: { w: 40, d: 34 },
    gate: { x: 0, z: 15 },
    spawns: [
      { x: -14, z: -8, kind: 'shake', pool: ['pear', 'apple'] },
      { x: -6, z: -12, kind: 'shake', pool: ['pear'] },
      { x: 12, z: -10, kind: 'shake', pool: ['apple', 'pear'] },
      { x: -10, z: 0, kind: 'pick', pool: ['wild_thyme', 'herb'] },
      { x: -8, z: 3, kind: 'pick', pool: ['wild_thyme', 'golden_sage'] },
      { x: -12, z: 4, kind: 'pick', pool: ['flower', 'wild_thyme'] },
      { x: 2, z: -4, kind: 'pick', pool: ['strawberry', 'berry'] },
      { x: 4, z: -2, kind: 'pick', pool: ['strawberry'] },
      { x: 6, z: -5, kind: 'pick', pool: ['strawberry', 'berry'] },
      { x: 10, z: 2, kind: 'pick', pool: ['wheat'] },
      { x: 12, z: 4, kind: 'pick', pool: ['wheat'] },
      { x: 14, z: 1, kind: 'pick', pool: ['wheat'] },
      { x: 8, z: 6, kind: 'pick', pool: ['flower'] },
      { x: 0, z: 6, kind: 'pick', pool: ['milk'], fixed: 'milk', label: 'Milk churn' },
      { x: 14, z: -4, kind: 'forage', pool: ['honey', 'honey', 'honeycomb'], fixed: 'honey', label: 'Beehive' },
      { x: -4, z: -8, kind: 'forage', pool: ['mushroom', 'golden_mushroom'] },
      { x: -2, z: -10, kind: 'forage', pool: ['mushroom', 'mushroom', 'golden_mushroom'] },
      { x: 6, z: -9, kind: 'forage', pool: ['mushroom'] },
      { x: -14, z: 10, kind: 'pick', pool: ['pumpkin', 'pumpkin', 'tomato'] },
      { x: -11, z: 12, kind: 'pick', pool: ['pumpkin'] },
    ],
  },
};

export const SPAWN_TUNING = {
  spawnChance: 0.82,          // chance a spawn point is populated at all on a visit
  rareGlowColor: 0xf2c94c,
  pickHoldTime: 0.6,          // seconds to hold for a pick
  pullTaps: 3,                // taps for a pull
  pullWobblePeriod: 0.9,      // seconds per wobble cycle
  pullPerfectWindow: 0.16,    // ± seconds around the wobble peak counted as perfect
  shakeFruitCount: [2, 4],    // fruit dropped per shake
  forageRevealRadius: 4.5,    // metres: hidden until this close
  dayLength: 180,             // seconds until "Time for lunch"
  meadowUnlockCP: 200,        // lifetime CP earned needed to open the meadow
};
