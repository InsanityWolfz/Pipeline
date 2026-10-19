# 028: Foundry flow: a port per resource, fed hoppers, entrances at their own rate, and goals after the shrine
status: approved

Approved by Shaun in chat, 2026-10-19 ("Approve all 028–037"); open questions settled the same day.

## Goal
Automation stops stalling and progression stops at the shrine no longer:
- Each raw resource comes into the foundry through its own fixed supply port, which shows how many pylons feed it and its rate.
- Conduits can feed hoppers.
- While fire is held, each fed intake entrance fires at its own ammo's rate, so a mixed volley no longer waits on its slowest ammo.
- Once the tube is linked, the volley fires first, then carried rounds, then the punch.
- After the shrine, the objective line keeps pointing at the next thing to do.

## Design references
- docs/design.md:
  - "The Foundry" ("The layout is the ability": one press fires a round from every fed entrance; "No ratio math. Supply lines deliver a fixed amount per minute.")
  - "World, regions, ley lines, bosses" ("Claiming": a claimed site becomes a supply line; "Regional pull")
  - "Combat" ("Reservoir"; "Empty tube": the punch)
- docs/prototype.md: "Foundry pieces" ("Supply line from the claimed site at a fixed rate")
- docs/specs/009-claiming.md: the supply port, which this replaces
- docs/specs/018-believable-resources.md: the claimed pylon visibly harvesting its zone and sending motes home
- docs/specs/024-intake-spread.md: entrances, the volley and its cooldown, the fire order, all changed here
- docs/specs/027-foundry-tutorial.md: the objective checks this extends
- docs/brainstorm/2026-10-19-content.md, playtest findings:
  - "The claimed shrine's supply port feeds nothing without a sorter chain the tutorial never teaches. Hoppers can't be fed by conduits."
  - "A mixed volley fires at the slowest ammo's rate."
  - "Progression stops at the shrine. The objective list goes blank."
- Interview answers (Shaun, 2026-10-19, docs/brainstorm/2026-10-19-interview.md):
  - R1, fire order: "once the tube is linked, the volley fires first. Carried rounds are the backup, then the punch. (This changes 024.)"
  - R1, build order: first is "foundry flow fixes and a goal after the shrine".
  - R2, mixed volleys: "each entrance fires at its own rate while fire is held."
  - R2, supply: "instead of a second pylon claim being another portal that needs sorted you can just increase the throughput of the resource coming in and just have a number of how many pylons are supplying that line."
  - R4, supply ports: "one fixed port per resource on the foundry walls: wood, stone, fiber and ley crystal, with more later. Each shows '×N pylons' and its rate. Every claimed pylon that supplies that resource adds to its rate."
  - R4, goals after the shrine: "a guided goal chain for each milestone, as data."
  - R5, pylon supply: "each pylon sends the resources of its area."

## Acceptance criteria

**Supply ports (sim, data)**
- [ ] The single mixed supply port (`supply-port`, `PORT_CYCLE`) is removed. In its place are four fixed ports on the foundry's west wall, one per raw, each facing into the room:

  | Port | Raw | Tile |
  | --- | --- | --- |
  | Wood port | `wood` | (1, 4) |
  | Stone port | `stone` | (1, 6) |
  | Fiber port | `fiber` | (1, 8) |
  | Ley crystal port | `ley-crystal` | (1, 10) |

  The identification bench stays at (1, 12).
- [ ] Each claimable site lists the raws its pylon sends, as data (`SITE_SUPPLY`). A site sends the raws of its own area: every raw it lists has a gathering node of that raw inside the site's safe zone (a data test checks this).
- [ ] The shrine keeps working under the new model. It lists all four raws, which match its zone's nodes: ley veins, a tree, reeds and rubble. Claiming it supplies all four ports at ×1.
- [ ] A port's pylon count is the number of claimed sites whose `SITE_SUPPLY` includes its raw. A port with a count of 0 isn't there (no dark "×0" ports); it appears, clearing its tile as fixtures do today, when its first supplying site is claimed.
- [ ] Each port pushes one of its raw every `round(SUPPLY_TICKS / N)` ticks, where N is its pylon count. With `SUPPLY_TICKS` 240 that is 15 a minute per pylon for each raw, so the shrine alone sends 60 a minute in all (today's single port sends 30). More pylons means a higher rate, with no other change. A refused raw waits in the port, as today.
- [ ] The waystone is unchanged: the shrine's claim still adds it.

**Hoppers fed by lines (sim, data)**
- [ ] A hopper takes items from any side but its front: from a conduit, a sorter's exit, a machine's output or a supply port. It takes an item while it is empty or already holds that item, up to `HOPPER_FLOW_CAP` (99, the crate's cap). Otherwise it refuses, and the line behind it backs up.
- [ ] Hand-filling and emptying a hopper are unchanged (022). Hand-filling stays uncapped; the cap applies only to items arriving by line. Hoppers still hand items only to conduits, sorters and machines (never crates or the intake).

**Each entrance at its own rate (sim, data)**
- [ ] Each entrance gains its own `cooldown`, counting down every tick.
- [ ] While fire is held and the volley is firing, every open entrance that holds a round and whose cooldown is 0 fires one round on that tick. It then sets its cooldown to that ammo's `fireTicks`. An entrance on cooldown doesn't hold the others back.
- [ ] Rounds that fire on the same tick are grouped by ammo and shaped as in 024: aimed rounds fan `SPREAD_STEP` apart, and lobbed rounds land `LOB_SPACING` apart.
  - Example: two arrow entrances and one bomb entrance, held for 120 ticks from rest, fire a two-arrow fan on ticks 0, 15, 30 … 105 (8 fans) and a bomb on ticks 0, 40 and 80 (3 bombs).
- [ ] "A volley's cooldown is the longest `fireTicks` among the ammo it fired" (024) is removed.
- [ ] `tube.fireCooldown` now paces carried rounds only. Each entrance shot also raises it to at least that ammo's `fireTicks`, so when the entrances run dry the first carried round never comes sooner than the last entrance's own pace.

**Fire order (sim)**
- [ ] With the tube in hand, a fire press does the first of these that it can:
  1. **The volley:** some open entrance holds a round (entrances only fill once the tube is linked).
  2. **A carried round** of the selected ammo, fired alone.
  3. **The punch** (023).
- [ ] `nextPress` and `hudActive` follow this order, so the HUD's tube slot (025) shows the volley whenever an entrance holds a round, even while rounds of the selected ammo are carried.
- [ ] Without the tube, every press is a punch, as today.

**Goals after the shrine (data, sim)**
- [ ] The objectives become one ordered chain in data. The prototype's goals run unchanged, ending with "Head back out — the foundry keeps running". Milestone 1's goals follow, each tagged `milestone: 'm1'`. Later specs append their own goals to it.
- [ ] This spec adds these Milestone 1 goals, each achievable with this spec and what's already built:
  1. "Run a supply port into your line": check `portDelivered`, which holds once a piece has taken an item from any port. It shows a marker over the ports and pulses the conduit cell.
  2. "Put a second kind of ammo in another entrance": check `mixedVolley`, which holds when the volley holds at least two different ammo.
  3. "Feed all three entrances": the existing `volley { min: 3 }`. Once 033 lands, the third entrance needs the Bulwark core, so 033 moves this goal to the end of 034's Region 2 steps.
  
  Built with this wording (Shaun, 2026-10-19); he may edit the text later, as data.
- [ ] The `awayRunning` clock runs once every goal before it is done, not every goal but the last, so goals can follow it. `prototypeComplete` is set when the prototype's goals are done, as before; the Milestone 1 goals don't affect it.
- [ ] **The line never goes blank after the shrine.** Once every goal in the chain is done, it shows `FRONTIER_GOAL`, "Explore beyond the shrine": a standing line from data with no check. It doesn't name the next milestone. Each later spec's goals slot in before it. A sim test walks every combination of done goals after the shrine claim and checks the line is never empty.

**Render**
- [ ] Each port is drawn in vector in the 020 style, with its raw's icon on its face. Under it is a small plate reading "×1 pylon · 15/min", or "×2 pylons · 30/min" and so on. Hovering it shows its name, the plate's text, and "waiting" while a refused raw is held.
- [ ] Shaun approves the new port art by eye.
- [ ] The claimed pylon's harvest (018) sends each port's raw as its own mote: the tendril goes to a node of that raw in the zone, and the mote runs home and sinks in. This replaces the single cycling port.
- [ ] Each entrance's pipe pulse (019) plays when that entrance fires, so a mixed volley visibly fires out of step.
- [ ] Goal 1 shows an arrow marker over the ports (a new `MarkerTarget`, `'ports'`).

**Docs (on approval)**
- [ ] docs/design.md:
  - "The Foundry": while fire is held, each fed entrance fires at its own ammo's rate, replacing "one press fires a round from every fed entrance".
  - "Combat", reservoir: once linked, the volley fires first, then carried rounds, then the punch.
  - The supply bullet ("Supply lines deliver a fixed amount per minute"): one fixed port per raw, each pylon supplying a raw adds to its port's rate, and each pylon sends the raws of its area.
- [ ] docs/prototype.md, "Foundry pieces": "Supply line from the claimed site at a fixed rate" becomes "a supply port per raw, fed by claimed pylons".

**Hook**
- [ ] `getState()` gains `ports`: one entry per present port, with raw, tile, pylon count, per-minute rate, and whether a raw is waiting.
- [ ] Each `intake.entrances` entry gains `cooldown`.
- [ ] `tube.next` reports `'volley'` before `'carried'` per the new order.
- [ ] `objective` keeps reporting the index and text. While `FRONTIER_GOAL` shows, the index is null and the text is the frontier line.

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass.
- [ ] 024's volley-cooldown and fire-order tests are rewritten for the new rules. No test is deleted without a replacement.

## Data changes
- `src/data/claims.ts`:
  - `PORT_CYCLE`, `PORT_TICKS` and the `supply-port` fixture removed.
  - Four port fixtures, each with a `raw`, `claim` dropped in favour of "present while its pylon count is above 0".
  - `SITE_SUPPLY: { shrine: ['wood', 'stone', 'fiber', 'ley-crystal'] }`.
  - `SUPPLY_TICKS = 240`: one raw every 4 s, so 15 a minute per pylon (starting value).
- `src/data/foundry.ts`: `HOPPER_FLOW_CAP = 99` (starting value).
- `src/data/objectives.ts`:
  - a `milestone` tag on each goal
  - the three goals above
  - the checks `portDelivered` and `mixedVolley`
  - `MarkerTarget` gains `'ports'`
  - `FRONTIER_GOAL`
- Art data: the four ports and their plates, replacing the supply port's art.

## Out of scope
- **Changes to 024's entrance unlocks** (R1: each boss core opens one more entrance, the Warden opens the 2nd). They belong to 033 (research). Until it lands, the "Open the intake's side entrances" goal stays as it is.
- **Other spec work:**
  - more claimable sites and resource-site pylons (032, champions and landmarks), so counts above ×1 appear only in tests for now
  - ports for raws beyond the four (husk resin, ley-iron, rime shard)
  - splitters and mergers (033, research)
  - reservoir size (033, research)
  - the HUD pass (031)
- **Future Milestone 1 goals**, each added by its own spec:
  - build a stage machine, and find the Frozen Grotto for rime shards (029)
  - heal at a Ley Spring, if Shaun wants it as a goal (030)
  - claim a second pylon (032)
  - breach Region 2's barrier, claim its pylon, beat the Bulwark and restore the third entrance (034)

## Test plan
- **Vitest:**
  - Ports:
    - The shrine claim adds four ports at ×1, each pushing only its raw, every 240 ticks.
    - `portRate` gives N = 1, 2 and 3 → 240, 120 and 80 ticks, using a test site table with a second supplying site.
    - A refused raw waits in its port.
    - The `SITE_SUPPLY` data test: every listed raw has a node in its site's safe zone.
  - Hoppers:
    - A conduit, a machine and a port can each feed a hopper.
    - A hopper refuses a different item and refuses past the cap.
    - It never takes from its front.
    - Hand-fill is unchanged.
  - Entrance rates:
    - The 120-tick example above gives 8 two-arrow fans and 3 bombs.
    - An entrance on cooldown doesn't block a ready one.
    - Two arrow entrances that start together stay a fan.
  - Fire order:
    - With carried arrows and a fed entrance, the press fires the volley.
    - With empty entrances, it fires the carried round.
    - With nothing to fire, it punches.
    - `hudActive` matches `nextPress` in each case.
    - The first carried shot after the entrances run dry waits out the last entrance ammo's `fireTicks`.
  - Goals:
    - `portDelivered` and `mixedVolley` complete from scripted state.
    - `awayRunning` counts only once the goals before it are done.
    - `prototypeComplete` ignores Milestone 1 goals.
    - The "never blank" walk passes.
- **Playwright:** with the `?playtest` start, claim the shrine (or set it claimed), see four ports in `getState().ports`, conduit the wood port into a hopper feeding a cutter, and watch shafts appear. Feed arrows and bombs into two entrances, hold fire for 120 frames, and count the shots.
- **Screenshots:**
  - the west wall with four ports and their "×1 pylon · 15/min" plates
  - a conduit from the stone port into a hopper
  - the objective line on goal 1 with the port marker

## Open questions
None. Settled by Shaun, 2026-10-19 (see docs/brainstorm/2026-10-19-open-questions.md).
