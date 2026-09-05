import * as THREE from 'three';
import { Input } from './Input.js';
import { tweens } from './Tween.js';
import { audio } from './Audio.js';
import { Transition } from './Transition.js';
import { SceneManager } from './SceneManager.js';
import { Post } from './Post.js';

export class Game {
  constructor({ canvas, uiRoot, wipeEl, ui, state }) {
    this.canvas = canvas;
    this.state = state;
    this.ui = ui;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.post = new Post(this.renderer);
    this._lowFpsT = 0;
    this.input = new Input(uiRoot);
    this.audio = audio;
    this.transition = new Transition(wipeEl);
    this.scenes = new SceneManager(this);
    this.clock = new THREE.Clock();
    this.width = 1; this.height = 1;
    this.paused = false;
    this.time = 0;
    this.fps = 60; this._fpsAcc = 0; this._fpsN = 0;
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    this.resize();
    // Unlock audio on first gesture
    const unlock = () => { audio.init(); audio.applySettings(this.state.settings.audio); };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
  }

  resize() {
    this.width = window.innerWidth; this.height = window.innerHeight;
    this.renderer.setSize(this.width, this.height, false);
    this.post.setSize(this.width, this.height);
    this.scenes.resize(this.width, this.height);
    // UI scale for small screens
    const s = Math.max(0.85, Math.min(1.15, Math.min(this.width, this.height) / 720));
    document.documentElement.style.setProperty('--ui-scale', s.toFixed(3));
  }

  /** Render a scene through the post stack (or plain when quality is low). */
  renderFrame(scene, camera) { this.post.render(scene, camera); }
  applyGraphicsSetting() {
    const g = this.state.settings.graphics || 'auto';
    if (g === 'high' || g === 'low') { this.post.setQuality(g); return; }
    // auto: start high on fine-pointer devices; drop to low if the frame rate stays under 40 for a few seconds
    if (!this._autoQ) this._autoQ = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ? 'low' : 'high';
    if (this._autoQ === 'high' && this.time > 4) { if (this.fps < 40) { this._lowFpsT += 1 / Math.max(1, this.fps); if (this._lowFpsT > 3) this._autoQ = 'low'; } else this._lowFpsT = Math.max(0, this._lowFpsT - 0.02); }
    this.post.setQuality(this._autoQ);
  }
  start() {
    const loop = () => {
      requestAnimationFrame(loop);
      let dt = Math.min(0.05, this.clock.getDelta());
      this.input.update();
      // fps
      this._fpsAcc += dt; this._fpsN++;
      if (this._fpsAcc >= 0.5) { this.fps = this._fpsN / this._fpsAcc; this._fpsAcc = 0; this._fpsN = 0; }
      if (!this.paused) {
        this.time += dt;
        tweens.update(dt);
        this.scenes.update(dt);
      } else {
        // still let UI tweens run (transition etc.)
        tweens.update(dt);
      }
      this.ui.update(dt);
      this.applyGraphicsSetting();
      this.scenes.render(this.renderer);
      this.input.endFrame();
    };
    requestAnimationFrame(loop);
  }
}
