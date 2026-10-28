# 078 plan: ammo visuals and particles

Plan for docs/specs/078-ammo-visuals.md on `claude/078-ammo-visuals` (InsanityWolfz/Pipeline#96). 074, 075, 076 and
077 are not on main yet, so the branch merges all four first (`078: merge 074` … `078: merge 077`) and 078 merges after
them. A plan file because the spec spans data, the particle system, three projectile views, the feel files, the rig,
the weather, the test hook and the docs, and will pass 300 lines. Pre-approved by Shaun in chat (2026-10-27).

078 changes no sim rule and no file under `src/sim`. Its "failing tests first" are data tests (tests/data) and pure
render helpers (tests/render): the look tables and their composition, the impact matcher, the budget ledger, the
particle pool, the trail ring and the mark pool. Each slice is committed with `npm run check` green.

## Findings that shape the plan
- **Every particle is a `Particles` particle today**, one `Rectangle` made per particle and destroyed when it dies, all
  at `DEPTHS.worldUi - 1` (over everything). 078 makes it a pool (rectangles made once, hidden and reused through a
  swap-remove live list) and gives each emit a depth, a priority, a kind and the tier's scale.
- **The budget seam.** 076's `waveCount` and 077's `budgetRoom` each compute their own room today. Both become thin
  calls to `roomFor(kind, priority, quality, live)` in `src/render/particleBudget.ts`. `waveCount` keeps its exact
  numbers (its share less the live motes, within the total less every live particle). `budgetRoom` changes on
  purpose: 077 gated weather on "budget − death cap − every live particle", so a crowd of bursts could starve it;
  with fixed shares and no borrowing it is "weather's share less live weather, within the total less every live
  particle". The counts are the same whenever deaths and effects stay within their shares; 077's unit test and its
  10-kill e2e check move to the ledger's rule (raised as 078.N).
- **A module cycle.** `PARTICLE_SHARES` (juice.ts) needs `WEATHER_CAP` (weather.ts); `WEATHER_BUDGET` (weather.ts)
  would need juice.ts. So the mirror goes outright and its readers use `PARTICLE_SHARES`.
- **Events per draw.** `GameScene` merges every tick's events since the last draw and clears them part way through
  `draw()`. The shot effects need this frame's events, this frame's rounds and this frame's posed muzzle (the rig
  runs in `PlayerView.update`), so `clearEvents` moves to the end of `draw()` and `ShotFxView` runs after the
  projectile views. Nothing after the old clear reads the pending events.
- **Who hit what.** An enemy hit's `x, y` is the enemy's feet (`damageEnemy`); arrows hit when their box meets the
  hurtbox, centred `offsetY` above. The matcher measures from each round's path this frame (last drawn point to this
  one, or one frame's travel past its last point when it vanished) to the hurtbox's centre. A round hits an enemy at
  most once, so a (round, enemy) pair is matched once; two rounds on one enemy in a frame get one hit each.
- **Bomblets carry their cluster bomb's ammo id** (`BombletState.ammoId`), so a bomblet burst matches the bomblet that
  vanished at its point; the spec's "latest cluster burst within `CLUSTER.distance` + 2 px" is the fallback.
- **The Shard's parent.** A Shard's `ArrowState` has its element (`damageType`) but not its tier. On a `splits` event
  the split round that vanished there gives its tier to the Shards that appear at that point this frame; stone
  otherwise.
- **The posed muzzle.** `drawWanderer` already returns marks (the hood, the hem) in world px from the feet. It gains
  `muzzle`: the tube's flash point through the gun's matrix. `PlayerView` reports it as a world point.
- **Ribbons and blend modes.** A Graphics has one blend mode, so the trails are two Graphics at `shotTrail` (normal,
  and additive for ley, lightning and fire on Medium and High), each redrawn once a frame from the pooled slots.
- **`hitLightning`, `embers` and `rollDust` have enemy uses** (a thunderhawk's dive, a mite's zap, a gale ram's gust,
  a cinder mote's death and the vents). `FX_PRIORITY` gives a key its usual priority; a call site that plays an enemy
  attack passes `cue` (the spec's "enemy and boss attack bursts and hazards").
- **`ArrowView`'s hook fields keep their meaning.** `trails.longest` counts the points a trail holds (the ring keeps up
  to 24, drawn cut to its length), so 029's homing check, which waits for it to pass 17, still reads a growing trail.

## Slice A: the data and the pure parts (tests first)
- tests/data/ammoFx.test.ts: every row's colours are palette ids, none `danger` or `hit-red`; `flame-dark` only in the
  fire trail; every `PARTICLES` key and every 078 burst has a priority; `PARTICLE_SHARES` sums to `PARTICLE_BUDGET` on
  every tier and none is negative (50 / 80 / 140); every machine category but logistics has sparks, every stage tag
  and the Tempering coil too; `FX_QUALITY` is the spec's table; the depths order (`shotMark` 0.35 and `shotTrail` 0.45
  between `fog` and `groundFx`).
- tests/render/roundFx.test.ts: every id in `AMMO`, the Shard and the bomblet resolve to a full look; family, element
  and tier each change it as the spec says (the stormsteel frost arrow's example); no two rounds differing in family,
  element or tier share a look; a made-up tag row and tier row on a copy of the tables give looks with no code change;
  Low, Medium and High counts (×0.5 floored, at least 1 for an impact; ×1.25 rounded); Flashes off drops the ring, tick
  and star and the flicker and crackle.
- tests/render/impactMatch.test.ts: a pierce through three enemies, two rounds on one enemy in a frame, a bomb burst, a
  mine burst, bomblets (and the cluster fallback), a wall end, a range end, the no-match fallback, melee, burn and arc
  hits skipped.
- tests/render/particleBudget.test.ts: shares, `roomFor` per kind and priority (soft stops at 50% of the effect share,
  shot at 85%, cue uses the rest), no borrowing, the total cap; `waveCount`'s and `budgetRoom`'s counts through it.
- tests/render/fxPool.test.ts: the particle pool emits and expires 10,000 particles through a fixed number of slots;
  the trail ring (push, cut to length, cap, fade); the mark pool (cap, oldest recycled first). These run on plain
  slot objects, so the Phaser views are thin.
- Code: `src/data/ammoFx.ts` (`AMMO_FX` families, elements, shapes, tiers), `src/data/fxQuality.ts` (`FX_PRIORITY`,
  `FX_THRESHOLDS`, `FX_QUALITY`, `TRAIL_POINTS`, `MACHINE_SPARKS`, the mark and flash sizes), `PARTICLE_SHARES` in
  juice.ts, `DEPTHS.shotMark`/`shotTrail` and the mark texture keys in assets.ts; `src/render/particleBudget.ts`;
  `src/render/fx/roundFx.ts`, `impactMatch.ts`, `fxPool.ts` (the pure pools).

## Slice B: one budget, a pooled `Particles`
- `Particles` becomes the pool: made up to the tier's high-water mark (death cap + effect share), never destroyed
  (hidden), a burst thinned to `roomFor(effect, priority)` and scaled by the tier, a mote wave to `roomFor(death)`.
  `pool.created` counts the objects made.
- One `ParticleLedger` per scene (GameScene): `Particles` adds and removes death and effect particles; WorldLife sets
  the weather count each frame in the overworld; FeelView sets 014's room motes indoors.
- `JuiceView.burst(name, x, y, depth?, priority?)`: the priority from `FX_PRIORITY` unless the call site says `cue`.
- `waveCount` and `budgetRoom` call `roomFor`; `WEATHER_BUDGET` goes (weather.test reads `PARTICLE_SHARES`).
- `ui().particles` gains `weather`, `effects`, `byPriority`, `pool` (and keeps `live`, which counts the pool).

## Slice C: bodies and trails
- `/sprite`-style redraws of the arrow, ley bolt, bomb, landmine, Shard and bomblet in the pushed look (gradient from the
  top left, `rim`, ink outline; same keys, boxes and anchors); the baked tail lines go. 062's tier swaps still recolour
  them (tierArt test). Checked on the contact sheet at 4×.
- `TrailView` (`src/render/fx/`): two Graphics at `shotTrail` redrawn from pooled slots (`Float32Array` rings of 24
  points), capped 24 / 48 / 96 by tier, one colour on Low, colour and core on Medium, plus the soft glow edge on High;
  a slot fades over 120 ms after its round ends. Lightning crackles (±1.5 px a frame), fire flickers (±15%), neither
  with Flashes off. A round fired this frame starts its trail at the drawn muzzle.
- `ArrowView` hands each round's look and point to `TrailView` and drops its Graphics and per-frame arrays; a burning
  arrow (054) takes the fire element's trail and keeps its flame tip. `BombView` turns landmines 1.5 times a second.

## Slice D: impacts, muzzle, marks, machine sparks
- `ShotFxView` (`src/render/fx/`): each frame, from the pending events, last frame's and this frame's rounds and the
  posed muzzle: muzzle sparks down each shot's lane; impacts from the matcher (splinter, ley splash, flick, blast, mine
  blast, mini blast; the fallback in today's hit colours; an arc's hit half the lightning impact); ends; the shed bits
  (ley motes, frost flakes, embers, fuse smoke) at the tier's rate; landing dust as a mine arms; `ui().ammoFx`.
- `MarkView`: pooled images at `shotMark` (scorch, rime, splash, shock rings), capped 6 / 12 / 24, oldest recycled;
  `FlashPool`: the ring, tick and star (none with Flashes off), at the struck enemy's depth.
- Depths: lingering bits at `shotTrail`, marks at `shotMark`, impact sparks at the struck enemy's feet − 0.5, ends and
  blasts at their ground point; 014's bursts keep `worldUi − 1` except where a call site says otherwise.
- FeelView drops the per-element hit bursts for the player's rounds and the bomb's `embers`; mineFeel drops
  `mineShards` and `bombletEmbers` (the blasts replace them). The rig's `muzzle` mark. Machine sparks on each finished
  craft (`MACHINE_SPARKS`). Dev `?fx=off` (and the hook's `fxOff`) skips 078's trails, impacts, marks and sparks for
  the probe's A/B and the determinism check.

## Slice E: game tests, probe, shots, docs
- tests/e2e/ammoFx.spec.ts (sandbox, a Husk pen): each family's trail kind, impact and muzzle sparks; the elements'
  colours; the tiers' glints; homing's curving wake; the Split's star and Shards; a cluster's four mini blasts; the
  muzzle within 1 px; Flashes off; hit feedback unchanged; each tier's caps and a live tier change; the same
  `getState()` with fx on, `?fx=off`, Low and High.
- tests/e2e/ammoFxBudget.spec.ts: the five-entrance bombs-and-arrows volley into a Hollows pack in the dust with 10
  killed at once, every frame on each tier (effects ≤ share, total ≤ budget, deaths and weather within caps); a
  Bulwark pound during a full volley still throws dust; pool stability (no new objects or slots after a 1 s warm-up
  over a 10 s High fight); the telegraph redness with a volley over a Husk's swipe (074.11's method).
- tests/e2e/ammoFxProbe.spec.ts (`PROBE=1`): the Low A/B against `?fx=off` in a Stormcrown five-entrance fight, and
  Medium and High frame times, for the PR.
- tests/e2e/ammoFxShots.spec.ts (`REVIEW_SHOTS=1`): shots 01–11 in docs/review/078 and the motion strips (an arrow
  volley, a ley bolt, a bomb's arc and blast, frost, homing, a Split, each tier: 30 frames over a second on
  Playwright's fake clock), looked at before pushing.
- worldWeather.spec.ts's 10-kill check reads the ledger's rule; enemyDeaths and the older ammo e2e files kept green.
- docs/art.md "Ammo and particles"; the spec's Results and raised items.
