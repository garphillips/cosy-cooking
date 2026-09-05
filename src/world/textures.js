// Procedural canvas textures for a hand-painted feel: blotchy ground, stone tiles, sky gradient.
import * as THREE from 'three';

const cache = new Map();
function canvasTex(key, w, h, draw, { repeat = 1, wrap = true } = {}) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  if (wrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  t.anisotropy = 4;
  cache.set(key, t); return t;
}
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
function seeded(seed) { let s = seed; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }

/** Soft blotches of two greens: reads as painted grass from the game camera. */
export function groundTexture(base = 0x86b95c, blotch = 0x74a84e, light = 0x97c46a, repeat = 12, seed = 3) {
  return canvasTex(`ground:${base}:${blotch}:${seed}`, 256, 256, (ctx, w, h) => {
    const rnd = seeded(seed);
    ctx.fillStyle = hex(base); ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { ctx.fillStyle = hex(i % 3 ? blotch : light); ctx.globalAlpha = 0.35 + rnd() * 0.35; const x = rnd() * w, y = rnd() * h, r = 10 + rnd() * 34; ctx.beginPath(); ctx.ellipse(x, y, r, r * (0.6 + rnd() * 0.5), rnd() * Math.PI, 0, Math.PI * 2); ctx.fill();
      // wrap-around copies so tiles are seamless
      ctx.beginPath(); ctx.ellipse(x - w, y, r, r * 0.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(x, y - h, r, r * 0.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(x + w, y, r, r * 0.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(x, y + h, r, r * 0.8, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
  }, { repeat });
}

/** Stone / terracotta tiles with painted grout. */
export function tileTexture(tile = 0xd8c7a6, grout = 0xb9a887, repeat = 6, seed = 5) {
  return canvasTex(`tile:${tile}:${grout}:${seed}`, 256, 256, (ctx, w, h) => {
    const rnd = seeded(seed);
    ctx.fillStyle = hex(grout); ctx.fillRect(0, 0, w, h);
    const n = 4, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const shade = 0.9 + rnd() * 0.2; const c = new THREE.Color(tile).multiplyScalar(shade); ctx.fillStyle = '#' + c.getHexString(); const pad = 5; rr(ctx, i * s + pad, j * s + pad, s - pad * 2, s - pad * 2, 10); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.ellipse(i * s + s * 0.4, j * s + s * 0.35, s * 0.22, s * 0.12, -0.4, 0, Math.PI * 2); ctx.fill(); }
  }, { repeat });
}

/** Wooden planks. */
export function plankTexture(wood = 0xb9834a, dark = 0x8b5a2b, repeat = 4, seed = 8) {
  return canvasTex(`plank:${wood}:${seed}`, 256, 256, (ctx, w, h) => {
    const rnd = seeded(seed); const n = 5, s = h / n;
    for (let j = 0; j < n; j++) { const c = new THREE.Color(wood).multiplyScalar(0.92 + rnd() * 0.16); ctx.fillStyle = '#' + c.getHexString(); ctx.fillRect(0, j * s, w, s); ctx.fillStyle = hex(dark); ctx.fillRect(0, j * s, w, 3); for (let k = 0; k < 3; k++) { ctx.globalAlpha = 0.18; ctx.fillRect(0, j * s + 8 + rnd() * (s - 12), w, 2); ctx.globalAlpha = 1; } }
  }, { repeat });
}

/** Gradient sky dome (inside-out sphere). Not curved with the world. */
export function makeSkyDome(top = 0x7fb4d4, horizon = 0xd9ecf5, radius = 160) {
  const mid = '#' + new THREE.Color(top).lerp(new THREE.Color(horizon), 0.35).getHexString();
  const tex = canvasTex(`sky:${top}:${horizon}`, 4, 512, (ctx, w, h) => { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, hex(top)); g.addColorStop(0.46, mid); g.addColorStop(0.5, hex(horizon)); g.addColorStop(0.52, hex(horizon)); g.addColorStop(1, hex(horizon)); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }, { wrap: false });
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 16), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }));
  m.renderOrder = -10; m.frustumCulled = false; m.userData.sky = true;
  return m;
}

/** A handful of soft clouds drifting slowly. Returns a group with update(dt). */
export function makeClouds(count = 7, { radius = 60, height = 22, seed = 4 } = {}) {
  const g = new THREE.Group(); const rnd = seeded(seed);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, fog: false, toneMapped: false });
  const geo = new THREE.SphereGeometry(1, 10, 8);
  const clouds = [];
  for (let i = 0; i < count; i++) {
    const c = new THREE.Group(); const n = 3 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) { const m = new THREE.Mesh(geo, mat); const s = 2 + rnd() * 2.5; m.scale.set(s * 1.4, s * 0.7, s); m.position.set((k - n / 2) * s * 1.1, rnd() * 0.8, (rnd() - 0.5) * 1.5); c.add(m); }
    const a = rnd() * Math.PI * 2, r = radius * (0.5 + rnd() * 0.5);
    c.position.set(Math.cos(a) * r, height + rnd() * 8, Math.sin(a) * r); c.userData.speed = 0.6 + rnd() * 0.8; c.userData.a = a; c.userData.r = r;
    g.add(c); clouds.push(c);
  }
  g.userData.update = (dt) => { for (const c of clouds) { c.userData.a += dt * c.userData.speed * 0.01; c.position.x = Math.cos(c.userData.a) * c.userData.r; c.position.z = Math.sin(c.userData.a) * c.userData.r; } };
  return g;
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

/** Tabby stripes for Sprout: grey base with soft darker bands across u. */
export function stripeTexture(base = 0x8d93a1, dark = 0x5f6570, bands = 5) {
  return canvasTex(`stripes:${base}:${dark}:${bands}`, 256, 128, (ctx, w, h) => {
    ctx.fillStyle = hex(base); ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = hex(dark);
    for (let i = 0; i < bands; i++) { const x = (i + 0.5) * (w / bands); ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(x - 9, 0); ctx.quadraticCurveTo(x + 6, h * 0.5, x - 9, h); ctx.lineTo(x + 9, h); ctx.quadraticCurveTo(x + 24, h * 0.5, x + 9, 0); ctx.closePath(); ctx.fill(); }
    ctx.globalAlpha = 1;
    // lighter belly band along the bottom
    const g = ctx.createLinearGradient(0, h * 0.6, 0, h); g.addColorStop(0, 'rgba(230,230,235,0)'); g.addColorStop(1, 'rgba(235,235,240,0.7)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }, { repeat: 1 });
}
