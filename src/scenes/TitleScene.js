import * as THREE from 'three';
import { BaseScene } from './BaseScene.js';
import { Gigi } from '../world/characters/Gigi.js';
import { Sprout } from '../world/characters/Sprout.js';
import { makeGround, makeTree, makeBush, scatterInstanced } from '../world/props.js';
import { el } from '../ui/UI.js';
import { audio } from '../engine/Audio.js';
import { makeSkyDome, makeClouds } from '../world/textures.js';
import { PALETTE } from '../world/materials.js';

export class TitleScene extends BaseScene {
  touchControls = false; // tap-driven menu scene: no virtual stick/buttons
  constructor() { super(); this.curve = { curvature: 0.004, start: 4 }; }
  build() {
    if (this.built) return; this.built = true;
    this.three.background = new THREE.Color(PALETTE.sky);
    this.setupLights({ shadowSize: 12, pos: [6, 10, 6] });
    this.diorama = new THREE.Group(); this.three.add(this.diorama);
    this.sky = makeSkyDome(0x3f8fd0, 0xa8d4ee); this.three.add(this.sky);
    this.clouds = makeClouds(8, { radius: 70, height: 26 }); this.three.add(this.clouds);
    const ground = new THREE.Mesh(new THREE.CylinderGeometry(6, 6.5, 0.6, 32), makeGround(1).material); ground.position.y = -0.3; ground.receiveShadow = true; this.diorama.add(ground);
    this.gigi = new Gigi(); this.gigi.root.position.set(-0.6, 0, 0.4); this.gigi.root.rotation.y = 0.4; this.diorama.add(this.gigi.root);
    this.sprout = new Sprout(); this.sprout.root.position.set(0.9, 0, 0.6); this.sprout.facing = 0.2; this.sprout.state = 'sit'; this.diorama.add(this.sprout.root);
    const t1 = makeTree(1.1); t1.position.set(-3, 0, -2.5); this.diorama.add(t1);
    const t2 = makeTree(0.9); t2.position.set(3.2, 0, -2); this.diorama.add(t2);
    const b1 = makeBush(0.8); b1.position.set(2.5, 0, 1.5); this.diorama.add(b1);
    const b2 = makeBush(0.7); b2.position.set(-2.8, 0, 1.2); this.diorama.add(b2);
    this.diorama.add(scatterInstanced(60, { x: 0, z: 0, w: 9, d: 9 }, { avoid: [{ x: -0.6, z: 0.4, r: 1 }, { x: 0.9, z: 0.6, r: 1 }] }));
    this.camera.position.set(0, 4.6, 12.5); this.camera.lookAt(0, 1.0, 0);
  }
  enter() {
    super.enter(); this.build();
    this.gigi.applyOutfit(this.state.game.equipped, this.state.game.look);
    this.sprout.setCollar(this.state.game.equipped.cat);
    audio.stopAmbience(); audio.startMusic();
    const wrap = el('div', 'title-screen');
    const hasSave = this.state.hasSave();
    wrap.innerHTML = `<div class="logo"><h1>Cosy Cooking</h1><p>with Gigi &amp; Sprout</p></div>`;
    const menu = el('div', 'menu');
    if (hasSave) {
      const cont = el('button', 'btn', 'Continue'); cont.onclick = () => { audio.init(); audio.click(); this.state.load(); this.game.scenes.go(this.state.game.created ? 'hub' : 'creator'); }; menu.appendChild(cont);
    }
    const play = el('button', `btn ${hasSave ? 'secondary' : ''}`, hasSave ? 'New Game' : 'Play');
    play.onclick = async () => {
      audio.init(); audio.click();
      if (hasSave) { const ok = await this.ui.confirm('Start a new game? Your current save will be replaced.', { ok: 'New game', cancel: 'Back', danger: true }); if (!ok) return; this.state.reset(); }
      else this.state.reset();
      this.game.scenes.go('creator');
    };
    menu.appendChild(play);
    const vol = el('button', 'btn ghost small', this.state.settings.audio.muted ? '🔇 Sound off' : '🔊 Sound on');
    vol.onclick = () => { audio.init(); const m = audio.toggleMute(); this.state.settings.audio.muted = m; this.state.saveSettings(); vol.textContent = m ? '🔇 Sound off' : '🔊 Sound on'; };
    menu.appendChild(vol);
    const spacer = el('div', 'spacer'); wrap.appendChild(spacer);
    const bottom = el('div', 'bottom'); wrap.appendChild(bottom);
    bottom.appendChild(menu);
    const sch = this.game.input.scheme; const hint = el('p', 'tiny', sch === 'touch' ? 'Drag the stick to move · ✋ to interact · 💨 to hurry' : sch === 'gamepad' ? 'Left stick to move · A to interact · X to sprint · Start to pause' : 'Move: WASD / arrows · Interact: E / Space · Sprint: Shift · Esc: pause');
    hint.style.cssText = 'color:#fff;text-shadow:0 2px 0 rgba(0,0,0,0.3);margin:0';
    bottom.appendChild(hint);
    this.ui.mount(wrap);
  }
  update(dt) {
    this.clouds.userData.update(dt);
    this.diorama.rotation.y += dt * 0.15;
    this.gigi.update(dt, { moving: 0 });
    this.sprout.t += dt; this.sprout.tail.rotation.x = Math.sin(this.sprout.t * 3) * 0.35;
    this.sprout.body.rotation.z = 0.55; this.sprout.legs[2].rotation.z = 1.4; this.sprout.legs[3].rotation.z = 1.4;
  }
}
