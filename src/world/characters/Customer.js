// Regular customers: simple rig with a speech bubble, walk-to mover, seated/eating states.
import * as THREE from 'three';
import { sphere, capsule, cylinder, cone, box, makeIconSprite } from '../props.js';
import { PALETTE } from '../materials.js';
import { REGULARS } from '../../data/regulars.js';
import { tweens, Ease } from '../../engine/Tween.js';

export class Customer {
  constructor(regularId) {
    this.id = regularId; this.regular = REGULARS[regularId];
    this.root = new THREE.Group(); this.root.name = `Customer:${regularId}`;
    this.body = new THREE.Group(); this.root.add(this.body);
    this.t = Math.random() * 10; this.moving = false; this.seated = false; this.eating = false;
    this._path = null; this.order = null; this.seat = null;
    this._build();
  }
  _build() {
    const r = this.regular, c = r.color;
    const skin = PALETTE.skin[[1, 2, 3, 0, 2, 4][Object.keys(REGULARS).indexOf(this.id) % 6]];
    const scale = this.id === 'pip' || this.id === 'twins' ? 0.8 : 1;
    this.body.scale.setScalar(scale);
    this.legL = new THREE.Group(); this.legL.position.set(-0.12, 0.5, 0); this.body.add(this.legL);
    this.legR = new THREE.Group(); this.legR.position.set(0.12, 0.5, 0); this.body.add(this.legR);
    for (const leg of [this.legL, this.legR]) { const m = capsule(0.08, 0.28, 0x5a4636); m.position.y = -0.22; leg.add(m); }
    const torso = capsule(0.28, 0.34, c); torso.position.y = 0.95; this.body.add(torso);
    this.armL = new THREE.Group(); this.armL.position.set(-0.3, 1.15, 0); this.body.add(this.armL);
    this.armR = new THREE.Group(); this.armR.position.set(0.3, 1.15, 0); this.body.add(this.armR);
    for (const arm of [this.armL, this.armR]) { const s = capsule(0.075, 0.18, c); s.position.y = -0.14; arm.add(s); const h = sphere(0.075, skin, {}, 8); h.position.y = -0.34; arm.add(h); }
    this.head = new THREE.Group(); this.head.position.y = 1.7; this.body.add(this.head);
    const hm = sphere(0.36, skin, {}, 18); this.head.add(hm);
    for (const s of [-1, 1]) { const eye = sphere(0.05, 0x3a2a1a, {}, 8); eye.position.set(s * 0.13, 0.02, 0.33); eye.scale.set(1, 1.3, 0.6); this.head.add(eye); }
    const mouth = box(0.08, 0.025, 0.02, 0xc84a3a); mouth.position.set(0, -0.14, 0.35); this.head.add(mouth); this.mouth = mouth;
    // distinguishing headgear
    switch (this.id) {
      case 'bertie': { const hat = cylinder(0.3, 0.32, 0.24, 0xfaf6ee); hat.position.y = 0.42; this.head.add(hat); const puff = sphere(0.34, 0xfaf6ee); puff.scale.set(1, 0.6, 1); puff.position.y = 0.62; this.head.add(puff); const tash = box(0.22, 0.05, 0.05, 0x8b5a2b); tash.position.set(0, -0.08, 0.35); this.head.add(tash); break; }
      case 'pip': { const cap = sphere(0.37, 0x4a6a9a); cap.scale.y = 0.6; cap.position.y = 0.16; this.head.add(cap); const peak = box(0.4, 0.04, 0.25, 0x4a6a9a); peak.position.set(0, 0.12, 0.35); this.head.add(peak); break; }
      case 'marigold': { const hair = sphere(0.38, 0xdedede); hair.scale.set(1, 0.7, 1); hair.position.set(0, 0.16, -0.05); this.head.add(hair); const bun = sphere(0.14, 0xdedede); bun.position.set(0, 0.42, -0.15); this.head.add(bun); const glasses = box(0.34, 0.03, 0.02, 0x4a3420); glasses.position.set(0, 0.02, 0.36); this.head.add(glasses); break; }
      case 'wren': { const beret = sphere(0.38, 0xd9603a); beret.scale.set(1.1, 0.5, 1.1); beret.position.set(0.06, 0.3, 0); this.head.add(beret); const hair = sphere(0.37, 0x4a3420); hair.scale.set(1, 0.7, 1); hair.position.set(0, 0.1, -0.06); this.head.add(hair); break; }
      case 'twins': { const hair = sphere(0.37, 0xe0405a); hair.scale.set(1, 0.7, 1); hair.position.set(0, 0.14, -0.04); this.head.add(hair); for (const s of [-1, 1]) { const tuft = sphere(0.1, 0xe0405a); tuft.position.set(s * 0.3, 0.3, 0); this.head.add(tuft); } break; }
      case 'fern': { const cap = sphere(0.37, 0xd9603a); cap.scale.y = 0.6; cap.position.y = 0.16; this.head.add(cap); const bag = box(0.3, 0.34, 0.14, 0x8b5a2b); bag.position.set(0.36, 0.9, 0.1); this.body.add(bag); break; }
    }
    // second twin as a tiny companion behind
    if (this.id === 'twins') { const twin = sphere(0.22, 0xe0405a); twin.position.set(-0.45, 0.9, -0.2); this.body.add(twin); const face = sphere(0.2, skin); face.position.set(-0.45, 0.85, -0.15); this.body.add(face); }
    // name label + bubble
    this.bubble = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false })); this.bubble.position.y = 2.75 * scale; this.bubble.visible = false; this.root.add(this.bubble);
    this.emote = makeIconSprite('💛'); this.emote.position.y = 2.6 * scale; this.emote.scale.set(0.6, 0.6, 1); this.emote.visible = false; this.root.add(this.emote);
    this.height = 2.1 * scale;
  }

  /** Speech bubble: `{ icon, text }` or null to hide. */
  setBubble(content) {
    if (!content) { this.bubble.visible = false; return; }
    const c = document.createElement('canvas'); const ctx = c.getContext('2d');
    const text = content.text || '';
    ctx.font = 'bold 30px "Trebuchet MS", sans-serif';
    const tw = text ? ctx.measureText(text).width : 0;
    const iconW = content.icon ? 64 : 0;
    c.width = Math.max(96, Math.ceil(tw + iconW + 44)); c.height = 78;
    ctx.fillStyle = 'rgba(251,243,226,0.96)'; ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 5;
    rr(ctx, 3, 3, c.width - 6, c.height - 20, 18); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(c.width / 2 - 12, c.height - 18); ctx.lineTo(c.width / 2, c.height - 4); ctx.lineTo(c.width / 2 + 12, c.height - 18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4a3420'; ctx.textBaseline = 'middle';
    let x = 22;
    if (content.icon) { ctx.font = '44px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(content.icon, x, c.height / 2 - 8); x += iconW; }
    if (text) { ctx.font = 'bold 30px "Trebuchet MS", sans-serif'; ctx.textAlign = 'left'; ctx.fillText(text, x, c.height / 2 - 8); }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    if (this.bubble.material.map) this.bubble.material.map.dispose();
    this.bubble.material.map = tex; this.bubble.material.needsUpdate = true;
    const aspect = c.width / c.height; this.bubble.scale.set(0.62 * aspect, 0.62, 1);
    this.bubble.visible = true;
    const s = this.bubble.scale.clone(); this.bubble.scale.multiplyScalar(0.2); tweens.to(this.bubble.scale, { x: s.x, y: s.y }, 0.35, { ease: Ease.backOut });
  }

  react(emoji) {
    const c = document.createElement('canvas'); c.width = 96; c.height = 96; const ctx = c.getContext('2d'); ctx.font = '76px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(emoji, 48, 52);
    if (this.emote.material.map) this.emote.material.map.dispose();
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; this.emote.material.map = tex; this.emote.material.needsUpdate = true;
    this.emote.visible = true; this.emote.position.y = this.height + 0.3; this.emote.material.opacity = 1;
    tweens.killTweensOf(this.emote.position); tweens.killTweensOf(this.emote.material);
    tweens.to(this.emote.position, { y: this.height + 1.1 }, 1.2, { ease: Ease.quadOut });
    tweens.to(this.emote.material, { opacity: 0 }, 1.2, { ease: Ease.quadIn, onComplete: () => { this.emote.visible = false; } });
  }

  /** Walk along a list of points. Resolves when arrived. */
  walkPath(points, speed = 2.4) {
    return new Promise((res) => { this._path = { points: points.map((p) => p.clone ? p.clone() : new THREE.Vector3(p.x, 0, p.z)), i: 0, speed, res }; this.seated = false; });
  }
  walkTo(p, speed) { return this.walkPath([p], speed); }
  faceYaw(yaw) { this._faceYaw = yaw; }

  sitAt(seat) {
    this.seat = seat; this.seated = true; this.moving = false;
    this.root.position.set(seat.x, 0, seat.z); this.root.rotation.y = seat.yaw; this._faceYaw = null;
    this.legL.rotation.x = -1.4; this.legR.rotation.x = -1.4; this.body.position.y = -0.35;
  }
  stand() { this.seated = false; this.legL.rotation.x = 0; this.legR.rotation.x = 0; this.body.position.y = 0; }

  /** Eating animation. */
  eat(dur = 2.6) {
    this.eating = true; this.setBubble({ icon: '😋' });
    return new Promise((res) => tweens.timer(() => { this.eating = false; res(); }, dur));
  }
  fade(to, dur = 0.5) {
    const mats = []; this.root.traverse((o) => { if (o.material && !mats.includes(o.material)) mats.push(o.material); });
    // fading many shared materials is messy; scale instead (pop in / out)
    tweens.killTweensOf(this.root.scale);
    return tweens.to(this.root.scale, { x: to, y: to, z: to }, dur, { ease: to > 0.5 ? Ease.backOut : Ease.backIn }).promise;
  }

  update(dt) {
    this.t += dt;
    if (this._path) {
      const P = this._path; const target = P.points[P.i]; const p = this.root.position;
      const dx = target.x - p.x, dz = target.z - p.z; const d = Math.hypot(dx, dz);
      const step = P.speed * dt;
      if (d <= step) { p.x = target.x; p.z = target.z; P.i++; if (P.i >= P.points.length) { const res = P.res; this._path = null; this.moving = false; res(); } }
      else { p.x += (dx / d) * step; p.z += (dz / d) * step; this.moving = true; const yaw = Math.atan2(dx, dz); let dy = yaw - this.root.rotation.y; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; this.root.rotation.y += dy * Math.min(1, dt * 10); }
    }
    if (this._faceYaw != null && !this._path) { let dy = this._faceYaw - this.root.rotation.y; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; this.root.rotation.y += dy * Math.min(1, dt * 8); }
    const w = this.t * 9;
    if (this.moving) { this.legL.rotation.x = Math.sin(w) * 0.7; this.legR.rotation.x = -Math.sin(w) * 0.7; this.armL.rotation.x = -Math.sin(w) * 0.5; this.armR.rotation.x = Math.sin(w) * 0.5; this.body.position.y = Math.abs(Math.sin(w)) * 0.05; }
    else if (!this.seated) { this.legL.rotation.x = 0; this.legR.rotation.x = 0; this.armL.rotation.x = 0; this.armR.rotation.x = 0; this.body.position.y = Math.sin(this.t * 2) * 0.01; }
    if (this.eating) { this.armR.rotation.x = -1.3 + Math.sin(this.t * 8) * 0.4; this.head.rotation.x = Math.sin(this.t * 8) * 0.08; this.mouth.scale.set(1.4, 1.6, 1); }
    else if (this.seated) { this.armR.rotation.x = -0.6; this.armL.rotation.x = -0.6; this.head.rotation.x = 0; this.mouth.scale.set(1, 1, 1); this.head.rotation.y = Math.sin(this.t * 0.7) * 0.15; }
  }
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
