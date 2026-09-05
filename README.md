# Cosy Cooking

A gentle, browser-based cooking-and-gathering game. **Gigi** and her grey tabby **Sprout** gather ingredients in the garden, cook them for the regulars at **The Little Sprout**, earn **Cosy Points**, and spend them at the village dress-up shop. No failure state, no timers that punish, nothing to lose.

Built with [Three.js](https://threejs.org/) and vanilla JavaScript. Every 3D asset is procedural (primitives + canvas textures); every sound is synthesised with the Web Audio API. There are **no external asset files**.

## Play it

The built game is a single file: `dist/index.html`. Double-click it (it runs from `file://`) or host it on any static server. Fonts (Borel for the logo, Sono for display text, Nunito for body text; all SIL Open Font License) are bundled into the build, so it makes no third-party requests.

## Develop

```bash
npm install
npm run dev        # http://localhost:5179
npm run build      # writes dist/index.html (everything inlined)
```

Requires Node 18+ (tested on Node 20). The Vite dev server hot-reloads.

## Controls

| Action | Keyboard / mouse | Gamepad | Touch |
| --- | --- | --- | --- |
| Move | WASD / arrows | Left stick / d-pad | Virtual stick |
| Interact / tap | E, Space, Enter, or click | A | ✋ button or tap the screen |
| Sprint | Shift | X / bumpers | 💨 button |
| Circular motions (peel, whisk, stir) | Drag the mouse in circles (or hold E for a steady fallback) | Spin the left stick | Drag a finger in circles |
| Heat dial | ◀ ▶ or E to cycle | Stick left/right or A | On-screen flame buttons |
| Recipe book / basket | Tab or I, or the 📖 button | Y | 📖 button |
| Pause | Esc or ⏸ | Start | ⏸ button |
| Menus | Arrow keys + Enter | Stick + A / B | Tap |

## Project layout

```
index.html                 shell (canvas + UI root + wipe layer)
src/main.js                boots the Game, registers scenes
src/engine/                Game loop, SceneManager, Input, Tween/juice, Audio synth, Save, Transition, FollowCamera, Post (bloom/ACES/AO)
src/game/State.js          the save-game model: CP, inventory, owned items, recipes, friendship, day
src/game/minigames.js      the eight cooking micro-games (chop, peel, whisk, pour, season, stir, heat, flip)
src/data/                  ALL balancing data (see below)
src/world/                 materials.js (makeToyMaterial), curve.js (curved-horizon + toon/outline shader patches), toon.js, outline.js, faces.js, props.js, textures.js
src/world/characters/      Gigi (modular rig with sockets), Sprout, Customer, cosmetics builders
src/scenes/                Title, Creator/Wardrobe, Hub, Garden (+meadow), Restaurant, Shop
src/ui/                    UI.js (HUD, prompt, toasts, modals, pause, gamepad menu nav), Book.js, DressUp.js
reference/                 mood/palette reference image
```

## Adding content

### A new ingredient
Add an entry to `src/data/ingredients.js` (name, category, rarity, icon, `method` = pick | pull | shake | forage, value, colour). Then add it to a spawn point's `pool` in `src/data/spawns.js` (or add a new spawn point with `{ x, z, kind, pool }`). The garden scene builds a placeholder plant from the ingredient's colour and method automatically; special visuals live in `GardenScene._buildNodeVisual`.

### A new recipe
Add an entry to `src/data/recipes.js`:

```js
plum_tart: { name: 'Plum Tart', icon: '🥧', price: 140, known: false,
  ingredients: ['plum', 'wheat', 'egg'],       // multiset; order = which ingredient each prep step shows
  steps: ['chop', 'whisk'],                     // 2–4 prep micro-games
  cook: 'heat', heat: 'medium',                 // 'stir' | 'heat' | 'flip', and the heat band hint
  tags: ['sweet', 'warm', 'fruit'],             // used for vague customer hints (see HINTS)
  desc: 'Sticky and sharp.' },
```

Unknown recipes are discovered by Freestyle (any matching multiset) or by a recipe card in the shop (`ITEMS.recipe_*` with `recipe: 'plum_tart'`).

### A new shop item
Add to `src/data/shop.js`. Cosmetics need a `slot` (hair | hat | top | bottom | shoes | accessory | cat) and a builder case in `src/world/characters/cosmetics.js` (fall-through defaults exist for tops, bottoms and shoes by colour). Upgrades use `effect: { basket: 25 }` or `{ tables: 4 }`; decor uses `decor: 'pot' | 'curtains' | 'tablecloth' | 'wallart' | 'chalkboard'` and is applied in `RestaurantScene._applyDecor`.

### A new regular
Add to `src/data/regulars.js` and a headgear case in `Customer._build`.

## Character style

Characters use a soft-toon shading patch, inverted-hull outlines and canvas-drawn faces. Switch between **Cartoon** and **Classic** in the pause menu; the choice is saved with the device settings. See DESIGN.md for the tunables.

## Saving

Progress is saved to `localStorage` after every meaningful action (`cosy-cooking.save.v1`). Device settings (volume, controls, accessibility, graphics) live in a separate key so "Reset save" keeps them. "Continue" resumes in the village lane where you left it.

## Performance

Auto graphics quality starts "Fancy" (bloom, GTAO, SMAA, soft shadows) on fine-pointer devices and "Simple" on touch devices; it drops to Simple automatically if the frame rate stays under 40 fps. Grass and flowers are instanced; materials are cached and shared. Target: 60 fps on integrated laptop GPUs and recent phones.
