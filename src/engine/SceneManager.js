// Simple scene/state machine. Each scene exposes:
//   enter(params), exit(), update(dt), render(renderer), resize(w, h)
//   scene.three (THREE.Scene) and scene.camera (THREE.Camera) for rendering.
export class SceneManager {
  constructor(game) {
    this.game = game;
    this.scenes = new Map();
    this.current = null;
    this.currentName = null;
    this.transitioning = false;
    this._queue = null;
  }
  register(name, scene) { scene.game = this.game; scene.name = name; this.scenes.set(name, scene); }
  get(name) { return this.scenes.get(name); }

  /** Switch scene with an iris wipe. Safe to call repeatedly; extra calls during a transition are dropped. */
  async go(name, params = {}) {
    if (this.transitioning) return;
    const next = this.scenes.get(name);
    if (!next) throw new Error(`Unknown scene: ${name}`);
    this.transitioning = true;
    const tr = this.game.transition;
    await tr.out(0.45);
    if (this.current) { this.current.exit?.(); }
    this.game.ui.clearScene();
    this.current = next; this.currentName = name;
    await next.enter?.(params);
    next.resize?.(this.game.width, this.game.height);
    // one frame so the new scene renders under the cover before the iris opens
    await new Promise((r) => requestAnimationFrame(r));
    await tr.in(0.55);
    this.transitioning = false;
  }

  /** Immediate switch without wipe (used at boot). */
  async set(name, params = {}) {
    const next = this.scenes.get(name);
    if (this.current) this.current.exit?.();
    this.game.ui.clearScene();
    this.current = next; this.currentName = name;
    await next.enter?.(params);
    next.resize?.(this.game.width, this.game.height);
  }

  update(dt) { this.current?.update?.(dt); }
  render(renderer) { this.current?.render?.(renderer); }
  resize(w, h) { for (const s of this.scenes.values()) s.resize?.(w, h); }
}
