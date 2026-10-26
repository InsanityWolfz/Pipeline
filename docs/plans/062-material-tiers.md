# 062 plan: material tiers

Plan for docs/specs/062-material-tiers.md on `claude/062-material-tiers` (InsanityWolfz/Pipeline#73, stacked on 061). It is a plan file because the spec spans round identity, damage, machines, crafting, the build bar, art and goals.

Five slices, each committed with `npm run check` green before the next. Each slice lists its tests first; the code follows them.

## Findings that shape the plan
- **Tier ids are a `+` segment after the base.**
  - Rounds become `arrow+steel` and `arrow+steel+frost`.
  - The tiers live in their own `TIERS` table, not in `TAGS`: a tag needs a keyword, and the keyword graph turns every tag into one.
  - `roundBase`, the icon frame names and every `BASE_*` lookup keep working unchanged. A prefix id (`steel-arrow`) would break `roundBase` everywhere.
  - In tags.ts: `roundTags` filters tier ids out; a new `roundTier` reads them; `roundId`, `withTag` and `withoutTag` keep the tier.
  - Plain tiered rounds (`arrow+steel`) go into `ROUNDS`, so items, ammo, icons, known rounds and the sandbox come for free. The playtest kit's exclusion of `ROUNDS` stays right.
- **Every other id parser** (the survey's list: sim/stages, arrows, mines, tube, knownRounds, objectives, describe*, buildTabLayout, roundLook, ArrowView, FeelView) gets a test or a check that it reads a tiered id correctly. Most only need `roundBase` or `roundTags`, which already do.
- **Damage goes through the emission, not `damageEnemy`.** `Emission` gains `tier`.
  - Set by: `roundEmission`, `shardEmissionOf` (from a Split) and `bombletEmission`.
  - Not set by: `poolBurstEmission`, Shatter shards and burn, which derive from an already-multiplied hit.
  - `ruleMuls` pushes `{ source: 'Steel' | 'Glass', value: TIER_DAMAGE[tier] }` for `damage`. That covers direct hits, Shards, Bursts, Bomblets and mines once, and burn follows the hit.
  - Melee and burn beats also pass through `damageEnemy`, so multiplying there would count twice.
  - The Shift breakdown shows it as its own step via `stepsText`. `bonusSources` filters it out like `gear cap`, so it isn't called a bonus.
- **Machines run tier variants.** `MachineDef` gains `variants` (recipe ids).
  - `offer` (flow.ts) accepts any variant's input.
  - `advanceMachine` picks, by input order, the first variant whose inputs are full, and never mixes inside a craft.
  - `machineRecipe` resolves the variant running now from `made`, so the hover (`HoverReadout`) and objective checks follow it.
  - Stage machines' `offerToStage` already picks by the round fed. Tiered rounds fed to a stage need `stageRecipeFor` to keep the tier, which `withTag` handles.
  - The data test "every recipe covered by exactly one machine" changes to count variants.
- **Two reveal inputs.** `shownAfter` becomes `string | string[]`, so the Smelter's and kiln's rows wait for both inputs. `knownRecipe` and `taggedKnown` change with it.
- **Unlock comes free.** `unlockedPieces` unlocks a machine when its recipe's output has been hand-crafted, so smelting ley-steel unlocks the Smelter.
- **Looks are derived.** A `TIER_ART` palette swap over the base shapes gives every tiered icon without hand drawing: steel to the iron palette ids, glass to cyan with alpha. In flight, `ArrowView` and `roundTint` read the tier. Gauge colours are derived from the stone round's, since a test needs one for every `AMMO` id.
- **A new `fired` check** for "Fire steel rounds" reads `state.events.shots`. `stepTube` runs before `stepObjectives`, so it needs no new state.
- **Names follow today's casing.** `roundName` capitalises every prefix ("Frost Homing ley bolt"), so tiered rounds read "Steel Frost arrow" and "Glass Homing ley bolt". This is raised rather than changing old names.
- **Saves.** `SAVE_VERSION` moves only if the save shape test says so.

## Slice 1: tier identity and damage
**Tests first**
- **Data:**
  - `TIERS` has steel (arrow, bomb, landmine) and glass (ley-bolt), with `TIER_DAMAGE` 1.6 each.
  - Every legal round has its tiered versions in `ROUNDS`, with items, ammo and names.
  - `roundTier`, `roundTags` and `withTag` keep the tier; `withoutTag` keeps it too.
  - The exact-list tests are updated.
- **Sim:**
  - A steel round's direct hit, Shard, Burst, Bomblet and mine damage are each ×1.6 the stone round's.
  - Burn from a steel fire round is 25% of the ×1.6 hit, multiplied once only.
  - Pool-bursts and Shatter shards are not multiplied twice.
  - Range, speed, radius and fire rate equal the stone round's.
  - Talents reach steel rounds by family.
- **Render:** the summary and breakdown show the tier step; `bonusSources` excludes it.

**Code**
- `tags.ts` (or `tiers.ts`): ids and helpers. `ammo.ts` and `items.ts` derived.
- `Emission.tier` in `statResolve.ts`, set in `emissions.ts`; the `ruleMuls` step.
- The describe updates.
- Each id parser checked.

## Slice 2: the Smelter, the kiln and tier variants
**Tests first**
- The Smelter makes 1 ley-steel from 1 ley-iron + 1 cinderite in 60 ticks; the kiln makes 1 ley glass from 1 ley dust + 1 cinderite.
- Each tier-aware machine accepts both tiers' inputs:
  - the knapper, shaper and plate press make steel parts from ley-steel;
  - the focuser makes 4 glass bolts from 1 ley glass;
  - the assembler, packer and mine packer make steel rounds from a steel part plus the shared inputs, in stone's counts.
- A machine fed both tiers makes both kinds, one matching set per craft.
- Stage machines tag tiered rounds at the same cost.
- `machine-speed` applies to the new machines.
- Data: the variants coverage test; 3×1 recipes keep 3 inputs.

**Code**
- Items for the new parts.
- `recipes.ts` variants.
- `MachineDef.variants`; `offer`, `advanceMachine` and `machineRecipe` in `flow.ts` and `sim/stages.ts`.
- `smelter` and `kiln` pieces.

## Slice 3: crafting, unlocks and the Forge group
**Tests first**
- The crafting menu shows the Smelter's and kiln's rows only after both inputs have been carried.
- Hand-crafting ley-steel unlocks the Smelter; ley glass unlocks the kiln.
- Steel and glass rows appear in the family tabs once their tier part is known.
- The Forge group sits after Mines with both machines.
- The exact-list tests (`craftTabs`, categories, `MACHINE_IDS`, the mine chain's last category) are updated.

**Code**
- `shownAfter` as an array; `REVEALING_ITEMS`.
- `craftTabs.ts` tier rows, with `CRAFT_TAB_ROWS` resized.
- The `forge` `PieceCategory`; `BUILD_BAR`; `MACHINE_IDS`; foundry layout groups.

## Slice 4: art and sound
**Tests first**
- Data: every tiered round has a derived icon and gauge colour; the new machines have mechanisms (the machines test throws otherwise); every sound key resolves.

**Code**
- `TIER_ART` palette swaps.
- The Smelter's and kiln's rigs and mechanisms with working loops.
- Icons for ley-steel, ley glass and the steel parts.
- In-flight tier looks in `ArrowView` and `roundTint`.
- Sounds: the Smelter's pour, the kiln's roar, and heavier fire sounds for steel (`FeelView` `FIRE_SOUNDS` by tier).

## Slice 5: goals, sandbox, measure and shots
**Tests first**
- After "Feed all four entrances", three goals in order:
  - "Smelt ley-steel at the bench (C)" (`crafted`)
  - "Build a Smelter into a line" (`machineMade: 'ley-steel'`)
  - "Fire steel rounds" (the new `fired` check, on any tiered round)
- `goalsM2` tests updated.
- The sandbox loadout offers tiered rounds.

**Code**
- The `fired` objective check; the goals.
- Sandbox checks.
- `npm run measure`: steel against stone pack clears in rings 3 and 4, recorded.
- e2e: a Smelter into an arrow line in the sandbox, firing steel arrows; a tier step in the hover. Review shots in docs/review/062.
- The spec's results and "Raised after the build".

## Order and verification
- One builder, after 061 is built and reviewed, on this branch, rebased by merging 061's branch.
- `npm run check` green and the touched e2e files passing at each commit. CI runs the full suite.
- Then `/review`, fixes and the wrapup.
- This PR is retargeted to main once 061 merges.
