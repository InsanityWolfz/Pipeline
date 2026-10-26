# 062: Material tiers: ley-steel and ley glass
status: approved

Approved by Shaun in chat, 2026-10-24 ("Approve 61 and 62"), with the draft's listed decisions.

Drafted from Shaun's material-tier idea and the 062 interview (docs/brainstorm/2026-10-22-region-3.md: "Shaun's direction", "062 interview"), 2026-10-24.

## Goal
Better materials make the rounds you already use hit harder, without changing your build. Two new machines turn region materials into better parts:
- the **Smelter** fuses ley-iron and cinderite into **ley-steel**;
- the **kiln** fires ley dust and cinderite into **ley glass**.

Fed to the machines already in your lines, they make **steel arrows, steel bombs, steel landmines and glass bolts**. These behave exactly like the stone versions, take the same stages and talents, and deal ×1.6 damage.

The fun is the gradual switch: one steel lane in the middle while stone feeds the sides, then a full refit once the Emberworks is claimed.

## Design references
- docs/design.md:
  - "The Foundry", "The layout is the ability": "Refinement stages raise quality and damage."
  - "Scaling lives inside each line": "More resources mean more throughput, and better machines mean stronger ammo."
  - "World, regions, ley lines, bosses", "Regional pull": "ammo chains need materials from several regions, so growing a line means claiming new ground."
  - "Unlocks": "Crafting something by hand once unlocks the machine that makes it."
  - Pillars 2 (manual first, then automated) and 3 (every extra projectile costs real materials).
- docs/brainstorm/2026-10-19-content.md, section 7: "Regional materials give alternative, better recipes. For example, a ley-iron arrowhead hits harder."
- docs/specs/060-emberworks.md: cinderite, the Ash Kilns' supply, the Milestone 2 goals.
- docs/specs/029-ammo-stages.md and 039-keyword-system.md: rounds as a base plus tags, stage machines picking their recipe from the round fed to them.

## Acceptance criteria

**New items (data)**
- [x] Parts:
  - `ley-steel` and `ley-glass`, made by the new machines;
  - `steel-arrowhead`, `steel-casing` and `steel-plate`, the steel versions of today's parts.
- [x] **Tiered rounds:** steel arrows, steel bombs, steel landmines and glass bolts. Every tagged round has a steel or glass version (`Steel frost arrow`, `Glass homing bolt`, `Steel fire cluster bomb`), derived from data like 029's rounds, so no round is written by hand.
- [x] Each has its own icon: the stone icon with a steel or glass look (render).

**The tier (data, sim)**
- [x] A round's **tier** is `stone` (today's rounds) or one material tier: `steel` for arrows, bombs and landmines, `glass` for ley bolts. Tier is separate from the element and shape slots, so a round still holds at most one element and one shape.
- [x] A tiered round deals ×1.6 the damage of its stone version (a data value per tier, `TIER_DAMAGE`), on every hit it makes: direct hits, Shards, Bursts, Bomblets and mines. That also flows into burn and anything that reads a hit's damage.
  - Its range, speed, radius, fire rate and behaviour are the stone round's.
  - Talents, keywords and relics reach it exactly as they reach the stone round, by family and keyword.
- [x] The tier shows in the round's name ("Steel frost arrow"), its hover summary and its Shift breakdown (040: the ×1.6 shown as its own step).

**The Smelter and the kiln (data, sim)**
- [x] **Smelter:** a 1×1 machine. 1 ley-iron + 1 cinderite → 1 ley-steel, in 60 ticks.
- [x] **Kiln:** a 1×1 machine. 1 ley dust + 1 cinderite → 1 ley glass, in 60 ticks.
- [x] Both are ordinary build-bar pieces (Shaun: no wing room for now), in a new **Forge** group after Mines.
- [x] Each is unlocked by hand-crafting its product once at the bench (crafting menu). The rows show once both of its inputs have been carried.
- [x] `machine-speed` research applies to both.

**Existing machines take either tier, by input (Shaun: the same machines)**
- [x] The knapper, shaper and plate press each make their stone part as today (the knapper and shaper from stone, the plate press from ley-iron), and their steel part from ley-steel:
  - knapper: 1 ley-steel → 2 steel arrowheads
  - shaper: 1 ley-steel → 1 steel casing
  - plate press: 1 ley-steel → 2 steel plates
- [x] The focuser makes ley bolts from ley dust, as today, and 4 glass bolts from 1 ley glass.
- [x] The assembler, packer and mine packer make steel rounds when their tier part is a steel part (steel arrowhead, steel casing, steel plate), in the same counts as stone. The other inputs (shafts, rope, fuses, ley dust) are shared.
- [x] **Mixing** (Shaun: whatever it was fed):
  - Each craft uses one matching set. A machine holding both tiers makes whichever full set is first in its input order, then the other, so both kinds come out.
  - A machine never mixes tiers inside one craft.
- [x] Stage machines tag a tiered round like its stone version: a frost rune fed steel arrows makes steel frost arrows, at the same material cost.
- [x] Rounds of different tiers are different items. An intake entrance's reservoir holds one round kind at a time, as today: it refuses another kind until it's empty. So a line making both kinds into one entrance backs up behind the second kind until the reservoir runs dry. The intended play is one tier per entrance, such as one steel lane in the middle.
- [x] Hand-crafting: the crafting menu's family tabs gain the steel and glass rows once their tier part is known.
- [x] A machine's hover shows the recipe it's running now (stone or steel).

**Goals (data)**
- [x] After "Feed all four entrances" (060), Milestone 2 gains:
  1. "Smelt ley-steel at the bench (C)"
  2. "Build a Smelter into a line"
  3. "Fire steel rounds"

  The last completes on any steel or glass round fired.

**Sandbox (044)**
- [x] The sandbox gives the new parts and every tiered round, and the loadout panel offers tiered rounds.

**Saves**
- [x] `SAVE_VERSION` goes up by one if the save's shape changes.

**Art and sound**
- [x] Vector art (docs/art.md):
  - the Smelter: a small crucible furnace with a pour spout;
  - the kiln: a domed brick kiln with a glowing mouth;
  - their working loops;
  - the icons for ley-steel, ley glass and the three steel parts;
  - the tiered round icons and in-flight looks: steel's darker metal sheen, glass's clear cyan.
- [x] Sounds: the Smelter's pour and the kiln's roar while working. Steel rounds fire with a heavier version of their family's sound.

**Measure**
- [x] `npm run measure` records the same decent builds' pack-clear times with steel rounds against stone in rings 3 and 4. Recorded, not tuned.

**Review shots (docs/review/062)**
- [x] A Smelter feeding a knapper in an arrow line; a mixed line making both kinds; a steel frost arrow's hover summary and breakdown; a glass bolt in flight; the Forge build-bar group.

## Data changes
- `items.ts`: the new parts.
- `tags.ts` (or a new `tiers.ts`): the tier list, `TIER_DAMAGE` and which families each tier applies to. Tiered rounds are derived alongside `ROUNDS`.
- `recipes.ts`: the Smelter's and kiln's recipes, and each machine's per-tier recipe variants.
- `pieces.ts`: `smelter`, `kiln`, the `forge` category, and machines able to run more than one recipe by input.
- `objectives.ts`: the three goals. `sandbox.ts`: the new items.
- Art and sound data for everything above.

## Out of scope
- Tiers past steel and glass (void-steel and the like come with a later region).
- Steel shafts, rope or fuses: only one part per family changes tier.
- The Bulwark's wing as a room; a heat brazier.
- Talents or relics that scope a tier.
- New keywords: the tier is a number on a round, not a rule, so it gets no keyword.

## Test plan
- **Sim (Vitest):**
  - The Smelter and the kiln craft.
  - Each tier-aware machine picks its recipe by input.
  - A machine fed both tiers makes both kinds, never mixing inside one craft.
  - Assemblers make steel rounds from steel parts.
  - Stage machines tag tiered rounds.
  - A tiered round's damage is ×1.6 on direct hits, Shards, Bursts, Bomblets, mines and burn, and is otherwise identical to its stone version.
  - Hand-crafting unlocks the Smelter and the kiln.
  - The goals.
- **Data:** every tiered round is derived, named and has an icon; references resolve; the Forge group holds both machines.
- **Playwright:** build a Smelter into an arrow line in the sandbox and fire steel arrows; a hover summary showing the tier; review shots.
- **`npm run measure`:** steel against stone, recorded.

## Open questions
None: the interview settled them. The numbers are proposals, tuned in playtest.

## Decisions in this draft (OK them with the approval)
- Tier is a third slot on a round, beside element and shape, and isn't a keyword: talents and relics reach steel rounds by their family, exactly as stone.
- Only one part per family changes tier: the arrowhead, the casing, the plate, and the ley bolt's whole input. Shafts, rope, fuses and ley dust stay shared.
- The ×1.6 multiplies every hit's damage, including Shards, Bomblets and burn, so steel feels stronger everywhere.
- The Smelter and kiln sit in a new **Forge** build-bar group.
- A machine fed both tiers alternates by input order; it never holds one tier back for the other.

## Results
Built in five slices on `claude/062-material-tiers` (docs/plans/062-material-tiers.md). Every criterion above is met;
where the build settled something the spec left open, it is raised below.

- **Tier:** a round's tier is a segment after its base (`arrow+steel+frost`). Rounds, Split Shards and Bomblets carry it
  into the stat path as its own ×1.6 damage step, so direct hits, Shards, Bursts, Bomblets, mines and burn all take it
  once; Pool-bursts and Shatter's Shards take it from their already-multiplied hit. `SAVE_VERSION` stays 14: the save's
  shape didn't change.
- **Machines:** each tier-aware machine lists its tier recipe as a variant and runs whichever set it holds.
- **Measure** (`npm run measure`, tests/measure/tiers.measure.ts, recorded, not tuned): the same pack fights with every
  line's round at steel against stone.
  - Ring 3 (041.8's pack and volley, seeds 1–5): stone 14.1 s mean, steel 9.4 s (67% of stone's time). All cleared, 0 KOs.
  - Ring 4 (061's decent Fire build, seeds 1–20): stone 8.0 s mean, steel 5.5 s (69%). All cleared, 0 KOs.
- **Review shots** in docs/review/062:
  - a Smelter feeding a knapper in a steel arrow line into the intake;
  - a mixed knapper making both arrowheads, its hover showing the steel recipe it runs;
  - a Steel Frost arrow's hover summary and breakdown;
  - a glass bolt in flight;
  - the Forge build-bar group with the Smelter's tip;
  - the tier art, the Smelter and the kiln on the contact sheet.

## Raised after the build (OK them, or say what to change)
Builder decisions the spec didn't settle.

Names and the hover:
- 062.1 Names follow today's casing, where every prefix is capitalised: "Steel Frost arrow", "Glass Homing ley bolt",
  "Steel Fire Cluster bomb" (the spec wrote "Steel frost arrow"). Old names are unchanged.
- 062.2 The hover summary adds "Steel ×1.6 dmg" after the damage and rate. When a summary is too long for its four rows,
  that note is the first thing dropped (the name still says Steel). If it's still too long, a Fire round's burn then
  drops its time ("burns 4.8/s"); the breakdown keeps both. Only the Steel Fire Cluster bomb needs this.

Layout, where the new rows didn't fit:
- 062.3 The Build tab (040) gives a tiered round its stone round's row, its name marked with the known tier ("Frost
  arrow · Steel"). Every round the game has then still fits two columns. A tiered round known without its stone one
  has the row to itself. Its own hover is on the hotbar and inventory.
- 062.4 The crafting menu shows each tab's tier chain (ley-steel, the steel part, the steel round; ley glass and glass
  bolts under Ley) in a second column beside the stone rows. The menu is therefore wider (466 px, was 276), and that
  column stays empty until ley-steel or ley glass has been carried, so early on the panel's right half is bare (026's
  review shots, retaken here and not committed, show it). Sizing the panel to the rows shown would be a follow-up.
- 062.5 To fit the Forge group into the 640 px view, the build bar's cells sit 1 px closer and its groups are 6 px apart
  (they were 12).

Machines and crafting:
- 062.6 Mixing: a machine fed both tiers takes turns, starting after the kind it made last. Before it starts the other
  kind, it waits for the last kind's output to go out; it reads as working while it waits. Its hover shows the recipe
  it is running, or ran last.
- 062.7 Only the plain tier rounds and parts are hand-crafted. Steel or glass rounds with tags (a Steel Frost arrow) come
  from stage machines only: the crafting menu's tagged rows stay on stone rounds.
- 062.8 Ley glass waits for the tube's attunement, as ley dust does. Each machine's build-bar text names its steel or
  glass recipe too ("Chips stone into arrowheads, and ley-steel into steel ones.").

Art and sound:
- 062.9 Each tiered icon is its stone icon in the tier's palette, with a badge in its upper-left corner: a small steel
  ingot, or a glass diamond (tags' badges sit in the lower corners). In flight, each round is its stone projectile
  recoloured. A glass bolt is pale and see-through, which is subtle at game zoom (shot 05). A steel landmine lies armed in steel.
- 062.10 The Smelter's pour and the kiln's roar play once as each starts a craft, not as a loop. Glass bolts fire with
  the ley bolt's sound, since the spec gives a heavier sound to steel only.

Goals and tests:
- 062.11 Every goal needs a waypoint target (051). "Build a Smelter into a line" points at the foundry (its door from
  outside). "Fire steel rounds" points at the intake.
- 062.12 The playtest and Hollows starts count ley-steel as hand-crafted already, as they do every recipe, so
  "Smelt ley-steel" completes at once on those starts.
- 062.13 The e2e builds its Smelter line with `?playtest`, not the sandbox, because the sandbox's room has no foundry to
  build in. The sandbox does give the parts and every tiered round, and its loadout offers them (Vitest).
- 062.14 Measure: ring 4's stone build already clears in 8 s, under 061's 15–30 s band, before steel.
- 062.15 The `?playtest` kit leaves out ley-steel, ley glass and the three steel parts: its bag's first screen was full,
  and new parts pushed its cores out of sight. It still carries the raws they're made from (ley-iron, cinderite, ley dust).
