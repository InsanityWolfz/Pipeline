# 079: The foundry's mood
status: approved

Approved by Shaun in chat, 2026-10-27, with the whole art pass (074–081); its plan is pre-approved.

Plan pre-approved by Shaun in chat, 2026-10-27. Plan: docs/plans/079-foundry-mood.md.

Drafted from Shaun's art-pass interview (docs/brainstorm/2026-10-27-art-interview.md, answers 4, 5, 15, 17, 22, 27 and 28) and his calls on 079 that day. This is art spec 6 of 8, built in order after 074–078. Shaun asked for no sample pages first ("Just build it"); he reviews the result at the playtest.

## Goal
The foundry feels like a warm workshop: torch- and forge-lit sandstone, brass catching the light, cosy and busy. The machines and conduits keep their designs, and get a little extra to match the pushed vector look of the rest of the game: a rim light and soft gradients. Forge machines show their heat while they run, with shimmer, steam, sparks and a glow that lights the floor round them. Ley light pulses across the floor's ley inlays toward the intake as the line feeds it. The sim doesn't change: machine timing, layout and the factory's numbers stay the same, tick for tick.

## Shaun's calls (2026-10-27)
- On the foundry's look, in his words: "I think the machines and conduits and stuff look pretty good as they are. maybe just a little extra to them to match the moodiest and the pushed vector style that the rest of the game is getting."
- He picked **"Heat, steam and glow"** and **"Ley flow pulses"**.
- **Mood:** a warm workshop. Torch- and forge-lit sandstone, brass highlights, cosy and busy.
- **Particles are moderate.** Machine sparks and steam share the one particle budget with 076, 077 and 078, and scale with Graphics quality.
- **No screen shake.**
- **"Just build it":** no sample pages.

## Design references
- docs/design.md "Camera and art" (the 2026-10-27 wording, applied by 074): pushed vector, gradients lit from the top left with a rim light, glows; a Graphics quality setting; screen shake only in boss spawns.
- docs/design.md: the theme rule (rune-carved stone, glowing ley lines, brass and crystal, nothing modern) and the foundry (the tube is a portal to a factory the player builds).
- docs/art.md "The foundry, machines and pieces" (020, 052): the sandstone flags and their ley-inlaid variant, the carved walls, the braziers, machines with a window onto their mechanism and a ley crystal that glows while they work, conduits with a cyan channel and brass collars. The build updates this section.
- docs/specs/074-light-and-moods.md: the art-direction rules for the pass, the two layers (world and readability), `RegionMood`, `LIGHT_SOURCES` and the light picker, `LIGHT_BUDGET`, Medium's light pools, High's per-pixel lighting, the light catch, the quality tiers, the 0.06 wash cap, `?mood=off`, and 074.2 (no per-frame walk over props). 074 left the foundry unchanged and gave it to 079.
- docs/specs/076-enemy-polish.md: `PARTICLE_BUDGET` (Low 150, Medium 300, High 500 live particles), the live death-mote cap (60, 120, 200) and `ui().particles`.
- docs/specs/077-world-and-weather.md: weather's share of the budget (`WEATHER_CAP` 40, 100, 160) and its gate, the render-side seeded stream, ley beads, and "the foundry keeps 014's motes until 079".
- Earlier specs it builds on: 014 (glows, motes, the room's mood tint), 015 (the tube is quiet in the foundry), 019 and 024 (the intake, its glow and fill pulses), 020 (the vector foundry), 027 (`made` events), 052 (underground belts), 062 and 066 (the Smelter, the kiln and the Tempering coil), 069 (recipe cards, purge a lane), 070 (the silhouette behind machines).

## Depends on
074 (moods, lights, the picker, pools, quality tiers), 076 (`PARTICLE_BUDGET`, `ui().particles`), 077 (weather's gate and the render-side seeded stream) and 078 (every burst under the budget, and machine sparks if it draws them). The art pass is built in order, so the build starts once they're on main. If one is still unmerged then, the build merges its branch in first and says so in the PR.

## Rules for this spec
1. **Visual only.** No file under `src/sim` changes. Machine timing, recipes, rates, layout, collision and the build grid stay the same. `SAVE_VERSION` stays at main's.
2. **No per-frame scans over all pieces.** No new code walks every piece, tile or prop each frame. The running forge machines are kept in a small set, updated when a machine's status changes. Room lights and the inlays are worked out once when the room is shown.
3. **Work only where a machine is running and on screen.** Heat, steam, sparks and machine lights exist only for a forge machine whose status is `working` and whose footprint is in view (plus a 32 px margin). Idle, starved, blocked and off-screen machines cost nothing.
4. **Light sources are data.** Every light, its colour, radius, intensity, flicker and priority is in src/data, as 074's are. Render places them; nothing is hard-coded.
5. **Readability.** 074's readability layer holds in the foundry. Some things are never darkened, tinted or covered by an effect: the build grid, ghosts, facing arrows, status markers, hover cards and names, purge prompts and menus, recipe cards, the hotbar and HUD, the player, and the item icons riding conduits, splitters and tunnels.
6. **No screen shake.** A jammed machine's own shake (020) is unchanged.
7. **Light colours follow the theme rule.** Fire is ember, ley is cyan, lightning is storm violet. Nothing else glows.
8. **Randomness** for steam and sparks comes from 077's render-side seeded stream. No new code calls `Math.random`.

## The foundry's mood (data)
`FOUNDRY_MOOD` in `src/data/moods.ts` is a 074 `RegionMood`. 074's `LightingView` uses it whenever the foundry is shown, in place of today's `ROOM_MOOD.foundry` tint.

| Field | Value | Why |
| --- | --- | --- |
| ambient | `resin` at darkness 0.55 (about #f7cb9b) | warm amber workshop air; dim enough for fires to read, far brighter than the Hollows |
| wash | `flame-dark` 0.05 | today's 0.1 wash is over 074's 0.06 cap; the ambient now carries the warmth |
| fog | none | the build grid stays crisp |
| lights | ley `cyan`, fire `cinder`, accent `brass-light` | |
| lightScale | 1.0 | fires and the forge read without washing the floor out |

- The **world layer** in the foundry: the floor, walls, props, the intake's stone, the fixtures' bodies, and the pieces' bodies (machines, conduits, splitters, tunnels, hoppers and crates). It is tinted or lit as 074's tiers say.
- The **readability layer** is as in rule 5. Everything in it draws at full colour.
- The vignette doesn't change. 014's 18 ley motes stay in the foundry and count toward its particle cap (below).
- **"The forge glow"** is the warm wash plus the Forge machines' own fire light. There is no new forge fixture.

## Light sources in the foundry (data)
These are new entries in `src/data/lights.ts`. They use 074's sources, picker, budget (8 lights in view on Medium, 16 on High) and tiers (no lights on Low).

| Source | Where | Colour | Radius | Intensity | Flicker | Priority |
| --- | --- | --- | --- | --- | --- | --- |
| Braziers (074's `fire.brazier`) | the two on the north wall (tx 4 and 20) | `cinder` | 64 | 0.9 | ±15%, 7 Hz | 2 |
| Wall torches (new) | four brass sconces: the west wall at (0, 4) and (0, 11), the east wall at (23, 6) and (23, 13) | `cinder` | 48 | 0.8 | ±15%, 7 Hz | 2 |
| The intake (074's `ley`) | the pipe's mouth, breathing with its glow and swelling with its fill pulse (019) | `cyan-glow` | 60 (1.5 × `GLOWS.intake`) | 0.7 | none | 2 |
| Smelter, while working | its window, 10 px up | `cinder` | 56 | 0.9 | ±15%, 7 Hz | 3 |
| Kiln, while working | its glowing mouth | `cinder` | 56 | 0.9 | ±15%, 7 Hz | 3 |
| Tempering coil, while working | its coil | `storm-glow` | 40 | 0.7 | ±15%, 11 Hz | 3 |

- **Walls before machines.** The room's own fires and the intake have priority 2, so the room's look stays steady however many forges run. Running forge machines fill the rest of the budget, nearest the camera's centre first.
- **Wall lights come from data.** `PropDef` gains an optional `light` (a key into the foundry's light table). Braziers and torches carry one. The lights are worked out once when the room is shown.
- **Machine lights** come from a `light` per machine id in `FOUNDRY_LIGHTS.machines`. Only machines in the running set that are on screen are offered to the picker.
- **The wall torch** is a new wall prop (`torch` in `src/data/props.ts`, placed in the foundry's `props` in `src/data/rooms.ts`). It is a brass sconce on the wall's top with an iron cup and a four-frame flame, drawn like the brazier's but smaller. Its 014 glow halo is `cinder`, radius 40. It is looks only, like every prop: no collision, and no floor tile changes.
- **Flashes off (042.10):** no light flashes or flickers more than ±15%. The coil's light is steady.
- On Medium, lights lay 074's pools on the floor and the pieces carry the ambient as a tint. On High, the floor and the pieces a light reaches are lit per pixel, as 074 does for props. Tints and lighting on pieces are set when a piece is made and on a mood or tier change, never every frame.

## Machines and conduits: a light touch
Every design stays. The changes are to shading in the vector data. They add no frames and move no shape that tests pin (windows, crystals, chutes, the icon's spot, channel paths).

- **Machine housings** (`machines.ts`):
  - The front face's gradient runs diagonally from top-left (`rock-light`) to bottom-right (`rock`).
  - A rim light: a 0.6 px `snow` line at 0.55 alpha along the top face's top and left edges and the front face's left edge.
  - A soft inner shade: `rock-dark` at 0.35 alpha along the front's right and bottom edges, inside the ink outline.
  - The contact shadow becomes a soft radial (`ground-shade` 0.45 to 0) in place of today's flat ellipse.
- **Brass highlights:** the brass band, posts, chute and window frame each get a 0.5 px `brass-light` line on their lit (top or left) edge.
- **Mechanisms** in their windows and the ley crystal on top are unchanged. The crystal still glows while a machine works.
- **Conduits, splitters and tunnels** (`logistics.ts`, `tunnels.ts`):
  - The stone trough's top-left lip gets a 0.5 px `snow` rim at 0.4 alpha.
  - The brass collars and the splitter's hub get a `brass-light` glint.
  - The tunnel hoods get the rim and a soft gradient.
  - The cyan channel, its chevrons and the item riding it are unchanged, so items read exactly as today.
- **Hoppers and crates** get the rim and the brass glint.
- **Unchanged:** the floor flags, walls, banners, the intake, the fixtures and the item icons. They take the mood only.
- The build reports the foundry frames' bake time before and after. It may add at most 20%.

## Heat, steam and glow (data: `src/data/foundryFx.ts`)
These effects belong to the **Forge group's fire machines, the Smelter and the kiln**, while they are working and on screen. The Tempering coil gets its violet light and violet sparks, but no heat or steam: it charges with lightning, it doesn't burn.

| Effect | Look | Low | Medium | High |
| --- | --- | --- | --- | --- |
| **Glow** | today's 014 additive halo in `cinder`, radius 20, at the fire (window or kiln mouth), breathing with the working loop | yes | yes | yes |
| **Fire light** | the table above | none | yes | yes |
| **Heat shimmer** | a baked 4-frame loop of soft rising ribbons (`cinder-light`, additive) over the housing's top, 8 fps, starting at a frame picked from the piece id | none | alpha 0.18 | alpha 0.25 |
| **Steam** | a puff from a vent on the top face every 700 ms ±200 (from the seeded stream): soft `foam` and `rock-pale` blobs, normal blend, rising 10–18 px/s and drifting, growing 2 to 6 px, alpha 0.35 to 0, life 0.9–1.4 s | 1 a puff | 2 a puff | 3 a puff |
| **Quench** (Smelter, on each `made` event) | a bigger steam puff off the cooling bar | 2 | 4 | 6 |
| **Sparks** (on each `made` event of a Smelter, kiln or coil) | 1 px sparks thrown up in a 60° cone at 30–70 px/s, falling at 120 px/s², life 0.3–0.6 s; `cinder` and `cinder-light` (the coil's `storm-glow` and `snow`), additive on Medium and High | 3 | 6 | 10 |

- **How many machines.** At most `FORGE_FX_MAX` running forge machines get shimmer and steam: Low 4, Medium 8, High 12, nearest the camera's centre. The rest keep only their glow.
- **The particle budget.** Steam and sparks are live particles under 076's `PARTICLE_BUDGET`.
  - The foundry has no weather and no enemies, so its particles take weather's share: `FOUNDRY_FX_CAP` is Low 40, Medium 100 and High 160 live, 014's 18 motes included.
  - They spawn only while the live total of every kind is below `PARTICLE_BUDGET` minus 076's live death-mote cap, as weather does (077). So the shared budget holds whatever 078 adds.
  - A puff or burst that doesn't fit is thinned. The glow and shimmer still show the heat.
- **Built with** one Phaser `ParticleEmitter` for steam and one for sparks (the particles skill), so each is one batched draw. Puffs and bursts are emitted at a machine's points. The shimmer is one sprite per active machine, from a pool made once.
- **Depth:** shimmer, steam and sparks draw over the standing pieces. They draw under the build grid, ghosts, arrows, status markers, names, hover cards, menus and the HUD.
- **When a machine stops** (starved, blocked, idle, removed or picked up), its shimmer and light go at once. Its puffs and sparks already in the air finish their short lives.
- **Machine sparks and 078.** If 078 has defined a machine-spark burst by then, these sparks use its look and 079 only sets where and when they fire. Otherwise `SPARKS` here is the look.

## Ley flow pulses (data: `LEY_PULSE` in `src/data/foundryFx.ts`)
Ley light runs across the floor's ley inlays toward the intake.

- **The inlays** are today's ley-inlaid flags (020's `floor-flag-inlay`, picked per tile by `floorFrame`). The foundry has 10, spread over the floor. Their list and their distances from the intake's mouth are worked out once when the room is shown. The floor's look doesn't change.
- **What starts a pulse.** The sim's own events, read by render only:
  - each `refills` event, an item going into the intake from the line;
  - each `entranceFires` event, an entrance firing.

  A pulse starts only while the foundry is shown. None queue up while it isn't.
- **A pulse** is a front that closes in on the intake's mouth from the farthest inlay at 360 px/s, so about 1.5 s across the room. As the front passes an inlay:
  - its rune lights `cyan-glow`, with a soft cyan halo, fading over 450 ms;
  - a small bead (3 px `cyan-glow`, additive, a short trail) slides 1 tile from it toward the intake and fades.

  When the front reaches the mouth, the intake's existing fill pulse (019) shows the arrival. Nothing new is drawn on the pipe.
- **Rate:** at most one new pulse every 250 ms. At most 3 live on Medium and 5 on High. **Low has none**, as 077's ley flow has none on Low.
- **Cost:** the inlay glows and beads come from a pool made once (10 inlays × the live pulses). They aren't particles, so they don't count toward the particle budget. A frame steps only the live pulses' lit inlays.
- **Depth:** over the floor and under conduits, items and everything standing. A piece built over an inlay hides that inlay's light.
- **Flashes off:** pulses still run (they're a flow, not a flash), at 0.7 × their alpha.

## Quality tiers (074's setting)

| | Low | Medium | High |
| --- | --- | --- | --- |
| Ambient | a multiply tint on the floor, walls, props and pieces | light pools on the floor; tint on pieces and props | per-pixel lighting on the floor and the pieces a light reaches |
| Lights | none | up to 8 | up to 16 |
| Rim and gradients (baked) | yes | yes | yes |
| Glow halos | yes | yes | yes |
| Heat shimmer | none | yes | yes |
| Steam and sparks | Low counts | Medium counts | High counts |
| Forge machines with effects | 4 | 8 | 12 |
| Ley flow pulses | none | up to 3 live | up to 5 live |
| Particle cap in the foundry | 40 | 100 | 160 |

- A tier change applies at once, as 074's does.
- On the Canvas renderer the game runs as Low (074).
- `?mood=off` (074's dev flag) also turns off the foundry's mood, lights, shimmer, steam, sparks and pulses. It leaves the baked rim and gradients.

## Performance and tick health
- **The sim** still runs at 60 ticks a second, and everything here is render-only. The same seed and commands give the same `getState()` on Low, on High and with `?mood=off`, with a forge line running.
- **Bounded work a frame:**
  - The effects step only the running set (at most the tier's `FORGE_FX_MAX` get shimmer and steam) and the live pulses.
  - With 60 pieces placed and no forge machine working, the effects step nothing.
  - `ui().foundryMood.visited` reports how many machines the effects looked at this frame. Tests hold it to the running forge machines on screen.
- **Frame time on Low (a probe, as 074.4 made it):** `tests/e2e/foundryMoodProbe.spec.ts` with `PROBE=1`. In one page, an interleaved A/B compares Low with `?mood=off` in a busy foundry: 12 Smelters and kilns working, conduits full and the intake filling. Low's mean frame time is at most 1.1× that of mood off, and its ticks per real second at least 0.9×.
- **Medium and High** frame times are measured in the same scene and reported in the PR, not asserted. Shaun judges them on his laptop.
- **Boot:** the added vector frames (the torch's four, the shimmer's four, the steam and spark textures, the lit inlay rune) and the foundry frames' bake time before and after are reported.

## Readability
- The build grid, ghosts (red and green), facing arrows, status markers, hover cards and names, purge prompts and menus, recipe cards, the HUD and the hotbar draw exactly as today, in every tier.
  - Their pixels with the foundry's mood on match those with `?mood=off` (within 2 per channel).
  - No effect draws over them.
- **Items on conduits:** every item icon riding a conduit, splitter or tunnel is in the readability layer, unlit and untinted. Its pixels match mood off within 2 per channel. Every pair of items stays as far apart in colour as it is today.
- The player stays in the readability layer. 074's light catch gives it a warm catch near fires on Medium and High, at most 0.35.
- Steam's alpha is at most 0.35 and shimmer's at most 0.25.
- The wash is 0.05, under 074's 0.06 cap.

## Acceptance criteria
- [x] **Mood:** in the foundry, `ui().lighting` reports the foundry mood (ambient `resin` 0.55, wash 0.05, no fog). `ROOM_MOOD.foundry` is gone. On High, the floor's mean brightness is lower than in Region 1 and higher than in the Hollows (median luma).
- [x] **Lights:** on Medium and High, the two braziers, four wall torches and the intake place their lights. Each Smelter, kiln and coil places its light only while working and on screen. On Low there are no Phaser lights and nothing has lighting on. Lights in view never exceed 8 on Medium or 16 on High. A wall light is never dropped for a machine's.
- [x] **Torches:** the four wall torches stand at their tiles, flicker, and show their glow halos. No tile, collision or build cell changes.
- [x] **Light touch:** machines, conduits, splitters, tunnels, hoppers and crates show the rim light, soft gradients and brass highlights (review shots). Frame counts, windows, crystals, chutes and channel paths are unchanged (the existing art tests pass unchanged). The foundry frames' bake time rises by at most 20%.
- [x] **Heat:** a working Smelter or kiln on screen shows its glow on every tier, shimmer on Medium and High, and steam puffs at its tier's counts. Starved, blocked, idle or off screen, it shows none of them within one frame of the change (puffs already out finish). The coil shows its violet light and sparks, with no shimmer or steam.
- [x] **Sparks and quench:** each `made` event from a Smelter, kiln or coil on screen throws its tier's sparks, and a Smelter's adds the quench puff.
- [x] **Particle budget:** with 12 forge machines working on High, live particles in the foundry never exceed 160. The total never exceeds `PARTICLE_BUDGET`. Steam and sparks never spawn once the total reaches the budget minus the death-mote cap. The same holds on Low (40) and Medium (100).
- [x] **Ley pulses:** a line filling the intake sends pulses. The inlays light in order of their distance from the intake, farthest first, with beads sliding toward it. There are at most 3 live on Medium and 5 on High, none on Low, and none while the foundry isn't shown.
- [x] **Bounded work:** `ui().foundryMood.visited` never exceeds the running forge machines on screen. It is 0 with 60 pieces placed and no forge working. No new code walks every piece each frame (a unit test on the running set; review).
- [x] **Readability (as measured, 079.6):** the build grid, a ghost, a hover card, a purge prompt and a recipe card match mood off within 2 per channel on High. Every item icon on a conduit matches mood off within 2 per channel. The HUD's pixels are the same.
- [x] **Sim untouched:** no file under `src/sim` changes. The same `getState()` comes out on Low, High and `?mood=off` after 1,800 ticks of a running forge line. `SAVE_VERSION` is unchanged.
- [x] **Performance:** the Low probe meets its budget. Medium and High timings and the bake times are reported in the PR. newGameAfterQuit.spec.ts and the foundry e2e files pass.
- [x] **No shake:** nothing in this spec moves the camera.
- [x] **Docs:** art.md's "The foundry, machines and pieces" describes the mood, the lights, the torches, the rim and gradients, heat, steam, sparks and the ley pulses.
- [x] **Review shots (docs/review/079):**
  - the whole foundry with a running forge line on Low, Medium and High;
  - a Smelter and a kiln close up, working (shimmer, steam and glow), and the same machines starved;
  - sparks and a quench on a craft (held on a stopped emitter);
  - a ley pulse mid-sweep;
  - build mode over a running forge, with the grid and a ghost;
  - a hover card, a purge prompt and a recipe card in the warm light;
  - items on conduits with the mood on and off;
  - a wall torch and a brazier lighting the floor.

## Data changes
- `src/data/moods.ts`: `FOUNDRY_MOOD`.
- `src/data/juice.ts`: `ROOM_MOOD` loses `foundry`.
- `src/data/lights.ts`: `FOUNDRY_LIGHTS`:
  - wall lights by prop light key (`brazier`, `torch`);
  - the intake's;
  - `machines` by machine id (smelter, kiln, tempering-coil): colour, radius, intensity, flicker, rise and priority.
- `src/data/foundryFx.ts` (new): `HEAT` (which machines, the shimmer's frames, alpha by tier and offset by footprint and view), `STEAM`, `QUENCH`, `SPARKS`, `FORGE_FX_MAX`, `FOUNDRY_FX_CAP`, `LEY_PULSE`.
- `src/data/props.ts`: the `torch` prop, and an optional `light` on `PropDef` (the brazier and torch carry one).
- `src/data/rooms.ts`: four torch placements in the foundry's `props`. Rows, doorways, fixtures and the spawn are unchanged.
- `src/data/art/machines.ts`, `logistics.ts`, `tunnels.ts`: the rim, gradients, soft shadow and brass highlights.
- `src/data/art/interior.ts`: the torch's four frames. `src/data/art/foundryFx.ts` (new): the shimmer loop, steam and spark textures, and the lit inlay rune. Registered in `src/data/foundryAssets.ts` and `assets.ts`, with depths for the inlay pulses (over the floor, under conduits) and the foundry's effects (under `DEPTHS.worldUi`).
- No palette, sim or save changes.

## Out of scope
- Any change to machines' timing, recipes, rates, sizes, layout, the build grid or the factory's numbers.
- New machine designs or mechanisms, the intake's art, the fixtures' art, the walls' and floor's art (beyond the mood), and more inlay tiles.
- Sparks or steam on machines outside the Forge group.
- Weather in the foundry; fog; a screen distortion filter for the heat.
- Sound.
- The overworld and other rooms (074–078), boss intros (080) and the HUD (081).

## Test plan
- **Unit (Vitest, tests first):**
  - `tests/data/foundryMood.test.ts`: every colour in `FOUNDRY_MOOD`, `FOUNDRY_LIGHTS` and `foundryFx.ts` is a palette id; the wash is at most 0.06; `HEAT` and `FOUNDRY_LIGHTS.machines` name real machines; each tier's `FOUNDRY_FX_CAP` plus 076's death-mote cap is within `PARTICLE_BUDGET`; every prop `light` names a light; the torches stand on wall tiles of the foundry.
  - `tests/render/runningForges.test.ts`: the running set gains a forge machine when it starts working and loses it when it stops or is removed; a non-forge machine never joins; a frame with no status change changes nothing.
  - `tests/render/forgeFx.test.ts`: which running machines get effects (on screen with the margin, nearest the centre, up to the tier's max); the steam schedule from the seeded stream (same seed, same puffs); counts per tier; the budget gate thins a burst.
  - `tests/render/leyPulse.test.ts`: the foundry's inlays from `floorFrame` (10, fixed); the front's position over time; the inlays light farthest first; the rate limit and live caps; none on Low; none while the foundry isn't shown.
  - `tests/render/foundryLights.test.ts`: wall lights from props; machine lights only for running, on-screen forge machines; priorities keep the wall lights under a full budget; a steady coil light with Flashes off.
- **Playwright:**
  - `ui().foundryMood` reports the mood, the lights by source, the running set, the effects per machine (glow, shimmer, steam), live foundry particles, live pulses with their lit inlays, and `visited`.
  - `tests/e2e/foundryMood.spec.ts`, using `foundryPage.ts`'s helpers to build a forge line:
    - the mood and lights on each tier;
    - the torches;
    - heat starting and stopping with the machine's status, and none off screen;
    - sparks and the quench on `made`;
    - the particle caps with 12 forges on each tier;
    - ley pulses and their order;
    - the readability pixel checks (grid, ghost, hover card, purge prompt, recipe card, items on conduits, HUD) against `?mood=off`;
    - bounded work;
    - the same `getState()` on Low, High and mood off.
  - `tests/e2e/foundryMoodProbe.spec.ts` (`PROBE=1`): the Low A/B and the tier timings.
- **Kept green:** foundry.spec.ts, foundryFlow.spec.ts, foundryTutorial.spec.ts, art.spec.ts, lighting.spec.ts (074), newGameAfterQuit.spec.ts, and the other e2e files the change touches. The full suite runs in CI. Older specs' review shots aren't retaken.
- **Review shots:** as listed in the criteria.

## Decisions in this draft
For Shaun's OK at the playtest; the conservative choice is what gets built.
- **What starts a ley pulse.** The brief says pulses run "as the tube fires". But the tube is quiet in the foundry (015), so a firing is never on screen there. Pulses start on both the intake's refills (each item the line feeds in) and entrance fires. In play, it's the line feeding the intake that you see.
- **The pulses use today's 10 inlay tiles.** The floor doesn't change. If they read too sparse, the inlay share is data (`FLOOR_VARIANTS`).
- **Ambient `resin` at 0.55** (about #f7cb9b) with a 0.05 `flame-dark` wash. Today's 0.1 wash is over 074's cap, so it comes down and the ambient carries the warmth.
- **Four wall torches** on the side walls are added as light sources, beside the two braziers. Their spots keep clear of the door and of the bench, stash and waystone. The west ones stand on the wall behind the supply ports, which face east. There's no new forge fixture. "The forge glow" is the wash plus the Forge machines' fire.
- **Which machines run hot:** the Smelter and the kiln get heat, steam and fire light. The Tempering coil gets a violet light and violet sparks only. Other machines get the rim and gradients but no particles.
- **Wall lights before machine lights** (priority 2 against 3), so the room's light doesn't jump as forges start and stop.
- **Heat shimmer is a baked additive loop**, not Phaser's Displacement filter. A filter would need a full-screen camera pass that also bends the build grid and items.
- **The foundry's particle cap takes weather's share** (40, 100, 160), since the foundry has no weather. It is gated the same way, so the shared budget holds.
- **Low** keeps the baked rim and gradients, the glows and thin steam and sparks. It has no lights, shimmer or ley pulses, as 074 and 077 do on Low.
- **The intake, fixtures, walls and floor art** are unchanged and take the mood only. "A little extra" goes on the machines and conduits Shaun named.
- **014's motes stay** in the foundry and count toward its cap.

## Open questions
None.

## Results
Built on `claude/079-foundry-mood` (InsanityWolfz/Pipeline#95) to docs/plans/079-foundry-mood.md. **Stacked on 074–078**: `origin/claude/078-ammo-visuals` (which carries 074, 075, 076 and 077) is merged in, so 079 merges after them. No file under `src/sim` changes (`git diff` of `src/sim` since the merge is empty) and **`SAVE_VERSION` stays at 22**: nothing in the save changed.

- **Data:** `FOUNDRY_MOOD` (moods.ts); `FOUNDRY_LIGHTS` and the `wall`, `intake` and `forge` light sources (lights.ts); `src/data/foundryFx.ts` (`HEAT`, `STEAM`, `QUENCH`, `SPARKS`, `FORGE_FX_MAX`, `FORGE_FX_MARGIN`, `FOUNDRY_FX_CAP` = `WEATHER_CAP`, `LEY_PULSE`, `FOUNDRY_FX_SEED`); the `torch` prop with `light` on `PropDef` and a `side` prop layer, four torches in the foundry's props; `ROOM_MOOD` gone; `FOUNDRY_FX_FRAMES` (foundryAssets.ts), `DEPTHS.leyPulse` 0.1 and `DEPTHS.foundryFx` 97,500.
- **Art:** the torch's four frames (interior.ts); `src/data/art/foundryFx.ts` (the shimmer's four frames, the steam puff, the spark, the lit inlay rune and the bead): 12 new vector frames. The light touch on machines, conduits, splitters, tunnels, hoppers and crates (machines.ts, logistics.ts, tunnels.ts); frame counts, windows, crystals, chutes and channel paths unchanged.
- **Render:** pure `src/render/foundry/runningForges.ts` (the running set, fed by FoundryView's own draw of each machine), `forgeFx.ts` (who gets effects, the steam clock, counts and thinning), `forgeParticles.ts` (steam, quench and sparks as a seeded model), `leyPulse.ts`, and `src/render/lighting/foundryLights.ts`; Phaser `FoundryMood` (the per-frame orchestration, the ledger in weather's share, `ui().foundryMood`), `ForgeFxView` (glows, the shimmer pool, one emitter each for steam and sparks) and `LeyPulseView` (pooled runes and beads). LightingView takes the foundry's mood and lights through 074's picker; the pieces' bodies join 074's world layer (flat pieces as flats); 078's machine sparks leave the forges to 079; `propBase.ts` places side-wall props for RoomView and the lights.
- **Tests:** `npm run check` green: 348 files, 2,971 unit tests (`tests/sim/sim.test.ts` timed out once under four builders' load and passed alone). New: tests/data/foundryMood; tests/render/runningForges, forgeFx, forgeParticles, leyPulse, foundryLights (including a guard on each light's change a 33 ms frame); noMathRandom covers the new files; moods and look tests read the retired `ROOM_MOOD` no more, and look's prop-placement rule gains the `side` layer.
- **e2e** (each file alone, `--workers=1`, port 5359; 5349 was another builder's server): tests/e2e/foundryMood.spec.ts (7 tests: the mood and lights on each tier, the walls and intake always placed and the budgets held; heat following each forge's status and the screen, the coil's violet light and sparks with no heat; each craft's sparks and quench by tier; twelve forges on each tier within the foundry's cap and the shared budget; ley pulses lighting farthest first, the live caps, none on Low or outside the foundry; bounded work with 60 pieces placed; the same `getState()` on Low, High and the mood off after 1,800 ticks of a running line) and foundryMoodLook.spec.ts (4 tests: readability against the mood off, the ghost's contrast, the torches, the floor's brightness between Region 1 and the Hollows), green. Kept green, each alone: foundry, foundryFlow, hoverPress, readability, purge, pipette, guidedTutorial, foundryTutorial, newGameAfterQuit, lighting (its same-seed check read a different boot tick under load once and passed alone), art, ammoFx, tunnels; factoryNumbersShots and foundryAfterShrineShots (REVIEW_SHOTS=1, their shots not kept). guidedTutorialShots' shot 07 (058: the waypoint arrow over the bench) fails here, and fails the same on 078's code: not this PR's, left as it is (process.md: an older shot spec is fixed only when Shaun asks).
- **Performance** (foundryMoodProbe.spec.ts, `PROBE=1`, headless Chromium on its software renderer, 1280×720, a 4-core machine shared with three other builders; a busy foundry: twelve Smelters and kilns and the coil's line working, the intake line feeding; medians of 2.5 s windows, the A/B interleaved six rounds):

| Busy foundry (ms a frame, mean / p95; ticks a second) | mood off (Low) | Low | Medium | High |
| --- | --- | --- | --- | --- |
| A/B | 54.5 / 71.2; 60.1 | 58.2 / 74.2; 60.1 | | |
| Tier run | | 72.3 / 93.8; 60.4 | 75.8 / 96.1; 60.8 | 182.9 / 227.9; 54.7 |

  Low against the mood off: 1.07× the frame time (budget 1.1×), 1.00× the ticks a second (budget 0.9×). High's cost is 074's per-pixel lighting of the whole floor on a software renderer (074.5). newGameAfterQuit passes.
- **Bake:** the foundry's 407 machine, logistics and tunnel frames drawn in one page, old and new art interleaved 20 times: 39.6–44.3 ms before, 45.0–51.4 ms after (+14% and +16% in two runs; budget 20%). The 12 new frames add well under a millisecond.
- **Motion check** (docs/review/079/20–24: Phaser's time locked to the sim with a virtual `requestAnimationFrame` and `performance.now`, 33 ms and two ticks a frame, `tests/e2e/motionStrip.ts`): the first strips showed the torches' and forges' light flickering at 7 Hz with a 16 Hz second wave, jumping up to a third of its brightness a frame, and the forge glow pulsing twice a second; both calmed (079.1). After: the torch's flame steps gently at 6 fps and its light drifts a few percent a frame; the shimmer's ribbons rise slowly; steam drifts up and fades; a craft's sparks fly and fall within a third of a second; ley runes fade in and out toward the pipe. Nothing frantic.
- **Review shots (docs/review/079):** 01 the busy foundry on Low, Medium and High; 02 a Smelter and a kiln working, and the same starved; 03 sparks and a quench held on the stopped clock; 04 a ley pulse mid-sweep; 05 build mode over the running forges with a ghost; 06 the recipe card, a hover card and the purge prompt in the warm light; 07 items on conduits with the mood on and off; 08 a wall torch and a brazier lighting the floor; 20–24 the motion strips (the torch, the forges on High and Medium, the coil, the ley pulses). Older specs' shots were not retaken.

## Raised after the build
Conservative choices built; items marked **(Shaun)** want a yes or a change at the playtest.

- **079.1 Flicker calmed after the motion check (Shaun).** The spec's ±15% at 7 Hz (the coil 11 Hz) read as jitter at 30 frames a second. Now the wall fires flicker ±8% at 2.5 Hz, the forges ±10% at 3 Hz and the coil ±10% at 4 Hz (two slow waves beating), and a forge's glow breathes over two working loops (a second). All data in `FOUNDRY_LIGHTS` and `HEAT.glow`.
- **079.2 Medium has no room for the forges' lights (Shaun).** The face glow (074, priority 0), the six wall fires and the intake (priority 2) fill Medium's 8 when the whole room is in view, so a working forge's fire light shows on Medium only when a wall light is out of view; its glow halo shows on every tier, and High places the forges' lights. If you'd like them on Medium, the face glow could give way indoors, or Medium's budget could rise in the foundry.
- **079.3 Wall lights are offered only while their pool reaches the view** (074's rule for every light), so off-screen fires never take a place in the budget.
- **079.4 The foundry reads close to the Hollows (Shaun).** On High the floor's median brightness is 89, the Hollows' ground 86 and Region 1's 145: it passes "between them" but isn't "far brighter than the Hollows". The ambient's darkness is data (`FOUNDRY_MOOD`, 0.55); 0.45 would lift the room if it feels too dim.
- **079.5 `?mood=off` keeps the room's wash.** In the foundry the 0.05 `flame-dark` wash is the room's own tint (as 014's 0.1 was under mood off), so mood off is the foundry without 079's ambient, lights and effects, and the readability checks compare like with like.
- **079.6 Readability, as measured on High against mood off.** A ley-steel ingot riding a conduit, the HP bar and the purge prompt match exactly. The hover and recipe cards are within 3 a channel, not 2: their stone tablet is 94% opaque (`TABLET.fillAlpha`, 020), so the warm floor shows through a little. Ley glass's icon is part clear and an arrow thin, so the lit trough shows through them (within 6). The ghost is translucent (0.6) and the "build grid" is the floor's own flags (there is no overlay), so their pixels follow the floor's warmth; the e2e checks the ghost keeps its contrast with the floor beside it (98 against 77 with the mood off).
- **079.7 Sparks take 078's look.** As the spec says when 078 has machine sparks: 078's speeds, cone, fall, life and colours; 079 sets where (the fire, the coil's crucible), when and how many (3, 6, 10), as foundry particles in weather's share. 078's own four sparks skip the Smelter, kiln and coil.
- **079.8 The torch is a new prop layer, `side`:** 014's `wall` layer stands on the north wall's face; a side wall's sconce stands on the wall's top with floor beside it, mirrored on the east wall. The look test's placement rule covers it.
- **079.9 Steam can drift over a conduit's items** for under a second at alpha 0.35 at most: the effects draw over the standing pieces, and conduits and their items lie flat under them.
- **079.10 The rim is drawn as lines.** A clipped `rim` style on the housings baked +30%; the spec's rim is lines along the lit edges, so the rims and the brass glints are each one merged stroke a frame (+14–16%).
- **079.11 Ley pulses are quiet at game size (Shaun).** Ten inlays across the room, each rune lighting for under half a second; they read as a soft flow (shot 04, strip 24). They run only while the line feeds an entrance with room left: a full entrance takes no refills. Their brightness and the inlays' share are data (`LEY_PULSE`, `FLOOR_VARIANTS`).
