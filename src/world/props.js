// Procedural props built from primitives. Phase 1: chunky flat-coloured placeholders with the
// right footprints and colliders. Phase 6 replaces the internals with the painted-toy versions.
import * as THREE from 'three';
import { makeToyMaterial, PALETTE } from './materials.js';
import * as curveMod from './curve.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { groundTexture, tileTexture } from './textures.js';

const geoCache = new Map();
function cachedGeo(key, make) { if (!geoCache.has(key)) geoCache.set(key, make()); return geoCache.get(key); }

export function roundedBoxGeo(w, h, d, r = 0.08, seg = 2) {
  // Painted-toy look: every box gets a soft bevel, clamped so thin slabs stay crisp.
  const rr = Math.min(r, Math.min(w, h, d) * 0.45);
  if (rr < 0.012) return cachedGeo(`b:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d));
  return cachedGeo(`rb:${w}:${h}:${d}:${rr}`, () => new RoundedBoxGeometry(w, h, d, seg, rr));
}
export function box(w, h, d, color, opts = {}) {
  const m = new THREE.Mesh(roundedBoxGeo(w, h, d), makeToyMaterial({ color, ...opts }));
  m.castShadow = true; m.receiveShadow = true; return m;
}
export function sphere(r, color, opts = {}, seg = 16) {
  const m = new THREE.Mesh(cachedGeo(`sp:${r}:${seg}`, () => new THREE.SphereGeometry(r, seg, seg)), makeToyMaterial({ color, ...opts }));
  m.castShadow = true; m.receiveShadow = true; return m;
}
export function cylinder(rt, rb, h, color, opts = {}, seg = 12) {
  const m = new THREE.Mesh(cachedGeo(`cy:${rt}:${rb}:${h}:${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)), makeToyMaterial({ color, ...opts }));
  m.castShadow = true; m.receiveShadow = true; return m;
}
export function cone(r, h, color, opts = {}, seg = 12) {
  const m = new THREE.Mesh(cachedGeo(`co:${r}:${h}:${seg}`, () => new THREE.ConeGeometry(r, h, seg)), makeToyMaterial({ color, ...opts }));
  m.castShadow = true; m.receiveShadow = true; return m;
}
export function capsule(r, len, color, opts = {}) {
  const m = new THREE.Mesh(cachedGeo(`cap:${r}:${len}`, () => new THREE.CapsuleGeometry(r, len, 4, 12)), makeToyMaterial({ color, ...opts }));
  m.castShadow = true; m.receiveShadow = true; return m;
}

/** Flat ground disc/plane. */
export function makeGround(size = 80, color = PALETTE.grass, textured = true) {
  const mat = textured ? new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, map: groundTexture(color, new THREE.Color(color).multiplyScalar(0.86).getHex(), new THREE.Color(color).multiplyScalar(1.12).getHex(), size / 7) }) : makeToyMaterial({ color, roughness: 1 });
  if (textured) { const { applyCurve } = curveMod; applyCurve(mat); }
  const g = new THREE.Mesh(new THREE.PlaneGeometry(size, size, 1, 1), mat);
  g.rotation.x = -Math.PI / 2; g.receiveShadow = true; g.position.y = 0;
  return g;
}

/** A path segment between two points (flat slab just above ground). */
export function makePath(ax, az, bx, bz, width = 2.2, color = PALETTE.path) {
  const len = Math.hypot(bx - ax, bz - az);
  const m = new THREE.Mesh(new THREE.BoxGeometry(width, 0.06, len + width * 0.6), makeToyMaterial({ color, roughness: 1 }));
  m.position.set((ax + bx) / 2, 0.03, (az + bz) / 2);
  m.rotation.y = Math.atan2(bx - ax, bz - az);
  m.receiveShadow = true;
  return m;
}
export function makePlaza(x, z, w, d, color = PALETTE.path) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, map: tileTexture(color, new THREE.Color(color).multiplyScalar(0.8).getHex(), Math.max(2, Math.round(w / 3))) }); curveMod.applyCurve(mat);
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), mat);
  m.position.set(x, 0.03, z); m.receiveShadow = true; return m;
}

export function makeTree(scale = 1, leaf = PALETTE.leaf) {
  const g = new THREE.Group();
  const trunk = cylinder(0.18 * scale, 0.26 * scale, 1.6 * scale, PALETTE.walnut); trunk.position.y = 0.8 * scale; g.add(trunk);
  const dark = new THREE.Color(leaf).multiplyScalar(0.82).getHex(), light = new THREE.Color(leaf).multiplyScalar(1.1).getHex();
  const c1 = sphere(1.1 * scale, leaf); c1.position.y = 2.2 * scale; g.add(c1);
  const c2 = sphere(0.8 * scale, dark); c2.position.set(0.6 * scale, 1.8 * scale, 0.3 * scale); g.add(c2);
  const c3 = sphere(0.75 * scale, dark); c3.position.set(-0.55 * scale, 1.9 * scale, -0.3 * scale); g.add(c3);
  const c4 = sphere(0.6 * scale, light); c4.position.set(0.1 * scale, 2.9 * scale, -0.1 * scale); g.add(c4);
  g.userData.collider = { r: 0.5 * scale };
  return g;
}
export function makeBush(scale = 1, color = PALETTE.sage) {
  const g = new THREE.Group();
  const a = sphere(0.6 * scale, color); a.position.y = 0.5 * scale; g.add(a);
  const b = sphere(0.45 * scale, color); b.position.set(0.45 * scale, 0.4 * scale, 0.1 * scale); g.add(b);
  const c = sphere(0.4 * scale, color); c.position.set(-0.4 * scale, 0.35 * scale, 0.2 * scale); g.add(c);
  g.userData.collider = { r: 0.7 * scale };
  return g;
}
export function makeFlower(color = 0xf0a3c0) {
  const g = new THREE.Group();
  const stem = cylinder(0.02, 0.03, 0.35, PALETTE.leaf); stem.position.y = 0.17; stem.castShadow = false; g.add(stem);
  const head = sphere(0.09, color, {}, 8); head.position.y = 0.38; head.castShadow = false; g.add(head);
  return g;
}
export function makeRock(scale = 1) {
  const r = sphere(0.4 * scale, PALETTE.stone, { flat: true }, 7); r.scale.y = 0.6; r.position.y = 0.2 * scale;
  const g = new THREE.Group(); g.add(r); g.userData.collider = { r: 0.45 * scale }; return g;
}
export function makeFence(len, alongX = true) {
  const g = new THREE.Group();
  const posts = Math.max(2, Math.round(len / 1.6) + 1);
  for (let i = 0; i < posts; i++) {
    const p = box(0.14, 0.9, 0.14, PALETTE.honey); const t = -len / 2 + (i / (posts - 1)) * len;
    p.position.set(alongX ? t : 0, 0.45, alongX ? 0 : t); g.add(p);
  }
  for (const y of [0.35, 0.7]) { const rail = box(alongX ? len : 0.08, 0.08, alongX ? 0.08 : len, PALETTE.honey); rail.position.y = y; g.add(rail); }
  g.userData.collider = alongX ? { hw: len / 2, hd: 0.15 } : { hw: 0.15, hd: len / 2 };
  return g;
}

/** A cottage/shop/restaurant building. Door on +z face at local (0, 0, d/2). */
export function makeBuilding({ w = 6, d = 5, h = 3, wall = PALETTE.plaster, roof = PALETTE.terracotta, door = PALETTE.walnut, sign = null, signColor = PALETTE.sage } = {}) {
  const g = new THREE.Group();
  const body = box(w, h, d, wall); body.position.y = h / 2; g.add(body);
  const roofM = cone(Math.hypot(w, d) / 2 + 0.4, h * 0.6, roof, {}, 4); roofM.rotation.y = Math.PI / 4; roofM.position.y = h + h * 0.3; g.add(roofM);
  const doorM = box(1.1, 1.9, 0.15, door); doorM.position.set(0, 0.95, d / 2 + 0.05); g.add(doorM);
  const knob = sphere(0.06, PALETTE.butter); knob.position.set(0.35, 0.95, d / 2 + 0.15); g.add(knob);
  for (const sx of [-1, 1]) { const win = box(0.9, 0.9, 0.12, PALETTE.sky); win.position.set(sx * (w / 4 + 0.3), 1.6, d / 2 + 0.05); g.add(win); }
  if (sign) {
    const s = box(2.6, 0.7, 0.12, signColor); s.position.set(0, h - 0.5, d / 2 + 0.1); g.add(s);
    const label = makeTextSprite(sign, { color: '#fff', bg: 'transparent', size: 48 }); label.position.set(0, h - 0.5, d / 2 + 0.2); label.scale.set(2.4, 0.6, 1); g.add(label);
  }
  g.userData.collider = { hw: w / 2, hd: d / 2 };
  g.userData.door = new THREE.Vector3(0, 0, d / 2 + 1.0);
  return g;
}

/** Text drawn to a canvas texture on a sprite (for signs / labels). */
export function makeTextSprite(text, { color = '#4a3420', bg = 'rgba(251,243,226,0.95)', size = 40, pad = 20, font = 'bold' } = {}) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = `${font} ${size}px 'Trebuchet MS', sans-serif`;
  const wText = ctx.measureText(text).width;
  c.width = Math.ceil(wText + pad * 2); c.height = size + pad * 1.4;
  ctx.font = `${font} ${size}px 'Trebuchet MS', sans-serif`;
  if (bg !== 'transparent') { ctx.fillStyle = bg; roundRect(ctx, 0, 0, c.width, c.height, 18); ctx.fill(); }
  ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  ctx.fillText(text, c.width / 2, c.height / 2 + 2);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sp = new THREE.Sprite(mat);
  const aspect = c.width / c.height;
  sp.scale.set(aspect, 1, 1);
  sp.userData.aspect = aspect;
  return sp;
}
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

/** Emoji/icon sprite (e.g. "!" hint, hearts, ingredient icons). */
export function makeIconSprite(emoji, size = 96) {
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  ctx.font = `${size * 0.8}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(emoji, size / 2, size / 2 + size * 0.05);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  return sp;
}

/** A wooden signpost with text. */
export function makeSignpost(text) {
  const g = new THREE.Group();
  const post = box(0.12, 1.4, 0.12, PALETTE.walnut); post.position.y = 0.7; g.add(post);
  const label = makeTextSprite(text, { size: 44 }); label.position.y = 1.55; label.scale.multiplyScalar(0.9); g.add(label);
  g.userData.collider = { r: 0.2 };
  return g;
}

/** Simple gate: two posts and a swing panel. */
export function makeGate(width = 2.4) {
  const g = new THREE.Group();
  for (const sx of [-1, 1]) { const p = box(0.2, 1.3, 0.2, PALETTE.walnut); p.position.set(sx * width / 2, 0.65, 0); g.add(p); }
  const panel = new THREE.Group();
  const bar = box(width - 0.4, 0.1, 0.08, PALETTE.honey); bar.position.y = 0.9; panel.add(bar);
  const bar2 = box(width - 0.4, 0.1, 0.08, PALETTE.honey); bar2.position.y = 0.45; panel.add(bar2);
  for (let i = 0; i < 4; i++) { const s = box(0.1, 1.0, 0.06, PALETTE.honey); s.position.set(-width / 2 + 0.5 + i * ((width - 1) / 3), 0.6, 0); panel.add(s); }
  g.add(panel); g.userData.panel = panel;
  return g;
}

/** Instanced flowers/grass tufts scattered in a region, avoiding a list of exclusion circles. */
export function scatterInstanced(count, region, { colors = [0xf0a3c0, 0xf2c94c, 0xfaf6ee, 0xe07090], avoid = [], seed = 1 } = {}) {
  let s = seed; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const geo = new THREE.SphereGeometry(0.055, 6, 6);
  const mat = makeToyMaterial({ color: 0xffffff, roughness: 0.9 });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const dummy = new THREE.Object3D(); const color = new THREE.Color();
  let placed = 0, tries = 0;
  while (placed < count && tries < count * 10) {
    tries++;
    const x = region.x + (rnd() - 0.5) * region.w, z = region.z + (rnd() - 0.5) * region.d;
    if (avoid.some((a) => Math.hypot(a.x - x, a.z - z) < a.r)) continue;
    dummy.position.set(x, 0.12 + rnd() * 0.15, z); dummy.scale.setScalar(0.7 + rnd() * 0.8); dummy.updateMatrix();
    mesh.setMatrixAt(placed, dummy.matrix);
    color.setHex(colors[Math.floor(rnd() * colors.length)]); mesh.setColorAt(placed, color);
    placed++;
  }
  mesh.count = placed; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = false; mesh.receiveShadow = true;
  return mesh;
}

/** Instanced grass tufts (small cones). */
export function grassInstanced(count, region, { avoid = [], seed = 7, color = 0x9ccb6e } = {}) {
  let s = seed; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const geo = new THREE.ConeGeometry(0.06, 0.15, 5);
  const mat = makeToyMaterial({ color, roughness: 1 });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const dummy = new THREE.Object3D();
  let placed = 0, tries = 0;
  while (placed < count && tries < count * 10) {
    tries++;
    const x = region.x + (rnd() - 0.5) * region.w, z = region.z + (rnd() - 0.5) * region.d;
    if (avoid.some((a) => Math.hypot(a.x - x, a.z - z) < a.r)) continue;
    dummy.position.set(x, 0.15, z); dummy.rotation.set((rnd() - 0.5) * 0.4, rnd() * Math.PI, (rnd() - 0.5) * 0.4); dummy.scale.setScalar(0.7 + rnd()); dummy.updateMatrix();
    mesh.setMatrixAt(placed, dummy.matrix); placed++;
  }
  mesh.count = placed; mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = false; mesh.receiveShadow = false;
  return mesh;
}

/** Collect world-space colliders from a group's children that define userData.collider. */
export function collectColliders(root) {
  const out = [];
  root.traverse((o) => {
    const c = o.userData.collider; if (!c) return;
    const p = new THREE.Vector3(); o.getWorldPosition(p);
    if (c.r != null) out.push({ x: p.x, z: p.z, r: c.r });
    else out.push({ x: p.x, z: p.z, hw: c.hw, hd: c.hd });
  });
  return out;
}
