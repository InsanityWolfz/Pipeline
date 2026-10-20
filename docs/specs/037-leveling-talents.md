# 037: Leveling and the talent tree
status: done

Approved by Shaun in chat, 2026-10-19 ("Approve all 028–037"); open questions settled the same day.

Drafted from Shaun's spec interview (2026-10-19). The XP values, the curve and the node list are starting values in data: they ship as written for the first playtest, and Shaun edits them after.

## Goal
The player earns XP by fighting and exploring: kills (more in outer rings and from champions), bosses, claiming pylons and finding landmarks for the first time. Each level gives one talent point. Points go into a small constellation of 19 talents around a centre start, in five lanes (Arrows, Bombs, Ley, Survival and Tube), with three keystones. Talents give the design's simple stats and boost how ammo behaves. Respec is free at the foundry.

## Design references
- docs/design.md:
  - "Pillars" 1 (no active skills: the tube is the only weapon), 3 (the factory layout is the ability), 5 (combat earns talents; the factory can't farm them) and 6 (offense from the factory, defense from the field)
  - "Combat": "Skill tree" (one character, lanes map to ammo families, take any mix), "Damage types behave differently" (tree nodes build on behaviours) and "Simple stats" (damage, fire rate, move speed, max health, health regen, armor)
  - "Economy and progression": "Combat: leveling | XP and talent points | The skill tree"; gold never buys talent points
  - "Death and tension": level and talents are always kept
  - "Open questions": "Skill tree shape, size, and how the lanes connect". This spec answers it.
- Spec 029 (ammo stages): arrows pierce without limit, ley bolts don't pierce (Shaun's "ley crystals"; the ammo keeps the id `ley-bolt` and the name "Ley bolt"), bombs have no burn and a 48 px blast. Frost (cold) is the only element in Milestone 1. Homing and the 5-shard star split are ley bolt variants, both shapes, so a bolt is one or the other.
- Spec 028 (foundry flow): each entrance fires at its own rate.
- Spec 030 (healing): no free field regen; field regen comes only from gear and talents.
- Spec 032 (champions and landmarks): champions (the death event's `champion` flag), and the `discoveries` event.
- Spec 036 (equipment): `playerStats`, which talents add to.
- docs/brainstorm/2026-10-19-content.md, sections 3 and 4: "Each level gives one talent point… The level is just the pacing clock for the tree"; "Keystones reward mixing ammo, not more of the same, since all-one-ammo already wins"; "Cut: an active-skill bar."
- Interview answers (Shaun, 2026-10-19):
  - Round 1: "Field regen comes only from gear and talents."
  - Round 10: "**XP sources:** kills (scaled by danger ring, more for champions), bosses, claiming pylons and finding landmarks for the first time. Never from the factory."
  - Round 10: "**Per level:** 1 talent point."
  - Round 10: "**Tree:** 15–20 nodes with 3 keystones, one small constellation from a centre start. Lanes are Arrows, Bombs, Ley, Survival and Tube. It grows with each region."
  - Round 10: "**Respec:** free, at the foundry."
  - Round 11: "**Keystones:** lane capstones and combos between ammo. 'Arrows pierce infinitely' cannot be one of them." Settled 2026-10-19: unlimited arrow pierce is now the base rule (029), so no node touches pierce.
  - Round 11: "**Boss refights:** yes, at an altar."

## Acceptance criteria

**XP (sim, data)**
- [ ] The player has `level` (starting at 1), `xp` (toward the next level) and `talentPoints` (unspent).
- [ ] A kill gives the enemy's `xp` × its ring's multiplier, and × `CHAMPION_XP` for a champion. Any kill counts, by ammo or by the punch.
- [ ] A boss kill gives the boss's `xp`. A refight at the altar (034) gives `BOSS_REFIGHT_XP`, 50%, of it.
- [ ] Claiming a pylon gives `CLAIM_XP`, once per pylon (claims are permanent).
- [ ] The first discovery of each landmark (032's event) gives `LANDMARK_XP`, once per landmark.
- [ ] Nothing else gives XP: crafting, building, identifying, banking, depositing, supply, research and gold never do. A test asserts this by running the foundry for a long stretch.
- [ ] When `xp` reaches the curve's value for the current level, the level rises by 1, `talentPoints` rises by 1, the leftover XP carries over, and a level-up event is recorded. One big gain can raise several levels.
- [ ] At `LEVEL_CAP`, XP stops counting and the bar shows full.
- [ ] Death never loses level, XP or talents (design: level and talents are kept).

**Starting values (data, all flagged for playtest)**

| Source | XP |
| --- | --- |
| Husk | 5 |
| Wisp | 6 |
| Pylon Warden (first kill) | 150 |
| Charger, Burrower, Shardback, Sniper construct (035) | 6 each |
| The Bulwark (034, first kill) | 300 |
| A boss refight at the altar | 50% of the boss's XP |
| Ring multiplier | ring 0 ×1 (no packs today), ring 1 ×1, ring 2 ×2, ring 3 (Region 2) ×3, so a Region 2 enemy gives 18 |
| Champion | ×3 |
| Claiming a pylon | 50 |
| A landmark's first discovery | 25 |

- [ ] `XP_CURVE` lists the XP needed for each level: 40, 70, 100, 130, 160, 200, 240, 280, 330, 380, 440, 500, 570, 650 (level 1→2 first). `LEVEL_CAP` is 15 for now, raised as each region adds nodes, so 14 points against 19 nodes: a full build skips about five.
- [ ] Rough pacing check, for the playtest to confirm: the tutorial, the shrine region, four landmarks, one claim and the Warden come to about 900 XP, which is level 7. Region 2 up to the Bulwark reaches about level 12.

**The tree (sim, data)**
- [ ] The tree is data: `TALENTS`, each node with an id, name, lane, kind (`minor` or `keystone`), position for the panel, the ids it links to, and its effect as data. One point per node. The centre start is always taken and costs nothing.
- [ ] A node can be taken when the player has a point, it isn't taken yet, and it links to a taken node. Taking it records a talent event.
- [ ] Talent effects add into 036's `playerStats`. Ammo-behaviour boosts change the values 029's systems read (freeze hits, blast radius, homing turn, shard count, lob time) through the same stats.
- [ ] No node is an active skill, a new key, or a new way to fire. No node changes the foundry: production, machine speed, reservoir size and refill stay with the factory and research.
- [ ] The node list, kept as written for the first playtest (Shaun edits it after):

| Id | Lane | Name | Effect | Links to |
| --- | --- | --- | --- | --- |
| start | centre | Attunement | none | A1, B1, L1, T1, S1 |
| A1 | Arrows | Fletcher's Eye | arrow damage +10% | start, A2 |
| A2 | Arrows | Quick Nock | arrow fire rate +10% | A1, A3 |
| A3 | Arrows | Rimecraft | frost arrows freeze after 1 fewer hit, and the freeze lasts +0.5 s | A2, K1, K2 |
| B1 | Bombs | Black Powder | bomb damage +10% | start, B2 |
| B2 | Bombs | Wide Casing | blast radius +15% (48 → 55 px) | B1, B3 |
| B3 | Bombs | Short Fuse | bombs reach their target 25% sooner | B2, K1 |
| L1 | Ley | Attuned Crystal | ley bolt damage +10% | start, L2 |
| L2 | Ley | Seeker's Lens | homing ley bolts turn 30% sharper | L1, L3 |
| L3 | Ley | Splinter | star ley bolts burst into 7 shards, not 5 | L2, K2 |
| T1 | Tube | Oiled Breech | fire rate +8%, all ammo | start, T2 |
| T2 | Tube | Steady Grip | the walk slow while firing eases from ×0.7 to ×0.8 | T1, T3 |
| T3 | Tube | Hard Bore | damage +6%, all ammo | T2, K3 |
| S1 | Survival | Tough Hide | max health +15 | start, S2 |
| S2 | Survival | Mending | health regen +0.5 HP/s (field regen; the highest healing rate wins, 030, so it never adds to safe-spot healing) | S1, S3 |
| S3 | Survival | Braced | armor +3 | S2, S4 |
| S4 | Survival | Fleet | move speed +5% | S3 |
| K1 | Arrows–Bombs | Blastfletch (combo keystone) | a bomb's blast leaves its area charged for 20 ticks; an arrow flying through it gains +50% damage and bursts in a 24 px blast on the next enemy it hits, which spends the charge (the arrow keeps piercing) | A3, B3 |
| K2 | Arrows–Ley | Shatterpoint (combo keystone) | a ley bolt that hits a frozen enemy ends the freeze for double damage, and 4 ice shards burst from it for 50% damage each | A3, L3 |
| K3 | Tube | Overpressure (lane capstone) | holding fire ramps the fire rate up to +25% over 2 s; it resets when fire is released | T3 |

  That's 19 nodes plus the start, three of them keystones: two combos, since keystones should reward mixing ammo, and one capstone. Shatterpoint needs frost arrows (029) and stays as a goal to build toward.
- [ ] No damage type other than physical and cold (frost) appears, and no node touches pierce: arrows already pierce without limit (029), and ley bolts never pierce.

**Respec (sim)**
- [ ] A `respec` command, only while the player is in the foundry, clears every talent but the start and returns all points. It's free and records a respec event.
- [ ] Points can be spent anywhere, even mid-trip. Only respec needs the foundry.

**Render, art**
- [ ] **XP bar:** a thin bar under the HP bar (031) with "Lv 7". No "+XP" popups on kills (the playtest found popups cluttered); the bar fills with a small tick instead.
- [ ] **Level up:** a cyan ring flash on the player, a chime, and a short line "Level 7 · talent point (T)".
- [ ] **Tree panel** on **T**, closed with T or Esc, like the other panels. It doesn't pause the game, so opening it mid-fight is a risk rather than a safe pause:
  - The constellation centred, with five lanes radiating from the start: Arrows up, Ley up-right, Tube down-right, Survival down-left, Bombs up-left. The combo keystones sit between their lanes, and Overpressure at the Tube lane's tip.
  - Taken nodes glow cyan, nodes that can be taken have a bright outline, and the rest are dim. Links between taken nodes glow. Keystones are larger rune-stones.
  - Hovering a node shows its name and effect. Clicking an available node takes it.
  - A header shows the level, XP and unspent points. "Reset talents (free)" shows only in the foundry.
  - A small pip on the HUD shows when points are unspent.
- [ ] Keystone effects: a charged blast area shimmer for Blastfletch, an ice burst for Shatterpoint, and a heat shimmer on the tube as Overpressure ramps.
- [ ] Panel art, node icons and sounds are vector data and generated sounds, pending Shaun's review.

**Hook**
- [ ] `getState()` gains `level`, `xp`, `xpToNext`, `talentPoints`, `talents` (taken ids), the Overpressure ramp, and XP, level-up, talent and respec events. Commands: `takeTalent(id)` and `respec`.

**Docs (on approval)**
- [ ] docs/design.md, "Skill tree": "one big tree branching in every direction" becomes a small constellation from a centre start (15–20 nodes, 3 keystones), growing with each region. The lanes are Arrows, Bombs, Ley, Survival and Tube (the knife lane example goes until knives exist). Keystones are lane capstones and combos between ammo. Respec is free at the foundry.
- [ ] docs/design.md, "Economy and progression": the XP sources, never from the factory.
- [ ] docs/design.md, "Open questions": "Skill tree shape, size, and how the lanes connect" is closed. Shaun approves the wording.

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass. Sprites and sounds are pending Shaun's review.

## Data changes
- `src/data/leveling.ts` (new): `XP_CURVE`, `LEVEL_CAP`, `RING_XP`, `CHAMPION_XP`, `CLAIM_XP`, `LANDMARK_XP`, `BOSS_REFIGHT_XP`.
- `src/data/enemies.ts`: an `xp` value on every enemy, including 034's Bulwark and 035's four.
- `src/data/talents.ts` (new): `TALENTS` (the table above, with panel positions), the keystone tuning (charge ticks, damage scales, burst radius, shard count, ramp ticks and cap) and the lane colours.
- `src/data/hudLayout.ts`: the XP bar and the tree panel layout.
- Sprites: node and keystone frames, lane icons, the level-up ring and the three keystone effects. Sounds: level up, take talent, respec.
- New sim files: `src/sim/leveling.ts` (XP and levels) and `src/sim/talents.ts` (taking, respec, effects into `playerStats`), with keystone rules in `src/sim/keystones.ts`.

## Out of scope
- Active skills, alt-fire and overcharge (cut or deferred).
- Max health or other stats per level: a level gives only a point.
- Nodes for Milestone 2 ammo (fire, lightning, cluster bombs, landmines). The tree grows with each region in later specs.
- Talents that change the foundry, reservoirs or refill.
- Diminishing XP from weak enemies at high level.

## Test plan
- **Vitest:**
  - Kill XP for a Husk in rings 1 and 2, a champion, and the Warden; a claim and a landmark discovery give XP once each.
  - Running the foundry, crafting, identifying and depositing for a long stretch gives no XP.
  - Level-ups at the curve's values, with carry-over and several levels from one gain; the cap.
  - Taking a node needs a point and a taken neighbour; the start is always taken.
  - Each minor node's stat reaches `playerStats` or the 029 value it changes.
  - Blastfletch charges an arrow through a blast; Shatterpoint bursts on a frozen enemy only; Overpressure ramps and resets.
  - Respec works only in the foundry and returns every point.
  - A KO keeps level, XP and talents. Determinism.
- **Playwright:** with a playtest start, kill Husks until a level-up, open the panel with T, take a node, check `getState()`, then respec in the foundry.
- **Screenshots:** the tree panel with taken, available and dim nodes, the XP bar, and the level-up flash.

## Open questions
None. Settled by Shaun, 2026-10-19 (see docs/brainstorm/2026-10-19-open-questions.md).

## Raised after the build (for Shaun at playtest)
- **Shatterpoint's ice shards are physical.** The spec says only "4 ice shards for 50% damage". Making them cold would chill, and with Rimecraft freeze, nearby enemies, which the next ley bolt shatters again: a self-feeding chain. Cold is a one-line data change if Shaun wants it.
- **Boss refight XP** (50%) comes only from an altar summon. Killing the Warden again after a KO gives no boss XP.
- **Choices the spec didn't make:**
  - the Blastfletch charged burst hits for the charged arrow's damage
  - Rimecraft's +0.5 s also lengthens a boss's freeze
  - Fleet's move speed can go past the gear move cap
  - fire-rate bonuses round to whole ticks, so +8% is +7% on arrows, +5% on ley bolts and +8% on bombs
- **Art:** lane colours, the tree art and the new sounds wait on Shaun's approval (docs/review/037).
- **Blastfletch is hard to trigger with carried ammo alone.** Carried arrows and bombs share one cooldown (40 ticks after a bomb), and a short bomb flight's 20-tick charge often runs out before the next arrow can fire. It works naturally with a two-entrance volley of bombs and arrows. Shaun may want a longer charge.
