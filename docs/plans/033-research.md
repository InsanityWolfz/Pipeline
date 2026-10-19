# Plan 033: Foundry research as restoration

Spec: docs/specs/033-research.md, with Shaun's decisions in docs/brainstorm/2026-10-19-open-questions.md (B, E, F, J, K, L; 033.1–033.10; 033.2: parts pay for research only, placing stays free; 033.5: a schematic drops unknown and reveals when banked). Written for the unattended run (028–038 as separate commits on `claude/laughing-volta-uac3nf`). docs/design.md already carries the 033 wording, so it isn't touched. The spec's docs section asks for docs/prototype.md's beat 9 and "Machine part" line to say the core opens one entrance; Shaun approved the spec, so those two lines change.

## Shape of the change
Small vertical commits, failing tests first in each:

1. **Research data** (`src/data/research.ts`, new): `ResearchNode` { `id`, `name`, `description`, `anchor`, `cost`, `requires`, `reveal`, `effect` }.
   - `anchor`: `{ kind: 'entrance' }` (any capped intake entrance), `{ kind: 'pipe' }` (the intake pipe), `{ kind: 'wall', tx, ty, where }` (a wall panel at a foundry wall tile), `{ kind: 'wing', tx, ty }` (the sealed wing's door).
   - `effect`: `entrance` | `reservoir { tier }` | `machineSpeed` | `unlockPiece { piece }` | `wing` (the sealed wing: never restorable in this spec).
   - Nodes in list order: `entrance-2`, `entrance-3`, `reservoir-1`, `reservoir-2`, `machine-speed`, `splitter`, `merger`, `sealed-wing`, with the spec's costs and reveals.
   - `MACHINE_SPEED_MULT` 0.75, `RESEARCH.reach` (px, feet box to an anchor's tile), the list panel's groups (Intake, Walls, Sealed wing) and the "where" wording.
   - `src/data/foundry.ts`: `ENTRANCE_CAP` → `ENTRANCE_CAPS = [30, 45, 60]`; `OPEN_ENTRANCES_COST` removed.
   - `src/data/items.ts`: `ItemKind` gains `schematic`; `ItemDef.research?: 'core' | 'machinePart' | 'schematic'`; items `ancient-gear`, `aqueduct-valve` (parts, Parts group), `bulwark-core` (part, Cores group, tagged core; 034 gives it a drop), the four `schematic-*` (kind schematic, Parts group); `warden-core` tagged `core`. `UNKNOWN_SCHEMATIC` (name and shared icon).
   - `src/data/drops.ts` (new): schematic chances by source (enemy 1%, champion 5%; the cache's 20% is its `rare` entry), each schematic's regions (`schematic-reservoir-2` Region 2 only), the room → region table (the overworld and foundry are Region 1), `ANY_SCHEMATIC` (the token a table's rare entry names to mean "one eligible schematic"), and the Region 1 part entry (`ancient-gear`, 4%, champions 12%).
   - `src/data/enemies.ts`: Husk and Wisp `rare: [REGION_1_PART]`. `src/data/landmarks.ts`: `CACHE_DROPS.rare` = `ancient-gear` 50%, `ANY_SCHEMATIC` 20%.
   - `src/data/playtest.ts`: 5 warden cores, 2 Bulwark cores, 10 ancient gears, 10 aqueduct valves, one of each schematic.
   - Data tests (`tests/data/research.test.ts`): ids kebab-case and unique; costs use only items tagged core, machinePart or schematic (never gold or raws); every `requires` exists and there are no cycles; every `reveal` is `start` or a schematic item whose node it is; the wall tiles are wall tiles facing floor, clear of the door, the fixtures, the ports, the props and the intake; reservoir tiers index `ENTRANCE_CAPS`; `unlockPiece` names a piece in `BUILD_BAR`.
2. **Research rules** (`src/sim/research.ts`, new): `state.research` (node id → `hidden` | `revealed` | `restored`; start reveals; kept through a KO; `resetWorld` never touches it).
   - What's shown at each anchor (`diagrams(state)`): each capped entrance shows the first entrance node not yet restored; the pipe the first reservoir node not yet restored; walls and the wing each node of theirs; only revealed nodes; dimmed while `requires` are unmet.
   - `diagramInReach(state)`: in the foundry, attuned, the nearest shown diagram within `RESEARCH.reach`.
   - `restoreFail(state, nodeId)` → `not-foundry` | `not-attuned` | `hidden` | `restored` | `sealed` | `requires` | `cost` | `reach`, or null. `restore(state, nodeId)` spends the cost from the inventory, marks it restored, records `restores { node }`, and applies an entrance at the cap in reach (`intakeOpens { entrance }`).
   - New command `restore: string | null` (render's Restore row or a second E).
   - `entranceCap(state)` (`ENTRANCE_CAPS` by the highest restored reservoir tier) and `craftTicksOf(state, pieceId)` (× `MACHINE_SPEED_MULT`, rounded up, once `machine-speed` is restored).
3. **The 024 migration**: `intakeCanOpen`, `intakeOpenable`, `openSideEntrances`, `OPEN_ENTRANCES_COST` and `INTAKE_PROMPT` go; `foundryUse` no longer opens the intake on E. `intakeOpens` carries one `entrance`. Objective `{ kind: 'restored', node: 'entrance-2' }` "Restore a second intake entrance (E at a cap with the warden core)"; "Feed all three entrances" moves to just before the frontier line. The intake prompt reads "E: restore an entrance" while the next entrance node is ready.
4. **Reservoir and machine speed**: `entranceAccepts`/`fillEntrance` and `stepFoundry` take the current cap and craft-tick multiplier (defaults keep the base values); the tutorial's "line full" uses the current cap; `getState().intake.entrances[].cap` is the current cap.
5. **Splitter and merger** (`src/data/pieces.ts`, `src/sim/pieces.ts`, `src/sim/splitMerge.ts` new): logistics kinds `splitter` and `merger`, 1×1, flat (walkable), in `BUILD_BAR` after the sorter, hidden until restored (`unlockedPieces` reads `state.research`).
   - Splitter: takes only from its back; out its front and side in turn (side right of facing, left when mirrored; F flips it); falls back to the other output; waits holding the item when both refuse.
   - Merger: takes from its back and both sides, out its front; offers are taken in turn (back, left, right): an offer from a side that isn't next is taken only while the side whose turn it is has nothing ready for it, so no input starves; a blocked front stalls it.
   - Feeding the intake, conduit corners, pick-up contents, hoppers feeding them, the summary.
6. **Schematics and parts** (`src/sim/schematics.ts`, new): on an enemy's death a separate seeded roll (1%, champions 5%) adds `ANY_SCHEMATIC`; `scatterItems` turns each `ANY_SCHEMATIC` into one schematic picked evenly from those not revealed, carried, on the ground, or in the stash, whose regions include the room's region, or nothing when none is eligible; records `schematicDrops { itemId, x, y }`. Champions roll the part at their own chance, once (032's once-per-death rare roll). `bank()` reveals each carried schematic's node (`schematicReveals { itemId, node }`). A KO before banking loses it (011) and the node stays hidden.
7. **Render**:
   - `ResearchView` (in `RoomViews`): diagrams as faint cyan linework pulsing over the caps, on the pipe, on the wall panels and the wing door; dimmed when `requires` are unmet; restored wall panels in brass and stone; the restore effect (linework fills solid cyan, then the part solidifies) on `restores`, the cap lifting as 024; a reveal shimmer on `schematicReveals`.
   - `RestorePanel` (in `SiteMenus`): E within reach of a diagram opens it: name, one-line effect, cost icons with held/needed counts (missing in rust-light, 026), and a Restore row, disabled without the cost; with `requires` unmet it names the node that comes first. Clicking Restore or E again sends `restore`.
   - `ResearchList` (in `HudView`): J toggles it, Esc closes it; grouped Intake, Walls, Sealed wing; each row its name or "Lost schematic", its state (restored, ready, revealed, hidden), cost icons and counts for revealed nodes, and where its diagram is. Read-only, never pauses, takes no clicks; it and the inventory take turns.
   - `SchematicView` (in `RoomViews`): a ley-light pillar over each schematic on the ground until it's picked up, sparks and a chime as it lands, a minimap ping while it lies, and the shared banner (extracted from 032's discovery banner) reading "Unknown schematic" on pickup and naming it on reveal.
   - Unknown schematics show as "Unknown schematic" with one shared icon on the ground, in the pickup feed and the inventory panel, until banked; then "Schematic: Splitter" etc. The sorter's filter list leaves schematics out (their names would give them away).
   - Splitter and merger sprites (flat, like the sorter), their build-mode arrows, the riding item drawn as on a sorter.
   - Art (`src/data/art/research.ts`): diagram linework per anchor, the wall panel restored, the sealed wing door, splitter and merger, the schematic icons (unknown and known), the ancient gear, the aqueduct valve, the Bulwark core, the light pillar. Sounds: `restore`, `schematic-chime`, `reveal`.
   - `ui()` gains `research` (diagrams drawn with their alpha, the restore panel's rows, the list panel's rows, pillars, the banner) behind `RoomViews`, `SiteMenus.ui` and `HudView.panels`.
8. **Hook**: `getState().research` = each node's state and whether it's ready, the entrance cap, the machine-speed multiplier, schematics carried and banked; events `restores`, `schematicDrops`, `schematicReveals`.

## Tests (written first)
- **Vitest** `tests/data/research.test.ts`: the data rules above.
- **Vitest** `tests/sim/research.test.ts`: start states; restore spends the exact cost; refusals (no cost, unmet requires, outside the foundry, before attuning, out of reach, sealed wing); restored nodes survive a KO; determinism.
- **Vitest** `tests/sim/researchEntrances.test.ts` (from 024's "opening the side entrances"): the warden core opens exactly the chosen cap; the other cap then costs a Bulwark core; a second warden core does nothing for it; the intake opens with one entrance capped and two open; reservoir 30 → 45 → 60 with held rounds kept, and the full line uses the current cap; machine speed scales `craftTicks` rounded up.
- **Vitest** `tests/sim/splitMerge.test.ts`: splitter alternates, falls back, waits; merger takes back, left, right in turn, a blocked front stalls it; hidden until restored.
- **Vitest** `tests/sim/schematics.test.ts`: drop chances by source over many seeds; no duplicates (revealed, carried, on the ground); the region filter; the cache table; an unknown schematic reveals nothing until banked, then reveals its node; a KO before banking loses it with the node hidden; restoring spends the schematic.
- Rewritten: `tests/sim/entrances.test.ts` (opening), `tests/sim/tutorial.test.ts` (the goal), `tests/data/data.test.ts` (`ENTRANCE_CAPS`), tests reading `ENTRANCE_CAP`, seeded expectations moved by the new rolls.
- **Playwright** `tests/e2e/research.spec.ts`: with `?playtest`, E at the west cap opens the panel, E restores `entrance-2`, two entrances fire a two-round volley; then `entrance-3` with a Bulwark core; `reservoir-1` and an entrance filled to 45; the splitter restored and placed; the list panel opened with J and closed with Esc and J. `tests/e2e/researchShots.spec.ts` with `REVIEW_SHOTS=1` into docs/review/033/: the intake with diagrams on both caps; one cap restored, one capped; a wall-panel diagram before and after; the restore panel with a missing input; the list panel; a schematic's light pillar in the field; the sealed wing door; the new art on the contact sheet.
- Rewritten: `spread.spec.ts`, `foundryFlow.spec.ts`, `hud.spec.ts` and the tutorial run restore entrances instead of opening both sides.

## Not dictated by the spec
- Wall tiles: machine speed on the north wall west of the intake at (6, 0); splitter and merger on the north wall east of it at (17, 0) and (19, 0); the sealed wing's door in the north wall's notch at (9, 1), drawn two tiles wide over (9–10, 1). The north wall's face is where the room's panels already show; the west wall holds the ports, the east the door, stash and waystone.
- Both caps show `entrance-2` until one is restored; then the other shows `entrance-3`. The pipe shows `reservoir-1`, then `reservoir-2` once revealed.
- The sealed wing is a node with a `wing` effect that never restores here; E at its door shows its name and "Sealed. The Bulwark's first kill unseals it." with no Restore row.
- Restoring needs the tube attuned, so before attuning no diagram takes E (they still show).
- E prefers a hopper or sorter in reach (their menus), then a diagram, then the site fixtures.
- Schematics that can drop outside Region 2 list Regions 1 and 2.
- The Warden (a boss) rolls the normal 1% schematic chance.
- The list panel and the inventory take turns (both are big centred panels).
- Schematics are left out of the sorter's filter list.
- `bulwark-core` added here (034 hasn't shipped) as a Cores item with no drop yet.
