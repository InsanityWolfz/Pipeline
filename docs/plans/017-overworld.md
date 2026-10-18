# Plan 017: Overworld and danger

Spec: docs/specs/017-overworld.md. Written for the unattended run (stacked on 016, `claude/017-overworld`). It stays inside the spec.

## Shape of the change
The world becomes two rooms: the generated `overworld` and the `foundry` interior. The clearing, ruin hall and shrine rooms go. Three things that hung off rooms move onto finer handles inside the overworld:
- **Claims** belong to a *site*. The pylon carries `site: 'shrine'`, so the claim id, objectives and fixtures keep the id `shrine`.
- **Enemies** carry a `group`:
  - `field` for the tutorial pack that holds the foundry gate
  - `shrine` for the guards a claim needs dead
  - `pop-<ring>-<slot>` for the living population
- **Gates** seal tiles:
  - The foundry gate seals the entrance stairs, a door.
  - The shrine gate seals the gap in the shrine site's wall, as `gateTiles` on the room.

## Tests first
1. `tests/sim/overworld.test.ts`:
   - generation is deterministic for a seed
   - landmarks override terrain
   - every landmark is reachable from the start (flood fill)
   - tile solidity for walking and for shots (water stops feet, not arrows)
   - ring lookup
   - the map edge is natural (trees and water, no bare wall)
2. `tests/sim/population.test.ts`:
   - no population before the first fill
   - the targets from the fill tick
   - the spawn distance, and no spawns in a safe zone
   - respawn after the delay
   - the on-screen cap
   - a new claim despawns packs homed in its zone, and chasers stop at its edge
   - a death resets the population and keeps claims
3. The existing sim tests move from the ruin hall to an overworld arena:
   - `tests/sim/fight.ts`: `arena()` puts the player in the meadow sandbox, a reserved clearing.
   - The claiming, doorway, tutorial and death tests are rewritten for the landmarks.
4. **e2e:**
   - `?start=hall` becomes `?start=field`.
   - The tutorial run is rewritten for the overworld.
   - A ring-2 crowd scenario with 10–15 enemies, never more than 15 near the player.
   - Minimap markers via `ui()`.

## Steps
1. **Data:**
   - `src/data/overworld.ts`: size, seed, terrain settings, ring bounds, landmarks, reserved clearings, nodes, tutorial packs, the safe radius.
   - `src/data/population.ts`: pack makeup per ring, targets, spawn distance, respawn delay, the cap.
   - `rooms.ts`:
     - new tile symbols (path `,`, shallow `:`, water `~`, tree `T`, rock `R`)
     - `Doorway.arrive`
     - `pylon.site`
     - `gateTiles`
     - the foundry's door now leads to the overworld entrance
2. **Sim:**
   - `overworldGen.ts`: the seeded generator. It outputs the rows plus features: ponds, paths, groves and patches for render.
   - `world.ts`: `WORLD` = the foundry plus the generated overworld. `roomById` and every `ROOMS` user read it.
   - `collision.ts`: walkable symbols; `blocksShot` for arrows and orbs.
   - Doorways honour `arrive`.
   - Enemies get `group`. The foundry gate opens when the `field` group is gone. Claims use sites and guards.
   - `population.ts`: slots per ring, spawning, respawning, the cap, safe zones, the enemy edge stop (`aiCommon`), and the reset on death.
   - The summary gains `area`, `ring` and `liveEnemies`.
   - Starts: `field` replaces `hall`. Playtest and default starts.
3. **Render:**
   - `OverworldView`: ground chunks baked once (grass patches, dirt paths, ponds, sun dapple, ley seams); trees, rocks, ruin pieces, the archway and columns as baked vector sprites sorted by feet; the barrier dome; greener grass and glowing ley inside a safe zone.
   - `MinimapView` on the UI camera.
   - The foundry keeps its pixel look.
   - The mood and sound for the overworld are daylight and wind with birds.
3. **Cleanup:** remove the old room sprites (clearing, hall and shrine floors, walls, props) that nothing uses, and rebuild the atlas. Update the `prototype.md` "Areas".
