// Gigi: modular chibi rig with named sockets so cosmetics show in every scene.
import * as THREE from 'three';
import { sphere, capsule, cylinder, box } from '../props.js';
import { PALETTE } from '../materials.js';
import { makeUniqueMaterial } from '../materials.js';
import { buildHair, buildHat, buildTop, buildBottom, buildShoe, buildAccessory } from './cosmetics.js';
import { DEFAULT_EQUIPPED } from '../../data/shop.js';

const HEAD_R = 0.42;

export class Gigi {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'Gigi';
    this.body = new THREE.Group(); this.root.add(this.body);
    this.t = 0; this.moveBlend = 0;
    this.sockets = {};
    this._build();
    this.applyOutfit(DEFAULT_EQUIPPED, { skin: 2, eyes: 0, hairTint: 0 });
    this.basketFill = 0;
    this.carry = null;
    this.workPose = false; this.beat = 0;
  }

  _build() {
    const b = this.body;
    // legs (pivot at hip)
    this.legL = new THREE.Group(); this.legL.position.set(-0.13, 0.5, 0); b.add(this.legL);
    this.legR = new THREE.Group(); this.legR.position.set(0.13, 0.5, 0); b.add(this.legR);
    for (const leg of [this.legL, this.legR]) {
      const l = capsule(0.09, 0.28, 0xf3cfb0); l.position.y = -0.22; leg.add(l); leg.userData.mesh = l;
      const shoe = new THREE.Group(); shoe.position.y = -0.5; leg.add(shoe); leg.userData.shoe = shoe;
    }
    // torso + bottom sockets
    this.sockets.bottom = new THREE.Group(); this.sockets.bottom.position.y = 0.62; b.add(this.sockets.bottom);
    this.sockets.top = new THREE.Group(); this.sockets.top.position.y = 0.95; b.add(this.sockets.top);
    // arms (pivot at shoulder)
    this.armL = new THREE.Group(); this.armL.position.set(-0.32, 1.15, 0); b.add(this.armL);
    this.armR = new THREE.Group(); this.armR.position.set(0.32, 1.15, 0); b.add(this.armR);
    for (const arm of [this.armL, this.armR]) {
      const sleeve = capsule(0.085, 0.16, 0xf6efe2); sleeve.position.y = -0.14; arm.add(sleeve); arm.userData.sleeve = sleeve;
      const hand = sphere(0.085, 0xf3cfb0, {}, 10); hand.position.y = -0.36; arm.add(hand); arm.userData.hand = hand;
    }
    this.sockets.neck = new THREE.Group(); this.sockets.neck.position.y = 1.3; b.add(this.sockets.neck);
    this.sockets.back = new THREE.Group(); this.sockets.back.position.set(0, 1.0, -0.32); b.add(this.sockets.back);
    this.sockets.body = new THREE.Group(); this.sockets.body.position.y = 1.0; b.add(this.sockets.body);
    // head
    this.head = new THREE.Group(); this.head.position.y = 1.32 + HEAD_R; b.add(this.head);
    this.headMesh = sphere(HEAD_R, 0xf3cfb0, {}, 24); this.head.add(this.headMesh);
    // face
    this.eyes = [];
    for (const s of [-1, 1]) {
      const eye = sphere(0.075, 0x4a3420, {}, 10); eye.position.set(s * 0.16, 0.0, HEAD_R * 0.9); eye.scale.set(1, 1.3, 0.6); eye.castShadow = false; this.head.add(eye); this.eyes.push(eye);
      const shine = sphere(0.025, 0xffffff, {}, 6); shine.position.set(s * 0.13, 0.05, HEAD_R * 0.98); shine.castShadow = false; this.head.add(shine);
      const cheek = sphere(0.06, 0xf0a3c0, {}, 8); cheek.position.set(s * 0.26, -0.12, HEAD_R * 0.8); cheek.scale.set(1, 0.6, 0.4); cheek.castShadow = false; this.head.add(cheek);
    }
    this.mouth = box(0.08, 0.03, 0.02, 0xc84a3a); this.mouth.position.set(0, -0.16, HEAD_R * 0.98); this.mouth.castShadow = false; this.head.add(this.mouth);
    this.sockets.hair = new THREE.Group(); this.head.add(this.sockets.hair);
    this.sockets.hat = new THREE.Group(); this.head.add(this.sockets.hat);
    this.sockets.face = new THREE.Group(); this.head.add(this.sockets.face);
    this.sockets.headAcc = new THREE.Group(); this.head.add(this.sockets.headAcc);
    // hand socket for carrying plates / spoon
    this.sockets.handR = new THREE.Group(); this.sockets.handR.position.y = -0.36; this.armR.add(this.sockets.handR);
    this.sockets.handL = new THREE.Group(); this.sockets.handL.position.y = -0.36; this.armL.add(this.sockets.handL);
    this.height = 1.32 + HEAD_R * 2;
  }

  _replace(socket, group) { while (socket.children.length) socket.remove(socket.children[0]); if (group) socket.add(group); return group; }

  /** Apply equipped cosmetics + look (skin/eyes/hairTint indices). Cheap: swaps socket children. */
  applyOutfit(equipped, look = {}) {
    this.equipped = { ...DEFAULT_EQUIPPED, ...equipped }; this.look = { skin: 2, eyes: 0, hairTint: 0, ...look };
    const skin = PALETTE.skin[this.look.skin] ?? PALETTE.skin[2];
    const eye = PALETTE.eyes[this.look.eyes] ?? PALETTE.eyes[0];
    const hairColor = PALETTE.hairTints[this.look.hairTint] ?? PALETTE.blonde;
    // skin
    this.headMesh.material = makeUniqueMaterial({ color: skin, roughness: 0.6, rim: 0.35 });
    for (const leg of [this.legL, this.legR]) leg.userData.mesh.material = this.headMesh.material;
    for (const arm of [this.armL, this.armR]) arm.userData.hand.material = this.headMesh.material;
    for (const e of this.eyes) e.material = makeUniqueMaterial({ color: eye, roughness: 0.4 });
    // cosmetics
    this._replace(this.sockets.hair, buildHair(this.equipped.hair, hairColor));
    this._replace(this.sockets.hat, buildHat(this.equipped.hat));
    const top = buildTop(this.equipped.top); this._replace(this.sockets.top, top);
    for (const arm of [this.armL, this.armR]) arm.userData.sleeve.material = makeUniqueMaterial({ color: top.userData.sleeveColor, roughness: 0.85 });
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
    // hide hair top under full hats
    const fullHat = ['hat_beanie', 'hat_chef', 'hat_witch', 'hat_straw'].includes(this.equipped.hat);
    this.sockets.hair.children[0]?.children.forEach((c, i) => { if (i > 6 && fullHat) c.visible = this.equipped.hair !== 'hair_bun'; });
  }
  _clearBackAcc() { const old = this.sockets.back.getObjectByName('backAcc'); if (old) this.sockets.back.remove(old); }

  /** Basket on the back (Phase 2 fills it). */
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

  setExpression(kind) {
    // 'neutral' | 'happy' | 'surprised'
    if (kind === 'happy') { this.mouth.scale.set(1.6, 1.4, 1); this.eyes.forEach((e) => e.scale.set(1, 0.8, 0.6)); }
    else if (kind === 'surprised') { this.mouth.scale.set(0.8, 2.2, 1); this.eyes.forEach((e) => e.scale.set(1.2, 1.5, 0.6)); }
    else { this.mouth.scale.set(1, 1, 1); this.eyes.forEach((e) => e.scale.set(1, 1.3, 0.6)); }
  }

  /** Per-frame animation. moving: 0..1 blend; speed: multiplier for stride frequency. */
  update(dt, { moving = 0, speed = 1 } = {}) {
    this.t += dt * (0.8 + speed * 0.6);
    this.moveBlend += (moving - this.moveBlend) * Math.min(1, dt * 10);
    const m = this.moveBlend;
    const w = this.t * 10;
    const swing = Math.sin(w) * 0.75 * m;
    this.legL.rotation.x = swing; this.legR.rotation.x = -swing;
    this.beat *= Math.max(0, 1 - dt * 10);
    if (this.carry) { this.armL.rotation.x = -1.2; this.armR.rotation.x = -1.2; this.armL.rotation.z = 0.3; this.armR.rotation.z = -0.3; }
    else if (this.workPose) { this.armL.rotation.x = -1.0 + Math.sin(this.t * 4) * 0.08; this.armR.rotation.x = -1.1 - this.beat * 0.9 + Math.sin(this.t * 4 + 1) * 0.08; this.armL.rotation.z = 0.25; this.armR.rotation.z = -0.25; }
    else { this.armL.rotation.x = -swing * 0.8; this.armR.rotation.x = swing * 0.8; this.armL.rotation.z = 0.12 + Math.sin(this.t * 2) * 0.03; this.armR.rotation.z = -0.12 - Math.sin(this.t * 2) * 0.03; }
    this.body.position.y = Math.abs(Math.sin(w)) * 0.06 * m + Math.sin(this.t * 2) * 0.01 * (1 - m);
    this.body.rotation.z = Math.sin(w) * 0.03 * m;
    this.body.rotation.x = 0.06 * m;
    // idle breathing
    const br = 1 + Math.sin(this.t * 2.2) * 0.012 * (1 - m);
    this.sockets.top.scale.set(br, 1 / br, br);
    this.head.rotation.z = Math.sin(this.t * 1.3) * 0.03 * (1 - m);
    this.head.rotation.y = Math.sin(this.t * 0.7) * 0.05 * (1 - m);
    // blink
    const blink = (Math.sin(this.t * 1.7) > 0.985) ? 0.15 : 1;
    for (const e of this.eyes) e.scale.y = (this.mouth.scale.x > 1.5 ? 0.8 : 1.3) * blink;
  }
}
