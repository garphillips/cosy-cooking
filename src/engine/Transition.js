// Soft iris wipe between scenes. Uses a full-screen cream div with an animated clip-path.
import { tweens, Ease } from './Tween.js';

export class Transition {
  constructor(el) { this.el = el; this.state = { r: 0 }; this.busy = false; }
  _apply(x = 50, y = 50) { this.el.style.clipPath = `circle(${this.state.r}% at ${x}% ${y}%)`; }
  /** Close the iris (cover the screen). */
  out(dur = 0.45, x = 50, y = 50) {
    if (document.body.classList.contains('reduced-motion')) dur = 0.12;
    tweens.killTweensOf(this.state);
    this.el.style.pointerEvents = 'auto';
    return tweens.to(this.state, { r: 150 }, dur, { ease: Ease.quadIn, onUpdate: () => this._apply(x, y) }).promise;
  }
  /** Open the iris (reveal the screen). */
  in(dur = 0.55, x = 50, y = 50) {
    if (document.body.classList.contains('reduced-motion')) dur = 0.12;
    tweens.killTweensOf(this.state);
    this.state.r = 150; this._apply(x, y);
    return tweens.to(this.state, { r: 0 }, dur, { ease: Ease.quadOut, onUpdate: () => this._apply(x, y), onComplete: () => { this.el.style.pointerEvents = 'none'; } }).promise;
  }
  cover() { this.state.r = 150; this._apply(); this.el.style.pointerEvents = 'auto'; }
}
