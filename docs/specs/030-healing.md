# 030: Healing: safe spots only
status: approved

Approved by Shaun in chat, 2026-10-19 ("Approve all 028–037"); open questions settled the same day.

## Goal
The player heals only in safe spots:
- fast inside a claimed pylon's safe zone
- fast while standing in a Ley Spring's pool out in the field
- fully at the foundry

Nothing heals in the open field. Field regen exists as a stat that is 0 until gear and talents raise it. The sim reports when and where the player is healing, so the HUD pass (031) can glow the HP bar.

## Design references
- docs/design.md:
  - "Combat" ("Simple stats: … max health, health regen, armor"; "Running away is always allowed")
  - "Death and tension" ("The tension lives in the stretch between your last pylon and wherever you're pushing.")
  - "World, regions, ley lines, bosses" ("Claiming": a claimed pylon stops monsters roaming there)
- docs/specs/004-enemies.md: player health ("no regen yet")
- docs/specs/011-death.md: waking in the foundry at full health
- docs/specs/017-overworld.md: claimed pylons' safe zones (`SAFE_RADIUS`, `inSafeZone`), the fixed overworld and its rings
- docs/brainstorm/2026-10-19-content.md:
  - Playtest finding: "Nothing heals. HP only comes back by dying. Finished the shrine on 10/100 HP and was still on 10 after going home."
  - Section 2: "Free regen would make the trip home with a schematic safe."
- Interview answers (Shaun, 2026-10-19, docs/brainstorm/2026-10-19-interview.md):
  - R1, healing: "safe spots only. There is no regen in the open field. You heal fast in a claimed pylon's safe zone and at Ley Springs, and fully at the foundry. Field regen comes only from gear and talents."
  - R1, build order: healing is 3rd.
  - R5, HP bar: "a cyan glow while healing" (built in 031, fed by this spec).
  - R5, Ley Springs: "stand in the pool to heal fast. No uses and no timers."
  - R6, landmarks: Ley Springs are among the first landmarks; "Map: fixed and hand-tuned, with one seed, the same world every game."
  - R9, affixes: "max HP and armor, field regen, move speed and roll" (the regen stat this spec leaves at 0).

## Acceptance criteria

**Where you heal (sim, data)**
- [ ] Each tick, the player's healing rate is the highest of the rates that apply:

  | Source | Applies while | Rate (starting value) |
  | --- | --- | --- |
  | Foundry | in the foundry room | 50 HP/s (full from 0 in 2 s) |
  | Pylon | feet inside a claimed pylon's safe zone (`inSafeZone`) | 10 HP/s |
  | Spring | feet inside a Ley Spring's pool | 10 HP/s |
  | Field regen | anywhere | `fieldRegen`, 0 HP/s |

  Rates don't stack. The highest one applies, and field regen from gear (036) and talents (037) is one of these rates, so it never adds to pylon, spring or foundry healing.
  - The foundry is a fast fill, not an instant reset, so the heal reads on screen.
- [ ] `fieldRegen` is a stat read through one function, so later gear affixes and talents can add to it. Its base is `HEALING.fieldRegen = 0`, so the open field heals nothing.
- [ ] Healing never takes health above max health (`MAX_HEALTH` today; 036 adds gear to it). Nothing heals while dying (011).
- [ ] Health stays a whole number. Fractional healing builds up in the player state and is applied a point at a time, so 10 HP/s gives exactly 10 HP over 60 ticks.
- [ ] Healing carries on through hits. It doesn't pause after damage (`HEALING.afterHitDelay = 0`, a starting value).
- [ ] Waking from a KO still restores full health (011), unchanged.

**The healing flag (sim, hook)**
- [ ] The player state gains `healing`: the source that raised health this tick (`'foundry' | 'pylon' | 'spring' | 'regen'`), or `null`. It is `null` at full health, while dying, and whenever no health was gained.
- [ ] `getState().player.healing` reports it. This is the flag 031's HP bar reads for its cyan glow.
- [ ] A `heals` event records when healing starts and stops (source, start or stop), so render and sound don't have to diff state.

**Ley Springs (data, sim)**
- [ ] Ley Springs are data in `src/data/overworld.ts`, each with a centre tile and a pool radius. The pool is walkable: feet inside the circle count as in the spring. Shots and enemies pass over it as over grass.
- [ ] Springs have no uses, charges or timers. They aren't safe zones: enemies can follow the player in.
- [ ] Three springs on the fixed map (034 may shift every tile by +40 for Region 2):

  | Spring | Centre tile | Ring | Why there |
  | --- | --- | --- | --- |
  | West | (10, 31) | 2 | just south of the west path's end (12, 27), which ends in nothing today. That end becomes a fork: north to 029's Frozen Grotto and west along 034's road to the Region 2 barrier, so the pool sits beside the road, not on it |
  | South-east | (66, 38) | 2 | the end of the south-east path, which also ends in nothing |
  | North | (26, 8) | 1 | north-west of the ruin field, between home and the Grotto; it needs its own clearing |

  - The north spring is built, and cut if the playtest finds healing near home too easy.
  - Pool radius: 1.5 tiles (48 px), a starting value, enough for the player and a little dodging room.
  - Each spring sits inside a clearing (no generated trees, rocks or water on or around its pool).
- [ ] Every spring's pool is on open ground and reachable on foot from the wake tile (a data test on the generated map).

**Render**
- [ ] Each Ley Spring is drawn in vector in the 020 style and fits the theme: a low, rune-carved stone rim round a pool of glowing ley-cyan water, with slow ripples and a soft light. Shaun approves it by eye.
- [ ] While `healing` is set, small cyan motes rise from the player. Each source shows it:
  - **Spring:** the pool's glow brightens under the player.
  - **Pylon zone:** a faint cyan thread runs from the pylon to the player.
  - **Foundry:** a short warm-to-cyan shimmer.
- [ ] A soft generated chime plays when healing starts, and nothing while it continues.
- [ ] The current HP bar is left as it is. Its cyan glow, number and low-HP pulse come in 031.

**Docs (on approval)**
- [ ] docs/design.md:
  - "Combat", simple stats: "health regen" is field regen, which comes only from gear and talents.
  - Add a line: you heal fast in a claimed pylon's safe zone and at Ley Springs, and fully at the foundry. Nothing heals in the open field.
  - "Death and tension": the stretch from the last pylon is also the stretch without healing.

**Hook**
- [ ] `getState()`:
  - `player.healing`
  - `springs`: each spring's tile, its pool radius in px, and whether the player is in it
  - `heals` events

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass.

## Data changes
- `src/data/player.ts`: a `HEALING` block (all starting values):

  | Value | Start |
  | --- | --- |
  | foundry | 50 HP/s |
  | pylon | 10 HP/s |
  | spring | 10 HP/s |
  | fieldRegen | 0 HP/s |
  | afterHitDelay | 0 ticks |

  The "no regen yet" note on `MAX_HEALTH` is updated.
- `src/data/overworld.ts`: `springs` (centre tiles and pool radius), and clearings round each.
- Art data: the Ley Spring, the healing motes. Sound data: `heal-start`.

## Out of scope
- **The HUD:** the HP bar's cyan glow, number, armor value, low-HP pulse and lingering damage chunk (031).
- **Gear affixes and talents** that raise `fieldRegen` (036 equipment, 037 talents).
- **Springs on the minimap.** Springs hidden until found, discovery XP, and springs placed in Region 2 come with 032 and 034.
- **Potions, food or any carried healing.** Healing stays tied to places.
- **Enemy healing** of any kind.
- **A "Heal at a Ley Spring" goal** in the Milestone 1 chain. It wasn't in Shaun's example chain (R4); it can be added if he wants one.

## Test plan
- **Vitest:**
  - In the open field, health doesn't change over 600 ticks.
  - In the shrine's safe zone once claimed, 30 HP comes back in 180 ticks, exactly.
  - At a spring, the same, in the pool. One tile outside it, nothing.
  - In the foundry, 10 HP → 100 within 108 ticks.
  - The highest rate applies when sources overlap: a spring inside a safe zone gives 10 HP/s, not 20.
  - Healing stops at `MAX_HEALTH` and never runs while dying.
  - `healing` is null at full health and names the source while gaining.
  - `heals` events fire on start and stop.
  - Raising `fieldRegen` in a test heals in the open field and reports `'regen'`.
  - The springs data test: each pool is on open ground and reachable from the wake tile.
- **Playwright:** walk a damaged player into the west spring with `step()`, check `player.healing === 'spring'` and that health rises, then step out and check it stops.
- **Screenshots:**
  - each spring
  - the player healing in a spring, motes visible
  - healing in the shrine's safe zone, with the thread to the pylon

## Open questions
None. Settled by Shaun, 2026-10-19 (see docs/brainstorm/2026-10-19-open-questions.md).

## Raised after the build (for Shaun at playtest)
- **Two readings of the spec to confirm:**
  - `healing` stays set on every tick a source is building toward the next HP, not only on the 1-in-6 ticks a whole point lands, so it doesn't flicker.
  - A tie between equal rates reports the table order, so a spring inside a pylon zone reads "pylon".
- **The north spring:** the spec says to cut it if healing near home is too easy. Its clearing is a square cut out of a grove, which may look tight (docs/review/030/03).
- **Spring art and the heal motes** wait on Shaun's approval by eye (docs/review/030).
