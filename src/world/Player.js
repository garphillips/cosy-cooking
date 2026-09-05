// Player controller: moves Gigi with camera-relative input, resolves simple collisions.
import * as THREE from 'three';

export class Player {
  constructor(gigi, { speed = 3.6, sprintSpeed = 5.8, radius = 0.36 } = {}) {
    this.gigi = gigi; this.root = gigi.root;
    this.speed = speed; this.sprintSpeed = sprintSpeed; this.radius = radius;
    this.vel = new THREE.Vector3(); this.facing = 0;
    this.colliders = []; this.bounds = null; this.frozen = false;
    this.moving = false; this.stepT = 0; this.onStep = null;
    this.idleT = 0; this.idleFaceYaw = null; // set by the scene: yaw to turn toward when idle
  }
  get position() { return this.root.position; }
  setColliders(list) { this.colliders = list; }
  setBounds(b) { this.bounds = b; }
  teleport(x, z, facing = 0) { this.root.position.set(x, 0, z); this.facing = facing; this.root.rotation.y = facing; this.vel.set(0, 0, 0); }

  update(dt, input, camYaw = 0) {
    let mx = input.move.x, mz = input.move.y;
    if (this.frozen) { mx = 0; mz = 0; }
    // rotate input by camera yaw: forward (y) = away from camera
    const s = Math.sin(camYaw), c = Math.cos(camYaw);
    const dx = mx * c - mz * s, dz = -mz * c - mx * s;
    const len = Math.hypot(dx, dz);
    const target = len > 0.01 ? (input.sprint ? this.sprintSpeed : this.speed) * Math.min(1, len) : 0;
    const accel = target > 0 ? 18 : 22;
    const wantX = len > 0.01 ? (dx / len) * target : 0, wantZ = len > 0.01 ? (dz / len) * target : 0;
    this.vel.x += (wantX - this.vel.x) * Math.min(1, dt * accel);
    this.vel.z += (wantZ - this.vel.z) * Math.min(1, dt * accel);
    const p = this.root.position;
    p.x += this.vel.x * dt; p.z += this.vel.z * dt;
    this._resolve();
    const sp = Math.hypot(this.vel.x, this.vel.z);
    this.moving = sp > 0.3;
    if (len > 0.01) {
      this.idleT = 0;
      const yaw = Math.atan2(dx, dz);
      let d = yaw - this.facing; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      this.facing += d * Math.min(1, dt * 12);
    } else if (!this.frozen) {
      this.idleT += dt;
      // after a beat, drift round to face the camera so her face reads while she stands still
      if (this.idleT > 1.2 && this.idleFaceYaw != null) {
        let d = this.idleFaceYaw - this.facing; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
        this.facing += d * Math.min(1, dt * 2.5);
      }
    }
    this.root.rotation.y = this.facing;
    this.gigi.update(dt, { moving: Math.min(1, sp / this.speed), speed: sp / this.speed });
    // footstep callback
    if (this.moving) { this.stepT += dt * sp; if (this.stepT > 1.6) { this.stepT = 0; this.onStep?.(); } }
  }

  _resolve() {
    const p = this.root.position, r = this.radius;
    for (const c of this.colliders) {
      if (c.r != null) {
        const dx = p.x - c.x, dz = p.z - c.z; const d = Math.hypot(dx, dz); const min = c.r + r;
        if (d < min && d > 0.0001) { p.x = c.x + (dx / d) * min; p.z = c.z + (dz / d) * min; }
      } else {
        const cx = Math.max(c.x - c.hw, Math.min(c.x + c.hw, p.x)), cz = Math.max(c.z - c.hd, Math.min(c.z + c.hd, p.z));
        const dx = p.x - cx, dz = p.z - cz; const d = Math.hypot(dx, dz);
        if (d < r) {
          if (d > 0.0001) { p.x = cx + (dx / d) * r; p.z = cz + (dz / d) * r; }
          else { // inside: push out along smallest axis
            const ox = (c.hw + r) - Math.abs(p.x - c.x), oz = (c.hd + r) - Math.abs(p.z - c.z);
            if (ox < oz) p.x += Math.sign(p.x - c.x || 1) * ox; else p.z += Math.sign(p.z - c.z || 1) * oz;
          }
        }
      }
    }
    const b = this.bounds;
    if (b) {
      if (b.r != null) { const d = Math.hypot(p.x - (b.x || 0), p.z - (b.z || 0)); if (d > b.r) { p.x = (b.x || 0) + ((p.x - (b.x || 0)) / d) * b.r; p.z = (b.z || 0) + ((p.z - (b.z || 0)) / d) * b.r; } }
      else { p.x = Math.max(b.minX, Math.min(b.maxX, p.x)); p.z = Math.max(b.minZ, Math.min(b.maxZ, p.z)); }
    }
  }
}
