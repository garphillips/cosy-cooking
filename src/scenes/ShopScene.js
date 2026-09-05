// The village dress-up shop: bright boutique, friendly shopkeeper, mannequins showing today's
// new items, try-on preview on Gigi, purchase with CP, upgrades / recipe cards / decor.
import * as THREE from 'three';
import { BaseScene } from './BaseScene.js';
import { Gigi } from '../world/characters/Gigi.js';
import { Sprout } from '../world/characters/Sprout.js';
import { box, cylinder, sphere, capsule, cone, makeIconSprite, makeTextSprite } from '../world/props.js';
import { PALETTE } from '../world/materials.js';
import { buildDressUp } from '../ui/DressUp.js';
import { el } from '../ui/UI.js';
import { ITEMS, COSMETIC_SLOTS, DEFAULT_EQUIPPED, newTodayItems } from '../data/shop.js';
import { audio } from '../engine/Audio.js';
import { juice, tweens, Ease } from '../engine/Tween.js';
import { FaceDecal } from '../world/faces.js';
import { applyCharacterStyle } from '../world/toon.js';

const LINES = {
  welcome: ['Welcome, dear! Try anything on.', 'Ooh, new season, new looks!', 'Sprout! Come for a scratch behind the ears?'],
  buy: ['Lovely choice!', 'That suits you perfectly.', 'Wrapped with a bow!', 'Sprout approves, I can tell.'],
  poor: ['Not quite enough Cosy Points yet, dear.', 'Come back after a busy lunch service!'],
  tryon: ['Have a twirl!', 'Oh, that colour on you!'],
};

export class ShopScene extends BaseScene {
  touchControls = false; // tap-driven menu scene: no virtual stick/buttons
  constructor() { super(); this.curve = { curvature: 0, start: 8 }; }
  build() {
    if (this.built) return; this.built = true;
    this.three.background = new THREE.Color(0xf6dfe6);
    this.setupLights({ sun: 0xfff2dc, sunIntensity: 1.6, ambient: 0.9, shadowSize: 10, pos: [3, 8, 6] });
    const warm = new THREE.PointLight(0xffe0c0, 5, 14, 2); warm.position.set(0, 4, 2); this.three.add(warm);
    const room = new THREE.Group(); this.three.add(room);
    const floor = box(16, 0.2, 12, PALETTE.honey); floor.position.y = -0.1; room.add(floor);
    const wall = box(16, 6, 0.3, 0xf8e4ea); wall.position.set(0, 3, -4.5); room.add(wall);
    const stripe = box(16, 0.4, 0.32, 0xb8a0d8); stripe.position.set(0, 3.9, -4.5); room.add(stripe);
    // hooks and hanging clothes on the back wall
    for (let i = 0; i < 6; i++) { const rail = box(0.06, 0.06, 0.4, PALETTE.walnut); rail.position.set(-4.5 + i * 1.8, 3.2, -4.3); room.add(rail); const dress = cone(0.35, 0.9, [0xf2c94c, 0xa9d3e6, 0xe0405a, 0x7fa06a, 0xb8a0d8, 0xf6efe2][i]); dress.position.set(-4.5 + i * 1.8, 2.6, -4.2); room.add(dress); }
    // counter with the shopkeeper
    const counter = box(3.2, 1.0, 1.0, PALETTE.walnut); counter.position.set(-6, 0.5, -1.5); room.add(counter);
    const till = box(0.6, 0.4, 0.5, 0xd8dde0, { metalness: 0.4, roughness: 0.4 }); till.position.set(-6.7, 1.2, -1.5); room.add(till);
    this.keeper = makeShopkeeper(); this.keeper.position.set(-6, 0, -2.6); room.add(this.keeper);
    // mannequins showing today's new items
    this.mannequins = [];
    for (let i = 0; i < 3; i++) { const m = new Gigi(); m.root.position.set(-3.6 + i * 1.6, 0.25, -2.6); m.root.rotation.y = -0.2 + i * 0.15; m.setBasket(false); const base = cylinder(0.45, 0.5, 0.25, PALETTE.walnut); base.position.set(-3.6 + i * 1.6, 0.12, -2.6); room.add(base); room.add(m.root); this.mannequins.push(m); const tag = makeTextSprite('New!', { color: '#fff', bg: '#d9603a', size: 40 }); tag.position.set(-3.6 + i * 1.6, 2.6, -2.6); tag.scale.multiplyScalar(0.5); room.add(tag); }
    // Gigi on a little podium with a mirror
    this.podium = new THREE.Group(); this.podium.position.set(-1.6, 0, 1.4); this.three.add(this.podium);
    const disc = cylinder(1.1, 1.2, 0.16, 0xb8a0d8); disc.position.y = 0.08; this.podium.add(disc);
    this.gigi = new Gigi(); this.gigi.root.position.y = 0.16; this.podium.add(this.gigi.root);
    this.sprout = new Sprout(); this.sprout.root.position.set(-3.6, 0, 1.8); this.sprout.facing = 1.2; this.three.add(this.sprout.root);
    this.spin = 0;
  }
  enter() {
    super.enter(); this.build();
    this.tryOn = null;
    this.newToday = newTodayItems(new Date());
    this._applyLook();
    // dress mannequins in today's new items over a plain base
    this.mannequins.forEach((m, i) => { const id = this.newToday[i]; const eq = { ...DEFAULT_EQUIPPED, hat: 'hat_none', accessory: 'acc_none' }; if (id && COSMETIC_SLOTS.includes(ITEMS[id].slot)) eq[ITEMS[id].slot] = id; m.applyOutfit(eq, { skin: 1 + i, eyes: 0, hairTint: 0 }); });
    audio.stopAmbience(); audio.startMusic();
    this._buildUI();
    this._say(LINES.welcome[Math.floor(Math.random() * LINES.welcome.length)]);
    this.resize(this.game.width, this.game.height);
  }
  resize(w, h) { super.resize(w, h); if (!this.built) return; if (w > h) { this.camera.position.set(0.2, 2.8, 8.0); this.camera.lookAt(0.5, 0.9, -0.5); } else { this.camera.position.set(-1.6, 3.8, 9); this.camera.lookAt(-1.6, -0.3, -0.5); } }
  _applyLook() {
    const g = this.state.game; const eq = { ...g.equipped };
    if (this.tryOn) eq[ITEMS[this.tryOn].slot] = this.tryOn;
    this.gigi.applyOutfit(eq, g.look); this.gigi.setBasket(false); this.sprout.setCollar(eq.cat);
  }
  _say(text) { if (this.line) this.line.remove(); this.line = el('div', 'card shop-keeper-line', `<b>Shopkeeper:</b> ${text}`); this.line.style.padding = '10px 14px'; this.ui.mount(this.line); }
  _buildUI() {
    this.ui.showHUD({ basket: false, book: false });
    const duOpts = {
      state: this.state, mode: 'shop', equipped: this.state.game.equipped, look: this.state.game.look, newToday: this.newToday, tryOn: null,
      onTry: (id) => { this.tryOn = id; duOpts.tryOn = id; this._applyLook(); if (id) { juice.pop(this.gigi.head, 1.12); audio.pop(); this._say(LINES.tryon[Math.floor(Math.random() * LINES.tryon.length)]); } },
      onEquip: (slot, id) => { this.state.equip(slot, id); this.tryOn = null; duOpts.tryOn = null; this._applyLook(); audio.pop(); juice.pop(this.gigi.head, 1.12); },
      onBuy: (id) => this._buy(id, panel),
    };
    const panel = buildDressUp(duOpts);
    this.panel = panel; this._duOpts = duOpts;
    const leave = el('button', 'btn small ghost', 'Leave shop'); leave.onclick = () => this._leave(); panel.foot.appendChild(leave);
    const cp = el('div', 'tiny muted', ''); panel.foot.appendChild(cp);
    this.ui.mount(panel.el);
  }
  _buy(id, panel) {
    const it = ITEMS[id];
    if (this.state.cp < it.price) { audio.wobble(); this._say(LINES.poor[Math.floor(Math.random() * LINES.poor.length)]); return; }
    this.ui.confirm(`Buy ${it.name} for 🪙 ${it.price} CP?`, { ok: 'Buy', cancel: 'Not now' }).then((ok) => {
      if (!ok) return;
      if (!this.state.buy(id)) { audio.wobble(); return; }
      audio.coins(5); audio.success(); this._say(LINES.buy[Math.floor(Math.random() * LINES.buy.length)]);
      if (COSMETIC_SLOTS.includes(it.slot)) { this.state.equip(it.slot, id); this.tryOn = null; this._duOpts.tryOn = null; this._applyLook(); juice.pop(this.gigi.root, 1.1); this.ui.toast(`${it.name} — wearing it now!`, { icon: it.icon }); }
      else if (it.recipe) this.ui.toast(`Recipe learned: ${it.name.replace('Recipe: ', '')}`, { icon: it.icon });
      else this.ui.toast(`${it.name} purchased!`, { icon: it.icon });
      this.sprout.react('💛');
      panel.refresh();
    });
  }
  _leave() { if (this.game.scenes.transitioning) return; audio.door(); this.game.scenes.go('hub', { from: 'shop' }); }
  update(dt) {
    const I = this.input;
    if (I.pointer.down && !I.locked) { const e = document.elementFromPoint(I.pointer.x, I.pointer.y); if (!e || !e.closest('.card, .hud, .touch-controls')) this.spin += I.pointer.dx * 0.01; }
    else this.spin *= Math.max(0, 1 - dt * 3);
    this.podium.rotation.y += this.spin + dt * 0.3;
    this.gigi.update(dt, { moving: 0 });
    for (const m of this.mannequins) { m.update(dt, { moving: 0 }); }
    this.keeper.userData.update?.(dt);
    this.sprout.t += dt; this.sprout.state = 'sit'; this.sprout.body.rotation.z = 0.55; this.sprout.legs[2].rotation.z = 1.4; this.sprout.legs[3].rotation.z = 1.4; this.sprout.tail.rotation.x = Math.sin(this.sprout.t * 3) * 0.35; this.sprout.root.rotation.y = this.sprout.facing - Math.PI / 2;
    if (I.pausePressed && !this.ui.modals.length) this.ui.pauseMenu();
    if (I.cancelPressed && !this.ui.modals.length) this._leave();
  }
  exit() { this.ui.prompt.hide(); if (this.line) { this.line.remove(); this.line = null; } }
}

function makeShopkeeper() {
  const g = new THREE.Group();
  const skirt = cone(0.5, 0.9, 0x9a7ad8); skirt.position.y = 0.5; g.add(skirt);
  const torso = capsule(0.3, 0.3, 0xf6efe2); torso.position.y = 1.15; g.add(torso);
  const shawl = cone(0.42, 0.4, 0xb8a0d8); shawl.position.y = 1.35; g.add(shawl);
  const head = sphere(0.36, PALETTE.skin[1], {}, 18); head.position.y = 1.9; g.add(head);
  const hair = sphere(0.38, 0xdedede); hair.scale.set(1, 0.7, 1); hair.position.set(0, 2.05, -0.05); g.add(hair);
  const bun = sphere(0.15, 0xdedede); bun.position.set(0, 2.32, -0.15); g.add(bun);
  const face = new FaceDecal({ kind: 'npc', radius: 0.36, eyeColor: 0x4a8a5a, blush: 0.4 }); face.mesh.position.y = 1.9; g.add(face.mesh); face.setExpression('happy');
  for (const s of [-1, 1]) { const rim = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.015, 6, 14), skirt.material.clone()); rim.material.color.setHex(0x4a3420); rim.position.set(s * 0.13, 1.92, 0.36); g.add(rim); }
  for (const s of [-1, 1]) { const arm = capsule(0.07, 0.2, 0xf6efe2); arm.position.set(s * 0.36, 1.1, 0.1); arm.rotation.z = s * 0.4; g.add(arm); const hand = sphere(0.07, PALETTE.skin[1], {}, 8); hand.position.set(s * 0.44, 0.9, 0.15); g.add(hand); }
  applyCharacterStyle(g);
  let t = 0; g.userData.update = (dt) => { t += dt; face.update(dt); head.position.y = 1.9 + Math.sin(t * 2) * 0.01; head.rotation.z = Math.sin(t * 1.3) * 0.04; g.rotation.y = Math.sin(t * 0.5) * 0.1; };
  return g;
}
