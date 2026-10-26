# 066: The third tier: stormsteel and storm glass
status: approved

Approved by Shaun in chat, 2026-10-26 ("Approve 64-66"), with the draft's listed decisions; its plan is pre-approved ("approve the plans of any other upcoming stuff").

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
- [ ] New parts:
  - `stormsteel` and `storm-glass`;
  - `stormsteel-arrowhead`, `stormsteel-casing` and `stormsteel-plate`.
- [ ] Two new tiers in 062's `TIERS`: `stormsteel` (arrow, bomb, landmine) and `storm-glass` (ley bolt), each with `TIER_DAMAGE` 2.56 (×1.6 over steel, Shaun).
- [ ] Every legal round has stormsteel or storm glass versions, derived as in 062: "Stormsteel Frost arrow", "Storm glass Homing ley bolt". Each has a derived icon and gauge colour.

**The Tempering coil (data, sim)**
- [ ] A 1×1 machine in the Forge group:
  - 1 ley-steel + 1 stormglass → 1 stormsteel;
  - 1 ley glass + 1 stormglass → 1 storm glass.

  Each takes 60 ticks and runs by input, as 062's machines do.
- [ ] Unlocked by hand-crafting stormsteel or storm glass once at the bench. Its rows show once ley-steel or ley glass, and stormglass, have been carried.

**Downstream, by input**
- [ ] The same machines, as 062:
  - knapper: 1 stormsteel → 2 stormsteel arrowheads;
  - shaper: 1 → 1 stormsteel casing;
  - plate press: 1 → 2 stormsteel plates;
  - focuser: 1 storm glass → 4 storm glass bolts;
  - assemblers: stormsteel rounds from stormsteel parts, in the same counts.
- [ ] Mixing works as in 062: one matching set per craft, never mixing tiers inside one.
- [ ] Stage machines tag stormsteel rounds as any other tier.

**Damage**
- [ ] A stormsteel or storm glass round's every hit is ×2.56 its stone round's, through 062's tier step, shown as one step in the breakdown ("× 2.56 Stormsteel"). Burn and Lightning arcs follow the hit.

**Goals (data)**
- [ ] After 064's "Feed all five entrances", milestone `m3` gains:
  1. "Temper stormsteel at the bench (C)"
  2. "Build a Tempering coil into a line"
  3. "Fire stormsteel rounds", completed by any stormsteel or storm glass round fired

**Sandbox, saves, art, sound**
- [ ] The sandbox gives the new parts and rounds. `SAVE_VERSION` goes up if the save's shape changes.
- [ ] **Art:**
  - the Tempering coil: a brass coil around a crucible, crackling while working;
  - icons for stormsteel, storm glass and the three parts;
  - stormsteel's look: dark metal with violet-white veins; storm glass: clear with a spark inside.
- [ ] **Sound:** the coil's crackle; stormsteel rounds fire with a sharper version of steel's sound.

**Measure and review shots**
- [ ] `npm run measure` records stormsteel against steel pack clears in ring 5, not tuned.
- [ ] Review shots (docs/review/066):
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
