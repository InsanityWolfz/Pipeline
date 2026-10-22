# 059: World and arena polish
status: draft

From Shaun's fresh playtest on 2026-10-22 (docs/brainstorm/2026-10-22-playtest-notes.md, theme D, landing with 058 in InsanityWolfz/Pipeline#64) and his spec interview the same day (docs/brainstorm/2026-10-22-world-polish-interview.md).

## Goal
The world reads the way it plays. Paths look like one surface where they meet, rocks block only what they show, the Bulwark's walls look like walls, and arena enemies wait inside instead of crowding the door. Also a softer boss-room hum and a rimestone pylon that keeps frost arrows going.

## Design references
- docs/design.md: World, regions, ley lines, bosses (Claiming, Regions, The world is round); No ratio math (supply lines).
- Specs: 053 (the round world and its roads), 055 (boss doors, the rimestone pylon), 043 (the arena lock and its seal hum), 017 (enemies waking on sight).

## Acceptance criteria
**Paths**
- [ ] Where two paths cross or join, no edge line shows inside the join: the paths read as one shape, an X or a Y with no "popsicle stick" ends drawn over each other (Shaun). Path edges along their outer sides stay as today.

**Collision**
- [ ] Every blocking prop or terrain piece whose drawing is smaller than its tile blocks movement only over its drawn footprint, in every region; one that fills its tile is unchanged (Shaun).

**The Bulwark's arena**
- [ ] The forum's wall tiles are drawn clearly darker than the Hollows floor around them, so they read as walls; other Hollows tiles are unchanged (Shaun).

**Arena enemies**
- [ ] In both boss arenas, the boss's adds and the arena's own enemies stay where they are and don't react to the player until the player has come through the door; nothing gathers at the doorway outside (Shaun).

**Doors**
- [ ] Neither boss door shows a description: an open door shows only its E prompt; a sealed door shows "Sealed" (Shaun).

**Sound and supply**
- [ ] The boss room's seal hum plays at half its volume today (Shaun).
- [ ] The Frozen Grotto's pylon sends rimestone at 30 a minute (2× today's 15); other pylons are unchanged (Shaun).

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
