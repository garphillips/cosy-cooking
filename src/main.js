import { Game } from './engine/Game.js';
import { UI } from './ui/UI.js';
import { state } from './game/State.js';
import { TitleScene } from './scenes/TitleScene.js';
import { CreatorScene } from './scenes/CreatorScene.js';
import { HubScene } from './scenes/HubScene.js';
import { GardenScene } from './scenes/GardenScene.js';
import { RestaurantScene } from './scenes/RestaurantScene.js';
import { ShopScene } from './scenes/ShopScene.js';
import { openBook } from './ui/Book.js';
import * as toonMod from './world/toon.js';
import * as curveMod from './world/curve.js';
import * as outlineMod from './world/outline.js';
const { setCharacterStyle } = toonMod;

const canvas = document.getElementById('game');
const uiRoot = document.getElementById('ui');
const wipeEl = document.getElementById('wipe');

const ui = new UI(uiRoot, { state });
const game = new Game({ canvas, uiRoot, wipeEl, ui, state });
ui.attach(game);
ui.applyControlScheme();
ui.openBook = (opts) => openBook(ui, opts);
setCharacterStyle(state.settings.characterStyle || 'cartoon');

game.scenes.register('title', new TitleScene());
game.scenes.register('creator', new CreatorScene('creator'));
game.scenes.register('hub', new HubScene());
game.scenes.register('garden', new GardenScene());
game.scenes.register('restaurant', new RestaurantScene());
game.scenes.register('shop', new ShopScene());
game.scenes.register('wardrobe', new CreatorScene('wardrobe'));

window.__game = game; // handy for debugging in the console
window.__mods = { toon: toonMod, curve: curveMod, outline: outlineMod };
game.scenes.set('title').then(() => game.transition.in(0.8));
game.start();
