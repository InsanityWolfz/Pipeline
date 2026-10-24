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
- [ ] Parts:
  - `ley-steel` and `ley-glass`, made by the new machines;
  - `steel-arrowhead`, `steel-casing` and `steel-plate`, the steel versions of today's parts.
- [ ] **Tiered rounds:** steel arrows, steel bombs, steel landmines and glass bolts. Every tagged round has a steel or glass version (`Steel frost arrow`, `Glass homing bolt`, `Steel fire cluster bomb`), derived from data like 029's rounds, so no round is written by hand.
- [ ] Each has its own icon: the stone icon with a steel or glass look (render).

**The tier (data, sim)**
- [ ] A round's **tier** is `stone` (today's rounds) or one material tier: `steel` for arrows, bombs and landmines, `glass` for ley bolts. Tier is separate from the element and shape slots, so a round still holds at most one element and one shape.
- [ ] A tiered round deals ×1.6 the damage of its stone version (a data value per tier, `TIER_DAMAGE`), on every hit it makes: direct hits, Shards, Bursts, Bomblets and mines. That also flows into burn and anything that reads a hit's damage.
  - Its range, speed, radius, fire rate and behaviour are the stone round's.
  - Talents, keywords and relics reach it exactly as they reach the stone round, by family and keyword.
- [ ] The tier shows in the round's name ("Steel frost arrow"), its hover summary and its Shift breakdown (040: the ×1.6 shown as its own step).

**The Smelter and the kiln (data, sim)**
- [ ] **Smelter:** a 1×1 machine. 1 ley-iron + 1 cinderite → 1 ley-steel, in 60 ticks.
- [ ] **Kiln:** a 1×1 machine. 1 ley dust + 1 cinderite → 1 ley glass, in 60 ticks.
- [ ] Both are ordinary build-bar pieces (Shaun: no wing room for now), in a new **Forge** group after Mines.
- [ ] Each is unlocked by hand-crafting its product once at the bench (crafting menu). The rows show once both of its inputs have been carried.
- [ ] `machine-speed` research applies to both.

**Existing machines take either tier, by input (Shaun: the same machines)**
- [ ] The knapper, shaper and plate press each make their stone part as today (the knapper and shaper from stone, the plate press from ley-iron), and their steel part from ley-steel:
  - knapper: 1 ley-steel → 2 steel arrowheads
  - shaper: 1 ley-steel → 1 steel casing
  - plate press: 1 ley-steel → 2 steel plates
- [ ] The focuser makes ley bolts from ley dust, as today, and 4 glass bolts from 1 ley glass.
- [ ] The assembler, packer and mine packer make steel rounds when their tier part is a steel part (steel arrowhead, steel casing, steel plate), in the same counts as stone. The other inputs (shafts, rope, fuses, ley dust) are shared.
- [ ] **Mixing** (Shaun: whatever it was fed):
  - Each craft uses one matching set. A machine holding both tiers makes whichever full set is first in its input order, then the other, so both kinds come out.
  - A machine never mixes tiers inside one craft.
- [ ] Stage machines tag a tiered round like its stone version: a frost rune fed steel arrows makes steel frost arrows, at the same material cost.
- [ ] Rounds of different tiers are different items. An intake entrance's reservoir holds one round kind at a time, as today: it refuses another kind until it's empty. So a line making both kinds into one entrance backs up behind the second kind until the reservoir runs dry. The intended play is one tier per entrance, such as one steel lane in the middle.
- [ ] Hand-crafting: the crafting menu's family tabs gain the steel and glass rows once their tier part is known.
- [ ] A machine's hover shows the recipe it's running now (stone or steel).

**Goals (data)**
- [ ] After "Feed all four entrances" (060), Milestone 2 gains:
  1. "Smelt ley-steel at the bench (C)"
  2. "Build a Smelter into a line"
  3. "Fire steel rounds"

  The last completes on any steel or glass round fired.

**Sandbox (044)**
- [ ] The sandbox gives the new parts and every tiered round, and the loadout panel offers tiered rounds.

**Saves**
- [ ] `SAVE_VERSION` goes up by one if the save's shape changes.

**Art and sound**
- [ ] Vector art (docs/art.md):
  - the Smelter: a small crucible furnace with a pour spout;
  - the kiln: a domed brick kiln with a glowing mouth;
  - their working loops;
  - the icons for ley-steel, ley glass and the three steel parts;
  - the tiered round icons and in-flight looks: steel's darker metal sheen, glass's clear cyan.
- [ ] Sounds: the Smelter's pour and the kiln's roar while working. Steel rounds fire with a heavier version of their family's sound.

**Measure**
- [ ] `npm run measure` records the same decent builds' pack-clear times with steel rounds against stone in rings 3 and 4. Recorded, not tuned.

**Review shots (docs/review/062)**
- [ ] A Smelter feeding a knapper in an arrow line; a mixed line making both kinds; a steel frost arrow's hover summary and breakdown; a glass bolt in flight; the Forge build-bar group.

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
