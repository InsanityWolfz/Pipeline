# 076: Enemy and boss polish
status: done

Approved by Shaun in chat, 2026-10-27, with the whole art pass (074–081); its plan is pre-approved.

Plan pre-approved by Shaun in chat, 2026-10-27.

Drafted from Shaun's art-pass interview (docs/brainstorm/2026-10-27-art-interview.md, answers 5, 9, 11–15, 17 and 27) and his calls on 076 that day. This is art spec 3 of 8, built in order after 074 and 075. Shaun asked for no sample pages first ("Just build it"); he reviews the result at the playtest.

## Goal
Every enemy and boss keeps its design but is redrawn in the pushed vector look (soft gradients, a rim light, the thin ink outline), with a family look per region: shared materials and colours, so you can tell where a creature comes from at a glance. Every attack gets a big, readable wind-up that fits exactly inside the sim's wind-up. Hits make enemies flinch or stagger, and deaths dissolve into ley motes in the family's colour. The sim doesn't change: the same seed and commands play the same fight, tick for tick.

## Design references
- docs/design.md "Camera and art" (2026-10-27 wording, on 074's branch): pushed vector, gradients lit from the top left with a rim light, snappy exaggerated animation with squash, stretch and anticipation, enemies and wind-ups bright in every region, screen shake only in boss spawns.
- docs/design.md: the theme rule (a lost magical civilization: rune-carved stone, ley lines, brass and crystal, nothing modern), and the regions (053, 060, 064).
- docs/art.md: "Style", "Outline", "Accent" (ley is cyan; Wisps are violet and fire is ember so neither reads as ley), the palette and "Vector sprites" (enemy rigs, poses baked at boot). The build adds an "Enemies" section.
- docs/specs/074-light-and-moods.md: the art-direction rules for the pass, the region moods, the readability layer (enemies are never darkened), the light catch, the Graphics quality setting (Low, Medium, High). Its out-of-scope list gives 076 "directional rim light".
- docs/specs/075-wanderer-redesign.md: the `rim` shape style and the `squash` idea, both reused here.
- Earlier specs it builds on: 004 (the Husk, telegraphed swipe, death), 009 (Wisp, Warden), 014 (hit-stop, particles, the cyan death motes), 016 (enemy rigs and pose tables), 018 (resin drip, the Warden's core), 029 (ice and chill), 032 (champions), 034 and 035 (the Hollows), 041 (the Bulwark's attacks), 042.10 (Flashes off), 054 (shield bars), 060 and 061 (the Emberworks), 064 and 065 (the Stormcrown).

## Depends on
074 (the quality setting, the readability layer, the light catch) and 075 (the `rim` shape style). The build starts once both are on main. If either is still unmerged then, the build merges that branch into this one first and says so in the PR.

## The roster (from data)
19 rigs in `ENEMY_RIGS`: 15 enemies and 4 bosses (`boss: true`). 733 baked frames today.

| Region (rings) | Enemies | Boss |
| --- | --- | --- |
| Region 1 (0–2) | Husk, Wisp | Pylon Warden |
| Stonefall Hollows (3) | Charger, Burrower, Shardback, Sniper construct | Bulwark |
| The Emberworks (4) | Cinder mote, Bellows hound, Slag golem, Slag whelp, Kiln-tender | Forgewright (and its two bellows) |
| The Stormcrown (5) | Thunderhawk, Static mite, Storm sentinel, Gale ram | Conductor (and its six rods) |

The Husk Hive (049) is a landmark, not an enemy, so it isn't in 076.

## Families (data)
A new `ENEMY_FAMILIES` in `src/data/art/enemyFamilies.ts`. Each family lists its members (enemy ids), its materials as palette ramps, its rim colour and its mote colours. Each enemy belongs to exactly one family, by its home region. That holds wherever it stands (the sandbox, the Bulwark's adds).

Every id below is already in the palette. **The palette doesn't change.**

| Family | Region | Shared materials (palette ids) | Family marks on every member | Rim | Motes |
| --- | --- | --- | --- | --- | --- |
| **Mossbound ruins** (`ruin`) | Region 1 | weathered ruin stone `rock-dark` `rock` `rock-light`; guardian stone `warden-dark` `warden` `warden-light`; moss `moss-tuft` `leaf-dark` `leaf-light`; carved runes `cyan` `cyan-glow`. The Husk keeps its straw, leather and resin, and the Wisp keeps its violet. | moss tufts on top surfaces (hood, shoulders, mask, fists); one carved ruin-stone piece with a cyan rune | `rim-light` | `cyan-glow`, `cyan`, `leaf-pale` |
| **Quarry constructs** (`quarry`) | Stonefall Hollows | quarry stone and slate, the grey-blue `hollow-dark` `hollow` `hollow-light` `hollow-pale`; ley-iron `iron-dark` `iron` `iron-light`, skinned in `iron-rust`, cut by `vein`. Brass stays as small fittings. | layered slate plating (stacked plate edges, each with a lit lip); ley-iron bands with a cyan vein through the rust | `hollow-pale` | `vein`, `hollow-pale`, `cyan-glow` |
| **Forge constructs** (`forge`) | The Emberworks | ash and soot `ash-dark` `ash` `ash-light` `ash-pale`; riveted iron `iron-dark` `iron` `iron-light`; cinder `cinder-light` `cinder` `flame-dark`; brass `brass-dark` `brass` `brass-light` | soot fading up the lower plates; cinder glowing in seams and cracks; brass rivets | `cinder-light` | `cinder-light`, `brass-light`, `gold-trim` |
| **Storm-works** (`storm`) | The Stormcrown | slate `storm-dark` `storm` `storm-light`; storm-glass (a `snow` → `storm-pale` → `storm-glow` gradient, the stormglass item's); violet lightning `storm-glow` with `snow` cores; brass bands | storm-glass inlays; every lightning vein, seam, spark and charge turns violet. The builders' ley marks stay cyan: rune courses, ley rivets, the Conductor's eyes. | `storm-pale` | `storm-glow`, `storm-pale`, `snow` |

### Shading, for every rig
- Big shapes take a soft linear gradient from their ramp's light id (top left) to its dark id (bottom right).
- Lit edges get 075's `rim` style in the family's rim colour: about 0.5 alpha, width 1 style px, offset 1 style px. It is static, from the top-left light, like the wanderer's. 074's light catch still adds dynamic colour on Medium and High.
- Every part keeps the ink outline (`OUTLINE_WIDTH`, unchanged).
- Enemies stay in 074's readability layer, never darkened by a mood.

### Size
- Scale, `feetBox` and `hurtbox` don't change.
- The drawn idle height stays within ±10% of today's in each view.
- A rig's `box` may grow only where a stretched pose would clip. Its anchor keeps the feet in the same place.

## Animation
Snappy and exaggerated, and **visual only**. The sim's wind-up, attack, recovery and cooldown ticks don't change, and no file under `src/sim` changes. The art reads the sim's state (`mode`, `modeTicks`, `flash`) and events (`hits`, `deaths`) and fits inside them.

### Squash and stretch
`EnemyPose` gains `squash`, as 075's: positive squashes, negative stretches. Height scales by (1 − squash) and width by (1 + squash) around the feet, so the feet stay planted. Baked key poses carry it. Render adds the short-lived squash (the release snap, the flinch overshoot, the dissolve) as a sprite scale about the feet anchor.

The health bar, name tags, champion labels and the light catch place themselves from the unsquashed height, so they don't bob.

### Wind-ups: gather, coil, peak
Every attack's wind-up becomes a strip of three phases, picked by the wind-up's progress, `modeTicks / windupTicks` for that attack, rather than by a frame rate. So it fills the sim's wind-up exactly, however long it is.

1. **Gather** (0 to 20% of the wind-up): a counter-move. It dips or draws in (squash about 0.1), the opposite of the attack.
2. **Coil** (20% to 85%): the big anticipation pose. It is pushed well past today's single wind-up pose: further back, higher, wider, with stretch where it rears up. Where an enemy's wind-up loops two frames today (the Charger pawing, the cinder mote flickering, the hound, the mite, the sentinel, the ram), coil keeps that loop at walk pace.
3. **Peak** (the last 15%, at least 5 ticks): the tell just before release. The coil pose is pushed a little further, its glow is at full strength, and render trembles the sprite (±0.8 world px at 20 Hz; bosses ±1.2 px). The tremble is the sprite's own; the camera never moves.

Other rules:
- The attack's first frame (`swipe` and its kin) gets a release stretch (squash about −0.12) that settles over 4 frames.
- A slam's impact frame squashes (about 0.15–0.2).
- The phase fractions, tremble and snap are tuning in `ENEMY_MOTION`, with per-attack overrides. The Sniper's peak starts at its lock (`trackTicks / windupTicks`), so the art's tell lines up with the sim's lock.
- Telegraphs (the ground arcs, rings, lanes and lines) are unchanged in shape, colour and timing.

### Hit reactions: flinch and stagger
These are pose animation only. The hit flash (white, or dim with Flashes off), the damage numbers, the hit particles and the 50 ms hit-stop stay exactly as they are.

- **Flinch:** today's `hit` pose, redrawn much bigger (head or top snapped away from the hit, squash about 0.1). It plays while the sim's `flash` runs (6 ticks): a snap on its first frame and a settle with a small overshoot.
- **Stagger:** a new `stagger` pose of two frames, reel then recover, over 18 render ticks (300 ms). The enemy rocks back hard (lean about −0.4), loses its footing (a foot or leg lifted) and throws its arms or parts out. A non-boss staggers when one frame's hits on it total at least 40% of its max health (its ring- and champion-scaled def), or when it's punched (023). Otherwise it flinches. (A ring 1 Husk has 40 HP: one 14-damage arrow flinches it, two in one frame stagger it.)
- **Bosses flinch only.** They have no stagger, so a boss never looks interrupted when it isn't. Their sim stagger states (the Forgewright's vent, a Charger's wall stun) keep their own poses, redrawn in the family look.
- **The wind-up always wins.** No hit reaction shows during a wind-up or an attack (as today), and a wind-up that starts cuts a stagger off at once.
- During recovery, idle and walking, a reaction shows over the pose.
- Hit-stop (014) and freezing (029) still hold the sprite, pose and all.
- The reaction clocks live in EnemyView, like 075's player clocks. The choice of pose is a pure function in render (`enemyMotion`), so tests and the contact sheet sample it at fixed times.

### Deaths: the ley-mote dissolve
Today a death plays a 4-frame corpse (sink, squash, tip, fade), lingers 600 ms and fades over 600 ms, with 26 cyan `deathMotes` from one point and the death sound.

**Replaced:**
- The corpse's sink-and-tip frames and its linger become the dissolve.
- The point burst of cyan `deathMotes` becomes the family's motes, rising off the whole body.

**Kept (blended in):**
- the death sound;
- the drops and their scatter;
- the cinder mote's death burst (embers and its fire, a gameplay cue);
- the static mite's discharge (its bolts and snap);
- the slag golem's split: its slump-and-crack is its struck pose, and its whelps rise from the sim as today, with the slam dust.

**The dissolve**, drawn by EffectsView from the death event:
1. **Struck** (100 ms, bosses 200 ms): a new single-frame `death` pose per rig, its last hit thrown through the body with a stretch.
2. **Dissolve** (500 ms, bosses 1,200 ms):
   - The body narrows to 0.8× and stretches to 1.1× upward while it fades out.
   - An additive copy tinted the family's first mote colour rises to 0.5 alpha and fades with it (at most 0.25 with Flashes off, and no flicker).
   - The motes leave the body in three waves.
   - The death `anim` becomes 1 frame. `ENEMY_FX.corpseLingerMs` and `corpseFadeMs` go, and `DEATH_POSES` goes once no rig uses it.
3. **Bosses:** the Warden's core and the Bulwark's seam halo fade with the body. The Forgewright's bellows (if standing) dissolve with it, with a quarter of its motes each. The Conductor's arena rods are unchanged.
4. **Champions** (032) dissolve at their own 1.5× size, and their glow fades with them.
5. A KO still clears the room's effects, dissolves included.

#### Death motes (data: `DEATH_MOTES` in `src/data/juice.ts`)
| Field | Value |
| --- | --- |
| Count by size class | small 10, medium 16, large 24, boss 60 |
| Size classes | small: Wisp, cinder mote, slag whelp, static mite. Large: slag golem, gale ram. Boss: the four bosses. Medium: everyone else. |
| Champion | ×1.5 |
| Colour | the family's three mote ids, picked per mote; the first also tints the dissolve |
| Where | random points inside the enemy's hurtbox (at its `offsetY`), in three waves over the dissolve |
| Motion | drift 10–40 px/s, rising (gravity −60 px/s²) |
| Life | 700–1,200 ms (bosses 1,000–1,800 ms) |
| Size | 2 px (bosses 3) |
| Look | additive blend on Medium and High, plain on Low |
| Quality scale (074) | Low ×0.5, Medium ×1, High ×1.5 |
| Per-death cap | Low 30, Medium 60, High 90 |
| Live death-mote cap | Low 60, Medium 120, High 200 |
| Total particle budget (`PARTICLE_BUDGET`) | Low 150, Medium 300, High 500 live particles |

- The motes count toward the moderate particle budget. A death's motes are thinned to fit all three limits: its per-death cap, the live death-mote cap and what the total budget has left after every live particle of any kind. The cap is hard, so a death in a crowded fight can throw few or no motes; the body's dissolve still shows it.
- In 076 only the death motes are thinned against `PARTICLE_BUDGET`. 078 brings every other burst under it.
- With the quality changed mid-fight, the next death uses the new tier.

## Per enemy
Each rig is redrawn in its family look in three views (side, down, up; left is the side flipped). It gets:
- the wind-up strip (gather, coil, peak) for each attack;
- the redrawn `hit` (flinch);
- the new `stagger` (bosses: none);
- the struck `death` pose and the dissolve.

Walk, idle, recover and the extra poses are redrawn in the new look with their motion unchanged. Wind-up ticks are today's, from data.

### Region 1: Mossbound ruins
| Enemy (wind-up) | Family look | Wind-up: gather → coil → peak | Flinch / stagger | Death |
| --- | --- | --- | --- | --- |
| **Husk** (swipe, 36) | Straw, bindings, resin and ember eyes kept. Moss creeps over the hood and shoulders, and a carved ruin-stone rune disc hangs from the upper binding. | Crouches with the claw low and back → rears far back, the claw high over the hood, the far arm flung back, stretched → the claw cocked further, eyes blazing, trembling. The swipe lunges through stretched. | The hood snaps back and the arms fly up / it reels back off one foot, straw ends flaring. | Thrown back with straw bursting at the bindings; the resin drip stops; it dissolves. |
| **Wisp** (cast, 48) | Violet flame and drifting hands kept. The mask becomes weathered ruin stone with a hairline crack, moss in it and a cyan rune on the brow. | The flame dips and narrows, hands down → it rises tall, hands wide apart, the orb growing with progress → hands snap round the full orb, the flame flares, trembling. | The mask is knocked aside and the flame gutters short / the flame is blown sideways and the hands scatter. | The flame gutters out sideways and the mask cracks; the mask fades last. |
| **Pylon Warden** (slam, 60; boss) | Mossy stone, boulder fists, the cyan eye slit and chest core kept; more moss on the shoulders and fists, and a rune course on the forearms. | Sinks into a squat, fists low → both fists high overhead, its back arched, stretched → fists trembling, eye and core blazing. The slam lands squashed. | Its head snaps back a little (flinch only). | It rocks back and its fists drop; a 1.2 s dissolve, the core fading last. |

### Stonefall Hollows: Quarry constructs
| Enemy (wind-up) | Family look | Wind-up: gather → coil → peak | Flinch / stagger | Death |
| --- | --- | --- | --- | --- |
| **Charger** (charge, 45) | The horned ram and its rune horns kept. Its body is layered slate plates, and its leg bands are ley-iron with a cyan vein (the body's brass bands stay). | Its head rears up and back → head down, horns forward, pawing (today's two frames, deeper) → haunches coiled low, horns blazing, trembling. The charge is a stretched gallop. | Its head jerks back / it rears onto its hind legs. The wall stun is redrawn. | Its legs buckle and the horn runes go dark. |
| **Burrower** (burrow, 50, underground) | Stone plates as layered slate, the drill snout, ley-iron claws with a cyan vein. | The wind-up is spent underground, so its phases are the ripple's: the mound settles → swells and cracks wider with progress, the dust thickening → rises to 1.4× and trembles. The dig-in squashes and the eruption stretches. | Plates rattle, snout up / rolled half onto its side. | It curls up and dissolves. |
| **Shardback** (bash, 40) | The shield plate is layered slate with a ley-iron rim; its ley crystals stay. | Hunches behind the plate → the plate drawn far back, the body twisted back on a planted foot → crystals flaring, trembling. The block is unchanged. | Rocked back behind the plate / the plate lifted, its front open. | It sinks behind the plate. |
| **Sniper construct** (snipe, 84: track 60, lock 24) | Tripod legs of ley-iron, a slate housing, the brass collar and the great lens. | Legs splay and it drops low → leaning into the aim through the tracking, the lens brightening → from the sim's lock, legs braced wide, the lens blazing, trembling. The recoil is bigger. | The tripod wobbles / a leg kicks up. | Its legs fold; the lens fades last. |
| **Bulwark** (boss: pound 60, lob 30 then throw 12, stomp brace 40) | Quarry stone bound in ley-iron with cyan veins, the rune-carved shield, the gold seam. | **Pound:** the shield lifts and it sinks → the shield raised high in both arms, stretched → trembling. **Lob:** reaches back → the arm high with the bomb, leaning far back → trembling; the throw stretches. **Brace:** weight onto the shield → the back foot lifted high → trembling; the stomp squashes. The back wave keeps its telegraph only. | Flinch only. The block is unchanged. The roar is 080's. | It drops to one knee behind its shield; a 1.2 s dissolve, the seam halo fading with it. |

### The Emberworks: Forge constructs
| Enemy (wind-up) | Family look | Wind-up: gather → coil → peak | Flinch / stagger | Death |
| --- | --- | --- | --- | --- |
| **Cinder mote** (swell, 45) | The ember in its slag cage; the cage is sooty iron with brass rivets; the ley rivet stays cyan. | The cage contracts and the ember dims → the ember swells and flickers (today's swell scale kept) → the bars bow out round a white-hot core, a fast tremble. The burst is unchanged. | The cage rattles and the ember sputters / knocked spinning. | Killed, its death burst plays as today, with half the motes. |
| **Bellows hound** (dash, 45) | The iron frame sooty, cinder in its throat vent and seams, the leather bellows and brass ribs kept. | Rears back on its haunches, the bellows filling → crouched low, the bellows drawing in (today's two frames, deeper) → paws dug in, coiled tight, eyes and vent blazing, trembling. The dash stretches flat. | Its head jerks / knocked sideways, legs splayed. | It collapses and its bellows deflate. |
| **Slag golem** (slam, 54) | Soot-ash crust over glowing cinder seams, the core. | Sinks with its fists dragging → both fists heaved high, stretched → the core blazing, trembling. The slam squashes 0.2. | Crust shudders / a crust plate knocked askew. | The slump-and-crack as its struck pose, the whelps rising (sim), then the dissolve. |
| **Slag whelp** (swipe, 30) | The same slag, small. | A squish → rears up tall, leaning back → trembling. | A squish / it tumbles back. | A small dissolve. |
| **Kiln-tender** (beam, 30) | Rust brick with brass bands, sooty iron legs, the cinder firebox and the cyan rune kept. | Settles on its legs → the nozzle swings up to aim and the firebox flares → the nozzle glowing, trembling. The beam is unchanged. | Wobbles on three legs / tipped, its lid rattling. | The firebox gutters out. |
| **Forgewright** (boss: slam 54, spray 45, flood 90; bellows) | Riveted iron over its forge core, soot up the lower plates, brass fittings, cinder seams, the ember-eyed helm and the cyan seam kept. The bellows (whole, broken, patching) take the same look. | **Slam:** the hammer drawn down and back → raised high, leaning back → trembling. **Spray:** the hammer low → drawn back to the side, the body twisted, the head glowing → trembling. **Flood:** both hands on the haft, squatting → raised high overhead, arched and stretched → trembling (the longest hold). The vent stagger is redrawn. | Flinch only. The block is unchanged. Heat and phases are 080's. | The hammer drops and the helm sags; a 1.2 s dissolve, the bellows going with it. |

### The Stormcrown: Storm-works
| Enemy (wind-up) | Family look | Wind-up: gather → coil → peak | Flinch / stagger | Death |
| --- | --- | --- | --- | --- |
| **Thunderhawk** (dive, 45) | Slate plates on the brass frame, storm-glass at the wing joints, its wing veins violet. | Wings fold in and it climbs → rears up with the wings swept high, tail fanned → wings flared, veins blazing, beak down the line, trembling. The dive stretches. | Knocked tumbling in the air / it tumbles further, wings askew. | Its wings fold and it drops toward its shadow as it dissolves. |
| **Static mite** (zap, 30) | Slate shell, brass rim, storm-glass flecks, its seam and spark violet. | It hunkers → antennae up, the spark swelling (two frames) → the shell split wide, the spark white-violet, a fast tremble. | Shell rattles / flipped half over. | The discharge as today, then a small dissolve. |
| **Storm sentinel** (strike, 60) | Slate drum, brass bands, a storm-glass lens and rod tip, violet charge. | Settles low on its feet → the drum stretches tall and the rod tip and lens charge (two frames) → crackling, trembling. | The drum rocks / it tips onto two feet. | The rod topples. |
| **Gale ram** (gust, 54) | Slate housing, brass horns and shod legs, storm-glass blade tips; its hub stays cyan (a ley mark, not lightning). | Rears back on its hind legs → head down, the fan spinning up (two frames) → planted wide, the fan a blur, trembling. The gust recoils with a squash. | Knocked sideways, its fan wobbling / the same, harder, a foreleg up. | The fan winds down. |
| **Conductor** (boss: lash 45, call 60, chain 60; rods) | Slate-violet robe, iron body, brass collar and crown; the crown's sparks violet; a storm-glass head on the staff; cyan eyes kept. The arena rods (standing, broken, regrowing) take the family look, their lightning violet. | **Lash:** the staff dipped across its body → drawn far back, the robe swept → crackling violet, trembling. **Call:** the staff lowered, crouching → raised high overhead, stretched → trembling. **Chain:** arms in → spread wide, the robe flared → trembling. The blink is unchanged. | Flinch only. The enrage is 080's. | The staff falls and the crown's sparks die; a 1.2 s dissolve. |

### Size of the work
- **Art:** 19 rigs redrawn in three views (57 view drawings), plus the bellows' and rods' frames and the Burrower's ripple.
- **Poses:** about 156 key poses.
  - The 15 enemies and the Warden: about 7–8 each (wind-up 3–4, flinch 1, stagger 2, death 1).
  - The Bulwark, Forgewright and Conductor: about 13 each (three attacks' strips, the flinch, the death).
  - Baked in three views, that is about 440 frames redrawn.
- **Frames:** baked enemy frames grow by about 210 net (about +28%), since the 4-frame death becomes 1. The budget is +35% (at most 990 frames).
- **Code:** the motion function and clocks, the dissolve and the motes in render; the family, motion and mote data; tests.

**Recommendation: split it.** It is about twice 075's art. Default:
- This spec stays one spec and one PR, built in two slices with a commit and CI green at the end of each.
- If slice A alone fills a session, the build stops there. Slice B becomes 076b, its own spec file and draft PR stacked on this branch, recorded under "Raised after the build". Shaun plays slice A as 076.

The slices:
- **Slice A (076a):**
  - the shared systems: families, squash, the wind-up phases, the flinch and stagger clocks, the dissolve, the death motes and budget, the `ui()` fields, and the timing and determinism tests;
  - the 8 rigs of Region 1 and the Hollows: Husk, Wisp, Warden, Charger, Burrower, Shardback, Sniper, Bulwark.
- **Slice B (076b):** the 11 rigs of the Emberworks and the Stormcrown: cinder mote, bellows hound, slag golem, slag whelp, kiln-tender, Forgewright and bellows, thunderhawk, static mite, storm sentinel, gale ram, Conductor and rods. Until slice B lands, these rigs keep today's art, but take the shared wind-up phases, reactions and dissolve (their single wind-up pose stands for all three phases).

## Readability
- Enemies are in 074's readability layer: never darkened by a mood. The light catch adds to them on Medium and High.
- A wind-up's peak is the most extreme pose an enemy has, so the tell reads at game size. In a Playwright test at 1 world px per px:
  - each enemy's coil moves its attack part (claw, fist, hammer, staff, plate, head) at least 4 world px from idle (bosses 6);
  - its peak trembles.
- Telegraph colours and shapes are unchanged in every region and tier.
- No screen shake: `SHAKE_ON` stays false, and nothing in 076 moves the camera.

## Acceptance criteria
- [x] **Families:** `ENEMY_FAMILIES` holds the four families above. Every enemy id in `ENEMIES` is in exactly one, every id in a family is a real enemy, and every colour is a palette id. No palette entries are added.
- [x] **Look:** every rig is drawn with gradients, the `rim` style in its family's rim colour and the ink outline, and shows its family marks in every view (the contact sheet and review shots).
- [x] **Size:** `feetBox`, `hurtbox` and rig `scale` match a baseline committed from main. Each rig's idle drawn height is within ±10% of main's in each view.
- [x] **Wind-up phases:** a unit test on `enemyMotion` shows gather, coil and peak at the fractions above for every attack in the tables, the peak at least 5 ticks, the Sniper's peak starting at its lock, and the tremble only in the peak. In Playwright, an enemy's `ui().enemyArt` phase walks gather → coil → peak through a real wind-up, and the attack starts on the same tick as before.
- [x] **Sim timing unchanged:**
  - every attack's wind-up, attack, recovery and cooldown ticks equal a baseline table committed from main (data test);
  - a sim test that runs each enemy into its attacks counts the same wind-up ticks per attack as the baseline recorded on main;
  - the same seed and commands give the same `getState()` hash as main over a scripted fight per region, and the same on Low and High;
  - no file under `src/sim` changes, and `SAVE_VERSION` is unchanged.
- [x] **Flinch and stagger:** a unit test shows a small hit choosing flinch, a frame's hits of 40% or more (or a punch) choosing stagger, a boss never staggering, no reaction during a wind-up or attack, and a starting wind-up cutting a stagger off. In Playwright, a punch on a ring 1 Husk shows a stagger and a single arrow shows a flinch. The hit flash, numbers and hit-stop are unchanged.
- [x] **Death dissolve:**
  - a death shows the struck pose, then the dissolve, over about 600 ms (bosses 1.4 s), and the corpse no longer lingers;
  - the motes rise from the body in the family's colours (pixel check on the motes' hues per family);
  - the cinder mote's burst, the mite's discharge and the golem's split still play;
  - the death sound plays once per death.
- [x] **Mote budget:**
  - unit tests on the mote count: size class, champion, tier, per-death cap, live cap and total budget;
  - in Playwright, killing 10 Hollows enemies at once (sandbox, god mode, one big burst) on each tier never shows more live death motes than that tier's cap or more particles than its budget;
  - Low throws half of Medium's motes.
- [x] **Frames registered:**
  - every rig has, in every view, its wind-up strip for each attack, `hit`, `stagger` (bosses excepted) and a 1-frame `death`;
  - every frame is in `ENEMY_ANIMS` with one pose per frame (the existing art tests, extended);
  - the vector-frame registration test passes;
  - /sheet.html shows every new pose under its family with no console errors (Playwright checks the labels against the rigs);
  - a sandbox run that spawns every enemy and forces each pose logs no "frame never drawn" error.
- [x] **No shake:** `SHAKE_ON` is false and the camera doesn't move through a wind-up, a stagger or a boss's death.
- [x] **Performance:**
  - enemy frames grow by at most 35% over main's 733;
  - the boot bake time and texture pages are measured and reported in the PR;
  - 074's Low frame-time probe and newGameAfterQuit.spec.ts stay green;
  - a ring 5 pack fight's mean frame time on Medium is reported.
- [x] **Docs:** art.md gains an "Enemies" section: the families and their ids, the rim, the wind-up phases, the reactions and the dissolve.
- [x] **Review shots (docs/review/076):**
  - the contact sheet per family;
  - each family's pack in its own region mood on Medium;
  - every enemy's gather, coil and peak at game size and at 4×;
  - a flinch and a stagger;
  - a dissolve mid-way per family;
  - the motes on Low, Medium and High.

## Data changes
- `src/data/art/enemyFamilies.ts` (new): `ENEMY_FAMILIES` (members, ramps, rim, motes) and `DEATH_SIZE` (size class by enemy id).
- `src/data/art/enemyMotion.ts` (new): `ENEMY_MOTION`, which holds:
  - the phase fractions with per-attack overrides (the Sniper's lock);
  - the tremble's px and Hz;
  - the release snap;
  - the flinch and stagger timing;
  - the stagger threshold (0.4 of max health in one frame; punches always);
  - the dissolve's struck and fade ms and its tint alpha.
- `src/data/art/enemyRig.ts`:
  - `squash` in `EnemyPose`;
  - the `stagger` pose name;
  - the wind-up strips: `windup`, and each boss attack pose, become gather, coil (1–2 frames) and peak.
- `DEATH_POSES` goes once unused.
- Every rig file in `src/data/art` is redrawn. Files that pass about 300 lines split, for example `bulwarkParts.ts`.
- `src/data/enemyAnims.ts`: a `stagger` anim per view (not for bosses), wind-up strips by progress, and death as 1 frame.
- `src/data/juice.ts`: `DEATH_MOTES` and `PARTICLE_BUDGET`. `deathMotes` goes.
- `src/data/assets.ts`: `ENEMY_FX.corpseLingerMs` and `corpseFadeMs` go.
- No sim, save or palette changes.

## Out of scope
- **080:** boss intros, the spawn shake, name cards and every phase change (the Bulwark's roar and enrage, the Forgewright's heat look, the Conductor's enrage).
- **078:** ammo trails and impacts, the rest of the particle set, and bringing every other burst under `PARTICLE_BUDGET`.
- **077:** world props, landmarks (the Husk Hive), ambient life and weather.
- Also out:
  - the hit flash, damage numbers, hit particles and hit-stop (unchanged on Shaun's call);
  - idle life (not chosen);
  - screen shake;
  - telegraphs;
  - enemy projectiles (the Wisp's orb, the Sniper's bolt, embers, bombs);
  - champions' glow and labels;
  - sounds;
  - any change to hitboxes, scale, AI, ranges or timings.

## Test plan
- **Data (tests/data):**
  - the family membership and colour checks;
  - the timing baseline;
  - the size baseline;
  - every rig's poses and frames (wind-up strips, hit, stagger, death) against `ENEMY_ANIMS`;
  - frame registration;
  - the frame count within +35%.
- **Sim (tests/sim):** `windupTicks.test.ts`, each enemy and each boss attack run to its wind-up's end, its tick counts against the baseline JSON recorded on main in the build's first commit; the `getState()` hash per region against main's.
- **Render (tests/render, Vitest):**
  - `enemyMotion` at fixed progress for every attack (phases, peak length, the Sniper's lock, the tremble);
  - flinch or stagger choice and timing;
  - the dissolve curve;
  - the mote count and caps per tier;
  - squash keeping the feet planted.
- **Playwright:**
  - `ui().enemyArt` reports per enemy `{ id, family, pose, phase, reaction, squash }`, and `ui().particles` reports `{ live, deathMotes, dissolving }`;
  - a wind-up walking its phases with the attack on the same tick;
  - the game-size coil and peak checks;
  - flinch versus stagger;
  - a dissolve per family with its mote hues;
  - the mote caps on each tier;
  - the sheet's labels with no console errors;
  - every pose forced in the sandbox with no missing frame;
  - the camera staying still;
  - the review shots.
- **Kept green:** art.spec.ts, the enemy e2e files (hollowsEnemies, emberworksEnemies, stormcrownEnemies, the boss specs), newGameAfterQuit.spec.ts, 074's Low probe and the e2e files the change touches. The full suite runs in CI.

## Decisions in this draft
For Shaun's OK at the playtest; the conservative choice is what gets built.
- **Families are named from data:** Mossbound ruins, Quarry constructs, Forge constructs and Storm-works. Each uses only existing palette ids. An enemy's family follows its home region, wherever it stands.
- **The Hollows' slate** is its existing grey-blue quarry stone cut into layered plates. The violet `storm-*` slate stays the Stormcrown's, so the two regions don't look alike.
- **Brass stays** as small fittings in the Hollows and the Stormcrown, since it is part of those designs.
- **Stormcrown lightning turns violet** (074's rule: lightning is storm violet), while the builders' ley marks (runes, rivets, the Conductor's eyes, the gale ram's hub) stay cyan.
- **The Wisp stays violet** (art.md), with a mossy ruin-stone mask.
- **Rim light is static**, from the top left, in a colour per family. 074's light catch is the dynamic part.
- **Wind-ups are picked by progress**: gather 20%, coil to 85%, peak the rest (at least 5 ticks), so they always fit the sim's wind-up. The Sniper's peak is its lock.
- **The tremble** is the sprite's own (±0.8 px, bosses ±1.2), never the camera.
- **Stagger:** at least 40% of max health in one frame, or a punch. Bosses flinch only. No reaction shows during a wind-up or attack.
- **Deaths:** the corpse and its linger are replaced by a 600 ms dissolve (bosses 1.4 s). The cyan point burst is replaced by family motes from the whole body. Gameplay death effects (the mote's burst, the mite's discharge, the golem's split) and the sound are kept.
- **Emberworks motes are brass-gold**, not ember red, so a death isn't mistaken for the cinder mote's burning burst.
- **Mote numbers:** 10, 16, 24 or 60 by size, ×1.5 for a champion, ×0.5, ×1 or ×1.5 by quality. Per-death caps of 30, 60 and 90, live caps of 60, 120 and 200, and a total budget of 150, 300 and 500. The cap is hard.
- **The particle budget** is defined here; in 076 only the death motes obey it, and 078 extends it to the rest.
- **The Forgewright's bellows and the Conductor's rods** get the family look but no new animation. The bellows dissolve with their boss.
- **Splitting:** built as one PR in two slices. Slice B becomes 076b only if slice A fills a session.
- **Build base:** after 074 and 075 merge, or with their branches merged in.

## Open questions
None.

## Results
Built on `claude/076-enemy-polish` (InsanityWolfz/Pipeline#93) to docs/plans/076-enemy-polish.md, both slices (A: the shared systems, Region 1 and the Hollows; B: the Emberworks and the Stormcrown) in this PR. **Stacked on 074 and 075** (both merged into this branch; it must merge after them). No file under `src/sim` changes, the palette doesn't change, and nothing in the save changes: **`SAVE_VERSION` is unchanged**.

- **Families and look:** `ENEMY_FAMILIES` and `DEATH_SIZE` (`src/data/art/enemyFamilies.ts`), the shared shading and marks (`enemyLook.ts`: `lit*`, the family rim, moss tufts, rune discs, slate lips, ley-iron bands, soot, cinder seams, rivets, storm-glass, violet veins). All 19 rigs redrawn in three views; the Forgewright's bellows and the Conductor's rods too.
- **Motion:** `ENEMY_MOTION` and `WINDUP_STRIPS` (`enemyMotion.ts`, data); the pure `enemyMotion.ts`, `enemyReaction.ts` and `deathMotes.ts` (render); `enemyArt.ts` picks each frame's anim or held strip frame, squash and tremble; poses are matrices (`vector/enemyPose.ts`) shared by drawing, `posedPoint` and `rigBounds`. `EnemyView` reads the frame's hits for staggers; `DissolveView` (from `EffectsView`) runs the deaths; `Particles` counts death motes. `ui()` gains `enemyArt`, `particles: { live, deathMotes, thrown, dissolving }` and `vectorBake`.
- **Frames:** 954 enemy frames (main 733: +30%, within the +35% budget), 1,824 frames in all (main 1,602; 075's head the same as main's, its wanderer drawn live). **Boot bake against main** (review 9; the same headless software renderer, both dev servers side by side, median of 3): at 2× (1280×720) main 0.63 s and 8 texture pages, 076 1.13 s and 11 pages; at 3× (1920×1080) main 1.08 s and 16 pages, 076 1.92 s and 24 pages. Boot to ready: 3.1 s against 3.8 s at 2×, 3.8 s against 5.1 s at 3× (075's head: 3.3 s and 3.9 s). The bake grows by more than the frames (+14%) since the redrawn frames are bigger (boxes grew for stretched poses, 076.4) and carry gradients.
- **Tests:** `npm run check` green (see the PR for the count); new: tests/data/enemyFamilies, enemyTiming (+ JSON from main), enemySize (+ JSON from main); tests/sim/windupTicks (+ JSON from main), regionHash (+ JSON from main); tests/render/enemyMotion, enemyReaction, deathMotes, enemyTells (tells, boxes, feet through a squash); tests/data/enemyGait (076.11: locomotion cadence, bob and squash).
- **e2e** (each alone, `--workers=1`): enemyPolish.spec.ts (a Husk's gather → coil → peak through its real wind-up, the swipe on the baseline tick, the peak's tremble, the camera still; one arrow flinches; a punch staggers, reel then recover, cut off by the next wind-up; the same `getState()` on Low and High), enemyDeaths.spec.ts (dissolve lengths; Low 8, Medium 16, High 24 motes for a Husk; ten Hollows enemies at once within each tier's caps and budget; each family's mote hues; the cinder mote's burst), enemySheet.spec.ts (the sheet's labels by family, every enemy fought with no undrawn frame), enemyPolishShots.spec.ts (REVIEW_SHOTS=1). Kept green: art, hollowsEnemies, emberworksEnemies, stormcrownEnemies, forgewright, conductorSandbox, forgewrightSandbox, hollows, newGameAfterQuit, lighting (one 074 check re-read, 076.2), enemies, death, melee, feedback, settings. 074's probe (PROBE=1): Low against the moods off 1.01× in a Stormcrown pack fight; that ring 5 fight's mean frame on Medium 70 ms (Low 67, High 208; headless software renderer, loaded machine).
- **Review shots** in docs/review/076: 01 the contact sheet per family; 02 each family's pack winding up in its region's mood on Medium; 03 every wind-up strip at 4× per family; 04 a dissolve mid-way per family; 05 the enemies' gather, coil and peak at game size (and doubled; 076.7); 07 a stagger; 08 a flinch (Flashes off); 09 the motes on Low, Medium and High. 06 every moving enemy walking in real time (the game's own loop and clocks), a frame copied off the canvas every 1/30 s as drawn, per family, before and after 076.11's calming (`enemyGaitShots.spec.ts`); this machine's software renderer draws 8–13 frames a second, so each row has 11–19 cells over about 1.4 s, labelled with their ms. Measured there: walks step their frames about 6 times a second (3 steps/s) at their walk speeds. (Review: a first take ran on Playwright's fake clock, which distorts Phaser's animation time; retaken.)

### Raised after the build
- **076.1 Tells measured on the posed geometry.** The "coil moves its attack part 4 px (bosses 6)" check runs in Vitest on the same matrices drawEnemy draws with (exact at any zoom), not on Playwright pixels; Playwright checks the phase walk and the tremble.
- **076.2 074's telegraph check (for 074's builder; Shaun FYI).** lighting.spec.ts's "a telegraph reads as red" found its red in the old wanderer's rust robe; with 075's cobalt wanderer the early wind-up's faint arc over Region 1's grass isn't red by its measure. It now reads at the wind-up's 32nd tick, its fill most of the way out; its floor and its Stormcrown ratio are unchanged.
- **076.3 A struck pose per view.** The spec's death had one view; the criteria ask for a 1-frame death in every view, so each rig has `death-side/down/up` and a death faces as it fell.
- **076.4 Boxes grew** where stretched poses would clip (every rig but the slag whelp and static mite); scale, feet boxes, hurtboxes and idle heights (±10%) match main's (tests).
- **076.5 More pose channels than `squash`:** `head`/`headLift` (head parts and glow parts that follow them turn together), `legBack`/`legFront`, `shift`, `spread` and `raise`, so the poses the tables ask for (a claw high over the hood, hands wide apart, a shield raised high, a foot lifted) can be drawn.
- **076.6 The stagger's clock runs on the tween clock** and holds through hit-stop and freezing; the dissolve runs on the tween clock too, so review shots can slow both.
- **076.7 Shot 05's gaps.** The late bosses don't attack outside their arenas and the kiln-tender only beams at a hurt packmate, so shot 05 has the other 13 enemies and the Warden; every strip, theirs included, is in shot 03 at 4×.
- **076.8 The death sound** has no test hook; its path is unchanged (FeelView plays it per death event, once a frame as before).
- **076.9 074's probe:** its soft ground-chunk bake ratio read 1.40 against 1.25 here (074's blended ground; 076 doesn't touch it).
- **076.11 Locomotion calmed after Shaun's playtest of 075's wanderer** ("a million steps a second", bouncing). The audit: every enemy walks 4 frames at 6 fps, two steps a cycle, so **3 steps a second** (hoverers and flyers 1.5 cycles a second), unchanged from main and below 075's new 3.5–4; the bobs and squashes were the bouncy part. Changed (bob top to bottom in world px, the rig's scale applied; squash from rest): Wisp hover 1.8 → 0.9; Pylon Warden bob 1.9 → 0.95, squash 0.03 → 0.015; Bulwark bob 2 → 1, squash 0.02 → 0.015, its turn shuffle 6 → 3 steps/s; Forgewright bob 2 → 1, squash 0.02 → 0.015; Charger 1.5 → 1; Burrower squash 0.04 → 0.015; Shardback bob 1.5 → 1, squash 0.03 → 0.015, its turn shuffle 6 → 3 steps/s; Sniper bob 1.5 → 1, its sidestep 6 → 3 steps/s; cinder mote hover 2 → 1; bellows hound 1.5 → 1; slag whelp bob 1 → 0.5, squash 0.05 → 0.015; thunderhawk flap bob 2 → 1. The rest were already inside the bound (Husk 0.8, slag golem, kiln-tender and Conductor 1, static mite, storm sentinel and gale ram 0.5). The guard (`tests/data/enemyGait.test.ts`): walkers at most 4 steps a second and at most 1.25× the steps their walk speed needs for the stride they draw; hoverers at most 1.5 cycles a second; bob at most 1 world px top to bottom and frame to frame; squash within 0.015 (075's). The cadence isn't scaled by speed, so fast movers' feet slide rather than paddle (the static mite at 90 px/s draws a 2.4 px stride): calm over matched.
- **076.12 Review fixes:** slams, stomps and the static mite's discharge take no release stretch, so their baked impact squash lands (`ENEMY_MOTION.release.none`); the Forgewright's standing bellows take their quarters out of its one capped total (broken ones don't dissolve), so its death keeps the per-death cap; the region fights fingerprint main's summary (without 075's `wornRarity`) and both baselines were re-recorded on origin/main, the Forgewright's slam wind-up among them; the kiln-tender's beam and the Sniper's laser leave the part as the sprite shows it (the frame it holds, its squash and tremble); staggers weigh each sim tick's hits; `enemyArt` allocates nothing per enemy per frame; the mote colour check compares families by pixels with the body masked out.
- **076.13 Telegraphs rimmed in danger.** 074's Region 1 check ("a telegraph reads as red") read 25.3 against its floor of 25 on 076 (25.3–25.5 with 077, 24.7 on 078's stack): barely readable on sunlit grass. Every ground telegraph now has a near-opaque `danger` rim round its full extent and a fill strengthening to 0.85 by the peak; the floor is unchanged. The check's redness (Husk, wind-up tick 32, High), before → after: Region 1 25.3 → 69.6, the Hollows 38.1 → 74.7, the Stormcrown 39.4 → 69.5, the Emberworks 67.2 → 93.2; on 076 merged with 077, 69.5, 74.7, 70.4 and 93.0.
- **076.10 For Shaun's eye at the playtest:** the family looks and their marks; the strength of the wind-ups and the tremble; the stagger threshold (40%); the dissolve's speed and the motes' colours, Emberworks' brass-gold; the Stormcrown's violet lightning against the cyan ley marks.

