// Procedurally synthesised audio. No sound files. Everything comes from oscillators,
// filtered noise and gentle envelopes. Created lazily on first user gesture.

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null; this.sfxGain = null; this.musicGain = null; this.ambGain = null;
    this.settings = { master: 0.8, music: 0.5, sfx: 0.9, muted: false };
    this._musicTimer = null;
    this._noiseBuf = null;
    this._started = false;
    this._ambient = null;
    this._musicStep = 0;
    this._musicNextTime = 0;
  }

  /** Must be called from a user gesture (click/keydown). Safe to call repeatedly. */
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.ambGain = this.ctx.createGain();
    this.sfxGain.connect(this.master); this.musicGain.connect(this.master); this.ambGain.connect(this.master);
    // Soft compressor to keep things gentle
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 4; comp.attack.value = 0.01; comp.release.value = 0.2;
    this.master.connect(comp); comp.connect(this.ctx.destination);
    this._noiseBuf = this._makeNoise();
    this.applySettings();
    this._started = true;
  }

  applySettings(s) {
    if (s) Object.assign(this.settings, s);
    if (!this.ctx) return;
    const m = this.settings.muted ? 0 : this.settings.master;
    this.master.gain.setTargetAtTime(m, this.ctx.currentTime, 0.05);
    this.sfxGain.gain.setTargetAtTime(this.settings.sfx, this.ctx.currentTime, 0.05);
    this.musicGain.gain.setTargetAtTime(this.settings.music * 0.35, this.ctx.currentTime, 0.05);
    this.ambGain.gain.setTargetAtTime(0.5, this.ctx.currentTime, 0.05);
  }

  toggleMute() { this.settings.muted = !this.settings.muted; this.applySettings(); return this.settings.muted; }

  _makeNoise() {
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ---- primitive voices ----
  _tone({ freq = 440, type = 'sine', dur = 0.2, vol = 0.3, attack = 0.005, decay, to, dest, detune = 0, delay = 0 }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0); o.detune.value = detune;
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (decay || dur));
    o.connect(g); g.connect(dest || this.sfxGain);
    o.start(t0); o.stop(t0 + (decay || dur) + 0.05);
  }
  _noise({ dur = 0.1, vol = 0.2, filter = 1200, q = 1, type = 'bandpass', dest, delay = 0, sweepTo }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource(); s.buffer = this._noiseBuf; s.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(filter, t0); f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.sfxGain);
    s.start(t0); s.stop(t0 + dur + 0.05);
  }

  // ---- named SFX ----
  click() { this._tone({ freq: 900, type: 'triangle', dur: 0.06, vol: 0.15 }); this._noise({ dur: 0.03, vol: 0.05, filter: 3000 }); }
  hover() { this._tone({ freq: 1200, type: 'sine', dur: 0.04, vol: 0.05 }); }
  pop() { this._tone({ freq: 420, to: 880, type: 'sine', dur: 0.12, vol: 0.25 }); this._noise({ dur: 0.05, vol: 0.08, filter: 2500 }); }
  plop() { this._tone({ freq: 500, to: 160, type: 'sine', dur: 0.18, vol: 0.28 }); this._noise({ dur: 0.08, vol: 0.06, filter: 600 }); }
  chop() { this._noise({ dur: 0.07, vol: 0.35, filter: 1800, q: 0.7 }); this._tone({ freq: 180, to: 90, type: 'triangle', dur: 0.08, vol: 0.2 }); }
  thud() { this._tone({ freq: 120, to: 60, type: 'sine', dur: 0.15, vol: 0.3 }); }
  wobble() { this._tone({ freq: 300, to: 260, type: 'triangle', dur: 0.2, vol: 0.12 }); this._tone({ freq: 260, to: 300, type: 'triangle', dur: 0.2, vol: 0.12, delay: 0.12 }); }
  chime(n = 0) { const base = [523.25, 659.25, 783.99, 1046.5][n % 4]; this._tone({ freq: base, type: 'sine', dur: 0.6, vol: 0.18 }); this._tone({ freq: base * 2, type: 'sine', dur: 0.4, vol: 0.06 }); }
  success() { [0, 1, 2].forEach((i) => this._tone({ freq: [523.25, 659.25, 783.99][i], type: 'sine', dur: 0.5, vol: 0.16, delay: i * 0.09 })); }
  fanfare() { [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this._tone({ freq: f, type: 'triangle', dur: 0.5, vol: 0.14, delay: i * 0.08 })); }
  coin() { this._tone({ freq: 1200, type: 'square', dur: 0.08, vol: 0.06 }); this._tone({ freq: 1800, type: 'square', dur: 0.25, vol: 0.06, delay: 0.07 }); }
  coins(count = 5) { for (let i = 0; i < count; i++) this._tone({ freq: 1400 + Math.random() * 600, type: 'triangle', dur: 0.12, vol: 0.06, delay: i * 0.06 }); }
  bubble() { this._tone({ freq: 300 + Math.random() * 300, to: 900, type: 'sine', dur: 0.1, vol: 0.05 }); }
  sizzle(dur = 0.3) { this._noise({ dur, vol: 0.08, filter: 4000, q: 0.5, type: 'highpass' }); }
  steam() { this._noise({ dur: 0.5, vol: 0.06, filter: 1200, sweepTo: 3000, q: 0.6 }); }
  pour(dur = 0.4) { this._noise({ dur, vol: 0.12, filter: 700, sweepTo: 1200, q: 2 }); }
  shake() { this._noise({ dur: 0.06, vol: 0.18, filter: 5000, q: 0.8, type: 'highpass' }); }
  whoosh() { this._noise({ dur: 0.25, vol: 0.12, filter: 400, sweepTo: 2500, q: 0.8 }); }
  oops() { this._tone({ freq: 400, to: 250, type: 'triangle', dur: 0.3, vol: 0.14 }); this._noise({ dur: 0.3, vol: 0.06, filter: 800 }); }
  purr() { for (let i = 0; i < 14; i++) this._tone({ freq: 55 + (i % 2) * 6, type: 'sawtooth', dur: 0.06, vol: 0.05, delay: i * 0.07 }); }
  meow() { this._tone({ freq: 600, to: 900, type: 'triangle', dur: 0.12, vol: 0.12 }); this._tone({ freq: 900, to: 500, type: 'triangle', dur: 0.25, vol: 0.12, delay: 0.12 }); }
  chirp() { this._tone({ freq: 1400, to: 2200, type: 'sine', dur: 0.08, vol: 0.1 }); this._tone({ freq: 1800, to: 2400, type: 'sine', dur: 0.08, vol: 0.08, delay: 0.09 }); }
  bell() { this._tone({ freq: 1568, type: 'sine', dur: 1.2, vol: 0.12 }); this._tone({ freq: 3136, type: 'sine', dur: 0.8, vol: 0.04 }); this._tone({ freq: 2349, type: 'sine', dur: 0.5, vol: 0.03 }); }
  door() { this._noise({ dur: 0.15, vol: 0.12, filter: 500, q: 1 }); this._tone({ freq: 220, to: 180, type: 'triangle', dur: 0.15, vol: 0.1 }); }
  step() { this._noise({ dur: 0.05, vol: 0.05, filter: 350, q: 1.2 }); }
  heart() { this._tone({ freq: 880, type: 'sine', dur: 0.25, vol: 0.1 }); this._tone({ freq: 1108, type: 'sine', dur: 0.4, vol: 0.1, delay: 0.1 }); }
  tick(good = true) { this._tone({ freq: good ? 1000 : 500, type: 'triangle', dur: 0.05, vol: good ? 0.1 : 0.07 }); }
  unlock() { [659.25, 783.99, 987.77, 1318.5].forEach((f, i) => this._tone({ freq: f, type: 'sine', dur: 0.6, vol: 0.14, delay: i * 0.1 })); }

  // ---- ambience ----
  startAmbience(kind = 'outdoor') {
    if (!this.ctx) return;
    this.stopAmbience();
    const t = this.ctx.currentTime;
    const amb = { nodes: [], timers: [] };
    // wind / room tone: filtered noise
    const s = this.ctx.createBufferSource(); s.buffer = this._noiseBuf; s.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = kind === 'outdoor' ? 500 : 300; f.Q.value = 0.5;
    const g = this.ctx.createGain(); g.gain.value = kind === 'outdoor' ? 0.045 : 0.03;
    // slow LFO on the filter for breathing wind
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.12;
    const lfoG = this.ctx.createGain(); lfoG.gain.value = kind === 'outdoor' ? 250 : 60;
    lfo.connect(lfoG); lfoG.connect(f.frequency);
    s.connect(f); f.connect(g); g.connect(this.ambGain);
    s.start(t); lfo.start(t);
    amb.nodes.push(s, lfo);
    if (kind === 'outdoor') {
      // birds
      const bird = () => {
        if (this._ambient !== amb) return;
        const base = 1800 + Math.random() * 1200;
        const n = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) this._tone({ freq: base, to: base * (1.1 + Math.random() * 0.3), type: 'sine', dur: 0.09, vol: 0.03, delay: i * 0.13, dest: this.ambGain });
        amb.timers.push(setTimeout(bird, 2500 + Math.random() * 6000));
      };
      amb.timers.push(setTimeout(bird, 1500));
    } else {
      // kitchen: occasional soft bubble / crackle
      const kitchen = () => {
        if (this._ambient !== amb) return;
        this._tone({ freq: 250 + Math.random() * 200, to: 700, type: 'sine', dur: 0.1, vol: 0.02, dest: this.ambGain });
        amb.timers.push(setTimeout(kitchen, 900 + Math.random() * 2000));
      };
      amb.timers.push(setTimeout(kitchen, 1000));
    }
    this._ambient = amb;
  }
  stopAmbience() {
    if (!this._ambient) return;
    for (const n of this._ambient.nodes) { try { n.stop(); } catch (e) { /* noop */ } }
    for (const tmr of this._ambient.timers) clearTimeout(tmr);
    this._ambient = null;
  }

  // ---- music: gentle pentatonic loop ----
  startMusic() {
    if (!this.ctx || this._musicTimer) return;
    const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25]; // C major pentatonic-ish
    const bass = [130.81, 98.0, 110.0, 116.54];
    const pattern = [0, 4, 7, 4, 2, 5, 7, 5, 1, 4, 6, 4, 3, 5, 7, 5]; // 16 steps
    const stepDur = 0.32;
    this._musicNextTime = this.ctx.currentTime + 0.1;
    const schedule = () => {
      if (!this.ctx) return;
      while (this._musicNextTime < this.ctx.currentTime + 0.6) {
        const i = this._musicStep % pattern.length;
        const t = this._musicNextTime - this.ctx.currentTime;
        const note = scale[pattern[i] % scale.length];
        // pluck: triangle w/ fast decay
        this._tone({ freq: note, type: 'triangle', dur: 0.9, vol: 0.09, attack: 0.01, delay: t, dest: this.musicGain });
        this._tone({ freq: note * 2, type: 'sine', dur: 0.5, vol: 0.02, attack: 0.01, delay: t, dest: this.musicGain });
        if (i % 4 === 0) this._tone({ freq: bass[(this._musicStep / 4 | 0) % bass.length], type: 'sine', dur: stepDur * 4, vol: 0.12, attack: 0.05, delay: t, dest: this.musicGain });
        this._musicStep++;
        this._musicNextTime += stepDur;
      }
    };
    schedule();
    this._musicTimer = setInterval(schedule, 250);
  }
  stopMusic() { if (this._musicTimer) { clearInterval(this._musicTimer); this._musicTimer = null; } }
}

export const audio = new AudioManager();
