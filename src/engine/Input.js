// Unified input: keyboard + mouse, gamepad, touch (virtual stick + buttons).
// Exposes a per-frame snapshot. Call input.update() at the start of each frame and
// input.endFrame() at the end.

export class Input {
  constructor(uiRoot) {
    this.uiRoot = uiRoot;
    this.keys = new Set();
    this.justKeys = new Set();
    this.move = { x: 0, y: 0 }; // -1..1 (x right, y forward/up)
    this.interact = false; this.interactPressed = false; this.interactReleased = false;
    this.cancel = false; this.cancelPressed = false;
    this.sprint = false;
    this.pausePressed = false;
    this.menuPressed = false; // opens inventory / recipe book (Tab / Y)
    this.pointer = { x: 0, y: 0, nx: 0, ny: 0, down: false, justDown: false, justUp: false, dx: 0, dy: 0, type: 'mouse' };
    this.scheme = 'keyboard'; // 'keyboard' | 'gamepad' | 'touch'
    this.touchEnabled = false;
    this.locked = false; // when a DOM modal is open, gameplay input is suppressed
    this._gpPrev = {};
    this._gpAxes = { x: 0, y: 0 };
    this._touch = { stick: { x: 0, y: 0, active: false, id: null }, a: false, b: false, sprint: false };
    this._pendingPressed = { interact: false, cancel: false, pause: false, menu: false };
    this.nav = { left: false, right: false, up: false, down: false, confirm: false, back: false };
    this._navHold = { x: 0, y: 0, t: 0 };
    this._bind();
    this._detectTouch();
  }

  _bind() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.code;
      this.keys.add(k); this.justKeys.add(k);
      this.scheme = 'keyboard';
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); });

    const onPointerMove = (e) => {
      this.pointer.dx += e.clientX - this.pointer.x;
      this.pointer.dy += e.clientY - this.pointer.y;
      this.pointer.x = e.clientX; this.pointer.y = e.clientY;
      this.pointer.nx = (e.clientX / window.innerWidth) * 2 - 1;
      this.pointer.ny = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('pointerdown', (e) => {
      if (e.target.closest && e.target.closest('.touch-controls')) return;
      this.pointer.type = e.pointerType;
      if (e.pointerType === 'touch') { this.scheme = 'touch'; this._enableTouch(); }
      else if (e.pointerType === 'mouse') { if (this.scheme === 'touch') this.scheme = 'keyboard'; }
      this.pointer.x = e.clientX; this.pointer.y = e.clientY;
      this.pointer.nx = (e.clientX / window.innerWidth) * 2 - 1;
      this.pointer.ny = -(e.clientY / window.innerHeight) * 2 + 1;
      this.pointer.down = true; this.pointer.justDown = true;
    });
    window.addEventListener('pointermove', onPointerMove);
    const up = () => { if (this.pointer.down) { this.pointer.down = false; this.pointer.justUp = true; } };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('gamepadconnected', () => { this.scheme = 'gamepad'; });
  }

  _detectTouch() {
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (coarse && navigator.maxTouchPoints > 0) { this.scheme = 'touch'; this._enableTouch(); }
  }

  setTouchForced(on) { if (on) this._enableTouch(); else this._disableTouch(); }

  _enableTouch() {
    if (this.touchEnabled) return;
    this.touchEnabled = true;
    const root = document.createElement('div');
    root.className = 'touch-controls';
    root.innerHTML = `
      <div class="stick"><div class="knob"></div></div>
      <div class="tbtn a">✋</div>
      <div class="tbtn b">💨</div>`;
    this.uiRoot.appendChild(root);
    this._touchRoot = root;
    if (this._touchVisible === false) root.classList.add('hidden');
    const stick = root.querySelector('.stick');
    const knob = root.querySelector('.knob');
    const st = this._touch.stick;
    const R = 50;
    const setKnob = () => { knob.style.transform = `translate(calc(-50% + ${st.x * R}px), calc(-50% + ${-st.y * R}px))`; };
    const handle = (e) => {
      const rect = stick.getBoundingClientRect();
      const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
      let dx = (e.clientX - cx) / R, dy = -(e.clientY - cy) / R;
      const len = Math.hypot(dx, dy);
      if (len > 1) { dx /= len; dy /= len; }
      st.x = dx; st.y = dy; setKnob();
    };
    stick.addEventListener('pointerdown', (e) => { st.active = true; st.id = e.pointerId; stick.setPointerCapture(e.pointerId); handle(e); this.scheme = 'touch'; e.stopPropagation(); });
    stick.addEventListener('pointermove', (e) => { if (st.active && e.pointerId === st.id) handle(e); });
    const end = (e) => { if (e.pointerId === st.id) { st.active = false; st.x = 0; st.y = 0; setKnob(); } };
    stick.addEventListener('pointerup', end);
    stick.addEventListener('pointercancel', end);

    const a = root.querySelector('.tbtn.a');
    const b = root.querySelector('.tbtn.b');
    const bindBtn = (el, key) => {
      el.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); el.classList.add('pressed'); this._touch[key] = true; if (key === 'a') this._pendingPressed.interact = true; this.scheme = 'touch'; el.setPointerCapture(e.pointerId); });
      const off = () => { el.classList.remove('pressed'); this._touch[key] = false; };
      el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off);
    };
    bindBtn(a, 'a'); bindBtn(b, 'sprint');
  }
  _disableTouch() {
    if (!this.touchEnabled) return;
    this.touchEnabled = false;
    this._touchRoot?.remove();
  }
  setTouchVisible(v) { this._touchVisible = v; if (this._touchRoot) this._touchRoot.classList.toggle('hidden', !v); }

  /** True if a key was pressed this frame. */
  keyPressed(code) { return this.justKeys.has(code); }
  keyDown(code) { return this.keys.has(code); }

  _pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;
    for (const p of pads) if (p && p.connected) { gp = p; break; }
    const out = { x: 0, y: 0, a: false, b: false, x2: false, start: false, y2: false, any: false };
    if (!gp) return out;
    const dz = (v) => (Math.abs(v) < 0.18 ? 0 : v);
    out.x = dz(gp.axes[0] || 0); out.y = -dz(gp.axes[1] || 0);
    const btn = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
    // d-pad
    if (btn(12)) out.y = 1; if (btn(13)) out.y = -1; if (btn(14)) out.x = -1; if (btn(15)) out.x = 1;
    out.a = btn(0); out.b = btn(1); out.x2 = btn(2) || btn(4) || btn(5); out.y2 = btn(3); out.start = btn(9);
    out.any = out.a || out.b || out.x2 || out.start || out.y2 || Math.abs(out.x) > 0 || Math.abs(out.y) > 0;
    return out;
  }

  update() {
    const gp = this._pollGamepad();
    if (gp.any) this.scheme = 'gamepad';
    const edge = (name, val) => { const prev = !!this._gpPrev[name]; this._gpPrev[name] = val; return val && !prev; };
    const gpA = edge('a', gp.a), gpB = edge('b', gp.b), gpStart = edge('start', gp.start), gpY = edge('y', gp.y2);

    // movement
    let mx = 0, my = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) mx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) mx += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) my += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) my -= 1;
    if (mx === 0 && my === 0) { mx = gp.x; my = gp.y; }
    if (mx === 0 && my === 0 && this._touch.stick.active) { mx = this._touch.stick.x; my = this._touch.stick.y; }
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    if (this.locked) { mx = 0; my = 0; }
    this.move.x = mx; this.move.y = my;

    const kInteract = this.keys.has('KeyE') || this.keys.has('Space') || this.keys.has('Enter');
    const kInteractPressed = this.justKeys.has('KeyE') || this.justKeys.has('Space') || this.justKeys.has('Enter');
    const prevInteract = this.interact;
    this.interact = !this.locked && (kInteract || gp.a || this._touch.a);
    this.interactPressed = !this.locked && (kInteractPressed || gpA || this._pendingPressed.interact);
    this.interactReleased = prevInteract && !this.interact;
    this.cancel = this.keys.has('KeyQ') || this.keys.has('Backspace') || gp.b;
    this.cancelPressed = this.justKeys.has('KeyQ') || this.justKeys.has('Backspace') || gpB;
    this.sprint = !this.locked && (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || gp.x2 || this._touch.sprint);
    this.pausePressed = this.justKeys.has('Escape') || gpStart;
    this.menuPressed = !this.locked && (this.justKeys.has('Tab') || this.justKeys.has('KeyI') || gpY);
    // menu navigation edges with auto-repeat on the stick
    const nx = Math.abs(gp.x) > 0.6 ? Math.sign(gp.x) : 0, ny = Math.abs(gp.y) > 0.6 ? Math.sign(gp.y) : 0;
    const h = this._navHold; const now = performance.now();
    let rx = 0, ry = 0;
    if (nx !== h.x || ny !== h.y) { h.x = nx; h.y = ny; h.t = now + 350; rx = nx; ry = ny; }
    else if ((nx || ny) && now > h.t) { h.t = now + 140; rx = nx; ry = ny; }
    this.nav.left = this.justKeys.has('ArrowLeft') || rx < 0; this.nav.right = this.justKeys.has('ArrowRight') || rx > 0;
    this.nav.up = this.justKeys.has('ArrowUp') || ry > 0; this.nav.down = this.justKeys.has('ArrowDown') || ry < 0;
    this.nav.confirm = this.justKeys.has('Enter') || gpA; this.nav.back = this.justKeys.has('Escape') || gpB;
  }

  endFrame() {
    this.justKeys.clear();
    this.pointer.justDown = false; this.pointer.justUp = false;
    this.pointer.dx = 0; this.pointer.dy = 0;
    this._pendingPressed.interact = false;
  }

  /** Human-readable label for the interact button under the current scheme. */
  interactLabel() { return this.scheme === 'gamepad' ? 'A' : this.scheme === 'touch' ? '✋' : 'E'; }
  sprintLabel() { return this.scheme === 'gamepad' ? 'X' : this.scheme === 'touch' ? '💨' : 'Shift'; }
}
