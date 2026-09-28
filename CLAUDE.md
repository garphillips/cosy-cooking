# Cosy Cooking — working notes for Claude

Read README.md (layout, how to add content) and DESIGN.md (tunables, rendering, backlog) first. This file holds the things that are not obvious from the code.

## Toolchain
- **Vite is pinned to 6.** Vite 8's rolldown native binding fails to load on Apple Silicon with Node 20, so do not upgrade past 6 without confirming rolldown loads. Node 20 is the tested runtime.
- **Dev server runs on port 5179** (`npm run dev`, strict port). 5173 was taken on the original dev machine; the port is also set in `.claude/launch.json`, so use `preview_start` with the `cosy-cooking-dev` config rather than running the server by hand.
- **Build is a single file.** `npm run build` writes `dist/index.html` with everything inlined (vite-plugin-singlefile). `dist/` is gitignored; rebuild rather than commit it.

## Testing the built file
- The built game must run from `file://`. The in-app browser refuses `file://` URLs, so verify the build with headless Chrome instead. Screenshots never finish because the requestAnimationFrame loop runs forever, so dump the DOM with a timeout:
  ```bash
  /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --headless --disable-gpu --dump-dom --timeout=7000 "file://$PWD/dist/index.html" | head -c 2000
  ```
  A successful run prints the shell HTML with the canvas and UI root. Page JavaScript errors show up on stderr; ignore the repeated `CVDisplayLinkCreateWithCGDisplay failed` lines, which are macOS headless noise.
- Gameplay checks go through the dev server in the in-app browser. There are no automated tests.

## Deploy
- Live at **https://cosycook.ing**, hosted on Cloudflare Pages (project `cosy-cooking`).
- `npm run deploy` builds and pushes `dist/` with Wrangler. It needs a logged-in Wrangler (`npx wrangler login`) on the machine running it. Only deploy when asked.

## Conventions
- All balancing lives in `src/data/*.js`; every tunable is documented in the tables in DESIGN.md. When you change a number, update the table.
- Every asset is procedural and every sound is synthesised. Do not add external asset files or third-party network requests; fonts are bundled as woff2 in `src/fonts/`.
- Materials go through `makeToyMaterial` and `applyCurve` so the curved horizon, toon shading and outlines keep working. New meshes that stretch more than a few metres need tessellation or the horizon curve will bend them wrongly.
- Save format is `cosy-cooking.save.v1` in localStorage. If you change the save shape, add a migration in `State.load` (`src/game/State.js`) so existing players keep their progress (see the basket-capacity fix-up there for the pattern).
- Commit messages describe the player-visible change in one line.

## Backlog
The pending performance work, with profiling numbers, is in DESIGN.md under "Performance backlog".
