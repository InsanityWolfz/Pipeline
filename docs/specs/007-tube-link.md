# 007: Tube link
status: draft

## Goal
The first time the player walks into the foundry, the tube attunes and links to it. The player can then build a tube socket at the end of a line. Ammo the line pushes into the socket fills the tube's reservoir, and once the player's carried ammo of that type runs out, shots drain the reservoir. The hotbar glows cyan when it's firing foundry ammo. Hand-loading is gone: the tube fires carried ammo straight from the inventory.

A `?playtest` URL flag starts the player with plenty of every ammo, raw and part, with every machine unlocked, to speed up testing.

## Design references
- docs/design.md: "Combat" (the tube fires whatever your foundry makes; hotbar = ammo lines, one slot to start; "Reservoir": the tube holds a reservoir that drains as it fires and refills from the foundry, factory throughput sets the refill speed, reservoir size is an upgrade), "Pillars" 2 (manual first, then automated), "Opening" beats 3 and 5 (the tube attunes and links to the foundry; "the tube now fires straight from the factory"), "Death and tension" (the factory and tube are always kept)
- docs/prototype.md: "Player flow" beats 4 and 6, "Crude animations needed" (tube: attuning), "Foundry pieces", the line on reservoir refill ("fast enough that the first line feels good right away")
- docs/process.md: "Prototype backlog" item 007
- docs/specs/003-tube-firing.md (the tube, the hotbar slot), 005-hand-crafting.md (ammo select on 1–3, the crafted set), 006-foundry-building.md (pieces, item flow, unlocks)
- Interview decisions (Shaun, 2026-10-18):
  - The tube attunes the first time the player enters the foundry.
  - A new buildable 1×1 piece, the tube socket, feeds the reservoir. Only one can be placed, and it unlocks on attunement.
  - Hand-loading (R) is removed. Carried ammo fires first, then the reservoir, and the hotbar glows cyan while it fires reservoir ammo.
  - There is one reservoir, tied to the one supply slot, not one per ammo type. Later, more hotbar slots each get their own socket and reservoir, and several slots may hold the same ammo.
  - The hotbar count switches from the inventory count to the reservoir count once carried ammo runs out.
  - The reservoir cap is 30. It survives a KO, and so does attunement.
  - The playtest boost sits behind a `?playtest` URL flag: 99 of each ammo and raw, 20 of each part, and every machine unlocked.

## Acceptance criteria

**Firing without hand-loading (sim)**
- [ ] The tube's loaded count, loading and load progress are removed, along with the load command and R. Holding fire with the selected ammo in the inventory fires one round per that ammo's fire interval, taking it straight from the inventory. With none carried and an empty reservoir (or a reservoir holding a different ammo), fire is a dry fire, as before.
- [ ] Switching ammo with 1–3 just changes the selected ammo. No rounds move back to the inventory.

**Attunement (sim, render)**
- [ ] The tube starts dormant. The first time the player enters the `foundry` room, it attunes: an attune event is recorded and the tube is linked from then on. Later entries do nothing.
- [ ] Attunement plays the tube's attuning animation on the player: a ley-cyan pulse along the tube, about 1 s. It's cosmetic, so the player keeps control.
- [ ] Attunement and the reservoir survive a KO.

**Tube socket (data, sim)**
- [ ] New 1×1 piece `tube-socket`, solid like hoppers and crates. It unlocks when the tube attunes. It takes items from any side, like a crate.
- [ ] Only one tube socket can be on the grid. Placing a second fails with place-failed. Picking it up frees the slot. The reservoir keeps its contents and is not handed to the player.
- [ ] The socket accepts an ammo item if the reservoir is empty, or holds that same ammo, and holds fewer than its cap (30). An accepted item goes straight into the reservoir and a refill event is recorded. Anything else (a part, a raw, a different ammo, or a full reservoir) is refused, so the conduit or machine in front of it stalls as in 006. Throughput sets the refill speed.
- [ ] The reservoir holds one ammo type and a count. When it empties to 0, it forgets its type.

**Reservoir firing (sim)**
- [ ] When firing and the inventory holds none of the selected ammo, the tube fires from the reservoir if it holds the selected ammo, one round per fire interval, and records that the shot came from the reservoir.
- [ ] Inventory ammo always fires first. The reservoir is only drawn on once that runs out.

**Playtest boost (data, render)**
- [ ] Opening the game with `?playtest` in the URL, in dev and in the Pages preview, starts the player with 99 each of arrow, bomb and ley bolt, 99 each of wood, stone, fiber, ley crystal and husk resin, and 20 each of shaft, arrowhead, rope, casing, fuse and ley shard. Every recipe output is in the crafted set, so all nine machines unlock. A KO resets the inventory to this boosted set.
- [ ] Without the flag, the start is unchanged: 30 arrows and nothing crafted. Tests run without it unless they opt in.
- [ ] The boosted inventory and crafted set are data in `src/data`, and the sim receives them through its setup options, so the flag never reaches sim rules.

**HUD (render)**
- [ ] The hotbar slot shows the inventory count of the selected ammo while any is carried. When none is, it shows the reservoir count if the reservoir holds that ammo, and the slot glows ley cyan. Otherwise it shows 0. The load bar and the `n/6` loaded readout are removed.
- [ ] The build bar shows the tube socket once it's unlocked.

**Foundry views (render, art)**
- [ ] The tube socket is drawn on the grid with ley-cyan accents. In build mode it shows gold input arrows on all four sides. Its sprite pulses briefly on each refill. When hovered, it shows the reservoir's ammo and count out of 30.

**Determinism and the hook**
- [ ] The same seed, options and command sequence give the same attunement, reservoir and shots, tick for tick.
- [ ] `getState()` drops `loaded`, `loading` and `loadProgress`, and adds: `attuned`, the reservoir (ammo id or null, count, cap), whether this tick's shot came from the reservoir, and this tick's attune and refill events. The `load` field leaves the hook's command.

**Art**
- [ ] New sprites following docs/art.md: the tube socket (with a refill frame), its build bar icon, the tube's attuning frames, and the cyan hotbar glow. All registered in `src/data/assets.ts`.
- [ ] Shaun approves every new sprite by eye at 4×.

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass, with existing tests that hand-load updated to fire from the inventory.

## Data changes
- `src/data/tube.ts`: remove `TUBE_CAPACITY` and `LOAD_TICKS`, and add `RESERVOIR_CAP = 30`.
- `src/data/pieces.ts`: `tube-socket` (1×1, solid, takes from all sides, unlocked by attunement, limit 1), added to the build bar order.
- `src/data/player.ts` (or a new `src/data/playtest.ts`): `PLAYTEST_INVENTORY` and `PLAYTEST_CRAFTED` (every recipe output id).
- `src/data/assets.ts` / `foundryAssets.ts`: socket, attuning and glow keys.

## Out of scope
- More than one supply slot, hotbar slot or reservoir. Several slots of the same ammo come later.
- Ley range falloff, quality loss away from pylons, and reservoir size upgrades.
- The tutorial flow, foundry uncovering, and the mystery hook (012).
- Death losing the carried haul (011).
- Sound, and refill rate readouts.
- Saving between sessions. The playtest flag is only a starting option.

## Test plan
- **Vitest (`tests/sim`):**
  - Firing: fire takes from the inventory at the ammo's interval with no loading. A dry fire happens when nothing is carried and the reservoir is empty or holds a different ammo. Ammo select moves nothing.
  - Attunement: the first foundry entry attunes and records the event once. A re-entry does nothing. A KO keeps it.
  - Socket: locked until attuned, then placeable. A second one fails. Pick-up keeps the reservoir. It accepts matching ammo up to 30 and refuses parts, raws, other ammo and anything over the cap, so a line stalls behind it. The reservoir forgets its type at 0.
  - Reservoir firing: inventory first, then the reservoir with the from-reservoir flag set. A full ley bolt line into a socket refills the reservoir while the player fires from it.
  - Playtest options: the boosted inventory and crafted set unlock all nine machines, and a KO resets to the boosted inventory. With default options, the start is unchanged. Same seed and options give the same run.
- **Vitest (data test):** `tube-socket` exists in the build bar, the playtest inventory uses existing item ids, and the playtest crafted set covers every recipe output.
- **Playwright (`tests/e2e/tubeLink.spec.ts`):** entering the foundry attunes, and the attune event fires once. Build an arrow line ending in a socket, step until the reservoir fills, fire out the carried arrows and then reservoir arrows (check the from-reservoir flag and the falling count). `?playtest` starts with the boosted inventory and every machine on the build bar. No console errors.
- **Screenshots (qa agent):** the attuning pulse; the socket on a line in and out of build mode; the hover readout; the hotbar with an inventory count; the hotbar glowing cyan with a reservoir count.
- **Shaun's review:** the new sprites at 4×, then the preview playtest with `?playtest` (does the link feel like a big moment? does the first line refill fast enough to feel good?).

## Open questions
- Every number above (cap 30, the playtest counts, the attune pulse length) is a starting value for Shaun to adjust when approving.
