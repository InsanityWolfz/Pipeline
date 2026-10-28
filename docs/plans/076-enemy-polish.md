# 076 plan: enemy and boss polish

Plan for docs/specs/076-enemy-polish.md on `claude/076-enemy-polish` (InsanityWolfz/Pipeline#93), stacked on 074
(`claude/074-light-and-moods`) and 075 (`claude/075-wanderer-redesign`), both merged into this branch first. A plan
file because the spec touches data (families, motion, rigs, anims, juice, assets), the rig renderer, EnemyView,
EffectsView, the particles, the test hook and the contact sheet, and passes 300 lines by a long way. Nothing under
`src/sim` changes and `SAVE_VERSION` stays. Built in the spec's two slices, each committed and pushed with
`npm run check` green.

## Findings that shape the plan
- **Enemy frames are baked at boot** (catalog.ts → textures.ts) and played as Phaser anims at fixed frame rates.
  Wind-up strips can't play at a rate: they must fill the sim's wind-up exactly. So a strip is an anim whose frames are
  `[gather, coil (1 or 2), peak]`, and EnemyView shows the frame `enemyMotion` picks from `modeTicks / windupTicks`
  (the coil's two frames alternate at walk pace) instead of playing it. The same holds for every boss attack's strip
  (the Bulwark's pound, lob and brace; the Forgewright's slam, spray and flood; the Conductor's lash, call and chain).
  Every frame stays in `ENEMY_ANIMS`, one pose per frame, so the registration and pose tests hold.
- **The wind-up's length comes from the attack the mode belongs to**, read from data in render
  (`windupOf(def, e)`): `attackOf(def)` for one-attack enemies, the Bulwark's `lob`/`stomp`, the Forgewright's
  `spray`/`flood`, the Conductor's `lash`/`call`/`chain` by `e.conductor.attack`. The Sniper's peak starts at
  `trackTicks / windupTicks`. A per-attack override table in `ENEMY_MOTION` holds that.
- **Squash about the feet is free**: every enemy sprite's origin is its frame's anchor (the feet). Baked poses carry
  `squash` (drawEnemy scales by (1 + s, 1 − s) about the feet); render multiplies the sprite's scale for the release
  snap, the flinch overshoot and the dissolve. The health bar and champion labels take the top from the unsquashed
  height (`frame height × base scale`), so they don't bob. 074's light catch copies the sprite's scale, so it squashes
  with the body.
- **Flinch is a pure function of sim state**: the sim's `flash` counts down from `hitFlashTicks` (6), so the flinch's
  age is `hitFlashTicks − flash`. **Stagger needs a render clock** (300 ms), started by EnemyView from the frame's hit
  events (`react(hits)`, called by GameScene with the pending events before `update`): a frame's hits on one enemy
  summing to at least 0.4 × its scaled max health (`defOf(e).maxHealth`), or a punch (`hit.melee`), on a non-boss.
- **Deaths**: EffectsView's corpse (4-frame anim, linger, fade) becomes a `DissolveView`: the struck `death-<view>`
  frame, then the dissolve (narrow 0.8×, stretch 1.1×, fade, an additive copy in the family's first mote colour), with
  the motes in three waves from random points of the hurtbox. It runs on the tween clock (like the particles since
  034), so a review shot can slow it with `tweenSpeed`. FeelView's `deathMotes` burst goes.
- **The particle budget**: `Particles` learns to tag death motes and count them; `deathMoteCount` (pure) thins a
  death's motes to its per-death cap, the live death-mote cap and what `PARTICLE_BUDGET` has left, per tier
  (074's `settings().quality`). Each wave is re-thinned when it is thrown. Additive blend on Medium and High.
- **Size baseline**: a pure `rigBounds(rig, view, pose)` (render/vector/enemyBounds.ts) measures a drawn pose's
  extent from its shapes and the pose transform (path control points, ellipse and rect boxes, line points widened by
  their width). The baseline JSON (feetBox, hurtbox, scale, idle height per view) is recorded from main's rigs in the
  build's first commit, before any redraw.
- **The tell check**: each rig names its attack part per strip (`tells`: a part id and a point on it). A Vitest test
  carries that point through the same transforms as drawEnemy (`posedPoint`) and checks coil and peak move it at
  least 4 world px from idle (bosses 6). Measuring the posed geometry is exact at any zoom; Playwright adds the game-size
  phase walk and the tremble.
- **Files near 300 lines**: EnemyView.ts (302) splits: the Husk's resin and the Warden's core move to
  `enemyOverlays.ts`, the per-enemy pose, frame and squash choice to `enemyArt.ts`. testHook.ts (300) gains two
  fields; its ui types move to `testHookUi.ts` if it passes 300.
- **`ui().particles` becomes `{ live, deathMotes, dissolving }`** as the spec says. Its one reader
  (stormcrownShots.spec.ts, waiting for particles to clear) reads `.live`.
- **Slice B rigs before their redraw** take the shared systems with today's art: their strip is built from today's
  wind-up frames (`legacyStrip`), their stagger from today's hit pose pushed further, and their death from today's
  first death frame.

## Data
- `src/data/art/enemyFamilies.ts`: `ENEMY_FAMILIES` (id, name, region, members, ramps by material, rim, motes),
  `DEATH_SIZE` (size class by enemy id), `familyOf(enemyId)`.
- `src/data/art/enemyLook.ts`: the shared look per family: `lit(ramp, family)` styles (a top-left-to-bottom-right
  gradient on the shape's own bounds, the rim at 0.5 alpha, width 1, offset 1, the outline), family marks (moss tufts,
  slate plate edges with a lit lip, ley-iron bands with a cyan vein, soot fades, cinder seams, brass rivets,
  storm-glass inlays) as shape helpers.
- `src/data/art/enemyMotion.ts`: `ENEMY_MOTION` (phase fractions, min peak ticks, per-attack overrides, tremble px
  and Hz, release snap, slam squash, flinch curve, stagger ms and threshold, dissolve ms, narrow, stretch, tint alpha),
  `WINDUP_STRIPS` (which pose names are strips).
- `src/data/art/enemyRig.ts`: `squash` in `EnemyPose`, `stagger` in `EnemyPoseName`, `tells` and `boss` on the rig;
  `DEATH_POSES` goes when no rig uses it.
- `src/data/enemyAnims.ts`: strips (`windup` and the boss strip extras) of coil + 2 frames, `stagger` (2 frames, not
  for bosses), `death-<view>` (1 frame each).
- `src/data/juice.ts`: `DEATH_MOTES`, `PARTICLE_BUDGET`; `deathMotes` goes. `src/data/assets.ts`: the corpse's
  linger and fade go.
- Rigs: every file in src/data/art for the 19 rigs, redrawn; big ones split (`bulwarkParts.ts` and so on).

## Render
- `src/render/enemyMotion.ts` (pure): `windupPhase`, `stripFrame`, `trembleAt`, `releaseSquash`, `flinchSquash`,
  `reactionOf`, `staggerFrame`.
- `src/render/deathMotes.ts` (pure): `deathMoteCount`, `dissolveAt` (the struck and dissolve curve), `moteWaves`.
- `src/render/enemyArt.ts`: per enemy, from its state, def, clocks and time: the anim or frame to show, squash,
  tremble offset, phase and reaction; what `ui().enemyArt` reports.
- `src/render/enemyOverlays.ts`: the resin and the core, out of EnemyView.
- `src/render/DissolveView.ts`: deaths; EffectsView hands it the death events and the KO's clear.
- `src/render/Particles.ts`: tagged emits (death motes), blend, counts. `src/render/vector/enemyRig.ts`: squash;
  `posedPoint`. `src/render/vector/enemyBounds.ts`: `rigBounds`. `src/render/vector/sheet.ts`: enemies grouped by
  family, strip frames labelled with their phase.
- Test hook: `ui().enemyArt`, `ui().particles`; `setQuality` is 074's `setLook` (or the settings store).

## Slice A (076a): shared systems, Region 1 and the Hollows

### A1. Baselines from main (tests first, all green on main's code)
- tests/data/enemyTiming.test.ts + tests/data/enemyTiming.json: every attack's wind-up, attack, recovery and cooldown
  ticks (every enemy, every boss attack), as on main.
- tests/sim/windupTicks.test.ts + tests/sim/windupTicks.json: each enemy and each boss attack run in the meadow (or
  its arena for a boss) until its wind-up ends; ticks per attack counted, against the JSON recorded on main.
- tests/sim/regionHash.test.ts + tests/sim/regionHash.json: a scripted fight per region (a pack of its enemies and the
  player firing at the nearest), `summarize()` hashed every 60 ticks, against main's.
- tests/data/enemySize.test.ts + tests/data/enemySize.json: feetBox, hurtbox, scale and idle drawn height per view,
  recorded from main's rigs with `rigBounds`.

### A2. Shared systems (tests first)
- tests/data/enemyFamilies.test.ts: four families; every enemy in exactly one; members are real enemies; colours are
  palette ids; the palette unchanged in size; `DEATH_SIZE` covers every enemy.
- tests/render/enemyMotion.test.ts: gather, coil and peak at 0.2 and 0.85 for every attack in the tables, the peak at
  least 5 ticks, the Sniper's peak at its lock, the coil's two frames alternating at walk pace, tremble only in the
  peak (0.8 px, bosses 1.2, 20 Hz), the release snap settling over 4 ticks.
- tests/render/enemyReaction.test.ts: a small hit flinches; 40% in a frame or a punch staggers; a boss never staggers;
  no reaction during any wind-up or attack mode; a starting wind-up cuts a stagger off; stagger frames over 300 ms;
  the flinch's snap and overshoot.
- tests/render/deathMotes.test.ts: counts by size class, champion ×1.5, tier ×0.5/1/1.5, per-death cap, live cap,
  total budget, never negative; the dissolve curve (struck 100/200 ms, dissolve 500/1,200 ms, 0.8× and 1.1×, tint
  alpha 0.5, 0.25 with Flashes off); three waves.
- tests/render/enemySquash.test.ts: a squashed pose keeps the feet at the anchor (`posedPoint` of a foot point).
- tests/data/art.test.ts extended: every rig has a strip per attack in every view, `hit`, `stagger` (not bosses) and a
  1-frame `death` per view; enemy frames at most 990.
- Code: the data files, the pure render modules, EnemyView/enemyArt/enemyOverlays, DissolveView, Particles, FeelView's
  motes out, the test hook fields, the sheet's families.

### A3. Region 1 and Hollows rigs, drawn
- Husk, Wisp, Pylon Warden; Charger, Burrower (and its ripple's phases), Shardback, Sniper, Bulwark: every view and
  pose redrawn in the family look, viewed in /sheet.html at 4× and in game at 1× in each region's mood, revised until
  wind-ups, reactions and deaths read.
- tests/render/enemyTells.test.ts: each rig's coil and peak move its tell point at least 4 world px (bosses 6).
- tests/data/enemySize.test.ts holds: idle heights within ±10% per view.

### A4. e2e (each file alone, `--workers=1`, port 5340)
- tests/e2e/enemyPolish.spec.ts: a Husk's `ui().enemyArt` phase walks gather → coil → peak through a real wind-up,
  the swipe on the same tick as the baseline; the peak trembles; a punch on a ring 1 Husk staggers and one arrow
  flinches, the hit flash unchanged; the camera never moves (`SHAKE_ON` false) through a wind-up, a stagger and a
  boss's death; the same `getState()` on Low and High over a scripted fight.
- tests/e2e/enemyDeaths.spec.ts: a death shows struck then the dissolve, gone by about 600 ms (bosses 1.4 s); the
  sound once; the motes' hues by family (pixel check); the mote caps on each tier with 10 Hollows enemies killed at
  once, Low half of Medium; the cinder mote's burst, the mite's discharge and the golem's split still play.
- tests/e2e/enemySheet.spec.ts: /sheet.html labels against the rigs, no console errors; every enemy spawned in the
  sandbox and each pose forced with no "No frame named" error.
- tests/e2e/enemyPolishShots.spec.ts (REVIEW_SHOTS=1): docs/review/076 only.
- Kept green: art.spec.ts, hollowsEnemies, emberworksEnemies, stormcrownEnemies, the boss specs,
  newGameAfterQuit.spec.ts, 074's lightingProbe.spec.ts.

### A5. Commit, push, CI.

## Slice B (076b): the Emberworks and the Stormcrown
- Cinder mote, bellows hound, slag golem, slag whelp, kiln-tender, Forgewright and its bellows; thunderhawk, static
  mite, storm sentinel, gale ram, Conductor and its rods: redrawn as in A3, tells added, the Forgewright's bellows
  dissolving with it (a quarter of its motes each).
- The shots and e2e families extended to them. Commit, push, CI.

## Performance
- Bake at boot (as today). Report the enemy frame count (main 733; at most 990), the boot bake time and texture pages
  (`ui().groundBakeMs`'s neighbour: the vector bake's ms, measured in the page), 074's Low frame-time probe, a ring 5
  pack fight's mean frame time on Medium, and newGameAfterQuit.spec.ts.

## Out of scope (spec)
080's intros, shake and phases; 078's other particles and budget; 077's props; telegraphs, projectiles, hit flash,
numbers, hit-stop, sounds; any sim, save or palette change.
