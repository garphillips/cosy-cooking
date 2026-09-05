// Cooking micro-games. Each returns a promise resolving to a 0..1 quality score.
// 3D props are built into ctx.anchor (a Group sitting on the worktop / stove); gauges are DOM.
import * as THREE from 'three';
import { box, sphere, cylinder, cone, capsule, makeIconSprite } from '../world/props.js';
import { PALETTE, makeUniqueMaterial } from '../world/materials.js';
import { el } from '../ui/UI.js';
import { tweens, Ease, clamp, lerp } from '../engine/Tween.js';
import { stars } from '../data/ingredients.js';
import { scoreToStars } from '../data/economy.js';

export const STEP_INFO = {
  chop:    { title: 'Chop',   icon: '🔪', instr: 'Tap when the marker crosses a guide line.' },
  peel:    { title: 'Peel',   icon: '🥔', instr: 'Drag in smooth circles (or spin the stick) — keep the peel unbroken.' },
  whisk:   { title: 'Whisk',  icon: '🥣', instr: 'Whisk in circles at a steady tempo — match the swirl.' },
  measure: { title: 'Pour',   icon: '🫗', instr: 'Hold to pour, release inside the band.' },
  season:  { title: 'Season', icon: '🧂', instr: 'Tap to shake — land in the sweet spot before time is up.' },
  stir:    { title: 'Stir',   icon: '🥄', instr: 'Stir in circles to keep the pot in the green.' },
  heat:    { title: 'Heat',   icon: '🔥', instr: 'Change the flame (◀ ▶ / tap) to keep the needle in the band.' },
  flip:    { title: 'Flip',   icon: '🥞', instr: 'Tap at the very top of the arc.' },
};

/** Reads circular motion from pointer drag, stick, or a keyboard hold fallback. */
class CircleInput {
  constructor(input) { this.input = input; this.prevAngle = null; this.omega = 0; this.active = false; this.dir = 0; }
  update(dt) {
    const I = this.input; let angle = null; let fallback = false;
    if (I.pointer.down) { const nx = I.pointer.nx, ny = I.pointer.ny; if (Math.hypot(nx, ny) > 0.05) angle = Math.atan2(ny, nx); }
    else if (Math.hypot(I.move.x, I.move.y) > 0.5) angle = Math.atan2(I.move.y, I.move.x);
    else if (I.interact && I.scheme !== 'touch') fallback = true;
    let w = 0;
    if (angle != null) {
      if (this.prevAngle != null) { let d = angle - this.prevAngle; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; w = d / Math.max(dt, 0.001); }
      this.prevAngle = angle;
    } else { this.prevAngle = null; if (fallback) w = 6.5; }
    // smooth
    this.omega += (Math.abs(w) - this.omega) * Math.min(1, dt * 12);
    this.dir = w === 0 ? this.dir : Math.sign(w);
    this.active = angle != null || fallback;
    this.fallback = fallback;
    return this.omega;
  }
}

class MiniGame {
  constructor(ctx, stepId) {
    this.ctx = ctx; this.stepId = stepId; this.info = STEP_INFO[stepId];
    this.t = 0; this.done = false; this.score = 0;
    this.promise = new Promise((res) => (this._res = res));
    this.props = new THREE.Group(); ctx.anchor.add(this.props);
    this.overlay = el('div', 'minigame card');
    this.overlay.innerHTML = `<div class="mg-head"><span class="mg-icon">${this.info.icon}</span><div><div class="mg-title">${this.info.title}</div><div class="mg-instr">${this.info.instr}</div></div></div><div class="mg-gauge"></div><div class="mg-result hidden"></div>`;
    this.gauge = this.overlay.querySelector('.mg-gauge');
    ctx.ui.mount(this.overlay);
    this.assist = !!ctx.settings.holdToTap;
  }
  /** A horizontal bar with a sweet-spot band and a needle. */
  bar(bandLo, bandHi, extraHtml = '') {
    const b = el('div', 'mg-bar'); b.innerHTML = `<div class="band" style="left:${bandLo * 100}%;width:${(bandHi - bandLo) * 100}%"></div><div class="needle"></div>${extraHtml}`;
    this.gauge.appendChild(b); this._bar = b; this._needle = b.querySelector('.needle'); this._band = b.querySelector('.band'); return b;
  }
  setNeedle(v) { if (this._needle) this._needle.style.left = `${clamp(v, 0, 1) * 100}%`; }
  setBand(lo, hi) { if (this._band) { this._band.style.left = `${lo * 100}%`; this._band.style.width = `${(hi - lo) * 100}%`; } }
  status(text, cls = '') { if (!this._status) { this._status = el('div', 'mg-status'); this.gauge.appendChild(this._status); } this._status.textContent = text; this._status.className = `mg-status ${cls}`; }
  tapped() { const I = this.ctx.input; return I.interactPressed || (I.pointer.justDown && !this._pointerOnOverlay()); }
  _pointerOnOverlay() { const e = document.elementFromPoint(this.ctx.input.pointer.x, this.ctx.input.pointer.y); return e && e.closest && e.closest('.touch-controls'); }
  finish(score) {
    if (this.done) return; this.done = true; this.score = clamp(score, 0, 1);
    const st = scoreToStars(this.score);
    const res = this.overlay.querySelector('.mg-result'); res.classList.remove('hidden');
    res.innerHTML = `<span class="stars">${stars(st)}</span> ${st === 3 ? 'Perfect!' : st === 2 ? 'Nice!' : 'Good enough!'}`;
    this.ctx.audio[st === 3 ? 'success' : st === 2 ? 'chime' : 'thud']();
    this.ctx.sprout?.react(st === 3 ? '😸' : st === 2 ? '😺' : '🥱');
    if (st === 3) this.ctx.audio.chirp();
    tweens.timer(() => { this.cleanup(); this._res(this.score); }, 1.0);
  }
  cleanup() { this.overlay.remove(); this.ctx.anchor.remove(this.props); this.props.traverse((o) => o.geometry && o.geometry.dispose && o.geometry.dispose()); }
  cancel() { if (!this.done) { this.done = true; this.cleanup(); this._res(0.5); } }
  update(dt) { this.t += dt; }
}

// ------------------------------------------------------------------ CHOP
class ChopGame extends MiniGame {
  constructor(ctx) {
    super(ctx, 'chop');
    const ing = ctx.ingredient;
    const board = box(1.3, 0.06, 0.7, PALETTE.honey); board.position.y = 0.03; this.props.add(board);
    this.veg = capsule(0.11, 0.7, ing?.color ?? 0xe8772a); this.veg.rotation.z = Math.PI / 2; this.veg.position.set(0, 0.17, 0); this.props.add(this.veg);
    this.knife = new THREE.Group(); const blade = box(0.04, 0.16, 0.5, 0xd8dde0, { metalness: 0.6, roughness: 0.3 }); blade.position.set(0, 0.1, 0); this.knife.add(blade); const handle = box(0.06, 0.06, 0.2, PALETTE.walnut); handle.position.set(0, 0.2, 0.32); this.knife.add(handle); this.knife.position.set(-0.45, 0.3, 0); this.props.add(this.knife);
    this.n = 5; this.cuts = []; this.guides = [];
    for (let i = 0; i < this.n; i++) { const x = -0.3 + (i / (this.n - 1)) * 0.6; const g = box(0.015, 0.02, 0.5, 0xfaf6ee); g.position.set(x, 0.3, 0); this.props.add(g); this.guides.push({ x, done: false, mesh: g }); }
    this.bar(0, 0, this.guides.map((g) => `<div class="tick" style="left:${((g.x + 0.45) / 0.9) * 100}%"></div>`).join(''));
    this.pos = -0.45; this.dir = 1; this.speed = 0.55; this.accs = [];
    this.status(`0 / ${this.n} cuts`);
  }
  update(dt) {
    super.update(dt);
    this.pos += this.dir * this.speed * dt;
    if (this.pos > 0.45) { this.pos = 0.45; this.dir = -1; } if (this.pos < -0.45) { this.pos = -0.45; this.dir = 1; }
    this.knife.position.x = this.pos; this.knife.position.y = 0.3 + Math.abs(Math.sin(this.t * 6)) * 0.02;
    this.setNeedle((this.pos + 0.45) / 0.9);
    if (this.done) return;
    let want = this.tapped();
    const near = this.guides.filter((g) => !g.done).sort((a, b) => Math.abs(a.x - this.pos) - Math.abs(b.x - this.pos))[0];
    if (this.assist && this.ctx.input.interact && near && Math.abs(near.x - this.pos) < 0.015) { want = true; this._assisted = true; }
    if (want && near) {
      const d = Math.abs(near.x - this.pos);
      let acc = d < 0.035 ? 1 : d < 0.09 ? 0.65 : 0.25; if (this._assisted) { acc = 0.85; this._assisted = false; }
      near.done = true; near.mesh.visible = false; this.accs.push(acc);
      this.ctx.audio.chop(); this.ctx.gigi.beat = 1;
      const slice = cylinder(0.11, 0.11, 0.05, this.veg.material.color.getHex()); slice.rotation.z = Math.PI / 2; slice.position.set(this.pos, 0.17, 0); this.props.add(slice);
      tweens.to(slice.position, { z: 0.3 + Math.random() * 0.1, y: 0.13 }, 0.3, { ease: Ease.quadOut }); tweens.to(slice.rotation, { x: Math.random() * 1.5 }, 0.3);
      this.knife.position.y = 0.16; 
      this.status(`${this.accs.length} / ${this.n} cuts · ${acc === 1 ? 'perfect!' : acc > 0.5 ? 'good' : 'uneven'}`, acc === 1 ? 'good' : '');
      if (this.accs.length >= this.n) this.finish(this.accs.reduce((a, b) => a + b, 0) / this.n);
    }
  }
}

// ------------------------------------------------------------------ PEEL
class PeelGame extends MiniGame {
  constructor(ctx) {
    super(ctx, 'peel');
    const ing = ctx.ingredient;
    this.veg = sphere(0.28, ing?.color ?? 0xb98d5a); this.veg.scale.y = 1.15; this.veg.position.y = 0.32; this.props.add(this.veg);
    this.peelRing = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 40, 0.01), makeUniqueMaterial({ color: 0xf3e6c8 })); this.peelRing.rotation.x = Math.PI / 2; this.peelRing.position.y = 0.32; this.props.add(this.peelRing);
    this.peeler = box(0.06, 0.04, 0.3, 0xd8dde0, { metalness: 0.5, roughness: 0.3 }); this.props.add(this.peeler);
    this.circle = new CircleInput(ctx.input);
    this.angle = 0; this.total = 0; this.target = Math.PI * 2 * 2.5; this.breaks = 0; this.stillT = 0; this.started = false; this.idle = 0; this.jitter = 0; this.samples = 0;
    this.bar(0.98, 1.0); this.status('Peel all the way round ×2½');
  }
  update(dt) {
    super.update(dt); if (this.done) return;
    const w = this.circle.update(dt);
    if (w > 0.6) { this.started = true; this.stillT = 0; this.idle = 0; const adv = Math.min(w, 14) * dt; this.total += adv; this.angle += adv; this.jitter += Math.abs(w - (this._lastW ?? w)) * dt; this.samples += dt; if (Math.random() < dt * 6) this.ctx.audio.step(); }
    else if (this.started) { this.stillT += dt; this.idle += dt; if (this.stillT > 0.35) { this.stillT = -999; this.breaks++; this.ctx.audio.tick(false); this.status(`Peel broke! (${this.breaks})`, 'bad'); } }
    else this.idle += dt;
    this._lastW = w;
    const p = clamp(this.total / this.target, 0, 1);
    this.setNeedle(p);
    this.peelRing.geometry.dispose(); this.peelRing.geometry = new THREE.TorusGeometry(0.3, 0.035, 8, 40, Math.max(0.01, Math.min(Math.PI * 2, this.total)));
    this.peeler.position.set(Math.cos(this.angle) * 0.34, 0.32 + Math.sin(this.angle * 0.5) * 0.02, Math.sin(this.angle) * 0.34); this.peeler.rotation.y = -this.angle;
    this.veg.material.color.lerp(new THREE.Color(0xf6e7b0), Math.min(1, dt * p * 0.6));
    this.ctx.gigi.beat = Math.min(1, w / 10) * 0.6;
    if (this.stillT >= 0) this.status(`${Math.round(p * 100)}% peeled · ${this.breaks} break${this.breaks === 1 ? '' : 's'}`);
    if (p >= 1) { const smooth = this.samples > 0 ? clamp(1 - (this.jitter / this.samples) * 0.04, 0.6, 1) : 0.8; this.finish(clamp(1 - this.breaks * 0.22, 0.2, 1) * smooth); }
    else if (this.idle > 15) this.finish(p * 0.6);
  }
}

// ------------------------------------------------------------------ WHISK
class WhiskGame extends MiniGame {
  constructor(ctx) {
    super(ctx, 'whisk');
    const bowl = cylinder(0.42, 0.28, 0.32, 0xf3e6c8); bowl.position.y = 0.16; this.props.add(bowl);
    this.mix = cylinder(0.36, 0.36, 0.04, 0xf2d27a); this.mix.position.y = 0.3; this.props.add(this.mix);
    this.whisk = new THREE.Group(); const h = cylinder(0.02, 0.02, 0.5, PALETTE.walnut); h.position.y = 0.5; this.whisk.add(h); const loop = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 16), makeUniqueMaterial({ color: 0xd8dde0, metalness: 0.5 })); loop.position.y = 0.2; this.whisk.add(loop); this.whisk.position.y = 0.2; this.props.add(this.whisk);
    this.circle = new CircleInput(ctx.input);
    this.target = 7.5; this.dur = 6.5; this.inT = 0; this.angle = 0;
    this.bar(0.4, 0.66); this.status('Find the tempo…');
  }
  update(dt) {
    super.update(dt); if (this.done) return;
    const w = this.circle.update(dt);
    this.angle += w * dt * (this.circle.dir || 1);
    this.whisk.position.set(Math.cos(this.angle) * 0.2, 0.2, Math.sin(this.angle) * 0.2);
    this.mix.rotation.y += w * dt * 0.5; this.mix.position.y = 0.3 + Math.sin(this.t * 10) * 0.005 * Math.min(1, w / 5);
    const ratio = w / this.target; const v = clamp(ratio * 0.53, 0, 1);
    this.setNeedle(v);
    const good = ratio > 0.75 && ratio < 1.25;
    if (good) { this.inT += dt; if (Math.random() < dt * 8) this.ctx.audio.bubble(); }
    this.ctx.gigi.beat = Math.min(1, w / 10) * 0.6;
    this.status(good ? 'Lovely rhythm!' : w < this.target * 0.75 ? 'A little faster…' : 'Whoa, slower!', good ? 'good' : '');
    if (this.t > this.dur) this.finish(clamp(this.inT / (this.dur * 0.8), 0, 1));
  }
}

// ------------------------------------------------------------------ MEASURE / POUR
class MeasureGame extends MiniGame {
  constructor(ctx) {
    super(ctx, 'measure');
    const jug = cylinder(0.22, 0.18, 0.5, 0xd8e6ee, { transparent: true, opacity: 0.55 }); jug.position.y = 0.25; this.props.add(jug);
    this.liquid = cylinder(0.2, 0.16, 0.01, 0xf2d27a); this.liquid.position.y = 0.01; this.props.add(this.liquid);
    this.bottle = cylinder(0.1, 0.1, 0.4, 0xfaf6ee); this.bottle.position.set(-0.35, 0.75, 0); this.bottle.rotation.z = -0.3; this.props.add(this.bottle);
    this.stream = cylinder(0.02, 0.02, 0.4, 0xf2d27a); this.stream.position.set(-0.05, 0.55, 0); this.stream.visible = false; this.props.add(this.stream);
    this.level = 0; this.rate = 0.42; this.lo = 0.6; this.hi = 0.72; this.pouring = false; this.wasDown = false; this.released = false;
    this.bar(this.lo, this.hi); this.status('Hold to pour');
    this.markBand = box(0.46, 0.005, 0.46, 0xd9603a); this.markBand.position.y = 0.5 * ((this.lo + this.hi) / 2) + 0.01; this.props.add(this.markBand);
  }
  update(dt) {
    super.update(dt); if (this.done) return;
    const I = this.ctx.input; const down = I.interact || (I.pointer.down && !this._pointerOnOverlay());
    if (down) { this.level += this.rate * dt; this.pouring = true; if (Math.random() < dt * 3) this.ctx.audio.pour(0.25); this.bottle.rotation.z = -1.1; this.wasDown = true; }
    else { this.pouring = false; this.bottle.rotation.z = -0.3; if (this.wasDown) this.released = true; }
    this.stream.visible = this.pouring;
    const L = clamp(this.level, 0, 1.05);
    this.liquid.scale.y = Math.max(0.01, L * 50); this.liquid.position.y = 0.005 + L * 0.25;
    this.setNeedle(L);
    this.ctx.gigi.beat = this.pouring ? 0.5 : 0;
    if (L >= 1.05) { this.status('Oops, overflow!', 'bad'); this.ctx.audio.oops(); this.finish(0.2); return; }
    if (this.released) {
      const mid = (this.lo + this.hi) / 2, half = (this.hi - this.lo) / 2; const d = Math.abs(L - mid);
      const score = d <= half ? 1 - (d / half) * 0.15 : clamp(0.85 - (d - half) * 4, 0.1, 0.85);
      this.status(d <= half ? 'Spot on!' : L < this.lo ? 'A little short' : 'A touch too much', d <= half ? 'good' : '');
      this.finish(score);
    }
  }
}

// ------------------------------------------------------------------ SEASON
class SeasonGame extends MiniGame {
  constructor(ctx) {
    super(ctx, 'season');
    const plate = cylinder(0.45, 0.42, 0.05, 0xfaf6ee); plate.position.y = 0.025; this.props.add(plate);
    const food = sphere(0.3, ctx.ingredient?.color ?? 0xe8a63a); food.scale.y = 0.5; food.position.y = 0.12; this.props.add(food);
    this.shaker = new THREE.Group(); const body = cylinder(0.08, 0.1, 0.28, 0xf3e6c8); body.position.y = 0.14; this.shaker.add(body); const cap = cylinder(0.08, 0.08, 0.05, 0xd8dde0, { metalness: 0.5 }); cap.position.y = 0.3; this.shaker.add(cap); this.shaker.position.set(0.15, 0.6, 0.1); this.shaker.rotation.z = 0.4; this.props.add(this.shaker);
    this.level = 0; this.lo = 0.56; this.hi = 0.7; this.dur = 5.0; this.grains = [];
    this.bar(this.lo, this.hi); this.status(`Shake! ${this.dur.toFixed(1)}s`);
  }
  update(dt) {
    super.update(dt); if (this.done) return;
    this.level = Math.max(0, this.level - 0.025 * dt);
    let tap = this.tapped();
    if (this.assist && this.ctx.input.interact && this.level < (this.lo + this.hi) / 2 && this.t - (this._lastAuto || 0) > 0.15) { tap = true; this._lastAuto = this.t; }
    if (tap) {
      this.level += 0.11; this.ctx.audio.shake(); this.ctx.gigi.beat = 0.8;
      tweens.killTweensOf(this.shaker.rotation); this.shaker.rotation.z = 1.4; tweens.to(this.shaker.rotation, { z: 0.4 }, 0.25, { ease: Ease.backOut });
      for (let i = 0; i < 4; i++) { const g = sphere(0.015, 0x3a2a1a, {}, 4); g.position.set(0.15 + (Math.random() - 0.5) * 0.1, 0.62, 0.1 + (Math.random() - 0.5) * 0.1); this.props.add(g); this.grains.push({ m: g, v: -0.5 - Math.random() }); }
    }
    for (let i = this.grains.length - 1; i >= 0; i--) { const g = this.grains[i]; g.v -= 4 * dt; g.m.position.y += g.v * dt; if (g.m.position.y < 0.2) { this.props.remove(g.m); this.grains.splice(i, 1); } }
    const remain = Math.max(0, this.dur - this.t);
    this.setNeedle(this.level);
    const inBand = this.level >= this.lo && this.level <= this.hi;
    this.status(`${inBand ? 'Perfect amount!' : this.level < this.lo ? 'Needs more…' : 'Too much!'} · ${remain.toFixed(1)}s`, inBand ? 'good' : '');
    if (remain <= 0) { const mid = (this.lo + this.hi) / 2, half = (this.hi - this.lo) / 2; const d = Math.abs(this.level - mid); this.finish(d <= half ? 1 - (d / half) * 0.1 : clamp(0.9 - (d - half) * 3, 0.15, 0.9)); }
  }
}

// ------------------------------------------------------------------ STIR (cook)
class StirGame extends MiniGame {
  constructor(ctx) {
    super(ctx, 'stir');
    this.spoon = new THREE.Group(); const h = cylinder(0.025, 0.025, 0.7, PALETTE.walnut); h.position.y = 0.35; this.spoon.add(h); this.spoon.position.y = 0.05; this.props.add(this.spoon);
    this.circle = new CircleInput(ctx.input);
    this.heat = 0.5; this.lo = 0.4; this.hi = 0.66; this.dur = 9; this.inT = 0; this.oops = 0; this.angle = 0; this.bubbles = [];
    this.bar(this.lo, this.hi); this.status('Keep it in the green');
    this.nextEvent = 2 + Math.random() * 2;
  }
  update(dt) {
    super.update(dt); if (this.done) return;
    const w = this.circle.update(dt);
    this.angle += Math.max(w, 1.5) * dt * (this.circle.dir || 1);
    this.spoon.position.set(Math.cos(this.angle) * 0.22, 0.05, Math.sin(this.angle) * 0.22); this.spoon.rotation.z = Math.cos(this.angle) * 0.3; this.spoon.rotation.x = -Math.sin(this.angle) * 0.3;
    // heat drifts up; stirring cools
    this.heat += (0.11 + Math.sin(this.t * 1.3) * 0.03) * dt - Math.min(w, 12) * 0.022 * dt;
    this.nextEvent -= dt; if (this.nextEvent <= 0) { this.heat += 0.12; this.nextEvent = 2.5 + Math.random() * 2; this.ctx.audio.sizzle(0.3); this.ctx.pot?.bubbleBurst?.(); }
    this.heat = clamp(this.heat, 0, 1);
    this.ctx.pot?.setHeat?.(this.heat);
    const inBand = this.heat >= this.lo && this.heat <= this.hi;
    if (inBand) this.inT += dt;
    if (this.heat > 0.9 && this.t - (this._lastOops || -9) > 1.5) { this._lastOops = this.t; this.oops++; this.ctx.audio.oops(); this.ctx.pot?.puff?.(); this.status('Oops! Too hot — stir!', 'bad'); }
    else this.status(inBand ? 'Just right…' : this.heat < this.lo ? 'Let it warm up' : 'Getting hot — stir faster!', inBand ? 'good' : '');
    if (Math.random() < dt * (2 + this.heat * 10)) this.ctx.audio.bubble();
    this.setNeedle(this.heat);
    this.ctx.gigi.beat = Math.min(1, w / 10) * 0.6;
    this.ctx.sprout?.stirBeat?.(w);
    if (this.t > this.dur) this.finish(clamp(this.inT / (this.dur * 0.85) - this.oops * 0.1, 0, 1));
  }
}

// ------------------------------------------------------------------ HEAT CONTROL (cook)
class HeatGame extends MiniGame {
  constructor(ctx) {
    super(ctx, 'heat');
    this.level = 1; // 0 low, 1 medium, 2 high
    const bands = { low: [0.22, 0.44], medium: [0.44, 0.66], high: [0.66, 0.88] };
    [this.lo, this.hi] = bands[ctx.recipe?.heat || 'medium'];
    this.temp = 0.35; this.dur = 9; this.inT = 0; this.oops = 0; this.nextEvent = 2 + Math.random() * 2;
    this.bar(this.lo, this.hi);
    const btns = el('div', 'mg-flames'); btns.innerHTML = ['Low', 'Medium', 'High'].map((n, i) => `<button class="flame ${i === 1 ? 'active' : ''}" data-i="${i}">${['🔥', '🔥🔥', '🔥🔥🔥'][i]}<br>${n}</button>`).join('');
    btns.querySelectorAll('.flame').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); this.setLevel(+b.dataset.i); }));
    this.gauge.appendChild(btns); this.btns = btns;
    this.status(`Recipe says: ${ctx.recipe?.heat === 'low' ? 'simmer gently' : ctx.recipe?.heat === 'high' ? 'nice and hot' : 'a steady medium heat'}`);
    this._prevX = 0;
  }
  setLevel(i) { this.level = clamp(i, 0, 2); this.btns.querySelectorAll('.flame').forEach((b, j) => b.classList.toggle('active', j === this.level)); this.ctx.audio.click(); this.ctx.pot?.setFlame?.(this.level); }
  update(dt) {
    super.update(dt); if (this.done) return;
    const I = this.ctx.input; const x = I.move.x;
    if (x > 0.5 && this._prevX <= 0.5) this.setLevel(this.level + 1); if (x < -0.5 && this._prevX >= -0.5) this.setLevel(this.level - 1); this._prevX = x;
    if (I.interactPressed) this.setLevel((this.level + 1) % 3);
    const gain = [0.045, 0.16, 0.3][this.level];
    this.temp += (gain - 0.13) * dt;
    this.nextEvent -= dt; if (this.nextEvent <= 0) { const dir = Math.random() < 0.5 ? -1 : 1; this.temp += dir * 0.14; this.nextEvent = 2.5 + Math.random() * 2; this.status(dir > 0 ? 'It\'s bubbling up!' : 'A draught cooled the pot…', ''); this.ctx.audio.sizzle(0.3); }
    this.temp = clamp(this.temp, 0, 1);
    this.ctx.pot?.setHeat?.(this.temp);
    const inBand = this.temp >= this.lo && this.temp <= this.hi;
    if (inBand) this.inT += dt;
    if (this.temp > 0.95 && this.t - (this._lastOops || -9) > 1.5) { this._lastOops = this.t; this.oops++; this.ctx.audio.oops(); this.ctx.pot?.puff?.(); this.status('Oops! Turn it down!', 'bad'); }
    else if (this.nextEvent > 2.2) this.status(inBand ? 'Lovely…' : this.temp < this.lo ? 'Too cool — turn it up' : 'Too hot — turn it down', inBand ? 'good' : '');
    this.setNeedle(this.temp);
    if (this.t > this.dur) this.finish(clamp(this.inT / (this.dur * 0.85) - this.oops * 0.1, 0, 1));
  }
}

// ------------------------------------------------------------------ FLIP (cook)
class FlipGame extends MiniGame {
  constructor(ctx) {
    super(ctx, 'flip');
    this.pan = new THREE.Group(); const p = cylinder(0.4, 0.38, 0.06, 0x3a3a3a); this.pan.add(p); const handle = box(0.5, 0.05, 0.08, 0x3a3a3a); handle.position.set(0.6, 0.02, 0); this.pan.add(handle); this.pan.position.y = 0.05; this.props.add(this.pan);
    this.cake = cylinder(0.28, 0.28, 0.06, 0xf2c94c); this.cake.position.y = 0.11; this.props.add(this.cake);
    this.n = 3; this.flips = []; this.phase = 'wait'; this.ft = 0; this.apex = 0.7; this.flightDur = 1.4; this.waitT = 0.8; this.tappedThis = false;
    this.bar(0.45, 0.55); this.status('Get ready…');
  }
  update(dt) {
    super.update(dt); if (this.done) return;
    if (this.phase === 'wait') { this.waitT -= dt; this.cake.position.y = 0.11; if (this.waitT <= 0) { this.phase = 'fly'; this.ft = 0; this.tappedThis = false; this.ctx.audio.whoosh(); this.ctx.gigi.beat = 1; tweens.killTweensOf(this.pan.position); this.pan.position.y = 0.15; tweens.to(this.pan.position, { y: 0.05 }, 0.3); } return; }
    this.ft += dt;
    const u = this.ft / this.flightDur; const h = 4 * u * (1 - u);
    this.cake.position.y = 0.11 + h * 1.4; this.cake.rotation.x = u * Math.PI; this.setNeedle(u);
    if (Math.random() < dt * 3) this.ctx.audio.sizzle(0.15);
    let tap = this.tapped();
    if (this.assist && this.ctx.input.interact && Math.abs(this.ft - this.apex) < 0.02 && !this.tappedThis) { tap = true; this._assisted = true; }
    if (tap && !this.tappedThis) {
      this.tappedThis = true; const d = Math.abs(this.ft - this.apex);
      let acc = d < 0.09 ? 1 : d < 0.2 ? 0.6 : 0.25; if (this._assisted) { acc = 0.85; this._assisted = false; }
      this.flips.push(acc); this.ctx.audio.tick(acc >= 0.6); this.ctx.gigi.beat = 1;
      this.status(acc === 1 ? 'Perfect flip!' : acc > 0.5 ? 'Nice!' : d > 0 && this.ft < this.apex ? 'Too early' : 'Too late', acc === 1 ? 'good' : '');
    }
    if (u >= 1) {
      if (!this.tappedThis) { this.flips.push(0); this.status('Missed the flip!', 'bad'); this.ctx.audio.thud(); }
      this.cake.position.y = 0.11; this.cake.rotation.x = 0; this.ctx.audio.plop();
      if (this.flips.length >= this.n) this.finish(this.flips.reduce((a, b) => a + b, 0) / this.n);
      else { this.phase = 'wait'; this.waitT = 0.9; }
    }
  }
}

const GAMES = { chop: ChopGame, peel: PeelGame, whisk: WhiskGame, measure: MeasureGame, season: SeasonGame, stir: StirGame, heat: HeatGame, flip: FlipGame };
export function startMiniGame(stepId, ctx) { const G = GAMES[stepId] || StirGame; return new G(ctx); }
