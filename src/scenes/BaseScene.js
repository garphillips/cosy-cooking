import * as THREE from 'three';
import { setCurve } from '../world/curve.js';

/**
 * Common scene scaffolding: THREE scene + camera, lights, an interactable registry with a
 * contextual floating prompt, and hold-to-interact support.
 */
export class BaseScene {
  constructor() {
    this.three = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    this.interactables = [];
    this.curve = { curvature: 0, start: 6 };
    this._hold = { target: null, t: 0 };
    this.active = null;
    this._v = new THREE.Vector3();
    this.built = false;
  }
  get ui() { return this.game.ui; }
  get input() { return this.game.input; }
  get state() { return this.game.state; }
  get audio() { return this.game.audio; }

  resize(w, h) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  render(renderer) { this.game.renderFrame(this.three, this.camera); }
  enter() { setCurve(this.curve.curvature, this.curve.start); }
  exit() {}

  setupLights({ sun = 0xfff2dc, sunIntensity = 2.2, sky = 0xbfe0f5, ground = 0x9a8a6a, ambient = 0.55, shadowSize = 40, pos = [12, 20, 8] } = {}) {
    const hemi = new THREE.HemisphereLight(sky, ground, ambient);
    this.three.add(hemi);
    const dir = new THREE.DirectionalLight(sun, sunIntensity);
    dir.position.set(...pos);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.near = 1; dir.shadow.camera.far = 80;
    dir.shadow.camera.left = -shadowSize; dir.shadow.camera.right = shadowSize; dir.shadow.camera.top = shadowSize; dir.shadow.camera.bottom = -shadowSize;
    dir.shadow.bias = -0.0008; dir.shadow.normalBias = 0.02;
    this.three.add(dir); this.three.add(dir.target);
    this.sun = dir; this.hemi = hemi;
    // soft character fill that rides with the camera
    this.three.add(this.camera);
    const fill = new THREE.PointLight(0xfff0e0, 1.2, 30, 2); fill.position.set(1.5, 0.5, 1.5); fill.castShadow = false; this.camera.add(fill); this.fill = fill;
    return { hemi, dir };
  }

  /**
   * addInteractable({ position, radius, label, icon, onInteract, hold, onHoldProgress, enabled, priority })
   *  - hold: seconds to hold interact before onInteract fires (omit for a tap)
   */
  addInteractable(def) {
    const it = { radius: 2.2, priority: 0, enabled: () => true, ...def };
    this.interactables.push(it);
    return it;
  }
  removeInteractable(it) { const i = this.interactables.indexOf(it); if (i >= 0) this.interactables.splice(i, 1); if (this.active === it) this.active = null; }
  clearInteractables() { this.interactables.length = 0; this.active = null; }

  /** Call every frame with the player's world position. Handles prompt + input. */
  updateInteractables(dt, playerPos, blocked = false) {
    let best = null, bestD = Infinity;
    if (!blocked) {
      for (const it of this.interactables) {
        if (!it.enabled()) continue;
        const p = it.position; const d = Math.hypot(p.x - playerPos.x, p.z - playerPos.z);
        if (d < it.radius && d - it.priority * 100 < bestD) { best = it; bestD = d - it.priority * 100; }
      }
    }
    if (best !== this.active) { this._hold.t = 0; this.active = best; }
    if (!best) { this.ui.prompt.hide(); return; }
    // project prompt position
    this._v.set(best.position.x, best.position.y + (best.promptHeight ?? 1.6), best.position.z).project(this.camera);
    const x = (this._v.x * 0.5 + 0.5) * this.game.width, y = (-this._v.y * 0.5 + 0.5) * this.game.height;
    this.ui.prompt.setScreenPos(x, y);
    if (best.hold) {
      if (this.input.interact) {
        this._hold.t += dt;
        best.onHoldProgress?.(Math.min(1, this._hold.t / best.hold));
        if (this._hold.t >= best.hold) { this._hold.t = -999; best.onInteract(best); this._hold.t = 0; }
      } else if (this._hold.t > 0) { this._hold.t = Math.max(0, this._hold.t - dt * 2); best.onHoldProgress?.(this._hold.t / best.hold); }
      this.ui.prompt.show(best.label, best.icon, Math.max(0, this._hold.t) / best.hold);
    } else {
      this.ui.prompt.show(best.label, best.icon);
      if (this.input.interactPressed) best.onInteract(best);
    }
  }

  /** Dispose of a THREE subtree's geometries (materials are shared/cached). */
  disposeSubtree(obj) {
    obj.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }
}
