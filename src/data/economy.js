// Economy & scoring tunables. Everything that affects how many Cosy Points the player earns.
export const ECONOMY = {
  startingCP: 0,
  startingBasket: 20,
  startingTables: 3,
  tipMax: 0.6,                // tip is 0..60% of menu price scaled by cooking quality
  hintTipScale: 0.85,         // vague-hint match gets 85% of the tip
  specialPriceScale: 0.85,    // counter special sells at 85% of menu price
  firstTimeBonus: 25,         // flat CP the first time a recipe is ever served
  sproutApprovedBonus: 0.15,  // extra tip fraction of price for a perfect (>= 0.95) dish
  friendshipTipBonus: 0.04,   // extra tip fraction per friendship heart (max 5 hearts)
  friendshipMaxHearts: 5,
  friendshipGiftAt: 3,        // hearts at which a regular brings a cosmetic gift
  ingredientQualityMult: { 1: 1.0, 2: 1.15, 3: 1.3 },
  minCustomers: 1,
  maxCustomers: 3,
  regularReturnDelay: 4.5,    // seconds before a new regular may take a freed seat
};

/** Compute the receipt for a served dish. */
export function computeReceipt({ recipe, stepScores, ingredientQualities, mode, firstTime, hearts }) {
  const price = recipe.price;
  const stepAvg = stepScores.length ? stepScores.reduce((a, b) => a + b, 0) / stepScores.length : 0.5;
  const qAvg = ingredientQualities.length ? ingredientQualities.reduce((a, b) => a + b, 0) / ingredientQualities.length : 1;
  // quality multiplier interpolates between the star multipliers
  const qMult = 1 + (qAvg - 1) * 0.15;
  const quality = Math.min(1, stepAvg * qMult);
  let basePrice = price;
  let tipScale = 1;
  if (mode === 'hint') tipScale = ECONOMY.hintTipScale;
  if (mode === 'special') { basePrice = Math.round(price * ECONOMY.specialPriceScale); }
  let tip = price * ECONOMY.tipMax * quality * tipScale;
  const sproutApproved = quality >= 0.95;
  if (sproutApproved) tip += price * ECONOMY.sproutApprovedBonus;
  if (hearts) tip += price * ECONOMY.friendshipTipBonus * Math.min(hearts, ECONOMY.friendshipMaxHearts);
  tip = Math.round(tip);
  const bonus = firstTime ? ECONOMY.firstTimeBonus : 0;
  return { price: basePrice, tip, bonus, total: basePrice + tip + bonus, quality, stepAvg, qAvg, sproutApproved, mode };
}

export function scoreToStars(s) { return s >= 0.85 ? 3 : s >= 0.55 ? 2 : 1; }
