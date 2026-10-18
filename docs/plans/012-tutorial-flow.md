# Plan: 012 Tutorial flow (docs/specs/012-tutorial-flow.md, approved)

Written by the overnight run; it stays inside the spec. Branch `claude/012-tutorial-flow`, stacked on 011.

## Starts
`StartDef` gains `room`, `hasTube`, `attuned` and `gatesOpen`. There are three starts:
- **`TUTORIAL_START`** (the real game, with no URL flag): the clearing, carrying nothing, no tube, gates closed.
- **`PLAYTEST_START`** (`?playtest`): the ruin hall, boosted inventory, the tube, attuned, and every gate open.
- **`DEFAULT_START`** (the sim's default, and `?start=hall`): the old start. It's the ruin hall with 30 arrows and the tube, gates open, not attuned. Unit tests and the existing e2e tests keep using it.
  - This is how the spec's "existing e2e tests use ?playtest, or a hook option" is met. The e2e `boot` helper adds `?start=hall` unless it's given a query.

## Sim
- **The tube** (`tutorial.ts`):
  - `state.hasTube`. Without it, fire and ammo select do nothing.
  - The clearing's room data has `tubeStone: { tx, ty }`. E within reach picks the tube up (`events.tubeTaken`).
  - The stone is solid.
  - `hasTube` survives a KO.
- **Gates:**
  - Doorways get an optional `gate: 'foundry' | 'shrine'`.
  - `state.gates` holds `{ foundry, shrine }`, true once open, kept through a KO.
  - A closed gate's door tile is solid to the player (a collision rect), and the door does nothing.
  - **Foundry gate:** opens the first tick no enemy remains in the hall (the hall's whole pack dead at once).
  - **Shrine gate:** opens when the reservoir first reaches its cap (`state.firstLineFull`).
  - Opening records `events.gates`.
- **Recipes:** `RecipeDef.requires?: 'attuned'` on casing, fuse, ley-shard, bomb and ley-bolt.
  - `knownRecipes(state)` lists what can be made.
  - `craft` refuses unknown recipes (a `craftFails` event).
  - The menu lists only known ones.
- **Objectives** (`src/data/objectives.ts`):
  - The list is declarative: `{ text, check }`. `check` is a small union evaluated in `src/sim/objectives.ts`:
    - `hasTube`
    - `gathered` (wood, stone and fiber each ever harvested, tracked in `state.gathered`)
    - `crafted` (item ids in the crafted set)
    - `gate` (foundry)
    - `inRoom` (foundry)
    - `socketPlaced`
    - `lineFull`
    - `identified` (any identified armor)
    - `claimed` (shrine)
    - `streams` (at least 2)
    - `awayRunning` (the last objective, below)
  - `state.objectives: boolean[]`. Each one completes once and stays complete, in any order.
  - The current objective is the first one not done.
  - The last objective completes after 600 ticks outside the foundry with a tube socket placed. That sets `prototypeComplete` and records `events.objectives`.

## Render
- **`ObjectiveView`:** the current objective's text at the top centre in the HUD font, with a cyan tick that fades in when one completes.
- **`PromptView`:** a floating key cap ("E", "C" or "B") over the thing the current objective uses, when it's within 64 px. For craft and build objectives, it floats over the player.
- **Clearing:**
  - floor theme `clearing`, the tube stone sprite, trees, reeds and rubble nodes
  - a door into the hall's bottom wall
- **Gates:** the rubble door sprite while the foundry gate is closed, a ley barrier while the shrine gate is closed, and a crumble or dissolve effect on opening.
- **HUD:** the hotbar slot and ammo strip are hidden until the player has the tube.

## Tests first
- **`tests/sim/tutorial.test.ts`:**
  - **The tube:** no fire without it; it's picked up at the stone; it's kept through a KO.
  - **Gates:**
    - The foundry door is solid and inert until the hall is clear, then opens and stays open through a KO.
    - The shrine gate opens on the first full reservoir.
  - **Recipes:** before attuning, only the arrow chain is listed; craft refuses the rest. After attuning, all are listed.
  - **Objectives:** they complete in order; any order also works and the line shows the first unfinished one; the last one completes after 600 ticks away and sets `prototypeComplete`.
  - **Starts:** `?playtest` skips the gates; the tutorial start is empty, in the clearing, without the tube.
  - Determinism.
- **Data test:** objectives exist, recipe requirements point at real recipes, the clearing's tube stone is on floor, and gated doors exist.
- **`tests/e2e/tutorial.spec.ts`:** a scripted run of the whole prototype from a fresh tutorial start, driven by the hook. Each beat advances its objective.
