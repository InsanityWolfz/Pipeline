# 077 plan: world detail, landmarks and weather

Plan for docs/specs/077-world-and-weather.md on `claude/077-world-and-weather` (InsanityWolfz/Pipeline#94), stacked on
074 (`claude/074-light-and-moods`, merged in; 077 merges after it). A plan file because the spec spans the ground bake,
the overworld view, four new data sets, motion, weather, lighting, the silhouette, hover names and the test hook, and
will pass 300 lines. Pre-approved by Shaun in chat (2026-10-27). 077 has no sim rule (no file under `src/sim` changes),
so its "failing tests first" are data tests (tests/data), a reachability test on the unchanged map (tests/sim), and
pure render helpers (tests/render). Each slice is committed with `npm run check` green.

## Findings that shape the plan
- **The map.** Every set-piece footprint in the spec's table already stands on solid tiles of its kind on the fixed map
  (checked on seed 20261018: trees, cliffs, kilns and cairns), with walkable floor in front. No move is needed so far;
  the placement test holds them to the rules, and any that fail move per rule 6 and are listed in the PR.
- **Footprints.** Collision reads small pieces' footprints by the frame `pieceFrame` (src/sim/tileLook.ts) gives. A
  ruin variant is chosen in render *after* `pieceFrame`, from that frame, and keeps that frame's drawn base (the same
  shadow ellipse): a test holds every variant to its base frame's `FOOTPRINTS` box. Chimneys, rods, cairns and kilns
  fill their tiles and have no footprint box; their variants keep the tile.
- **074.7's chimney fires.** A chimney's light sits at its lip (`fire.chimney.rises` by its frame). A broken stump is
  shorter, so its fire moves down to the stump's own lip (one more entry in `rises`): still a fire, same count. To be
  raised (077.N), since 074.7 is Shaun's.
- **Kiln ends.** A brick pile "where a kiln tile's look allows": a front kiln at a row's east end gets a variant frame
  with bricks fallen at its foot; its glowing mouth stays, so 074.7's kiln-row light stays where it is. To be raised.
- **Per-frame cost.** The scene's camera router already walks `scene.children` each frame, and Phaser submits every
  visible child. So each built chunk's plants live in one Phaser `Layer` at `DEPTHS.decor` (one child of the scene,
  not 80), shown only while its chunk touches the view (toggled when the set of chunks in view changes, never per
  frame over props). The sway stepper keeps each chunk's swaying objects in a list and steps only the chunks in view,
  under `SWAY.perFrame`. Ripples, ley beads and weather look only at what's in view, from lists bucketed by chunk at
  boot.
- **Lit decor on High.** 074 lights only the props a light reaches; a lit sprite breaks the batch. Plants register
  with the world layer as props, and a lit plant gets 074's depth nudge (as lit chunks do) so the lit ones draw
  together after the unlit ones.
- **Set-piece loops and the silhouette.** 070's cover key includes each prop's frame name, so a looping frame would
  re-run the pixel test. Each set piece is a still base image (registered as an occluder) plus, where it moves, a
  loop overlay (not an occluder) and a sway part (the Colossus's ivy). The key never changes with the loop.
- **076's budget is not on main.** `PARTICLE_BUDGET` and the live death-mote cap live in 076 (`src/data/juice.ts`,
  unmerged). 077 defines its own share as data in `src/data/weather.ts` (`WEATHER_CAP`, and the budget it shares
  with 076's numbers as `WEATHER_BUDGET`), and gates weather on `budget − death-mote cap − (live weather + today's
  live particles)`. When 076 merges, `WEATHER_BUDGET` reads 076's constants (one import) and `ui().particles` counts
  weather. Recorded in the spec ("the shared-budget seam"). Today's `ui().particles` (a number other specs wait to
  reach 0) is left as it is; weather reports its own live count in `ui().weather`.
- **072's return stones are not on main.** They stand 3 tiles west of each boss arena door's `leaveTo` (072's data).
  `DECOR_CLEAR` keeps 2 tiles round those tiles already, and the reachability test checks their travel tiles (one
  west of each), so nothing changes when 072 lands. Recorded as a raised item.
- **Deterministic placement.** Every plant, scatter mark, vine and variant is a pure function of the tile, the map and
  `worldTileHash` salted per set (`DECOR.salts`), so a chunk's decor is the same in any build order. Weather, ripples
  and lightning come from a render-side stream: `createRng(WEATHER_SEED)` from `src/sim/rng.ts` (render only imports
  it; the sim's own stream is untouched). Phaser's emitter ops would call `Math.random` for ranged values, so every
  weather particle's values are set from that stream when it spawns.
- **Weather lightning** reuses 074's flash: a strike sets `LightPulses.sinceStrike` (the same clock rod strikes set),
  so a weather strike and a rod strike together make one flash, and places 074's rod-strike light at the target. The
  bolt is 064's look (`LIGHTNING_LOOK` through `drawBolt`).
- **Motes.** 014's room-wide motes (`AMBIENT.motes`) are skipped in the overworld; Region 1's weather (pollen and ley
  motes) replaces them there. The foundry keeps them.
- **`?world=off`** (dev) and the hook's `worldLifeOff(off)` skip plants, sway, ripples, ley flow, set-piece loops and
  weather, keeping set pieces' and variants' still frames: the probe's A/B in one page.

## Slice A: the systems and Region 1
**Tests first**
- tests/data/decor.test.ts: every region has its plant, scatter and variant sets; every sprite key is drawn and
  registered; every colour a palette id; densities are the spec's (1 in N); `maxPlantsPerChunk` 80; each ruin variant
  names a base frame and keeps its footprint box.
- tests/data/setPieces.test.ts: twelve pieces, three a region, ids kebab-case, names; placement rules 1–4 on the
  generated map (footprint solid and shot-stopping, no door/arena door/barrier/ramp/gate; the row in front walkable for
  half its width; 2 tiles from any road; the drawn box over no pylon, node, altar, arena door, return stone, spring,
  start stone or road tile; the base within the footprint ± 4 px); frames registered; lights only on the three.
- tests/data/weather.test.ts: every region has weather; each tier's total within `WEATHER_CAP`; the cap plus 076's
  death-mote cap within the budget on every tier (leaving 50, 80 and 140); palette ids; lightning off on Low.
- tests/sim/worldDecorReach.test.ts: with every gate open, from the wake: every road tile, every pack's spawn tile, a
  tile beside every pylon, each return stone's travel tile, every arena door's outside tile and every spring reachable;
  every set piece's footprint solid and shot-stopping; worldGround.json and worldMove.test.ts untouched.
- tests/render/decorPlace.test.ts: no plant or scatter breaks a `DECOR_CLEAR` rule in any region; densities within
  ±15% over each region's eligible tiles; the same output twice and in any chunk order; a pinned hash per region of
  one sample chunk's list; the per-chunk cap keeps the nearest; variants stay in their piece class; set-piece
  footprints draw no standing sprite.
- tests/render/sway.test.ts: 25 built chunks, 4 in view: only those 4 are touched; the per-frame cap and turn-taking
  (each object at least every other frame); angles within amplitude (+ a third lean); Low touches none and rests at 0.
- tests/render/ripples.test.ts, leyFlow.test.ts: caps per tier, none on Low; rings only for ponds and springs whose box
  meets the view; beads move toward each line's last point (the foundry, or the pylon for a vein seam), only segments
  in view, spaced by tier.
- tests/render/noMathRandom.test.ts: the new files' source has no `Math.random`.
**Code**
- Data: src/data/decor.ts (`DECOR`, `DECOR_CLEAR`), src/data/setPieces.ts (`SET_PIECES`), src/data/ambient.ts
  (`WIND`, `SWAY`, `RIPPLES`, `LEY_FLOW`), src/data/weather.ts (`WEATHER`, `WEATHER_CAP`, `WEATHER_BUDGET`,
  `WEATHER_LIGHTNING`, `WEATHER_SEED`), src/data/worldArtAssets.ts (frame and texture keys, re-exported by assets.ts),
  `DEPTHS.decor` (over the glows, under the fog) and `DEPTHS.weather`; lights.ts (`SET_PIECE_LIGHTS`);
  silhouette.ts (set pieces hide the player).
- Art: src/data/art/decorMeadow.ts (grass, flowers, ferns, reeds; pebbles, leaf litter, clover; the column drum,
  fallen capital, leaning rune slab; the mossy boulders), src/data/art/setPiecesMeadow.ts (the Fallen Colossus with
  its ivy, the Ley Tower, the Watcher); the ripple ring, bead and weather textures.
- Render (src/render/world/): decorPlace.ts (pure placement and the clear mask), variants.ts (pure), scatter.ts
  (painted into the ground bake), sway.ts (the stepper), ripples.ts and leyFlow.ts (pure models), wind.ts (the wind
  blended with the mood), DecorView.ts (per chunk: the plants' Layer, vines, set pieces), WorldLife.ts (the frame:
  view chunks, sway, ripples, beads, report). OverworldView builds each chunk's decor and set pieces, skips standing
  sprites under footprints, and draws variants; hoverNames names set pieces; gatherLights places their lights;
  AmbientView skips motes in the overworld.
- Hook: `ui().world` (per built chunk its plants, variants and set pieces; sway updated and chunks stepped this frame;
  ripples, beads and set pieces in view), `worldLifeOff(off)`; dev `?world=off`.

## Slice B: the Hollows and the Emberworks; weather
**Tests first**
- tests/render/weatherSpawn.test.ts: blend weights from the mood; counts by tier and weight; the budget gate (no spawn
  once live ≥ budget − death-mote cap); the boss-fight rule (Low's counts); spawns over the view plus 32 px, recycled
  at the upwind edge; the same seed and frames give the same particles.
- tests/data/decor.test.ts and setPieces.test.ts extended to the new sets.
**Code**
- Art: src/data/art/decorHollows.ts, decorEmber.ts; setPiecesHollows.ts (the Unfinished Giant with its swinging block,
  the Aqueduct Head, the Great Crane with its swaying cradle), setPiecesEmber.ts (the Great Furnace with its smoke
  loop, the Great Crucible, the Toppled Stack).
- Render: src/render/world/weatherModel.ts (pure: weights, counts, gate, spawn), WeatherView.ts (one Phaser
  `ParticleEmitter` per layer, values from the render stream, recycled in view); `ui().weather`.

## Slice C: the Stormcrown, lightning, the probe and shots
**Tests first**
- tests/render/weatherSpawn.test.ts: the lightning schedule from its seed (10–22 s, Stormcrown weight ≥ 0.5); targets
  (the Storm Tower's crown first when in view, else a rod `I` in view ≥ 6 tiles from the player and never within 4 of
  a storm-rod node, else a cairn or cliff top; none in view skips); none on Low, with Flashes off, in an arena or a
  fight.
**Code**
- Art: src/data/art/decorStorm.ts; setPiecesStorm.ts (the Storm Tower, the Stormcaller, the Wind Harp with its
  wires).
- Render: rain, splashes and weather lightning (bolt, 074's flash and light); the hook's `strikeWeather()`.
- e2e: tests/e2e/worldLife.spec.ts (decor per region, set pieces with hover names, the silhouette behind one, sway on
  Medium and none on Low, ripples and beads, weather per region and tier within caps, the 10-kill budget check in the
  dust, a forced strike with its flash and light and none with Flashes off, on Low or in the Conductor's fight, the
  per-frame bounds walking across chunk lines, readability under rain, the same `getState()` on Low, High and
  `?world=off`); tests/e2e/worldLifeProbe.spec.ts (`PROBE=1`: Low against world off, the tiers' frame times, the chunk
  build and the boot bake); tests/e2e/worldLifeShots.spec.ts (`REVIEW_SHOTS=1`, docs/review/077).
- Docs: art.md "World detail and weather"; the spec's Results and raised items.

## Verify
`npm run check`; the touched and new e2e files one at a time (`--workers=1`, port 5341, an untracked local config);
lighting.spec.ts, landmarks.spec.ts, art.spec.ts, waypointSteady.spec.ts and newGameAfterQuit.spec.ts kept green; the
review shots on Low and High; CI on the PR.
