import * as THREE from 'three';
import { damp } from './Tween.js';

/** High-angle third-person follow camera with smoothing and a small look-ahead. */
export class FollowCamera {
  constructor(camera, { offset = new THREE.Vector3(0, 8.5, 11), lookAhead = 1.2, lambda = 5, lookLambda = 7 } = {}) {
    this.camera = camera; this.offset = offset.clone(); this.lookAhead = lookAhead; this.lambda = lambda; this.lookLambda = lookLambda;
    this.target = new THREE.Vector3(); this.look = new THREE.Vector3(); this.pos = new THREE.Vector3();
    this.shake = 0;
    this.bounds = null; // { minX, maxX, minZ, maxZ } for the look target
  }
  get yaw() { return Math.atan2(this.offset.x, this.offset.z); }
  snap(targetPos, vel) {
    this.target.copy(targetPos); this.look.copy(targetPos);
    this.pos.copy(targetPos).add(this.offset);
    this.camera.position.copy(this.pos); this.camera.lookAt(this.look);
  }
  update(dt, targetPos, vel = null) {
    const want = targetPos.clone();
    if (vel) want.addScaledVector(vel, this.lookAhead * 0.2);
    if (this.bounds) { want.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, want.x)); want.z = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, want.z)); }
    this.target.x = damp(this.target.x, want.x, this.lambda, dt);
    this.target.y = damp(this.target.y, want.y, this.lambda, dt);
    this.target.z = damp(this.target.z, want.z, this.lambda, dt);
    this.pos.copy(this.target).add(this.offset);
    this.look.x = damp(this.look.x, targetPos.x, this.lookLambda, dt);
    this.look.y = damp(this.look.y, targetPos.y + 0.6, this.lookLambda, dt);
    this.look.z = damp(this.look.z, targetPos.z, this.lookLambda, dt);
    if (this.shake > 0) { this.pos.x += (Math.random() - 0.5) * this.shake; this.pos.y += (Math.random() - 0.5) * this.shake; this.shake = Math.max(0, this.shake - dt * 0.6); }
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.look);
  }
}
