// Sprout the grey tabby. Follows Gigi with a lag, sits when she stops, stretches when idle,
// never blocks the player, teleports quietly if left too far behind.
// Cartoon pass: rounder body, bigger head, canvas face, striped texture, curled tube tail, springs.
import * as THREE from 'three';
import { sphere, capsule, cylinder, cone, box, makeIconSprite } from '../props.js';
import { PALETTE } from '../materials.js';
import { buildCatCollar } from './cosmetics.js';
import { tweens, Ease } from '../../engine/Tween.js';
import { FaceDecal } from '../faces.js';
import { characterMaterial, applyCharacterStyle } from '../toon.js';
import { stripeTexture } from '../textures.js';

export class Sprout {
  constructor() {
    this.root = new THREE.Group(); this.root.name = 'Sprout';
    this.body = new THREE.Group(); this.root.add(this.body);
    this.t = 0; this.state = 'follow'; this.idleTime = 0; this.speed = 0;
    this.vel = new THREE.Vector3(); this.facing = 0;
    this.hintTarget = null;      // Vector3: sit here and show "!"
    this.reaction = null; this.tailFlick = 0;
    this._tailSpring = { a: 0, v: 0 }; this._earSpring = { a: 0, v: 0 }; this._prevSpeed = 0;
    this._build();
    this.setCollar('cat_green');
  }
  _build() {
    const b = this.body;
    const grey = PALETTE.catGrey, dark = PALETTE.catDark, pink = 0xf0a3b0;
    const furMat = characterMaterial({ color: 0xffffff, roughness: 0.8, map: stripeTexture(grey, dark, 5), rim: 0.3 });
    const plainFur = characterMaterial({ color: grey, roughness: 0.8, rim: 0.3 });
    // round striped body
    this.torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.22, 6, 16), furMat); this.torso.rotation.z = Math.PI / 2; this.torso.position.y = 0.36; this.torso.castShadow = true; b.add(this.torso);
    const belly = sphere(0.2, 0xe6e6ea); belly.scale.set(1.3, 0.7, 0.9); belly.position.set(0.02, 0.22, 0); belly.castShadow = false; b.add(belly);
    // big head
    this.head = new THREE.Group(); this.head.position.set(0.3, 0.62, 0); b.add(this.head);
    const hm = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 20), plainFur); hm.scale.set(1.05, 0.95, 1.05); hm.castShadow = true; this.head.add(hm);
    // forehead 'M' stripes
    for (const [z, rot] of [[0, 0], [0.11, 0.35], [-0.11, -0.35]]) { const s = box(0.1, 0.16, 0.05, dark); s.position.set(0.12, 0.24, z); s.rotation.x = rot; s.rotation.z = -0.9; s.castShadow = false; s.userData.noOutline = true; this.head.add(s); }
    // ears with pink inner
    this.ears = [];
    for (const s of [-1, 1]) {
      const ear = new THREE.Group(); ear.position.set(-0.02, 0.24, s * 0.17);
      const outer = cone(0.1, 0.2, grey, {}, 8); outer.position.y = 0.08; ear.add(outer);
      const inner = cone(0.055, 0.13, pink, {}, 8); inner.position.set(0.02, 0.08, 0); inner.userData.noOutline = true; ear.add(inner);
      ear.rotation.z = -0.25; ear.rotation.x = s * 0.35; this.head.add(ear); this.ears.push(ear);
    }
    // face decal (model faces +x, so turn the +z decal to +x)
    this.face = new FaceDecal({ kind: 'cat', radius: 0.3, eyeColor: 0x5aa86a, faceForward: Math.PI / 2 });
    this.face.mesh.scale.copy(hm.scale); this.head.add(this.face.mesh);
    // whiskers
    for (const s of [-1, 1]) for (const k of [-1, 1]) { const w = box(0.22, 0.008, 0.008, 0xfaf6ee); w.position.set(0.24, -0.02 + k * 0.03, s * 0.24); w.rotation.y = s * 0.5; w.rotation.z = k * 0.12; w.castShadow = false; w.userData.noOutline = true; this.head.add(w); }
    // stubby legs
    this.legs = [];
    for (const [x, z] of [[0.18, 0.13], [0.18, -0.13], [-0.16, 0.13], [-0.16, -0.13]]) {
      const l = new THREE.Group(); l.position.set(x, 0.24, z); const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.12, 4, 10), plainFur); m.position.y = -0.1; m.castShadow = true; l.add(m); const paw = sphere(0.075, 0xe6e6ea, {}, 8); paw.position.y = -0.2; paw.scale.set(1.1, 0.7, 1.1); l.add(paw); b.add(l); this.legs.push(l);
    }
    // curled tube tail
    this.tail = new THREE.Group(); this.tail.position.set(-0.36, 0.4, 0); b.add(this.tail);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.16, 0.12, 0.02), new THREE.Vector3(-0.26, 0.34, 0.04), new THREE.Vector3(-0.2, 0.52, 0.06), new THREE.Vector3(-0.06, 0.56, 0.06)]);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.06, 8, false), furMat); tube.castShadow = true; this.tail.add(tube);
    const tip = sphere(0.075, dark, {}, 10); tip.position.copy(curve.getPoint(1)); this.tail.add(tip);
    this.collarSocket = new THREE.Group(); this.collarSocket.position.set(0.24, 0.46, 0); this.collarSocket.rotation.z = -Math.PI / 2 + 0.3; b.add(this.collarSocket);
    // "!" hint + emote sprites
    this.bang = makeIconSprite('❗'); this.bang.position.set(0, 1.15, 0); this.bang.scale.set(0.5, 0.5, 1); this.bang.visible = false; this.root.add(this.bang);
    this.emote = makeIconSprite('💛'); this.emote.position.set(0.2, 1.05, 0); this.emote.scale.set(0.5, 0.5, 1); this.emote.visible = false; this.root.add(this.emote);
    this.height = 0.95;
    applyCharacterStyle(this.root);
  }
  setCollar(id) { while (this.collarSocket.children.length) this.collarSocket.remove(this.collarSocket.children[0]); const c = buildCatCollar(id); this.collarSocket.add(c); applyCharacterStyle(this.root); }

  /** Show a short floating emote (heart, music note, zzz…). */
  react(emoji = '💛') {
    const c = document.createElement('canvas'); c.width = 96; c.height = 96; const ctx = c.getContext('2d'); ctx.font = '76px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(emoji, 48, 52);
    this.emote.material.map.image = c; this.emote.material.map.needsUpdate = true;
    this.emote.visible = true; this.emote.position.y = 0.95; this.emote.material.opacity = 1;
    tweens.killTweensOf(this.emote.position); tweens.killTweensOf(this.emote.material);
    tweens.to(this.emote.position, { y: 1.55 }, 1.0, { ease: Ease.quadOut });
    tweens.to(this.emote.material, { opacity: 0 }, 1.0, { ease: Ease.quadIn, onComplete: () => { this.emote.visible = false; } });
    const happy = ['💛', '😸', '🎉', '😺', '🎵'].includes(emoji);
    this.face.setExpression(happy ? 'happy' : emoji === '🤔' ? 'surprised' : 'neutral');
    tweens.timer(() => this.face.setExpression('neutral'), 1.6);
    this._earSpring.v += 6;
  }
  showHint(v) { this.bang.visible = v; }

  /** Instantly place behind the target. */
  snapTo(pos, facing = 0) { this.root.position.set(pos.x - Math.sin(facing) * 1.4, 0, pos.z - Math.cos(facing) * 1.4); this.facing = facing; this.root.rotation.y = facing; }

  /**
   * targetPos: Gigi's position; targetMoving: bool; targetFacing: radians.
   */
  update(dt, targetPos, targetMoving, targetFacing = 0) {
    this.t += dt;
    const p = this.root.position;
    let want;
    if (this.hintTarget) want = this.hintTarget;
    else { want = new THREE.Vector3(targetPos.x - Math.sin(targetFacing) * 1.3, 0, targetPos.z - Math.cos(targetFacing) * 1.3); }
    const dx = want.x - p.x, dz = want.z - p.z; const dist = Math.hypot(dx, dz);
    const distToGigi = Math.hypot(targetPos.x - p.x, targetPos.z - p.z);
    if (distToGigi > 12) { this.snapTo(targetPos, targetFacing); return; }

    const threshold = this.hintTarget ? 0.15 : 1.9;
    if (dist > threshold) {
      this.state = 'follow'; this.idleTime = 0;
      const maxSpeed = this.hintTarget ? 5.2 : Math.min(6.5, 2.4 + dist * 1.2);
      this.speed += (maxSpeed - this.speed) * Math.min(1, dt * 6);
      const step = Math.min(dist, this.speed * dt);
      p.x += (dx / dist) * step; p.z += (dz / dist) * step;
      const targetYaw = Math.atan2(dx, dz);
      let dy = targetYaw - this.facing; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      this.facing += dy * Math.min(1, dt * 10);
    } else {
      this.speed *= Math.max(0, 1 - dt * 8);
      if (this.hintTarget) {
        this.state = 'sit'; this.idleTime = 0;
        const yaw = Math.atan2(targetPos.x - p.x, targetPos.z - p.z); let dy = yaw - this.facing; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; this.facing += dy * Math.min(1, dt * 6);
      } else if (!targetMoving) {
        this.idleTime += dt;
        if (this.idleTime > 10 && this.state !== 'stretch' && this.state !== 'stretched') { this.state = 'stretch'; this._stretchT = 0; }
        else if (this.idleTime > 2 && this.state === 'follow') this.state = 'sit';
      } else { this.idleTime = 0; if (this.state !== 'follow') this.state = 'follow'; }
    }
    this.root.rotation.y = this.facing - Math.PI / 2; // model faces +x locally
    this.root.position.y = 0;

    // ---- animation ----
    const walk = Math.min(1, this.speed / 3);
    const w = this.t * 14;
    this.legs.forEach((l, i) => { l.rotation.z = Math.sin(w + (i % 2) * Math.PI + (i > 1 ? Math.PI / 2 : 0)) * 0.7 * walk; });
    this.body.position.y = Math.abs(Math.sin(w)) * 0.035 * walk;
    // tail: spring reacts to acceleration, plus lazy sway
    const accel = (this.speed - this._prevSpeed) / Math.max(dt, 0.001); this._prevSpeed = this.speed;
    const ts = this._tailSpring; ts.v += ((-accel * 0.02 - ts.a) * 40 - ts.v * 6) * dt; ts.a += ts.v * dt;
    this.tail.rotation.x = Math.sin(this.t * 3) * 0.3 + Math.sin(this.t * 7) * 0.1 * walk + (this.tailFlick > 0 ? Math.sin(this.t * 18) * 0.6 : 0);
    this.tail.rotation.z = THREE.MathUtils.clamp(ts.a, -0.6, 0.6);
    if (this.tailFlick > 0) this.tailFlick -= dt;
    // ears: flick spring
    const es = this._earSpring; es.v += ((0 - es.a) * 80 - es.v * 8) * dt; es.a += es.v * dt;
    this.ears.forEach((e, i) => { e.rotation.z = -0.25 + es.a * 0.3 * (i === 0 ? 1 : -1) + Math.sin(this.t * 0.9 + i) * 0.03; });
    this.head.rotation.y = Math.sin(this.t * 0.9) * 0.15 * (1 - walk);
    this.head.rotation.z = -Math.abs(Math.sin(w)) * 0.06 * walk;
    if (this.state === 'sit') {
      this.body.rotation.z += (0.55 - this.body.rotation.z) * Math.min(1, dt * 6);
      this.body.position.y = -0.02;
      this.legs[2].rotation.z = 1.4; this.legs[3].rotation.z = 1.4;
      this.legs[0].rotation.z = -0.2; this.legs[1].rotation.z = -0.2;
    } else if (this.state === 'stretch') {
      this._stretchT += dt;
      const s = Math.sin(Math.min(1, this._stretchT / 1.6) * Math.PI);
      this.body.rotation.z += (-0.35 * s - this.body.rotation.z) * Math.min(1, dt * 8);
      this.torso.scale.set(1 + 0.25 * s, 1, 1);
      this.legs[0].rotation.z = -0.9 * s; this.legs[1].rotation.z = -0.9 * s;
      if (this._stretchT > 1.6) { this.state = 'stretched'; this.torso.scale.set(1, 1, 1); this.face.setExpression('joy'); tweens.timer(() => this.face.setExpression('neutral'), 1.5); }
    } else if (this.state === 'stretched') {
      this.body.rotation.z += (0.55 - this.body.rotation.z) * Math.min(1, dt * 6);
      this.legs[2].rotation.z = 1.4; this.legs[3].rotation.z = 1.4;
    } else {
      this.body.rotation.z += (0 - this.body.rotation.z) * Math.min(1, dt * 8);
    }
    if (this.bang.visible) this.bang.position.y = 1.1 + Math.sin(this.t * 5) * 0.06;
    this.face.update(dt);
  }
}
