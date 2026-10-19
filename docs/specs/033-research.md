# 033: Foundry research as restoration
status: approved

Approved by Shaun in chat, 2026-10-19 ("Approve all 028–037"); open questions settled the same day.

Drafted from Shaun's spec interview (docs/brainstorm/2026-10-19-interview.md), 2026-10-19.

## Goal
The foundry's lost parts show as faint diagrams on the foundry itself: on the intake's capped entrances, on its walls and on a sealed wing. The player walks up to a diagram, presses E and pays its cost in boss cores, machine parts and schematics, and that part of the foundry comes back. A simple list panel shows every node and where to find it. The first nodes are:
- one more intake entrance per boss core
- a bigger reservoir per entrance
- faster machines
- the splitter and the merger

Rare schematic drops in the field reveal specific nodes. They are the game's first "pop" loot moment.

## Design references
- docs/design.md:
  - "World, regions, ley lines, bosses": "Progress means bringing the foundry back online. Tech is rediscovered, never invented."
  - "The Foundry", "The layout is the ability": "The intake starts with one entrance open; the first boss's core opens more, and later unlocks add more." This spec changes it to one entrance per core.
  - "The Foundry", "Unlocks": "Killing a boss unlocks a new foundry wing with new machine types ... Rare schematics add new stage types."
  - "The Foundry", "What monsters drop":
    - machine parts, "specific to each area, needed to build machines and never automated". Settled 2026-10-19 (Shaun): parts pay for research and restoration only; placing a machine stays free.
    - schematics, "rarely, with a big visual pop when one lands"
    - boss cores, "needed for top-tier machines and stages"
  - "Pillars" 5 (each half has its own reward): combat earns parts, schematics and cores. "Economy and progression": gold never buys parts or schematics.
  - "Death and tension": schematics, parts and cores carried since the last deposit are lost on death.
- docs/specs/024-intake-spread.md: entrances, reservoirs, the volley and the warden core. This spec changes 024's "the warden core opens entrances 2 and 3".
- docs/specs/011-death.md: what a KO drops.
- docs/brainstorm/2026-10-19-content.md, section 8: research presented as restoring the foundry, rather than as a second tree screen.
- Interview answers (Shaun, 2026-10-19):
  - Round 1: "Each boss core opens one more entrance. The Warden opens the 2nd, the next boss the 3rd, and later bosses the 4th and 5th. (This changes 024.)"
  - Round 7, research UI: "restoration at the machines. Lost schematics show as faint diagrams on the foundry itself: at the intake, on the walls, in a sealed wing. Press E and pay the cost to bring that part back. A simple list panel shows them all."
  - Round 7, costs: "boss cores, machine parts and schematics. No gold."
  - Round 7, first nodes: "intake entrances (Warden core → 2nd, the Bulwark → 3rd later); reservoir size (30 → 45 → 60); machine speed; splitter and merger."
  - Round 7: gold and the merchant are not built yet.
  - Round 9: "claiming the shrine pylon (after beating the Warden) drops [the Region 2 barrier]. The Warden core goes to the intake."

## Acceptance criteria

**Nodes as data (data, sim)**
- [ ] Each research node is a typed entry in `src/data/research.ts`:
  - `id`, `name`, and a one-line `description`
  - `anchor`: where its diagram shows. This is one of a capped intake entrance, a wall panel at a fixed foundry tile, or the sealed wing's door.
  - `cost`: item id to count. Only boss cores, machine parts and schematics are allowed, never gold or raws. A data test enforces this.
  - `requires`: the node ids that must be restored first
  - `reveal`: `'start'`, so it is visible from the beginning, or the schematic item id that reveals it
  - `effect`: a typed union, `entrance` | `reservoir` | `machineSpeed` | `unlockPiece`
- [ ] Each node is in one of three states, kept in sim state and reported by `getState()`:
  - **hidden:** no diagram, and the list row reads "Lost schematic"
  - **revealed:** a faint diagram at its anchor
  - **restored:** the part is back for good
- [ ] Restored nodes survive a KO, like claims (011).

**Restoring (sim, render)**
- [ ] A revealed node's diagram is drawn on the foundry at its anchor: faint cyan linework over the stone, gently pulsing, in the 020 vector style.
  - **Intake entrances:** the diagram sits over the brass cap.
  - **Reservoir:** the diagram sits on the intake pipe.
  - **Machine speed, splitter and merger:** each has a wall panel. The tiles are chosen in /plan, on the walls, clear of the door, the fixtures, 028's supply ports and the intake.
- [ ] Within reach of a revealed diagram whose `requires` are met, E opens a small one-row panel in the 026 menu style. It shows:
  - the node's name and its one-line effect
  - its cost as icons and counts, with missing inputs in rust-light as in 026
  - a "Restore" row
- [ ] Clicking "Restore", or pressing E again, spends the cost from the carried inventory, as 024's core does today, and restores the node.
  - It records a `restores` event with the node id.
  - It plays a restoration: the linework fills in solid cyan, then the part solidifies in brass and stone, with a sound.
- [ ] With the cost not carried, "Restore" is disabled and nothing is spent.
- [ ] A node whose `requires` are unmet shows its diagram dimmed. E shows which node comes first.
- [ ] Restoring works only inside the foundry and only once the tube is attuned, as 024's opening does today.

**The list panel (render)**
- [ ] J opens a list of every node, grouped by anchor: Intake, Walls, Sealed wing. Each row shows:
  - its name, or "Lost schematic" while hidden
  - its state: restored, ready (affordable now), revealed (cost not met), or hidden
  - its cost icons and counts, for revealed nodes
  - where its diagram is, such as "on the intake" or "east wall"
- [ ] The list is read-only: restoring happens only at the diagram. It opens anywhere, and Esc or J closes it. It doesn't pause the game, like the other panels (031, 037). It never takes clicks meant for the world, as with 017's minimap.

**First nodes (data, sim)**
- [ ] **Intake entrances: one boss core each.** The entrance nodes form an ordered chain:
  - `entrance-2` costs 1 `warden-core`
  - `entrance-3` costs 1 `bulwark-core` (034) and requires `entrance-2`
  - Both are revealed from the start.
  - The player picks which capped mouth tile opens by restoring at that cap; there is no fixed order. Whichever cap is restored first costs the Warden core; the last one costs the Bulwark core.
  - Restoring opens exactly one entrance, with the 024 cap-lift.
  - The Warden has no refight altar: altars are for region bosses only (034), so a normal game has one warden core. A second Bulwark core, for whichever of `entrance-3` and `reservoir-2` comes second, means an altar refight (034).
- [ ] **Reservoir.** `reservoir-1` raises every entrance's cap from 30 to 45. `reservoir-2` requires it and raises the cap to 60. `ENTRANCE_CAP` becomes a per-tier table in data. A restore raises the cap at once, and rounds already held are kept.
- [ ] **Machine speed.** `machine-speed` multiplies every machine's `craftTicks` by `MACHINE_SPEED_MULT` (starting value 0.75, rounded up to whole ticks). Conduits and hoppers are unchanged.
- [ ] **Splitter.** Restoring `splitter` adds a Splitter to the build bar's Logistics group (026). The Splitter is 1×1 and lies flat like the sorter (015):
  - It takes items only from its back.
  - It sends them out its front and its side in turn. F flips the side, as with the sorter.
  - If one output won't take the item, it uses the other. If neither will, it waits holding the item.
- [ ] **Merger.** Restoring `merger` adds a Merger to the Logistics group. The Merger is 1×1 and lies flat:
  - It takes items from its back and both sides, and sends them out its front.
  - It takes from its inputs in turn (back, left, right), so no input starves.
- [ ] Starting costs and reveals, as data. `reservoir-1` costs Region 1 parts only, so it is reachable before the Bulwark (the playtest showed ammo running dry early). Machine speed is one tier, ×0.75.

  | Node | Revealed by | Cost | Effect |
  | --- | --- | --- | --- |
  | `entrance-2` | start | 1 warden core | opens one capped entrance |
  | `entrance-3` | start (needs `entrance-2`) | 1 Bulwark core | opens the other |
  | `reservoir-1` | start | 4 ancient gears | cap 30 → 45 per entrance |
  | `reservoir-2` | its schematic (needs `reservoir-1`) | the schematic, 4 aqueduct valves, 1 Bulwark core | cap 45 → 60 |
  | `machine-speed` | its schematic | the schematic, 3 ancient gears | `craftTicks` × 0.75 |
  | `splitter` | its schematic | the schematic, 2 ancient gears | Splitter in the build bar |
  | `merger` | its schematic | the schematic, 2 ancient gears | Merger in the build bar |
  | `sealed-wing` | start, as a sealed door | cannot be restored in this spec | the Bulwark's first kill (034) unseals the door; what's inside is a later spec |

**Schematics (data, sim, render)**
- [ ] New item kind `schematic`. There is one schematic item per node whose `reveal` names one: `schematic-reservoir-2`, `schematic-machine-speed`, `schematic-splitter` and `schematic-merger`.
- [ ] A schematic is a rare drop. When an enemy dies, a separate roll with the seeded RNG decides whether a schematic drops. Starting chances, as data:
  - 1% for a normal enemy
  - 5% for a champion (032)
  - a Ruined Cache uses its own table: 20% schematic (032)
- [ ] Which schematic drops is picked evenly from those that are not yet revealed, carried, or lying on the ground, and whose region allows it. Each schematic lists the regions it can drop in; `schematic-reservoir-2` drops only in Region 2 (034). When none is eligible, no schematic drops, so there are no duplicates.
- [ ] **A schematic drops as an unknown.** Until it is banked it shows as "Unknown schematic" everywhere: on the ground, in the pickup feed and in the inventory panel (031), with one shared icon. Which node it reveals isn't shown until it is banked.
- [ ] **The pop.** This spec owns it (032's cache and champions only roll). A dropped schematic lands with a ley-light pillar, a burst of sparks and its own sound, and:
  - the pillar lasts until the schematic is picked up
  - a minimap ping while it lies on the ground
  - a banner on pickup reading "Unknown schematic"
- [ ] 032 ships first, with its cache opening for raws only. This spec fills the cache's rare entries as data (the schematic roll above and the `ancient-gear` part), with no cache code change.
- [ ] A schematic reveals its node once it is **banked**: carried into the foundry, or sent home from a pylon (009). Its diagram then appears, with a short reveal shimmer, its list row gets its name, the item takes its real name (such as "Schematic: Splitter"), and a banner names it. A KO before banking loses it under the death rule (011), and the node stays hidden.
- [ ] Restoring spends the schematic as part of the cost.

**Machine parts (data)**
- [ ] Item data gains a `research` tag: `core`, `machinePart` or `schematic`. The cost-validity test reads it. Existing item `kind`s are unchanged (`schematic` is the one new kind), as 031 keeps `warden-core` a `part`. For 031's panel groups, cores go in Cores, and machine parts and schematics in Parts.
- [ ] One machine part per region:
  - Region 1: `ancient-gear`, also the "rare part" that 032's cache and champions roll
  - Region 2 (034): `aqueduct-valve`, a brass valve from the Hollows' waterworks
  - Parts pay for research and restoration only. Placing a machine stays free once it is unlocked (006); parts never become a placement cost in this spec.
- [ ] Region 1 drops, starting values:
  - Husks and Wisps drop an `ancient-gear` 4% of the time.
  - A champion rolls it once, at a champion rate in this spec's data (starting at 12%, 3× the normal rate), not once per drop roll (032).
  - A Ruined Cache rolls its 50% rare part (032) as an `ancient-gear`.

**The 024 migration**
- [ ] One Warden core opens one entrance, not two. These are removed and replaced by the `entrance-*` research nodes and the generic restore path:
  - `OPEN_ENTRANCES_COST`
  - `intakeCanOpen`, `intakeOpenable` and `openSideEntrances` (`src/sim/intake.ts`)
  - `INTAKE_PROMPT` ("open the side entrances")
- [ ] The cap-lift animation and sound play for the one entrance restored. The `intakeOpens` event is kept for render, with a single index, alongside `restores`.
- [ ] The tutorial objective "Open the intake's side entrances (E with a warden core)", with check `sidesOpen`, becomes "Restore a second intake entrance (E at a cap with the warden core)", with check `{ kind: 'restored', node: 'entrance-2' }`. "Feed two entrances to fire a spread" (`volley`, min 2) is unchanged. The prompt near the intake reads "E: restore an entrance" while a warden core is carried.
- [ ] 028's Milestone 1 goal "Feed all three entrances" (`volley { min: 3 }`) can no longer be met before the Bulwark, so it moves out of its 028 position to after 034's "Restore the intake's third entrance" (until 034 lands, it sits just before the frontier line). The objective line never points at a goal the player can't yet reach.
- [ ] After the Warden, the intake has one capped entrance and two open ones. This is the state 024's screenshot note says "can't occur"; it is now the normal state.
- [ ] `?playtest` keeps its 5 warden cores, and gains 2 Bulwark cores, 10 ancient gears, 10 aqueduct valves and one of each schematic, so every node can be restored by hand in a playtest.
- [ ] Every 024 test that opened both sides with one core is rewritten:
  - one core opens one entrance
  - a second warden core cannot open the third entrance
  - the third entrance costs a Bulwark core
  
  No test is deleted without a replacement. The full tutorial e2e run is updated.
- [ ] There is no save data yet, so there is nothing to migrate in saves.

**Docs (on approval)**
- [ ] docs/design.md, with Shaun's approval:
  - "What monsters drop": machine parts pay for research and restoration, not for placing machines.
  - "The Foundry", "The layout is the ability": "the first boss's core opens more" becomes "each boss core restores one more entrance: the Warden's the 2nd, the next boss's the 3rd, later bosses' the 4th and 5th".
  - "Unlocks": schematics reveal lost parts of the foundry to restore.
  - "Economy and progression": the gold row's "reservoir size" moves to restoration, paid in cores, parts and schematics.
  - A short "Restoration" paragraph: diagrams on the foundry, E to restore, the list panel.
- [ ] docs/prototype.md, with Shaun's approval: beat 9 and "Machine part: warden core" say the core opens one entrance.

**Hook**
- [ ] `getState()` reports:
  - each node's state
  - the current entrance cap and machine-speed multiplier
  - which schematics are carried and which are banked
  - the events `restores`, `schematicDrops` and `schematicReveals`

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass.

## Data changes
- `src/data/research.ts` (new): the nodes, `MACHINE_SPEED_MULT`, the reservoir tiers, the wall-panel and wing anchors, and the reach for E at a diagram.
- `src/data/foundry.ts`:
  - `ENTRANCE_CAP` becomes `ENTRANCE_CAPS = [30, 45, 60]`
  - `OPEN_ENTRANCES_COST` is removed
  - `INTAKE.entrances` is unchanged at 3
- `src/data/items.ts`:
  - the `research` tag (`core | machinePart | schematic`)
  - items `ancient-gear`, `aqueduct-valve` and the four `schematic-*` items, each with a 031 panel `group`
  - `warden-core` is tagged `core`
  - `bulwark-core` is added here or by 034, whichever ships first
- `src/data/drops.ts` (new), or a field on `DropTable`: the schematic chances by source, each schematic's regions, and the part chances.
- `src/data/enemies.ts`: Husk and Wisp drop tables gain `ancient-gear`.
- `src/data/pieces.ts`: `splitter` and `merger` (logistics). Each is in `BUILD_BAR` but hidden until restored, as locked pieces are hidden today (026).
- `src/data/objectives.ts`: the reworded entrance objective and a new check `{ kind: 'restored', node }`.
- `src/data/playtest.ts`: the overrides above.
- `src/data/art`: diagram linework per anchor, the wall panels, the sealed wing door, splitter and merger sprites, schematic and part icons, the light pillar, and the restore and reveal effects.
- Sounds: restore, schematic chime, reveal.

## Out of scope
- The 4th and 5th entrances. They need the intake's mouth widened from 3 to 5 tiles and later bosses' cores. The node chain and data shape allow them.
- Restoring the sealed wing, or anything inside it.
- Stage machines and their nodes. These come from the ammo-stage spec (029). Its stages unlock by hand-making one, from round 4, not by research.
- Blueprints. The brainstorm lists them as a node, but Shaun did not name them in round 7.
- Gold, the merchant and refill-rate nodes.
- Parts as a cost for placing machines: placing stays free (Shaun, 2026-10-19).
- XP for restoring.

## Test plan
- **Vitest:**
  - Data: every node's cost uses only core, machine-part or schematic items; every `requires` exists; there are no cycles.
  - States: start reveals, a carried schematic reads "Unknown schematic" and reveals nothing, a banked schematic reveals its node and takes its name, and a KO before banking loses it with the node still hidden.
  - Restore: it spends the exact cost; it refuses without the cost, with unmet `requires`, outside the foundry, or before attuning.
  - Entrances: the warden core opens exactly the chosen cap; the second cap then costs a Bulwark core; a second warden core does nothing for it.
  - Reservoir: the cap goes 30 → 45 → 60 and held rounds are kept. The volley and tutorial "line full" checks use the current cap.
  - Machine speed: `craftTicks` is scaled and rounded up.
  - Splitter: alternates outputs, falls back when one is blocked, and waits when both are blocked.
  - Merger: takes from three inputs in turn, and a blocked front stalls it.
  - Schematic drops: the chances by source with a fixed seed, no duplicates, and the region filter.
  - Restores survive a KO. Determinism.
- **Playwright:**
  - With `?playtest`: restore `entrance-2` at the west cap, feed two entrances and see a two-round volley; then restore `entrance-3` with a Bulwark core.
  - Restore `reservoir-1` and fill an entrance to 45.
  - Restore the splitter and place it.
  - Open and close the list panel.
- **Screenshots:**
  - the intake with diagrams on both caps
  - one cap restored and one capped
  - a wall-panel diagram before and after restoring
  - the restore panel with a missing input
  - the list panel
  - a schematic's light pillar in the field
  - the sealed wing door

## Open questions
None. Settled by Shaun, 2026-10-19 (see docs/brainstorm/2026-10-19-open-questions.md).
