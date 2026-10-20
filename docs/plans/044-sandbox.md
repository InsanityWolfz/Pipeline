# Plan 044: Sandbox

Spec: docs/specs/044-sandbox.md (approved on draft: the open questions' proposals are built). Branch `claude/044-sandbox`, from `main`. Vertical slices, tests first, a commit after each.

## Shape of the change

### 1. The `?sandbox` start, the room and the kit
- **Data** `src/data/sandbox.ts` (new): the room's layout as rects and points (its size, the spawn, the bench, the six pens, the Warden's arena; the Bulwark's arena is the Sunken Forum's own walls, seal and start, at the same tiles as in the Hollows, so the Bulwark's AI and the arena lock read the same numbers), the pens' enemies and rings (044.3), the pen refill delay (044.2: 5 s), the spawn defaults and spacing, the default loadout, the panel's key (044.1: backquote), and the kit's rules: 99 of every item (ITEMS, so every round and tagged round), every recipe and stage row known, every gear piece at each rarity with mid rolls plus every relic (044.4), all derived from the lists. `SANDBOX_START` is a `StartDef` with `sandbox: true`.
- **Data** `src/data/rooms.ts`: the room's id, `SANDBOX_ROOM`. The room itself is built from the layout like the overworld is generated (`src/sim/sandboxRoom.ts`, registered in `src/sim/world.ts`), so `rooms.ts` doesn't import the layout (no import cycle). It has no doors: the player can't leave it.
- **Sim** `src/sim/sandbox.ts` (new): `createSandboxSim(seed)` (the sim on `SANDBOX_START`, then the rest of the kit: level cap, every talent point, every research node restored, all three entrances open, nothing in the other rooms, the pens and arenas filled); `SimState.sandbox?` (optional, so a real save's shape is unchanged: the save-shape fingerprint stays at version 1).
- **Render** `src/render/playtest.ts`: `?sandbox` parses to `SANDBOX_START`; `src/render/flow/flowTypes.ts`: `skipsTitle` covers it, so the save slot is never read or written; the flow starts it with `createSandboxSim`. `?sandbox` doesn't depend on `import.meta.env.DEV`.
- **Render** the room is a tiled room: the forum's cliffs, pillars and fallen drums draw with the Hollows' sprites in a tiled room too; the bench is a block prop.

### 2. The panel with god mode
- **Sim**: `Command.sandbox` (an edge): `{ kind: 'god', on }`; `damagePlayer` in god mode lands the hit (knockback, flash, hit invulnerability, the hit event with the damage it would have done) but takes no health, and Last Ember never fires.
- **Render** `src/render/SandboxPanel.ts` (new): a tablet of 020-style rows (`MenuColumn`, the Settings rows' steppers), toggled by the panel's key (a rebindable action shown in the key list only in the sandbox); its clicks become `Command.sandbox` through `MenuRequests`. `ui().sandbox` reports it.

### 3. The loadout with bottomless entrances
- **Sim**: `{ kind: 'loadout', entrance, round }` (any AMMO id, or null for empty); each tick the sandbox fills every entrance with its loadout round to the current cap, before the tube fires, so a reservoir never runs out. The volley is the real game's (024, 028).
- **Render**: three stepper rows, one per entrance, over every legal round (the four bases and every tagged round, from AMMO) and Empty.

### 4. Spawning and the pens
- **Sim** `src/sim/spawn.ts` (new): `spawnEnemy(state, enemyId, at, group, { ring, champion })`, the one place an enemy is put down at a ring and as a champion; the dev hook's `spawnEnemy` and `spawnChampionPack` use it too. `{ kind: 'spawn', enemyId, ring, champion, count }` puts 1–10 in a row across the aim, a short distance in front of the player (a point in a wall moves back toward the player); `{ kind: 'clear' }` removes every spawned one. A boss is never a champion.
- **Sim**: each pen holds one of its enemy at its ring; once the pen's enemy is gone, it comes back `penRefillTicks` later.
- **Render**: Enemy, Ring, Champion and Count rows, Spawn and Clear.

### 5. The boss arenas and reset
- **Sim**: the Warden waits in its arena, the Bulwark in the forum. `{ kind: 'reset', boss }` puts the boss back at its start at full health, idle, its adds and bombs gone (the arena lock's reset, 043). The arena lock and the forum's seal work in the sandbox room as in the overworld.
- **Render**: the seal and the Bulwark's bombs draw in the sandbox room; Reset Warden and Reset Bulwark rows.

### 6. The rest
- KO with god mode off (044.6): the player wakes at the sandbox's spawn with nothing lost, the pens and arenas refilled.
- No objective line and no end card in the sandbox (044.5).
- Respec works in the sandbox room (037's respec is free, but only in the foundry, which the sandbox can't reach).
- `getState()`: `sandbox: true`, the loadout, god mode, the pens. Settings' save rows are hidden in the sandbox.

## Tests (written first)
- **Vitest sim** `tests/sim/sandbox.test.ts`: the kit covers every item, round, tag and stage (from ITEMS, ROUNDS, TAGS, STAGE_ROWS), every recipe known, research all restored, the level cap with every point, every gear slot × rarity and every relic; the room (spawn on clear floor, a pen per non-boss enemy, the Warden's arena, the forum at the Hollows' tiles with its seal); bottomless reservoirs and a mixed volley; spawn at ring and champion, count and in front, Clear; pen refill after the delay; boss reset; god mode; KO wake; respec; determinism.
- **Vitest render/data** `tests/render/sandboxStart.test.ts`: `?sandbox` parses to the sandbox start and skips the title; a sandbox run (boot, step, KO) never reads or writes the save, backup or settings' save rows (in-memory storage).
- **Playwright** `tests/e2e/sandbox.spec.ts`: boot `?sandbox`; set a mixed loadout and fire it; spawn a ring 3 champion pack; god mode on, a hit takes no health; a real save in storage is untouched.
- **Screenshots** `tests/e2e/sandboxShots.spec.ts` (REVIEW_SHOTS=1, docs/review/044/): the room overview, the panel, a mixed volley in flight, a ring 3 champion pack. The older Bulwark and settings shots are run again (the seal's view and the key list changed).
