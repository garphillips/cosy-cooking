// Shared scaffolding for scenes where Gigi walks around with Sprout following:
// characters, player controller, follow camera, HUD, pause, sun tracking.
import * as THREE from 'three';
import { BaseScene } from './BaseScene.js';
import { Gigi } from '../world/characters/Gigi.js';
import { Sprout } from '../world/characters/Sprout.js';
import { Player } from '../world/Player.js';
import { FollowCamera } from '../engine/FollowCamera.js';
import { audio } from '../engine/Audio.js';
import { juice } from '../engine/Tween.js';

export class WalkScene extends BaseScene {
  setupCharacters(camOpts) {
    this.gigi = new Gigi(); this.three.add(this.gigi.root);
    this.sprout = new Sprout(); this.three.add(this.sprout.root);
    this.player = new Player(this.gigi);
    this.player.onStep = () => audio.step();
    this.follow = new FollowCamera(this.camera, camOpts);
    this.petInteractable = this.addInteractable({ position: this.sprout.root.position, radius: 1.5, priority: -1, label: 'Pet Sprout', icon: 'pet', onInteract: () => this.petSprout() });
  }
  petSprout() {
    audio.purr(); this.sprout.react('💛'); juice.squash(this.sprout.body, 0.15);
    this.gigi.setExpression('happy'); setTimeout(() => this.gigi.setExpression('neutral'), 1200);
  }
  /** Refresh outfit/collar/basket from state. Call in enter(). */
  refreshLook(basket = true) {
    this.gigi.applyOutfit(this.state.game.equipped, this.state.game.look);
    this.gigi.setBasket(basket, this.state.inventory.length / this.state.game.basketCapacity);
    this.sprout.setCollar(this.state.game.equipped.cat);
  }
  placePlayer(x, z, facing) {
    this.player.teleport(x, z, facing);
    this.sprout.snapTo(this.player.position, facing);
    this.follow.snap(this.player.position);
  }
  /** Standard per-frame walk update. Returns false if a transition is in progress. */
  updateWalk(dt) {
    if (this.game.scenes.transitioning) { this.gigi.update(dt, { moving: 0 }); return false; }
    this.player.frozen = this.input.locked || this.frozen;
    this.player.update(dt, this.input, this.follow.yaw);
    this.sprout.update(dt, this.player.position, this.player.moving, this.player.facing);
    this.follow.update(dt, this.player.position, this.player.vel);
    if (this.sun) { const p = this.player.position; this.sun.position.set(p.x + this.sunOffset.x, this.sunOffset.y, p.z + this.sunOffset.z); this.sun.target.position.copy(p); }
    if (this.petInteractable) this.petInteractable.position = this.sprout.root.position;
    this.updateInteractables(dt, this.player.position, this.input.locked || this.frozen);
    if (this.input.pausePressed && !this.ui.modals.length) this.ui.pauseMenu();
    if (this.input.menuPressed && !this.ui.modals.length) this.openBook?.();
    return true;
  }
  get sunOffset() { return this._sunOffset || (this._sunOffset = new THREE.Vector3(14, 26, 10)); }
}
