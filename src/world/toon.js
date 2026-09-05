// Character styling: soft-toon material variants + outlines, with a runtime 'cartoon' | 'classic' toggle.
import * as THREE from 'three';
import { applyCurve, TOON_UNIFORMS } from './curve.js';
import { addOutlines, setOutlinesVisible } from './outline.js';

const variants = new Map(); // base material uuid -> toon clone
const roots = new Set();
let currentStyle = 'cartoon';

/** A fresh (uncached) character material with toon shading + rim. */
export function characterMaterial(opts = {}) {
  const { rim = 0.3, ...rest } = opts;
  const m = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.7, metalness: 0, ...rest });
  applyCurve(m, { rim, toon: true });
  return m;
}

/** Toon-shaded clone of any shared prop material (cached per source material). */
export function toonVariant(material) {
  if (material.userData.toon) return material;
  if (variants.has(material.uuid)) return variants.get(material.uuid);
  const m = material.clone();
  m.onBeforeCompile = undefined; m.customProgramCacheKey = undefined;
  applyCurve(m, { rim: Math.max(material.userData.rim || 0, 0.28), toon: true });
  variants.set(material.uuid, m);
  return m;
}

/** Swap every mesh under root to toon variants and add outline hulls. Safe to call repeatedly. */
export function applyCharacterStyle(root) {
  root.traverse((o) => {
    if (!o.isMesh || o.isSprite || o.userData.outline || o.userData.decal || o.isInstancedMesh) return;
    if (o.material && !o.material.userData.toon) o.material = toonVariant(o.material);
  });
  addOutlines(root);
  setOutlinesVisible(root, currentStyle === 'cartoon');
  roots.add(root);
}
export function releaseCharacterStyle(root) { roots.delete(root); }

/** 'cartoon' (soft toon + outlines) or 'classic' (PBR falloff, no outlines). */
export function setCharacterStyle(style) {
  currentStyle = style === 'classic' ? 'classic' : 'cartoon';
  TOON_UNIFORMS.uToonMix.value = currentStyle === 'cartoon' ? 1 : 0;
  for (const r of roots) setOutlinesVisible(r, currentStyle === 'cartoon');
}
export function getCharacterStyle() { return currentStyle; }
