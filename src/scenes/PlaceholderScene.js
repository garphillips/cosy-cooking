// Grey-box room used for scenes until their phases are built.
import * as THREE from 'three';
import { WalkScene } from './WalkScene.js';
import { makeGround, makeSignpost, makeFence, collectColliders } from '../world/props.js';
import { audio } from '../engine/Audio.js';

export class PlaceholderScene extends WalkScene {
  constructor(label, color, returnKey) { super(); this.label = label; this.color = color; this.returnKey = returnKey; }
  build() {
    if (this.built) return; this.built = true;
    this.three.background = new THREE.Color(0xcfe3ef);
    this.setupLights({ shadowSize: 16 });
    this.world = new THREE.Group(); this.three.add(this.world);
    this.world.add(makeGround(30, this.color));
    const sign = makeSignpost(`${this.label} — coming soon`); sign.position.set(0, 0, -4); this.world.add(sign);
    for (const [x, z, ax] of [[0, -9, true], [0, 9, true], [-9, 0, false], [9, 0, false]]) { const f = makeFence(18, ax); f.position.set(x, 0, z); this.world.add(f); }
    this.setupCharacters();
    this.player.setColliders(collectColliders(this.world)); this.player.setBounds({ minX: -8, maxX: 8, minZ: -8, maxZ: 8 });
    this.addInteractable({ position: new THREE.Vector3(0, 0, 7.5), radius: 2.5, label: 'Back to the lane', icon: 'leave', onInteract: () => { if (!this.game.scenes.transitioning) { audio.door(); this.game.scenes.go('hub', { from: this.returnKey }); } } });
  }
  enter() {
    super.enter(); this.build(); this.refreshLook(true); this.placePlayer(0, 5, Math.PI);
    this.ui.showHUD({ basket: true, book: true });
  }
  update(dt) { this.updateWalk(dt); }
  openBook() { this.ui.openBook?.(); }
}
