# Plan: 014 Look and feel (docs/specs/014-look-and-feel.md, approved)

Written by the overnight run; it stays inside the spec. Branch `claude/014-look-and-feel`, stacked on 013. No sim rule changes. Every phase is its own commit, kept green, so whatever lands by morning is shippable and the rest is listed in the report.

## Phase 1: Tiles (render, data, art)
- **Floor variants:** 4 variants per floor theme (ruin flagstone, clearing, shrine, foundry rune), plus the plain tile.
  - `FLOOR_VARIANTS[theme]` lives in `src/data/foundryAssets.ts`, as frames.
  - `src/render/tileHash.ts` `variantAt(tx, ty, n)` is an integer hash. It's pure and stable, so tiles never shimmer.
  - Most tiles stay plain. Roughly 1 in 3 gets a variant, so the floor reads calm.
- **Walls in 3/4 view:** a wall tile with floor below it draws its face (the current tall sprite). A wall with wall below draws a flat `wall-top` cap. Edge pieces (`wall-top-edge-left`, `-right`) are used where the top meets floor at the side. This is picked by neighbours in `room.ts` (`wallFrame(rows, tx, ty)`, a pure function with tests).

## Phase 2: Rooms and props (data, render, art)
- **Room rows reshaped by hand:** wall alcoves, pillars and collapsed corners, kept clear of doors, spawns, nodes, enemies and the e2e walk paths. Collision follows, because it's the same rows.
- **`src/data/props.ts`:** `PROPS` (sprite, optional `solid`, optional `glow`). Rooms gain `props: { propId, tx, ty }[]`.
  - Props: broken column (solid), rune stone, vines, grass tuft, ley crack (glows), banner, brazier (foundry, solid, flickers).
  - Solid props become collision rects the same way ruin blocks do. Because that's data, sim collision reads it. This is a data hookup, not a rule change. If the sim has no generic solid-tile hook, solid props become `B` tiles in the rows and the prop draws over them.
- **Light:**
  - A `GlowView` adds soft additive cyan glow sprites (radial, a 3-step dither from the palette) around crystals, ley veins, conduits carrying items, pylons, the tube and ley cracks. Each one breathes gently.
  - A per-room dusk tint and vignette is one screen-space overlay sprite.
  - `AmbientView`: drifting ley motes in every room, and fireflies in the clearing.

## Phase 3: Juice (render, `src/data/juice.ts`)
- **Shake:** small on shots, medium on bursts and slams, big on a KO. Skipped when `prefers-reduced-motion` is set.
- **Hit-stop:** 2–4 frames on enemy hits and kills. It's render-only: the struck enemy's sprite freezes and flashes white, and the camera holds. The sim keeps ticking.
- **Particles:**
  - hit sparks in the damage type's colour
  - footstep dust and the roll dust trail
  - harvest chips
  - burst embers
  - machine puffs on each craft
  - refill shimmer at the socket
  - death motes
  
  They come from one small pooled `Particles` helper of atlas pixel sprites with velocity, gravity and fade. No Phaser particle API guessing; it's checked against `.claude/skills/phaser` first.
- **Damage numbers:** they pop and float, white on enemies and red on the player, in the HUD digit font.
- **Squash and stretch:** a drop-in bounce on placed pieces and ground pickups, and a squash on hopper deposits. Menu rows get hover and press feedback.
- **Camera lead:** the camera eases up to 24 px toward the aim.

## Phase 4: Sound (scripts, data, render)
- **`scripts/sound/*.ts` + `scripts/build-sound.ts`** (`npm run sound`): a tiny synth (oscillators, noise, ADSR envelopes, pitch sweeps, simple filters) writes 16-bit mono WAVs to `assets/build/sounds/`.
  - A recipe per sound lives in `src/data/sounds.ts`: `SOUNDS` keys plus synth params.
  - Ambient loops are seamless, made of noise beds and slow chimes.
  - There is no new dependency.
  - Like the art, a test rebuilds the sounds in a temp dir and fails if `assets/build/sounds` is stale.
- **`SoundView`:**
  - It loads every key, plays effects off sim events, and crossfades the ambient loop on room change.
  - **M** mutes. Volume and mute are saved in localStorage behind a guarded read.
  - Audio is unlocked on the first input.
  - Under test it starts muted: `navigator.webdriver` or the `?mute` flag.

## Phase 5: Sprite redraws (art, pending review)
In priority order:
1. The player idle breathe (4 frames) and walk (6 frames) in 3 views.
2. The rune-carved HUD frame and the title card on the pause screen.
3. The machine working loops with spinning parts.
4. The enemy telegraph frames.
5. The item icons.

Each one keeps its frame size and anchor so layouts don't move. Anything not redrawn by morning is listed in the report.

## Tests
- **Data:**
  - every prop sprite, sound key and floor variant exists
  - room props sit on floor tiles
  - solid props don't block doors or spawns
- **Pure helpers:**
  - `variantAt` is stable
  - `wallFrame` picks the right tiles
- **Sounds:** the generator is deterministic, the WAV header is valid, and the build output is up to date.
- **Existing tests:** all existing unit and e2e tests pass on the new layouts. The game is muted under Playwright, and there are no console errors.
