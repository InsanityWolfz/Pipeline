# 017: Overworld and danger
status: approved

Approved by Shaun, 2026-10-18 ("I approve all"), for an unattended run.

## Goal
The game happens outside on one open map, like Realm of the Mad God. You wake near its centre, the foundry is a buried ruin a short walk away, and danger rises in rings as you go out. Once your first line fills the tube, the land fills with roaming packs, enough that a fight can hold 10 to 15 enemies. Claiming the shrine makes the ground around its pylon safe.

## Design references
- docs/design.md:
  - "Combat", Enemies, rewritten for this spec with Shaun's approval on 2026-10-18 (RotMG density)
  - "World, regions, ley lines, bosses": difficulty by distance from the foundry; claiming makes monsters stop roaming there
- docs/prototype.md: "Player flow" beats 1–10 and "Areas". The areas list is updated in this spec.
- docs/specs/016-art-direction.md: the vector pipeline and palette that the overworld is drawn with
- The style test's environment (`docs/art/style-test.html`), approved by Shaun ("The environment looked good")
- Shaun's notes, 2026-10-18:
  - "having the start be in the middle of a big outside map makes the most sense, the realm of the mad god. There is no buildings unless you enter a special dungeon or area that's a building"
  - "spawn way more enemies to make it feel dangerous after the tube and pipeline are activated"; then "10-15 enemies max instead of 15-20"
- Shaun's interview answers, 2026-10-18:
  - a centre start, with danger rising in rings outward
  - about 4×4 screens
  - seeded generation plus hand-placed landmarks
  - the foundry as a buried ruin entrance
  - a living population once the first line fills
  - the ruin hall becomes an open-air ruin field
  - a safe zone around a claimed pylon
  - a corner minimap

## Acceptance criteria

**The map (data, sim)**
- [ ] A new `overworld` area about 4×4 screens: 80×45 tiles of 32 px, or 2560×1440 px.
  - It replaces the clearing, the ruin hall and the shrine rooms.
  - The foundry stays as a separate interior room, entered through the foundry entrance.
- [ ] Terrain is generated from a fixed seed in `src/data/overworld.ts`, so every run gets the same map:
  - grass with lighter and darker patches
  - dirt paths joining the landmarks
  - ponds
  - groves of trees
  - rock fields
  - scattered ruin stones
  - The generator is pure sim code using `src/sim/rng.ts`.
- [ ] Trees, rocks, ruin walls and deep water block movement, through the existing collision. Projectiles stop at trees, rocks and walls and fly over water. Shallow pond edges are walkable.
- [ ] The map edge is a natural boundary, such as cliffs, dense forest or deep water, never a bare wall.
- [ ] Rings by distance from the foundry entrance:
  - ring 0 is the start and the foundry surroundings
  - ring 1 is the near field
  - ring 2 holds the shrine site
  - The ring bounds are data.

**Landmarks (data)**
- [ ] Landmarks are placed by hand in data and override the generated terrain under them.
  - **Start stone:** near the centre, with the dormant tube.
  - **Foundry entrance:** a half-sunken stone archway with rune pillars and stairs going down into a grassy mound, a short walk from the start. Ley lines run into it. Walking down the stairs fades into the foundry interior, and leaving it fades back out to the stairs.
  - **Ruin field:** roofless broken walls and columns around the foundry entrance. The first Husk pack lives here. Rubble blocks the stairs until that pack is dead, as the hall's door works today.
  - **Shrine site:** an open-air ruin in ring 2 with the pylon, its Warden, Wisps and Husks. Until the first line fills the tube, a ley barrier dome covers the site, as the shrine door's barrier works today.
  - The resource nodes are placed in sensible spots. Spec 018 gives them proper in-world sources.

**Living population (data, sim)**
- [ ] Before the first line fills the tube, only the fixed tutorial packs exist: the ruin-field Husks and the shrine guards.
- [ ] From the tick the first line fills the tube, each ring keeps a target number of packs alive.
  - Starting values:
    - ring 1: 4 packs of 3–4 Husks
    - ring 2: 4 packs of 3–5 Husks and Wisps
  - Packs spawn at points chosen by the seeded RNG on open ground, at least 1.5 screens from the player and never inside a safe zone.
  - Each enemy's home is its spawn point, so the existing aggro and leash rules apply unchanged.
- [ ] When a pack is wiped out, a replacement spawns in the same ring after a delay (starting value 20 s), out of view.
- [ ] A busy fight in ring 2 can reach 10–15 enemies on screen, and never more than 15 awake within a screen of the player. A new pack never spawns while 15 enemies are within that range. A scripted e2e scenario proves it.
- [ ] The on-screen cap of 15, the population numbers, pack makeup per ring, spawn distance and respawn delay are data in `src/data/population.ts`.
- [ ] Death keeps today's rule: unclaimed land resets. The population and the tutorial packs respawn, and claimed land stays claimed.

**Claimed land (sim, render)**
- [ ] A claimed pylon makes a safe zone (starting radius 10 tiles). Nothing spawns there. A pack whose home is inside despawns, and enemies never enter it while chasing; they stop at its edge.
- [ ] Inside a safe zone the grass is greener and the ley lines glow.

**Camera and minimap (render)**
- [ ] The camera follows the player and is clamped to the map edges, as it is clamped to rooms today.
- [ ] A corner minimap shows:
  - terrain colours
  - the player
  - the foundry entrance
  - the shrine
  - claimed pylons
  - It shows no enemies. It hides inside the foundry and never takes clicks meant for the world.

**Art (render, data)**
- [ ] The overworld is drawn in the 016 vector style and palette, matching the style test's environment:
  - grass patches with tufts and flowers
  - dirt paths
  - ponds with sand rims and ripples
  - trees with sun dapple
  - rounded rocks
  - glowing ley lines in rune stones
  - the archway, columns and broken walls
- [ ] Large ground areas are drawn once into chunked textures, not object by object, so the full map runs at 60 fps on the playtest machine.
- [ ] The old clearing, hall and shrine floor, wall and prop sprites are removed once nothing uses them.

**Flow and tests unchanged in meaning**
- [ ] Every beat of the tutorial flow (012) still works in order, and all 12 objectives can be completed:
  - wake
  - take the tube
  - gather and craft
  - the first fight
  - the rubble clears
  - attune at the foundry
  - the first line
  - the barrier drops
  - claim the pylon
  - spread
  - death and return
- [ ] `?playtest` starts at the start stone with the boosted kit and the population active. `?start=hall` becomes `?start=field`, with the same sandbox purpose next to the ruin field.
- [ ] Fast travel and pylon deposit work from the shrine site.
- [ ] `__GAME__.getState()` reports the current area, the ring the player is in, and the live enemy count.
- [ ] `docs/prototype.md` "Areas" is updated to the overworld, start stone, ruin field, foundry entrance and shrine site.

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass. The e2e tests that used the old rooms are rewritten for the overworld landmarks.

## Data changes
- `src/data/overworld.ts` (new):
  - seed, size, terrain generator settings, ring bounds
  - landmarks, nodes, tutorial packs, the safe radius
- `src/data/population.ts` (new): pack makeup and targets per ring, spawn distance, respawn delay.
- `src/data/rooms.ts`: the clearing, ruin hall and shrine are removed. The foundry's doorway now leads to the foundry entrance.
- `src/data/art/`: overworld terrain, landmark and prop shapes.
- `src/data/objectives.ts`: the wording that names old rooms.

## Out of scope
- Biomes beyond the starting grassland, bosses, dungeons, and more than one claimable site.
- New enemy types or behaviour changes.
- Proper sources for the resource nodes (spec 018).
- The foundry intake pipe (spec 019).
- Redrawing the foundry interior (spec 020).
- A day and night cycle.

## Test plan
- **Vitest:**
  - The generator is deterministic for a seed.
  - Landmarks override terrain, and every landmark is reachable from the start on foot (a flood fill).
  - Collision against trees, rocks and water, and projectiles over water.
  - Ring lookup.
  - The population:
    - no extra packs before the first fill, and the target count from the fill tick
    - spawn distance from the player, and no spawns in a safe zone
    - respawn after the delay
    - despawn inside a new safe zone, and chasers stopping at its edge
    - a reset on death that keeps claims
- **Playwright:**
  - The full tutorial run is rewritten for the overworld.
  - Enter and leave the foundry through the entrance.
  - A ring-2 scenario with 10–15 enemies on screen and never more than 15.
  - The minimap's markers.
  - The `?playtest` and `?start=field` starts.
- **Screenshots (qa):**
  - the start stone
  - the foundry entrance with the rubble, then cleared
  - the ruin field fight
  - the shrine site with its barrier, then claimed with green grass
  - a ring-2 crowd
  - the minimap

## Build notes
- **Spawn distance.** "At least 1.5 screens from the player" is built as two checks:
  - the pack's centre is at least 480 px (1.5 half-screens) from the player
  - every member stands outside the camera's view, clamped to the map's edges, plus a 64 px margin

  The literal 960 px leaves almost no ring-1 ground while the player is near the foundry, so the view check is what keeps spawns out of sight. See the open question.
- **The awake cap is enforced in two places.** "Never more than 15 awake within a screen" holds two ways:
  - enemies don't wake on sight while 15 nearby are already awake
  - a hit doesn't wake a 16th either: it takes the damage and stays asleep
- **The spawn cap counts the whole pack.** A pack spawns only if even its largest size would keep the enemies within a screen at 15 or fewer.
- **"On screen" and "within a screen" differ.** "Within a screen" is a view's width and height either way of the player (`POPULATION.screen`). "On screen" is what the camera shows; the summary reports it as `onScreen`.
- **Tuning.** Ring 2 went from 4 packs of 3–5 to 8 packs of 4–5. With 4, the busiest scripted ring-2 fight showed 4–11 enemies on screen; with 8 it shows 10–13. Ring 1 is unchanged.
- **Claims are by site.** `ClaimHold.site`, `events.sealed`, `events.claims` and `summary.claimHold` carry the site id (`shrine`); the player's room is `overworld`. The objective is `{ kind: 'claimed', site }`.
- **Safe zones.** Every pack member, not just the centre, is kept out of a safe zone. A knockback can't carry an enemy into one either.
- **New packs appear one tick late.** They arrive the tick after the line fills, because the population steps before the gates do.
- **Removed with the old rooms:** fireflies, floor themes, the ruin and shrine ambient loops, and the shrine door's barrier sprite. The shrine's barrier is now the dome.
- **From QA, left as they are:**
  - The ruin field reads as flat pale flagstones. The barrier dome is faint.
  - The objective banner can cover enemies at the top of the view, and the minimap covers the top-right corner.
  - On the very first frame of `?playtest`, the banner shows "Pick up the tube".
- **Review.** All seven blocking items are fixed:
  - **Claimed-pylon UI:** the pylon menu, glow and claim bar now work at the shrine. The e2e test opens the menu with E and a click.
  - **Spawning:** member safe zones, spawns kept out of view, and hits no longer wake past the cap.
  - **Cleanup:** the dead code is removed and the generator's tuning numbers are moved into data.
  - **On screen:** the e2e test checks the on-screen count.

  From the suggestions, these are in:
  - pack size counted in the spawn cap
  - knockback kept out of safe zones
  - the dome and safe-zone looks moved to data
  - `GameScene` split into `SceneCameras` and `RoomViews`
  - an assertion on the `?playtest` start
  - claims renamed to "site"

  Two are left:
  - the procedural ground painter's shape numbers stay in render
  - the one-tick population lag, noted above

## Open questions
None. Shaun answered both, 2026-10-18:
- **Spawn distance:** "Packs spawning is fine as long as the player never sees a pack spawn on their screen." The build keeps 480 px plus every member out of the clamped view.
- **Hits past the cap:** "if they hit an enemy off screen not waking it up is fine because the player didn't see it anyways." A hit doesn't wake an enemy while 15 are awake near the player.
