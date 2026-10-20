# 029: Ammo roles and stage machines (Milestone 1)
status: done

Approved by Shaun in chat, 2026-10-19 ("Approve all 028–037"); open questions settled the same day.

## Goal
The three beginner ammo get distinct jobs:
- Arrows pierce.
- Ley bolts hit hard without piercing.
- Bombs burst wider with no burn.

Then the foundry gains its first stage machines. A stage takes finished rounds plus a little material and adds a tag:
- the frost rune makes cold arrows, which slow and then freeze
- the ley guide makes homing ley bolts
- the shatter lens makes ley bolts that burst into a five-shard star on hit

Each stage is hand-applied once at the bench before it can be built. The frost rune's material, the rime shard, comes from a small guarded Frozen Grotto added here.

Depends on 028 (hoppers fed by lines, entrances at their own rate).

## Design references
- docs/design.md:
  - "Pillars" 2 (manual first, then automated), 3 (every extra projectile costs real materials) and 4 (emergence from composable stages)
  - "Combat" ("Damage types behave differently": "Cold slows, then freezes after enough hits"; "Ley-guided ammo locks onto a selected target")
  - "The Foundry" ("A hardening stage adds pierce, a ley guide adds homing"; "Unlocks. Crafting something by hand once unlocks the machine that makes it.")
- docs/prototype.md: "Content list" (the beginner ammo table)
- docs/specs/005-hand-crafting.md, 006-foundry-building.md: recipes, machines, unlock by hand-crafting
- docs/specs/010-armor.md: the identification bench, whose menu gains stage rows
- docs/specs/018-believable-resources.md: nodes where they make sense
- docs/specs/024-intake-spread.md: the volley fan
- docs/brainstorm/2026-10-19-content.md, section 7: "Stage machines take finished ammo and add a tag. Tags are data, so combinations emerge without new code."
- Interview answers (Shaun, 2026-10-19, docs/brainstorm/2026-10-19-interview.md):
  - R2, stage cost: "yes, a small material input as ammo passes through (e.g. 1 stone per 4 arrows)."
  - R2, roster:
    - Arrows: "good pierce damage. Physical, and pierces", with a cold variant that "slows, then freezes".
    - Bombs: "As now, but remove the burn for now."
    - Ley crystals: "Physical, does not pierce (arrows and ley swap their pierce)", with "homing crystals, and a shatter crystal that splits into 5 small shards in a star pattern on hit".
  - R3, bombs: "burn is removed, and the blast radius grows from 32 to about 48 px."
  - R3, Milestone 1: arrows (pierce); ley crystals (no pierce, easy aim) with homing and the 5-shard star split; bombs (48 px, no burn); the frost rune for arrows.
  - R3, variants: "made by in-line stage machines … Each round takes at most one element stage and one shape stage."
  - R4, stage unlock: "hand-apply a frost rune to an arrow at the bench once, and the frost stage unlocks in the build bar."
  - R4, frost input: "a frost crystal ('rime shard') gathered at a landmark such as a frozen Ley Grotto."
  - R6, landmarks: "a Frozen Grotto, the guarded rime-shard source"; "Map: fixed and hand-tuned."
  - R11, keystones: "'Arrows pierce infinitely' cannot be one of them." Settled 2026-10-19: arrows pierce without limit as their base rule, so it is never a talent.

**Decision: the Frozen Grotto.** A minimal Frozen Grotto ships in this spec, not in 032, so the frost rune can be fed the day it ships. R1's build order puts stages (2nd) three slots before landmarks (5th). Here the Grotto is just:
- a fixed place on the map
- rime-shard nodes
- a hand-placed guard pack

032 later folds it into the landmark system (hidden until found, minimap reveal, discovery XP) without moving it.

## Acceptance criteria

**Ammo roles (data, sim)**
- [ ] Arrows pierce and ley bolts don't: the two swap today's `pierce` flag.
  - Arrows pierce without limit. An arrow passes through every enemy in its path until its range runs out or it hits a solid (or a shield's front, 034).
  - Ley bolts don't pierce: a ley bolt stops in the first enemy it hits.
  - Each enemy is still hit once per shot.
- [ ] The ammo id stays `ley-bolt` and its name stays "Ley bolt" (the raw keeps "Ley crystal"). The item and recipes are unchanged. Its variants are "Homing ley bolt" and "Star ley bolt".
- [ ] Bombs lose their burn, and `burstRadius` goes from 32 to 48 px. A bomb's damage type becomes `physical` until the fire rune. Burn is removed from the sim and data: `burn` on lob ammo, enemy `burnTicks` and `burnAmmo`, `src/sim/burn.ts`, and the burning flame in render. The fire rune (Milestone 2) brings fire's behaviour back as a tag.

**Tags (data)**
- [ ] Tags are data in `src/data/tags.ts`. Each has:
  - an id
  - a slot: `'element'` or `'shape'`
  - a name prefix
  - the base ammo it applies to
  - its behaviour's numbers
- [ ] Milestone 1's tags:

  | Tag | Slot | Applies to | Prefix | Behaviour |
  | --- | --- | --- | --- | --- |
  | `frost` | element | arrow | Frost | cold: slows, then freezes |
  | `homing` | shape | ley-bolt | Homing | locks on and steers |
  | `star` | shape | ley-bolt | Star | 5-shard star on hit |

- [ ] A round is its base ammo plus at most one element tag and at most one shape tag. Its id is the base and its tags, elements first: `arrow+frost`, `ley-bolt+homing`, `ley-bolt+star`. The item and ammo entries for every legal combination are derived from the tag data, not written by hand. Each is named from its prefixes: "Frost arrow", "Homing ley bolt", "Star ley bolt".
- [ ] An element tag sets the round's damage type (frost → `cold`, a new `DamageType`). A tagged round otherwise keeps its base's damage, speed, range, pierce and `fireTicks`.

**Stage machines (data, sim)**
- [ ] Stages are data in `src/data/stages.ts`. Each has:
  - an id, name and description
  - its tag
  - the batch (rounds per craft)
  - its material and the count per batch
  - `craftTicks`
  
  Each stage is a 1×1 machine in the build bar's group for its base ammo (026): the frost rune under Arrows; the ley guide and the shatter lens under Ley.
- [ ] Milestone 1's stages (starting values):

  | Stage | Tag | Takes per batch | Gives | craftTicks |
  | --- | --- | --- | --- | --- |
  | Frost rune | `frost` | 4 arrows + 1 rime shard | 4 frost arrows | 60 |
  | Ley guide | `homing` | 4 ley bolts + 1 ley crystal | 4 homing ley bolts | 60 |
  | Shatter lens | `star` | 4 ley bolts + 2 ley crystal | 4 star ley bolts | 60 |

  The shatter lens costs twice the ley guide's crystal because a star bolt adds 5 projectiles (pillar 3).
- [ ] A stage takes a round from any side but its front when:
  - the round is of its base ammo,
  - the round has no tag in the stage's slot, and
  - its buffer is empty or holds that same round kind.
  
  It takes its material from any side but its front. Anything else is refused, so the line backs up. Its buffers are capped like a machine's.
- [ ] With a full batch and its material buffered, a stage crafts for `craftTicks`. It then hands the rounds out of its front with its tag added. Its status (working, starved, blocked) shows as other machines' does. Each batch counts in `events.made` and the `machineMade` tally under the tagged id.
- [ ] A shape stage refuses a round that already has a shape: a star ley bolt can't go through a ley guide. Homing and star are both shapes, so a ley bolt is homing or star, never both.

**Hand-apply first (sim, render)**
- [ ] The identification bench's menu gains a "Stages" section with one row per stage: "Frost rune: 4 arrows + 1 rime shard → 4 frost arrows".
  - Rows appear once the shrine is claimed.
  - A row is dimmed while its inputs aren't held, like crafting rows (026). Held means carried plus the rounds of that ammo in the intake's entrances (Shaun, 2026-10-20, option A below).
- [ ] Choosing a row takes its inputs, carried rounds first and then the intake's entrances west to east (option A below), and gives the tagged rounds. It also marks the tagged item as hand-made (`crafted`), which unlocks that stage in the build bar by the existing rule: a machine unlocks once its output has been hand-crafted.
- [ ] Hand-applying works any number of times, like hand-crafting.
- [ ] `?playtest` starts with every stage unlocked and 99 rime shards, as it does for other items.

**Tagged rounds in the tube (sim)**
- [ ] An entrance accepts a tagged round under 024's rule: it takes any ammo while empty, then only that exact round kind until it empties. So frost arrows and plain arrows need separate entrances.
- [ ] Rounds that fire together fan or space out by **base** ammo. A plain arrow and a frost arrow from two entrances fly at ±7.5°.
- [ ] Carried tagged rounds fire from their base ammo's hotbar slot. With the slot selected, carried tagged rounds of that base fire before plain ones.

**Cold (sim, data)**
- [ ] Each cold hit on an enemy adds a chill stack, up to `COLD.stacksToFreeze`, and refreshes the chill for `COLD.stackTicks`.
  - Each stack slows the enemy's movement by `COLD.slowPerStack`.
  - When the chill runs out, the stacks drop to 0.
- [ ] On the hit that reaches `COLD.stacksToFreeze`, the enemy freezes for `COLD.freezeTicks`. A boss freezes for `COLD.bossFreezeTicks` instead.
  - A frozen enemy doesn't move or attack.
  - A wind-up in progress pauses and resumes when it thaws.
  - It still takes damage and, if not a boss, knockback.
- [ ] After a freeze, the enemy can't gain stacks for `COLD.refreezeTicks`, so steady frost fire can't hold it frozen for good.
- [ ] Starting values, tuned in playtest:

  | Value | Start |
  | --- | --- |
  | slowPerStack | 0.15 |
  | stacksToFreeze | 4 |
  | stackTicks | 120 (2 s) |
  | freezeTicks | 90 (1.5 s) |
  | bossFreezeTicks | 45 |
  | refreezeTicks | 120 |

**Homing (sim, data)**
- [ ] When a homing round fires, it locks onto the living enemy nearest the cursor within `HOMING.lockRadius` px of the cursor, in the player's room. With none there, it flies straight.
- [ ] Each tick it turns toward its target by at most `HOMING.turnDegrees`, keeping its speed and range. If the target dies or is gone, it flies on straight.
- [ ] Starting values: `lockRadius` 64 px, `turnDegrees` 4 per tick.

**Star split (sim, data)**
- [ ] When a star round hits an enemy, it is spent as usual. From the hit point it bursts into `STAR.shards` shards, `360 / shards` degrees apart, the first along its flight.
- [ ] Each shard:
  - flies `STAR.range` px at `STAR.speed`
  - deals `STAR.damage` physical damage
  - can't hit the enemy that was struck
  - doesn't pierce or split again
  - stops at walls
- [ ] A star round that hits a wall or runs out of range doesn't split.
- [ ] Shards are a projectile in data, not an item.
- [ ] Starting values: 5 shards, 4 damage each, 64 px range, 360 px/s.

**Frozen Grotto, minimal (data, sim)**
- [ ] A new raw, `rime-shard` ("Rime shard"), and a node type, `rime-cluster` ("Rime cluster"), with:
  - a new placement, `'frozen-grotto'`
  - the usual uses, yield and regrowth (018)
- [ ] The Frozen Grotto is a hand-placed site in the overworld's north-west, in ring 2, at these tiles (034 may shift every tile by +40 for Region 2):
  - **Area:** about tiles (9, 5)–(19, 13), kept as a clearing.
  - **Ground:** a frosted look.
  - **Rime clusters:** three, at (12, 7), (16, 8) and (14, 11).
  - **Path:** two tiles wide, from the west path's end at (12, 27) north to (14, 14). That end becomes a fork: 034 continues the road west to the Region 2 barrier, and 030's west spring sits just south of it.
- [ ] A guard pack in its own group, `grotto`, holds it: 3 Husks and 1 Wisp, placed by hand. They come back on a KO's world reset, as the shrine's guards do before its claim. It has no pylon and can't be claimed.
- [ ] Every rime cluster is reachable on foot from the wake tile (a data test on the generated map).

**Goals (data)**
- [ ] These are appended to the Milestone 1 chain (028), before the frontier line:
  1. "Gather rime shards at the Frozen Grotto": `gathered ['rime-shard']`
  2. "Apply a frost rune to arrows at the bench": `crafted ['arrow+frost']`
  3. "Build a frost rune into your arrow line": `machineMade 'arrow+frost'`, which pulses the frost rune cell
  4. "Try a ley stage at the bench: homing or star": a new check, `craftedAny`, with the two ley variants
  
  Built with this wording; Shaun may edit the text later, as data.

**Render**
- [ ] Vector art, in the 020 style, for:
  - the three stage machines (idle, working and jammed)
  - the rime shard icon
  - the rime cluster and its depleted stages
  - the Grotto's frosted ground
  
  Shaun approves all of it by eye.
- [ ] Projectiles:
  - a frost arrow has a pale ice tint and a short frost trail
  - a homing ley bolt has a bright cyan trail that shows it bending
  - star shards are small cyan slivers with a burst flash
- [ ] Enemies:
  - a chilled enemy is tinted blue, deeper with each stack
  - a frozen one is encased in ice, then cracks free
  - generated sounds play for a freeze and a star burst
- [ ] The bench menu's Stages section uses the menu style from 026, with names on every row.

**Docs (on approval)**
- [ ] docs/design.md:
  - "Damage types": cold is now in the game, as written. Add a note that bombs have no burn until the fire rune.
  - "The Foundry": "A hardening stage adds pierce" → arrows pierce on their own. Stages add one element and one shape tag at most, at a small material cost per round.
  - "Unlocks": stages unlock by hand-applying once at the bench.
- [ ] docs/prototype.md, the ammo table:
  - arrows: "pierces"
  - bombs: "a small explosion" instead of "fire burst"
  - ley bolts: "does not pierce"

**Hook**
- [ ] `getState()` reports:
  - each shot's ammo id, including tags
  - each enemy's chill stacks and frozen ticks
  - stage machines among the pieces, with status
  - entrances holding tagged ids
  - which stages are unlocked

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass.
- [ ] Burn tests are removed along with burn, each one listed in the PR. Pierce tests are rewritten for the swap.

## Data changes
- `src/data/ammo.ts`:
  - `pierce` stays a boolean, swapped: arrow `true` (no limit), ley-bolt `false`
  - bomb `burstRadius` 48, no `burn`, damage type `physical`
  - `DamageType` gains `cold`
  - tagged variants derived from tags
- `src/data/tags.ts` (new): `frost`, `homing` and `star`, with `COLD`, `HOMING` and `STAR`.
- `src/data/stages.ts` (new): `frost-rune`, `ley-guide` and `shatter-lens`.
- `src/data/pieces.ts`: the three stages in `PIECES` and `BUILD_BAR`.
- `src/data/items.ts`: `rime-shard`, plus the derived tagged items.
- `src/data/nodes.ts`: `rime-cluster` and the `'frozen-grotto'` placement.
- `src/data/overworld.ts`: the Grotto's area, clearing, path, nodes and `grotto` guard pack.
- `src/data/objectives.ts`: the four goals and `craftedAny`.
- `src/data/playtest.ts`: covers rime shards and the stage unlocks through the existing derivations.
- Art and sound data as above.

## Out of scope
- **Milestone 2 stages:** the lightning and fire runes and the static-pool bomb (later specs). Cluster bombs and landmines come with 034; the laser is parked (R11).
- **The Splayer**, the Hardener and the Refiner.
- **A "Heavy" arrow shape.** That means no shape stage for arrows or element stage for ley bolts in Milestone 1, so no round combines both slots yet. The rule is enforced and tested regardless.
- **The full landmark system** (032): discovery, minimap reveal, XP for finding the Grotto, Ley Grottos as claimable resource sites, a rime-shard supply port.
- **Talent nodes** that build on cold (037).
- **Tagged recipes in the C crafting menu**, which has no scroll (known limit, 026).
- **Ascension or Ruined Cache rewards** for stages.

## Test plan
- **Vitest:**
  - Ammo roles:
    - An arrow passes through a line of 5 Husks, hitting each once, and stops only at its range or a solid.
    - A ley bolt stops in the first.
    - A bomb hits a Husk 40 px away and misses one 56 px away.
    - Nothing burns.
  - Tags:
    - Every derived id is legal.
    - A second element or second shape is refused.
    - Names come from prefixes.
    - The damage type follows the element.
  - Stages:
    - The frost rune makes 4 frost arrows from 4 arrows and 1 rime shard in 60 ticks.
    - It refuses ley bolts and frost arrows.
    - It starves without rime and backs up the line when blocked.
    - The ley guide refuses star bolts.
  - Hand-apply:
    - A bench row takes its inputs and gives the rounds.
    - The stage is locked in the build bar before and unlocked after.
    - Rows are hidden before the shrine claim.
  - Cold:
    - 3 hits slow a Husk by 45%.
    - The 4th freezes it for 90 ticks; a boss freezes for 45.
    - A wind-up pauses and resumes.
    - No stacks are gained during the refreeze window.
    - Chill expires after 120 ticks.
  - Homing:
    - A round locks onto the enemy nearest the cursor and curves in.
    - With nobody in the lock radius, it flies straight.
    - It flies straight after its target dies.
  - Star:
    - A hit spawns 5 shards 72° apart.
    - The struck enemy isn't hit by them.
    - A wall hit spawns none.
  - Volley:
    - A plain arrow and a frost arrow from two entrances fan at ±7.5°.
    - Carried frost arrows fire before plain arrows.
  - Grotto:
    - Rime clusters drop rime shards.
    - The guards are in group `grotto` and come back on a KO.
    - The reachability test passes.
- **Playwright:** from `?playtest`, hand-apply the frost rune at the bench, see `frost-rune` unlocked, build arrow line → frost rune (with a rime-shard hopper) → intake, fire at a Husk until `getState()` shows it frozen.
- **Screenshots:**
  - the three stage machines working
  - a frozen Husk
  - a homing bolt mid-curve
  - a star burst
  - the Frozen Grotto
  - the bench's Stages section

## Open questions
None. Settled by Shaun, 2026-10-19 (see docs/brainstorm/2026-10-19-open-questions.md).

## Raised after the build (for Shaun at playtest)
- **Husks can't be frozen at these numbers.** Freezing takes 4 chill stacks, and each frost arrow does 10 damage against a Husk's 40 HP, so the 4th hit kills it instead. Only the Pylon Warden lives long enough to freeze. The numbers are built as specified, and the e2e freezes the Warden instead of a Husk. Shaun to choose the fix: freeze after 3 stacks, less frost-arrow damage, or leave it.
- **Choices the spec didn't make, for Shaun to confirm:**
  - frozen enemies' attack cooldowns keep counting down
  - hand-applying a stage needs the bench in reach
  - the hotbar count includes tagged rounds
  - a frost hit that kills doesn't freeze
- **Art** for the stage machines, rime and the Grotto waits on Shaun's approval by eye (docs/review/029/).
- **Which stores the Stages panel counts (Shaun's bug, 2026-10-20; fix built on `claude/fix-stages-count`, PR #27). Answered: Shaun approved option A, as built ("approve everything", 2026-10-20); the criteria above now say so.** Shaun saw "0/4 arrows" with arrows in an intake entrance and in the inventory. The acceptance criteria above say a row is dimmed while its inputs aren't *carried*, and that applying takes them *from the inventory*. So the panel counted the inventory only, and it already counted carried plain arrows. **Likely cause of "0/4":** Shaun carried frost (tagged) arrows. They show in the arrow hotbar slot and in the inventory panel, but the frost rune row takes plain arrows, and the entrance's arrows didn't count. Changing what counts is a design choice, so it's Shaun's. Choose one:
  - **Option A, as built (recommended): count carried + entrances.**
    - (a) A row's held count is carried rounds plus the rounds of that ammo in the intake's entrances (`stageHeld`, src/sim/stages.ts). Its counts and dimming read this.
    - (b) Applying a stage spends carried rounds first, then takes the rest from the entrances, west to east. So it can drain rounds the tube would otherwise fire. The bench and the intake are both in the foundry, so this reads as taking from the factory you're standing in.
    - (c) The output's owned count (the number under the tagged round) also includes rounds in the entrances, e.g. frost arrows already loaded. Alternative: owned stays carried only.
    - (d) Closed (capped) entrances: they can't hold rounds today. An entrance only takes rounds while open, and once restored it never closes. So it makes no difference that they count. If a later spec lets an entrance close while holding rounds, proposal: they keep counting.
    - Why recommended: it matches what Shaun expected, and the code is ready.
  - **Option B: carried only (the spec as written).** Revert the count and spending to the inventory. Make the panel say so: label the counts "carried", and name the input "Plain arrow" (or show "0/4 plain" next to the tagged count), so frost arrows in the bag don't read as usable.
  - Either way, hoppers, crates and the stash don't count. Proposal: settle that in the spec that moves stages into the crafting menu (playtest notes 6 and 15), which also decides where applying draws from.
