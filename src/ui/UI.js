// DOM overlay UI: HUD, floating interact prompt, toasts, modals, pause menu.
import { audio } from '../engine/Audio.js';

const ICONS = { door: '🚪', gate: '🌿', shop: '🛍️', restaurant: '🍲', wardrobe: '👗', pet: '🐾', pick: '✋', pull: '💪', shake: '🌳', forage: '🔍', talk: '💬', cook: '🍳', open: '🔔', close: '🔔', leave: '🏡', book: '📖', basket: '🧺', meadow: '🌼', bed: '🛏️' };

export function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

export class UI {
  constructor(root, game) {
    this.root = root; this.game = game; this.state = game?.state;
    this.sceneLayer = el('div', 'scene-layer'); this.sceneLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
    this.persistLayer = el('div', 'persist-layer'); this.persistLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
    root.appendChild(this.sceneLayer); root.appendChild(this.persistLayer);
    this.toasts = el('div', 'toasts'); this.persistLayer.appendChild(this.toasts);
    this.promptEl = el('div', 'prompt hidden'); this.persistLayer.appendChild(this.promptEl);
    this.modals = [];
    this.hud = null;
    this._toastQueue = [];
    this._applySettingsClasses();
  }
  attach(game) { this.game = game; this.state = game.state; this.state.on((t, p) => this._onState(t, p)); }

  _applySettingsClasses() {
    const s = this.state?.settings; if (!s) return;
    document.body.classList.toggle('reduced-motion', !!s.reducedMotion);
    document.documentElement.style.setProperty('--ui-scale', s.largeText ? '1.2' : document.documentElement.style.getPropertyValue('--ui-scale') || '1');
  }

  clearScene() { this.sceneLayer.innerHTML = ''; this.hideHUD(); this.prompt.hide(); }
  mount(e) { this.sceneLayer.appendChild(e); return e; }

  // ---- HUD ----
  showHUD(opts = {}) {
    this.hideHUD();
    const hud = el('div', 'hud');
    const left = el('div', 'stack'); const right = el('div', 'stack right');
    hud.appendChild(left); hud.appendChild(right);
    const cp = el('div', 'pill', `<span class="icon">🪙</span><span class="cp-val">${this.state.cp}</span> <span class="tiny">CP</span>`);
    left.appendChild(cp);
    let basket = null;
    if (opts.basket !== false) {
      basket = el('div', 'pill', `<span class="icon">🧺</span><span class="basket-val">${this.state.inventory.length}/${this.state.game.basketCapacity}</span>`);
      left.appendChild(basket);
    }
    let extra = null;
    if (opts.extra) { extra = el('div', 'pill', opts.extra); left.appendChild(extra); }
    const pause = el('button', 'iconbtn', '⏸'); pause.title = 'Pause';
    pause.onclick = () => { audio.click(); this.pauseMenu(); };
    right.appendChild(pause);
    if (opts.book !== false) {
      const book = el('button', 'iconbtn', '📖'); book.title = 'Recipe book & basket';
      book.onclick = () => { audio.click(); this.game.scenes.current?.openBook?.(); };
      right.appendChild(book);
    }
    this.sceneLayer.appendChild(hud);
    this.hud = { el: hud, cp, basket, extra, left, right };
    return this.hud;
  }
  hideHUD() { if (this.hud) { this.hud.el.remove(); this.hud = null; } }
  _onState(type, payload) {
    if (!this.hud) return;
    if (type === 'cp') {
      const v = this.hud.cp.querySelector('.cp-val');
      const from = parseInt(v.textContent) || 0, to = this.state.cp;
      this._countUp(v, from, to);
      this.hud.cp.classList.remove('bump'); void this.hud.cp.offsetWidth; this.hud.cp.classList.add('bump');
    }
    if (type === 'inventory' && this.hud.basket) {
      this.hud.basket.querySelector('.basket-val').textContent = `${this.state.inventory.length}/${this.state.game.basketCapacity}`;
      this.hud.basket.classList.remove('bump'); void this.hud.basket.offsetWidth; this.hud.basket.classList.add('bump');
    }
  }
  _countUp(node, from, to) {
    const dur = 600, t0 = performance.now();
    const step = () => { const p = Math.min(1, (performance.now() - t0) / dur); node.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
    step();
  }

  // ---- floating prompt ----
  get prompt() {
    const self = this;
    return {
      show(label, kind = 'pick', progress = null) {
        const key = self.game.input.interactLabel();
        const icon = ICONS[kind] || kind;
        const radial = progress != null ? `<span class="radial" style="--p:${Math.round(progress * 100)}%"></span>` : '';
        const html = `<span class="key">${key}</span><span>${icon}</span><span>${label}</span>${radial}`;
        if (self.promptEl.innerHTML !== html) self.promptEl.innerHTML = html;
        self.promptEl.classList.remove('hidden');
      },
      setScreenPos(x, y) { self.promptEl.style.left = `${x}px`; self.promptEl.style.top = `${y}px`; },
      hide() { self.promptEl.classList.add('hidden'); },
    };
  }

  // ---- toasts ----
  toast(text, { icon = '', dur = 2200 } = {}) {
    const t = el('div', 'toast', `${icon ? icon + ' ' : ''}${text}`);
    this.toasts.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, dur);
    while (this.toasts.children.length > 4) this.toasts.firstChild.remove();
    return t;
  }

  // ---- modals ----
  modal({ title, body, buttons = [], closable = true, cls = '' }) {
    const backdrop = el('div', 'modal-backdrop');
    const box = el('div', `card modal ${cls}`);
    if (title) box.appendChild(el('h2', null, title));
    if (typeof body === 'string') box.appendChild(el('div', 'modal-body', body));
    else if (body) box.appendChild(body);
    const row = el('div', 'row center');
    const handle = { el: box, backdrop, close: () => this._closeModal(handle) };
    for (const b of buttons) {
      const btn = el('button', `btn ${b.cls || ''}`, b.label);
      btn.onclick = () => { audio.click(); const r = b.onClick?.(handle); if (r !== false && b.keepOpen !== true) handle.close(); };
      row.appendChild(btn);
    }
    if (buttons.length) box.appendChild(row);
    backdrop.appendChild(box);
    if (closable) backdrop.addEventListener('pointerdown', (e) => { if (e.target === backdrop) handle.close(); });
    this.persistLayer.appendChild(backdrop);
    this.modals.push(handle);
    this.game.input.locked = true;
    return handle;
  }
  _closeModal(h) {
    h.backdrop.remove();
    this.modals = this.modals.filter((m) => m !== h);
    if (!this.modals.length) this.game.input.locked = false;
    h.onClose?.();
  }
  closeAllModals() { for (const m of [...this.modals]) this._closeModal(m); }
  confirm(text, { ok = 'Yes', cancel = 'No', danger = false } = {}) {
    return new Promise((res) => {
      this.modal({ title: null, body: `<p>${text}</p>`, closable: false, buttons: [
        { label: cancel, cls: 'ghost', onClick: () => res(false) },
        { label: ok, cls: danger ? 'danger' : '', onClick: () => res(true) },
      ] });
    });
  }
  alert(text, title) { return new Promise((res) => this.modal({ title, body: `<p>${text}</p>`, buttons: [{ label: 'OK', onClick: () => res() }] })); }

  // ---- pause menu ----
  pauseMenu() {
    if (this.modals.length) return;
    const g = this.game, s = this.state.settings;
    g.paused = true;
    const body = el('div');
    const mk = (labelText, input) => { const l = el('label'); l.appendChild(el('span', null, labelText)); l.appendChild(input); body.appendChild(l); return input; };
    const range = (v) => { const i = el('input'); i.type = 'range'; i.min = 0; i.max = 1; i.step = 0.05; i.value = v; return i; };
    const check = (v) => { const i = el('input'); i.type = 'checkbox'; i.checked = v; return i; };
    const master = mk('Master volume', range(s.audio.master));
    const music = mk('Music', range(s.audio.music));
    const sfx = mk('Sound effects', range(s.audio.sfx));
    const mute = mk('Mute all', check(s.audio.muted));
    const applyAudio = () => { s.audio.master = +master.value; s.audio.music = +music.value; s.audio.sfx = +sfx.value; s.audio.muted = mute.checked; audio.applySettings(s.audio); this.state.saveSettings(); };
    [master, music, sfx].forEach((i) => (i.oninput = applyAudio)); mute.onchange = applyAudio;
    const controls = el('select'); ['auto', 'keyboard', 'touch'].forEach((o) => { const op = el('option', null, o[0].toUpperCase() + o.slice(1)); op.value = o; if (s.controls === o) op.selected = true; controls.appendChild(op); });
    mk('Control scheme', controls).onchange = () => { s.controls = controls.value; this.state.saveSettings(); this.applyControlScheme(); };
    const gfx = el('select'); [['auto', 'Auto'], ['high', 'Fancy (bloom, shadows, AO)'], ['low', 'Simple (fast)']].forEach(([v, n]) => { const op = el('option', null, n); op.value = v; if ((s.graphics || 'auto') === v) op.selected = true; gfx.appendChild(op); });
    mk('Graphics', gfx).onchange = () => { s.graphics = gfx.value; this.state.saveSettings(); };
    mk('Hold instead of tapping (rhythm inputs)', check(s.holdToTap)).onchange = (e) => { s.holdToTap = e.target.checked; this.state.saveSettings(); };
    mk('Reduced motion', check(s.reducedMotion)).onchange = (e) => { s.reducedMotion = e.target.checked; this.state.saveSettings(); this._applySettingsClasses(); };
    mk('Larger text', check(s.largeText)).onchange = (e) => { s.largeText = e.target.checked; this.state.saveSettings(); document.documentElement.style.setProperty('--ui-scale', e.target.checked ? '1.2' : '1'); };
    const h = this.modal({ title: '⏸ Paused', body, closable: true, buttons: [
      { label: 'Reset save', cls: 'danger small', keepOpen: true, onClick: async () => {
        const ok = await this.confirm('Reset all progress? Gigi\'s wardrobe, points and recipes will be lost.', { ok: 'Reset', cancel: 'Keep playing', danger: true });
        if (ok) { this.state.reset(); h.close(); this.game.scenes.go('title'); }
      } },
      { label: 'Title screen', cls: 'ghost small', onClick: () => { this.game.scenes.go('title'); } },
      { label: 'Resume', onClick: () => {} },
    ] });
    h.onClose = () => { g.paused = false; };
  }
  applyControlScheme() {
    const s = this.state.settings.controls;
    if (s === 'touch') this.game.input.setTouchForced(true);
    else if (s === 'keyboard') this.game.input.setTouchForced(false);
    else this.game.input._detectTouch();
  }

  /** Gamepad / keyboard focus navigation over DOM controls in the top modal or side panel. */
  update(dt) {
    const I = this.game.input; if (!I) return;
    const container = this.modals.length ? this.modals[this.modals.length - 1].el : this.sceneLayer.querySelector('.dressup');
    this.navActive = !!container && (I.scheme === 'gamepad' || I.scheme === 'keyboard');
    if (!container) { this._clearFocus(); return; }
    const any = I.nav.left || I.nav.right || I.nav.up || I.nav.down || I.nav.confirm || I.nav.back;
    if (!any) return;
    if (I.nav.back && this.modals.length && I.scheme === 'gamepad') { const m = this.modals[this.modals.length - 1]; const ghost = m.el.querySelector('.btn.ghost'); if (ghost) ghost.click(); else m.close(); return; }
    const els = [...container.querySelectorAll('button:not(:disabled), .du-item, input, select')].filter((e) => { const r = e.getBoundingClientRect(); if (r.width <= 0 || r.height <= 0) return false; if (e.classList.contains('du-item') && e.querySelector('button')) return false; return true; });
    if (!els.length) return;
    if (!this.focusEl || !container.contains(this.focusEl)) { this._setFocus(els[0]); if (!(I.nav.confirm)) return; }
    if (I.nav.confirm) { const f = this.focusEl; if (f.tagName === 'INPUT' && f.type === 'checkbox') { f.checked = !f.checked; f.dispatchEvent(new Event('change')); } else if (f.tagName === 'SELECT') { f.selectedIndex = (f.selectedIndex + 1) % f.options.length; f.dispatchEvent(new Event('change')); } else f.click(); return; }
    const dir = I.nav.left ? [-1, 0] : I.nav.right ? [1, 0] : I.nav.up ? [0, -1] : [0, 1];
    const f = this.focusEl;
    if (f.tagName === 'INPUT' && f.type === 'range' && dir[0]) { f.value = +f.value + dir[0] * +f.step; f.dispatchEvent(new Event('input')); return; }
    const fr = f.getBoundingClientRect(); const fc = { x: fr.left + fr.width / 2, y: fr.top + fr.height / 2 };
    let best = null, bd = Infinity;
    for (const e of els) { if (e === f) continue; const r = e.getBoundingClientRect(); const c = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; const dx = c.x - fc.x, dy = c.y - fc.y; const along = dx * dir[0] + dy * dir[1]; if (along <= 4) continue; const across = Math.abs(dx * dir[1]) + Math.abs(dy * dir[0]); const d = along + across * 2.5; if (d < bd) { bd = d; best = e; } }
    if (best) { this._setFocus(best); audio.hover(); best.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  }
  _setFocus(e) { this._clearFocus(); this.focusEl = e; e.classList.add('nav-focus'); }
  _clearFocus() { if (this.focusEl) { this.focusEl.classList.remove('nav-focus'); this.focusEl = null; } }
}
