// Inverted-hull outlines for characters: a back-face copy of each part pushed out along its
// normals by a constant world-space thickness, tinted a darker version of the part's colour.
import * as THREE from 'three';
import { applyCurve, OUTLINE_UNIFORMS } from './curve.js';

export const OUTLINE = { thickness: 0.026, darken: 0.42, minRadius: 0.035 };
const matCache = new Map();

function outlineMaterial(baseColor) {
  const key = baseColor.getHex();
  if (matCache.has(key)) return matCache.get(key);
  const c = baseColor.clone().multiplyScalar(OUTLINE.darken).lerp(new THREE.Color(0x3a2418), 0.35);
  const m = new THREE.MeshBasicMaterial({ color: c, side: THREE.BackSide });
  applyCurve(m, { outline: true });
  matCache.set(key, m);
  return m;
}

/** Add outline hulls to every eligible mesh under root. Idempotent. */
export function addOutlines(root) {
  const list = root.userData.outlines || (root.userData.outlines = []);
  const visible = root.userData.outlinesVisible !== false;
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSprite || o.userData.outline || o.userData.hasOutline || o.userData.noOutline || o.userData.decal) return;
    if (o.material.transparent && o.material.opacity < 0.95) return;
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    if (o.geometry.boundingSphere.radius * Math.max(o.scale.x, o.scale.y, o.scale.z) < OUTLINE.minRadius) return;
    const hull = new THREE.Mesh(o.geometry, outlineMaterial(o.material.color || new THREE.Color(0x888888)));
    hull.userData.outline = true; hull.castShadow = false; hull.receiveShadow = false; hull.renderOrder = -1;
    hull.visible = visible;
    o.add(hull); o.userData.hasOutline = true; list.push(hull);
  });
}
export function setOutlinesVisible(root, v) { root.userData.outlinesVisible = v; for (const h of root.userData.outlines || []) h.visible = v; }
export function setOutlineThickness(t) { OUTLINE_UNIFORMS.uOutline.value = t; }
