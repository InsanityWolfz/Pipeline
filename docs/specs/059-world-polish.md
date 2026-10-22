# 059: World and arena polish
status: approved

Approved on draft by Shaun in chat, 2026-10-22 ("approve 59"): the build follows the proposals in the open questions.

From Shaun's fresh playtest on 2026-10-22 (docs/brainstorm/2026-10-22-playtest-notes.md, theme D, landing with 058 in InsanityWolfz/Pipeline#64) and his spec interview the same day (docs/brainstorm/2026-10-22-world-polish-interview.md).

## Goal
The world reads the way it plays. Paths look like one surface where they meet, rocks block only what they show, the Bulwark's walls look like walls, and arena enemies wait inside instead of crowding the door. Also a softer boss-room hum and a rimestone pylon that keeps frost arrows going.

## Design references
- docs/design.md: World, regions, ley lines, bosses (Claiming, Regions, The world is round); No ratio math (supply lines).
- Specs: 053 (the round world and its roads), 055 (boss doors, the rimestone pylon), 043 (the arena lock and its seal hum), 017 (enemies waking on sight).

## Acceptance criteria
**Paths**
- [x] Where two paths cross or join, no edge line shows inside the join: the paths read as one shape, an X or a Y with no "popsicle stick" ends drawn over each other (Shaun). Path edges along their outer sides stay as today.

**Collision**
- [x] Every blocking prop or terrain piece whose drawing is smaller than its tile blocks movement only over its drawn footprint, in every region; one that fills its tile is unchanged (Shaun).

**The Bulwark's arena**
- [x] The forum's wall tiles are drawn clearly darker than the Hollows floor around them, so they read as walls; other Hollows tiles are unchanged (Shaun).

**Arena enemies**
- [x] In both boss arenas, the boss's adds and the arena's own enemies stay where they are and don't react to the player until the player has come through the door; nothing gathers at the doorway outside (Shaun).

**Doors**
- [x] Neither boss door shows a description: an open door shows only its E prompt; a sealed door shows "Sealed" (Shaun).

**Sound and supply**
- [x] The boss room's seal hum plays at half its volume today (Shaun).
- [x] The Frozen Grotto's pylon sends rimestone at 30 a minute (2× today's 15); other pylons are unchanged (Shaun).

## Data changes
- `src/data/roads.ts` (or the road art data): how joins are drawn.
- Prop and terrain footprints: a collision box per prop where its drawing is smaller than a tile.
- `src/data/hollowsAssets.ts` or `arenaAssets.ts`: the forum walls' darker colour.
- `src/data/arenas.ts`: the door texts; the arena enemies' wait rule if it's data.
- `src/data/hollowsSounds.ts`: `seal-hum` volume.
- `src/data/claims.ts` or `landmarks.ts`: the Grotto pylon's rate.

## Out of scope
- The tutorial (058), the New game crash and the diagonal flicker (fixes).
- New paths or a different road network; ley lines.
- Other regions' wall colours; the shrine's walls.
- Other pylons' rates.

## Test plan
- Vitest (sim): prop footprints block only their boxes (a small Hollows rock lets the player pass beside it within its tile); arena enemies don't wake or move while the player is outside the door and wake once inside; the Grotto port's rate; the door hint text.
- Vitest (render or data): the hum's volume; the forum wall colour differs from the floor by the agreed amount.
- Playwright: walking past a small rock; the arena wait at the shrine.
- Screenshots: a path crossing and a join before and after; the forum's walls; the shrine doorway with its enemies inside; a door's prompt.
- `npm run measure`: record the Bulwark's decent-build results with 30 a minute of rimestone (report only).

## Open questions
Each has a proposal; the build follows it unless Shaun says otherwise.
- **059.1 How dark.** Proposal: the forum's walls use the Hollows' darkest stone tone with a top-face highlight, like the shrine's walls; the floor is unchanged.
- **059.2 "Inside".** Proposal: the player is inside once E at the door has put them in (055's lock); before that, arena enemies don't wake even on sight. Enemies already awake when the player leaves go back to their posts as the reset does today.
- **059.3 Footprints.** Proposal: boxes come from each prop's drawn base (its shadow ellipse or lowest shape), rounded to whole px, and are listed in data, not computed at runtime.

## Raised after the build
Choices the spec didn't make; the conservative option is built. Each stands unless Shaun says otherwise.
- **059.4 Which pieces get a footprint.** The tile-drawn terrain pieces: Region 1's boulders, the ruin's stones and columns (the ruin field's broken walls included), the Quarry's cut blocks, the Husk Hive's nest stones, and the Hollows' rubble, aqueduct pillars and fallen spans (the forum's columns too). Pylons, altars, reliquaries, the tube's stone and the sandbox's bench stay whole-tile (they're interactables, and the altar and reliquary draw wider than a tile); trees, walls, cliffs and water fill their tiles and are unchanged. Footprints are rounded outward and clipped to the tile, so nothing blocks more than before.
- **059.5 Shots and sight still read whole tiles.** A piece's footprint stops feet only; arrows, enemy bolts, sight lines and the Sniper's cover still treat its whole tile as solid, so rocks stay cover. A player standing behind a rock in the top of its tile shoots into the rock. Proposal: keep; say if shots should pass over the empty part of the tile too.
- **059.6 The forum's colonnade.** Only the forum's cliff tiles round its outline are drawn dark (a wall like the shrine's: the Hollows' darkest stone with a lighter top). The colonnade's standing columns and fallen drums in its north wall keep their look.
- **059.7 The Warden waits too.** "Arena enemies" includes the boss: the Warden no longer wakes on sight through its walls; it waits with its Wisps and Husks until the player is through the door (the Bulwark already did).

## Results (build)
- All seven criteria met. Paths: every road's edge is drawn before any road's dirt, so joins show no edge or end cap inside them (src/render/overworld/pathStrokes.ts). Collision: footprints listed in src/data/footprints.ts (each its sprite's shadow ellipse, rounded outward; a test checks them against the art); the sprite rule moved to src/sim/tileLook.ts, so render and collision share it. Forum walls: `ow-forum-wall` (FORUM_WALL_LOOK). Arena wait: src/sim/arenaWait.ts, read by every kind's wake (aiCommon `engage`); one awake when the player leaves walks back to its post. Doors: "Sealed" while sealed, no description once open. Hum: each layer's peak halved (seal-hum.wav rebuilt). Grotto pylon: `rate: 2` on its landmark (SITE_RATE), 30 a minute; the port's plate still says ×1 pylon.
- Tests: tests/sim/arenaWait.test.ts, tests/sim/footprints.test.ts, tests/render/forumWalls.test.ts, tests/render/pathJoins.test.ts, the hum in tests/render/sealSound.test.ts, the door texts in tests/render/hover.test.ts, the Grotto's rate in tests/sim/grottoPylon.test.ts; Playwright tests/e2e/worldPolish.spec.ts (behind the meadow's boulders; the shrine's guards waiting). Older tests whose geometry leaned on whole-tile ruin stones and rocks (knockback against the ruin field's west wall, the Charger's run into the meadow's rocks) now aim at the footprints.
- Shots in docs/review/059: road joins before and after (01, 02), the forum's walls from the door and inside (03, 03b), the shrine's guards waiting (04), the open door's prompt (05), the sealed door (06), behind the boulders (07).
- `npm run measure`, the Bulwark's decent build (its bot carries its own ammo, so the rimestone rate doesn't enter): 16/20 seeds meet all three, 3 KOs (target ≤ 2 KOs: missed); on main the same run gives 8/20 and 7 KOs. The change comes from the forum's columns and fallen drums now blocking only their footprints. Naive bot: KO'd 5/5 (met).

