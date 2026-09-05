// Canvas-drawn cartoon faces mapped onto a transparent shell over a character's head.
// Skin shading shows through; only the features are opaque so eyes stay crisp in any light.
import * as THREE from 'three';

const W = 512, H = 384;

export class FaceDecal {
  /**
   * kind: 'gigi' | 'npc' | 'cat'. radius: head radius. eyeColor: hex.
   * The shell covers ~140° horizontally centred on +z; use mesh.rotation.y to face elsewhere.
   */
  constructor({ kind = 'gigi', radius = 0.42, eyeColor = 0x6b4423, blush = 0.55, faceForward = 0 } = {}) {
    this.kind = kind; this.eyeColor = eyeColor; this.blush = blush;
    this.expression = 'neutral'; this.blinkT = 2 + Math.random() * 3; this.blinking = 0; this._dirty = true;
    this.canvas = document.createElement('canvas'); this.canvas.width = W; this.canvas.height = H;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas); this.texture.colorSpace = THREE.SRGBColorSpace; this.texture.anisotropy = 4;
    const phiLen = 2.45, thetaStart = 0.62, thetaLen = 1.7;
    const geo = new THREE.SphereGeometry(radius * 1.012, 32, 24, Math.PI / 2 - phiLen / 2, phiLen, thetaStart, thetaLen);
    const mat = new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.mesh = new THREE.Mesh(geo, mat); this.mesh.userData.decal = true; this.mesh.castShadow = false; this.mesh.receiveShadow = false; this.mesh.renderOrder = 2;
    this.mesh.rotation.y = faceForward;
    this.draw();
  }
  setExpression(e) { if (this.expression !== e) { this.expression = e; this._dirty = true; } }
  setEyeColor(hex) { if (this.eyeColor !== hex) { this.eyeColor = hex; this._dirty = true; } }
  update(dt) {
    this.blinkT -= dt;
    if (this.blinkT <= 0 && !this.blinking) { this.blinking = 0.13; this._dirty = true; }
    if (this.blinking > 0) { this.blinking -= dt; if (this.blinking <= 0) { this.blinking = 0; this.blinkT = 2.2 + Math.random() * 3.5; this._dirty = true; } }
    if (this._dirty) this.draw();
  }
  draw() {
    this._dirty = false;
    const ctx = this.ctx; ctx.clearRect(0, 0, W, H);
    const closed = this.blinking > 0 || this.expression === 'joy';
    if (this.kind === 'cat') this._drawCat(ctx, closed); else this._drawGirl(ctx, closed);
    this.texture.needsUpdate = true;
  }
  _drawGirl(ctx, closed) {
    const ex = 84, ey = 214;            // eye offset from centre, eye row
    const ink = '#3a2418', eyeHex = '#' + this.eyeColor.toString(16).padStart(6, '0');
    const isNpc = this.kind === 'npc';
    const eyeW = isNpc ? 30 : 40, eyeH = this.expression === 'surprised' ? 60 : isNpc ? 38 : 52;
    // blush: soft radial gradient
    for (const s of [-1, 1]) { const g = ctx.createRadialGradient(W / 2 + s * 150, ey + 72, 4, W / 2 + s * 150, ey + 72, 46); g.addColorStop(0, `rgba(240,140,150,${this.blush})`); g.addColorStop(1, 'rgba(240,140,150,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(W / 2 + s * 150, ey + 72, 50, 34, 0, 0, Math.PI * 2); ctx.fill(); }
    for (const s of [-1, 1]) {
      const cx = W / 2 + s * ex, cy = ey;
      if (closed) {
        ctx.strokeStyle = ink; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath();
        if (this.expression === 'joy' || this.expression === 'happy') ctx.arc(cx, cy + 14, eyeW * 0.9, Math.PI * 1.15, Math.PI * 1.85); else ctx.arc(cx, cy - 10, eyeW * 0.9, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
      } else {
        // sclera
        ctx.fillStyle = '#fffaf2'; ctx.beginPath(); ctx.ellipse(cx, cy, eyeW, eyeH, 0, 0, Math.PI * 2); ctx.fill();
        // iris with vertical gradient
        const irisR = eyeW * 0.78; const ig = ctx.createLinearGradient(0, cy - irisR, 0, cy + irisR);
        ig.addColorStop(0, shade(eyeHex, 0.55)); ig.addColorStop(0.55, eyeHex); ig.addColorStop(1, shade(eyeHex, 1.35));
        ctx.fillStyle = ig; ctx.beginPath(); ctx.ellipse(cx, cy + 4, irisR, irisR * 1.15, 0, 0, Math.PI * 2); ctx.fill();
        // pupil
        const pr = this.expression === 'surprised' ? irisR * 0.62 : irisR * 0.48;
        ctx.fillStyle = '#1e1410'; ctx.beginPath(); ctx.ellipse(cx, cy + 6, pr, pr * 1.15, 0, 0, Math.PI * 2); ctx.fill();
        // catchlights
        ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.arc(cx - irisR * 0.35, cy - irisR * 0.35, irisR * 0.32, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + irisR * 0.35, cy + irisR * 0.45, irisR * 0.14, 0, Math.PI * 2); ctx.fill();
        // upper lash line
        ctx.strokeStyle = ink; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.ellipse(cx, cy, eyeW + 1, eyeH + 1, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
        // lower lid hint
        ctx.lineWidth = 3; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.ellipse(cx, cy, eyeW, eyeH, 0, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke(); ctx.globalAlpha = 1;
        // happy: squash bottom of eye upward with a skin-coloured cheek arc
        if (this.expression === 'happy') { ctx.strokeStyle = ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy + eyeH * 0.55, eyeW * 0.9, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
      }
      // brow
      ctx.strokeStyle = shade(eyeHex, 0.7); ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath();
      const browY = cy - eyeH - (this.expression === 'surprised' ? 34 : 22);
      ctx.moveTo(cx - eyeW * 0.9, browY + 6); ctx.quadraticCurveTo(cx, browY - 8, cx + eyeW * 0.9, browY + 4); ctx.stroke();
    }
    // mouth
    const mx = W / 2, my = ey + 96;
    ctx.fillStyle = '#b8443a'; ctx.strokeStyle = ink; ctx.lineWidth = 5;
    if (this.expression === 'surprised') { ctx.beginPath(); ctx.ellipse(mx, my, 16, 20, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    else if (this.expression === 'happy' || this.expression === 'joy') {
      ctx.beginPath(); ctx.moveTo(mx - 34, my - 6); ctx.quadraticCurveTo(mx, my + 44, mx + 34, my - 6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e8828a'; ctx.beginPath(); ctx.ellipse(mx, my + 20, 16, 9, 0, 0, Math.PI * 2); ctx.fill();
    } else { ctx.beginPath(); ctx.moveTo(mx - 20, my - 2); ctx.quadraticCurveTo(mx, my + 18, mx + 20, my - 2); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    // tiny nose
    ctx.strokeStyle = 'rgba(140,80,60,0.6)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(mx, my - 40, 6, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
  }
  _drawCat(ctx, closed) {
    const ex = 70, ey = 200; const ink = '#2a2420'; const eyeHex = '#' + this.eyeColor.toString(16).padStart(6, '0');
    for (const s of [-1, 1]) {
      const cx = W / 2 + s * ex, cy = ey;
      if (closed) { ctx.strokeStyle = ink; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, cy + 10, 34, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); continue; }
      const g = ctx.createRadialGradient(cx, cy - 10, 4, cx, cy, 44); g.addColorStop(0, shade(eyeHex, 1.4)); g.addColorStop(1, shade(eyeHex, 0.75));
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, 40, this.expression === 'surprised' ? 52 : 44, s * 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#141210'; ctx.beginPath(); ctx.ellipse(cx, cy + 2, this.expression === 'surprised' ? 26 : 13, 34, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.arc(cx - 14, cy - 16, 12, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(cx + 14, cy + 14, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(cx, cy, 41, 45, s * 0.15, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    }
    // nose + mouth
    const mx = W / 2, my = ey + 58;
    ctx.fillStyle = '#e88a9a'; ctx.beginPath(); ctx.moveTo(mx - 14, my - 8); ctx.lineTo(mx + 14, my - 8); ctx.lineTo(mx, my + 8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(mx, my + 8); ctx.lineTo(mx, my + 22); ctx.stroke();
    ctx.beginPath(); ctx.arc(mx - 18, my + 22, 18, Math.PI * 0.05, Math.PI * 0.75); ctx.stroke(); ctx.beginPath(); ctx.arc(mx + 18, my + 22, 18, Math.PI * 0.25, Math.PI * 0.95); ctx.stroke();
    if (this.expression === 'happy' || this.expression === 'joy') { ctx.fillStyle = '#b8443a'; ctx.beginPath(); ctx.ellipse(mx, my + 34, 14, 10, 0, 0, Math.PI); ctx.fill(); }
    // blush + whisker dots
    for (const s of [-1, 1]) { const g = ctx.createRadialGradient(W / 2 + s * 140, my + 6, 2, W / 2 + s * 140, my + 6, 36); g.addColorStop(0, 'rgba(240,140,150,0.5)'); g.addColorStop(1, 'rgba(240,140,150,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(W / 2 + s * 140, my + 6, 40, 26, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(60,50,45,0.6)'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(W / 2 + s * (110 + k * 14), my - 4 + (k % 2) * 10, 3, 0, Math.PI * 2); ctx.fill(); } }
  }
}
function shade(hex, f) { const c = new THREE.Color(hex); c.r = Math.min(1, c.r * f); c.g = Math.min(1, c.g * f); c.b = Math.min(1, c.b * f); return '#' + c.getHexString(); }
