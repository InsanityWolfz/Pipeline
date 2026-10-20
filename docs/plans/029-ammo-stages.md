# Plan 029: Ammo roles and stage machines

Spec: docs/specs/029-ammo-stages.md, with Shaun's overrides (docs/brainstorm/2026-10-19-open-questions.md): arrows pierce without limit, homing and star are both shapes, the ammo stays "Ley bolt". Written for the unattended run (028–038 as separate commits on `claude/laughing-volta-uac3nf`). docs/design.md already carries the 029 wording, so it isn't touched; docs/prototype.md's ammo table changes as the spec says.

## Shape of the change
Small vertical commits, tests first in each:

1. **Ammo roles.** `src/data/ammo.ts`: arrow `pierce: true`, ley-bolt `pierce: false`; bomb `burstRadius` 48, no `burn`, `damageType: 'physical'`; `DamageType` gains `cold`. Burn goes: `src/sim/burn.ts`, `burnTicks`/`burnAmmo` on enemies and in the summary, the burn flame sprite, `BURN_FLAME` and its view. Bursts hit as `physical`. Each enemy is still hit once per shot (`hitIds`).
2. **Tags and rounds** (`src/data/tags.ts`, new). `TAGS`: `frost` (element, arrow, "Frost", damage type `cold`), `homing` (shape, ley-bolt, "Homing"), `star` (shape, ley-bolt, "Star"), each with its behaviour's numbers (`COLD`, `HOMING`, `STAR`). A round id is the base then its tags, elements first, joined by `+` (`arrow+frost`). `roundId`, `roundBase`, `roundTags`, `withTag` (null when the base doesn't take it or the slot is taken), and `ROUNDS`: every legal combination, derived. `AMMO` and `ITEMS` add an entry per tagged round from it: the base's numbers, the element's damage type, the name from the prefixes ("Frost arrow", "Homing ley bolt"); `AmmoDef` gains `base` and `tags`. Tagged items' icons are derived frames (`icon-arrow-frost`): the base icon with a small tag badge.
3. **Stage machines** (`src/data/stages.ts`, new). `STAGES`: `frost-rune`, `ley-guide`, `shatter-lens` with name, description, tag, `batch`, `material`, `materialCount`, `craftTicks`. `stageRecipe(stage, round)` is the recipe a stage runs on a round: `{ round: batch, material: n } → withTag(round) × batch`; `STAGE_RECIPES` holds each stage's on its plain base, and `recipeDef` finds those too, so a stage is a machine piece (`recipeId` = its stage id) and the existing unlock rule, hover readout, piece icon and refunds work. `PIECES`/`BUILD_BAR`: the frost rune under Arrows; the ley guide and shatter lens under Ley.
   - Sim (`src/sim/flow.ts`, with the rules in `src/sim/stages.ts`): `MachineState.made` is the item its output holds (a stage's depends on the round it took). A stage takes its material from any side but its front, up to the input cap, and a round of its base with no tag in its slot while its rounds buffer is empty or holds that kind. A craft starts with a full batch and the material buffered, when the batch fits in the output. Statuses, `events.made` and `machineMade` as other machines.
4. **Hand-apply at the bench.** `applyStage(state, stageId)` (`src/sim/stages.ts`): only once the shrine is claimed and with the bench in reach; takes the stage recipe's inputs and gives the tagged rounds through the same `make` a hand craft uses, so the tagged item is `crafted` and the stage unlocks. `canCraft`/`craft` refuse stage ids, so the crafting path can't skip the bench and shrine checks. A `Command.applyStage` carries a bench row's click. `?playtest` derives its crafted set from every recipe including stages, and 99 rime shards from the raw count.
5. **Tagged rounds in the tube.** Entrances already take one exact round kind. `volleyShots` fans and spaces by base ammo. `nextPress`: with a slot selected, a carried tagged round of that base fires before a plain one (in `ROUNDS` order).
6. **Cold** (`src/sim/cold.ts`). `EnemyState`: `chill`, `chillTicks`, `frozen`, `refreeze`. A cold hit adds a stack (up to `stacksToFreeze`) and refreshes `chillTicks`; the hit reaching it freezes for `freezeTicks` (`bossFreezeTicks` for a boss) and clears the stacks; after the thaw, `refreezeTicks` with no stacks. `stepEnemies`: a frozen enemy doesn't think (its wind-up pauses), still takes knockback unless a boss; a chilled one's own move is scaled by `1 − stacks × slowPerStack`. Events `freezes` and `thaws`.
7. **Homing.** `ArrowState` carries its own `speed`, `range`, `pierce`, `split` and `targetId`. A homing round locks at launch on the living enemy in the player's room nearest the cursor within `lockRadius`; each tick it turns toward it by at most `turnDegrees`, flying straight once its target is gone.
8. **Star split.** A star round that hits an enemy bursts at the hit point into `STAR.shards` shards (`STAR.projectile`, a projectile in data, ammo id `star-shard`), the first along its flight, each with the struck enemy already in its `hitIds`, no pierce, no split. Shards join `state.arrows` after the tick's flight. `events.starBursts`.
9. **Frozen Grotto** (`src/data/grotto.ts`, read by `overworld.ts`): the clearing (9, 5)–(19, 13), the path (12, 27) → (14, 14), three `rime-cluster` nodes at (12, 7), (16, 8), (14, 11) (appended to the node list), and the `grotto` pack: 3 Husks and a Wisp. `rime-shard` raw; `rime-cluster` node with placement `frozen-grotto`. No pylon; the pack comes back on every reset since it can never be claimed.
10. **Goals.** Four appended after "Feed all three entrances": gather rime shards, apply a frost rune at the bench, `machineMade 'arrow+frost'` (highlight `frost-rune`), and `craftedAny` of the two ley variants.
11. **Hook.** Arrows' `ammoId` (tagged), enemies' `chill` and `frozen`, machines' `made`, `stagesUnlocked`.
12. **Render.**
    - Art: the three stage mechanisms (a frost rune stone breathing rime onto arrows, a ley guide's lens turning a bolt, a shatter lens splitting light) in the shared housing, idle/working/jammed; the rime shard icon; the rime cluster and its depleted stages; tagged icons; the star shard sliver; the ice casing and cracked casing over a frozen enemy.
    - Ground: frost over the Grotto's clearing (pale snow patches and ice glints) in the overworld ground chunks.
    - `ArrowView`: a frost arrow's pale ice tint and short frost trail; a homing bolt's cyan trail along its last points (it shows the bend); shards as small cyan slivers. `EffectsView`: a burst flash at each star burst; ice shards when a frozen enemy thaws.
    - `EnemyView`: a chilled enemy tinted toward ice, deeper per stack; a frozen one encased in ice, the casing cracking in its last ticks. The burn flame goes.
    - Sounds `freeze` and `star-burst` (`npm run sound`).
    - The bench: a "Stages" panel in the crafting menu's style (026) beside the bench's rows once the shrine is claimed: per stage a row with its inputs (have/need, names) → its output (+4, owned, name), and the stage's name; dimmed while short. Click sends `applyStage`.
13. **Docs.** docs/prototype.md ammo table.

## Tests (written first)
- **Vitest**
  - `tests/sim/ammoRoles.test.ts`: an arrow through a line of 5 Husks hits each once and stops only at range or a solid; a ley bolt stops in the first; a bomb hits a Husk 40 px away and misses one 56 px away; nothing burns (no burn fields, no burn damage after a burst).
  - `tests/data/tags.test.ts`: every derived id legal and in `AMMO`/`ITEMS`; a second element or shape refused; names from prefixes; damage type follows the element; stage data references exist.
  - `tests/sim/stages.test.ts`: the frost rune makes 4 frost arrows from 4 arrows and 1 rime shard in 60 ticks; refuses ley bolts and frost arrows; starves without rime and backs up the line when blocked; the ley guide refuses star bolts; `machineMade`; hand-apply at the bench takes inputs and gives rounds; locked before, unlocked after; refused before the shrine claim; any number of times.
  - `tests/sim/cold.test.ts`: 3 hits slow a Husk by 45%; the 4th freezes it for 90 ticks, a boss for 45; a wind-up pauses and resumes; no stacks in the refreeze window; chill expires after 120 ticks.
  - `tests/sim/homing.test.ts` and `star.test.ts`: lock, curve in, straight with nobody in the radius, straight after the target dies; 5 shards 72° apart, the struck enemy untouched, none from a wall hit.
  - `tests/sim/entrances.test.ts`: a plain and a frost arrow from two entrances fan at ±7.5°; carried frost arrows fire before plain arrows.
  - `tests/sim/grotto.test.ts`: rime clusters drop rime shards; the guards are in group `grotto` and come back on a KO; every rime cluster reachable on foot from the wake tile.
  - `tests/sim/goals.test.ts`: the four goals in place, `craftedAny`.
  - Rewritten: `combat.test.ts` (pierce swap), `bombs.test.ts` (burns removed, radius 48), `sim.test.ts` (summary), `data.test.ts` (burn flame frame gone, tagged ids allowed).
- **Playwright** `tests/e2e/ammoStages.spec.ts`: from `?playtest`, build arrow hopper → frost rune (rime-shard hopper beside it) → conduit → intake and see frost arrows reach the entrance; step out and fire frost volleys until `getState()` shows an enemy frozen; then claim the shrine, walk to the bench, open it with E and click the frost rune row, see the rounds and `frost-rune` unlocked. The freeze lands on the shrine's Pylon Warden, not a Husk: a frost arrow deals 10 and a Husk has 40 health, so the hit that would freeze a Husk kills it (see Risks). With `REVIEW_SHOTS=1`, into docs/review/029/: the three stage machines working, a frozen Husk, a homing bolt mid-curve, a star burst, the Frozen Grotto, the bench's Stages section. `crafting.spec.ts`'s pierce/burn test is rewritten: an arrow pierces two Husks and a bomb's burst kills one.

## Not dictated by the spec
- Round ids join tags with `+`; tagged icon frames use `-` (`icon-arrow-frost`).
- Stages are machines in the sim and render (`kind: 'machine'`, `recipeId` = the stage id), so status, hover, refunds and the top-face icon (the tagged round's) come for free.
- A stage works on one round kind at a time: it takes a different kind only once its rounds buffer, its craft in progress and its output are all clear, so its output always holds the kind it's working on.
- After a freeze, the refreeze window runs from the thaw; the stacks clear when it freezes.
- Frozen enemies' attack cooldowns keep counting down; only their thinking stops.
- `?playtest` carries no tagged rounds: they come from the bench or a stage (so playtest firing stays plain).
- The hotbar's ammo count shows every carried round of that base, tagged included.
- Hand-applying needs the bench in reach, as identifying does.
- The Grotto's guards: Husks at (11, 10), (17, 11), (15, 6), the Wisp at (14, 9).
- The bench's Stages panel sits right of the bench rows, with the stage's name in the free third input slot. The bench stays open after a stage row is clicked, so it can be applied again.
- A cold hit that kills doesn't freeze (the enemy is gone).
- Tagged rounds fire with their base's sound; a hand-applied stage plays the craft sound.
- Packs keep out of the Grotto's clearing, as they do the other landmarks' (it's in `OVERWORLD.clearings`).
- Dev hook `setEnemyHealth(id, health)`, for the frozen-Husk review screenshot only.

## Risks
- **Husks can't be frozen by frost arrows alone** with the starting numbers: 4 stacks freeze, a frost arrow deals 10, a Husk has 40 health, so the 4th hit kills it. Only the Warden (200) outlasts four. Noted for Shaun as a tuning question; the e2e freezes the Warden, and the frozen-Husk screenshot tops the Husk up through a dev hook.
- Many tests read the old pierce flags or fire arrows into lines of Husks; they're rewritten for the swap.
- `GameScene.ts` is at 300 lines; the bench panel lives in its own view, owned by `SiteMenus`.
