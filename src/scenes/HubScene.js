// The village lane: connective tissue between cottage, garden, restaurant and shop.
import * as THREE from 'three';
import { WalkScene } from './WalkScene.js';
import { makeGround, makePath, makePlaza, makeTree, makeBush, makeFence, makeBuilding, makeSignpost, makeGate, makeRock, scatterInstanced, grassInstanced, collectColliders } from '../world/props.js';
import { makeSkyDome, makeClouds } from '../world/textures.js';
import { PALETTE } from '../world/materials.js';
import { audio } from '../engine/Audio.js';

export class HubScene extends WalkScene {
  constructor() { super(); this.curve = { curvature: 0.0045, start: 8 }; }

  build() {
    if (this.built) return; this.built = true;
    const S = this.three;
    S.background = new THREE.Color(PALETTE.sky);
    S.fog = new THREE.Fog(0xd2e8f4, 45, 85);
    this.setupLights({ shadowSize: 34, pos: [14, 26, 10] });
    this.world = new THREE.Group(); S.add(this.world);
    this.world.add(makeGround(110, PALETTE.grass));
    this.sky = makeSkyDome(0x3f8fd0, 0xa8d4ee); this.three.add(this.sky);
    this.clouds = makeClouds(8, { radius: 70, height: 26 }); this.three.add(this.clouds);

    // ---- layout ----
    // Cottage (wardrobe) with garden gate behind it
    this.cottage = makeBuilding({ w: 6, d: 5, h: 3, wall: PALETTE.plaster, roof: PALETTE.terracotta, sign: 'Home', signColor: PALETTE.honey });
    this.cottage.position.set(-12, 0, -6); this.world.add(this.cottage);
    // garden fence along the back with a gate west of the cottage (so the roof never hides Gigi)
    const fenceL = makeFence(3.7); fenceL.position.set(-19.15, 0, -12); this.world.add(fenceL);
    const fenceR = makeFence(10.7); fenceR.position.set(-9.35, 0, -12); this.world.add(fenceR);
    const fenceSideL = makeFence(10, false); fenceSideL.position.set(-21, 0, -17); this.world.add(fenceSideL);
    const fenceSideR = makeFence(10, false); fenceSideR.position.set(-4, 0, -17); this.world.add(fenceSideR);
    this.gate = makeGate(2.6); this.gate.position.set(-16, 0, -12); this.world.add(this.gate);
    const gardenSign = makeSignpost('Garden'); gardenSign.position.set(-13.6, 0, -10.6); this.world.add(gardenSign);
    // a hint of the garden beyond the fence
    for (const [x, z] of [[-18, -15], [-14, -16], [-8, -15.5], [-5, -14.5]]) { const b = makeBush(0.8, PALETTE.leaf); b.position.set(x, 0, z); this.world.add(b); }
    const gt = makeTree(1.2); gt.position.set(-19.5, 0, -15.5); this.world.add(gt);

    // Village square with restaurant and shop facing each other
    this.world.add(makePlaza(14, 4, 18, 16, PALETTE.path));
    this.restaurant = makeBuilding({ w: 8, d: 6, h: 3.4, wall: 0xf6e7cf, roof: PALETTE.sage, sign: 'The Little Sprout', signColor: PALETTE.sageDark });
    this.restaurant.position.set(14, 0, -5); this.world.add(this.restaurant);
    this.shop = makeBuilding({ w: 7, d: 5.5, h: 3.2, wall: 0xf3d9e0, roof: 0xb8a0d8, sign: 'Dress-up', signColor: 0x9a7ad8 });
    this.shop.position.set(14, 0, 13); this.shop.rotation.y = Math.PI; this.world.add(this.shop);
    // planters in the square
    for (const [x, z] of [[6, -1], [6, 9], [22, -1], [22, 9]]) { const b = makeBush(0.6, PALETTE.leaf); b.position.set(x, 0, z); this.world.add(b); }

    // Lane from cottage to square
    this.world.add(makePath(-12, -2.5, -12, 3, 2.2));
    this.world.add(makePath(-12, 3, 5, 3, 2.4));
    // path to the garden gate, west of the cottage
    this.world.add(makePath(-14, 3, -14, -10.5, 1.8));
    this.world.add(makePath(-14, -10.5, -16, -10.5, 1.8));
    // meadow-ish path heading west (decorative; the meadow itself is beyond the garden)
    this.world.add(makePath(-12, 3, -24, 6, 1.8));
    const meadowSign = makeSignpost('Meadow → via garden'); meadowSign.position.set(-24, 0, 4.2); this.world.add(meadowSign);

    // Scenery
    const trees = [[-22, -6, 1.3], [-25, 10, 1.1], [-18, 12, 1.0], [-2, -14, 1.2], [2, -12, 0.9], [4, 14, 1.2], [-4, 12, 1.0], [26, -12, 1.3], [26, 18, 1.1], [0, 20, 1.2], [-14, 18, 1.0], [24, 4, 0.8], [-27, -2, 1.2], [10, -13, 1.0]];
    for (const [x, z, s] of trees) { const t = makeTree(s); t.position.set(x, 0, z); this.world.add(t); }
    const bushes = [[-18, -2, 0.9], [-6, -3, 0.7], [2, 8, 0.8], [-20, 2, 0.7], [8, -8, 0.8], [20, 20, 0.9], [-10, 10, 0.8]];
    for (const [x, z, s] of bushes) { const b = makeBush(s); b.position.set(x, 0, z); this.world.add(b); }
    for (const [x, z, s] of [[-3, -8, 1], [18, 22, 1.2], [-22, 14, 0.8]]) { const r = makeRock(s); r.position.set(x, 0, z); this.world.add(r); }
    const avoid = [{ x: -12, z: -6, r: 5 }, { x: 14, z: 4, r: 11 }, { x: -12, z: 0, r: 2 }, { x: -4, z: 3, r: 10 }];
    this.world.add(scatterInstanced(400, { x: 0, z: 2, w: 62, d: 56 }, { avoid, seed: 3 }));
    this.world.add(grassInstanced(900, { x: 0, z: 2, w: 62, d: 56 }, { avoid, seed: 11 }));

    // Characters
    this.setupCharacters();
    this.player.setColliders(collectColliders(this.world));
    this.player.setBounds({ x: 0, z: 2, r: 30 });

    // ---- interactables ----
    const doorOf = (b) => { const v = b.userData.door.clone(); return b.localToWorld(v); };
    this.addInteractable({ position: doorOf(this.cottage), radius: 2.4, label: 'Wardrobe', icon: 'wardrobe', onInteract: () => this._leave('wardrobe') });
    this.addInteractable({ position: new THREE.Vector3(-16, 0, -11), radius: 2.4, label: 'Garden', icon: 'gate', onInteract: () => this._leave('garden', { area: 'garden' }) });
    this.addInteractable({ position: doorOf(this.restaurant), radius: 2.6, label: 'The Little Sprout', icon: 'restaurant', onInteract: () => this._leave('restaurant') });
    this.addInteractable({ position: doorOf(this.shop), radius: 2.6, label: 'Dress-up Shop', icon: 'shop', onInteract: () => this._leave('shop') });
  }

  _leave(scene, params = {}) {
    if (this.game.scenes.transitioning) return;
    audio.door();
    const p = this.player.position; this.state.game.hub = { x: p.x, z: p.z, rot: this.player.facing }; this.state.save();
    this.game.scenes.go(scene, params);
  }

  enter(params = {}) {
    super.enter(); this.build();
    this.refreshLook(true);
    const h = this.state.game.hub || { x: 0, z: 4, rot: 0 };
    // arriving from a building: stand at its door
    if (params.from === 'restaurant') { const d = this.restaurant.localToWorld(this.restaurant.userData.door.clone()); this.player.teleport(d.x, d.z + 0.6, Math.PI); }
    else if (params.from === 'shop') { const d = this.shop.localToWorld(this.shop.userData.door.clone()); this.player.teleport(d.x, d.z - 0.6, 0); }
    else if (params.from === 'wardrobe') { const d = this.cottage.localToWorld(this.cottage.userData.door.clone()); this.player.teleport(d.x, d.z + 0.6, Math.PI); }
    else if (params.from === 'garden') { this.player.teleport(-16, -9.8, Math.PI); }
    else this.player.teleport(h.x, h.z, h.rot);
    this.sprout.snapTo(this.player.position, this.player.facing);
    this.follow.snap(this.player.position);
    this.frozen = false;
    this.ui.showHUD({ basket: true });
    audio.startAmbience('outdoor'); audio.startMusic();
    this.state.game.hub = { x: this.player.position.x, z: this.player.position.z, rot: this.player.facing }; this.state.save();
  }
  exit() { this.ui.prompt.hide(); }

  update(dt) { this.clouds.userData.update(dt); this.sky.position.copy(this.player.position); this.updateWalk(dt); }
  openBook() { this.ui.openBook?.(); }
}
