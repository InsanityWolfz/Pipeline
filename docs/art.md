# Art spec

Locks the look so every sprite matches. Approved by Shaun before any sprite goes in.

Since 016 the game is drawn in **clean vector art**, chosen by Shaun from a three-way style test (`docs/art/style-test.html`). Since 020 everything is: the player and combat, the overworld, the foundry interior, its machines and pieces, every item and the HUD. There are no pixel sprites.

## Style
- **View:** three-quarter top-down. You see the tops and fronts of things. Pure art convention, no 3D.
- **Look:** smooth shapes with one shared ink outline, soft gradients and glows, sharp at any screen size. Since the art pass (074–081, Shaun, 2026-10-27) it is clean vector **pushed further**: soft gradients lit from the top left, a rim light on lit edges, glows and shadows; no pixel art and no painted textures. The "Vector, pushed further" and "Ley-lit" cards of `docs/art/style-test-2.html` are the target.
- **Mood per region (074):** Region 1 is sunny and bright (Realm of the Mad God), Stonefall Hollows dusky, the Emberworks orange through smoke, the Stormcrown dark, lit by ley lines and lightning (Hollow Knight). See "Light and region moods" below.
- **Light:** from the top left. Top and left edges are lit; bottom and right edges and cast shadows are darker.
- **Scale:** 32-pixel tiles in world px. The wanderer is about 42 px tall; a Husk about 38 and the Warden about 60.
- **Resolution:** the camera shows 640×360 world px at a whole-number zoom, but the canvas draws at the device's real resolution. Vector frames are drawn into textures at boot at that scale (up to 4 texels per world px), and text renders at it too.
- **Outline:** characters, enemies, projectile bodies and props get the `ink` outline (`OUTLINE_WIDTH`, 0.75 world px). Glows, particles and shading inside a shape don't.
- **Accent:** ley-line cyan marks magic: the tube, the hose, the tank window, the wanderer's face glow, ley bolts and runes. Wisps are violet and fire is ember, so neither reads as ley.
- **Theme rule:** lost magical civilization. Rune-carved stone, glowing ley lines, brass and crystal. Nothing modern.

## Light and region moods (074)
Render only: lights and moods never feed the sim, and the sim never imports them.
- **Two layers.** The **world layer** (the ground, trees, rocks, ruins, region props, nodes, landmark dressing, pylons and fixtures) takes the region's mood and is lit by lights. Views register those objects with `WorldLayer` (`src/render/lighting/`) as they make them. The **readability layer** is never darkened: enemies, bosses and their parts, every telegraph and wind-up, rounds, ground items, the player, health bars, name tags, prompts, waypoints, damage numbers, the HUD and menus draw at full daylight colour in every region. Lights reach it only as the **light catch**: an additive copy of its frame in the light's colour, at most 0.35 alpha, from the two nearest lights at its feet.
- **Moods** (`src/data/moods.ts`, `REGION_MOODS` by danger ring): an ambient (a palette colour and a darkness: 0 white light, 1 the colour), a screen wash (at most 0.06 alpha, under the HUD), a ground fog (colour, alpha and drift) and a light scale (daylight drowns lights, the dark lets them read). Region 1's rings share the sunny mood; the dark regions follow the "Ley-lit" card of `docs/art/style-test-2.html`. The mood follows the camera's centre and blends over 4 tiles each side of a region's edge (48, 79 and 110 tiles out). The sandbox is sunny; the foundry keeps its own warm tint until 079.
- **Lights** (`src/data/lights.ts`): the wanderer's face glow (flaring on each shot), the muzzle flash, blasts, the Conductor's and the Forgewright's attacks, lightning on a storm rod, fires (flaring vents, burning ground, braziers, the Emberworks' kiln mouths and chimney tops), ley glows (crystals, veins, pylons, springs) and ley lines; rounds in flight on High. Ley is cyan, fire ember, lightning storm violet; nothing else glows. Render picks them by priority, then by distance from the camera's centre, up to the tier's budget, and places them: on Medium as a soft additive pool of each light's colour on the ground (`LIGHT_POOL`), on High with Phaser 4's per-pixel lights (`setLighting`). A light sits at a height of `LIGHT_Z` × its radius, so it pools softly. The overworld's ground is drawn in 160 px squares of each chunk and only the squares a light reaches are lit (the rest carry the ambient as a tint, which looks the same), so the lighting's cost follows the lights rather than the screen; on High only the props a light reaches are lit per pixel, the rest tinted, which keeps the draw calls down (a lit sprite breaks Phaser's batch). Lightning in the Stormcrown also flashes the ambient toward `storm-pale` for a moment.
- **Glow halos** (014's additive glow images) stay on every tier as the visible halo; the light adds the ground brightening round it.
- **Flashes off** (042.10): no event places a flash of light (the muzzle flash, blasts, lightning, the face glow's flare) and there is no ambient flash; fires flicker within ±15%.
- **Graphics quality** (Settings, stored in `pipeline.settings`, default Medium; the Canvas renderer runs as Low):

| | Low | Medium | High |
| --- | --- | --- | --- |
| World layer | the ambient as a multiply tint | tinted, with a light pool on the ground under each light | ground and props lit per pixel |
| Lights in view | none | up to 8 | up to 16 |
| Rounds in flight lit | no | no | yes |
| Light catch | no | yes | yes |
| Fog | off | one layer | two layers drifting apart |
| Lightning's ambient flash | no | yes | yes |

- **The ground's blending** (`GROUND_BLEND` in `src/data/art/ground.ts`, baked into the chunks): Region 1's edge with the Hollows follows the true circle as a ragged band of rounded blobs; slag and ash meet in ragged blobs too; broad soft patches 4–8 tiles across in each region's own colours; cracks with a lit lower-right lip on stone, paving, ash and slate (none on Region 1's grass); worn roads with a darker trodden centre, the ground creeping in at their edges and pebbles. It is flat paint: no collision, nothing standing, and paths and ley lines are painted over it.

## World detail and weather (077)
Render only, and decorative only: nothing here is collision, and no file under `src/sim` changed for it. Every colour is a palette id.
- **Plants** (`DECOR` in `src/data/decor.ts`, art in `src/data/art/decor*.ts`): at most 12 px tall, standing on open floor, one chance per tile by its salted `worldTileHash` (Region 1 1 in 7: grass clumps, flower clumps in `snow`, `gold-trim` and `wisp-light`, ferns at grove edges, reeds at pond rims; the Hollows 1 in 14 dry tufts and vines on 1 in 6 cliff faces over open floor; the Emberworks 1 in 24 scorched tufts and ember-thorn scrub; the Stormcrown 1 in 12 wind-bent grass). At most 80 a chunk. They lie flat at `DEPTHS.decor` (over the ground and glows, under the fog, telegraphs, items and feet), one Phaser `Layer` per ground chunk, shown only while the chunk is in view. A plant's ink outline is only on its back blades or none (ferns, vines), so a field doesn't read as ink.
- **Ground scatter** (pebbles, leaf litter, clover; quarry chips, cut flags, rust; slag drips, soot, clinker; slate shards, storm-glass glints, rain-dark patches): baked into the chunk's ground when it's built, no outline, 1 in 10 (Region 1) or 1 in 6 open tiles.
- **Kept clear** (`DECOR_CLEAR`): roads and a tile round them, boss arenas, the barrier's band, ramps and gates, 2 tiles round pylons, nodes, altars, arena doors, 072's return stones, caches, springs, the start stone and the foundry's stairs, and the Frozen Grotto.
- **Ruin variants** (`RUIN_VARIANTS`): new looks for tiles that were already solid, picked in render from the frame `pieceFrame` or a region's picker gives, keeping that frame's shadow so the footprint (059) is the same: Region 1's ruin stones (a toppled column drum, a fallen capital, a leaning rune slab, 3 in 4) and mossy boulders (1 in 5); the Hollows' rubble (a drilled cut block, a broken drum, a heap with scaffold timber, 1 in 4); a broken chimney stump (1 in 6; its fire burns low at its own lip) and a brick pile at a kiln row's east end; bent or snapped iron rods (1 in 6) and cairns with a brass plate or a storm-glass shard (1 in 5).
- **Set pieces** (`SET_PIECES` in `src/data/setPieces.ts`, art in `src/data/art/setPieces*.ts`): three per region on tiles that already stop feet and shots, the tiles under each drawing no sprite of their own: the Fallen Colossus, the Ley Tower and the Watcher; the Unfinished Giant, the Aqueduct Head and the Great Crane; the Great Furnace, the Great Crucible and the Toppled Stack; the Storm Tower, the Stormcaller and the Wind Harp. Each is a still base (it hides the player, 070's silhouette shows them), with a 4-frame loop drawn over it (the Giant's hanging block, the crane's cradle, the furnace's smoke, the harp's wires; held on Low), the Colossus's ivy swaying, and glow halos on runes and crystals. The Ley Tower's crystal is a ley light, the furnace's mouth and the crucible's glow fires (074's table). Hovering one shows its name.
- **Wind and sway** (`WIND`, `SWAY` in `src/data/ambient.ts`): one wind per region (a breeze, the Hollows' gusts, the Emberworks' still air, the Stormcrown's gale), blended with the mood. Plants, vines, trees and tree nodes turn about their foot (grass 4°, flowers 3°, ferns and reeds 2.5°, vines 3°, trees 0.6°, plus a lean downwind of a third), the phase rolling along each plant's own region's wind. Each keeps its own cycle (2.4–3.6 s, trees 4–5 s) whatever the wind: gusts and region blends change only the amplitude and lean, eased over a second, so nothing snaps or flutters. Gusts ease in and out (`GUST_EASE_MS`). Only the chunks in view are stepped, at most 300 (Medium) or 600 (High) objects a frame; nothing sways on Low.
- **Water and ley**: rings on ponds (`foam`) and springs (`cyan-glow`), up to 12 (Medium) or 20 (High, with twinkling glints); beads of `cyan-glow` running along every ley line toward the foundry (or a vein seam's pylon), one every 4 tiles (Medium, at most 24) or 3 (High, at most 48). None on Low.
- **Weather** (`WEATHER` in `src/data/weather.ts`): Region 1's pollen and ley motes (replacing 014's map-wide motes in the overworld), the Hollows' dust (faster in gusts), the Emberworks' ash and embers, the Stormcrown's rain (slanted downwind) and High's splashes. One Phaser `ParticleEmitter` per layer, its values from a seeded render-side stream; at most 40, 100 and 160 live (`WEATHER_CAP`), within the particle budget it shares with 076's death motes; Low's counts in a boss fight; crossfading at region edges (particles over a layer's new count fade out over `WEATHER_MOTION.overMs` rather than vanish, at tier changes too); drawn over everything standing and under bars, names, prompts and the HUD; never in the foundry or the sandbox.
- **Weather lightning** (the Stormcrown, Medium and High, Flashes on, never in a boss arena or fight): every 10–22 s a bolt in 064's look strikes the Storm Tower's crown when in view, else an iron rod at least 6 tiles from the player (never near a Rod Field storm rod), else a cairn or cliff top, with 074's ambient flash and rod-strike light; never a target whose bolt would run down over the wanderer or that sits under the bottom HUD.

## The wanderer
Since 075 the player is the **arcane ranger**: an agile, light-armoured scout of the lost civilization with ley-etched gear. About 42 px tall (side and front: 40–44 world px from the soles to the hood's tip), drawn in the 72×68 box with the feet at (36, 52), at scale 0.66 from style px. Light from the top left; every part has the ink outline; big shapes take a soft gradient from their light colour (top left) to their dark (bottom right) and a rim light.
- **Hood:** a close, pointed scout's hood whose tip sweeps back into a short tail that flicks with motion. A deep `hood-dark` hollow holds the faceless cyan glow (it pulses, and flares on each shot). A thin cyan ley seam runs up the crown. The opening's edge carries the rarity trim. A short cowl covers the shoulders, its clasp gem at the throat in the trim's colour.
- **Cape:** to the back of the knees, so the legs read; its hem cut into two pointed tails (the near one longer), carrying the trim.
- **Jerkin:** fitted leather in quilted panels to mid-thigh, a split skirt (front and back flaps that swing with the thighs), cyan rune lines on the chest panels and the skirt's edge.
- **Arms:** slim; sleeves in the cape's dark tone (075 review: the spec's pale `robe` sleeve read as a pale stick), a bone (`robe`) cap at each shoulder; leather bracers with an etched cyan line and a brass rivet; fingerless gloves.
- **Ranger cues:** a rune bandolier from the far shoulder to the near hip with four brass-capped ley vials; a hip quiver of three carved rune stakes, tips up and back (side and back views); a belt with the ley buckle, a pouch, and a brass clip for the hose.
- **Legs:** two segments (thigh and shin, bent by two-bone IK), slim dark breeches with a wrap below the knee, soft ranger boots to mid-calf with a folded cuff and a pointed toe.
- **Tank, hose and tube:** the brass tank with its cyan window and rising bubble rides high between the shoulder blades over the cape, in a leather harness, and bounces in it. The ringed hose leaves its outlet, passes the belt's clip and enters the tube's rear. The tube keeps 016's silhouette (brass housing, cyan barrel, four rings that light in order as it attunes, the muzzle), gains three etched flutes that roll as it spins and a leather sling to the near shoulder, and is held at the hip like a minigun. Before attuning, the barrel, rings, hose and window are dormant grey-cyan.
- **Theme:** cloth, leather, brass, carved stakes and ley glass only.

**Colour schemes** (`WANDERER_SCHEMES`, the default in `WANDERER_SCHEME`): a scheme sets the cloth (hood, cowl, cape) and the jerkin, each a dark, mid and light id; everything else is fixed. A, **Ley cobalt** (the default): `cobalt-dark`, `cobalt`, `cobalt-light` with a `leather`, `hide`, `hide-light` jerkin. B, **Ember rust**: `rust-dark`, `rust`, `rust-light`, the same jerkin. C, **Pale bone**: `bone-dark`, `bone`, `bone-light` with a `leather-dark`, `leather`, `strap` jerkin. `?scheme=cobalt|rust|bone` swaps it at boot in render only (a bad value is the default); the title's wanderer uses it too.

**Rarity trim** (`WANDERER_TRIM`): the hem, the hood's edge and the clasp show the rarity of the best gear piece worn over all four slots, which the sim decides (`wornRarity`, by `RARITY_ORDER`) and render only reads. Nothing worn: the cloth's light id, no glow. Common `rock-light`; fine `cyan` with a cyan glow; rare `gold-trim` with a gold glow and a slow pulse (0.8 to 1, 2 s); relic `wisp-light` with a wisp glow, the pulse, and a white shimmer running along the hem once a second (the bench's rarity frame colours, 036). Armour never tints the body; the hit flash is unchanged.

**Animation** (`wandererMotion`, a pure function from clocks to a pose; numbers in `WANDERER_MOTION`): snappy and exaggerated for actions, with squash and stretch about the feet (keeping the area) and anticipation folded into each action's opening frames, never delaying the sim; calm for locomotion.
- **Run:** a calm, purposeful jog (075.13, after Shaun's playtest): π/32 rad of stride a world px, so 3.75 steps a second at walk speed, each foot reaching 9.5 style px either side of the hip (a little slide); the swing kicks back and lifts with the knee bent; a 0.4 world px bob, lowest just after each contact, with a faint squash and stretch; the side view leans in a little. The cape trails with speed (to 0.35 rad) and flaps gently at the stride's cadence, its tails and the hood's tail a quarter cycle behind; the tank rides a quarter of the bob behind the body. Firing while moving is a braced strafe at a shorter stride and smaller bob, at the walk's rate per px, so never faster. A stride ends with one gentle settle. "Snappy" is for actions, not locomotion.
- **Firing:** a quick dip, then the brace (wider stance, crouch, lean back) with an overshoot; each shot kicks the tube back, shoves the shoulders and squashes the body, recovering over 6 frames through a small stretch; the barrel's flutes spin up over 15 frames and down over 30; a 3-frame muzzle flash (star, smaller star turned 45°, fading ring; odd and even shots alternate its angle); a bright pulse runs down the hose from the tank to the tube in 150 ms, the window flaring as it leaves.
- **Roll:** tuck, a full forward somersault side on (a tucked tumble facing down or up), land; the smear stays. **Hit:** snaps back and squashes on its first frame, the cape and hood tail flicking forward, the glow dipping, then recovers with an overshoot over the 8 pose ticks. **KO:** always side on: staggers back, buckles to a kneel, topples to lie flat by tick 36 (the tube dropping beside it), and the glow gutters out by 48; it fades over the last third.
- **Idle:** a breath every 2.4 s, the cape and hood tail swaying.
- No screen shake comes from the player (`SHAKE_ON` stays false).

**Drawing:** the rig (`src/render/vector/wandererRig.ts`) poses it every frame into its canvas texture. Its parts are baked into small bitmaps at the drawing's scale (at boot for the page's scheme with nothing worn, and the first time another trim shows), kept per view, and stamped each frame; the limbs, hose, tube and effects are drawn live. The contact sheet shows every pose and strip, per view, from `sheetSections`.

## Enemies (076)
Every enemy and boss keeps its design, drawn in the pushed vector look with a **family look per region**: shared materials and colours, so a creature's home reads at a glance, wherever it stands (`ENEMY_FAMILIES` in `src/data/art/enemyFamilies.ts`; the shapes in `src/data/art/enemyLook.ts`). Light from the top left: big shapes take a soft gradient from their ramp's light id (top left) to its dark id (bottom right), lit edges take 075's `rim` in the family's colour (0.5 alpha, 1 style px wide, 1 in), and every part keeps the ink outline. Enemies are in 074's readability layer: never darkened by a mood.

| Family | Region | Materials (palette ids) | Marks on every member | Rim | Motes |
| --- | --- | --- | --- | --- | --- |
| Mossbound ruins (`ruin`) | Region 1 | ruin stone `rock-dark` `rock` `rock-light`; guardian stone `warden-*`; moss `leaf-dark` `moss-tuft` `leaf-light`; runes `cyan` `cyan-glow` (the Husk keeps its straw, leather and resin, the Wisp its violet) | moss tufts on top surfaces; a carved ruin-stone piece with a cyan rune | `rim-light` | `cyan-glow`, `cyan`, `leaf-pale` |
| Quarry constructs (`quarry`) | Stonefall Hollows | slate `hollow-dark` `hollow` `hollow-light` `hollow-pale`; ley-iron `iron-*` skinned in `iron-rust`, cut by `vein`; brass fittings | layered slate plating, each plate with a lit lip; ley-iron bands with a cyan vein through the rust | `hollow-pale` | `vein`, `hollow-pale`, `cyan-glow` |
| Forge constructs (`forge`) | The Emberworks | ash `ash-*`; riveted iron `iron-*`; cinder `flame-dark` `cinder` `cinder-light`; brass `brass-*` | soot rising up the lower plates; cinder glowing in seams; brass rivets | `cinder-light` | `cinder-light`, `brass-light`, `gold-trim` (brass-gold, so a death isn't the cinder mote's burning burst) |
| Storm-works (`storm`) | The Stormcrown | slate `storm-dark` `storm` `storm-light`; storm-glass `snow` → `storm-pale` → `storm-glow`; brass bands | storm-glass inlays; every lightning vein, seam, spark and charge violet (the builders' ley marks stay cyan: rune courses, ley rivets, the Conductor's eyes, the gale ram's hub) | `storm-pale` | `storm-glow`, `storm-pale`, `snow` |

**Rigs** (`EnemyRigDef`): parts by role posed per frame (enemyPose.ts computes each part's matrix; drawEnemy draws with them, and the tests and size checks measure with the same numbers). A pose's channels: `bob`, `lean` (about the hip; a third as much face-on), `shift`, `squash` (about the feet, keeping them planted: height × (1 − s), width × (1 + s)), `sink`, `tilt`, `armBack`/`armFront`, `spread` (arms apart), `raise` (arms and what they hold lifted), `head`/`headLift` (every head part and the glow parts that `follows: 'head'` turn together), `legBack`/`legFront`, `step`/`lift`, `glow`, `charge`. Each rig names its `tells`: the part each wind-up throws and a point on it. Scale, feet box and hurtbox are unchanged; boxes grew only where a stretched pose would clip (a test holds every pose inside its box).

**Wind-ups** (`ENEMY_MOTION`, `src/render/enemyMotion.ts`): every attack's wind-up is a strip of **gather** (a counter-move, about 0.1 squash), **coil** (the big anticipation pose, one frame, or two alternating at walk pace where the old wind-up looped) and **peak** (pushed further, glow at full), picked by the wind-up's progress (`modeTicks / windupTicks` of that attack): gather below 20%, peak from 85% (at least the last 5 ticks; the Sniper's from its lock), coil between, so it always fills the sim's wind-up exactly. The peak trembles: the sprite's own ±0.8 world px at 20 Hz (bosses ±1.2), never the camera. An attack's first frames stretch (−0.12 squash) and settle over 4 ticks; a slam lands squashed. The Burrower's wind-up is its ripple's: settling, swelling and cracking with its dust thickening, rising to 1.4× at the peak. The Sniper's laser and the kiln-tender's beam leave the posed lens and nozzle. Telegraphs are unchanged.

**Locomotion** stays smooth and purposeful; snap is for wind-ups, hits and deaths, not walking. Every walk is 4 frames at 6 fps (two steps a cycle, so 3 steps a second); the two-frame shuffles (the Bulwark's and Shardback's turn, the Sniper's sidestep) run at 3 fps, also 3 steps a second. A walk's bob is at most 1 world px top to bottom (±0.5 for walkers; hoverers and flyers float over 1 px), and its squash stays within 0.015 of rest. `tests/data/enemyGait.test.ts` holds every enemy to it: walkers at most 4 steps a second and no more than 1.25× the steps their speed needs for the stride they draw; hoverers at most 1.5 cycles a second; bob at most 1 px overall and frame to frame; squash at most 0.015.

**Reactions** (`src/render/enemyReaction.ts`): a hit **flinches** (the `hit` pose snapped and ringing down with a small overshoot) while the sim's flash runs; a frame's hits of at least 40% of its (scaled) max health, or a punch, **stagger** a non-boss (`stagger`: reel, then recover, over 300 ms on the tween clock). Bosses flinch only. No reaction shows during a wind-up or an attack, and a wind-up cuts a stagger off. Hit-stop and freezing hold the pose. The hit flash, numbers, particles and hit-stop are unchanged.

**Deaths** (`src/render/DissolveView.ts`, `src/render/deathMotes.ts`): the rig's one-frame struck `death` pose for 100 ms (bosses 200), then the **dissolve** over 500 ms (bosses 1,200): the body narrows to 0.8× and stretches to 1.1× upward as it fades, an additive copy in the family's first mote colour rises to 0.5 alpha (0.25 with Flashes off) and fades with it, and the family's motes leave random points of the hurtbox in three waves, rising. The Warden's core and the Bulwark's seam fade with the body; a champion dissolves at its size with its glow; the Forgewright's bellows dissolve with it. Kept: the death sound, the drops, the cinder mote's burst, the mite's discharge, the golem's split. **Motes** (`DEATH_MOTES`): small 10, medium 16, large 24, boss 60; ×1.5 a champion; ×0.5 / 1 / 1.5 on Low / Medium / High; additive on Medium and High. A death's motes are thinned to its per-death cap (30 / 60 / 90), the live death-mote cap (60 / 120 / 200) and what `PARTICLE_BUDGET` (150 / 300 / 500 live particles) leaves; the cap is hard.

## Ammo and particles (078)
Render only: no file under `src/sim` changed, and `getState()` is the same with the effects on, off (`?fx=off`) and on any tier.
- **Bodies** (`src/data/art/sprites.ts`, `mines.ts`, `stages.ts`): the arrow, ley bolt, bomb, landmine, Shard and bomblet in the pushed look: a gradient lit from the top left, a `rim` on the lit edge (the arrowhead's and bolt's `snow`, the bomb's `rock-pale`), the ink outline. The lines once baked behind the arrow, bolt and Shard are gone (the trails replace them). 062's tier swap recolours the rim too; elements tint as before (`ROUND_LOOKS`).
- **Composition** (`AMMO_FX` in `src/data/ammoFx.ts`, composed by `roundFx` in `src/render/fx/roundFx.ts`): **the family sets the shape** (trail kind and length, impact kind, muzzle sparks, base colours), **the element the colour** (the trail's colour, its shed bits, the bursts added to impacts and blasts, its mark), **the tier the core and glints** (the trail's core and High's edge, glints added to impacts and the muzzle, the shock ring's core); a **shape** row lengthens homing's wake (×2) and marks the Split's star and the cluster's bomblets (drawn elsewhere, kept). A Shard and a bomblet take their parent's element and tier. A new ammo, tag or tier is one row.

| Family | In flight | Impact | End (wall, range) | Muzzle |
| --- | --- | --- | --- | --- |
| Arrow | a 28 px streak, `rock-pale` with a `snow` core | splinter: 5 chips on through the hit (60° cone), a white tick | 2 dust chips | 3 sparks |
| Ley bolt | a 22 px ribbon, `cyan` with a `cyan-glow` core, motes shed | ley splash: a ring of light, 6 sparks, a splash mark | the ring at 0.6×, 3 sparks | 4 sparks |
| Bomb | fuse smoke puffs | blast: 10 debris, 6 smoke, a shock ring to its radius, a scorch (today's flash kept) | none | a launch puff and 2 sparks |
| Landmine | tumbling 1.5 turns a second, no trail; dust as it arms | mine blast: 14 shards, 3 smoke, a tight shock ring, a scorch | none | as the bomb's |
| Shard | a 24 px ribbon | a flick of 3 sparks | none | none |
| Bomblet | its fuse glint | mini blast: 4 debris, 2 smoke | none | none |

| Element | Trail | Impact | Blast |
| --- | --- | --- | --- |
| Frost | `water-light`, `snow` core, flakes drifting down | 4 falling ice chips, a rime mark | cold mist for smoke, rime for scorch |
| Fire | `flame-dark`, `cinder-light` core, flickering ±15%, embers rising | 4 rising embers, a small scorch | darker smoke, 4 embers, scorch at 0.45 |
| Lightning | `storm-glow`, `snow` core, crackling ±1.5 px | 4 fast sparks, a 2-frame star | 4 sparks |

Tiers (core, glints): steel `iron-light` with a `snow` edge, glass `snow` with `foam`, stormsteel `storm-pale` with `storm-glow`, storm glass `snow` with `storm-pale`; each adds 3 glints (storm glass a violet spark too) and 1 at the muzzle. No row uses `danger` or `hit-red`; `flame-dark` only in the fire trail.
- **Impacts** are matched in render (`src/render/fx/impactMatch.ts`): a hit goes to the straight round whose path this frame passed nearest the hurtbox (within its half-size + 8 px), and plays where that path meets the hurtbox's near side; bursts to the bomb, mine or bomblet that vanished there; a round that vanished with no hit plays its end; no match plays the element's 014 hit burst. They replace 014's per-element hit bursts for the player's rounds (a punch keeps its own); an arc's hit plays half the lightning impact. Hit feedback (the flash, numbers, sounds, the 50 ms hold) is unchanged; no shake.
- **The muzzle:** each shot's sparks leave 075's posed muzzle (the rig's `muzzle` mark) down the shot's lane, and a new round's trail starts there (075.10's spawn point unchanged).
- **Machine sparks:** 4 from a machine's window as it finishes a craft (`MACHINE_SPARKS`: by build group, a stage machine by its tag, the Tempering coil its own; logistics none). `craftPuff` stays.
- **Particles** are tinted soft dots (smoke and mist soft puffs that grow), from one pool (`Particles`) made up to the tier's high-water mark and reused: nothing is made per projectile per frame. Trails are two Graphics redrawn each frame from pooled ring slots (the colour flat, a glowing trail's core and edge additive); marks, shock rings and flashes are pooled images.
- **The budget** (`src/render/particleBudget.ts`, `PARTICLE_SHARES` in `src/data/juice.ts`): one ledger per scene counts every live particle as a death mote, weather (014's room motes indoors) or an effect; each kind may spawn up to its share less its live count, never past the budget less everything alive, and no share lends its room. Shares: deaths 60 / 120 / 200, weather 40 / 100 / 160, effects (derived) 50 / 80 / 140 of 150 / 300 / 500. Inside the effect share, `FX_PRIORITY`: cues (enemy and boss attacks, hazards, a hit on the player, a shield's ring) to 100%, shots (impacts, blasts, muzzle and machine sparks, freezes, thaws, ignites, harvests, pickups, the foundry's bursts) to 85%, soft bits (trail bits, landing dust, footsteps) to 50%.
- **Graphics quality** (`FX_QUALITY`): Low ×0.5 counts (an impact keeps 1), trails at most 24 in one colour, no trail bits, marks at most 6, nothing additive; Medium ×1, 48 trails with their core, bits every 80 ms (smoke 60), 12 marks; High ×1.25, 96 trails with a soft edge, bits every 40 ms, 24 marks. A tier change applies at once; pools only grow.
- **Flashes off:** no ring, tick or star, no crackle or flicker; particles, trails and marks still show.
- **Draw order:** marks and shock rings at `DEPTHS.shotMark` (0.35), every trail and lingering bit (anything living past 400 ms: smoke, mist, flakes, embers, motes) at `shotTrail` (0.45), both under the telegraphs (`groundFx`) and everything standing; impact sparks just behind the struck enemy (its feet − 0.5); ends and blasts at their ground point. They draw in their own colours in every mood.

## Palette
Every colour comes from the palette, by id. The source of truth is `src/data/palette.ts`; this table mirrors it, and tests check that they match. (The pixel palette went with the pixel sprites in 020.)

### Daylight
| Id | Hex |
| --- | --- |
| `ink` | #1e1a2e |
| `grass-dark` | #2f8a3a |
| `grass` | #45ad45 |
| `grass-bright` | #5cc850 |
| `grass-light` | #8ee060 |
| `sun` | #d6f27a |
| `ground-shade` | #1e4a28 |
| `dirt-dark` | #b88d4f |
| `dirt` | #d9b26e |
| `dirt-light` | #ecd096 |
| `sand` | #e3cf96 |
| `water-deep` | #1f6fc0 |
| `water` | #3a9be8 |
| `water-light` | #7fd0ff |
| `foam` | #d4f4ff |
| `rock-dark` | #5f6880 |
| `rock` | #8e97ab |
| `rock-light` | #c3cad8 |
| `rock-pale` | #e6ebf3 |
| `wood-dark` | #5e3a22 |
| `wood` | #8a5a33 |
| `wood-light` | #b07a48 |
| `leaf-dark` | #1f7a35 |
| `leaf` | #2f9a42 |
| `leaf-light` | #4fc24f |
| `leaf-pale` | #9ae86a |
| `cyan-deep` | #138f9c |
| `cyan` | #2ee6e0 |
| `cyan-glow` | #b8fff8 |
| `hood-dark` | #0d1c24 |
| `rust-dark` | #7a321d |
| `rust` | #b5532f |
| `rust-light` | #dc7d4f |
| `robe` | #e9dcc0 |
| `gold-trim` | #f2c45a |
| `gold-shade` | #b8862e |
| `leather-dark` | #3e2818 |
| `leather` | #5a3a26 |
| `strap` | #6a4426 |
| `brass-dark` | #a8782a |
| `brass` | #e0b04a |
| `brass-light` | #f6dc8a |
| `dormant` | #7d9ea3 |
| `dormant-dark` | #4b6468 |
| `straw-dark` | #a57c34 |
| `straw` | #d9b65a |
| `straw-light` | #f0d88a |
| `cinder` | #ff7a2a |
| `cinder-light` | #ffd27a |
| `flame-dark` | #d8361f |
| `resin-dark` | #c4552e |
| `resin` | #f0a14a |
| `resin-light` | #f4d27a |
| `core-dark` | #4a3a6b |
| `core` | #7a63a0 |
| `wisp-dark` | #5b2f8f |
| `wisp` | #9b5de5 |
| `wisp-light` | #d7b8ff |
| `mask` | #efe6d2 |
| `warden-dark` | #4c5a4a |
| `warden` | #7d8f6e |
| `warden-light` | #b2c29a |
| `moss-tuft` | #5fae3e |
| `mortar` | #3b2b21 |
| `flag-dark` | #6f553f |
| `flag` | #8a6c4f |
| `flag-light` | #a2815e |
| `carve-dark` | #4f3b2f |
| `carve` | #6f5442 |
| `carve-light` | #93745a |
| `hollow-dark` | #3b475c |
| `hollow` | #5f6f88 |
| `hollow-light` | #8c9cb4 |
| `hollow-pale` | #bccadb |
| `iron-dark` | #2f343f |
| `iron` | #566070 |
| `iron-light` | #8a95a6 |
| `iron-rust` | #9a4b2b |
| `vein` | #5ef2ff |
| `danger` | #e8322f |
| `ash-dark` | #3d3735 |
| `ash` | #5f5753 |
| `ash-light` | #857b74 |
| `ash-pale` | #b3a89e |
| `storm-dark` | #2c2b44 |
| `storm` | #47466b |
| `storm-light` | #6b6a92 |
| `storm-pale` | #a19fc4 |
| `storm-glow` | #9a86ec |
| `snow` | #ffffff |
| `hit-red` | #ff4d4d |
| `cobalt-dark` | #1f2d66 |
| `cobalt` | #3456b4 |
| `cobalt-light` | #6a8ee4 |
| `hide` | #9a6a40 |
| `hide-light` | #c8955f |
| `bone-dark` | #a39783 |
| `bone` | #d9d0be |
| `bone-light` | #f4efe3 |
| `rim-light` | #ffe6c4 |

## Vector sprites
- **Shape data** lives in `src/data/art/`: ellipses, rounded rects, paths (written as short SVG-style strings, `M`, `L`, `Q`, `C`, `Z`) and round-capped lines, with fills (flat, linear or radial gradients), strokes, the outline flag, glows and opacity. Units are world px around an anchor.
- **Rim light** (075): an optional `rim: { color, width, offset }` on a shape. Render clips to the shape and strokes its own path shifted down and right by `offset`, so a band of `color` shows along its top and left edges only: the static top-left light. The wanderer uses `rim-light` at 0.55 alpha, 1.2 wide, 1.2 offset, on its hood, cowl, cape, jerkin and tank; 076 can use it for enemies.
- **Static and frame-by-frame sprites** (projectiles, effects, the tube stone) are `VectorSprite`s in `src/data/art/sprites.ts`: a key, a box, an anchor and one shape list per frame. Frame names are `key`, or `key/0`, `key/1` and so on for animation frames.
- **Rigs** are characters made of named parts with pivots:
  - The wanderer (`wanderer.ts`, its views in `wandererSide.ts`, `wandererFront.ts` and `wandererBack.ts`) has parts for the side, down and up views, joints its swinging parts hang on, and a draw order with dynamic pieces (legs, arms, hose, tube, tank window, face glow, the trim's shimmer, the muzzle flash). `src/render/vector/wandererRig.ts` draws the pose `wandererMotion` makes from sim state every frame (see "The wanderer").
  - Enemies (one file per rig, `ENEMY_RIGS` in `enemies.ts`) are parts by role (legs, body, head, arms, glow, charge) with a pose table per animation, one pose per frame. They are baked at boot into the frames `src/data/assets.ts` names, such as `husk-walk-side/2`; see "Enemies" for the family looks, strips, reactions and deaths. The contact sheet groups them by family and labels each strip frame with its phase.
- **World pieces with state:**
  - Gathering nodes (018, `nodes.ts`) have a look per use left, bare remains, and regrow stages, picked from the sim's timer.
  - The foundry intake (019, `intake.ts`) is a dormant and an attuned frame of the pipe. Its ring bands, gauge column and fill pulses are drawn live over it from `INTAKE_LOOK`.
- **Render code** never hard-codes a sprite: `src/render/vector/` draws whatever the data says. A new sprite is new data.
- **Review:** `npm run dev`, then open `/sheet.html`. The contact sheet draws every vector sprite, pose and facing at 4×.

## The foundry, machines and pieces (020)
- **Interior** (`interior.ts`): one warm sandstone flag per tile, so the build grid lines up with the floor, with cracked, worn, ley-inlaid and brass variants (`FLOOR_VARIANTS`); carved walls in 3/4 view (a top, and a face with a brass band and a rune course where floor lies below); the carved block, the swaying banner and the four-frame brazier. Warm forge light is the room's mood tint and the braziers' ember glows; ley light pools along conduits.
- **Machines** (`machines.ts`, `mechanisms.ts`): a stone housing per footprint and view, a window onto the machine's own mechanism, a ley crystal that glows while it works and a brass chute on the output side. Each mechanism is a function of its window and the loop's phase. Frames: idle (still, also starved), jammed (stuck part-way with an ember glint, for blocked; render shakes it), and a 4-frame working loop, in three views. The icon of what it makes sits on the top face.
- **Logistics** (`logistics.ts`): conduits are generated from their entry and exit edges (stone trough, cyan channel, brass collars, chevrons riding the flow); the splitter's channels meet at a brass hub. Hopper, crate, gravity stager, build arrows (cyan out, ember in) and status markers.
- **The underground pair** (052, `tunnels.ts`): the channel runs into a carved stone hood and dives under the floor at the entrance, and climbs out of the same hood at the exit; the hood's cyan rune is a chevron pointing down into the floor (entrance) or up out of it (exit). A tunnel shows on the floor as two cyan-glow lines along each tile it passes under (`TUNNEL_LOOK`): bright for a pair's tunnel, faint for an entrance's reach while placing, which ends in a tick.
- **Fixtures** (`fixtures.ts`): the identification bench (052: a wooden workbench with a big brass magnifying glass on one side and an armor rack holding a breastplate on the other; its glass flares as gear is identified), stash, supply port, the exit arch, waystone, the pylon (off, activating, active), door rubble and the room's ley crystal.
- **Items** (`items.ts`): a 16×16 icon per item and ammo, plus the build and menu emblems. The 005 look-alike pairs stay apart by shape: the shaft is a thin rod and the fuse a fat coil; the ley shard is three chunks and the ley bolt one head on a trail; the casing an open shell and the bomb a sealed sphere.

## HUD, menus and text (020)
- **Tablets:** HUD pieces and menus are rune-carved stone tablets with brass corners. Fixed-size pieces are vector frames (`hud.ts`); panels that change size are drawn live in the same look (`src/render/tablet.ts`, `TABLET` in `hudLayout.ts`). The tube slot (025) is ringed in cyan like the tube: one frame per volley size (1–3 wells, brass studs between), above the hotbar cells.
- **Fist** (025, `hud-fist`): the tube slot's melee icon, a rust leather glove curled shut with the thumb across the front, a brass cuff and a soft ink shadow, in the 16×16 item-icon box.
- **Menu rows** light with a cyan rim under the cursor (with the hover sound) and flash brass when pressed. The craft menu, which pauses the game, has a title card.
- **Fonts:** two OFL fonts bundled in `assets/fonts/` with their licences, loaded locally before the game starts: Cinzel (display: titles, names, objectives) and Source Sans 3 (body: numbers, readouts, descriptions). Styles are in `src/data/fonts.ts`; `TextLine` draws them at the screen's resolution.

## Registering sprites
- Register every key in the asset tables (`src/data/assets.ts`, `foundryAssets.ts`, `roomArt.ts`, `props.ts`). Render code uses those keys, never string literals; a test checks every vector frame is registered.
- A frame that was never drawn logs a console error when shown, so the game tests catch it.
