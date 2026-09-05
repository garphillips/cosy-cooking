// Mini-game 2: The Little Sprout. Open up, seat regulars, cook (prep + cook micro-games),
// plate, serve, get paid with a receipt, close with a till tally.
import * as THREE from 'three';
import { WalkScene } from './WalkScene.js';
import { box, sphere, cylinder, cone, capsule, makeTextSprite, makeIconSprite, collectColliders } from '../world/props.js';
import { PALETTE, makeUniqueMaterial, makeToyMaterial } from '../world/materials.js';
import { tileTexture, plankTexture } from '../world/textures.js';
import { applyCurve } from '../world/curve.js';
import { Customer } from '../world/characters/Customer.js';
import { RECIPES, HINTS, findRecipeByCombo } from '../data/recipes.js';
import { INGREDIENTS, stars } from '../data/ingredients.js';
import { REGULARS, REGULAR_IDS, SPROUT_FAVOURITE } from '../data/regulars.js';
import { ECONOMY, computeReceipt, scoreToStars } from '../data/economy.js';
import { ITEMS } from '../data/shop.js';
import { startMiniGame, STEP_INFO } from '../game/minigames.js';
import { audio } from '../engine/Audio.js';
import { tweens, juice, Ease, clamp, lerp } from '../engine/Tween.js';
import { el } from '../ui/UI.js';

const L = { // layout
  worktop: new THREE.Vector3(-3, 0, -4.6), worktopStand: new THREE.Vector3(-3.6, 0, -3.5),
  stove: new THREE.Vector3(1.5, 0, -4.6), stoveStand: new THREE.Vector3(0.9, 0, -3.5),
  sink: new THREE.Vector3(5.2, 0, -4.6), stool: new THREE.Vector3(3.3, 0, -3.5),
  counterZ: -1, counterGap: new THREE.Vector3(5.2, 0, -1), counterSpecial: new THREE.Vector3(1.6, 1.05, -1.0),
  door: new THREE.Vector3(0, 0, 7), doorOutside: new THREE.Vector3(0, 0, 8.5), doorInside: new THREE.Vector3(0, 0, 5.6),
  tables: [new THREE.Vector3(-5.5, 0, 2), new THREE.Vector3(0.5, 0, 3.4), new THREE.Vector3(5.5, 0, 2), new THREE.Vector3(-5.5, 0, 5.4)],
  petSpot: new THREE.Vector3(4.6, 0, -0.1),
};

export class RestaurantScene extends WalkScene {
  constructor() { super(); this.curve = { curvature: 0.0, start: 8 }; this.customers = []; this.open = false; this.busy = false; this.special = null; this.till = null; this.activeGame = null; this.auto = null; }

  // ------------------------------------------------------------------ build
  build() {
    if (this.built) return; this.built = true;
    const S = this.three; S.background = new THREE.Color(0x3a2a1c);
    this.setupLights({ sun: 0xfff0d8, sunIntensity: 1.6, ambient: 0.75, shadowSize: 14, pos: [-4, 12, 6] });
    this.sunOffset.set(-4, 12, 6);
    // warm stove light
    this.stoveLight = new THREE.PointLight(0xffb070, 8, 9, 2); this.stoveLight.position.set(1.5, 2.2, -4); S.add(this.stoveLight);
    const win = new THREE.PointLight(0xcfe6ff, 6, 12, 2); win.position.set(-6, 3, -5.5); S.add(win);
    this.world = new THREE.Group(); S.add(this.world);
    const W = this.world;
    // floor & walls
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, map: tileTexture(0xd9c5a2, 0xb3a184, 5) }); applyCurve(floorMat);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(18, 0.2, 14.4), floorMat); floor.position.y = -0.1; floor.receiveShadow = true; W.add(floor);
    const wallMat = { color: PALETTE.plaster };
    const back = box(18, 4, 0.3, wallMat.color); back.position.set(0, 2, -7.15); W.add(back);
    const left = box(0.3, 4, 14.4, wallMat.color); left.position.set(-9.15, 2, 0); W.add(left);
    const right = box(0.3, 4, 14.4, wallMat.color); right.position.set(9.15, 2, 0); W.add(right);
    // front wall: low so the camera sees in; door gap
    for (const sx of [-1, 1]) { const f = box(8.2, 1.2, 0.3, wallMat.color); f.position.set(sx * 4.9, 0.6, 7.15); W.add(f); }
    // skirting / beams
    const beam = box(18, 0.25, 0.25, PALETTE.walnut); beam.position.set(0, 3.9, -7); W.add(beam);
    // window on the back wall with curtains
    const winFrame = box(2.6, 2.0, 0.12, PALETTE.walnut); winFrame.position.set(-6, 2.3, -7.0); W.add(winFrame);
    const glass = box(2.2, 1.6, 0.06, PALETTE.sky, { emissive: 0x9fc6dc, emissiveIntensity: 0.5 }); glass.position.set(-6, 2.3, -6.93); W.add(glass);
    const cross = box(0.08, 1.6, 0.08, PALETTE.walnut); cross.position.set(-6, 2.3, -6.9); W.add(cross);
    this.curtains = []; for (const sx of [-1, 1]) { const c = box(0.5, 2.2, 0.15, 0xf3e6c8); c.material = makeUniqueMaterial({ color: 0xf3e6c8 }); c.position.set(-6 + sx * 1.6, 2.35, -6.85); W.add(c); this.curtains.push(c); }
    // shelves with jars
    for (const y of [2.3, 3.1]) { const sh = box(5, 0.1, 0.5, PALETTE.walnut); sh.position.set(2.5, y, -6.85); W.add(sh); for (let i = 0; i < 6; i++) { const jar = cylinder(0.16, 0.16, 0.36, [0xe8a63a, 0xc9a07a, 0xd9452e, 0x7fa06a, 0xf2d27a, 0x9a7ad8][i], { transparent: true, opacity: 0.85 }); jar.position.set(0.4 + i * 0.75, y + 0.23, -6.85); W.add(jar); const lid = cylinder(0.17, 0.17, 0.05, PALETTE.honey); lid.position.set(0.4 + i * 0.75, y + 0.43, -6.85); W.add(lid); } }
    for (const [x, z] of [[-8.3, -6.3], [7.8, -6.5]]) { const plant = sphere(0.35, PALETTE.leaf); plant.position.set(x, 1.0, z); W.add(plant); const pot = cylinder(0.25, 0.2, 0.4, PALETTE.terracotta); pot.position.set(x, 0.65, z); W.add(pot); const stand = box(0.6, 0.45, 0.6, PALETTE.walnut); stand.position.set(x, 0.22, z); W.add(stand); }
    // hanging utensils
    for (let i = 0; i < 4; i++) { const u = box(0.06, 0.5, 0.04, PALETTE.honey); u.position.set(-4.2 + i * 0.4, 2.4, -6.9); W.add(u); const head = box(0.16, 0.14, 0.04, PALETTE.honey); head.position.set(-4.2 + i * 0.4, 2.1, -6.9); W.add(head); }
    // worktop
    const wt = box(2.6, 0.95, 1.2, PALETTE.honey); wt.position.copy(L.worktop).setY(0.475); W.add(wt); wt.userData.collider = { hw: 1.3, hd: 0.6 };
    const wtTop = box(2.7, 0.08, 1.3, PALETTE.walnut); wtTop.position.copy(L.worktop).setY(0.97); W.add(wtTop);
    this.worktopAnchor = new THREE.Group(); this.worktopAnchor.position.copy(L.worktop).setY(1.01); W.add(this.worktopAnchor);
    // stove + pot
    const stove = box(1.6, 0.95, 1.2, 0x5a5a5a); stove.position.copy(L.stove).setY(0.475); W.add(stove); stove.userData.collider = { hw: 0.8, hd: 0.6 };
    const hob = cylinder(0.42, 0.42, 0.05, 0x2a2a2a); hob.position.copy(L.stove).setY(0.97); W.add(hob);
    this.stoveAnchor = new THREE.Group(); this.stoveAnchor.position.copy(L.stove).setY(1.0); W.add(this.stoveAnchor);
    this.potGroup = new THREE.Group(); this.stoveAnchor.add(this.potGroup);
    this.potMat = makeUniqueMaterial({ color: PALETTE.tomato, roughness: 0.5 });
    const potBody = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.42, 20), this.potMat); potBody.castShadow = true; potBody.position.y = 0.21; this.potGroup.add(potBody);
    for (const sx of [-1, 1]) { const handle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 6, 12), this.potMat); handle.position.set(sx * 0.46, 0.3, 0); handle.rotation.y = Math.PI / 2; this.potGroup.add(handle); }
    this.soup = cylinder(0.38, 0.38, 0.04, 0xe8a63a); this.soup.material = makeUniqueMaterial({ color: 0xe8a63a, roughness: 0.4 }); this.soup.position.y = 0.36; this.potGroup.add(this.soup);
    this.flame = cone(0.3, 0.25, 0x5fa8ff, { emissive: 0x3f88ff, emissiveIntensity: 1.2, transparent: true, opacity: 0.8 }, 8); this.flame.position.y = -0.02; this.flame.scale.set(1, 0.6, 1); this.stoveAnchor.add(this.flame);
    this.bubbles = []; this.steam = [];
    this.pot = { setHeat: (h) => this._setPotHeat(h), setFlame: (l) => this._setFlame(l), puff: () => this._puff(), bubbleBurst: () => { for (let i = 0; i < 4; i++) this._bubble(); } };
    this._setFlame(1); this._setPotHeat(0.3);
    // sink
    const sink = box(1.6, 0.95, 1.2, 0xb9b1a3); sink.position.copy(L.sink).setY(0.475); W.add(sink); sink.userData.collider = { hw: 0.8, hd: 0.6 };
    const basin = box(1.1, 0.1, 0.8, 0x8a8480); basin.position.copy(L.sink).setY(0.95); W.add(basin);
    const tap = cylinder(0.04, 0.04, 0.4, 0xd8dde0, { metalness: 0.7, roughness: 0.3 }); tap.position.copy(L.sink).setY(1.2).add(new THREE.Vector3(0, 0, -0.4)); W.add(tap);
    // veg baskets on the floor
    for (const [x, z] of [[-6.4, -3.2], [7.2, -3.2]]) { const b = cylinder(0.5, 0.4, 0.5, PALETTE.honey); b.position.set(x, 0.25, z); W.add(b); b.userData.collider = { r: 0.55 }; for (let i = 0; i < 4; i++) { const v = sphere(0.14, [0xd9452e, 0xe8772a, 0x5f9a4a, 0xd9b48a][i], {}, 8); v.position.set(x + (i % 2 - 0.5) * 0.3, 0.52, z + (Math.floor(i / 2) - 0.5) * 0.3); W.add(v); } }
    // stool for Sprout
    const stool = cylinder(0.32, 0.28, 0.55, PALETTE.walnut); stool.position.copy(L.stool).setY(0.275); W.add(stool); stool.userData.collider = { r: 0.4 };
    // counter between kitchen and dining, with a gap on the right
    const counter = box(10.4, 1.0, 0.7, PALETTE.honey); counter.position.set(-1.0, 0.5, L.counterZ); W.add(counter); counter.userData.collider = { hw: 5.2, hd: 0.35 };
    const counterTop = box(10.6, 0.08, 0.85, PALETTE.walnut); counterTop.position.set(-1.0, 1.02, L.counterZ); W.add(counterTop);
    const bell = sphere(0.1, 0xf2c94c, { metalness: 0.5, roughness: 0.3 }); bell.position.set(-5.2, 1.16, L.counterZ); W.add(bell);
    // chalkboard on the left wall
    this.chalk = box(0.12, 1.6, 2.2, 0x2f3a2a); this.chalk.material = makeUniqueMaterial({ color: 0x2f3a2a }); this.chalk.position.set(-9.0, 2.1, -0.5); W.add(this.chalk);
    this.chalkFrame = box(0.14, 1.8, 2.4, PALETTE.walnut); this.chalkFrame.material = makeUniqueMaterial({ color: PALETTE.walnut }); this.chalkFrame.position.set(-9.06, 2.1, -0.5); W.add(this.chalkFrame);
    this.chalkText = makeTextSprite("Today's Special", { color: '#fff', bg: 'transparent', size: 40 }); this.chalkText.position.set(-8.85, 2.45, -0.5); this.chalkText.scale.multiplyScalar(0.32); W.add(this.chalkText);
    this.chalkIcon = makeIconSprite('🍲'); this.chalkIcon.position.set(-8.85, 1.85, -0.5); this.chalkIcon.scale.set(0.6, 0.6, 1); W.add(this.chalkIcon);
    // wall art on the right wall
    this.wallArt = new THREE.Group(); this.wallArt.position.set(9.0, 2.2, -1); W.add(this.wallArt);
    // photo wall (perfect dishes) on the right wall
    this.photoWall = new THREE.Group(); this.photoWall.position.set(9.0, 2.0, 3); W.add(this.photoWall);
    // tables & chairs
    this.tables = L.tables.map((p, i) => this._makeTable(p, i));
    // door + sign
    for (const sx of [-1, 1]) { const post = box(0.2, 2.6, 0.3, PALETTE.walnut); post.position.set(sx * 1.0, 1.3, 7.15); W.add(post); }
    const lintel = box(2.2, 0.25, 0.3, PALETTE.walnut); lintel.position.set(0, 2.5, 7.15); W.add(lintel);
    this.signBoard = box(0.9, 0.5, 0.06, 0xfaf6ee); this.signBoard.position.set(1.2, 1.7, 7.0); W.add(this.signBoard);
    // outside: a hint of the square
    const outside = box(30, 0.1, 10, PALETTE.path); outside.position.set(0, -0.05, 12.5); W.add(outside);

    // characters
    this.setupCharacters({ offset: new THREE.Vector3(0, 8.5, 9.5) });
    this.follow.bounds = { minX: -4, maxX: 4, minZ: -3.5, maxZ: 3.5 };
    this.player.setColliders(collectColliders(W));
    this.player.setBounds({ minX: -8.4, maxX: 8.4, minZ: -6.3, maxZ: 6.4 });
    this.customerLayer = new THREE.Group(); S.add(this.customerLayer);
    this.fxLayer = new THREE.Group(); S.add(this.fxLayer);

    // interactables
    this.signInteractable = this.addInteractable({ position: new THREE.Vector3(0.6, 0, 6.2), radius: 2.4, priority: 1, label: 'Open up', icon: 'open', onInteract: () => this.open ? this._closeUp() : this._openUp(), enabled: () => !this.busy });
    this.cookInteractable = this.addInteractable({ position: L.worktopStand.clone(), radius: 2.2, priority: 2, label: 'Cook something', icon: 'cook', promptHeight: 2.1, onInteract: () => this._chooseRecipe(), enabled: () => !this.busy && this.open });
    this.leaveInteractable = this.addInteractable({ position: new THREE.Vector3(-0.6, 0, 6.3), radius: 2.0, priority: 0, label: 'Back to the lane', icon: 'leave', onInteract: () => this._leave(), enabled: () => !this.busy && !this.open });
  }

  _makeTable(p, i) {
    const g = new THREE.Group(); g.position.copy(p); this.world.add(g);
    const top = cylinder(0.85, 0.85, 0.08, PALETTE.honey); top.position.y = 0.95; g.add(top);
    const cloth = cylinder(0.9, 0.9, 0.03, 0xf3e6c8); cloth.material = makeUniqueMaterial({ color: 0xf3e6c8 }); cloth.position.y = 1.0; g.add(cloth);
    const leg = cylinder(0.12, 0.16, 0.95, PALETTE.walnut); leg.position.y = 0.47; g.add(leg);
    const vase = cylinder(0.08, 0.06, 0.25, PALETTE.sky); vase.position.y = 1.14; g.add(vase);
    const flower = sphere(0.09, [0xf0a3c0, 0xf2c94c, 0xe07090, 0xa9d3e6][i % 4], {}, 8); flower.position.y = 1.32; g.add(flower);
    // chair on the far side (customer faces the counter)
    const chair = box(0.7, 0.1, 0.7, PALETTE.walnut); chair.position.set(0, 0.5, 1.3); g.add(chair);
    const back = box(0.7, 0.8, 0.08, PALETTE.walnut); back.position.set(0, 0.9, 1.65); g.add(back);
    g.userData.collider = { r: 1.05 };
    const seat = { x: p.x, z: p.z + 1.3, yaw: Math.PI };
    const serveSpot = new THREE.Vector3(p.x, 0, p.z - 1.35);
    return { group: g, cloth, seat, serveSpot, occupant: null, index: i, plate: null };
  }

  _applyDecor() {
    const g = this.state.game;
    const pot = g.owned.includes('decor_pot_blue') ? ITEMS.decor_pot_blue.color : PALETTE.tomato; this.potMat.color.setHex(pot);
    const cloth = g.owned.includes('decor_tablecloth_red') ? ITEMS.decor_tablecloth_red.color : 0xf3e6c8; for (const t of this.tables) t.cloth.material.color.setHex(cloth);
    const curt = g.owned.includes('decor_curtains_gingham') ? ITEMS.decor_curtains_gingham.color : 0xf3e6c8; for (const c of this.curtains) c.material.color.setHex(curt);
    this.chalk.material.color.setHex(g.owned.includes('decor_chalkboard') ? 0x1e2a3a : 0x2f3a2a); this.chalkFrame.material.color.setHex(g.owned.includes('decor_chalkboard') ? 0xf2c94c : PALETTE.walnut);
    while (this.wallArt.children.length) this.wallArt.remove(this.wallArt.children[0]);
    if (g.owned.includes('decor_wall_sunflower')) { const frame = box(0.1, 1.2, 1.2, PALETTE.walnut); this.wallArt.add(frame); const canvas = box(0.06, 1.0, 1.0, 0xa9d3e6); canvas.position.x = -0.04; this.wallArt.add(canvas); const sun = makeIconSprite('🌻'); sun.position.x = -0.12; sun.scale.set(0.8, 0.8, 1); this.wallArt.add(sun); }
    // tables: show only owned count
    for (const t of this.tables) t.group.visible = t.index < g.tables;
    // photo wall
    while (this.photoWall.children.length) this.photoWall.remove(this.photoWall.children[0]);
    const photos = g.photos.slice(-6);
    photos.forEach((ph, i) => { const f = box(0.08, 0.5, 0.5, PALETTE.walnut); const col = i % 3, row = Math.floor(i / 3); f.position.set(0, 0.6 - row * 0.65, -0.7 + col * 0.65); this.photoWall.add(f); const ic = makeIconSprite(RECIPES[ph.recipeId].icon); ic.position.set(-0.08, 0.6 - row * 0.65, -0.7 + col * 0.65); ic.scale.set(0.38, 0.38, 1); this.photoWall.add(ic); });
  }

  // ------------------------------------------------------------------ pot fx
  _setFlame(level) { this.flameLevel = level; const s = [0.5, 0.9, 1.3][level]; this.flame.scale.set(s, 0.6 * s, s); this.stoveLight.intensity = 4 + level * 4; }
  _setPotHeat(h) { this.potHeat = h; }
  _bubble() { const b = sphere(0.03 + Math.random() * 0.03, 0xf6e7b0, { transparent: true, opacity: 0.9 }, 6); b.position.set((Math.random() - 0.5) * 0.5, 0.38, (Math.random() - 0.5) * 0.5); this.potGroup.add(b); this.bubbles.push({ m: b, t: 0 }); }
  _puff() { const p = sphere(0.25, 0xffffff, { transparent: true, opacity: 0.8 }, 10); p.position.set(0, 0.5, 0); this.potGroup.add(p); tweens.to(p.position, { y: 1.6 }, 0.9, { ease: Ease.quadOut }); tweens.to(p.scale, { x: 2, y: 2, z: 2 }, 0.9); tweens.to(p.material, { opacity: 0 }, 0.9, { onComplete: () => this.potGroup.remove(p) }); const txt = makeTextSprite('oops!', { color: '#d9603a', bg: 'transparent', size: 44 }); txt.position.set(0, 1.2, 0.3); txt.scale.multiplyScalar(0.5); this.potGroup.add(txt); tweens.to(txt.position, { y: 2 }, 0.9); tweens.to(txt.material, { opacity: 0 }, 0.9, { onComplete: () => this.potGroup.remove(txt) }); }
  _updatePot(dt) {
    const h = this.potHeat ?? 0.3;
    if (Math.random() < dt * (1 + h * 12) * (this.open ? 1 : 0.3)) this._bubble();
    for (let i = this.bubbles.length - 1; i >= 0; i--) { const b = this.bubbles[i]; b.t += dt; b.m.position.y += dt * 0.25; b.m.scale.setScalar(1 + b.t); b.m.material.opacity = 0.9 - b.t * 1.4; if (b.t > 0.6) { this.potGroup.remove(b.m); this.bubbles.splice(i, 1); } }
    this.flame.rotation.y += dt * 3; this.flame.scale.y = (0.6 * [0.5, 0.9, 1.3][this.flameLevel || 1]) * (1 + Math.sin(this.game.time * 20) * 0.1);
    this.stoveLight.intensity = (4 + (this.flameLevel || 1) * 4) * (1 + Math.sin(this.game.time * 9) * 0.06);
  }

  // ------------------------------------------------------------------ enter / exit
  enter() {
    super.enter(); this.build();
    this.refreshLook(false);
    this._applyDecor();
    this.placePlayer(0, 4.6, Math.PI);
    // Sprout lives on the stool here
    this.sprout.hintTarget = L.stool.clone(); this.sprout.root.position.copy(L.stool); this.sprout.showHint(false);
    this.frozen = false; this.busy = false; this.open = false; this.special = null;
    this.till = { dishes: 0, sales: 0, tips: 0, bonus: 0, served: [] };
    this._setSign(false);
    this.ui.showHUD({ basket: true, extra: '🔔 Closed' });
    audio.startAmbience('kitchen'); audio.startMusic();
    if (!this.state.game.flags.restaurantTip) { this.state.game.flags.restaurantTip = true; this.state.save(); setTimeout(() => this.ui.toast('Flip the sign to open. Regulars sit and ask for dishes — cook at the worktop!', { icon: '🍲', dur: 4500 }), 900); }
  }
  exit() {
    this.ui.prompt.hide();
    for (const c of this.customers) this.customerLayer.remove(c.root); this.customers = [];
    this.activeGame?.cancel(); this.activeGame = null; this.auto = null;
    for (const t of this.tables) { if (t.plate) { t.group.remove(t.plate); t.plate = null; } t.occupant = null; }
    if (this.specialMesh) { this.world.remove(this.specialMesh); this.specialMesh = null; }
    this.gigi.setCarry(null); this.gigi.workPose = false;
    this.sprout.hintTarget = null;
  }
  _leave() { if (this.game.scenes.transitioning || this.busy) return; audio.door(); this.game.scenes.go('hub', { from: 'restaurant' }); }

  // ------------------------------------------------------------------ open / close
  _setSign(open) { if (this.signText) { this.world.remove(this.signText); this.signText.material.map.dispose(); } this.signText = makeTextSprite(open ? 'OPEN' : 'CLOSED', { size: 40, color: open ? '#5c7d4a' : '#9c3f22', bg: 'transparent' }); this.signText.position.set(1.2, 1.7, 6.9); this.signText.scale.multiplyScalar(0.4); this.world.add(this.signText); juice.wobble(this.signBoard, 0.3, 0.6); this.signInteractable.label = open ? 'Close up' : 'Open up'; if (this.ui.hud?.extra) this.ui.hud.extra.textContent = open ? '🔔 Open' : '🔔 Closed'; }
  _openUp() {
    if (this.busy) return;
    if (this.state.inventory.length === 0) { audio.wobble(); this.ui.toast('The basket is empty — gather some ingredients first!', { icon: '🧺', dur: 3000 }); return; }
    this.open = true; this._setSign(true); audio.bell(); audio.success();
    this.ui.toast('The Little Sprout is open!', { icon: '🔔' });
    const n = clamp(ECONOMY.minCustomers + Math.floor(Math.random() * ECONOMY.maxCustomers), 1, Math.min(this.state.game.tables, ECONOMY.maxCustomers));
    for (let i = 0; i < n; i++) tweens.timer(() => this._arriveCustomer(), 1.2 + i * 2.6);
  }
  async _closeUp() {
    if (this.busy || !this.open) return;
    this.busy = true; this.frozen = true;
    this.open = false; this._setSign(false); audio.bell();
    // Sprout's favourite buys any unsold special at base price
    if (this.special) {
      const fav = this.customers.find((c) => c.id === SPROUT_FAVOURITE) || await this._walkIn(SPROUT_FAVOURITE);
      this.ui.toast(`${fav.regular.short} buys the unsold ${RECIPES[this.special.recipeId].name}`, { icon: '🧺' });
      await this._pay(fav, this.special.recipeId, { ...this.special.receipt, tip: 0, bonus: 0, total: this.special.receipt.price }, true);
      if (this.specialMesh) { this.world.remove(this.specialMesh); this.specialMesh = null; } this.special = null;
    }
    // everyone leaves
    await Promise.all(this.customers.map((c) => this._customerLeaves(c, false)));
    this._showTill();
  }
  _showTill() {
    const t = this.till; const total = t.sales + t.tips + t.bonus;
    const body = el('div', 'receipt');
    body.innerHTML = `<div class="line"><span>Dishes served</span><span>${t.dishes}</span></div>
      ${t.served.map((s) => `<div class="line muted"><span>${RECIPES[s.recipeId].icon} ${RECIPES[s.recipeId].name} → ${s.who}</span><span>${s.total} CP</span></div>`).join('')}
      <div class="line"><span>Sales</span><span>${t.sales} CP</span></div>
      <div class="line"><span>Tips</span><span>+${t.tips} CP</span></div>
      ${t.bonus ? `<div class="line"><span>First-time bonuses</span><span>+${t.bonus} CP</span></div>` : ''}
      <div class="line total"><span>Today's takings</span><span>🪙 ${total} CP</span></div>
      <p class="tiny muted center">You now have ${this.state.cp} Cosy Points.</p>`;
    this.ui.modal({ title: '🧾 Till tally', body, closable: false, buttons: [{ label: 'Back to the lane', onClick: () => { this.busy = false; this.frozen = false; this._leave(); } }] });
    if (total > 0) audio.fanfare();
  }

  // ------------------------------------------------------------------ customers & orders
  _freeTable() { return this.tables.find((t) => t.index < this.state.game.tables && !t.occupant) || null; }
  _pickRegular(exclude = []) {
    const seated = this.customers.map((c) => c.id);
    const pool = REGULAR_IDS.filter((id) => !seated.includes(id) && !exclude.includes(id));
    if (!pool.length) return null;
    // prefer those not served today
    const fresh = pool.filter((id) => this.state.friendship(id).lastDay !== this.state.game.day);
    const from = fresh.length ? fresh : pool;
    return from[Math.floor(Math.random() * from.length)];
  }
  _makeOrder(regular) {
    const known = this.state.game.knownRecipes;
    let candidates = known.filter((id) => this.state.hasIngredients(RECIPES[id].ingredients));
    if (!candidates.length) candidates = [...known];
    const weight = (id) => 1 + RECIPES[id].tags.filter((t) => regular.likes.includes(t)).length * 2;
    // vague hint sometimes
    if (Math.random() < 0.3) {
      const hints = regular.hints.filter((h) => candidates.some((id) => HINTS[h].test(RECIPES[id])));
      if (hints.length) return { type: 'hint', hint: hints[Math.floor(Math.random() * hints.length)] };
    }
    let total = candidates.reduce((a, id) => a + weight(id), 0), r = Math.random() * total;
    for (const id of candidates) { r -= weight(id); if (r <= 0) return { type: 'recipe', recipeId: id }; }
    return { type: 'recipe', recipeId: candidates[candidates.length - 1] };
  }
  async _arriveCustomer() {
    if (!this.open) return;
    const table = this._freeTable(); if (!table) return;
    const id = this._pickRegular(); if (!id) return;
    const c = new Customer(id); c.root.position.copy(L.doorOutside); c.root.scale.setScalar(0.01); this.customerLayer.add(c.root); this.customers.push(c);
    table.occupant = c; c.table = table;
    audio.door(); this.sprout.react('🎵'); audio.chirp();
    c.fade(1, 0.3);
    await c.walkPath([L.doorInside, new THREE.Vector3(table.seat.x, 0, table.seat.z + 0.9), new THREE.Vector3(table.seat.x, 0, table.seat.z)], 2.6);
    c.sitAt(table.seat);
    c.order = this._makeOrder(c.regular);
    this._showOrderBubble(c);
    this.ui.toast(`${c.regular.name}: “${c.regular.line}”`, { icon: '💬', dur: 2600 });
  }
  _showOrderBubble(c) {
    if (!c.order) { c.setBubble(null); return; }
    if (c.order.type === 'recipe') { const r = RECIPES[c.order.recipeId]; c.setBubble({ icon: r.icon, text: r.name }); }
    else c.setBubble({ icon: '💭', text: HINTS[c.order.hint].text });
  }
  /** A regular walks in from the door to the counter (for specials). */
  async _walkIn(preferId) {
    const id = preferId || this._pickRegular();
    const c = new Customer(id); c.root.position.copy(L.doorOutside); c.root.scale.setScalar(0.01); this.customerLayer.add(c.root); this.customers.push(c); c.walkIn = true;
    audio.door(); c.fade(1, 0.3);
    await c.walkPath([L.doorInside, new THREE.Vector3(1.6, 0, 0.4)], 2.8);
    c.faceYaw(Math.PI);
    return c;
  }
  async _customerLeaves(c, wave = true) {
    c.setBubble(null); c.stand();
    if (c.table) { c.table.occupant = null; if (c.table.plate) { c.table.group.remove(c.table.plate); c.table.plate = null; } }
    if (wave) c.react('👋');
    const path = [];
    if (c.table) path.push(new THREE.Vector3(c.table.seat.x, 0, c.table.seat.z + 0.9));
    if (c.regular.pets && Math.random() < 0.7) {
      path.push(L.petSpot.clone());
      await c.walkPath(path, 2.6); path.length = 0;
      c.faceYaw(-Math.PI / 2); await tweens.wait(0.5);
      c.react('💛'); this.sprout.react('💛'); audio.purr(); this.sprout.tailFlick = 1.5;
      await tweens.wait(0.9);
    }
    path.push(L.doorInside, L.doorOutside);
    await c.walkPath(path, 2.6);
    await c.fade(0.01, 0.25);
    this.customerLayer.remove(c.root); this.customers = this.customers.filter((x) => x !== c);
    if (this.open && this.state.inventory.length >= 1) tweens.timer(() => this._arriveCustomer(), ECONOMY.regularReturnDelay);
  }

  // ------------------------------------------------------------------ choose recipe
  _chooseRecipe() {
    if (this.busy || !this.open) return;
    this.ui.openBook({ tab: 'recipes', pick: true, cancelLabel: 'Not now', onChoose: (id) => this._startCook(id), onFreestyle: () => this._freestyle() });
  }
  _freestyle() {
    const inv = this.state.inventory; const chosen = [];
    const body = el('div', 'freestyle');
    const pot = el('div', 'pot'); const chips = el('div', 'chips'); const hint = el('p', 'tiny muted', 'Pick 2–5 ingredients. If they match a hidden recipe, you discover it!');
    body.appendChild(el('p', null, '<b>Freestyle:</b> what goes in the pot?')); body.appendChild(pot); body.appendChild(chips); body.appendChild(hint);
    const render = () => {
      pot.innerHTML = chosen.length ? '' : '<span class="tiny muted">…empty pot…</span>';
      chosen.forEach((it, i) => { const ch = el('div', 'chip', INGREDIENTS[it.id].icon); ch.title = 'Remove'; ch.onclick = () => { audio.click(); chosen.splice(i, 1); render(); }; pot.appendChild(ch); });
      chips.innerHTML = '';
      const counts = {}; for (const it of inv) counts[it.id] = (counts[it.id] || 0) + 1;
      const used = {}; for (const it of chosen) used[it.id] = (used[it.id] || 0) + 1;
      for (const id of Object.keys(counts)) {
        const left = counts[id] - (used[id] || 0);
        const ch = el('div', `chip ${left <= 0 || chosen.length >= 5 ? 'dim' : ''}`, `${INGREDIENTS[id].icon}<small>×${left}</small>`); ch.title = INGREDIENTS[id].name;
        ch.onclick = () => { if (left <= 0 || chosen.length >= 5) return; audio.pop(); const best = inv.filter((it) => it.id === id && !chosen.includes(it)).sort((a, b) => b.q - a.q)[0]; chosen.push(best); render(); };
        chips.appendChild(ch);
      }
      cookBtn.disabled = chosen.length < 2;
    };
    let cookBtn;
    const h = this.ui.modal({ title: '✨ Freestyle', body, closable: true, buttons: [
      { label: 'Back', cls: 'ghost', onClick: () => { this._chooseRecipe(); } },
      { label: 'Cook it!', onClick: () => {
        const ids = chosen.map((c) => c.id); const match = findRecipeByCombo(ids);
        if (!match) { audio.wobble(); this.sprout.react('🤔'); this.ui.toast('Sprout sniffs the pot and shakes his head. Not a recipe… ingredients kept.', { icon: '🐾', dur: 3200 }); return; }
        if (!this.state.knowsRecipe(match)) { this.state.learnRecipe(match); audio.unlock(); this.ui.toast(`New recipe discovered: ${RECIPES[match].name}!`, { icon: RECIPES[match].icon, dur: 3500 }); this.sprout.react('🎉'); }
        else this.ui.toast(`That's ${RECIPES[match].name}!`, { icon: RECIPES[match].icon });
        this._startCook(match, chosen);
      } },
    ] });
    cookBtn = h.el.querySelectorAll('.btn')[1];
    render();
  }

  // ------------------------------------------------------------------ cooking flow
  async _startCook(recipeId, chosenItems = null) {
    const recipe = RECIPES[recipeId];
    if (!this.state.hasIngredients(recipe.ingredients)) { this.ui.toast('Missing ingredients!', { icon: '🧺' }); return; }
    this.busy = true; this.frozen = true; this.ui.prompt.hide();
    const items = chosenItems ? this._takeSpecific(chosenItems) : this.state.takeIngredients(recipe.ingredients, true);
    const qualities = items.map((it) => it.q);
    this.gigi.setBasket(false);
    this.ui.toast(`Cooking ${recipe.name}`, { icon: recipe.icon });
    this.sprout.stirring = true;
    await this._walkGigi(L.worktopStand, Math.PI);
    this.gigi.workPose = true;
    const stepScores = [];
    for (let i = 0; i < recipe.steps.length; i++) {
      const step = recipe.steps[i];
      await this._focus(this.worktopAnchor, new THREE.Vector3(1.7, 2.1, 1.5));
      const ing = INGREDIENTS[recipe.ingredients[i % recipe.ingredients.length]];
      const s = await this._runGame(step, { anchor: this.worktopAnchor, ingredient: ing, recipe });
      stepScores.push(s);
    }
    // cook phase at the stove
    await this._unfocus();
    await this._walkGigi(L.stoveStand, Math.PI);
    this.gigi.workPose = true;
    for (const it of items) { audio.plop(); this._plopIngredient(it.id); await tweens.wait(0.22); }
    this.soup.material.color.setHex(this._dishColor(recipe));
    await this._focus(this.stoveAnchor, new THREE.Vector3(1.8, 2.2, 1.6));
    const cookScore = await this._runGame(recipe.cook, { anchor: this.stoveAnchor, ingredient: INGREDIENTS[recipe.ingredients[0]], recipe, pot: this.pot });
    stepScores.push(cookScore);
    await this._unfocus();
    this.gigi.workPose = false; this.sprout.stirring = false;
    // plate up
    const plate = this._makePlate(recipe); this.gigi.setCarry(plate); audio.chime(1); juice.pop(plate, 1.4);
    this.gigi.setExpression('happy');
    // who gets it?
    const target = this._findCustomerFor(recipeId);
    const firstTime = !this.state.game.cookedCount[recipeId];
    const hearts = target ? this.state.friendship(target.c.id).hearts : 0;
    const receipt = computeReceipt({ recipe, stepScores, ingredientQualities: qualities, mode: target ? target.mode : 'special', firstTime, hearts });
    receipt.stepScores = stepScores; receipt.steps = [...recipe.steps, recipe.cook]; receipt.qualities = qualities;
    if (target) await this._serveTable(target.c, recipe, receipt);
    else await this._serveCounter(recipe, receipt);
    this.gigi.setExpression('neutral');
    this.gigi.setBasket(true, this.state.inventory.length / this.state.game.basketCapacity);
    this.busy = false; this.frozen = false;
    if (this.open && !this.state.canCookAnything() && this.state.inventory.length < 2) tweens.timer(() => this.ui.toast('Nothing left to cook — flip the sign to close up when you\'re ready.', { icon: '🔔', dur: 3500 }), 1.5);
  }
  _takeSpecific(items) { const inv = this.state.game.inventory; for (const it of items) { const i = inv.indexOf(it); if (i >= 0) inv.splice(i, 1); } this.state.emit('inventory'); this.state.save(); return items; }
  _dishColor(recipe) { const first = INGREDIENTS[recipe.ingredients[0]]; return first?.color ?? 0xe8a63a; }
  _plopIngredient(id) {
    const ing = INGREDIENTS[id]; const s = sphere(0.12, ing.color, {}, 8); s.position.set(0, 1.6, 0.6); this.stoveAnchor.add(s);
    tweens.to(s.position, { y: 0.4, z: 0 }, 0.35, { ease: Ease.quadIn, onComplete: () => { this.stoveAnchor.remove(s); for (let i = 0; i < 3; i++) this._bubble(); } });
  }
  _makePlate(recipe) {
    const g = new THREE.Group();
    const plate = cylinder(0.32, 0.28, 0.04, 0xfaf6ee); g.add(plate);
    const food = sphere(0.2, this._dishColor(recipe)); food.scale.y = 0.6; food.position.y = 0.1; g.add(food);
    const icon = makeIconSprite(recipe.icon); icon.position.y = 0.55; icon.scale.set(0.5, 0.5, 1); g.add(icon);
    return g;
  }
  _findCustomerFor(recipeId) {
    const r = RECIPES[recipeId];
    const exact = this.customers.find((c) => c.seated && c.order?.type === 'recipe' && c.order.recipeId === recipeId);
    if (exact) return { c: exact, mode: 'exact' };
    const hint = this.customers.find((c) => c.seated && c.order?.type === 'hint' && HINTS[c.order.hint].test(r));
    if (hint) return { c: hint, mode: 'hint' };
    return null;
  }

  _runGame(step, extra) {
    return new Promise((res) => {
      const ctx = { scene: this, input: this.input, ui: this.ui, gigi: this.gigi, sprout: this.sprout, audio, settings: this.state.settings, ...extra };
      this.activeGame = startMiniGame(step, ctx);
      this.activeGame.promise.then((score) => { this.activeGame = null; res(score); });
    });
  }

  /** Scripted walk for Gigi (player input frozen). */
  _walkGigi(target, faceYaw = null) {
    return new Promise((res) => { this.auto = { target: target.clone(), faceYaw, res }; });
  }
  _focus(anchor, offset) {
    this.focused = true;
    const wp = new THREE.Vector3(); anchor.getWorldPosition(wp);
    const to = wp.clone().add(offset);
    const cam = this.camera; const from = cam.position.clone(); const look0 = this.follow.look.clone();
    const st = { t: 0 };
    return tweens.to(st, { t: 1 }, 0.6, { ease: Ease.quadInOut, onUpdate: (e) => { cam.position.lerpVectors(from, to, e); const lk = look0.clone().lerp(wp, e); cam.lookAt(lk); } }).promise;
  }
  _unfocus() {
    this.focused = false;
    const cam = this.camera; const from = cam.position.clone(); const to = this.player.position.clone().add(this.follow.offset); this.follow.snap(this.player.position); const look1 = this.follow.look.clone(); const look0 = this.stoveAnchor.getWorldPosition(new THREE.Vector3());
    const st = { t: 0 }; this.focused = true;
    return tweens.to(st, { t: 1 }, 0.5, { ease: Ease.quadInOut, onUpdate: (e) => { cam.position.lerpVectors(from, to, e); cam.lookAt(look0.clone().lerp(look1, e)); }, onComplete: () => { this.focused = false; } }).promise;
  }

  // ------------------------------------------------------------------ serving & payment
  async _serveTable(c, recipe, receipt) {
    const t = c.table;
    await this._walkGigi(L.counterGap, 0); await this._walkGigi(new THREE.Vector3(L.counterGap.x, 0, 0.6), 0); await this._walkGigi(t.serveSpot, 0);
    // plate onto the table
    const plate = this.gigi.carry; this.gigi.setCarry(null); plate.position.set(0, 1.03, 0); plate.rotation.set(0, 0, 0); t.group.add(plate); t.plate = plate; juice.squash(plate, 0.2); audio.plop();
    c.setBubble(null); c.react(receipt.quality >= 0.85 ? '🤩' : receipt.quality >= 0.55 ? '😊' : '🙂');
    if (receipt.mode === 'exact') this.ui.toast(`${c.regular.short}: “Exactly what I wanted!”`, { icon: '💬' }); else this.ui.toast(`${c.regular.short}: “Ooh, that'll do nicely.”`, { icon: '💬' });
    await c.eat(2.6);
    this.frozen = false; // player may wander while they finish
    await this._pay(c, recipe.id || Object.keys(RECIPES).find((k) => RECIPES[k] === recipe), receipt, false);
    this._afterServe(c);
    await tweens.wait(1.2);
    this._customerLeaves(c, true);
  }
  async _serveCounter(recipe, receipt) {
    await this._walkGigi(new THREE.Vector3(1.6, 0, -1.9), 0);
    const plate = this.gigi.carry; this.gigi.setCarry(null); plate.position.copy(L.counterSpecial).add(new THREE.Vector3(0, 0.02, 0)); this.world.add(plate); this.specialMesh = plate; juice.squash(plate, 0.2); audio.plop();
    const recipeId = Object.keys(RECIPES).find((k) => RECIPES[k] === recipe);
    this.special = { recipeId, receipt };
    this.chalkIcon.material.map = makeIconSprite(recipe.icon).material.map; this.chalkIcon.material.needsUpdate = true;
    this.ui.toast(`Today's special: ${recipe.name} (on the counter)`, { icon: '📋' });
    this.frozen = false;
    // a seated regular without an order, or a walk-in, comes to buy it
    let buyer = this.customers.find((c) => c.seated && !c.order);
    await tweens.wait(1.2);
    if (buyer) { buyer.stand(); await buyer.walkPath([new THREE.Vector3(buyer.table.seat.x, 0, buyer.table.seat.z + 0.9), new THREE.Vector3(1.6, 0, 0.4)], 2.6); buyer.faceYaw(Math.PI); }
    else buyer = await this._walkIn();
    if (!this.special) return; // closed meanwhile
    buyer.react('😋'); await tweens.wait(0.8);
    this.world.remove(plate); this.specialMesh = null; this.special = null;
    await this._pay(buyer, recipeId, receipt, false);
    this._afterServe(buyer);
    await tweens.wait(0.8);
    if (buyer.walkIn) { await buyer.walkPath([L.doorInside, L.doorOutside], 2.8); await buyer.fade(0.01, 0.25); this.customerLayer.remove(buyer.root); this.customers = this.customers.filter((x) => x !== buyer); }
    else { await buyer.walkPath([new THREE.Vector3(buyer.table.seat.x, 0, buyer.table.seat.z + 0.9), new THREE.Vector3(buyer.table.seat.x, 0, buyer.table.seat.z)], 2.6); buyer.sitAt(buyer.table.seat); }
  }
  /** Coin pouch hops from customer to Gigi; CP ticks up; receipt card. */
  async _pay(c, recipeId, receipt, quiet) {
    const pouch = makeIconSprite('👛'); const from = c.root.position.clone().add(new THREE.Vector3(0, 1.6, 0)); pouch.position.copy(from); pouch.scale.set(0.7, 0.7, 1); this.fxLayer.add(pouch);
    audio.coins(6);
    const to = this.gigi.root.position.clone().add(new THREE.Vector3(0, 1.4, 0));
    const st = { t: 0 };
    await tweens.to(st, { t: 1 }, 0.7, { ease: Ease.quadInOut, onUpdate: (e) => { pouch.position.lerpVectors(from, to, e); pouch.position.y += Math.sin(e * Math.PI) * 1.2; } }).promise;
    this.fxLayer.remove(pouch);
    this.state.earn(receipt.total, recipeId);
    juice.pop(this.gigi.head, 1.15);
    const first = this.state.recordCook(recipeId, receipt.quality);
    this.till.dishes++; this.till.sales += receipt.price; this.till.tips += receipt.tip; this.till.bonus += receipt.bonus; this.till.served.push({ recipeId, who: c.regular.short, total: receipt.total });
    const r = RECIPES[recipeId];
    this._floatText(this.gigi.root.position, `+${receipt.total} CP`, '#5c7d4a');
    if (!quiet) this._showReceipt(r, receipt, c);
    if (receipt.quality >= 0.95) { this.ui.toast('📷 Perfect dish! A photo goes up on the wall.', { icon: '✨' }); this._applyDecor(); }
    return first;
  }
  _showReceipt(r, receipt, c) {
    const stepLines = receipt.steps ? receipt.steps.map((s, i) => `<div class="line muted"><span>${STEP_INFO[s]?.title || s}</span><span class="stars">${stars(scoreToStars(receipt.stepScores[i]))}</span></div>`).join('') : '';
    const qAvg = receipt.qualities?.length ? receipt.qualities.reduce((a, b) => a + b, 0) / receipt.qualities.length : 2;
    const modeText = receipt.mode === 'exact' ? `${c.regular.short}'s order` : receipt.mode === 'hint' ? `${c.regular.short} wanted “${HINTS[c.order?.hint]?.text || 'something'}”` : `Counter special (${Math.round(ECONOMY.specialPriceScale * 100)}% price)`;
    const body = el('div', 'receipt');
    body.innerHTML = `<div class="line"><span>${r.icon} ${r.name}</span><span>${receipt.price} CP</span></div>
      <div class="line muted"><span>${modeText}</span><span></span></div>
      ${stepLines}
      <div class="line muted"><span>Ingredients</span><span class="stars">${stars(Math.round(qAvg))}</span></div>
      <div class="line"><span>Tip${receipt.sproutApproved ? ' · 😸 Sprout approved!' : ''}</span><span>+${receipt.tip} CP</span></div>
      ${receipt.bonus ? `<div class="line"><span>First time cooked — delighted!</span><span>+${receipt.bonus} CP</span></div>` : ''}
      <div class="line total"><span>→ Cosy Points</span><span>${receipt.total}</span></div>`;
    const h = this.ui.modal({ title: '🧾 Receipt', body, closable: true, buttons: [{ label: 'Lovely!', onClick: () => {} }] });
    tweens.timer(() => { if (this.ui.modals.includes(h)) h.close(); }, 6);
  }
  _afterServe(c) {
    const { gained, f } = this.state.serveRegular(c.id);
    if (gained) { audio.heart(); c.react('💗'); this.ui.toast(`${c.regular.short} likes you a little more (${'♥'.repeat(f.hearts)})`, { icon: '💗', dur: 3000 }); }
    if (f.hearts >= ECONOMY.friendshipGiftAt && !f.gifted) {
      const pool = Object.keys(ITEMS).filter((id) => !this.state.owns(id) && ['hat', 'accessory', 'cat', 'shoes'].includes(ITEMS[id].slot));
      if (pool.length) { const gift = pool[Math.floor(Math.random() * pool.length)]; this.state.grant(gift); f.gifted = true; this.state.save(); audio.fanfare(); this.ui.toast(`${c.regular.short} brought you a gift: ${ITEMS[gift].name}! (in your wardrobe)`, { icon: '🎁', dur: 4500 }); c.react('🎁'); }
    }
    c.order = null;
  }
  _floatText(pos, text, color) {
    const sp = makeTextSprite(text, { color, bg: 'transparent', size: 48 }); sp.position.copy(pos).add(new THREE.Vector3(0, 2.2, 0)); sp.scale.multiplyScalar(0.7); this.fxLayer.add(sp);
    tweens.to(sp.position, { y: sp.position.y + 1 }, 1.2, { ease: Ease.quadOut }); tweens.to(sp.material, { opacity: 0 }, 1.2, { ease: Ease.quadIn, onComplete: () => this.fxLayer.remove(sp) });
  }

  // ------------------------------------------------------------------ update
  update(dt) {
    if (this.game.scenes.transitioning) { this.gigi.update(dt, { moving: 0 }); return; }
    // scripted Gigi movement
    if (this.auto) {
      const a = this.auto; const p = this.player.position; const dx = a.target.x - p.x, dz = a.target.z - p.z; const d = Math.hypot(dx, dz); const step = 3.4 * dt;
      if (d <= step) { p.x = a.target.x; p.z = a.target.z; if (a.faceYaw != null) this.player.facing = a.faceYaw; this.player.root.rotation.y = this.player.facing; this.gigi.update(dt, { moving: 0 }); this.auto = null; a.res(); }
      else { p.x += (dx / d) * step; p.z += (dz / d) * step; const yaw = Math.atan2(dx, dz); let dy = yaw - this.player.facing; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; this.player.facing += dy * Math.min(1, dt * 12); this.player.root.rotation.y = this.player.facing; this.gigi.update(dt, { moving: 1, speed: 1 }); }
      if (!this.focused) this.follow.update(dt, this.player.position, null);
      this.sprout.update(dt, this.player.position, false, this.player.facing); this._sproutOnStool(dt);
      this.ui.prompt.hide();
    } else if (this.activeGame) {
      this.gigi.update(dt, { moving: 0 });
      this.activeGame.update(dt);
      this.sprout.update(dt, this.player.position, false, this.player.facing); this._sproutOnStool(dt);
      if (this.input.pausePressed && !this.ui.modals.length) this.ui.pauseMenu();
    } else {
      this.player.frozen = this.input.locked || this.frozen;
      const cp = this.camera.position, pp = this.player.position; this.player.idleFaceYaw = Math.atan2(cp.x - pp.x, cp.z - pp.z);
      this.player.update(dt, this.input, this.follow.yaw);
      this.sprout.update(dt, this.player.position, this.player.moving, this.player.facing); this._sproutOnStool(dt);
      if (!this.focused) this.follow.update(dt, this.player.position, this.player.vel);
      this.updateInteractables(dt, this.player.position, this.input.locked || this.frozen);
      if (this.input.pausePressed && !this.ui.modals.length) this.ui.pauseMenu();
      if (this.input.menuPressed && !this.ui.modals.length) this.openBook();
    }
    for (const c of this.customers) c.update(dt);
    this._updatePot(dt);
    this.sun.position.set(-4, 12, 6);
  }
  _sproutOnStool(dt) {
    const s = this.sprout; s.root.position.set(L.stool.x, 0.56, L.stool.z);
    s.state = 'sit'; s.body.rotation.z = 0.55; s.legs[2].rotation.z = 1.4; s.legs[3].rotation.z = 1.4;
    // idle stirring paw + reacts
    const w = this.stirW || 0; s.legs[0].rotation.z = -0.4 + Math.sin(this.game.time * (this.sprout.stirring ? 8 : 3)) * (this.sprout.stirring ? 0.6 : 0.25);
    if (s.tailFlick > 0) { s.tailFlick -= dt; s.tail.rotation.x = Math.sin(this.game.time * 18) * 0.7; }
    s.stirBeat = (om) => { this.stirW = om; };
    // face the stove/Gigi
    const target = this.busy ? L.stove : this.player.position; const yaw = Math.atan2(target.x - s.root.position.x, target.z - s.root.position.z); s.root.rotation.y = yaw - Math.PI / 2;
  }
  openBook() { this.ui.openBook?.({ tab: 'recipes' }); }
}
