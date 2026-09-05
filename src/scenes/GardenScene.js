// Mini-game 1: Gathering. Hand-laid garden and meadow maps with randomised spawns, four
// interaction types (pick / pull / shake / forage), star quality, basket, day arc, rare glows.
import * as THREE from 'three';
import { WalkScene } from './WalkScene.js';
import { makeGround, makeFence, makeGate, makeTree, makeBush, makeSignpost, makeRock, makePath, box, sphere, cylinder, cone, capsule, makeIconSprite, makeTextSprite, scatterInstanced, grassInstanced, collectColliders } from '../world/props.js';
import { makeSkyDome, makeClouds } from '../world/textures.js';
import { PALETTE, makeUniqueMaterial } from '../world/materials.js';
import { AREAS, SPAWN_TUNING, RARITY_WEIGHT } from '../data/spawns.js';
import { INGREDIENTS, stars } from '../data/ingredients.js';
import { audio } from '../engine/Audio.js';
import { tweens, juice, Ease, lerp, clamp } from '../engine/Tween.js';

const T = SPAWN_TUNING;

export class GardenScene extends WalkScene {
  constructor() { super(); this.curve = { curvature: 0.003, start: 8 }; this.areas = {}; this.areaId = null; this.nodes = []; this.fruits = []; this.fx = []; }

  // ------------------------------------------------------------------ build
  buildStatic() {
    if (this.built) return; this.built = true;
    this.three.background = new THREE.Color(PALETTE.sky);
    this.three.fog = new THREE.Fog(0xd2e8f4, 40, 80);
    this.setupLights({ shadowSize: 26, pos: [14, 26, 10] });
    this.setupCharacters({ offset: new THREE.Vector3(0, 6.8, 12) });
    this.spawnLayer = new THREE.Group(); this.three.add(this.spawnLayer);
    this.sky = makeSkyDome(0x3f8fd0, 0xa8d4ee); this.three.add(this.sky);
    this.clouds = makeClouds(8, { radius: 70, height: 26 }); this.three.add(this.clouds);
    this.fxLayer = new THREE.Group(); this.three.add(this.fxLayer);
    this.sunIndicator = null;
  }

  /** Build (once) and return the static world group for an area. */
  buildArea(areaId) {
    if (this.areas[areaId]) return this.areas[areaId];
    const A = AREAS[areaId];
    const g = new THREE.Group(); g.name = areaId;
    const { w, d } = A.size;
    g.add(makeGround(Math.max(w, d) + 60, areaId === 'meadow' ? 0x9cc070 : PALETTE.grass));
    // fences
    const fN = makeFence(w, true); fN.position.set(0, 0, -d / 2); g.add(fN);
    const fW = makeFence(d, false); fW.position.set(-w / 2, 0, 0); g.add(fW);
    const fE = makeFence(d, false); fE.position.set(w / 2, 0, 0); g.add(fE);
    // south fence with a gap for the gate
    const gapW = 3.2; const segW = (w - gapW) / 2;
    const fS1 = makeFence(segW, true); fS1.position.set(-gapW / 2 - segW / 2, 0, d / 2); g.add(fS1);
    const fS2 = makeFence(segW, true); fS2.position.set(gapW / 2 + segW / 2, 0, d / 2); g.add(fS2);
    const gate = makeGate(2.8); gate.position.set(A.gate.x, 0, d / 2); g.add(gate);
    g.add(makePath(A.gate.x, d / 2, A.gate.x, d / 2 - 5, 1.8));
    const exitSign = makeSignpost(areaId === 'garden' ? 'To the lane' : 'Back to the garden'); exitSign.position.set(A.gate.x + 2.2, 0, d / 2 - 0.6); g.add(exitSign);

    if (areaId === 'garden') {
      // north gate to the meadow (gap in the north fence)
      fN.visible = false;
      const fN1 = makeFence(segW, true); fN1.position.set(-gapW / 2 - segW / 2, 0, -d / 2); g.add(fN1);
      const fN2 = makeFence(segW, true); fN2.position.set(gapW / 2 + segW / 2, 0, -d / 2); g.add(fN2);
      this.meadowGate = makeGate(2.8); this.meadowGate.position.set(0, 0, -d / 2); g.add(this.meadowGate);
      const ms = makeSignpost('Meadow'); ms.position.set(2.2, 0, -d / 2 + 0.8); g.add(ms);
      g.add(makePath(0, -d / 2, 0, -d / 2 + 4, 1.8));
      // vegetable beds (soil slabs)
      for (const [x, z] of [[-7, -4], [-7, -1], [-8, 2]]) { const bed = box(6.2, 0.18, 1.6, 0x6e4a2e); bed.position.set(x, 0.09, z); bed.receiveShadow = true; g.add(bed); }
      const bed2 = box(6.2, 0.18, 1.6, 0x6e4a2e); bed2.position.set(2, 0.09, -6); g.add(bed2);
      const bed3 = box(6.2, 0.18, 1.6, 0x6e4a2e); bed3.position.set(2, 0.09, -3); g.add(bed3);
      // hen coop
      const coop = box(2.2, 1.4, 1.6, PALETTE.honey); coop.position.set(6.5, 0.7, 8.5); g.add(coop);
      const coopRoof = box(2.6, 0.2, 2.0, PALETTE.terracotta); coopRoof.position.set(6.5, 1.5, 8.5); g.add(coopRoof);
      coop.userData.collider = { hw: 1.1, hd: 0.8 };
      for (const [x, z] of [[2.2, 9.5], [5.5, 6.2]]) { const hen = makeHen(); hen.position.set(x, 0, z); g.add(hen); }
      // shady log corner for mushrooms
      const log = cylinder(0.35, 0.35, 3.2, PALETTE.walnut); log.rotation.z = Math.PI / 2; log.position.set(-11.5, 0.35, 9.5); g.add(log);
      const shadeTree = makeTree(1.4, 0x4f7f3f); shadeTree.position.set(-13.5, 0, 11); g.add(shadeTree);
      // hedge behind berries
      for (const [x, z] of [[9, -10.5], [11.5, -10], [13.5, -8], [14, -5]]) { const b = makeBush(1.0, 0x4f7f3f); b.position.set(x, 0, z); g.add(b); }
      // small pond / decor
      const pond = new THREE.Mesh(new THREE.CircleGeometry(1.6, 20), makeUniqueMaterial({ color: PALETTE.water, roughness: 0.3 })); pond.rotation.x = -Math.PI / 2; pond.position.set(-2, 0.02, 10); pond.receiveShadow = true; g.add(pond);
      for (const [x, z] of [[-4, 12], [0.2, 11.5]]) { const r = makeRock(0.8); r.position.set(x, 0, z); g.add(r); }
      g.add(scatterInstanced(160, { x: 0, z: 0, w: w - 4, d: d - 4 }, { avoid: [{ x: -7, z: -1, r: 5 }, { x: 2, z: -4.5, r: 4.5 }, { x: 0, z: 13, r: 4 }], seed: 5 }));
      g.add(grassInstanced(500, { x: 0, z: 0, w: w - 3, d: d - 3 }, { avoid: [{ x: -7, z: -1, r: 5 }, { x: 2, z: -4.5, r: 4.5 }], seed: 9 }));
    } else {
      // meadow: open, wild, a stream, a beehive stand and a milk churn
      const stream = box(2.4, 0.05, d + 10, PALETTE.water); stream.position.set(-w / 2 + 6, 0.02, 0); stream.receiveShadow = true; g.add(stream);
      for (let i = 0; i < 4; i++) { const plank = box(3.2, 0.12, 1.2, PALETTE.honey); plank.position.set(-w / 2 + 6, 0.12, -10 + i * 7); g.add(plank); }
      const hive = new THREE.Group(); const stand = box(0.8, 0.5, 0.8, PALETTE.walnut); stand.position.y = 0.25; hive.add(stand);
      for (let i = 0; i < 3; i++) { const tier = box(0.9 - i * 0.05, 0.28, 0.9 - i * 0.05, 0xf2d27a); tier.position.y = 0.64 + i * 0.28; hive.add(tier); }
      const lid = box(1.0, 0.1, 1.0, PALETTE.terracotta); lid.position.y = 1.5; hive.add(lid);
      hive.position.set(14, 0, -4); hive.userData.collider = { r: 0.6 }; g.add(hive); this.hive = hive;
      const churn = cylinder(0.32, 0.28, 0.9, 0xb9b1a3, { metalness: 0.4, roughness: 0.4 }); churn.position.set(0, 0.45, 6); g.add(churn);
      const churnLid = cylinder(0.34, 0.34, 0.08, 0x8a8480, { metalness: 0.4, roughness: 0.4 }); churnLid.position.set(0, 0.94, 6); g.add(churnLid);
      const churnSign = makeSignpost('Fresh milk · help yourself'); churnSign.position.set(1.4, 0, 6.6); g.add(churnSign);
      for (const [x, z, s] of [[-17, -14, 1.3], [17, -14, 1.2], [18, 12, 1.1], [-17, 14, 1.2], [8, -15, 1.0], [-8, 14, 0.9]]) { const t = makeTree(s, 0x5a9a48); t.position.set(x, 0, z); g.add(t); }
      for (const [x, z] of [[-4, 4], [10, 10], [-16, 6], [6, 12]]) { const b = makeBush(0.9, 0x6fa85a); b.position.set(x, 0, z); g.add(b); }
      g.add(scatterInstanced(420, { x: 0, z: 0, w: w - 4, d: d - 4 }, { colors: [0xf0a3c0, 0xf2c94c, 0xfaf6ee, 0xe07090, 0xa9d3e6, 0xb8a0d8], avoid: [{ x: 0, z: 15, r: 4 }], seed: 21 }));
      g.add(grassInstanced(900, { x: 0, z: 0, w: w - 3, d: d - 3 }, { seed: 23, color: 0x86b862 }));
    }
    // fixed visuals for spawn points (trees for shake, plant beds etc. are per-node)
    for (const sp of A.spawns) {
      if (sp.kind === 'shake') { const t = makeTree(1.25, 0x5f9a4a); t.position.set(sp.x, 0, sp.z); t.userData.collider = { r: 0.45 }; g.add(t); sp._tree = t; }
    }
    g.userData.colliders = collectColliders(g);
    this.areas[areaId] = g;
    return g;
  }

  // ------------------------------------------------------------------ enter / exit
  enter(params = {}) {
    super.enter(); this.buildStatic();
    const areaId = params.area || 'garden';
    if (this.world) this.three.remove(this.world);
    this.world = this.buildArea(areaId); this.three.add(this.world);
    this.areaId = areaId; const A = AREAS[areaId];
    this.player.setColliders(this.world.userData.colliders);
    this.player.setBounds({ minX: -A.size.w / 2 + 0.6, maxX: A.size.w / 2 - 0.6, minZ: -A.size.d / 2 + 0.6, maxZ: A.size.d / 2 - 0.6 });
    this.refreshLook(true);
    if (params.fromNorth) this.placePlayer(0, -A.size.d / 2 + 2.2, Math.PI); else this.placePlayer(A.gate.x, A.size.d / 2 - 2.2, 0);
    this.frozen = false;
    this.ui.showHUD({ basket: true, extra: '🌅 Morning' });
    this._setupInteractables(A);
    this._spawnAll(A);
    if (!params.continueDay) { this.dayT = 0; this.chimed = false; }
    audio.startAmbience('outdoor'); audio.startMusic();
    if (!this.state.game.flags.gardenTip) { this.state.game.flags.gardenTip = true; this.state.save(); setTimeout(() => this.ui.toast('Hold to pick, tap to the wobble to pull, shake trees, and follow Sprout\'s ❗ to forage', { icon: '🧺', dur: 5000 }), 900); }
  }
  exit() {
    this.ui.prompt.hide();
    this.sprout.hintTarget = null; this.sprout.showHint(false);
    this._clearSpawns();
  }

  _setupInteractables(A) {
    // keep the pet interactable, rebuild the rest
    this.interactables = this.interactables.filter((i) => i === this.petInteractable);
    const d = A.size.d;
    this.addInteractable({ position: new THREE.Vector3(A.gate.x, 0, d / 2 - 0.4), radius: 2.4, label: this.areaId === 'garden' ? 'Leave the garden' : 'Back to the garden', icon: 'leave', priority: 1, onInteract: () => this._leave() });
    if (this.areaId === 'garden') {
      this.addInteractable({ position: new THREE.Vector3(0, 0, -d / 2 + 0.4), radius: 2.4, label: 'Meadow gate', icon: 'meadow', priority: 1, onInteract: () => this._toMeadow() });
    }
  }
  _leave() {
    if (this.game.scenes.transitioning) return;
    audio.door();
    if (this.areaId === 'meadow') { this.game.scenes.go('garden', { area: 'garden', fromNorth: true, continueDay: true }); return; }
    this.state.nextDay();
    this.game.scenes.go('hub', { from: 'garden' });
  }
  _toMeadow() {
    if (this.game.scenes.transitioning) return;
    if (!this.state.meadowUnlocked) { audio.wobble(); this.ui.toast(`The meadow gate is stuck… it opens once you've earned ${T.meadowUnlockCP} CP (${this.state.game.totalEarned} so far)`, { icon: '🔒', dur: 3200 }); return; }
    audio.door(); this.game.scenes.go('garden', { area: 'meadow', continueDay: true });
  }

  // ------------------------------------------------------------------ spawns
  _clearSpawns() {
    for (const n of this.nodes) { this.spawnLayer.remove(n.group); this.disposeSubtree(n.group); }
    this.nodes = [];
    for (const f of this.fruits) this.fxLayer.remove(f.mesh);
    this.fruits = [];
    for (const f of this.fx) this.fxLayer.remove(f.obj);
    this.fx = [];
  }
  _pickIngredient(pool) {
    const weights = pool.map((id) => RARITY_WEIGHT[INGREDIENTS[id].rarity]);
    let total = weights.reduce((a, b) => a + b, 0), r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) return pool[i]; }
    return pool[pool.length - 1];
  }
  _spawnAll(A) {
    this._clearSpawns();
    for (const sp of A.spawns) {
      if (sp.kind !== 'shake' && !sp.fixed && Math.random() > T.spawnChance) continue;
      const id = sp.fixed || this._pickIngredient(sp.pool);
      const ing = INGREDIENTS[id];
      const node = { def: sp, id, ing, kind: sp.kind, rare: ing.rarity === 'rare', taken: false, hidden: sp.kind === 'forage', t: Math.random() * 10, taps: 0, perfects: 0, group: new THREE.Group() };
      node.group.position.set(sp.x, 0, sp.z);
      this._buildNodeVisual(node);
      this.spawnLayer.add(node.group);
      if (node.hidden) node.group.visible = false;
      node.interactable = this.addInteractable({
        position: node.group.position, radius: sp.kind === 'shake' ? 2.4 : 1.9, label: this._label(node), icon: sp.kind, promptHeight: sp.kind === 'shake' ? 3.2 : 1.3,
        hold: sp.kind === 'pick' ? T.pickHoldTime : undefined,
        enabled: () => !node.taken && !node.hidden && !this.frozen,
        onHoldProgress: (p) => { node.group.scale.setScalar(1 + p * 0.12); },
        onInteract: () => this._interact(node),
      });
      this.nodes.push(node);
    }
  }
  _label(node) {
    const n = node.ing.name;
    if (node.def.label) return node.def.label;
    return { pick: `Pick ${n}`, pull: `Pull ${n}`, shake: 'Shake the tree', forage: `Gather ${n}` }[node.kind] || n;
  }

  _buildNodeVisual(node) {
    const g = node.group, c = node.ing.color;
    const glow = node.rare ? { emissive: T.rareGlowColor, emissiveIntensity: 0.6 } : {};
    switch (node.kind) {
      case 'pull': {
        const mound = cylinder(0.36, 0.42, 0.14, 0x7a5236); mound.position.y = 0.2; g.add(mound);
        const leaves = new THREE.Group(); leaves.position.y = 0.26;
        for (let i = 0; i < 4; i++) { const l = cone(0.1, 0.45, 0x5f9a4a); l.position.set((i % 2 - 0.5) * 0.18, 0.2, (Math.floor(i / 2) - 0.5) * 0.18); l.rotation.set((Math.random() - 0.5) * 0.5, 0, (Math.random() - 0.5) * 0.5); leaves.add(l); }
        g.add(leaves); node.leaves = leaves;
        // the vegetable itself hidden in the soil
        const veg = capsule(0.13, 0.22, c, glow); veg.position.y = 0.02; veg.visible = false; g.add(veg); node.veg = veg;
        break;
      }
      case 'pick': {
        if (node.id === 'wheat') { for (let i = 0; i < 6; i++) { const x = (Math.random() - 0.5) * 0.5, z = (Math.random() - 0.5) * 0.5; const st = cylinder(0.015, 0.02, 0.7, 0xc9b26a); st.position.set(x, 0.35, z); st.castShadow = false; g.add(st); const head = capsule(0.045, 0.14, 0xe8c96a, glow); head.position.set(x, 0.78, z); g.add(head); } }
        else if (node.id === 'pumpkin') { const p = sphere(0.36, c, glow); p.scale.y = 0.8; p.position.y = 0.3; g.add(p); const stem = cylinder(0.04, 0.05, 0.15, 0x5f9a4a); stem.position.y = 0.62; g.add(stem); }
        else if (node.id === 'milk') { const j = cylinder(0.14, 0.12, 0.34, 0xfaf6ee); j.position.set(0.55, 0.17, 0.3); g.add(j); }
        else if (node.id === 'herb' || node.id === 'wild_thyme' || node.id === 'golden_sage') { for (let i = 0; i < 6; i++) { const l = cone(0.07, 0.4, c, glow); l.position.set((Math.random() - 0.5) * 0.4, 0.2, (Math.random() - 0.5) * 0.4); l.rotation.set((Math.random() - 0.5) * 0.6, 0, (Math.random() - 0.5) * 0.6); g.add(l); } }
        else if (node.id === 'flower') { for (let i = 0; i < 5; i++) { const st = cylinder(0.02, 0.02, 0.4, 0x5f9a4a); st.position.set((Math.random() - 0.5) * 0.4, 0.2, (Math.random() - 0.5) * 0.4); g.add(st); const h = sphere(0.09, [0xf0a3c0, 0xf2c94c, 0xfaf6ee][i % 3], glow, 8); h.position.set(st.position.x, 0.42, st.position.z); g.add(h); } }
        else { // bushy plant with fruits (tomato, berries, strawberries)
          const bush = sphere(0.42, 0x5f9a4a); bush.position.y = 0.42; bush.scale.y = 0.85; g.add(bush);
          if (node.id === 'tomato') { const stake = cylinder(0.03, 0.03, 1.1, PALETTE.honey); stake.position.y = 0.55; g.add(stake); }
          for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const f = sphere(node.id === 'tomato' ? 0.11 : 0.07, c, glow, 8); f.position.set(Math.cos(a) * 0.36, 0.42 + Math.sin(i * 2) * 0.15, Math.sin(a) * 0.36); g.add(f); }
        }
        break;
      }
      case 'shake': {
        node.fruitMeshes = [];
        const tree = node.def._tree;
        const n = 3;
        for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + 0.5; const f = sphere(0.16, c, glow, 10); f.position.set(Math.cos(a) * 1.0, 2.0 + Math.sin(a * 3) * 0.3, Math.sin(a) * 1.0 + 0.4); node.fruitMeshes.push(f); g.add(f); }
        node.tree = tree;
        break;
      }
      case 'forage': {
        if (node.id === 'egg') { const nest = cylinder(0.3, 0.22, 0.14, 0xc9a06a); nest.position.y = 0.07; g.add(nest); const e = sphere(0.12, 0xf3ead8, glow); e.scale.y = 1.25; e.position.y = 0.22; g.add(e); }
        else if (node.id === 'honey' || node.id === 'honeycomb') { const pot = cylinder(0.14, 0.12, 0.2, 0xe8a63a, glow); pot.position.set(0.7, 0.62, 0.3); g.add(pot); }
        else { const stem = cylinder(0.08, 0.1, 0.28, 0xf3ead8); stem.position.y = 0.14; g.add(stem); const cap = sphere(0.22, c, glow, 12); cap.scale.y = 0.6; cap.position.y = 0.3; g.add(cap); for (let i = 0; i < 3; i++) { const dot = sphere(0.04, 0xfaf6ee, {}, 6); dot.position.set((Math.random() - 0.5) * 0.25, 0.4, (Math.random() - 0.5) * 0.25); g.add(dot); } }
        break;
      }
    }
    if (node.rare) { const sp = makeIconSprite('✨'); sp.position.y = 1.0; sp.scale.set(0.5, 0.5, 1); g.add(sp); node.sparkle = sp; }
  }

  // ------------------------------------------------------------------ interactions
  _interact(node) {
    if (node.taken || this.frozen) return;
    switch (node.kind) {
      case 'pick': {
        // ripeness pulse decides quality: time your hold to the glow
        const ripe = 0.5 + 0.5 * Math.sin(node.t * 2.2);
        const q = ripe > 0.72 ? 3 : ripe < 0.22 ? 1 : 2;
        this._collect(node, q); break;
      }
      case 'pull': {
        const w = Math.sin(node.t * (Math.PI * 2) / T.pullWobblePeriod);
        const perfect = Math.abs(w) > 0.72;
        node.taps++; if (perfect) node.perfects++;
        audio.tick(perfect); juice.squash(node.leaves, perfect ? 0.35 : 0.2, 0.3);
        this._floatText(node.group.position, perfect ? 'Nice!' : 'tug', perfect ? '#5c7d4a' : '#8b5a2b', 1.0);
        node.interactable.label = `Pull ${node.ing.name} (${node.taps}/${T.pullTaps})`;
        if (node.taps >= T.pullTaps) {
          const q = node.perfects >= 3 ? 3 : node.perfects >= 1 ? 2 : 1;
          node.veg.visible = true; node.veg.position.y = 0.02;
          tweens.to(node.veg.position, { y: 0.9 }, 0.25, { ease: Ease.backOut });
          tweens.to(node.leaves.position, { y: 0.9 }, 0.25, { ease: Ease.backOut });
          audio.pop();
          tweens.timer(() => this._collect(node, q), 0.25);
          node.taken = true; // no more taps
        }
        break;
      }
      case 'shake': {
        if (!node.fruitMeshes.length) return;
        node.taken = true;
        audio.whoosh(); juice.wobble(node.tree, 0.08, 0.7);
        const n = node.fruitMeshes.length;
        node.fruitMeshes.forEach((m, i) => {
          // detach to world space, then arc to a landing spot
          const wp = new THREE.Vector3(); m.getWorldPosition(wp); node.group.remove(m); m.position.copy(wp); this.fxLayer.add(m);
          const ang = Math.random() * Math.PI * 2, dist = 1.6 + Math.random() * 1.6;
          const target = new THREE.Vector3(node.group.position.x + Math.cos(ang) * dist, 0.16, node.group.position.z + Math.sin(ang) * dist);
          const flight = 0.9 + i * 0.12;
          const vx = (target.x - wp.x) / flight, vz = (target.z - wp.z) / flight;
          const vy = (target.y - wp.y + 0.5 * 9.8 * flight * flight) / flight;
          this.fruits.push({ mesh: m, vel: new THREE.Vector3(vx, vy, vz), landed: false, landT: 0, id: node.id, node, bounced: false, batted: false });
        });
        node.fruitMeshes = [];
        break;
      }
      case 'forage': {
        const helped = this.sprout.hintTarget === node.hintPos || Math.hypot(this.sprout.root.position.x - node.group.position.x, this.sprout.root.position.z - node.group.position.z) < 2.6;
        this._collect(node, helped ? 3 : 2);
        if (helped) { this.sprout.react('😸'); audio.chirp(); }
        break;
      }
    }
  }

  _collect(node, q) {
    if (this.state.basketFree <= 0) {
      audio.wobble(); juice.wobble(this.gigi.body, 0.12, 0.5);
      this.ui.toast('The basket is full!', { icon: '🧺' });
      if (this.ui.hud?.basket) { this.ui.hud.basket.classList.remove('bump'); void this.ui.hud.basket.offsetWidth; this.ui.hud.basket.classList.add('bump'); }
      if (node.kind === 'pull') { node.taken = false; node.taps = 0; node.perfects = 0; node.veg.visible = false; node.leaves.position.y = 0.26; node.interactable.label = `Pull ${node.ing.name}`; }
      return false;
    }
    node.taken = true;
    this.state.addIngredient(node.id, q);
    this._collectFx(node.group.position.clone().add(new THREE.Vector3(0, 0.6, 0)), node.id, q);
    // shrink the plant away
    tweens.to(node.group.scale, { x: 0.01, y: 0.01, z: 0.01 }, 0.35, { ease: Ease.backIn, onComplete: () => { node.group.visible = false; } });
    if (this.sprout.hintTarget === node.hintPos) { this.sprout.hintTarget = null; this.sprout.showHint(false); }
    return true;
  }

  /** Flying icon to the basket + star popup + sounds. */
  _collectFx(from, id, q) {
    const ing = INGREDIENTS[id];
    audio.pop(); if (q === 3) audio.chime(2); else if (q === 2) audio.chime(0);
    if (ing.rarity === 'rare') { audio.unlock(); this.ui.toast(`Rare find: ${ing.name}!`, { icon: ing.icon }); }
    const icon = makeIconSprite(ing.icon); icon.position.copy(from); icon.scale.set(0.7, 0.7, 1); this.fxLayer.add(icon);
    const target = () => { const v = new THREE.Vector3(); this.gigi.sockets.back.getWorldPosition(v); return v; };
    const st = { p: 0 }; const start = from.clone();
    this.fx.push({ obj: icon });
    tweens.to(st, { p: 1 }, 0.55, { ease: Ease.quadIn, onUpdate: (e) => { const t = target(); icon.position.lerpVectors(start, t, e); icon.position.y += Math.sin(e * Math.PI) * 0.8; }, onComplete: () => { this.fxLayer.remove(icon); this.fx = this.fx.filter((f) => f.obj !== icon); this.gigi.setBasket(true, this.state.inventory.length / this.state.game.basketCapacity); juice.squash(this.gigi.body, 0.12, 0.35); } });
    this._floatText(from, stars(q), q === 3 ? '#e0a72a' : '#8b5a2b', 1.3);
    this.gigi.setExpression('happy'); tweens.timer(() => this.gigi.setExpression('neutral'), 0.8);
  }
  _floatText(pos, text, color, size = 1) {
    const sp = makeTextSprite(text, { color, bg: 'transparent', size: 44 }); sp.position.copy(pos).add(new THREE.Vector3(0, 1.2, 0)); sp.scale.multiplyScalar(0.55 * size); this.fxLayer.add(sp);
    this.fx.push({ obj: sp });
    tweens.to(sp.position, { y: sp.position.y + 0.9 }, 0.9, { ease: Ease.quadOut });
    tweens.to(sp.material, { opacity: 0 }, 0.9, { ease: Ease.quadIn, onComplete: () => { this.fxLayer.remove(sp); this.fx = this.fx.filter((f) => f.obj !== sp); } });
  }

  // ------------------------------------------------------------------ update
  update(dt) {
    this.clouds.userData.update(dt); this.sky.position.copy(this.player.position);
    if (!this.updateWalk(dt)) return;
    const p = this.player.position;
    // day arc
    this.dayT += dt;
    const prog = clamp(this.dayT / T.dayLength, 0, 1);
    const elev = lerp(0.35, 1.25, prog), az = lerp(-0.9, 0.3, prog);
    this.sunOffset.set(Math.cos(az) * 24 * Math.cos(elev), 10 + Math.sin(elev) * 26, Math.sin(az) * 24 * Math.cos(elev) + 6);
    this.sun.color.setHex(0xdde8ff).lerp(new THREE.Color(0xffd9a0), prog); this.sun.intensity = lerp(1.7, 2.4, prog);
    this.hemi.intensity = lerp(0.5, 0.65, prog);
    this.three.fog.color.setHex(0xd2e8f4).lerp(new THREE.Color(0xf6dfb8), prog); this.sky.material.color.setHex(0xffffff).lerp(new THREE.Color(0xffe6c0), prog * 0.6);
    if (this.ui.hud?.extra) { const label = prog < 0.35 ? '🌅 Early morning' : prog < 0.75 ? '🌤️ Morning' : prog < 1 ? '☀️ Nearly noon' : '🍲 Lunchtime'; if (this.ui.hud.extra.textContent !== label) this.ui.hud.extra.textContent = label; }
    if (prog >= 1 && !this.chimed) { this.chimed = true; audio.bell(); this.ui.toast('Time for lunch! (You can keep gathering.)', { icon: '🍲', dur: 3500 }); const A = AREAS[this.areaId]; this.sprout.hintTarget = new THREE.Vector3(A.gate.x + 1.2, 0, A.size.d / 2 - 1.6); this.sprout.showHint(false); tweens.timer(() => { if (!this.sprout.hintTarget || this.sprout.hintTarget.z > 0) this.sprout.hintTarget = null; }, 7); }

    // spawn nodes: wobble, ripeness pulse, reveal
    for (const n of this.nodes) {
      if (n.taken && n.kind !== 'pull') continue;
      n.t += dt;
      if (n.kind === 'pull' && n.leaves && !n.taken) { const w = Math.sin(n.t * (Math.PI * 2) / T.pullWobblePeriod); n.leaves.rotation.z = w * 0.35; n.leaves.rotation.x = Math.abs(w) * 0.1; }
      if (n.kind === 'pick' && !n.taken) { const ripe = 0.5 + 0.5 * Math.sin(n.t * 2.2); const s = 1 + ripe * 0.08; if (this.active !== n.interactable) n.group.scale.setScalar(s); }
      if (n.sparkle) { n.sparkle.position.y = 1.0 + Math.sin(n.t * 3) * 0.1; n.sparkle.material.rotation += dt; }
      if (n.hidden) {
        const d = Math.hypot(n.group.position.x - p.x, n.group.position.z - p.z);
        if (d < T.forageRevealRadius) { n.hidden = false; n.group.visible = true; n.group.scale.setScalar(0.01); tweens.to(n.group.scale, { x: 1, y: 1, z: 1 }, 0.4, { ease: Ease.backOut }); audio.pop(); }
      }
    }
    // Sprout as hint system: run ahead to the nearest hidden forageable within range
    if (!this.chimed || this.sprout.hintTarget === null || this.sprout.hintTarget.z < 0) this._updateHints(p);

    // fruit physics
    for (let i = this.fruits.length - 1; i >= 0; i--) {
      const f = this.fruits[i]; const m = f.mesh;
      if (!f.landed) {
        f.vel.y -= 9.8 * dt; m.position.addScaledVector(f.vel, dt); m.rotation.x += dt * 4;
        if (m.position.y <= 0.16) { m.position.y = 0.16; if (!f.bounced) { f.bounced = true; f.vel.y = 2.2; f.vel.x *= 0.4; f.vel.z *= 0.4; audio.thud(); } else { f.landed = true; f.vel.set(0, 0, 0); } }
      } else f.landT += dt;
      // collect when Gigi is close
      const d = Math.hypot(m.position.x - p.x, m.position.z - p.z);
      if (d < 0.9) {
        const q = !f.landed ? 3 : f.landT < 4 ? 2 : 1;
        if (this.state.basketFree <= 0) { if (!f.warned) { f.warned = true; audio.wobble(); this.ui.toast('The basket is full!', { icon: '🧺' }); } continue; }
        this.state.addIngredient(f.id, q); this._collectFx(m.position.clone(), f.id, q);
        if (!f.landed) this._floatText(m.position, 'Caught!', '#5c7d4a', 1.1);
        this.fxLayer.remove(m); this.fruits.splice(i, 1);
        if (this.sprout.hintTarget === f.hintPos) { this.sprout.hintTarget = null; }
        continue;
      }
      // Sprout bats long-idle fruit toward Gigi (never away)
      if (f.landed && f.landT > 2.5 && !f.batted && !this.sprout.hintTarget) { f.hintPos = m.position.clone(); this.sprout.hintTarget = f.hintPos; }
      if (f.hintPos && this.sprout.hintTarget === f.hintPos) {
        const ds = Math.hypot(this.sprout.root.position.x - m.position.x, this.sprout.root.position.z - m.position.z);
        if (ds < 0.7) {
          f.batted = true; this.sprout.hintTarget = null; f.hintPos = null; this.sprout.react('🐾'); audio.pop();
          const dir = new THREE.Vector3(p.x - m.position.x, 0, p.z - m.position.z); const L = dir.length(); dir.normalize().multiplyScalar(Math.min(1.6, L - 0.5));
          const to = m.position.clone().add(dir); f.landed = false; f.bounced = true; f.vel.set(dir.x / 0.5, 2.6, dir.z / 0.5); f.landT = 0;
        }
      }
    }
  }

  _updateHints(p) {
    if (this.sprout.hintTarget && this.sprout.hintTarget !== this._hintFor?.hintPos) return; // busy with fruit
    // drop hint if Gigi has walked far from the target
    if (this._hintFor) { const n = this._hintFor; const d = Math.hypot(n.group.position.x - p.x, n.group.position.z - p.z); if (!n.hidden || n.taken || d > 13) { this.sprout.hintTarget = null; this.sprout.showHint(false); this._hintFor = null; } else return; }
    let best = null, bd = Infinity;
    for (const n of this.nodes) { if (!n.hidden || n.taken) continue; const d = Math.hypot(n.group.position.x - p.x, n.group.position.z - p.z); if (d < 10 && d < bd) { bd = d; best = n; } }
    if (best) { best.hintPos = new THREE.Vector3(best.group.position.x + 0.6, 0, best.group.position.z + 0.5); this.sprout.hintTarget = best.hintPos; this.sprout.showHint(true); this._hintFor = best; }
  }

  openBook() { this.ui.openBook?.({ tab: 'basket' }); }
}

function makeHen() {
  const g = new THREE.Group();
  const body = sphere(0.22, 0xf6efe2); body.scale.set(1.2, 1, 1); body.position.y = 0.3; g.add(body);
  const head = sphere(0.12, 0xf6efe2, {}, 10); head.position.set(0.22, 0.5, 0); g.add(head);
  const comb = box(0.06, 0.08, 0.04, 0xd9452e); comb.position.set(0.22, 0.62, 0); g.add(comb);
  const beak = cone(0.03, 0.08, 0xe8a63a, {}, 6); beak.rotation.z = -Math.PI / 2; beak.position.set(0.35, 0.5, 0); g.add(beak);
  g.userData.collider = { r: 0.3 };
  return g;
}
