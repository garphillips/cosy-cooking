// Builds cosmetic meshes for Gigi's rig sockets and Sprout's collar. Each builder returns a Group.
// Phase 1-5: chunky primitives. Phase 6 refines shapes but keeps the same ids/sockets.
import * as THREE from 'three';
import { box, sphere, cylinder, cone, capsule } from '../props.js';
import { PALETTE } from '../materials.js';
import { makeToyMaterial } from '../materials.js';
import { ITEMS } from '../../data/shop.js';

export const HEAD_R = 0.47;

function torus(r, tube, color, seg = 10, tseg = 20) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, seg, tseg), makeToyMaterial({ color })); m.castShadow = true; return m;
}

// ---------- Hair ----------
export function buildHair(id, hairColor) {
  const g = new THREE.Group();
  const c = hairColor; const hi = new THREE.Color(c).multiplyScalar(1.14).getHex();
  // chunky cap: a little bigger than the head, pulled back so the face stays clear
  const cap = sphere(HEAD_R * 1.08, c); cap.scale.set(1, 0.96, 1.0); cap.position.set(0, 0.09, -0.13); g.add(cap);
  // glossy highlight band near the crown
  const gloss = sphere(HEAD_R * 0.62, hi); gloss.scale.set(1.25, 0.32, 0.9); gloss.position.set(0.08, HEAD_R * 0.78, HEAD_R * 0.2); gloss.castShadow = false; g.add(gloss);
  // fringe: four chunky pointed strands sweeping down over the brow
  // fringe: chunky soft bangs draped over the brow line
  const strands = [[-0.62, 0.38, 0.7, 0.5], [-0.22, 0.44, 0.84, 0.15], [0.2, 0.44, 0.84, -0.15], [0.62, 0.38, 0.7, -0.5]];
  strands.forEach(([x, y, z, rz]) => {
    const st = sphere(0.13, c, {}, 12); st.scale.set(1.0, 1.3, 0.7); st.position.set(x * HEAD_R, y, z * HEAD_R); st.rotation.set(0.25, 0, rz); g.add(st);
  });
  // side locks in front of the ears
  for (const sx of [-1, 1]) { const lock = capsule(0.085, 0.16, c); lock.position.set(sx * HEAD_R * 0.98, -0.08, 0.16); lock.rotation.z = sx * 0.1; g.add(lock); }
  switch (id) {
    case 'hair_bun': { const bun = sphere(0.22, c); bun.position.set(0, HEAD_R + 0.1, -0.16); bun.userData.topStrand = true; g.add(bun); const bunHi = sphere(0.1, hi); bunHi.scale.set(1.2, 0.5, 0.8); bunHi.position.set(0.04, HEAD_R + 0.27, -0.1); bunHi.userData.topStrand = true; g.add(bunHi); break; }
    case 'hair_ponytail': { const p = capsule(0.13, 0.4, c); p.position.set(0, 0.0, -HEAD_R - 0.1); p.rotation.x = 0.55; g.add(p); const tip = cone(0.1, 0.2, c); tip.position.set(0, -0.32, -HEAD_R - 0.28); tip.rotation.x = Math.PI + 0.5; g.add(tip); const band = torus(0.13, 0.035, 0xd9603a); band.position.set(0, 0.22, -HEAD_R - 0.02); band.rotation.x = 1.1; g.add(band); break; }
    case 'hair_braids': { for (const sx of [-1, 1]) { const b = capsule(0.1, 0.46, c); b.position.set(sx * (HEAD_R + 0.04), -0.34, 0.06); g.add(b); for (let k = 0; k < 3; k++) { const bead = sphere(0.1, c); bead.position.set(sx * (HEAD_R + 0.04) + sx * 0.02 * (k % 2), -0.2 - k * 0.15, 0.06); g.add(bead); } const tie = torus(0.1, 0.03, 0xd9603a); tie.position.set(sx * (HEAD_R + 0.04), -0.58, 0.06); tie.rotation.x = Math.PI / 2; g.add(tie); const tip = cone(0.07, 0.14, c); tip.position.set(sx * (HEAD_R + 0.04), -0.7, 0.06); tip.rotation.x = Math.PI; g.add(tip); } break; }
    case 'hair_bob': { const b = sphere(HEAD_R * 1.12, c); b.scale.set(1, 0.92, 0.95); b.position.set(0, -0.1, -0.16); g.add(b); for (const sx of [-1, 1]) { const flick = cone(0.11, 0.2, c); flick.position.set(sx * HEAD_R * 1.02, -0.42, 0.1); flick.rotation.set(0.3, 0, sx * 2.6); g.add(flick); } break; }
    case 'hair_long': { const b = sphere(HEAD_R * 1.12, c); b.scale.set(1, 0.92, 0.95); b.position.set(0, -0.1, -0.16); g.add(b); const back = capsule(0.34, 0.5, c); back.scale.set(1, 1, 0.55); back.position.set(0, -0.62, -0.28); g.add(back); const tipL = cone(0.12, 0.22, c); tipL.position.set(-0.22, -1.0, -0.28); tipL.rotation.x = Math.PI; g.add(tipL); const tipR = cone(0.12, 0.22, c); tipR.position.set(0.22, -1.0, -0.28); tipR.rotation.x = Math.PI; g.add(tipR); break; }
    case 'hair_curls': { for (let i = 0; i < 11; i++) { const a = (i / 11) * Math.PI * 2; const r = HEAD_R * (0.98 + (i % 2) * 0.12); const s = sphere(0.16, i % 3 === 0 ? hi : c, {}, 10); s.position.set(Math.cos(a) * r, 0.14 + Math.sin(i * 1.7) * 0.08, Math.sin(a) * r - 0.04); s.userData.topStrand = false; g.add(s); } break; }
  }
  return g;
}

// ---------- Headwear ----------
export function buildHat(id) {
  const g = new THREE.Group();
  const it = ITEMS[id]; if (!it || id === 'hat_none') return g;
  const c = it.color || 0xffffff;
  switch (id) {
    case 'hat_scarf_yellow': {
      // band sits on the crown, front raised over the fringe like the reference
      const band = torus(HEAD_R * 1.16, 0.08, c, 8, 32); band.rotation.x = Math.PI / 2 - 0.35; band.position.set(0, 0.28, -0.1); g.add(band);
      // polka dots live in the band's own frame so they follow its tilt
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + 0.26; const d = sphere(0.03, 0xfaf6ee, {}, 6); d.position.set(Math.cos(a) * HEAD_R * 1.16, Math.sin(a) * HEAD_R * 1.16, 0.055); d.userData.noOutline = true; band.add(d); }
      const knot = sphere(0.09, c); knot.position.set(0.3, HEAD_R * 1.0, 0.16); g.add(knot);
      for (const s of [-1, 1]) { const ear = cone(0.08, 0.28, c); ear.position.set(0.3 + s * 0.13, HEAD_R * 1.0 + 0.1, 0.16); ear.rotation.z = s * 1.1; g.add(ear); }
      break;
    }
    case 'hat_straw': { const brim = cylinder(0.75, 0.75, 0.05, c); brim.position.y = 0.28; g.add(brim); const top = cylinder(0.36, 0.4, 0.28, c); top.position.y = 0.42; g.add(top); const rib = torus(0.4, 0.03, 0xd9603a); rib.rotation.x = Math.PI / 2; rib.position.y = 0.3; g.add(rib); break; }
    case 'hat_beret': { const b = sphere(0.44, c); b.scale.set(1.1, 0.5, 1.1); b.position.set(0.06, 0.34, -0.04); g.add(b); const nub = sphere(0.05, c); nub.position.set(0.06, 0.58, -0.04); g.add(nub); break; }
    case 'hat_flowers': { const ring = torus(HEAD_R * 0.95, 0.04, PALETTE.leaf, 8, 24); ring.rotation.x = Math.PI / 2; ring.position.y = 0.3; g.add(ring); const cols = [0xf0a3c0, 0xf2c94c, 0xfaf6ee, 0xe07090, 0xa9d3e6]; for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; const f = sphere(0.07, cols[i % cols.length], {}, 8); f.position.set(Math.cos(a) * HEAD_R * 0.95, 0.32, Math.sin(a) * HEAD_R * 0.95); g.add(f); } break; }
    case 'hat_beanie': { const b = sphere(HEAD_R * 1.08, c); b.scale.set(1, 0.8, 1); b.position.y = 0.16; g.add(b); const pom = sphere(0.12, 0xfaf6ee); pom.position.y = 0.62; g.add(pom); const rim = torus(HEAD_R * 1.06, 0.06, c, 8, 24); rim.rotation.x = Math.PI / 2; rim.position.y = 0.1; g.add(rim); break; }
    case 'hat_chef': { const base = cylinder(0.36, 0.38, 0.22, c); base.position.y = 0.42; g.add(base); const puff = sphere(0.42, c); puff.scale.set(1, 0.7, 1); puff.position.y = 0.66; g.add(puff); break; }
    case 'hat_bunny': { for (const s of [-1, 1]) { const ear = capsule(0.09, 0.45, c); ear.position.set(s * 0.18, 0.72, -0.05); ear.rotation.z = s * -0.15; g.add(ear); const inner = capsule(0.05, 0.35, 0xf0a3c0); inner.position.set(s * 0.18, 0.72, 0.0); inner.rotation.z = s * -0.15; g.add(inner); } const band = torus(HEAD_R * 0.98, 0.03, c, 8, 24); band.rotation.x = Math.PI / 2; band.position.y = 0.3; g.add(band); break; }
    case 'hat_witch': { const brim = cylinder(0.7, 0.7, 0.05, c); brim.position.y = 0.3; g.add(brim); const top = cone(0.36, 0.8, c); top.position.y = 0.7; top.rotation.z = 0.15; g.add(top); const band = torus(0.34, 0.04, 0xf2c94c); band.rotation.x = Math.PI / 2; band.position.y = 0.36; g.add(band); break; }
  }
  return g;
}

// ---------- Tops (return { torso group, sleeves }) ----------
export function buildTop(id) {
  const it = ITEMS[id] || ITEMS.top_blouse;
  const c = it.color || 0xf6efe2;
  const g = new THREE.Group();
  const torso = capsule(0.3, 0.32, c); torso.position.y = 0.0; g.add(torso);
  if (it.accent) {
    if (id === 'top_stripes') for (let i = 0; i < 3; i++) { const s = torus(0.305, 0.03, it.accent, 6, 20); s.rotation.x = Math.PI / 2; s.position.y = -0.15 + i * 0.15; g.add(s); }
    if (id === 'top_sailor') { const collar = box(0.5, 0.05, 0.2, it.accent); collar.position.set(0, 0.28, -0.12); g.add(collar); const bow = sphere(0.06, 0xd9603a); bow.position.set(0, 0.22, 0.28); g.add(bow); }
    if (id === 'top_floral') for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const f = sphere(0.04, it.accent, {}, 6); f.position.set(Math.cos(a) * 0.3, -0.1 + (i % 2) * 0.2, Math.sin(a) * 0.3); g.add(f); }
  }
  if (id === 'top_hoodie') { const hood = sphere(0.24, c); hood.scale.set(1, 0.6, 0.8); hood.position.set(0, 0.28, -0.22); g.add(hood); }
  if (id === 'top_cardigan') for (let i = 0; i < 3; i++) { const b = sphere(0.03, 0x4a3420, {}, 6); b.position.set(0, 0.1 - i * 0.12, 0.31); g.add(b); }
  g.userData.sleeveColor = c;
  return g;
}

// ---------- Bottoms ----------
export function buildBottom(id) {
  const it = ITEMS[id] || ITEMS.bot_green_apron;
  const c = it.color || 0x5c7d4a;
  const g = new THREE.Group();
  const isDress = id.includes('dress') || id === 'bot_green_apron' || id === 'bot_sunflower' || id === 'bot_strawberry';
  if (id === 'bot_shorts_blue') {
    for (const s of [-1, 1]) { const leg = cylinder(0.12, 0.13, 0.22, c); leg.position.set(s * 0.13, -0.1, 0); g.add(leg); }
    const waist = cylinder(0.3, 0.27, 0.12, c); waist.position.y = 0.06; g.add(waist);
  } else if (id === 'bot_dungarees') {
    for (const s of [-1, 1]) { const leg = cylinder(0.13, 0.14, 0.42, c); leg.position.set(s * 0.13, -0.2, 0); g.add(leg); }
    const waist = cylinder(0.31, 0.28, 0.14, c); waist.position.y = 0.06; g.add(waist);
    const bib = box(0.3, 0.32, 0.08, c); bib.position.set(0, 0.34, 0.27); g.add(bib);
    for (const s of [-1, 1]) { const strap = box(0.06, 0.4, 0.04, c); strap.position.set(s * 0.12, 0.5, 0.2); strap.rotation.x = -0.5; g.add(strap); }
  } else if (id === 'bot_skirt_brown' || id === 'bot_tartan') {
    const sk = cone(0.42, 0.42, c); sk.position.y = -0.05; g.add(sk);
    if (id === 'bot_tartan') for (let i = 0; i < 2; i++) { const s = torus(0.25 + i * 0.1, 0.02, 0xf2c94c, 6, 20); s.rotation.x = Math.PI / 2; s.position.y = 0.05 - i * 0.12; g.add(s); }
  } else if (isDress) {
    const sk = cone(0.46, 0.5, c); sk.position.y = -0.08; g.add(sk);
    if (id === 'bot_green_apron') {
      const bib = box(0.34, 0.36, 0.06, c); bib.position.set(0, 0.36, 0.28); g.add(bib);
      const leaf = sphere(0.05, PALETTE.leaf, {}, 6); leaf.scale.set(0.7, 1.2, 0.5); leaf.position.set(0, 0.36, 0.32); g.add(leaf);
      for (const s of [-1, 1]) { const strap = box(0.06, 0.38, 0.04, c); strap.position.set(s * 0.13, 0.52, 0.2); strap.rotation.x = -0.45; g.add(strap); }
    }
    if (id === 'bot_sunflower') for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const f = sphere(0.05, 0x8b5a2b, {}, 6); f.position.set(Math.cos(a) * 0.36, -0.15, Math.sin(a) * 0.36); g.add(f); }
    if (id === 'bot_strawberry') for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; const f = sphere(0.04, 0xfaf6ee, {}, 6); f.position.set(Math.cos(a) * 0.34, -0.1 - (i % 2) * 0.12, Math.sin(a) * 0.34); g.add(f); }
  }
  return g;
}

// ---------- Shoes ----------
export function buildShoe(id) {
  const it = ITEMS[id] || ITEMS.shoe_boots;
  const c = it.color || 0x6b4423;
  const g = new THREE.Group();
  const foot = box(0.17, 0.12, 0.26, c); foot.position.set(0, 0.06, 0.03); g.add(foot);
  if (id === 'shoe_boots' || id === 'shoe_wellies') { const shaft = cylinder(0.1, 0.11, 0.2, c); shaft.position.set(0, 0.2, -0.02); g.add(shaft); }
  if (id === 'shoe_cat') { for (const s of [-1, 1]) { const ear = cone(0.03, 0.06, c); ear.position.set(s * 0.05, 0.15, 0.1); g.add(ear); } }
  if (id === 'shoe_maryjanes') { const strap = box(0.18, 0.03, 0.03, c); strap.position.set(0, 0.13, 0.0); g.add(strap); }
  return g;
}

// ---------- Accessories ----------
export function buildAccessory(id) {
  const g = new THREE.Group(); g.userData.anchor = 'face';
  const it = ITEMS[id]; if (!it || id === 'acc_none') return g;
  const c = it.color || 0x4a3420;
  switch (id) {
    case 'acc_glasses': case 'acc_round_glasses': {
      for (const s of [-1, 1]) { const rim = torus(0.1, 0.018, c, 6, 16); rim.position.set(s * 0.15, 0.02, HEAD_R + 0.02); g.add(rim); }
      const bridge = box(0.1, 0.02, 0.02, c); bridge.position.set(0, 0.02, HEAD_R + 0.02); g.add(bridge); break;
    }
    case 'acc_flower': { g.userData.anchor = 'head'; const f = sphere(0.1, c); f.position.set(HEAD_R * 0.8, 0.22, 0.2); g.add(f); const mid = sphere(0.04, 0x8b5a2b, {}, 6); mid.position.set(HEAD_R * 0.86, 0.22, 0.26); g.add(mid); break; }
    case 'acc_ribbon': { g.userData.anchor = 'head'; for (const s of [-1, 1]) { const b = sphere(0.09, c); b.scale.set(1.3, 0.8, 0.6); b.position.set(-HEAD_R * 0.7 + s * 0.1, 0.3, 0.1); g.add(b); } break; }
    case 'acc_satchel': case 'acc_basket_bag': case 'acc_teacup': {
      g.userData.anchor = 'body';
      const strap = torus(0.36, 0.02, 0x4a3420, 6, 20); strap.rotation.set(0.3, 0, 0.9); strap.position.y = 0.1; g.add(strap);
      const bag = id === 'acc_teacup' ? cylinder(0.12, 0.09, 0.16, c) : box(0.22, 0.18, 0.1, c); bag.position.set(0.3, -0.25, 0.05); g.add(bag);
      if (id === 'acc_teacup') { const handle = torus(0.06, 0.015, c, 6, 12); handle.position.set(0.44, -0.25, 0.05); g.add(handle); }
      break;
    }
    case 'acc_scarf': { g.userData.anchor = 'neck'; const ring = torus(0.24, 0.08, c, 8, 20); ring.rotation.x = Math.PI / 2; g.add(ring); const tail = box(0.12, 0.35, 0.06, c); tail.position.set(0.12, -0.2, 0.22); g.add(tail); break; }
    case 'acc_wings': { g.userData.anchor = 'back'; for (const s of [-1, 1]) { const w = sphere(0.28, c, { transparent: true, opacity: 0.85 }); w.scale.set(1.2, 1.5, 0.15); w.position.set(s * 0.32, 0.1, -0.2); w.rotation.z = s * -0.4; g.add(w); const w2 = sphere(0.18, 0xf0a3c0, { transparent: true, opacity: 0.85 }); w2.scale.set(1.1, 1.2, 0.15); w2.position.set(s * 0.3, -0.25, -0.2); g.add(w2); } break; }
  }
  return g;
}

// ---------- Sprout's collar ----------
export function buildCatCollar(id) {
  const it = ITEMS[id] || ITEMS.cat_green;
  const c = it.color || 0x5c7d4a;
  const g = new THREE.Group();
  if (id === 'cat_green' || id === 'cat_gingham') {
    const ring = torus(0.2, 0.06, c, 8, 20); ring.rotation.x = Math.PI / 2; g.add(ring);
    const knot = sphere(0.06, c); knot.position.set(0, -0.1, 0.2); g.add(knot);
    const tail = box(0.09, 0.2, 0.05, c); tail.position.set(0.05, -0.22, 0.22); tail.rotation.z = -0.3; g.add(tail);
  } else {
    const ring = torus(0.2, 0.035, c, 8, 20); ring.rotation.x = Math.PI / 2; g.add(ring);
    if (id === 'cat_bell') { const bell = sphere(0.05, 0xf2c94c, { metalness: 0.4, roughness: 0.4 }); bell.position.set(0, -0.06, 0.2); g.add(bell); }
    if (id === 'cat_bowtie') { for (const s of [-1, 1]) { const b = sphere(0.06, c); b.scale.set(1.3, 0.8, 0.6); b.position.set(s * 0.07, -0.02, 0.2); g.add(b); } }
    if (id === 'cat_hat') { const brim = cylinder(0.2, 0.2, 0.03, c); brim.position.set(0, 0.6, 0); g.add(brim); const top = cylinder(0.12, 0.12, 0.2, c); top.position.set(0, 0.72, 0); g.add(top); g.userData.hat = true; }
  }
  return g;
}
