// Character creation (first run) and the cottage Wardrobe: same UI, live 3D preview on a turntable.
import * as THREE from 'three';
import { BaseScene } from './BaseScene.js';
import { Gigi } from '../world/characters/Gigi.js';
import { Sprout } from '../world/characters/Sprout.js';
import { box, cylinder, sphere, makeIconSprite } from '../world/props.js';
import { PALETTE } from '../world/materials.js';
import { buildDressUp } from '../ui/DressUp.js';
import { el } from '../ui/UI.js';
import { ITEMS, ITEM_IDS, COSMETIC_SLOTS } from '../data/shop.js';
import { audio } from '../engine/Audio.js';
import { juice } from '../engine/Tween.js';

export class CreatorScene extends BaseScene {
  constructor(mode = 'creator') { super(); this.mode = mode; this.curve = { curvature: 0, start: 8 }; }
  build() {
    if (this.built) return; this.built = true;
    this.three.background = new THREE.Color(0xf3e6c8);
    this.setupLights({ sun: 0xfff2dc, sunIntensity: 1.6, ambient: 0.9, shadowSize: 8, pos: [3, 8, 6] });
    const fill = new THREE.PointLight(0xffe0c0, 6, 12, 2); fill.position.set(-3, 3, 3); this.three.add(fill);
    const room = new THREE.Group(); this.three.add(room);
    const floor = box(14, 0.2, 12, PALETTE.honey); floor.position.y = -0.1; room.add(floor);
    const wall = box(14, 6, 0.3, 0xf8ecd8); wall.position.set(0, 3, -4); room.add(wall);
    const rug = cylinder(2.4, 2.4, 0.04, 0xd9a0b0); rug.position.set(0, 0.02, 0); room.add(rug);
    for (const sx of [-1, 1]) { const frame = box(1.2, 1.6, 0.1, PALETTE.walnut); frame.position.set(sx * 3.4, 2.6, -3.85); room.add(frame); const mirror = box(1.0, 1.4, 0.06, 0xcfe3ef); mirror.position.set(sx * 3.4, 2.6, -3.78); room.add(mirror); }
    const shelf = box(3, 0.1, 0.5, PALETTE.walnut); shelf.position.set(0, 3.2, -3.75); room.add(shelf);
    for (let i = 0; i < 4; i++) { const hat = sphere(0.22, [0xf2c94c, 0xc84a3a, 0x7fa06a, 0xb8a0d8][i]); hat.scale.y = 0.6; hat.position.set(-1.1 + i * 0.75, 3.35, -3.75); room.add(hat); }
    const lamp = cylinder(0.05, 0.05, 3, PALETTE.walnut); lamp.position.set(4.5, 1.5, -1.5); room.add(lamp);
    const shade = cylinder(0.5, 0.35, 0.5, 0xf2d27a, { emissive: 0xf2c94c, emissiveIntensity: 0.5 }); shade.position.set(4.5, 3.1, -1.5); room.add(shade);
    this.turntable = new THREE.Group(); this.three.add(this.turntable);
    const disc = cylinder(1.3, 1.4, 0.16, PALETTE.walnut); disc.position.y = 0.08; this.turntable.add(disc);
    this.gigi = new Gigi(); this.gigi.root.position.y = 0.16; this.turntable.add(this.gigi.root);
    this.sprout = new Sprout(); this.sprout.root.position.set(-2.0, 0, 0.8); this.sprout.facing = 0.9; this.three.add(this.sprout.root);
    this.camera.position.set(0.2, 2.6, 6.2); this.camera.lookAt(0, 1.2, 0);
    this.spin = 0; this.dragging = false;
  }
  enter(params = {}) {
    super.enter(); this.build();
    this.mode = params.mode || this.mode;
    const g = this.state.game;
    this.equipped = { ...g.equipped }; this.look = { ...g.look }; this.name = g.name || 'Gigi';
    this._apply();
    this.gigi.setBasket(false);
    audio.stopAmbience(); audio.startMusic();
    this._buildUI();
    // aim camera at the character on landscape; on portrait the panel sits below
    this.resize(this.game.width, this.game.height);
  }
  resize(w, h) {
    super.resize(w, h);
    if (!this.built) return;
    if (w > h) { this.camera.position.set(1.4, 2.6, 7.0); this.camera.lookAt(1.6, 1.0, 0); }
    else { this.camera.position.set(0, 3.6, 8.0); this.camera.lookAt(0, -0.2, 0); }
  }
  _apply() { this.gigi.applyOutfit(this.equipped, this.look); this.sprout.setCollar(this.equipped.cat); }
  _buildUI() {
    const panel = buildDressUp({
      state: this.state, mode: this.mode === 'creator' ? 'creator' : 'wardrobe', equipped: this.equipped, look: this.look,
      onEquip: (slot, id) => { this.equipped[slot] = id; this._apply(); juice.pop(slot === 'cat' ? this.sprout.body : this.gigi.head, 1.12); audio.pop(); },
      onLook: (key, idx) => { this.look[key] = idx; this._apply(); audio.pop(); },
    });
    const foot = panel.foot;
    if (this.mode === 'creator') {
      const nameWrap = el('label', null, 'Name '); const input = el('input'); input.type = 'text'; input.maxLength = 14; input.value = this.name; input.oninput = () => { this.name = input.value.trim() || 'Gigi'; }; nameWrap.appendChild(input); foot.appendChild(nameWrap);
      input.addEventListener('keydown', (e) => e.stopPropagation());
    }
    const rnd = el('button', 'btn small secondary', '🎲 Randomise'); rnd.onclick = () => { audio.click(); this._randomise(); panel.refresh(); }; foot.appendChild(rnd);
    const done = el('button', 'btn small', this.mode === 'creator' ? 'Let\'s go!' : 'Save & leave'); done.onclick = () => this._done(); foot.appendChild(done);
    this.ui.mount(panel.el);
    const title = el('div', 'card', `<h2>${this.mode === 'creator' ? '✨ Make your Gigi' : '👗 Wardrobe'}</h2><p class="tiny muted" style="margin:0">${this.mode === 'creator' ? 'Pick a look. Everything here is free — the shop has more.' : 'Everything you own. Drag to spin.'}</p>`);
    title.style.cssText = 'position:absolute;left:16px;top:16px;padding:10px 16px;';
    this.ui.mount(title);
    this.panel = panel;
  }
  _randomise() {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    for (const slot of COSMETIC_SLOTS) { const owned = ITEM_IDS.filter((id) => ITEMS[id].slot === slot && this.state.owns(id)); if (owned.length) this.equipped[slot] = pick(owned); }
    this.look.skin = Math.floor(Math.random() * PALETTE.skin.length); this.look.eyes = Math.floor(Math.random() * PALETTE.eyes.length);
    this.look.hairTint = Math.floor(Math.random() * (this.state.owns('hair_tints') ? PALETTE.hairTints.length : 3));
    this._apply(); juice.pop(this.gigi.root, 1.1); audio.success();
  }
  _done() {
    if (this.game.scenes.transitioning) return;
    audio.click();
    const g = this.state.game; g.equipped = { ...this.equipped }; g.look = { ...this.look }; g.name = this.name;
    if (this.mode === 'creator') { g.created = true; this.state.save(); audio.fanfare(); this.game.scenes.go('hub'); }
    else { this.state.save(); audio.door(); this.game.scenes.go('hub', { from: 'wardrobe' }); }
  }
  update(dt) {
    const I = this.input;
    if (I.pointer.down && !I.locked) { const e = document.elementFromPoint(I.pointer.x, I.pointer.y); if (!e || !e.closest('.card, .hud, .touch-controls')) { this.spin += I.pointer.dx * 0.01; this.dragging = true; } }
    else { this.dragging = false; this.spin *= Math.max(0, 1 - dt * 3); }
    if (Math.abs(I.move.x) > 0.2 && !I.locked && !this.ui.navActive) this.spin = I.move.x * 0.03;
    this.turntable.rotation.y += this.dragging ? this.spin : this.spin + dt * 0.25;
    this.gigi.update(dt, { moving: 0 });
    this.sprout.t += dt; this.sprout.state = 'sit'; this.sprout.body.rotation.z = 0.55; this.sprout.legs[2].rotation.z = 1.4; this.sprout.legs[3].rotation.z = 1.4; this.sprout.tail.rotation.x = Math.sin(this.sprout.t * 3) * 0.35; this.sprout.root.rotation.y = this.sprout.facing - Math.PI / 2;
    if (I.pausePressed && !this.ui.modals.length) this.ui.pauseMenu();
  }
  exit() { this.ui.prompt.hide(); }
}
