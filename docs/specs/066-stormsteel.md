# 066: The third tier: stormsteel and storm glass
status: approved

Approved by Shaun in chat, 2026-10-26 ("Approve 64-66"), with the draft's listed decisions; its plan is pre-approved ("approve the plans of any other upcoming stuff").

Plan pre-approved by Shaun, 2026-10-26.

Drafted from Shaun's Region 4 interview (docs/brainstorm/2026-10-26-region-4-interview.md, answer 10), 2026-10-26.

## Goal
The material ladder gets its third rung. A **Tempering coil** charges ley-steel and ley glass with the Stormcrown's stormglass. Fed to the same machines as before, it makes **stormsteel** arrows, bombs and landmines and **storm glass** bolts: ×1.6 over steel, with the same behaviour, stages and talents. A player who loves their build keeps it again, one tier up.

## Design references
- docs/design.md: "Scaling lives inside each line"; "Regional pull"; "Unlocks".
- docs/specs/062-material-tiers.md: tiers as a `+` segment, the emission's tier step, machines running tier variants by input, the Forge group. This spec adds one tier to that system.
- docs/specs/064-stormcrown.md: stormglass, the Conductor, the Milestone 3 goals.
- docs/brainstorm/2026-10-22-region-3.md, "Further tiers": "Each tier adds one processing step, never more."

## Acceptance criteria

**Items and the tier (data)**
- [x] New parts:
  - `stormsteel` and `storm-glass`;
  - `stormsteel-arrowhead`, `stormsteel-casing` and `stormsteel-plate`.
- [x] Two new tiers in 062's `TIERS`: `stormsteel` (arrow, bomb, landmine) and `storm-glass` (ley bolt), each with `TIER_DAMAGE` 2.56 (×1.6 over steel, Shaun).
- [x] Every legal round has stormsteel or storm glass versions, derived as in 062: "Stormsteel Frost arrow", "Storm glass Homing ley bolt". Each has a derived icon and gauge colour.

**The Tempering coil (data, sim)**
- [x] A 1×1 machine in the Forge group:
  - 1 ley-steel + 1 stormglass → 1 stormsteel;
  - 1 ley glass + 1 stormglass → 1 storm glass.

  Each takes 60 ticks and runs by input, as 062's machines do.
- [x] Unlocked by hand-crafting stormsteel or storm glass once at the bench. Its rows show once ley-steel or ley glass, and stormglass, have been carried.

**Downstream, by input**
- [x] The same machines, as 062:
  - knapper: 1 stormsteel → 2 stormsteel arrowheads;
  - shaper: 1 → 1 stormsteel casing;
  - plate press: 1 → 2 stormsteel plates;
  - focuser: 1 storm glass → 4 storm glass bolts;
  - assemblers: stormsteel rounds from stormsteel parts, in the same counts.
- [x] Mixing works as in 062: one matching set per craft, never mixing tiers inside one.
- [x] Stage machines tag stormsteel rounds as any other tier.

**Damage**
- [x] A stormsteel or storm glass round's every hit is ×2.56 its stone round's, through 062's tier step, shown as one step in the breakdown ("× 2.56 Stormsteel"). Burn and Lightning arcs follow the hit.

**Goals (data)**
- [x] After 064's "Feed all five entrances", milestone `m3` gains:
  1. "Temper stormsteel at the bench (C)"
  2. "Build a Tempering coil into a line"
  3. "Fire stormsteel rounds", completed by any stormsteel or storm glass round fired

**Sandbox, saves, art, sound**
- [x] The sandbox gives the new parts and rounds. `SAVE_VERSION` goes up if the save's shape changes.
- [x] **Art:**
  - the Tempering coil: a brass coil around a crucible, crackling while working;
  - icons for stormsteel, storm glass and the three parts;
  - stormsteel's look: dark metal with violet-white veins; storm glass: clear with a spark inside.
- [x] **Sound:** the coil's crackle; stormsteel rounds fire with a sharper version of steel's sound.

**Measure and review shots**
- [x] `npm run measure` records stormsteel against steel pack clears in ring 5, not tuned.
- [x] Review shots (docs/review/066):
  - a coil in a line;
  - a stormsteel frost arrow's breakdown;
  - a storm glass bolt in flight;
  - the Forge group with three machines.

## Data changes
- `items.ts`: the new parts. `tiers` data: the two tiers.
- `recipes.ts`: the coil's recipes and each machine's stormsteel variant.
- `pieces.ts`: `tempering-coil` in the Forge group. `objectives.ts`: the goals.
- Art and sound data.

## Out of scope
- A fourth tier.
- Tier-scoped talents or relics.
- New keywords.

## Test plan
- **Sim:**
  - The coil's two recipes.
  - Each downstream machine's stormsteel variant, and mixing.
  - ×2.56 on every hit kind, applied once.
  - Stage tagging; the unlock; the goals.
- **Data:** every derived round, name, icon and gauge colour; references resolve.
- **Playwright:** a coil into an arrow line in the sandbox firing stormsteel arrows; the breakdown step. Plus the review shots.
- **`npm run measure`:** stormsteel against steel in ring 5, recorded.

## Open questions
None: the interview settled them.

## Decisions in this draft (OK them with the approval)
- One Tempering coil makes both stormsteel and storm glass, by input, rather than two machines.
- Names follow 062's casing ("Stormsteel Frost arrow").
- `TIER_DAMAGE` is the tier's total over stone (2.56), so one step shows in the breakdown, not two.

## Results
Built in five slices on `claude/066-stormsteel` (docs/plans/066-stormsteel.md). Every criterion above is met; where the
build settled something the spec left open, it is raised below. `SAVE_VERSION` stays 18: the save's shape didn't change.

- **Tiers:** `stormsteel` and `storm-glass` join 062's `TIERS`, each `TIER_DAMAGE` 2.56 (×1.6 over steel). 28 storm rounds
  derive from them, one for every stone round, plain or tagged. Every hit takes the ×2.56 once, through 062's one step: direct hits, Shards,
  Bursts, Bomblets and mines, with burn and Lightning arcs following the hit. The breakdown reads "Damage 14 × 2.56
  Stormsteel = 35.8".
- **The Tempering coil** runs `stormsteel` and, as a variant, `storm-glass`. Every tiered machine lists its steel and
  then its stormsteel recipe, and takes turns through all three tiers it's fed.
- **Measure** (`npm run measure`, tests/measure/stormsteel.measure.ts, recorded, not tuned): 065's ring 5 pack and its
  decent five-entrance Lightning build (three arrow lines, two bomb lines), every line's round at stormsteel against
  steel, seeds 1–20.
  - Steel: 14.6 s mean (9.9–19.7), 20/20 cleared, 0 KOs.
  - Stormsteel: 9.2 s mean (5.9–11.2), 20/20 cleared, 0 KOs.
  - Stormsteel takes 63% of steel's time.
- **Review shots** in docs/review/066:
  - a Tempering coil in a stormsteel arrow line, and its hover while it tempers;
  - a Stormsteel Frost arrow's hover summary and breakdown;
  - a storm glass bolt in flight;
  - the Forge build-bar group with its three machines and the coil's tip;
  - the Arrows tab's storm rows;
  - the storm tier's art and the coil on the contact sheet.
- **e2e:** tests/e2e/stormsteel.spec.ts covers:
  - a coil line firing stormsteel arrows;
  - the hover and the breakdown step;
  - the crafting menu's storm rows, every name inside its row.

## Raised after the build (OK them, or say what to change)
Builder decisions the spec didn't settle.

Machines and crafting:
- 066.1 A machine now unlocks once anything it makes has been hand-crafted, not only its first recipe's output. That
  makes storm glass at the bench unlock the coil, as the spec asks. It also means a stormsteel arrowhead unlocks the
  knapper, which can't come first in play.
- 066.2 The coil's rows:
  - stormsteel shows once ley-steel and stormglass have been carried; storm glass once ley glass and stormglass have;
  - storm glass waits for the tube's attunement, as ley glass does (062.8);
  - each tab's tier column holds the steel chain, then the stormsteel chain (6 rows at most), so the menu keeps its size;
  - only the plain storm rounds are hand-crafted, as 062.7.
- 066.3 Each tiered machine's build-bar text names its storm recipe too ("Chips stone into arrowheads, and ley-steel or
  stormsteel into their own.").
- 066.4 The crafting menu's long names ran into each other and past the row: "Stormsteel arrowhead" under its icon
  overlapped "Rope", and the output's name overran the row's right edge.
  - Now a name that would run into the next one, or past the row's end, moves left just enough. One that would then
    run into the name before it moves right past it.
  - A row whose names already fit is drawn as before.
  - This also fixes 062's Steel arrow row, where "Steel arrowhead" overlapped "Rope" by 4 px.

Layout:
- 066.5 To fit the 26th piece, the build bar's groups sit 3 px apart (062.5: 6). The bar now spans the 640 px view
  with about 1 px to spare at each end; the HP block rises over it, as it already did for a long bar.
- 066.6 The Build tab folds a storm round into its stone round's row beside steel ("Frost arrow · Steel, Stormsteel").
  A row name too long for its column ends with "…", as any long name there already does.

Goals:
- 066.7 "Temper stormsteel at the bench (C)" completes on stormsteel only. Tempering storm glass at the bench unlocks
  the coil but leaves this goal open.
- 066.8 "Build a Tempering coil into a line" completes when a machine makes stormsteel, as 062's Smelter goal does; a
  coil making only storm glass leaves it open.
- 066.9 Goal targets follow 062.11:
  - "Temper stormsteel" points at its raws;
  - "Build a Tempering coil" at the foundry;
  - "Fire stormsteel rounds" at the intake.
- 066.10 The tutorial's chain now ends at "Fire stormsteel rounds".
- 066.11 062's "Fire steel rounds" takes steel and glass rounds only, so a storm round never completes it.
- 066.12 The playtest and Hollows starts count stormsteel as hand-crafted already, so "Temper stormsteel" completes at
  once on them (062.12).

Art and sound:
- 066.13 Stormsteel's look (draft for your review) is the stone or iron recoloured to the storm slates, with veins
  in violet-white.
  - Its badge, in the icon's upper-left like steel's, is a dark ingot with a violet-white lightning vein.
  - Storm glass is the ley bolt's light cleared to a pale violet, a little more see-through than glass. Its badge is a
    clear diamond with a white spark inside.
  - Stormsteel and the three stormsteel parts are the ley-steel bar and the steel parts, tempered: storm metal with a
    violet-white vein. Storm glass is the ley glass pane, paler, with a spark in it.
- 066.14 The coil (draft): a clay crucible wound with a brass coil. Working, its charge glows violet-white and lightning
  jumps between the coil's turns. The arcs are small at game zoom (shot 02).
- 066.15 The coil's crackle plays once as it starts a craft, as the Smelter's pour does (062.10). A storm glass bolt
  fires with the ley bolt's sound: the spec gives a sharper sound to stormsteel only.

Names:
- 066.16 The part "Storm glass" and the raw "Stormglass" differ only by a space, and their icons are both pale
  crystal. They may read as one item in the bag and the crafting menu.

Tests and kit:
- 066.17 The `?playtest` kit leaves out stormsteel, storm glass and the three stormsteel parts (062.15's rule). It
  carries their raws and stormglass.
- 066.18 The e2e builds its coil line with `?playtest`, as 062.13's did, because the sandbox has no foundry. The sandbox
  gives the new parts and every storm round, and its loadout offers them (Vitest).
- 066.19 The sandbox's round list has 85 choices (was 57), so its mixed-loadout e2e makes 64 panel clicks (was 44).
  - Measured alone, one Playwright process: 58 s on the commit before (a2bc6de) and 90 s here.
  - Scaled by 064's loaded 96 s, that is about 140 s under load, so its timeout goes from 150 s to 220 s.

