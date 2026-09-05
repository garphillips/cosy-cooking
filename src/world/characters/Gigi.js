// Gigi: modular chibi rig with named sockets so cosmetics show in every scene.
// Cartoon pass: bigger head, stubby tapered limbs, canvas face decal, soft-toon materials,
// inverted-hull outlines, and springy hair/hat follow-through.
import * as THREE from 'three';
import { sphere, capsule, cylinder, box } from '../props.js';
import { PALETTE } from '../materials.js';
import { buildHair, buildHat, buildTop, buildBottom, buildShoe, buildAccessory, HEAD_R } from './cosmetics.js';
import { DEFAULT_EQUIPPED } from '../../data/shop.js';
import { FaceDecal } from '../faces.js';
import { characterMaterial, applyCharacterStyle } from '../toon.js';

const NECK_Y = 1.08;

export class Gigi {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'Gigi';
    this.body = new THREE.Group(); this.root.add(this.body);
    this.t = 0; this.moveBlend = 0;
    this.sockets = {};
    this._spring = { x: 0, z: 0, vx: 0, vz: 0 }; this._prevPos = new THREE.Vector3(); this._vel = new THREE.Vector3();
    this._build();
    this.applyOutfit(DEFAULT_EQUIPPED, { skin: 2, eyes: 0, hairTint: 0 });
    this.basketFill = 0;
    this.carry = null;
    this.workPose = false; this.beat = 0;
  }

  _build() {
    const b = this.body;
    // stubby legs (pivot at hip)
    this.legL = new THREE.Group(); this.legL.position.set(-0.14, 0.42, 0); b.add(this.legL);
    this.legR = new THREE.Group(); this.legR.position.set(0.14, 0.42, 0); b.add(this.legR);
    for (const leg of [this.legL, this.legR]) {
      const l = capsule(0.1, 0.14, 0xf3cfb0); l.position.y = -0.17; leg.add(l); leg.userData.mesh = l;
      const shoe = new THREE.Group(); shoe.position.y = -0.36; shoe.scale.setScalar(1.15); leg.add(shoe); leg.userData.shoe = shoe;
    }
    // torso + bottom sockets
    this.sockets.bottom = new THREE.Group(); this.sockets.bottom.position.y = 0.52; b.add(this.sockets.bottom);
    this.sockets.top = new THREE.Group(); this.sockets.top.position.y = 0.8; b.add(this.sockets.top);
    // short arms with big hands (pivot at shoulder)
    this.armL = new THREE.Group(); this.armL.position.set(-0.32, 0.98, 0); b.add(this.armL);
    this.armR = new THREE.Group(); this.armR.position.set(0.32, 0.98, 0); b.add(this.armR);
    for (const arm of [this.armL, this.armR]) {
      const sleeve = capsule(0.09, 0.1, 0xf6efe2); sleeve.position.y = -0.11; arm.add(sleeve); arm.userData.sleeve = sleeve;
      const hand = sphere(0.1, 0xf3cfb0, {}, 12); hand.position.y = -0.3; arm.add(hand); arm.userData.hand = hand;
    }
    this.sockets.neck = new THREE.Group(); this.sockets.neck.position.y = NECK_Y; b.add(this.sockets.neck);
    this.sockets.back = new THREE.Group(); this.sockets.back.position.set(0, 0.85, -0.3); b.add(this.sockets.back);
    this.sockets.body = new THREE.Group(); this.sockets.body.position.y = 0.85; b.add(this.sockets.body);
    // big egg-shaped head
    this.head = new THREE.Group(); this.head.position.y = NECK_Y + HEAD_R * 0.92; b.add(this.head);
    this.headMesh = sphere(HEAD_R, 0xf3cfb0, {}, 32); this.headMesh.scale.set(1, 1.04, 0.98); this.head.add(this.headMesh);
    // ears
    for (const s of [-1, 1]) { const ear = sphere(0.075, 0xf3cfb0, {}, 10); ear.position.set(s * HEAD_R * 0.98, -0.02, 0.02); ear.scale.set(0.6, 1, 0.8); ear.userData.skin = true; this.head.add(ear); }
    // face decal replaces bead eyes
    this.face = new FaceDecal({ kind: 'gigi', radius: HEAD_R, eyeColor: PALETTE.eyes[0] });
    this.face.mesh.scale.copy(this.headMesh.scale); this.head.add(this.face.mesh);
    this.sockets.hair = new THREE.Group(); this.head.add(this.sockets.hair);
    this.sockets.hat = new THREE.Group(); this.head.add(this.sockets.hat);
    this.sockets.face = new THREE.Group(); this.head.add(this.sockets.face);
    this.sockets.headAcc = new THREE.Group(); this.head.add(this.sockets.headAcc);
    // hand sockets for carrying plates / spoon
    this.sockets.handR = new THREE.Group(); this.sockets.handR.position.y = -0.3; this.armR.add(this.sockets.handR);
    this.sockets.handL = new THREE.Group(); this.sockets.handL.position.y = -0.3; this.armL.add(this.sockets.handL);
    this.height = NECK_Y + HEAD_R * 0.92 + HEAD_R * 1.04;
  }

  _replace(socket, group) { while (socket.children.length) socket.remove(socket.children[0]); if (group) socket.add(group); return group; }

  /** Apply equipped cosmetics + look (skin/eyes/hairTint indices). Cheap: swaps socket children. */
  applyOutfit(equipped, look = {}) {
    this.equipped = { ...DEFAULT_EQUIPPED, ...equipped }; this.look = { skin: 2, eyes: 0, hairTint: 0, ...look };
    const skin = PALETTE.skin[this.look.skin] ?? PALETTE.skin[2];
    const eye = PALETTE.eyes[this.look.eyes] ?? PALETTE.eyes[0];
    const hairColor = PALETTE.hairTints[this.look.hairTint] ?? PALETTE.blonde;
    // skin (one shared toon material per outfit apply)
    if (!this.skinMat || this.skinMat.color.getHex() !== skin) this.skinMat = characterMaterial({ color: skin, roughness: 0.65, rim: 0.32 });
    this.headMesh.material = this.skinMat;
    this.head.children.forEach((c) => { if (c.userData.skin) c.material = this.skinMat; });
    for (const leg of [this.legL, this.legR]) leg.userData.mesh.material = this.skinMat;
    for (const arm of [this.armL, this.armR]) arm.userData.hand.material = this.skinMat;
    this.face.setEyeColor(eye);
    // cosmetics
    this._replace(this.sockets.hair, buildHair(this.equipped.hair, hairColor));
    this._replace(this.sockets.hat, buildHat(this.equipped.hat));
    const top = buildTop(this.equipped.top); this._replace(this.sockets.top, top);
    const sleeveMat = characterMaterial({ color: top.userData.sleeveColor, roughness: 0.75 });
    for (const arm of [this.armL, this.armR]) arm.userData.sleeve.material = sleeveMat;
    this._replace(this.sockets.bottom, buildBottom(this.equipped.bottom));
    for (const leg of [this.legL, this.legR]) this._replace(leg.userData.shoe, buildShoe(this.equipped.shoes));
    const acc = buildAccessory(this.equipped.accessory);
    this._replace(this.sockets.face, null); this._replace(this.sockets.headAcc, null); this._replace(this.sockets.body, null); this._replace(this.sockets.neck, null); this._clearBackAcc();
    const anchor = acc.userData.anchor;
    if (anchor === 'face') this.sockets.face.add(acc);
    else if (anchor === 'head') this.sockets.headAcc.add(acc);
    else if (anchor === 'neck') this.sockets.neck.add(acc);
    else if (anchor === 'back') { acc.name = 'backAcc'; this.sockets.back.add(acc); }
    else this.sockets.body.add(acc);
    // hide loose hair strands under full hats
    const fullHat = ['hat_beanie', 'hat_chef', 'hat_witch', 'hat_straw'].includes(this.equipped.hat);
    this.sockets.hair.children[0]?.children.forEach((c) => { if (c.userData.topStrand && fullHat) c.visible = false; });
    applyCharacterStyle(this.root);
  }
  _clearBackAcc() { const old = this.sockets.back.getObjectByName('backAcc'); if (old) this.sockets.back.remove(old); }

  /** Basket on the back. */
  setBasket(visible, fill = 0) {
    let basket = this.sockets.back.getObjectByName('basket');
    if (!basket) {
      basket = new THREE.Group(); basket.name = 'basket';
      const body = cylinder(0.24, 0.18, 0.36, PALETTE.honey); body.position.y = 0; basket.add(body);
      const fillM = cylinder(0.2, 0.2, 0.05, PALETTE.leaf); fillM.position.y = 0.16; fillM.name = 'fill'; basket.add(fillM);
      const strapL = box(0.04, 0.3, 0.04, PALETTE.walnut); strapL.position.set(-0.12, 0.1, 0.2); basket.add(strapL);
      const strapR = box(0.04, 0.3, 0.04, PALETTE.walnut); strapR.position.set(0.12, 0.1, 0.2); basket.add(strapR);
      basket.position.set(0, 0, -0.08);
      this.sockets.back.add(basket);
      applyCharacterStyle(this.root);
    }
    basket.visible = visible;
    const f = basket.getObjectByName('fill');
    f.visible = fill > 0.01;
    f.position.y = 0.02 + fill * 0.2; f.scale.set(0.6 + fill * 0.5, 1 + fill * 3, 0.6 + fill * 0.5);
    this.basketFill = fill;
  }

  /** Carry something in both hands (plate). Pass null to drop. */
  setCarry(obj) {
    if (this.carry) { this.sockets.handR.remove(this.carry); this.carry = null; }
    if (obj) { this.carry = obj; obj.position.set(-0.32, 0.05, 0.2); this.sockets.handR.add(obj); }
  }

  /** 'neutral' | 'happy' | 'surprised' | 'joy' */
  setExpression(kind) { this.face.setExpression(kind || 'neutral'); }

  /** Per-frame animation. moving: 0..1 blend; speed: multiplier for stride frequency. */
  update(dt, { moving = 0, speed = 1 } = {}) {
    this.t += dt * (0.8 + speed * 0.6);
    this.moveBlend += (moving - this.moveBlend) * Math.min(1, dt * 10);
    const m = this.moveBlend;
    const w = this.t * 10;
    const swing = Math.sin(w) * 0.85 * m;
    this.legL.rotation.x = swing; this.legR.rotation.x = -swing;
    this.beat *= Math.max(0, 1 - dt * 10);
    if (this.carry) { this.armL.rotation.x = -1.2; this.armR.rotation.x = -1.2; this.armL.rotation.z = 0.3; this.armR.rotation.z = -0.3; }
    else if (this.workPose) { this.armL.rotation.x = -1.0 + Math.sin(this.t * 4) * 0.08; this.armR.rotation.x = -1.1 - this.beat * 0.9 + Math.sin(this.t * 4 + 1) * 0.08; this.armL.rotation.z = 0.25; this.armR.rotation.z = -0.25; }
    else { this.armL.rotation.x = -swing * 0.9; this.armR.rotation.x = swing * 0.9; this.armL.rotation.z = 0.18 + Math.sin(this.t * 2) * 0.03; this.armR.rotation.z = -0.18 - Math.sin(this.t * 2) * 0.03; }
    this.body.position.y = Math.abs(Math.sin(w)) * 0.07 * m + Math.sin(this.t * 2) * 0.012 * (1 - m);
    this.body.rotation.z = Math.sin(w) * 0.04 * m;
    this.body.rotation.x = 0.07 * m;
    // idle breathing
    const br = 1 + Math.sin(this.t * 2.2) * 0.014 * (1 - m);
    this.sockets.top.scale.set(br, 1 / br, br);
    // head: bob with the walk, drift when idle
    this.head.rotation.z = Math.sin(this.t * 1.3) * 0.04 * (1 - m) + Math.sin(w) * 0.05 * m;
    this.head.rotation.y = Math.sin(this.t * 0.7) * 0.06 * (1 - m);
    this.head.rotation.x = -Math.abs(Math.sin(w)) * 0.04 * m;
    // hair/hat follow-through spring driven by root velocity (world space)
    const p = this.root.position;
    if (dt > 0) { this._vel.set((p.x - this._prevPos.x) / dt, 0, (p.z - this._prevPos.z) / dt); this._prevPos.copy(p); }
    const local = this._vel.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -this.root.rotation.y); // velocity in Gigi's frame
    const s = this._spring; const k = 60, d = 9;
    const targetX = THREE.MathUtils.clamp(-local.z * 0.05, -0.25, 0.25), targetZ = THREE.MathUtils.clamp(local.x * 0.05, -0.25, 0.25);
    s.vx += ((targetX - s.x) * k - s.vx * d) * dt; s.vz += ((targetZ - s.z) * k - s.vz * d) * dt;
    s.x += s.vx * dt; s.z += s.vz * dt;
    const bounce = Math.sin(w) * 0.03 * m;
    this.sockets.hair.rotation.set(-s.x * 0.6 + bounce, 0, s.z * 0.6); this.sockets.hat.rotation.set(-s.x * 0.8 + bounce, 0, s.z * 0.8);
    this.sockets.hair.position.y = Math.abs(Math.sin(w + 0.5)) * 0.01 * m;
    this.face.update(dt);
  }
}
