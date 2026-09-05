// Tiny tween + juice utility. Numeric properties only, on any object.
// Usage: tweens.to(mesh.position, { y: 1 }, 0.4, { ease: Ease.backOut }).then(...)

export const Ease = {
  linear: (t) => t,
  quadIn: (t) => t * t,
  quadOut: (t) => t * (2 - t),
  quadInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  cubicOut: (t) => --t * t * t + 1,
  cubicInOut: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  sineInOut: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  backOut: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  backIn: (t) => { const c1 = 1.70158, c3 = c1 + 1; return c3 * t * t * t - c1 * t * t; },
  elasticOut: (t) => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
  bounceOut: (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

class Tween {
  constructor(target, to, duration, opts = {}) {
    this.target = target;
    this.to = to;
    this.from = {};
    this.duration = Math.max(0.0001, duration);
    this.ease = opts.ease || Ease.quadOut;
    this.delay = opts.delay || 0;
    this.onUpdate = opts.onUpdate;
    this.onComplete = opts.onComplete;
    this.yoyo = !!opts.yoyo;
    this.repeat = opts.repeat || 0; // -1 = forever
    this.t = 0;
    this.started = false;
    this.done = false;
    this.cancelled = false;
    this.promise = new Promise((res) => (this._resolve = res));
  }
  then(fn) { return this.promise.then(fn); }
  cancel() { this.cancelled = true; this.done = true; }
  _start() {
    this.started = true;
    for (const k in this.to) this.from[k] = this.target[k];
  }
  update(dt) {
    if (this.done) return true;
    if (this.delay > 0) { this.delay -= dt; if (this.delay > 0) return false; dt = -this.delay; }
    if (!this.started) this._start();
    this.t += dt;
    let p = Math.min(1, this.t / this.duration);
    const e = this.ease(p);
    for (const k in this.to) this.target[k] = this.from[k] + (this.to[k] - this.from[k]) * e;
    if (this.onUpdate) this.onUpdate(e, p);
    if (p >= 1) {
      if (this.repeat !== 0) {
        if (this.repeat > 0) this.repeat--;
        this.t = 0;
        if (this.yoyo) { const tmp = this.from; this.from = { ...this.to }; this.to = tmp; }
        return false;
      }
      this.done = true;
      if (this.onComplete) this.onComplete();
      this._resolve();
      return true;
    }
    return false;
  }
}

class TweenManager {
  constructor() { this.list = []; this.timers = []; }
  to(target, to, duration, opts) { const tw = new Tween(target, to, duration, opts); this.list.push(tw); return tw; }
  /** Call fn after `delay` seconds (game time). Returns a handle with cancel(). */
  timer(fn, delay) { const h = { t: delay, fn, done: false, cancel() { this.done = true; } }; this.timers.push(h); return h; }
  wait(delay) { return new Promise((res) => this.timer(res, delay)); }
  killTweensOf(target) { for (const tw of this.list) if (tw.target === target) tw.cancel(); }
  clear() { this.list.length = 0; this.timers.length = 0; }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) if (this.list[i].update(dt)) this.list.splice(i, 1);
    for (let i = this.timers.length - 1; i >= 0; i--) {
      const h = this.timers[i];
      if (h.done) { this.timers.splice(i, 1); continue; }
      h.t -= dt;
      if (h.t <= 0) { h.done = true; this.timers.splice(i, 1); h.fn(); }
    }
  }
}

export const tweens = new TweenManager();

// ---- Juice helpers (squash & stretch etc.) ----
export const juice = {
  /** Quick pop: scale up then settle back. */
  pop(obj, amount = 1.25, dur = 0.35) {
    if (!obj || !obj.scale) return;
    tweens.killTweensOf(obj.scale);
    const base = obj.userData.baseScale || (obj.userData.baseScale = obj.scale.x);
    obj.scale.setScalar(base * amount);
    return tweens.to(obj.scale, { x: base, y: base, z: base }, dur, { ease: Ease.elasticOut });
  },
  /** Squash (wide & short) then return. */
  squash(obj, amount = 0.25, dur = 0.3) {
    if (!obj || !obj.scale) return;
    tweens.killTweensOf(obj.scale);
    const base = obj.userData.baseScale || (obj.userData.baseScale = obj.scale.x);
    obj.scale.set(base * (1 + amount), base * (1 - amount), base * (1 + amount));
    return tweens.to(obj.scale, { x: base, y: base, z: base }, dur, { ease: Ease.elasticOut });
  },
  /** Small side-to-side wobble on rotation.z */
  wobble(obj, amount = 0.25, dur = 0.5) {
    if (!obj) return;
    tweens.killTweensOf(obj.rotation);
    const start = obj.rotation.z;
    const state = { t: 0 };
    return tweens.to(state, { t: 1 }, dur, {
      ease: Ease.linear,
      onUpdate: (e) => { obj.rotation.z = start + Math.sin(e * Math.PI * 4) * amount * (1 - e); },
      onComplete: () => { obj.rotation.z = start; },
    });
  },
  /** Hop up and back down on position.y */
  hop(obj, height = 0.4, dur = 0.35) {
    if (!obj) return;
    const y0 = obj.position.y;
    return tweens.to(obj.position, { y: y0 + height }, dur / 2, { ease: Ease.quadOut }).then(() =>
      tweens.to(obj.position, { y: y0 }, dur / 2, { ease: Ease.quadIn }));
  },
};

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
