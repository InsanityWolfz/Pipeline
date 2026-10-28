# 078: Ammo visuals and particles
status: approved

Approved by Shaun in chat, 2026-10-27, with the whole art pass (074–081); its plan is pre-approved.

Plan pre-approved by Shaun in chat, 2026-10-27. Plan: docs/plans/078-ammo-visuals.md.

Drafted from Shaun's art-pass interview (docs/brainstorm/2026-10-27-art-interview.md, answers 5, 14–17 and 27–28) and his calls on 078 that day. This is art spec 5 of 8, built in order after 074, 075, 076 and 077. Shaun asked for no sample pages first ("Just build it"); he reviews the result at the playtest.

## Goal
Every ammo looks like itself in flight and when it lands. Arrows streak, ley bolts glow, bombs trail fuse smoke and blast, and frost, fire, lightning, homing and the material tiers each show. Impacts, muzzle sparks and machine sparks join the moderate particle set, and they share one budget with 076's death motes and 077's weather, scaled by 074's Graphics quality. Fights stay readable: nothing from the player's shots hides an enemy telegraph. The sim doesn't change: the same seed and commands give the same `getState()`, tick for tick.

## Design references
- docs/design.md "Camera and art" (the 2026-10-27 wording, applied by 074): pushed vector with a thin ink outline, soft gradients lit from the top left with a rim light, glows and shadows; "the tube's shots" light the ground near them; screen shake only in boss spawns.
- docs/design.md: the ammo families, tags and tiers (029, 038, 039, 054, 060, 062, 064, 066).
- docs/art.md: "Style", "Outline" (projectile bodies get the ink outline; glows and particles don't), "Accent" (ley is cyan; Wisps violet, fire ember), the palette, "Vector sprites". The build adds an "Ammo and particles" section.
- docs/specs/074-light-and-moods.md: the art-direction rules, the two layers (rounds are in the readability layer), the Graphics quality setting (Low, Medium, High), `ROUND_LIGHTS` (High only), the Flashes setting's rules (074.3), and the telegraph-redness check (074.11).
- docs/specs/075-wanderer-redesign.md: the 3-frame muzzle flash on the tube ("078 adds per-ammo sparks"), and 075.10 (the drawn muzzle and the shots' spawn point don't match).
- docs/specs/076-enemy-polish.md: `PARTICLE_BUDGET`, `DEATH_MOTES` and its live cap, `ui().particles`; "078 brings every other burst under `PARTICLE_BUDGET`".
- docs/specs/077-world-and-weather.md: `WEATHER_CAP`, `WEATHER_BUDGET` (077.1: a mirror of 076's numbers until 076 merges), "50, 80 and 140 for 078's bursts", `DEPTHS.decor` and `DEPTHS.weather`.
- Earlier specs it builds on: 014 (particles, hit-stop, juice), 016 (projectile sprites), 029 (tags, trails, the Split), 038 (landmines, bomblets), 042.10 (Flashes), 054 (Shards' trails, burning arrows, homing speed), 060, 062, 064, 066.

## Depends on
- **074:** the quality setting, Flashes rules, round lights, the readability layer.
- **075:** the posed muzzle (its world point, from the rig) and its flash.
- **076:** `PARTICLE_BUDGET`, `DEATH_MOTES.liveCap`, the death motes in `Particles`, `ui().particles`.
- **077:** `WEATHER_CAP`, the weather's budget gate, `DEPTHS.weather`.

The build starts once 076 and 077 are on main. If either is still unmerged then, the build merges its branch in first and says so in the PR.

## Rules for this spec
1. **Visual only.** No sim rule, hitbox, speed, range, timing, spawn point or event changes. No file under `src/sim` changes. `SAVE_VERSION` stays at main's. `getState()` includes the tick's events, so 078 adds no event field either; render works out which round made which hit (see "Impacts").
2. **Data by row.** A round's look is composed from four kinds of data rows: its family, its element, its shape and its tier. A new ammo, tag or tier gets its look by adding one row. Render has no per-ammo code.
3. **One shared particle budget.** Death motes (076), weather (077) and everything else (078) draw from one budget through one seam (see "The particle budget").
4. **Readability first.** The player's trails, smoke and marks never hide an enemy telegraph or an enemy (see "Draw order").
5. **No per-frame allocation per projectile.** Particles, trail slots and ground marks are pooled.
6. **Hit feedback is unchanged** (Shaun: "fine how it is for now"). 078 adds no hit-stop and no shake. Today's hit flash, damage numbers, hit sounds and 014's 50 ms sprite hold (`HIT_STOP_MS`) stay as they are.
7. **Shading.** Projectile bodies are drawn in the pushed look: soft gradients lit from the top left, 075's `rim` style on lit edges, and the thin ink outline. Glows, trails, particles and marks have no outline.

## Projectile bodies
The four bodies, the Shard and the bomblet are redrawn in the pushed look. Their boxes, anchors and sizes don't change.
- **Arrow** (`arrow`): a `wood-light` to `wood` shaft, `rust-light` and `rust` fletching, a knapped `rock-pale` to `rock` head with a `snow` rim. The faint cyan line baked behind it today goes; the trail now comes from data.
- **Ley bolt** (`ley-bolt`): a `cyan-glow` to `cyan` diamond head with a `snow` rim and its glow. The baked tail line goes; the ribbon replaces it.
- **Bomb** (`bomb`): a `rock` to `rock-dark` sphere lit from the top left with a `rock-pale` rim, the `cinder` band, the fuse and its `cinder-light` spark.
- **Landmine** (`landmine`): today's disc with a gradient and a rim.
- **Shard** (`shard`): a sliver with a gradient and rim. Its Cold version keeps 039.3's ice art.
- **Bomblet:** today's pellet with a gradient and rim.
- **Tiers** recolour the new bodies by 062's `TIER_ART` swaps, as today. Elements tint them as today (`ROUND_LOOKS`' `tint`).

## How a round's look is composed
`roundFx(ammoId)` is a pure function in render. It reads the rows in this order:
1. **Family:** the trail's kind and length, the impact's kind, the muzzle sparks and the base colours.
2. **Tier:** the trail's core colour and the glints added to impacts and the muzzle.
3. **Element:** the trail's colour, its extra shed bits, and the colours added to impacts.
4. **Shape:** changes to the path or extra pieces.

In short: **the family sets the shape, the element the colour, the tier the core and glints.** So a tier shows under any element. For example, a stormsteel frost arrow has a `water-light` streak with a `storm-pale` core, frost flakes and violet glints.

A Shard or a bomblet takes its parent round's element and tier.

## The looks (data: `AMMO_FX` in `src/data/ammoFx.ts`)
Particle counts are for Medium. Low uses ×0.5, rounded down, with at least 1 for an impact. High uses ×1.25, rounded. Lengths are world px. "Soft" bits are the first to be dropped under load (see "Priorities").

### Families
| Row | In flight (trail) | Impact | End without a hit (wall or range) | Muzzle | Colours (palette ids) |
| --- | --- | --- | --- | --- | --- |
| **Arrow** (`arrow`) | **Streak:** a thin speed line 28 px long, 1.4 px wide, tapering to nothing, alpha 0.55 | **Splinter:** 5 chips flung on through the hit along the flight (60° cone); a white tick (a 6 px slash, 80 ms). It plays on every enemy a piercing arrow passes. | 2 dust chips at its ground point | 3 sparks forward (20° cone) | trail `rock-pale`, core `snow`; chips `wood-light` `rock-pale` `snow`; dust `dirt-light` `dirt` |
| **Ley bolt** (`ley-bolt`) | **Glow ribbon:** 22 px long, 3 px wide, additive on Medium and High; sheds a soft mote every 80 ms (High: 40 ms), 300 ms life | **Ley splash:** a ring of light (10 px, 2 frames over 120 ms); 6 sparks all round; a splash mark on the ground (12 px, alpha 0.25, 500 ms) | the ring at 0.6× and 3 sparks | 4 sparks forward | ribbon `cyan`, core `cyan-glow`; sparks and motes `cyan-glow` `cyan`; mark `cyan` |
| **Bomb** (`bomb`) | **Fuse smoke:** a soft puff from the fuse every 60 ms (High: 40 ms), 2 px growing to 5 px, alpha 0.35, 500 ms, rising 10 px/s; the fuse spark glints. No ribbon. | **Blast:** today's burst flash at its real radius (kept); a shock ring on the ground growing to the radius over 150 ms (alpha 0.5); a scorch mark (0.6 × the radius, alpha 0.35, fading over 1.5 s); 10 debris and 6 smoke puffs rising. It replaces today's 44 `embers`. | n/a (a bomb always bursts) | a launch puff: 3 smoke and 2 sparks | smoke `ash-light` `ash-pale`; spark `cinder-light`; ring `rock-pale`; scorch `ash-dark`; debris `rock-dark` `rock` `dirt` |
| **Landmine** (`landmine`) | **Tumble:** the body turns 1.5 times a second in flight, with no trail. Landing (it arms): 4 dust chips. Armed: today's ring, unchanged. | **Mine blast:** today's mine flash (kept); a tight shock ring to its radius; a scorch mark; today's `mineShards` at 14; 3 smoke | n/a | as the bomb's | shards `iron-light` `iron` `cyan-glow` `snow`; dust `dirt-light` `dirt`; smoke, ring and scorch as the bomb's |
| **Shard** (the Split's `shard`) | today's Shard streak (`SHARD_TRAILS`), now in the shared ribbon | a flick of 3 sparks | none | n/a | ley `cyan-glow` `cyan` (an element's colours replace them) |
| **Bomblet** (the Cluster's) | the fuse spark glints, no puffs | **Mini blast:** today's bomblet flash (kept); 4 debris and 2 smoke. It replaces today's 12 `bombletEmbers`. | n/a | n/a | as the bomb's |

### Elements (tags)
| Row | Applies to | In flight | Impact (added to the family's) | Blasts (bomb, landmine, bomblet) | Muzzle | Colours (palette ids) |
| --- | --- | --- | --- | --- | --- | --- |
| **Frost** (`frost`) | every family | Body tint `foam` (today's). The trail turns frost and sheds soft flakes that drift down. | 4 ice chips that fall; a rime mark (alpha 0.3) instead of the ley splash or scorch | today's frost-tinted flash (`BURST_TINTS.cold`); cold mist instead of smoke; rime instead of scorch | its second colour `foam` | trail `water-light`, core `snow`; flakes and chips `foam` `snow` `water-light`; rime `foam` |
| **Fire** (`fire`) | every family | Body tint `cinder-light`. The trail flickers ±15% and sheds soft embers that rise. | 4 embers that rise; a small scorch | today's ember-tinted flash; darker smoke with embers; scorch at alpha 0.45 | `cinder-light` | trail `flame-dark`, core `cinder-light`; embers `cinder` `cinder-light`; smoke `ash` `ash-dark` |
| **Lightning** (`lightning`) | every family | Body tint `cyan-glow`. The trail crackles: its points jitter ±1.5 px each frame. No shed bits. | 4 fast sparks (160–300 ms); a 2-frame spark star | today's tinted flash; 4 sparks added to the smoke | `storm-glow` | trail `storm-glow`, core `snow`; sparks `snow` `storm-glow` `cyan-glow` |

Lightning arcs between enemies (064's `ArcView`, in the colours 076 leaves them) don't change. An arc's hit plays half the lightning impact.

### Shapes (tags)
| Row | Applies to | Look |
| --- | --- | --- |
| **Homing** (`homing`) | ley bolt | The ribbon is twice as long (44 px). It follows the drawn path, so the turn toward the target shows as a curving wake. Today's homing trail colours stay (`cyan`, core `cyan-glow`) unless an element sets them. |
| **Split** (`split`) | ley bolt | On a hit: today's Split star (`SPLIT_FLASH`) and the five Shards with their streaks, kept. The bolt's own impact is the ley splash. |
| **Cluster** (`cluster`) | bomb | In flight it is its bomb. At its burst: the bomb's blast, then the four bomblets (038's arcs, kept), each with its fuse glint and mini blast. |

### Tiers
A tier shows on every family it takes, with or without an element.

| Row | Applies to | Trail core | Impact (added) | Muzzle (added) | Colours (palette ids) |
| --- | --- | --- | --- | --- | --- |
| **Stone** | everything | the family's | none | none | n/a |
| **Steel** (`steel`) | arrow, bomb, landmine | a metal sheen along the streak | 3 bright glints (120–220 ms) | 1 glint | `iron-light` `snow` |
| **Glass** (`glass`) | ley bolt | clear: `snow` core, `foam` edge | 3 glass glints | 1 glint | `foam` `snow` `cyan-glow` |
| **Stormsteel** (`stormsteel`) | arrow, bomb, landmine | `storm-pale` core with a faint `storm-glow` edge | 3 violet sparks | 1 spark | `storm-glow` `snow` `storm-pale` |
| **Storm glass** (`storm-glass`) | ley bolt | `snow` core, `storm-pale` edge | 3 glints and 1 violet spark | 1 glint | `storm-pale` `foam` `storm-glow` |

- The steel bomb's and landmine's smoke and fuse don't change; the tier shows in the body (062's recolour), the glints and the shock ring's core.
- **No row uses `danger` or `hit-red`**, the telegraph colours. `flame-dark` appears only in the fire trail's ribbon, as it does today, and never in a mark or on the ground.

## Impacts: which round made which hit
`getState()` includes the events, so render matches impacts to rounds itself. `impactMatch.ts` is a pure function. It takes the rounds drawn last frame and this frame, and this frame's events.
1. **Bomb bursts** (`bursts`): a bomb that vanished this frame at the burst's point (within 1 px) gives the burst its ammo.
2. **Mine bursts:** the armed mine at that point, which MineView already tracks.
3. **Bomblet bursts:** the latest cluster burst within `CLUSTER.distance` + 2 px of it gives the element and tier.
4. **Enemy hits** (not a punch, a burn's beat or an arc): the player's straight round, live or just vanished, whose path this frame passed nearest the hit point, within the enemy's hurtbox half-size + 8 px. A burning arrow's hit through a Pool (054) also plays today's burning flash. A hit on the Forgewright's bellows matches like any other.
5. **Ends:** a straight round that vanished with no matched hit plays its family's "end" look at its last drawn point plus one frame's travel.
6. **No match** (several ticks stepped in one frame, a Pool's burst) falls back to the element's impact in today's hit colours, never to nothing.

The impact replaces today's per-element hit burst (`hitPhysical`, `hitCold`, `hitFire`, `hitLightning`) for the player's rounds. Hits on the player (`hitPlayer`), freezes, thaws and ignites keep their bursts, now under the budget.

## The muzzle
- On each `shots` event, the round's muzzle sparks fly from 075's posed muzzle (the rig reports its world point each frame), aimed down that shot's lane. They go alongside 075's flash; 074's muzzle light is unchanged.
- **075.10:** each new round's trail starts at the drawn muzzle, so for its first frames the streak runs from the tube to the round as it leaves. The sim's spawn point (`MUZZLE_OFFSET`) is unchanged, and 075.10 stays raised for Shaun.
- With Flashes off, the sparks still fly; 042.10's muzzle-flash rule is unchanged.

## Machine sparks and ambient motes
- **Machine sparks:** when a foundry machine finishes a craft (where today's `craftPuff` plays, which stays), it spits 4 sparks from its mechanism window.
  - The colours come from its build group (`MACHINE_SPARKS.byCategory`): arrows `brass-light` `wood-light`; bombs `cinder-light` `brass-light`; ley `cyan-glow` `cyan`; mines `iron-light` `brass-light`; forge `cinder-light` `cinder` `brass-light`.
  - A stage machine takes its tag's element colours (frost, fire, lightning), or `cyan-glow` `cyan` for homing and split, or `cinder-light` `gold-trim` for cluster.
  - The Tempering coil uses `storm-glow` `snow` (`byPiece`).
  - Logistics pieces have none. A new machine gets its sparks from its group's row.
  - 079 owns the foundry's heat, steam, glow and ley pulses.
- **Ambient motes:** in the overworld, 077's weather is the ambient motes. In the foundry and other rooms, 014's 18 room motes stay as they are and count under the weather share (rooms have no weather). 079 retunes the foundry's.

## The particle budget (the seam)
076 sets the total (`PARTICLE_BUDGET`) and the death motes' live cap. 077 sets the weather's cap. 078 takes what's left and puts every particle under one ledger.

| | Low | Medium | High |
| --- | --- | --- | --- |
| Total live particles (`PARTICLE_BUDGET`, 076) | 150 | 300 | 500 |
| Death motes (`DEATH_MOTES.liveCap`, 076) | 60 | 120 | 200 |
| Weather, and room motes indoors (`WEATHER_CAP`, 077) | 40 | 100 | 160 |
| **Effects (078): impacts, blasts, muzzle and machine sparks, trail bits, and every 014 burst** | **50** | **80** | **140** |
| Effect count scale | ×0.5 | ×1 | ×1.25 |

**The seam:** `src/render/particleBudget.ts`.
- One `ParticleLedger` per scene holds the live count of each kind (`death`, `weather`, `effect`). `Particles` (076's death motes and every burst) and 077's `WeatherView` report into it.
- One function, `roomFor(kind, priority, quality)`, answers how many a kind may spawn now: its share less its live count, and never more than the total budget less every live particle.
- `PARTICLE_SHARES` in `src/data/juice.ts` derives the effect share: `PARTICLE_BUDGET − DEATH_MOTES.liveCap − WEATHER_CAP`. It is not a new number, so retuning 076 or 077 retunes 078.
- 077's `WEATHER_BUDGET` mirror (077.1) goes. Weather's gate (`budgetRoom`) and 076's `waveCount` both call `roomFor`, and they give the same counts as before.
- A data test checks that on every tier the three shares sum to the budget and none is negative.
- **No borrowing.** A share's unused room isn't lent to another kind, so a busy fight can't crowd out the weather or deaths, and effects stay light.

### Priorities inside the effect share (`FX_PRIORITY`)
A burst is thinned to the room its priority leaves, like 076's death motes.
- **Cue** (up to 100% of the effect share): enemy and boss attack bursts and hazards, plus a hit on the player and a shot ringing off a shield. These are `enemyBurst`, `poundDust`, `stompDust`, `waveSpray`, `chargeDust`, `chargeImpact`, `rippleDust`, `eruption`, `bashSpark`, `boltFlash`, `ventFlare`, `slamDust`, `floodFlare`, `bellowsBurst`, `rodStrike`, `barrierShards`, `blockSpark` and `hitPlayer`.
- **Shot** (only while the effect share is under 85% full): 078's impacts, blasts and muzzle sparks, freezes, thaws, ignites, machine sparks, harvests, pickups and the foundry's bursts (`craftPuff`, `refill`, `capLift`, `schematic`, `place`).
- **Soft** (only while it is under 50% full): trail bits (ley motes, frost flakes, embers, fuse smoke), landing dust, `footDust` and `rollDust`.
- A data test checks that every `PARTICLES` key and every 078 burst has a priority.

## Graphics quality (074's setting)
| | Low | Medium | High |
| --- | --- | --- | --- |
| Effect share | 50 | 80 | 140 |
| Count scale (078's looks and 014's bursts) | ×0.5 | ×1 | ×1.25 |
| Trails (ribbons, not particles) | on, at most 24, one colour (no core) | on, at most 48, colour and core | on, at most 96, colour, core and a soft glow edge |
| Trail bits (soft) | none | every 80 ms (smoke 60 ms) | every 40 ms |
| Ground marks (scorch, rime, splash) | at most 6 | at most 12 | at most 24 |
| Additive particles and ribbons (ley, lightning, embers) | no | yes | yes |
| Lights on rounds (074's `ROUND_LIGHTS`) | none | none | yes, unchanged |

- A round past the trail cap flies with no trail. A round keeps its slot until it ends and its trail fades (120 ms).
- When marks are full, the oldest mark is recycled first.
- A tier change applies at once. Pools only grow, so switching to High mid-fight allocates once, then never again.

## Flashes off (042.10, 074.3)
- 078 draws none of its flashes: the impact ring, the arrow's tick or the lightning spark star.
- Nothing flickers or jitters: fire trails are steady and lightning trails don't crackle.
- Particles, trails and marks still show.
- Today's rules for the burst, muzzle and Split flashes are unchanged.

## Draw order
From the ground up:

| Depth | What |
| --- | --- |
| `floor` −1 to `fog` 0.3 | the ground, 074's pools, glows, 077's decor and fog (unchanged) |
| **`shotMark` 0.35 (new)** | 078's ground marks: scorch, rime, ley splash, shock rings |
| **`shotTrail` 0.45 (new)** | every trail ribbon and every lingering bit: fuse smoke, blast smoke, frost mist, flakes, embers, ley motes |
| `groundFx` 0.5 | enemy telegraphs (and the player's own mine rings) |
| sorted by feet | enemies, the player, props, enemy rounds, and the player's round bodies (as today) |
| behind the struck enemy (its feet − 0.5) | impact chips, sparks and glints (at most 400 ms) |
| `DEPTHS.weather` (077), world UI | weather, health bars, names, damage numbers (unchanged) |

- **Anything from the player's shots that lasts longer than 400 ms draws under the telegraphs**, and under everything standing. So smoke, mist and marks can never cover a telegraph, an enemy, its wind-up or an enemy round.
- Short sparks sort just behind the enemy they struck, so they never cover its body or wind-up pose. Ends and blasts sort at their ground point.
- Today's blast flashes and 075's muzzle flash keep their depths and timings (hit feedback is unchanged).
- Trails, particles and marks draw in their own colours in every mood, not lit or tinted, like 077's weather (077.10). They are on the world camera only.

## Per-frame cost
- **Particles:** `Particles` becomes a pool. Its game objects and records are made once, up to the tier's high-water mark (death cap + effect share). The pool reuses them (hidden, not destroyed) through a swap-remove live list. Emitting a burst makes no object, array, closure or tween.
- **Trails:** one Graphics at `shotTrail` is redrawn each frame from pooled trail slots. Each slot is a fixed `Float32Array` ring of at most 24 points, cut to its trail's length. This replaces today's Graphics per trail and the per-frame `push`/`shift` of point arrays in ArrowView.
- **Marks:** a fixed pool of images at `shotMark`.
- **Projectile bodies** are still made when a round spawns (as today). Nothing is allocated per projectile per frame. The test hook's counters may allocate when they're read.
- **How in Phaser 4** (from .claude/skills/phaser): a `ParticleEmitter` pools internally (077 uses one per weather layer), but an emitter has one depth and one blend mode, and 078's sparks need per-burst depths. So the default is the pooled `Particles` above. The plan may group bursts by band into emitters if that measures faster. Either way, the no-allocation test holds.

## Acceptance criteria
- [x] **Every round has a look:** `roundFx` resolves every id in `AMMO` (the four bases and every tagged and tiered round in `ROUNDS`), plus the Shard and the bomblet, to a full look (trail, impact, end, muzzle). Every colour is a palette id, and none is `danger` or `hit-red`.
- [x] **Distinct:** the four families differ in trail kind and impact kind. Each element changes the trail colour. Each tier changes the trail core and adds its glints. Two rounds that differ in family, element or tier never get the same look.
- [x] **Data rows:** a test adds a made-up tag row (and a tier row) to a copy of the tables, and `roundFx` gives its rounds a look with no code change.
- [x] **In the game:** in the sandbox, firing each family shows its trail kind (`ui().ammoFx.trails` by kind), its impact on a Husk and its muzzle sparks. A frost, a fire and a lightning round each show their colours. A steel and a stormsteel arrow, and a glass and a storm-glass bolt, show their glints. A homing bolt's wake curves. A Split shows its star and Shards. A cluster bomb shows four mini blasts.
- [x] **Impacts matched:** unit tests of `impactMatch` cover a pierce through three enemies, two rounds hitting one enemy in a frame, a bomb burst, a mine burst, bomblets, a wall end, a range end and the no-match fallback.
- [x] **Budget:** live effect particles never exceed the tier's effect share; the total never exceeds `PARTICLE_BUDGET`; death motes and weather stay within their caps. This is checked every frame in Playwright on each tier, in the Hollows dust, while a five-entrance volley of bombs and arrows hits a pack and 10 enemies die at once (076's and 077's check, extended).
- [x] **Priorities:** unit tests show soft bits stop at 50% of the share, shot bursts at 85%, and cues use the rest. A Bulwark pound during a full volley still throws its dust.
- [x] **One seam:** 076's death motes and 077's weather spawn through `roomFor`, with the same counts as before in their own unit tests. `WEATHER_BUDGET`'s mirror is gone. The shares sum to the budget on every tier.
- [x] **Pooled:** after a one-second warm-up, a 10-second five-entrance fight on High creates no new particle objects, trail slots or marks (`ui().particles.pool.created` and `ui().ammoFx.slots.created` don't change). A unit test emits and expires 10,000 particles through a pool of fixed size.
- [x] **Readability:**
  - with a volley of every family firing over a Husk's swipe telegraph, the telegraph's reddest pixels are at least 85% as red as with no volley (074.11's method);
  - unit tests check that every lingering look draws under `groundFx`, and that impact sparks sort behind the struck enemy;
  - review shot 09 shows it.
- [x] **Muzzle:** sparks start at 075's posed muzzle point (within 1 px), aimed down the shot's lane. A new round's trail starts there. `MUZZLE_OFFSET` is unchanged.
- [x] **Quality:** each tier's trail cap, colours, trail bits, mark cap, additive blending and count scale hold (`ui().ammoFx` and `ui().particles` per tier), and a tier change applies at once.
- [x] **Flashes off:** no 078 flash, no crackle and no flicker; particles, trails and marks still show.
- [x] **Hit feedback unchanged:** a scripted hit shows the same flash ticks, damage number and 50 ms sprite hold as before. No shake is requested (`SHAKE_ON` stays false).
- [x] **Sim untouched:** the same seed and commands give the same `getState()` (events included) with 078 on and with the dev `?fx=off` flag, and on Low and High. No file under `src/sim` changes, and `SAVE_VERSION` is main's.
- [x] **Performance:** in the Low probe (`PROBE=1`, a five-entrance fight in the Stormcrown, interleaved A/B against `?fx=off`), Low's mean frame time is at most 1.1× and its ticks per second at least 0.9×. Medium and High timings are reported in the PR. newGameAfterQuit and waypointSteady pass.
- [x] **Older tests:** ArrowView's hook fields (`trails`, `shards`, `burning`) keep their meaning, and the older ammo e2e files pass unchanged.
- [x] **Docs:** art.md gains "Ammo and particles": the composition rule, the tables, the budget and its seam, and the draw order.
- [x] **Review shots (docs/review/078):**
  - 01: each family in flight and its impact, on Medium (stone);
  - 02: each element on an arrow and on a bomb;
  - 03: each tier on each family it takes;
  - 04: a homing bolt's curve;
  - 05: a Split's star and Shards;
  - 06: a cluster bomb's bomblets;
  - 07: a landmine's burst;
  - 08: the same volley on Low and High;
  - 09: a volley over a telegraph;
  - 10: machine sparks in the foundry;
  - 11: the contact sheet's projectile bodies at 4×.

## Data changes
- `src/data/ammoFx.ts` (new):
  - `AMMO_FX` with `families`, `elements`, `shapes` and `tiers` rows (trail kind and numbers, impact, end, muzzle, palette ids);
  - `FX_PRIORITY` (each `PARTICLES` key and 078 burst: `cue`, `shot` or `soft`), with thresholds 1, 0.85 and 0.5;
  - `FX_QUALITY` (scale, trail cap, trail bits' rate, mark cap, additive), `TRAIL_POINTS` (24);
  - `MACHINE_SPARKS` (`byCategory`, `byPiece`).
- `src/data/juice.ts`: `PARTICLE_SHARES` (derived). The bomb's `embers` and the bomblet's `bombletEmbers` uses go (their entries stay if anything else uses them).
- `src/data/weather.ts` (077): `WEATHER_BUDGET` reads `PARTICLE_BUDGET` and `DEATH_MOTES.liveCap` instead of mirroring them.
- `src/data/assets.ts`: `DEPTHS.shotMark` 0.35 and `DEPTHS.shotTrail` 0.45, and the mark texture keys.
- `src/data/art/sprites.ts`, `mines.ts`, `stageAssets.ts`: the redrawn bodies (same keys and boxes). 062's tier recolours pick them up.
- `ROUND_LOOKS`, `SHARD_TRAILS` and `BURNING_LOOK.trail`: their trail colours move into `AMMO_FX` rows; the body tints stay.
- No sim, palette, event or save changes.

## Render changes
- `src/render/fx/`:
  - pure: `roundFx`, `impactMatch`, `particleBudget` (`ParticleLedger`, `roomFor`);
  - Phaser: `TrailView` (one Graphics, pooled slots), `MarkView` (pooled marks), `ShotFxView` (muzzle sparks, impacts, ends, blasts, from events and the match).
- `Particles` becomes the pool and reports to the ledger. Its bursts take a priority and the tier's scale.
- ArrowView, BombView and MineView hand their rounds to `TrailView` and the matcher, and drop their own trail Graphics. FeelView, mineFeel and the enemy feel files route their bursts through the ledger.
- The wanderer's rig reports the posed muzzle's world point.
- The test hook gains `ui().ammoFx` (trails by kind, slots, marks, the last impacts by look) and the extended `ui().particles` (`live`, `deathMotes`, `weather`, `effects`, `byPriority`, `pool`), plus a dev `?fx=off`.

## Out of scope
- The rest of the art pass:
  - 079: the foundry's mood, heat, steam and ley pulses;
  - 080: boss intros, the spawn shake and phases;
  - 081: the HUD.
- Already done elsewhere:
  - death motes and dissolves (076);
  - weather and the overworld's ambient motes (077);
  - the wanderer's muzzle flash (075).
- Enemy rounds' looks, telegraphs and enemy attack bursts. They come under the budget, but their looks don't change.
- Any change to hit feedback (hit-stop, shake, flash, numbers), lights (074's `ROUND_LIGHTS` stays), sounds, or the sim's spawn point (075.10).
- A target lock marker for homing, which would be new design.

## Test plan
- **Unit (tests/render, Vitest):**
  - `roundFx` for every id in `AMMO`, the Shard and the bomblet: complete, palette ids, no telegraph reds, and distinct by family, element and tier;
  - a made-up tag and tier row;
  - `impactMatch` (the cases in the criteria);
  - `particleBudget`: shares, `roomFor`, priority thresholds, no borrowing, and the same counts as 076's `waveCount` and 077's `budgetRoom`;
  - the pool (fixed size over 10,000 emits);
  - trail slots (ring buffer, length cut, cap, fade);
  - the mark cap and recycling;
  - quality scaling;
  - Flashes-off looks;
  - the draw-order depths.
- **Data tests:** every `PARTICLES` key has a priority; every colour is a palette id; the shares sum to `PARTICLE_BUDGET`; every machine category has sparks.
- **Playwright** (tests/e2e/ammoFx.spec.ts, ammoFxBudget.spec.ts):
  - each family, element, shape and tier in the sandbox;
  - the budget stress on each tier;
  - priorities under load (a Bulwark pound in a full volley);
  - pool stability;
  - the telegraph redness check;
  - the muzzle point;
  - Flashes off;
  - hit feedback unchanged;
  - the same `getState()` with fx on and off, and on Low and High.
- **Probe:** tests/e2e/ammoFxProbe.spec.ts (`PROBE=1`), the Low A/B. Its numbers go in the PR, as 074.4 does.
- **Kept green:** lighting.spec.ts (074), the 075 wanderer specs, the 076 enemy specs, worldWeather.spec.ts (077), art.spec.ts, the older ammo e2e files (stages, mines, tiers, keystones), newGameAfterQuit.spec.ts, waypointSteady.spec.ts, and the e2e files the change touches. The full suite runs in CI.
- **Review shots:** as listed in the criteria.

## Decisions in this draft
For Shaun's OK at the playtest; the conservative choice is what gets built.
- **The family sets the shape, the element the colour, the tier the core and glints.** A new ammo, tag or tier is one data row.
- **Arrows streak, ley bolts glow, bombs smoke and blast, landmines tumble.** A landmine has no trail in flight, so it reads apart from a bomb, and it throws dust as it arms.
- **Impacts replace today's per-element hit bursts** for the player's rounds. The flash, damage numbers, hit sounds and the 50 ms hold stay. There is no new hit-stop and no shake.
- **The bomb's blast** keeps today's flash and swaps the 44 embers for debris, smoke, a shock ring and a scorch.
- **Impacts are matched in render**, since `getState()` includes events and the sim stays untouched. A miss falls back to the element's look.
- **075.10:** sparks fly from the drawn muzzle, and the trail bridges the gap to the round. The spawn point stays.
- **One budget, three fixed shares**, with no borrowing: deaths 60/120/200, weather 40/100/160, effects 50/80/140. Effects are derived, not a new number.
- **Priorities inside the effect share:** cues 100%, shots 85%, soft bits 50%. So enemy attack cues show even in a full volley.
- **Every 014 burst** comes under the budget, scaled ×0.5, ×1 and ×1.25. Medium matches today's counts.
- **Draw order:** anything from the player's shots that lingers over 400 ms draws under telegraphs and everything standing. Impact sparks sort behind the enemy they struck.
- **Trails are ribbons, not particles**, capped at 24, 48 and 96. Low draws them in one colour.
- **Marks** (scorch, rime, splash) are capped at 6, 12 and 24, and draw in their own colours in every mood.
- **Machine sparks** come by build group and stage tag on each finished craft. `craftPuff` stays, and 079 does the rest of the foundry.
- **Room motes** stay as 014's, under the weather share indoors. 079 retunes the foundry's.
- **Lights on rounds** stay as 074 has them (High only, by element; plain arrows and bombs none).
- **Flashes off** drops 078's flashes, crackle and flicker, and keeps particles and trails.

## Open questions
None.

## Results
Built on `claude/078-ammo-visuals` (PR #96) to docs/plans/078-ammo-visuals.md. 074, 075, 076 and 077 are not on main yet, so the branch merged all four first (`078: merge 074` … `078: merge 077`); 078 merges after them. No file under `src/sim` changed (`git diff` of `src/sim` since the merges is empty) and `SAVE_VERSION` stays at main's: nothing in the save changed.

- **Data:** `src/data/ammoFx.ts` (`AMMO_FX`: six family rows, three element rows, three shape rows, four tier rows), `src/data/fxQuality.ts` (`FX_PRIORITY`, `FX_THRESHOLDS`, `FX_QUALITY`, `FX_LOOK`, `MACHINE_SPARKS`), `PARTICLE_SHARES` in juice.ts (derived from `PARTICLE_BUDGET`, `DEATH_MOTES.liveCap` and `WEATHER_CAP`), `DEPTHS.shotMark` 0.35 and `shotTrail` 0.45 and `SHOT_FX_TEXTURES` in assets.ts. `WEATHER_BUDGET` is gone (its readers use the shares). The trail colours left `ROUND_LOOKS`, `SHARD_TRAILS` and `BURNING_LOOK` (their body tints and the burning tip stay). The arrow, ley bolt, bomb, landmine, Shard and bomblet are redrawn in the pushed look (same keys, boxes and anchors); 062's tier swap now recolours a rim too.
- **Render:** `src/render/particleBudget.ts` (`roomFor`, `ParticleLedger`, one per scene); `src/render/fx/`: pure `roundFx`, `impactMatch`, `fxPool` (the pool, the trail ring, the mark ring), `machineSparks`; Phaser `TrailView`, `MarkView`, `ShotFxView` (with `shotTracks`, `shotTextures`, `drawShots`). `Particles` is a pool of tinted dot and puff images reporting to the ledger, thinned by kind and priority and scaled by tier; 076's `waveCount` and 077's `budgetRoom` call `roomFor`; the weather and 014's room motes report to the ledger. ArrowView hands each round's look and point to the trails; BombView tumbles landmines. FeelView and mineFeel hand the rounds' hit bursts, the bomb's embers and the mine's and bomblets' bursts to the shot effects (a punch keeps its burst; every sound, number, hold and shake request stays). Enemy attacks played with another key's burst (a thunderhawk's dive, a mite's zap, a gale ram's gust, a cinder mote's burst, a vent's flare) pass `cue`. The rig reports its posed muzzle. `GameScene` clears the frame's events at the end of the draw, after the shot effects. The hook gains `ui().ammoFx`, `ui().hitFeedback`, the extended `ui().particles`, `fxOff()` and `loadEntrances()`, and dev `?fx=off`.
- **Unit tests** (tests first): `npm run check` green, 342 files, 2923 tests with 076's latest merged in (40 new: tests/data/ammoFx; tests/render/roundFx, impactMatch, particleBudget, fxPool; 076's and 077's budget tests read the seam).
- **e2e** (each file alone, `--workers=1`, port 5344): tests/e2e/ammoFx.spec.ts (8 tests: each family's trail kind, impact and muzzle sparks and a landmine's landing dust; each element's impact and each tier's glints; homing's bend, the Split's star and five Shards, a cluster's blast and four mini blasts; the sparks from the posed muzzle within 1 px; Flashes off; hit feedback; each tier's caps, trail bits and a live tier change; the same `getState()` with the effects on, `?fx=off`, Low and High over 240 ticks of a five-round fight) and ammoFxBudget.spec.ts (4 tests: the volley into a ten-strong Hollows pack in the dust, ten killed at once, every frame on each tier; a Bulwark's pound in a full volley on Low throws its dust (cues 43 live while effects held the share's 50); no new particle, trail slot or mark over ten seconds of a High fight after a second's warm-up (340, 120 and 56 made); the telegraph's reddest pixels 68.2 with a volley against 70.7 without, 96%), green. Kept green locally, each alone: ammoStages, mines, materialTiers, stormsteel, readability054, fire, lightning, firing, spread, volleyShape, worldWeather (its 10-kill check on the ledger's rule), lighting, enemyDeaths, enemyPolish, wanderer, art, sandbox, talents, worldLife, melee, death, newGameAfterQuit, waypointSteady. The full suite runs in CI.
- **Performance** (ammoFxProbe.spec.ts, `PROBE=1`, headless Chromium on its software renderer, 1280×720, a shared 4-core machine, load average about 3; medians of 2.5 s windows, the A/B interleaved 6 rounds; a five-entrance volley of tagged and tiered rounds into a Stormcrown pack, 16–20 impacts a window):

| Stormcrown five-entrance fight | effects off (Low) | Low | Medium | High |
| --- | --- | --- | --- | --- |
| ms a frame, mean / p95 | 53.8 / 60.8 | 54.0 / 62.5 (tier run 53.2 / 59.3) | 60.3 / 70.7 | 164.7 / 185.0 |
| ticks a second | 60.1 | 59.9 | 59.9 | 57.7 |

  Low against the effects off: 1.00× the frame time (budget 1.1×), 1.00× the ticks a second (budget 0.9×); an earlier run read 1.08× and 0.99×. High's cost is 074's per-pixel lights (its Stormcrown fight read 385 ms then); the effects' share of it is small. newGameAfterQuit and waypointSteady pass.
- **Motion check** (Playwright's fake clock, 30 frames over a second, two ticks a frame: 20–26 in docs/review/078): an arrow volley, a ley bolt, a bomb's arc and blast, frost, homing, a Split and the tiers, and in the build fire, lightning, a cluster and a landmine. Nothing frantic: streaks and ribbons trail smoothly behind their rounds and fade as they land, the landmine turns 18° a frame, smoke rises slowly, the lightning crackle is a fine shimmer. Revised after the first strips: the ley ribbon read white on sunlit ground (additive cyan), so its colour now lies flat and only the core and edge add light; impacts were hidden at the struck enemy's middle behind its body, so they now play where the round's path meets the hurtbox's near side; a blast's smoke and debris were too faint to read, so they're a little larger and longer.
- **Review shots** (docs/review/078): 01 the families in flight, landing and a bomb's blast; 02 the elements on arrows (in flight) and bombs (blasting); 03 the tiers in flight and landing, and a steel bomb's blast; 04 a homing bolt's curve; 05 a Split's star and Shards; 06 a cluster bomb's bomblets; 07 a landmine's burst; 08 one volley on Low and on High; 09 a volley over a Husk's telegraph; 10 machine sparks on the steel arrow line; 11 the projectile bodies at 4×; 20–26 the motion strips.

## Raised after the build
Conservative choices built; items marked **(Shaun)** want a yes or a change at the playtest.

- **078.1 Weather keeps its own share (no borrowing).** 077 gated weather on "the budget less the death motes' room less everything alive", so a fight's bursts could crowd it out. Through `roomFor` it now spawns up to its own share (its cap) less the live weather, never past the budget less everything alive; the counts are the same whenever deaths and effects together stay within the effect share (unit-tested). 077's `budgetRoom` unit test and its 10-kill e2e check read the new rule; the e2e's "weather gated at least once on Low" can't happen any more (deaths and effects have their own room) and is replaced by every frame within the budget.
- **078.2 Impacts read as sparks round the struck enemy (Shaun).** As the spec orders, impact sparks sort just behind the enemy they hit, and the sim's hit flash turns its body white for a few frames, so a hit reads mostly as chips and sparks flying out from behind it and the mark under it. Impacts play where the round's path meets the hurtbox's near side (the spec doesn't say), so they aren't all hidden at the body's middle. If Shaun wants impacts bolder, sparks could draw in front for their first 100 ms.
- **078.3 Glass and storm-glass bolts share a `snow` core on Medium (Shaun).** The spec gives both tiers a `snow` core with different edges, and the edge shows on High only, so on Medium the two trails match; they differ by their bodies and glints. A `foam` edge for glass on Medium too would tell them apart.
- **078.4 Ribbons: the colour lies flat, the core and edge add light (Shaun).** The spec has ley and lightning ribbons additive on Medium and High; drawn wholly additive, a ley ribbon over Region 1's sunlit ground washed out to white. Now the colour pass is plain and the core and High's edge are additive, so a ley ribbon stays cyan with a glowing core.
- **078.5 Particles are soft round dots (Shaun).** 014's particles were square; in the pushed vector look they're now tinted round dots (a soft puff for smoke and mist, growing as it rises), for every burst, 014's included. Counts and timings are 014's on Medium. 076's death motes stay its crisp squares (its mote-colour check reads their exact pixels; as round dots their soft edges let a dissolving body's gold outnumber them on CI).
- **078.6 A fire ley bolt's body reads yellow-green.** Its tint (`cinder-light`, as today, 060) multiplies the cyan body. Untouched (bodies tint "as today"); worth a look with the fire trail behind it.
- **078.7 Machine sparks leave from a fixed height** (`MACHINE_SPARKS.windowLift`, 14 px over the machine's front edge), which sits in a 1×1 machine's window and at the front of a 3×1 one; 079 owns the rest of the foundry.
- **078.8 Test changes from the spec.** The arrow in flight's pinned fingerprint (021's playtest-fixes test) moves to the redrawn arrow (the icons stay pinned). The hook gains `loadEntrances` (a five-entrance volley outside the sandbox, for the dusty Hollows check and the probe), `fxOff` and `ui().hitFeedback`.
- **078.9 Shards' tier.** A Shard's state carries its element but not its tier; render gives the Shards that appear where a Split round ended that round's tier (stone if none ended near).
