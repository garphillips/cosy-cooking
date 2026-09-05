// Shared material factory. Phase 1-5: flat placeholder look. Phase 6 upgrades makeToyMaterial()
// to the painted-toy PBR look and applies the curved-horizon vertex shader to everything.
import * as THREE from 'three';
import { applyCurve } from './curve.js';

const cache = new Map();

/**
 * makeToyMaterial({ color, roughness, metalness, emissive, flat, transparent, opacity })
 * Returns a shared material for the given options (cached by key) with the world-curve shader applied.
 */
export function makeToyMaterial(opts = {}) {
  const o = { color: 0xcccccc, roughness: 0.62, metalness: 0.0, emissive: 0x000000, emissiveIntensity: 1, flat: false, transparent: false, opacity: 1, side: THREE.FrontSide, noCurve: false, rim: 0.16, map: null, ...opts };
  const key = JSON.stringify(o);
  if (cache.has(key)) return cache.get(key);
  const m = new THREE.MeshStandardMaterial({
    color: o.color, roughness: o.roughness, metalness: o.metalness,
    emissive: o.emissive, emissiveIntensity: o.emissiveIntensity,
    flatShading: o.flat, transparent: o.transparent, opacity: o.opacity, side: o.side, map: o.map || null,
  });
  if (!o.noCurve) applyCurve(m, { rim: o.rim });
  cache.set(key, m);
  return m;
}

/** Uncached variant when you need to animate a material's colour/emissive independently. */
export function makeUniqueMaterial(opts = {}) {
  const { rim = 0, ...rest } = opts;
  const m = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.62, metalness: 0, ...rest });
  applyCurve(m, { rim });
  return m;
}

export const PALETTE = {
  walnut: 0x6b4423, honey: 0xc08a4c, plaster: 0xf6e9cc, sage: 0x82a86c, sageDark: 0x5c7d4a, leaf: 0x5fa04a, grass: 0x86b95c, grassDark: 0x6f9a52,
  tomato: 0xe0603a, terracotta: 0xc86a3c, butter: 0xf6cc4a, sky: 0x9fd0ee, skyDeep: 0x6fb0dc, catGrey: 0x8d93a1, catDark: 0x5f6570, path: 0xd8c39a, stone: 0xb9b1a3,
  skin: [0xfbe3d0, 0xf3cfb0, 0xe8b891, 0xc98f66, 0xa66b44, 0x6e4530], eyes: [0x6b4423, 0x3b6a9a, 0x4a8a5a, 0x7a5aa0, 0x3a3a3a], hairTints: [0xf0d07a, 0xe0b25a, 0xc98f4a, 0x8b5a2b, 0x4a3420, 0xe07a7a, 0x9a7ad8, 0x7ab8d8],
  blonde: 0xf0d07a, cream: 0xfbf3e2, ink: 0x4a3420, water: 0x8fc1d9,
};
