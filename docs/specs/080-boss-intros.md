# 080: Boss intros and phases
status: approved

Approved by Shaun in chat, 2026-10-27, with the whole art pass (074–081); its plan is pre-approved.

Drafted from Shaun's art-pass interview (docs/brainstorm/2026-10-27-art-interview.md, answers 11, 17, 23, 24, 27 and 28) and his calls on 080 that day. This is art spec 7 of 8, built in order after 074–079. Shaun asked for no sample pages first ("Just build it"); he reviews the result at the playtest.

## Goal
Every boss fight opens with a short show. The boss rises or forms with a spawn animation, the screen shakes once as it lands its first blow, and a name card on a stone tablet names it. About 2.75 s later the fight starts. During the intro the boss can't act and can't be hit, and the player can move freely and takes no damage. In the fight, each boss phase the sim already has shows on the body: a colour shift, a glow, and a new pose or new parts.

## Shaun's calls (2026-10-27)
- **Boss intros:** a spawn animation, then a name card, about 2–3 s. The boss rises or forms with a short animation.
- **Screen shake:** in his words, "the only time a screen shake makes sense is like during a boss spawn animation". The spawn animation is the only place the game shakes. It is brief, and an accessibility toggle turns it off.
- **Boss phases:** make phase changes visible with a colour shift, a glow, and a new pose or parts.
- **"Just build it":** no sample pages.

## Design references
- docs/design.md "Camera and art" (the 2026-10-27 wording, applied by 074): snappy, exaggerated animation with squash, stretch and anticipation; bosses' attacks light their surroundings; a Graphics quality setting; "Screen shake is used only in boss spawn animations."
- docs/design.md "Bosses are engineering puzzles" and "Boss gates" (the altar's offering summons a boss again after its first kill).
- docs/art.md: "HUD, menus and text" (the stone tablets and the two fonts), "Vector sprites" (rigs and poses), and the "Enemies" section 076 adds (families, wind-up strips, the dissolve).
- docs/specs/076-enemy-polish.md: the four boss rigs redrawn in their families, pose matrices and channels (`squash`, `head`, `raise` and so on, 076.5), wind-up strips picked by progress, bosses flinch only, `PARTICLE_BUDGET`, and its out-of-scope line: "080: boss intros, the spawn shake, name cards and every phase change (the Bulwark's roar and enrage, the Forgewright's heat look, the Conductor's enrage)".
- docs/specs/074-light-and-moods.md: light sources, the quality tiers and the readability layer (bosses are never darkened by a mood).
- docs/specs/078-ammo-visuals.md: every burst under `PARTICLE_BUDGET`.
- The fights: 009 (the Pylon Warden), 034 and 041 (the Bulwark, its adds and enrage), 043 and 055 (the arena doors and the lock), 059 (arena enemies wait inside), 060 and 068 (the Forgewright's heat, vent and enrage), 064 and 068 (the Conductor's rods, storm shield, grounding and enrage), 072 (the return waystones), 073 (arena enemies follow the boss rules), and the fix-playtest-ui camera lift (`BOSS_LOOK`, which 071's review noted).
- 042.10 (the Flashes setting) and 014 (`SHAKE`, `SHAKE_ON`, which has been false since 2026-10-20).

## Depends on
074–079, built in order. 076 matters most: the boss rigs, pose channels, families and the particle budget. 072 and 073 matter for the arena rules and `SAVE_VERSION`. The build starts once they're on main. If one is still unmerged then, the build merges its branch in first and says so in the PR.

## The bosses today
| Boss | Arena (door) | Wakes today | Phases in sim today | Bar |
| --- | --- | --- | --- | --- |
| **Pylon Warden** (009) | the Shrine (south door) | within 200 px, once the player is inside (059) | none: one slam, 200 HP | none (not a region boss) |
| **Bulwark** (034, 041) | Sunken Forum (north door) | the player's feet inside | adds at 50% (`addsRisen`); enrage at 30% (`enraged`, a 60-tick `roar`, then a faster turn and lobs) | name, health, red when enraged |
| **Forgewright** (060, 068) | Anvil Hall (south door) | the same | heat 0–100 (`heat`, full → the Forge Flood); vent (`vent`, both bellows broken); enrage at 50% (`enraged`, heat ×1.5) | name, health, blue while plated, heat gauge |
| **Conductor** (064, 068) | Crown Spire (south door) | the same | storm shield while 3+ rods stand (`stormShielded`); grounded under 2 (`grounded`); enrage at 50% (`enraged`, faster blinks) | name, health, blue while shielded |

- **Doors (055):** E at the door goes in. While the boss fights, the door draws locked. E from inside leaves, and the boss resets at once (`resetBoss`).
- **Altars (034):** after the first kill, the offering cracks the ground for 120 ticks (2 s), then the boss rises at its start. The altar stands inside the arena, so the player is already in.
- **KO:** a dying player sends the boss home (the Conductor resets at once). The world reset rebuilds every boss at its post; a summoned one lives on through a KO.
- **Return waystones (072)** sit outside each region boss's door. 073 exempts everything inside a boss arena from the on-screen rule.
- **On screen at the wake:** the Forum's boss stands 160 px below the door's landing and the Anvil Hall's 128 px above. **The Conductor stands about 320 px north of its landing**, beyond the 180 px half-height even with the 96 px lift. So a pan is needed for the Conductor (below).

## The sim timing rule
**The intro doesn't pause the game.** The world runs on. The boss, and everything posted in its arena, is *inactive and untargetable* for the intro's ticks. The player moves, rolls and fires freely and takes no damage.

1. **When it starts:** on the first tick the player stands inside an arena while its boss is `idle` at its post (a new step, `stepIntros`, before the enemies think). For the Bulwark, Forgewright and Conductor that is the tick they wake today. For the Warden it is the tick the player is first inside the shrine, which is now its wake (it no longer waits to come within 200 px; 073.5 already gives arena enemies the boss rules).
2. **What it is:** the boss enters a new mode, `intro`, with `modeTicks` counting from 1. Every enemy posted in the same arena (059's `arenaOfPost`: the Warden's Wisps and Husks) enters `intro` on the same tick, for the same length.
3. **How long:** `BOSS_INTRO.fullTicks` = **165 ticks (2.75 s)** for a first fight and every restart. `BOSS_INTRO.shortTicks` = **60 ticks (1 s)** for a re-fight. A re-fight is a fight with a boss already in `bossDefeats`, which is only reachable through the altar. Both are data in `src/data/bossIntro.ts`.
4. **While in `intro`, an enemy:**
   - doesn't think, move, turn, or count any cooldown, timer or counter. This covers its attacks, the Bulwark's behind counter, wave and adds timers, the Forgewright's heat and spray cooldown, and the Conductor's blink and attack cooldowns. `stepEnemies` skips it as it skips a rising add (041);
   - is **untargetable**: `immune` is true, as for a rising add. Shots pass through it, and punches, Bursts, Bomblets, mines, arcs and burns don't touch it. Its parts (the bellows and the rods) take no hits either, since parts ask `immune`;
   - is `engaged`, so the door draws locked and the boss bar shows (below).
5. **The player takes no damage** while standing inside an arena whose boss is in `intro`. `damagePlayer` returns early (no hit, no knockback, no Wardstone use). Nothing in the arena can attack then anyway; this guards against a burn or a leftover pool.
6. **When it ends:** on the tick `modeTicks` reaches the intro's length, every enemy in that intro goes to `chase` with `modeTicks` 0. Each boss's wake set-up runs then, as at today's wake (for example the Bulwark's and Forgewright's lob and spray cooldowns). From that tick, the fight plays out exactly as today's fight from its wake.
7. **Facing:** unchanged. The intro doesn't turn anyone. The Bulwark faces down at its post, away from the Forum's north door, so its intro shows its back and its gold seam. Its shield's slow turn starts when the fight does, as today.
8. **Leaving during the intro** (E at the door) resets the boss and its posted enemies, as 055 does. Coming back in plays the full intro again.
9. **The intro plays again only when the fight restarts:**
   - after any `resetBoss` (leaving by the door, the Conductor's leash or a KO);
   - after a world reset (a KO's wake);
   - after a leash that walks the boss home to `idle`.
   A boss in `return` (still walking home) that the player meets again resumes its fight with no intro, as today.
10. **A summoned re-fight:** the boss rises at the end of the altar's 120-tick crack (unchanged) as `idle`, with the player inside. The next tick starts its **short** intro. From offering to fight is 3 s: the 2 s crack, then the 1 s rise.
11. **Edge case, a boss woken from outside its arena** (for example a bomb lobbed over the wall with the player outside): it wakes as today, with no intro, and goes home by its leash. The next fresh wake, with the player inside, plays the intro.
12. **Determinism:** no randomness and no wall-clock time. The same seed and commands give the same `getState()`, the intro's ticks included.
13. **Save:** `intro` is a new `EnemyMode` value, and `stepIntros` adds an event (`bossIntros: { id, enemyId, short }`). `SAVE_VERSION` goes up by one over main's at build time.

## The intro, as drawn (render)
Render reads `mode === 'intro'`, `modeTicks` and whether the intro is short. Every beat is placed by **intro ticks**, so it fits the sim's window exactly, holds when the game pauses, and samples at fixed ticks in tests. Timings are data (`INTRO_LOOK` in `src/data/art/bossIntro.ts`).

### Full intro (165 ticks)
| Beat | Ticks (time) | What happens |
| --- | --- | --- |
| **Dormant** | before the intro | A boss `idle` at its post shows its new `dormant` pose: asleep, cold, its glows dark. It returns to it after a reset. |
| **Stir** | 0–18 (0–0.3 s) | A tremor at its feet (a small dust or spark ring) and a first glint of its glow. The camera starts its pan. |
| **Rise** | 18–72 (0.3–1.2 s) | The main move, in three poses picked by progress, with 076's squash and stretch: it stands up or comes together. |
| **Beat** | 72–84 (1.2–1.4 s) | One heavy blow or strike, with its existing heaviest sound. **The shake** starts on tick 72. |
| **Ready** | 84–165 (1.4–2.75 s) | A challenge pose with its glows at full, on a slow two-frame breathe. |
| **Name card** | in 84–96, held to 147, out 147–165 | It fades in while scaling from 0.9 to 1 (snappy), holds, then fades out. It is fully readable for 0.85 s and gone as the fight starts. |
| **Boss bar** | from tick 0 | Region bosses only: the frame and name fade in with the card, and the fill runs from empty to full over ticks 84–132. `ui().bossBar.health` still reports the sim's health. |
| **Pan** | in 0–24, out 141–165 | The full intro only (below). |

### Short intro (60 ticks, an altar re-fight)
The boss comes up out of the altar's crack, with the summon's existing flare.
- **Rise** (0–30): the last half of its rise poses.
- **Beat** (30–40): the blow, a smaller shake.
- **Ready** (40–60).
- The bar fills over 0–60.
- **No name card and no pan.** The player is at the altar and watched the crack open.

### Per boss
Each boss keeps its 076 family look. Each gets new poses in three views (side, down, up): `dormant`, `intro-stir`, `intro-rise` (three frames), `intro-beat` and `intro-ready` (two frames).

| Boss | Dormant | Stir | Rise (rises or forms) | Beat (the shake) | Ready | Card |
| --- | --- | --- | --- | --- | --- | --- |
| **Pylon Warden** (rises) | knelt on one knee in the moss, head bowed, fists on the ground; eye slit and core dark | pebbles and dust jump at its feet; the core glints cyan | it pushes up on its fists and stands, stretched tall, moss and stone chips falling; the eye slit lights left to right; the core ignites (a 074 light on Medium and High) | both fists down onto the ground: a dust ring and ground cracks that fade over 1 s | fists raised, eye blazing | **Pylon Warden** / *Shrine* |
| **Bulwark** (rises) | crouched behind its shield, planted edge-down in the floor; veins and seam dark | slate dust sifts off it; the veins flicker cyan | it hauls the shield up out of the floor (slate chunks) and stands to full height, veins lighting from its feet up, the gold seam waking | it slams the shield's edge down before it: slate dust ring | the shield raised, the seam pulsing gold | **Bulwark** / *Sunken Forum* |
| **Forgewright** (forms, kindling) | a cold forge: ash-grey iron, seams unlit, helm eyes dark, bellows slack | a red glow in its chest grate; smoke wisps | the bellows pump twice (puffs), then cinder light runs from the core out along every seam, the helm's eyes ignite, and heat shimmers on Medium and High | the hammer lifted and struck into the floor: a spark fountain | the hammer on its shoulder, glowing | **Forgewright** / *Anvil Hall* |
| **Conductor** (forms from lightning) | its robe hangs slack and still, the staff leaning, the crown and eyes dark | the six rods' tips flicker violet in turn round the ring | violet arcs leap from the standing rods to its staff and gather; the robe fills and lifts as it straightens; its eyes light cyan | a violet-white bolt strikes its staff from above | the staff raised high, the crown sparking | **Conductor** / *Crown Spire* |

- **Card text** is the boss's name from its def, over its arena's name from `ARENAS`. No new titles are written (080.4).
- **Particles** (dust, chips, sparks, arcs) take the boss family's colours and count against `PARTICLE_BUDGET` at the tier's counts (Low ×0.5, Medium ×1, High ×1.5).
- **Flashes off:** the Conductor's bolt has no white core, and no glow over 0.25 alpha flickers.
- **Lights:** each boss's ignition (the Warden's core, the Bulwark's seam, the Forgewright's seams, the Conductor's bolt) is a 074 light source on Medium and High. It holds its normal priority, so the room's lights don't drop out.

### The name card
- **Look:** today's stone tablet (`drawTablet`, `TABLET`: carve-dark, the ink edge, brass corners), as the wake panel uses. 081 polishes the tablets later; the card picks that up for free.
- **Text:** the name in Cinzel (`title` style), and under it a brass rule and the arena's name in the `display` style. Both are centred.
- **Size:** the text's width plus padding, at least 160 view px wide.
- **Where:** centred across, its top 8 px under the boss bar's bottom (`bossBarBottom`; the same spot for the Warden, which has no bar).
- **Camera:** drawn on the UI camera, so the shake never moves it, the bar or the HUD.
- A layout test keeps it clear of the bar, the bottom HUD and the boss's sprite box once the pan holds.

### The camera
**A short pan in the full intro.** Proposed because the Conductor would otherwise stand off screen.
- **The focus point** is the boss's body middle: its feet raised by half its drawn height, from `BOSS_LOOK.heights`.
- **The pan in** runs over ticks 0–24 (0.4 s, smoothstep). The camera moves from its follow point to centre on the focus, clamped to the room's bounds as the follow is.
- **The hold** runs to tick 141.
- **The pan out** runs over ticks 141–165 (0.4 s) back to the follow point plus today's boss lift (`bossLookTarget`). The fight starts on the player with the boss framed under the bar, as today.
- **It replaces the boss lift during the intro.** At the end it hands back to the lift with no snap: the last pan frame equals the lift's target.
- **It works like 019's attune look** (`SceneCameras.attuneLook`): the follow stops and the scroll is set from intro ticks, then the follow restarts.
- **The player can walk** during the pan and may leave the frame briefly. Nothing can hurt them.
- **071/073:** the sim's on-screen box (`inAggroBox`) never reads the camera, and everything in a boss arena is exempt from 073's rule. So neither the lift nor the pan changes who may attack. Nothing attacks during the intro anyway.
- The short intro has no pan.

## The shake rule
- **Only here.** The intro's beat is the only screen shake in the game. `SHAKE_ON` stays false, so 014's shake calls (hits, slams, deaths) still only log, and no phase change, wind-up, death or roar shakes.
- **One per intro**, starting on the beat's first tick:

  | Intro | Duration | Intensity | Movement |
  | --- | --- | --- | --- |
  | Full | 300 ms | 0.006 | about ±3.8 px across, ±2.2 px down, at 640×360 |
  | Short | 200 ms | 0.004 | less |

  Both are `INTRO_SHAKE` in `src/data/juice.ts`.
- **Only the world camera shakes.** The UI camera (the card, the bar, the HUD) holds still.
- **The setting:** it is tied to the existing **Flashes** setting (042.10). With Flashes off there is no shake. The Settings row's label becomes **"Flashes and shake"**, so the player can find it. The stored setting and its version are unchanged. As JuiceView already does, a system that asks for reduced motion (`prefers-reduced-motion: reduce`) gets no shake either.
- **Logged:** every intro shake is logged in `ui().shakes` as `intro` (or `intro-short`), with `suppressed: true` when the setting stops it. So tests see it either way.

## Phase changes, as drawn (render)
**Render reads sim state; it never decides a phase.** A pure `bossPhase(e)` in render maps flags the sim already keeps to a look: `enraged`, `addsRisen`, `mode === 'roar'`, `heat / def.heat.max`, `vent`, `stormShielded(e)` and `grounded(e)`. It never compares health to a threshold. A transition plays when a flag flips between frames. A reset puts the calm look straight back.

Phase looks are **overlay parts and colour layers** placed with 076's pose matrices (`posedPoint`), so every attack pose shows them without doubling the baked frames:
- New parts are small separate frames: a flame crest, a storm-glass dome, shield cracks, plate spikes.
- A colour shift is an additive copy of the current frame, tinted the phase's colour at a set alpha, as 076's dissolve tints.

### Pylon Warden
No phase change. The sim gives it none, and adding one would mean a new health threshold, which is new design (080.6).

### Bulwark
| Phase (sim flag) | Colour shift | Glow | New pose or parts | Transition |
| --- | --- | --- | --- | --- |
| **Calm** (start) | 076's look | the gold seam on its back | | |
| **Called** (`addsRisen`, below 50%) | its ley-iron veins brighten, `vein` → `cyan-glow` | a cyan rune course lit across the shield's face (front views) and edge (side) | the shield's rim chipped: two plate lips gone and a crack line | over 0.5 s as the adds rise: the runes light one by one, and slate chips fall |
| **Enraged** (`enraged`, below 30%) | the veins turn `danger`, the stone's gradient darkens, and a `danger` rim light | 041's red seam, red runes and steam, kept and stronger | the shield split along a glowing red crack; shoulder plates lifted into spikes; a lower, forward hunch (pose channels on idle, walk and turn) | the sim's 60-tick `roar`, now a three-frame strip by progress: it rears back with the shield lifted, roars with its head thrown up as a red ring expands from it (no damage, no shake) and steam bursts, then settles into the hunch |

### Forgewright
| Phase (sim state) | Colour shift | Glow | New pose or parts | Transition |
| --- | --- | --- | --- | --- |
| **Heat** (`heat / max`, continuous) | seams by band:<br>• 0–25%: dull `flame-dark`<br>• 25–50%: `cinder`<br>• 50–90%: `cinder-light`<br>• 90–100%: white-hot (`cinder-light` → `snow` core) | grows with heat; at 90%+ heat shimmer over its back (Medium and High) | at full heat (the flood's wind-up), helm eyes blazing | each band eases in over 0.3 s |
| **Vent** (`vent`) | 076's vent stagger and the core glowing through its open plating, kept | the seams follow heat (it keeps filling, 068) | the chest plates drawn swung open (new parts) | as 060 and 076 |
| **Enraged** (`enraged`, below 50%) | the soot fades; the iron plates take a red-hot `iron-rust` → `flame-dark` edge | the hammer head glows `cinder` and trails embers | a flame crest on the helm (new part); the standing bellows pump ×1.5 as fast, from `enrage.heatRate` | a 0.6 s flare: a glow swells over the body and an ember burst. Its pose is the sim's throughout |

### Conductor
| Phase (sim state) | Colour shift | Glow | New pose or parts | Transition |
| --- | --- | --- | --- | --- |
| **Shielded** (`stormShielded`: 3+ rods) | | a storm-glass dome round its body: a `snow` → `storm-pale` → `storm-glow` shell at most 0.3 alpha, arcs crawling on it | the dome (new part) | |
| **Open** (2 rods) | | the dome gone | | **the shield breaks:** the dome cracks and shatters into storm-glass shards over 0.4 s. **The shield returns** as a rod regrows to make 3: the dome fades back in over 0.5 s |
| **Grounded** (`grounded`: under 2 rods) | crown sparks dimmed | violet arcs running from its hem into the floor ("earthed") | the robe's hem dragging, its stance lowered 2 px (pose channel) | arcs snap down over 0.3 s |
| **Enraged** (`enraged`, below 50%) | the robe's storm-glow seams brighter; eyes a brighter `cyan-glow` | the staff head crackling all the time | a halo of violet arcs over the crown (new part) | a 0.6 s flare, as the Forgewright's |

Shielded, open and grounded combine with enraged. 068's blink-in window is unchanged.

## Quality tiers (074's setting)
| | Low | Medium | High |
| --- | --- | --- | --- |
| Intro and phase poses, parts and colour layers | yes | yes | yes |
| Intro and phase particles | ×0.5 | ×1 | ×1.5 |
| Lights from ignitions and phases | none | yes | yes |
| Heat shimmer | none | yes | yes |
| Shake, card, pan | yes | yes | yes |

All particles stay inside `PARTICLE_BUDGET`. On the Canvas renderer the game runs as Low (074).

## Acceptance criteria
- [ ] **Intro window (sim):** for each boss, on the first tick the player stands inside its arena with the boss `idle`:
  - the boss enters `intro` and stays there exactly `fullTicks` (165);
  - it goes to `chase` on the next tick;
  - from its end, its fight matches today's from its wake tick for tick (same seed and commands: same attacks on the same offsets).
- [ ] **Inactive and untargetable:** during the intro the boss neither moves, turns nor attacks. Its cooldowns, heat, blink, behind counter and wave and adds timers don't change. Arrows pass through it; punches, Bursts, mines, Bomblets, arcs and burns don't damage it; its bellows and rods take no hits.
- [ ] **Posted enemies:** the Warden's Wisps and Husks enter and leave `intro` on the same ticks as the Warden, with the same rules.
- [ ] **Player safe:** the player moves, rolls and fires during the intro and loses no health from any source while inside the arena.
- [ ] **Re-fight:** an altar summon raises the boss after the 120-tick crack, then its intro is `shortTicks` (60), with no name card and no pan.
- [ ] **Restarts:** the full intro plays again after leaving by the door, after a KO and wake, and after a leash home to `idle`. It doesn't play for a boss met again while still walking home.
- [ ] **Determinism and save:** the same seed and commands give the same `getState()` through an intro on Low and High. `SAVE_VERSION` is one over main's.
- [ ] **Drawn intro:** `ui().bossIntro` walks dormant → stir → rise → beat → ready on the ticks above for each boss, in every view the boss can face. Every new pose is registered and drawn with no "frame never drawn" error.
- [ ] **Name card:**
  - it shows the name and arena of each boss on today's tablet, in by tick 96 and gone by tick 165;
  - none in a short intro;
  - a layout test keeps it clear of the bar, the bottom HUD and the boss's sprite during the hold;
  - it doesn't move while the world camera shakes.
- [ ] **Shake:**
  - exactly one shake per intro, starting on the beat's first tick, 300 ms at 0.006 (short: 200 ms at 0.004), on the world camera only;
  - none with Flashes off or with reduced motion (logged as suppressed);
  - in a scripted fight against each boss, the camera shakes at no other time: a guard over wind-ups, hits, the roar, every phase flip and the death;
  - `SHAKE_ON` is still false.
- [ ] **Pan:** in a full intro, the boss's sprite box is wholly in view from tick 24 to 141, the Conductor's too. The pan never moves the camera more than 24 view px in one frame at 60 fps. Its last frame meets the boss lift with no jump. The short intro doesn't pan.
- [ ] **Phases read, never decided:**
  - a unit test on `bossPhase` drives every flag combination (Bulwark called and enraged; Forgewright heat bands, vent and enraged; Conductor shielded, open, grounded and enraged) and gets the looks in the tables;
  - a boss at low health with its flag unset shows calm.
  - In Playwright, `ui().bossPhase` follows each flip within one frame, and the look clears on a reset.
- [ ] **Motion judged in motion:** a **real-speed frame strip** (the game running unstepped at 60 fps, a frame every 100 ms) is captured for:
  - each boss's full intro (2.75 s; four strips);
  - one short intro (the Bulwark's);
  - each phase change, about 1 s around the flip: the Bulwark's call and its roar into enrage; the Forgewright's heat bands rising (staged near the band edges), its enrage flare and a vent; the Conductor's shield breaking and returning, its grounding and its enrage flare.

  The strips are saved in docs/review/080, and the build looks at each one before pushing (the render rule).
- [ ] **Budget and performance:**
  - intro and phase particles stay inside `PARTICLE_BUDGET` on each tier;
  - baked enemy frames grow by at most 12% over 076's 954;
  - boot bake time before and after is reported in the PR;
  - 074's Low probe and newGameAfterQuit.spec.ts stay green.
- [ ] **Docs:** art.md's "Enemies" section gains "Boss intros and phases": the beats, the card, the pan, the shake rule and the phase looks. The Settings row reads "Flashes and shake".
- [ ] **Review shots (docs/review/080):**
  - each boss dormant, mid-rise, on the beat and ready with its card, at game size;
  - each phase look per boss on Medium;
  - the card with Flashes off.

## Data changes
- `src/data/bossIntro.ts` (new, read by sim and render): `BOSS_INTRO` (`fullTicks` 165, `shortTicks` 60).
- `src/data/art/bossIntro.ts` (new): `INTRO_LOOK`, which holds:
  - the beat ticks, full and short;
  - the card's ticks, scale, padding, minimum width and offset under the bar;
  - the bar's fill ticks;
  - the pan's ticks, easing and per-frame cap;
  - each boss's beat sound key (an existing sound) and its particle bursts, in family colours.
- `src/data/art/bossPhases.ts` (new): `BOSS_PHASE_LOOK`, which holds:
  - each phase's colour-layer tint and alpha, glow and parts;
  - the heat bands;
  - the transition durations;
  - the dome's alpha cap.
- `src/data/juice.ts`: `INTRO_SHAKE`. `SHAKE_ON` stays false.
- The boss rigs in `src/data/art` (Warden, Bulwark, Forgewright, Conductor):
  - the intro poses in three views;
  - the Bulwark's three-frame `roar` strip and enraged hunch channels;
  - the phase parts: shield runes, chipped rim, red crack and spikes; chest plates and flame crest; dome and arc halo.
  - These are registered in `src/data/assets.ts` and `enemyAnims.ts`.
- `src/data/settings.ts`: `SETTINGS_TEXT.rows.flashes` reads "Flashes and shake".
- **Sim:**
  - `EnemyMode` gains `intro`;
  - `stepIntros` (new, `src/sim/bossIntro.ts`);
  - `immune` and `stepEnemies` honour `intro`;
  - the `damagePlayer` guard;
  - the `bossIntros` event;
  - `SAVE_VERSION` +1.
- No palette changes, and no changes to any boss's health, attacks, ranges, timings or phase thresholds.

## Out of scope
- **081:** the HUD's tablet polish. The card uses today's tablet.
- **New sounds.** The beat reuses an existing sound per boss. No new sound recipes or music.
- **No new phases:** no phase for the Warden, and no new thresholds or mechanics for any boss.
- **No Warden boss bar.** It has none today.
- **Other enemies:** no intro for champions, landmarks' guards, packs or the Bulwark's adds (they keep their rising circles).
- **Deaths:** 076's dissolve is unchanged; there is no outro card.
- **Shake** anywhere but the intro's beat.
- **Doors and altars:** the door, lock and seal looks (055) and the altar's crack (034) are unchanged.
- **Skipping intros:** no skip button and no setting to turn intros off (080.7).

## Test plan
- **Sim (Vitest, tests first), `tests/sim/bossIntro.test.ts`:**
  - per boss: the intro starts on the entry tick, lasts 165 ticks and ends in `chase`;
  - nothing it owns ticks during the intro;
  - arrows pass through it, a punch, a Burst and a mine miss it, and its bellows and rods take nothing;
  - the Warden's posted pack holds with it;
  - the player takes no damage, staged with a burning player;
  - the short intro after a summon;
  - a full intro again after a door reset, a KO and wake, and a leash home; none for a boss met again in `return`;
  - the outside-wake edge case;
  - the first attack after the intro lands at the same offset from the intro's end as today's from the wake;
  - the same `getState()` hash for the same seed and commands.
- **Existing tests:** sim and e2e tests that wake a boss naturally (the bulwark*, forgewright*, conductor*, warden, arena*, altar, sandboxForge and late-boss suites, and the measure bots) get a shared helper, `runIntro`, that steps a boss's intro out. Each test changes by about one line; no rule bends for tests. 076's `windupTicks` baseline is unchanged. Its region hash baseline is re-recorded for fights that wake a boss, and the PR says so. `npm run measure` reports boss fight lengths 2.75 s longer.
- **Render (Vitest, `tests/render`):**
  - `introBeat(ticks, short)` at fixed ticks;
  - the card's alpha and scale curve;
  - the pan's easing and per-frame cap;
  - the shake gate (Flashes off, reduced motion, short);
  - the card layout against the bar, the bottom HUD and each boss's box;
  - `bossPhase` for every flag combination, low health with no flag included.
- **Playwright:**
  - `ui().bossIntro` reports `{ boss, short, ticks, beat, card: { shown, alpha, name, arena }, pan: { active, dx, dy } }`, and `ui().bossPhase` reports per boss `{ look, heatBand, shield, grounded, enraged, flare }`. Each test polls state, never a fixed wait.
  - `tests/e2e/bossIntro.spec.ts`: each boss in the sandbox (the Warden staged at the shrine):
    - enter and walk the beats;
    - the card's text;
    - one shake logged, and suppressed with Flashes off;
    - the camera's pan and its hand-back to the lift;
    - the boss untargetable mid-intro (an arrow passes through);
    - the short intro after an altar summon.
  - `tests/e2e/bossPhases.spec.ts`: each phase flip staged with the sandbox's controls (god mode, damage, rods broken), and the look following within a frame.
  - `tests/e2e/bossMotion.spec.ts` (`REVIEW_SHOTS=1`): the real-speed strips listed in the criteria.
  - `tests/e2e/bossIntroShots.spec.ts` (`REVIEW_SHOTS=1`): the review shots.
- **Kept green:** arenaLock, bossDoors, hollows, forgewright, forgewrightSandbox, conductorSandbox, stormcrown, emberworks, returnStones, death, settings, enemyPolish, newGameAfterQuit and the other e2e files the change touches. The full suite runs in CI. Older specs' review shots aren't retaken.

## Decisions in this draft
For Shaun's OK at the playtest; the conservative choice is what gets built.
- **080.1 The intro doesn't pause the game.** The boss and its arena's posted enemies are inactive and untargetable for the intro. The player can move, roll and fire but takes no damage. Everything is counted in sim ticks.
- **080.2 It is 2.75 s (165 ticks):**
  - 0.3 s stir;
  - 0.9 s rise;
  - 0.2 s beat with the shake;
  - 1.35 s ready, with the card.
  The card is fully readable for 0.85 s and is gone as the fight starts.
- **080.3 Altar re-fights get a 1 s intro with no card or pan.** The 2 s crack already builds it up, so offering to fight is 3 s. A first fight, and every restart before the first kill, plays the full intro.
- **080.4 The card reads name and arena** ("Bulwark / Sunken Forum"). No invented epithets. If Shaun wants titles ("Shield of the Forum"), they are a data line per boss.
- **080.5 A short pan in the full intro:** 0.4 s in, hold, 0.4 s out to today's boss lift. The Conductor otherwise stands off screen when it wakes. The short intro doesn't pan.
- **080.6 The Pylon Warden has no phase change.** The sim gives it none. One would need a new threshold (new design), so it is left for Shaun to ask for.
- **080.7 No skip and no intro setting.** It is 2.75 s, and only the shake has a setting.
- **080.8 Shake is tied to Flashes,** whose row becomes "Flashes and shake", and is off under reduced motion. No new setting. The alternative is a separate "Screen shake" row.
- **080.9 The Warden now wakes as the player enters the shrine,** not at 200 px, so its pack and it start together. Its pack already waits for the player inside (059), so in play this is nearly unchanged.
- **080.10 Facing is unchanged by the intro.** The Bulwark shows its back (and its seam) to a player at the Forum's door, as the fight opens today.
- **080.11 The boss bar fills during the card** for the region bosses. The Warden still has no bar.
- **080.12 Bulwark's "called" look at 50%:** shield runes lit cyan and a chipped rim, when its adds rise. It shows a phase the fight already has (041's adds).
- **080.13 Phase looks are overlay parts and colour layers** on 076's rigs, so they show on every attack pose without doubling frames. Only the Bulwark's roar becomes a new three-frame strip.
- **080.14 The beat sounds are existing ones** (the Warden's slam, the Bulwark's pound, the Forgewright's slam, a Conductor strike). New sounds would be their own spec.

## Open questions
None.
