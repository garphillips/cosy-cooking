// Sprout the grey tabby. Follows Gigi with a lag, sits when she stops, stretches when idle,
// never blocks the player, teleports quietly if left too far behind.
import * as THREE from 'three';
import { sphere, capsule, cylinder, cone, box, makeIconSprite } from '../props.js';
import { PALETTE } from '../materials.js';
import { buildCatCollar } from './cosmetics.js';
import { tweens, Ease } from '../../engine/Tween.js';

export class Sprout {
  constructor() {
    this.root = new THREE.Group(); this.root.name = 'Sprout';
    this.body = new THREE.Group(); this.root.add(this.body);
    this.t = 0; this.state = 'follow'; this.idleTime = 0; this.speed = 0;
    this.vel = new THREE.Vector3(); this.facing = 0;
    this.hintTarget = null;      // Vector3: sit here and show "!"
    this.reaction = null;
    this._build();
    this.setCollar('cat_green');
  }
  _build() {
    const b = this.body;
    const grey = PALETTE.catGrey, dark = PALETTE.catDark;
    this.torso = capsule(0.22, 0.32, grey); this.torso.rotation.z = Math.PI / 2; this.torso.position.y = 0.34; b.add(this.torso);
    // stripes
    for (let i = -1; i <= 1; i++) { const s = box(0.06, 0.1, 0.36, dark); s.position.set(i * 0.14, 0.5, 0); s.castShadow = false; this.torso.parent.add(s); }
    this.head = new THREE.Group(); this.head.position.set(0.32, 0.52, 0); b.add(this.head);
    const hm = sphere(0.24, grey, {}, 18); this.head.add(hm);
    for (const s of [-1, 1]) {
      const ear = cone(0.08, 0.16, grey, {}, 6); ear.position.set(0, 0.24, s * 0.14); ear.rotation.z = -0.2; this.head.add(ear);
      const eye = sphere(0.045, 0x4a8a5a, {}, 8); eye.position.set(0.21, 0.04, s * 0.1); eye.castShadow = false; this.head.add(eye);
      const pupil = sphere(0.02, 0x1a1a1a, {}, 6); pupil.position.set(0.245, 0.04, s * 0.1); pupil.castShadow = false; this.head.add(pupil);
      const cheek = sphere(0.035, 0xf0a3c0, {}, 6); cheek.position.set(0.2, -0.05, s * 0.16); cheek.castShadow = false; this.head.add(cheek);
      const whisker = box(0.02, 0.01, 0.2, 0xfaf6ee); whisker.position.set(0.2, -0.03, s * 0.24); whisker.castShadow = false; this.head.add(whisker);
    }
    const nose = sphere(0.025, 0xe07090, {}, 6); nose.position.set(0.245, -0.02, 0); this.head.add(nose);
    const stripeH = box(0.14, 0.04, 0.06, dark); stripeH.position.set(0.02, 0.22, 0); stripeH.castShadow = false; this.head.add(stripeH);
    // legs
    this.legs = [];
    for (const [x, z] of [[0.18, 0.12], [0.18, -0.12], [-0.18, 0.12], [-0.18, -0.12]]) {
      const l = new THREE.Group(); l.position.set(x, 0.22, z); const m = cylinder(0.055, 0.06, 0.22, grey, {}, 8); m.position.y = -0.11; l.add(m); b.add(l); this.legs.push(l);
    }
    // tail
    this.tail = new THREE.Group(); this.tail.position.set(-0.36, 0.42, 0); b.add(this.tail);
    const tm = capsule(0.05, 0.36, grey); tm.position.set(-0.1, 0.16, 0); tm.rotation.z = 0.7; this.tail.add(tm);
    const tip = sphere(0.055, dark, {}, 8); tip.position.set(-0.22, 0.36, 0); this.tail.add(tip);
    this.collarSocket = new THREE.Group(); this.collarSocket.position.set(0.24, 0.42, 0); this.collarSocket.rotation.z = -Math.PI / 2 + 0.3; b.add(this.collarSocket);
    // "!" hint + heart sprites
    this.bang = makeIconSprite('❗'); this.bang.position.set(0, 1.1, 0); this.bang.scale.set(0.5, 0.5, 1); this.bang.visible = false; this.root.add(this.bang);
    this.emote = makeIconSprite('💛'); this.emote.position.set(0.2, 1.0, 0); this.emote.scale.set(0.5, 0.5, 1); this.emote.visible = false; this.root.add(this.emote);
    this.height = 0.8;
  }
  setCollar(id) { while (this.collarSocket.children.length) this.collarSocket.remove(this.collarSocket.children[0]); const c = buildCatCollar(id); this.collarSocket.add(c); }

  /** Show a short floating emote (heart, music note, zzz…). */
  react(emoji = '💛') {
    const c = document.createElement('canvas'); c.width = 96; c.height = 96; const ctx = c.getContext('2d'); ctx.font = '76px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(emoji, 48, 52);
    this.emote.material.map.image = c; this.emote.material.map.needsUpdate = true;
    this.emote.visible = true; this.emote.position.y = 0.9; this.emote.material.opacity = 1;
    tweens.killTweensOf(this.emote.position); tweens.killTweensOf(this.emote.material);
    tweens.to(this.emote.position, { y: 1.5 }, 1.0, { ease: Ease.quadOut });
    tweens.to(this.emote.material, { opacity: 0 }, 1.0, { ease: Ease.quadIn, onComplete: () => { this.emote.visible = false; } });
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
        // face Gigi
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
    this.legs.forEach((l, i) => { l.rotation.z = Math.sin(w + (i % 2) * Math.PI + (i > 1 ? Math.PI / 2 : 0)) * 0.6 * walk; });
    this.body.position.y = Math.abs(Math.sin(w)) * 0.03 * walk;
    this.tail.rotation.x = Math.sin(this.t * 3) * 0.35 + Math.sin(this.t * 7) * 0.1 * walk;
    this.tail.rotation.z = 0;
    this.head.rotation.y = Math.sin(this.t * 0.9) * 0.15 * (1 - walk);
    this.head.rotation.z = 0;
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
      if (this._stretchT > 1.6) { this.state = 'stretched'; this.torso.scale.set(1, 1, 1); }
    } else if (this.state === 'stretched') {
      this.body.rotation.z += (0.55 - this.body.rotation.z) * Math.min(1, dt * 6);
      this.legs[2].rotation.z = 1.4; this.legs[3].rotation.z = 1.4;
    } else {
      this.body.rotation.z += (0 - this.body.rotation.z) * Math.min(1, dt * 8);
    }
    if (this.bang.visible) this.bang.position.y = 1.05 + Math.sin(this.t * 5) * 0.06;
  }
}
