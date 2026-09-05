// The single source of truth for progress. Saved to localStorage after every meaningful action.
import { Save } from '../engine/Save.js';
import { ECONOMY } from '../data/economy.js';
import { RECIPES, RECIPE_IDS } from '../data/recipes.js';
import { STARTER_ITEMS, DEFAULT_EQUIPPED, ITEMS } from '../data/shop.js';

const SAVE_VERSION = 1;

function defaultGame() {
  return {
    version: SAVE_VERSION,
    created: false,             // character creation done?
    name: 'Gigi',
    cp: ECONOMY.startingCP,
    totalEarned: 0,
    basketCapacity: ECONOMY.startingBasket,
    tables: ECONOMY.startingTables,
    inventory: [],              // [{ id, q }] q = 1..3 stars
    owned: [...STARTER_ITEMS],
    equipped: { ...DEFAULT_EQUIPPED },
    look: { skin: 2, eyes: 0, hairTint: 0 }, // indices into creator palettes
    knownRecipes: RECIPE_IDS.filter((id) => RECIPES[id].known),
    bestScores: {},             // recipeId -> best quality 0..1
    cookedCount: {},            // recipeId -> times served
    photos: [],                 // [{ recipeId, quality, day }] perfect dishes on the wall
    friendship: {},             // regularId -> { hearts, lastDay, streak, gifted }
    day: 1,
    stats: { dishes: 0, sales: 0, tips: 0, gathered: 0 },
    hub: { x: 0, z: 4, rot: 0 },
    flags: {},                  // misc tutorial flags
  };
}

function defaultSettings() {
  return {
    audio: { master: 0.8, music: 0.5, sfx: 0.9, muted: false },
    reducedMotion: false,
    holdToTap: false,
    controls: 'auto',           // 'auto' | 'keyboard' | 'touch'
    largeText: false,
    graphics: 'auto',           // 'auto' | 'high' | 'low'
    characterStyle: 'cartoon',  // 'cartoon' (soft toon + outlines) | 'classic'
  };
}

class GameState {
  constructor() {
    this.game = defaultGame();
    this.settings = defaultSettings();
    this.listeners = new Set();
    this.loadSettings();
  }

  // ---- persistence ----
  hasSave() { return Save.hasSave(); }
  load() {
    const g = Save.loadGame();
    if (!g) return false;
    const d = defaultGame();
    this.game = { ...d, ...g, stats: { ...d.stats, ...(g.stats || {}) }, equipped: { ...d.equipped, ...(g.equipped || {}) }, look: { ...d.look, ...(g.look || {}) } };
    // Ensure starter items are always owned (in case new starters are added later)
    for (const id of STARTER_ITEMS) if (!this.game.owned.includes(id)) this.game.owned.push(id);
    // Older saves stored a smaller starting basket; never let capacity fall below the current default
    // or below what an owned upgrade grants.
    let cap = Math.max(this.game.basketCapacity || 0, ECONOMY.startingBasket);
    for (const id of this.game.owned) { const b = ITEMS[id]?.effect?.basket; if (b) cap = Math.max(cap, b); }
    this.game.basketCapacity = cap;
    return true;
  }
  save() { Save.saveGame(this.game); this.emit('save'); }
  reset() { Save.resetGame(); this.game = defaultGame(); this.emit('reset'); }
  loadSettings() { const s = Save.loadSettings(); if (s) this.settings = { ...defaultSettings(), ...s, audio: { ...defaultSettings().audio, ...(s.audio || {}) } }; }
  saveSettings() { Save.saveSettings(this.settings); this.emit('settings'); }

  // ---- events ----
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(type, payload) { for (const fn of this.listeners) fn(type, payload); }

  // ---- economy ----
  get cp() { return this.game.cp; }
  earn(amount, why) {
    this.game.cp += amount; this.game.totalEarned += amount;
    this.emit('cp', { delta: amount, why });
    this.save();
  }
  spend(amount) {
    if (this.game.cp < amount) return false;
    this.game.cp -= amount; this.emit('cp', { delta: -amount }); this.save(); return true;
  }

  // ---- inventory ----
  get inventory() { return this.game.inventory; }
  get basketFree() { return this.game.basketCapacity - this.game.inventory.length; }
  addIngredient(id, q = 1) {
    if (this.basketFree <= 0) return false;
    this.game.inventory.push({ id, q });
    this.game.stats.gathered++;
    this.emit('inventory'); this.save(); return true;
  }
  /** Remove one of each id in `ids` (multiset), choosing the lowest-quality copies unless preferBest. Returns removed items or null. */
  takeIngredients(ids, preferBest = true) {
    const inv = [...this.game.inventory];
    const removed = [];
    for (const id of ids) {
      const candidates = inv.map((it, i) => ({ it, i })).filter((c) => c.it.id === id);
      if (!candidates.length) return null;
      candidates.sort((a, b) => (preferBest ? b.it.q - a.it.q : a.it.q - b.it.q));
      removed.push(candidates[0].it); inv.splice(candidates[0].i, 1);
    }
    this.game.inventory = inv; this.emit('inventory'); this.save();
    return removed;
  }
  hasIngredients(ids) {
    const counts = {};
    for (const it of this.game.inventory) counts[it.id] = (counts[it.id] || 0) + 1;
    for (const id of ids) { if (!counts[id]) return false; counts[id]--; }
    return true;
  }
  missingIngredients(ids) {
    const counts = {};
    for (const it of this.game.inventory) counts[it.id] = (counts[it.id] || 0) + 1;
    const missing = [];
    for (const id of ids) { if (!counts[id]) missing.push(id); else counts[id]--; }
    return missing;
  }
  canCookAnything() { return this.game.knownRecipes.some((r) => this.hasIngredients(RECIPES[r].ingredients)); }

  // ---- recipes ----
  knowsRecipe(id) { return this.game.knownRecipes.includes(id); }
  learnRecipe(id) { if (!this.knowsRecipe(id)) { this.game.knownRecipes.push(id); this.emit('recipe', id); this.save(); return true; } return false; }
  recordCook(recipeId, quality) {
    const g = this.game;
    g.cookedCount[recipeId] = (g.cookedCount[recipeId] || 0) + 1;
    const first = g.cookedCount[recipeId] === 1;
    if (!(recipeId in g.bestScores) || quality > g.bestScores[recipeId]) g.bestScores[recipeId] = quality;
    if (quality >= 0.95) g.photos.push({ recipeId, quality, day: g.day });
    g.stats.dishes++;
    this.save();
    return first;
  }

  // ---- shop / wardrobe ----
  owns(id) { return this.game.owned.includes(id); }
  buy(id) {
    const item = ITEMS[id]; if (!item || this.owns(id)) return false;
    if (item.requires && !this.owns(item.requires)) return false;
    if (!this.spend(item.price)) return false;
    this.game.owned.push(id);
    if (item.effect?.basket) this.game.basketCapacity = Math.max(this.game.basketCapacity, item.effect.basket);
    if (item.effect?.tables) this.game.tables = Math.max(this.game.tables, item.effect.tables);
    if (item.recipe) this.learnRecipe(item.recipe);
    this.emit('owned', id); this.save(); return true;
  }
  grant(id) { if (!this.owns(id)) { this.game.owned.push(id); this.emit('owned', id); this.save(); } }
  equip(slot, id) { this.game.equipped[slot] = id; this.emit('equip', { slot, id }); this.save(); }
  hasDecor(kind) { return this.game.owned.find((id) => ITEMS[id].decor === kind) || null; }

  // ---- friendship ----
  friendship(regularId) { return this.game.friendship[regularId] || (this.game.friendship[regularId] = { hearts: 0, lastDay: 0, streak: 0, gifted: false }); }
  /** Called when a regular is served. Serving on consecutive days builds a heart. */
  serveRegular(regularId) {
    const f = this.friendship(regularId);
    const day = this.game.day;
    if (f.lastDay === day) return { gained: false, f };
    f.streak = f.lastDay === day - 1 ? f.streak + 1 : 1;
    f.lastDay = day;
    let gained = false;
    if (f.streak >= 2 && f.hearts < ECONOMY.friendshipMaxHearts) { f.hearts++; f.streak = 0; gained = true; }
    this.save();
    return { gained, f };
  }

  // ---- day ----
  nextDay() { this.game.day++; this.save(); }
  get meadowUnlocked() { return this.game.totalEarned >= 200; }
}

export const state = new GameState();
