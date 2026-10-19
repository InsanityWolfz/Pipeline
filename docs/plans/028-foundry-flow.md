# Plan 028: Foundry flow

Spec: docs/specs/028-foundry-flow.md. Written for the unattended run (028–038 as separate commits on `claude/laughing-volta-uac3nf`). It stays inside the spec. docs/design.md already carries the 028 wording, so it isn't touched; docs/prototype.md's "Foundry pieces" line changes as the spec says.

## Shape of the change
1. **Data.**
   - `src/data/claims.ts`: `PORT_TICKS`, `PORT_CYCLE` and the `supply-port` fixture go. `SUPPLY_TICKS = 240` and `SITE_SUPPLY: { shrine: ['wood', 'stone', 'fiber', 'ley-crystal'] }`. Four port fixtures, `wood-port` (1, 4), `stone-port` (1, 6), `fiber-port` (1, 8) and `ley-crystal-port` (1, 10), each facing right with a `raw` and no `claim` (present while its pylon count is above 0). The bench stays at (1, 12); the waystone keeps `claim: 'shrine'`. `portPylons(claims, raw, supply = SITE_SUPPLY)`, `portTicks(n)` = `round(SUPPLY_TICKS / n)` and `portPerMinute(n)` live here too (pure data helpers).
   - `src/data/foundry.ts`: `HOPPER_FLOW_CAP = 99`.
   - `src/data/objectives.ts`: `milestone: 'prototype' | 'm1'` on every goal; the checks `portDelivered` and `mixedVolley`; `MarkerTarget` gains `'ports'`; three m1 goals appended after "Head back out": "Run a supply port into your line" (`portDelivered`, marker `ports`, highlight `conduit`), "Put a second kind of ammo in another entrance" (`mixedVolley`), "Feed all three entrances" (`volley { min: 3 }`); `FRONTIER_GOAL = { text: 'Explore beyond the shrine' }`.
   - `src/data/descriptions.ts`: the port's old description goes (the hover now reads the plate).
   - Art (`src/data/art/fixtures.ts`): the port body redrawn as a stone housing in the wall with a round brass-rimmed face (the raw's icon sits on it) and a spout facing into the room, lit while a raw waits; a `port-plate` sprite (a small brass-edged slate) under it. `FIXTURE_SPRITES.port` keeps its two frames; `PORT_LOOK` (face offset, icon scale, plate offset, text) in `foundryAssets.ts`.
2. **Sim: ports** (`src/sim/claims.ts`, `fixtures.ts`). `FixtureState.next` goes. A claim adds the fixtures it names and every port of a raw the site supplies that isn't there yet, clearing their tiles first. `stepPorts`: each port with no raw waiting counts up to `portTicks(pylons)` and produces its own raw (`events.supplies`); a refused raw waits. A piece taking from a port records `events.portDeliveries`.
3. **Sim: hoppers fed by lines** (`src/sim/flow.ts`). `offer` gains a hopper branch: not from its front; empty or the same item; below `HOPPER_FLOW_CAP`. An empty hopper's push timer starts from 0 so nothing moves two hops in one tick. Hand-filling and the hopper's own pushes are unchanged.
4. **Sim: entrances at their own rate** (`link.ts`, `tube.ts`, `volley.ts`). `EntranceState.cooldown`, counted down at the top of `stepTube` every tick. `nextPress` order: volley (an open entrance holds a round), else carried round, else melee; `hudActive` follows it. Firing a volley ignores `tube.fireCooldown`: every fed entrance whose cooldown is 0 fires one round, sets its cooldown to its ammo's `fireTicks` and raises `tube.fireCooldown` to at least that; same-tick rounds are shaped by `volleyShots` as before. Carried rounds wait on `tube.fireCooldown` as before. `events.entranceFires` names each entrance that fired.
5. **Sim: goals** (`src/sim/objectives.ts`). The `awayRunning` clock runs once every goal before it is done. `prototypeComplete` once every `prototype` goal is done. `portDelivered` reads `events.portDeliveries`; `mixedVolley` two different ammo in `volleyRounds`. `objectiveLine(state)` gives `{ index, text }`, the frontier line (index null) once all are done; the view and the summary read it.
6. **Hook.** `getState().ports`: `{ id, raw, tx, ty, pylons, perMinute, waiting }` per present port; `intake.entrances[].cooldown`; `objective` is always `{ index: number | null, text }`. Test hook `claim(site)` claims a site directly (dev only), for the e2e's "or set it claimed".
7. **Render.**
   - `PortView` (new, owned by `RoomViews`): over each present port's body (drawn by `SiteView`), its raw's icon on the face and the plate with "×N pylon(s) · R/min". `ui().ports` lists what it draws.
   - Hover (`hoverNames.ts`): a port's name, with the plate's text as its description, plus " · waiting" while a raw waits.
   - `SupplyView` already sends a mote per `supplies` event to a node of that raw; its comment is brought up to date (four ports, four motes).
   - `IntakeView`: a pulse up each entrance's own gauge column when that entrance fires (`entranceFires`), beside the fill pulse. `ui().intakeFirePulses` counts them.
   - `PromptView`: the `ports` marker over the middle present port, anywhere in the foundry. `ObjectiveView` shows `objectiveLine`'s text.
   - The port body keeps its `supply-port` frame names, so the contact sheet groups it as before.
8. **Docs.** docs/prototype.md "Foundry pieces": the supply line bullet becomes "a supply port per raw, fed by claimed pylons".

## Tests (written first)
- **Vitest** `tests/sim/ports.test.ts` (replaces the port parts of `claiming.test.ts`): four ports at ×1 on the shrine claim, each pushing only its raw every 240 ticks; `portTicks` 240/120/80 with a test table of a second supplying site; a refused raw waits; no port without a supplying claim; a claim clears the port tiles; `getState().ports`. `tests/data/data.test.ts`: every `SITE_SUPPLY` raw has a node of it in the site's safe zone; ports one per raw on the west wall at the spec's tiles.
- `tests/sim/hopperFeed.test.ts`: a conduit, a machine, a sorter's exit and a port each feed a hopper; it refuses a different item and past the cap; never from its front; hand-fill unchanged (uncapped); hoppers still never feed crates or the intake.
- `tests/sim/entrances.test.ts` volley tests rewritten: the 120-tick example (8 fans, 3 bombs), an entrance on cooldown doesn't block a ready one, two arrow entrances stay a fan, the fire order (volley before carried, carried when empty, melee), `hudActive` matches `nextPress`, the first carried shot after the entrances run dry waits out the last entrance ammo's `fireTicks`; `cooldown` in getState.
- `tests/sim/goals.test.ts`: the chain's milestones and texts, `portDelivered` and `mixedVolley` from scripted state, `awayRunning` waits on the goals before it, `prototypeComplete` ignores m1, the never-blank walk over every combination after the shrine claim, the frontier line in getState.
- Rewritten: `claiming.test.ts`, `corners.test.ts`, `sorter.test.ts` (sorting a port's raw off), `melee.test.ts`, `hud.test.ts`, `tutorial.test.ts` (the last prototype goal), `sim.test.ts` (event lists), `look.test.ts`, `hover.test.ts`, `data.test.ts`.
- **Playwright** `tests/e2e/foundryFlow.spec.ts`: `?playtest`, claim the shrine through the hook, four ports in `getState().ports` at ×1, 15/min; conduit from the wood port into a hopper feeding a cutter, and shafts appear; goal 1 completes. Arrows and bombs into two entrances, hold fire 120 frames, 8 fans and 3 bombs. With `REVIEW_SHOTS=1`, into docs/review/028/: the west wall with the four ports and plates, a conduit from the stone port into a hopper, the objective line on goal 1 with the port marker, and the port art on the contact sheet. `claiming.spec.ts` (four motes, the wood port), `spread.spec.ts`, `tutorial.spec.ts` (ends on the first m1 goal) rewritten where they read the old port or fire order.

## Not dictated by the spec
- Port ids and names: `wood-port` "Wood port", and so on, as the spec's table names them.
- The per-minute figure is `round(60 · TICK_RATE / portTicks(n))`: 15, 30, 45 for 1–3 pylons.
- All four ports start counting at the claim, so their first raws come up together (four motes set off at once).
- The plate's plural: "×1 pylon", "×2 pylons". The hover's description is the plate's text, with " · waiting" while a raw waits.
- The `ports` marker floats over the middle present port (the second of four), as the intake marker floats over its middle open entrance.
- An entrance's fire pulse runs up its own gauge column. It plays only while the foundry is drawn, and the tube is quiet in the foundry, so in play it is rarely seen; noted for Shaun.
- `tube.firing` stays true while fire is held with a volley whose entrances are all on cooldown (as it does between carried shots).

## Risks
- Tests that fed sorter chains from the old mixed port lose their mixed source; they are rewritten against single-raw ports.
- The full tutorial e2e ends on the first m1 goal rather than a blank line.
