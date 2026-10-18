# 023: Melee when the tube is empty
status: approved

Approved by Shaun in chat, 2026-10-18 ("approve 21-27").

## Goal
With no tube yet, or nothing to fire, the fire button throws a quick punch toward the cursor. The punch does a little damage and knocks back any enemy that isn't a boss. The player is never left helpless.

## Design references
- docs/design.md:
  - "Combat" (deliberate and hands-on, telegraphed attacks)
  - "Open questions" ("Whether melee exists"). This spec answers it.
- docs/specs/003-tube-firing.md: fire input and the dry fire this replaces
- docs/specs/004-enemies.md: hit knockback (`src/sim/knockback.ts`)
- Shaun's playtest notes, 2026-10-18: "when you have no ammo or you haven't picked the tube up yet does a quick melee attack in front of the player that does a small amount of damage and knocks the enemy back some if they are not a boss"
- Interview answers (Shaun, 2026-10-18):
  - the punch aims toward the cursor
  - design.md may be updated once this spec is approved

## Acceptance criteria

**When melee happens (sim)**
- [ ] A fire press makes a melee attack when either:
  - the player has no tube, or
  - the next shot has nothing to fire: no carried round of the selected ammo and no reservoir round (see 024).
- [ ] Melee replaces dry fire. `DRY_FIRE_TICKS`, the dry-fire event and its sound are removed.
- [ ] Melee follows the tube's rules for being blocked. It does nothing while rolling, in the foundry, on a menu click or in build mode.
- [ ] Holding fire repeats the punch at `MELEE.cooldownTicks`.

**The punch (sim, data)**
- [ ] The punch hits every enemy whose hit box overlaps an arc in front of the player:
  - centred on the aim direction
  - `MELEE.reach` px from the player's centre
  - `MELEE.arcDegrees` wide
  
  It resolves on the frame it starts. It does not pass through walls: an enemy across a solid tile is not hit.
- [ ] Each enemy hit takes `MELEE.damage` physical damage, through the normal damage path.
- [ ] Each enemy hit that is not a boss is knocked straight away from the player, `MELEE.knockback` px over `MELEE.knockTicks`, using `startKnock`.
- [ ] Enemy data gains `boss: boolean`. The Pylon Warden is `boss: true` and takes the damage but no knockback.
- [ ] A punch records a melee event with its position, its angle and the ids it hit.
- [ ] Starting values, all tuning in data:

  | Value | Start |
  | --- | --- |
  | damage | 4 (an arrow does 10) |
  | reach | 28 px |
  | arc | 100° |
  | cooldown | 24 ticks |
  | knockback | 20 px over 8 ticks |

**Render**
- [ ] The player rig plays a short jab toward the aim, and a pale swoosh arc shows the area. With the tube, it's a tube-butt jab; without it, a fist.
- [ ] A hit plays the normal hit flash and a light thud sound. A miss plays a whiff sound. Both sounds are generated like the other sounds.

**Docs**
- [ ] Once approved, docs/design.md "Combat" gains one line: an empty tube falls back to a weak, knockback punch. The melee open question is closed.

**Hook**
- [ ] `getState()` reports the melee cooldown. Events include melee hits.

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass.

## Data changes
- `src/data/combat.ts` (or `tube.ts`): the `MELEE` tuning block.
- `src/data/enemies.ts`: a `boss` flag on every enemy; `pylon-warden` has `boss: true`.
- `src/data/tube.ts`: `DRY_FIRE_TICKS` removed.
- Sound data: `melee-hit` and `melee-whiff`.

## Out of scope
- Melee weapons, melee skill-tree nodes and melee while ammo is available.
- Punching gathering nodes. Harvesting stays on E.
- The fist HUD icon, which is in 025.

## Test plan
- **Vitest:**
  - A punch with no tube hits a Husk in the arc and misses one behind the player.
  - It misses one beyond reach, and one across a wall.
  - Knockback applies to a Husk but not to the Warden.
  - The cooldown repeats while fire is held.
  - No melee in the foundry or while rolling.
  - The tube with an empty reservoir and no carried rounds gives melee; a carried round gives a shot.
- **Playwright:** punch a Husk before taking the tube and check that its health drops and its position moves away.
- **Screenshot:** the swoosh mid-punch.

## Open questions
None.
