// Post-processing: ACES filmic tone mapping, gentle bloom, optional ambient occlusion (GTAO),
// SMAA anti-aliasing. Quality 'high' | 'low' (low = plain render with tone mapping, no passes).
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';

export const POST = { bloomStrength: 0.22, bloomRadius: 0.5, bloomThreshold: 0.82, exposure: 1.0, aoRadius: 0.6, aoIntensity: 0.9 };

export class Post {
  constructor(renderer) {
    this.renderer = renderer;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = POST.exposure;
    this.quality = 'high';
    this.composer = null; this._scene = null; this._camera = null;
    this.size = { w: 1, h: 1 };
  }
  setQuality(q) { if (q === this.quality) return; this.quality = q; this._dispose(); }
  _dispose() { if (this.composer) { this.composer.passes.forEach((p) => p.dispose?.()); this.composer.dispose?.(); this.composer = null; } this._scene = null; }
  _build(scene, camera) {
    this._dispose();
    const r = this.renderer; const { w, h } = this.size;
    const c = new EffectComposer(r); c.setSize(w, h); c.setPixelRatio(r.getPixelRatio());
    this.renderPass = new RenderPass(scene, camera); c.addPass(this.renderPass);
    if (this.quality === 'high' && scene.userData.ao !== false) {
      this.gtao = new GTAOPass(scene, camera, w, h); this.gtao.output = GTAOPass.OUTPUT.Default;
      this.gtao.updateGtaoMaterial({ radius: POST.aoRadius, distanceExponent: 1, thickness: 1, scale: POST.aoIntensity, samples: 12, distanceFallOff: 1, screenSpaceRadius: false });
      this.gtao.blendIntensity = 0.75; c.addPass(this.gtao);
    } else this.gtao = null;
    this.bloom = new UnrealBloomPass(new THREE.Vector2(w, h), POST.bloomStrength, POST.bloomRadius, POST.bloomThreshold); c.addPass(this.bloom);
    c.addPass(new OutputPass());
    this.smaa = new SMAAPass(); c.addPass(this.smaa);
    this.composer = c; this._scene = scene; this._camera = camera;
  }
  setSize(w, h) { this.size = { w, h }; if (this.composer) { this.composer.setSize(w, h); this.gtao?.setSize(w, h); } }
  render(scene, camera) {
    if (this.quality === 'low') { this.renderer.render(scene, camera); return; }
    if (!this.composer || this._scene !== scene || this._camera !== camera) this._build(scene, camera);
    this.composer.render();
  }
}
