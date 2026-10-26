# 066 plan: stormsteel and storm glass

Plan for docs/specs/066-stormsteel.md on `claude/066-stormsteel` (InsanityWolfz/Pipeline#77, stacked on 065's branch).
A plan file because, like 062's, it touches round identity, damage, machines, crafting, the build bar, art and goals.
It adds one tier to 062's system (docs/plans/062-material-tiers.md) and follows that plan slice for slice.

Five slices, each committed with `npm run check` green before the next. Each slice lists its tests first; the code
follows them.

## Findings that shape the plan
- **Tiers are data already.** `src/data/tiers.ts` holds `TierId`, `TIERS` and `TIER_DAMAGE` (× the stone round's).
  - `legalRounds` (tags.ts) derives every tier's rounds base by base, stone first, then each tier in `TIERS` order. So
    two new entries give `arrow+stormsteel+frost` and `ley-bolt+storm-glass+homing` in `ROUNDS`, `AMMO` and `ITEMS`.
  - `roundName` gives "Stormsteel Frost arrow" and "Storm glass Homing ley bolt" from the prefixes.
  - The tier ids `stormsteel` and `storm-glass` are also the new parts' item ids. They live in different places (a
    round's `+` segment, an item id), as 062's tier `steel` and item `ley-steel` did, so nothing collides.
- **Damage needs no new code.** `ruleMuls` (src/sim/statResolve.ts) pushes `{ source: prefix, value: TIER_DAMAGE[tier] }`
  once per emission. `TIER_DAMAGE` 2.56 is the tier's total over stone, so the breakdown reads "× 2.56 Stormsteel".
  `TIER_SOURCES` comes from the prefixes, so `bonusSources` leaves it out. Burn and Lightning arcs take their share of
  the hit (src/sim/lightning*.ts), so they follow it.
- **Records keyed by `TierId` must grow:** `TIER_DAMAGE`, `TIER_ART` (src/data/art/tiers.ts). The tier art is a palette
  swap plus a badge, so every icon is derived. Each plain tiered round's projectile needs a `TIER_PROJECTILES` entry
  (src/data/tierAssets.ts), and the stormsteel landmine a `TIER_ARMED` one. Gauge colours are derived
  (src/data/art/intake.ts).
- **Machines take any number of variants.** `MachineDef.variants` (src/data/pieces.ts) with `turnOrder` / `nextCraft`
  (src/sim/flow.ts) rotate through every recipe after the last one made. The knapper gets
  `['steel-arrowhead', 'stormsteel-arrowhead']` and so on, with no flow change.
  - The coil is `tempering-coil`: `recipeId: 'stormsteel'`, `variants: ['storm-glass']`.
  - The jam and blocked reading (062.6) is per machine, so it covers the coil.
- **The unlock reads only `recipeId`.** `unlockedPieces` (src/sim/placement.ts) unlocks a machine when its own recipe's
  output has been hand-crafted. The spec unlocks the coil by stormsteel *or* storm glass, so it changes to "any recipe
  the machine runs". That is design.md's "the machine that makes it". For today's machines it changes nothing in play:
  their stone part comes long before the tier part.
- **Reveals take arrays already** (`shownAfter: string | string[]`, 062). The coil's rows are:
  - `stormsteel`, shown after `['ley-steel', 'stormglass']`;
  - `storm-glass`, shown after `['ley-glass', 'stormglass']`, and needing the tube's attunement as ley glass does;
  - the downstream rows, shown after `stormsteel` or `storm-glass`.
- **Craft tabs derive the tier column** (src/data/craftTabs.ts): Arrows gets ley-steel, steel arrowhead, steel arrow,
  stormsteel, stormsteel arrowhead, stormsteel arrow (6). The stone column's 8 (Bombs) stays the most, so
  `CRAFT_TAB_ROWS` and the menu's size don't change.
- **The build bar doesn't fit a 26th piece.** 25 cells at `cellStep` 24 (they touch, 064.9) plus 5 gaps of 6 make
  630 px of 640. A 26th cell needs 654.
  - The cell frame (`hudAmmoCell`) is a fixed 24 px sprite, so cells can't narrow.
  - The groups' gap goes from 6 to 3 px: 26 × 24 + 5 × 3 = 639. To be raised.
  - The HP block already rises above a long bar (031), so nothing else moves.
- **Exact lists grow.** These tests list today's content exactly and gain the new entries:
  - tiers, tier damage and tier art: tests/data/tiers.test.ts, tests/sim/tierDamage.test.ts, tests/data/tierArt.test.ts;
  - items and recipes: hud.test.ts's parts, earlyAmmo.test.ts's tier recipes;
  - craft tabs and crafting: craftTabs.test.ts's tier column, tierCrafting.test.ts's "every tier row";
  - the build bar: data.test.ts's groups, and the `?playtest` unlocked list in link.test.ts and e2e tubeLink.spec.ts;
  - goals: guidedTutorial.test.ts's chain, goalsM3.test.ts's chain end;
  - rounds: the arrow family in tiers.test.ts; the sandbox's `TIERED_ROUNDS` count; buildTabTiers.test.ts's row count
    (a tier shares its stone round's row, so no new rows).
- **Goals:**
  - `TIERED_ROUNDS` (objectives.ts) is "any non-stone round". It narrows to steel and glass, so a stormsteel round never
    completes 062's "Fire steel rounds". A new `STORM_TIERED_ROUNDS` feeds "Fire stormsteel rounds" through 062's
    `fired` check.
  - The tutorial's chain then ends at "Fire stormsteel rounds".
- **Sandbox and kit.**
  - The sandbox gives every item (`KIT_COUNT`) and every `AMMO` round in its loadout, so the new ones come for free.
  - The loadout's round list grows by 28. e2e sandbox.spec's mixed-loadout test steps through it, so its clicks are
    measured against 065's head before any timeout changes.
  - The `?playtest` kit leaves the five new parts out (062.15's rule: its bag's first screen is full).
- **Measure:** tests/sim/stormPackBot.ts's `stormPackClear(seed, tier)` already takes any `Tier`, so a new
  tests/measure/stormsteel.measure.ts compares stormsteel with steel in ring 5 over seeds 1–20.
- **Sounds** are synth recipes rendered into committed wavs (`npm run sound`, assets/build/sounds). `fireSoundOf`
  (src/render/tierFeel.ts) picks a tier's family sound; `WORK_SOUNDS` plays as a Forge machine starts a craft (062.10).
- **Saves.** The new content is data. `SAVE_VERSION` (18) moves only if tests/sim/saveShape.test.ts says the shape changed.

## Slice 1: the two tiers, their rounds and damage
**Tests first**
- **Data:**
  - `TIERS` lists steel, glass, stormsteel (arrow, bomb, landmine; "Stormsteel") and storm-glass (ley bolt; "Storm glass").
  - `TIER_DAMAGE` is 1.6, 1.6, 2.56, 2.56.
  - Every stone round has a version at each tier taking its base in `ROUNDS`, `AMMO` and `ITEMS`. The names are
    "Stormsteel Frost arrow", "Storm glass Homing ley bolt" and "Stormsteel Fire Cluster bomb".
  - `withTier`, `withTag` and `withoutTag` keep the new tiers.
  - Every new tiered round has a derived icon (different from its stone one), a projectile recoloured from its stone
    one, a gauge colour, and real palette colours only; the stormsteel landmine lies armed in stormsteel.
- **Sim:**
  - A stormsteel arrow's hit, bomb Burst, Cluster Bomblets and landmine Burst, and a storm glass bolt's hit and Split
    Shards, are each ×2.56 the stone round's.
  - Burn is 25% of the ×2.56 hit, and a Lightning arc takes its share of the ×2.56 hit: each multiplied once.
  - Range, speed and fire rate equal the stone round's; keywords are the same.
- **Render:**
  - The breakdown's first line reads "Damage 14 × 2.56 Stormsteel = 35.8". The summary notes "Stormsteel ×2.56 dmg".
    `bonusSources` excludes it.
  - The Build tab folds both tiers into the stone round's row ("arrow · Steel, Stormsteel").
  - The long Stormsteel Fire Cluster bomb summary drops its tier note first, as 062.2.
  - The exact lists named above are updated.

**Code**
- `tiers.ts`: the two tiers. `art/tiers.ts`: `TIER_ART` for both: dark storm metal with violet-white veins, and clear
  glass with a spark inside.
- `tierAssets.ts`: the five new projectile and armed sprites.
- `objectives.ts`: `TIERED_ROUNDS` narrowed to steel and glass.

## Slice 2: the new parts, the Tempering coil and every machine's stormsteel variant
**Tests first**
- **The coil:**
  - It is 1×1 in the Forge group and runs `stormsteel` (1 ley-steel + 1 stormglass → 1 stormsteel) and `storm-glass`
    (1 ley glass + 1 stormglass → 1 storm glass) by input, each in 60 ticks.
  - It takes either set from a line, and fed both it makes both kinds, one set a craft.
  - `machine-speed` research speeds it.
- **Downstream:**
  - The knapper makes 2 stormsteel arrowheads from 1 stormsteel; the shaper 1 casing; the plate press 2 plates; the
    focuser 4 storm glass bolts from 1 storm glass.
  - The assembler, packer and mine packer make stormsteel rounds from the stormsteel part and the shared inputs, in
    stone's counts.
  - A knapper fed all three tiers makes all three in turn, never mixing a craft.
- **Stages:** a frost rune fed stormsteel arrows makes Stormsteel Frost arrows at the same cost.
- **Data:**
  - The five parts have icons, all distinct from the steel ones.
  - The coil has a mechanism. Its hover shows the recipe it's running.
  - Every recipe is covered by exactly one machine.

**Code**
- `items.ts`: `stormsteel`, `storm-glass`, `stormsteel-arrowhead`, `stormsteel-casing`, `stormsteel-plate`.
- `recipes.ts`: the coil's two recipes and seven downstream ones.
- `pieces.ts`: the `tempering-coil` piece, each tiered machine's second variant, and its build-bar text naming it.
- `foundryAssets.ts` `MACHINE_IDS`.
- Art (`art/tiers.ts`, `art/forgeMechanisms.ts`):
  - the parts' icons;
  - the coil: a brass coil wound round a crucible, crackling with violet-white sparks while it works.

## Slice 3: crafting, the unlock, the Forge group and the kit
**Tests first**
- **Rows:**
  - The stormsteel row shows only once ley-steel and stormglass have been carried; storm glass's once ley glass and
    stormglass have.
  - The downstream rows show once stormsteel or storm glass has been carried.
- **The unlock:**
  - Hand-crafting stormsteel unlocks the coil, and so does hand-crafting storm glass.
  - Crafting a variant's output unlocks its machine.
- **Tabs and bar:**
  - Each tab's tier column holds the steel chain and then the stormsteel one; `CRAFT_TAB_ROWS` stays 8.
  - The Forge group is the Smelter, the kiln and the coil, and the whole bar fits the 640 px view with 3 px between groups.
  - The `?playtest` unlocked list ends with the coil.
- **Kit:** the `?playtest` kit leaves the five new parts out.

**Code**
- `unlockedPieces` reads every recipe a machine runs. `BUILD_BAR` gains `tempering-coil`. `BUILD_BAR_LAYOUT.groupGap` 3.
- `LEFT_OUT_OF_KIT` gains the new parts.

## Slice 4: sound and the contact sheet
**Tests first**
- A stormsteel round fires with its family's sharper sound: a new recipe, not steel's or stone's.
- A storm glass bolt fires with the ley bolt's, as glass does.
- The coil's crackle is its `WORK_SOUNDS` entry, and every new key has a recipe and a rendered wav.

**Code**
- `tierSounds.ts`:
  - `coil-crackle`;
  - `fire-arrow-stormsteel` and `fire-bomb-stormsteel`: steel's, higher and brighter with a crackle.
- `STORMSTEEL_FIRE_SOUNDS` and `fireSoundOf`. `npm run sound`.
- The contact sheet gains a 066 group (src/render/vector/sheet.ts).

## Slice 5: goals, sandbox, measure, e2e and shots
**Tests first**
- **Goals:** after "Feed all five entrances", three m3 goals in order:
  - "Temper stormsteel at the bench (C)" (`crafted: ['stormsteel']`);
  - "Build a Tempering coil into a line" (`machineMade: 'stormsteel'`);
  - "Fire stormsteel rounds" (`fired`, any stormsteel or storm glass round; a steel round doesn't count).
  - The chain now ends at the last.
- **Sandbox:** it carries the new parts and every stormsteel and storm glass round, the coil is unlocked, the rows are
  known, and the loadout offers them.

**Code**
- The goals, with waypoints as 062.11's.
- `npm run measure`: stormsteel against steel pack clears in ring 5, recorded.
- **e2e** (tests/e2e/stormsteel.spec.ts):
  - a Tempering coil into an arrow line, firing stormsteel arrows. It uses `?playtest`, as 062.13's did, because the
    sandbox has no foundry;
  - a Stormsteel Frost arrow's hover and its "× 2.56 Stormsteel" breakdown.
- Review shots in docs/review/066:
  - a coil in a line;
  - a Stormsteel Frost arrow's breakdown;
  - a storm glass bolt in flight;
  - the Forge group with three machines;
  - the new art on the contact sheet.
- Run the older shots this touches (062's tiers, the build bar's) with REVIEW_SHOTS=1, then restore them.
- The spec's results and "Raised after the build".

## Order and verification
- One builder, on this branch, stacked on 065.
- `npm run check` green and the touched e2e files passing at each commit. CI runs the full suite.
- Then `/review`, fixes and the wrapup.
