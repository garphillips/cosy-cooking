# Cosy Cooking — design notes & tunables

## Loop
Gather (garden / meadow) → carry → cook & serve (The Little Sprout) → Cosy Points → dress-up shop → repeat. CP are only ever created when a customer pays; the coin pouch animation is the payment.

## Economy (src/data/economy.js)
| Tunable | Value | Why |
| --- | --- | --- |
| startingBasket | 8 | Two full recipes per trip early on |
| tipMax | 0.60 | Tip = price × 0.6 × quality |
| hintTipScale | 0.85 | Vague-hint match pays a slightly smaller tip |
| specialPriceScale | 0.85 | Counter specials sell for 85% price (tip unaffected) |
| firstTimeBonus | 25 | Novelty reward; nudges players to try recipes |
| sproutApprovedBonus | 0.15 | Quality ≥ 0.95 adds 15% of price |
| friendshipTipBonus | 0.04 / heart | Hearts (max 5) from serving a regular on consecutive days |
| friendshipGiftAt | 3 hearts | Regular brings a random unowned cosmetic |

Cooking quality = mean(step scores) × ingredient multiplier (★ 1.0 / ★★ 1.15 / ★★★ 1.3, interpolated on the mean star), clamped to 1.

**Six-minute target.** Garden Soup needs 4 common garden items (~90 s to gather), the restaurant open/cook/serve loop is ~2.5 min, and a first perfect-ish soup pays 100 + ~40 tip + 25 first-time = ~165 CP. Ribbon Bow (130), Gingham Bandana (120) and Straw Hat (150) are all affordable after one dish.

**Full wardrobe.** ~45 purchasables total ≈ 11,500 CP. Mid-game dishes pay 150–250, meadow specials 300+, so a full wardrobe is 5–6 sessions of ~15 minutes.

## Gathering (src/data/spawns.js → SPAWN_TUNING)
| Tunable | Value |
| --- | --- |
| spawnChance | 0.82 per point per visit |
| pickHoldTime | 0.6 s (quality from the plant's ripeness pulse when the hold completes) |
| pullTaps / pullWobblePeriod | 3 taps / 0.9 s; tap near the wobble peak (|sin| > 0.72) = perfect |
| shake fruit | caught mid-air ★★★, collected < 4 s after landing ★★, later ★. Sprout bats idle fruit toward Gigi after 2.5 s |
| forageRevealRadius | 4.5 m; Sprout hints hidden forageables within 10 m; ★★★ if he's near when you pick |
| dayLength | 180 s to the lunch chime; sun holds at golden hour after |
| meadowUnlockCP | 200 lifetime CP earned (not current balance) |
| rarity weights | common 1.0 / uncommon 0.45 / rare 0.12 |

## Cooking micro-games (src/game/minigames.js)
Each returns 0..1. Star thresholds: ≥ 0.85 ★★★, ≥ 0.55 ★★.
- **Chop**: 5 guides; accuracy 1.0 within 0.035, 0.65 within 0.09, else 0.25.
- **Peel**: 2.5 turns; −0.22 per break (still > 0.35 s); smoothness factor 0.6–1.
- **Whisk**: 6.5 s; target 7.5 rad/s ± 25%; score = time in tempo / 80% of duration.
- **Pour**: band 0.60–0.72; overflow = 0.2.
- **Season**: 5 s; sweet spot 0.56–0.70; taps +0.11, decay 0.025/s.
- **Stir**: 9 s; heat drifts +0.11/s, stirring cools 0.022 × ω; green 0.40–0.66; > 0.9 puffs "oops" (−0.1).
- **Heat**: 9 s; low/med/high gain 0.045/0.16/0.30 vs cooling 0.13; band from the recipe's `heat`; random ±0.14 events.
- **Flip**: 3 flips; apex at 0.7 s of a 1.4 s arc; 1.0 within 0.09 s, 0.6 within 0.2 s.
- **Hold-to-tap** accessibility: holding interact auto-taps at the right moment for 0.85 accuracy.

## Rendering (src/engine/Post.js, src/world/curve.js)
- ACES filmic, exposure 1.0; UnrealBloom strength 0.22 / radius 0.5 / threshold 0.82; GTAO radius 0.6 (Fancy only); SMAA.
- Curved horizon: `pos.y -= max(0, dist − start)² × curvature` in view space, on every material via `applyCurve`. Hub 0.0045 (start 8 m), garden 0.003, title 0.004, interiors 0.
- Rim/fresnel: default 0.16 on props, 0.35 on skin, patched into `opaque_fragment`.
- Materials: MeshStandard roughness 0.62, shared/cached by option key; all boxes are RoundedBoxGeometry.
- Palette from the reference: walnut 6b4423, honey c08a4c, plaster f6e9cc, sage 82a86c, tomato e0603a, butter f6cc4a, sky 9fd0ee, cat grey 8d93a1.

## Cartoon character pass (src/world/toon.js, outline.js, faces.js)
- **Soft-toon shading**: `applyCurve(material, { toon: true })` wraps N·L for the *diffuse* term only (`toonNL = mix(shadow, 1, smoothstep(edge±soft, N·L*0.5+0.5))`) with a warm lit / cool shadow tint. Specular keeps the classic saturate(N·L), otherwise back-facing lights reach the GGX term and blow up at silhouettes. Uniforms: `TOON_UNIFORMS` (shadow 0.3, edge 0.52, soft 0.18). `uToonMix` 0..1 blends to classic PBR at runtime.
- **Outlines**: inverted hulls (`addOutlines`) — back-face copies pushed along normals by `OUTLINE_UNIFORMS.uOutline` (0.026 m), tinted a darkened base colour. Skipped for parts under 3.5 cm, transparent parts, decals and anything flagged `noOutline`.
- **Faces**: `FaceDecal` draws eyes/brows/blush/mouth on a 512×384 canvas mapped to a transparent partial-sphere shell (140° wide) over the head; skin shading shows through. Expressions: neutral / happy / surprised / joy; blinks every 2–5 s. `kind`: gigi | npc | cat.
- **Proportions**: HEAD_R 0.47 (was 0.42), legs 0.42 pivot, torso socket 0.8, arms 0.98. ~2.1 heads tall.
- **Secondary motion**: hair/hat sockets spring off root velocity; Sprout's tail and ears spring off acceleration and reactions.
- **Toggle**: pause menu → Character style → Cartoon / Classic (`settings.characterStyle`). Classic sets `uToonMix = 0` and hides hulls; faces and proportions stay.
- **Revert**: `git checkout pre-cartoon -- . && npm run build` restores the pre-pass build exactly.

## Decisions & deviations from the brief
- **Pick quality** uses a visible ripeness pulse (time your hold) so every gathering type has a light skill element, rather than a pure hold.
- **Meadow unlock** is lifetime-earned CP so spending never re-locks it.
- **Serving** is a short auto-walk cutscene after plating (input returns once the customer is eating) — keeps the 3-table room readable and avoids fiddly plate-carrying.
- **Freestyle with no matching recipe** returns the ingredients ("Sprout shakes his head") instead of producing a bad dish — nothing is ever wasted.
- **Day** advances when you leave the garden (one morning per trip). Friendship hearts count consecutive days served.
- **Fonts** come from Google Fonts when online and fall back to system fonts offline, so the single-file build still has zero hard dependencies.
- **Depth of field** is approximated with distance fog/haze rather than a bokeh pass (too costly on integrated GPUs).
