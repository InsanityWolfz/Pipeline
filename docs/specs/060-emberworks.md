# 060: Region 3: the Emberworks and the Forgewright
status: approved

Approved by Shaun in chat, 2026-10-22 ("Approve 60"), with the draft's listed decisions.

Drafted from Shaun's region brainstorm and spec interview (docs/brainstorm/2026-10-22-region-3.md), 2026-10-22.

## Goal
Beating the Bulwark opens a third ring up the cliffs past the Hollows: the Emberworks, the builders' smelting terraces, where ley still feeds the old forges.

In the Emberworks the player:
- gathers cinderite at the Cinder Vents while they flare open
- claims the Ash Kilns' pylon, which sends cinderite home
- unlocks the **Fire rune**: any round burns, and a burning enemy that dies passes its burn on
- fights the **Forgewright**, a plated smith construct that has to be vented by breaking both its bellows at once

The Forgewright's core restores the intake's fourth entrance. Two new talents pay off Fire.

This is the first of three Region 3 specs:
- 061 brings the region's four enemies; until then the Emberworks has no packs.
- 062 brings the material tiers: the Smelter (ley-iron and cinderite into ley-steel), the kiln (glass bolts), and steel and glass rounds.

## Design references
- docs/design.md:
  - "World, regions, ley lines, bosses": difficulty by distance; claiming; "Regional pull"; "Boss gates" ("each boss unlocks ... the next region ... and drops the cores for top-tier machines and stages"); the world is round, each region a ring round the last.
  - "The Foundry", "The layout is the ability": "each boss core restores one more: the Warden's the 2nd, the next boss's the 3rd, later bosses' the 4th and 5th." Element stages tag any ammo family.
  - "Combat", "Damage types behave differently": "Fire burns over time and spreads to nearby enemies." "Bombs deal physical damage with no burn until a fire rune brings fire back."
  - "Combat", "Bosses are engineering puzzles": "twin cores that must be hit at once (a two-stream line at the right angle) ... raw throughput is always a slower but valid answer."
  - "Combat", "Keywords": a new keyword needs a rules template, its numbers in data, at least one source and at least two payoffs.
  - "Combat", "Skill tree": "15–20 nodes ... growing with each region."
  - "Theme rule": everything fits the lost civilisation and its ley lines.
- docs/specs/034-stonefall-hollows.md: the region pattern (barrier, landmarks, claimable site, boss, altar refights).
- docs/specs/053-round-world.md: the round world; each region a ring.
- docs/specs/055-boss-doors-rimestone.md: walled arenas with a door, E in and out.
- docs/specs/029-ammo-stages.md and 039-keyword-system.md: stages, tags, keywords and the new-keyword rule.
- docs/specs/041-balance.md: ring multipliers; docs/specs/042-shippable-build.md: the end-of-demo card.
- docs/specs/048-volley-shape.md: the symmetric fan of lanes.

## Acceptance criteria

**The ring (data, sim)**
- [ ] The world grows by a third ring, the Emberworks, as wide as the Hollows (31 tiles): from the Hollows' outer radius (79) out to about 110 tiles from the foundry's door. `WORLD_SHAPE.size` grows to fit (about 230), and every existing tile keeps its place relative to the centre.
- [ ] The Hollows' ragged cliff edge stays as cliffs, except for a few ramps up through it (count and bearings in data). Past the Emberworks, the ground rises into a new ragged cliff edge, never a bare wall.
- [ ] The terrain is generated from the map's seed with Emberworks settings, the same every run: ash-grey ground, terraced kilns and chimneys that block feet and straight shots, rust-orange glow with cyan ley.
- [ ] The Emberworks is danger ring 4: `ringOf` returns 4 anywhere in it. `RING_SCALE[4]` is ×4 health and ×4 damage. `RING_XP[4]` is 4.
- [ ] The road network (053) runs up the ramps to the Ash Kilns, the Cinder Vents and the Anvil Hall.
- [ ] Every landmark in the Emberworks is reachable on foot from each ramp once the barrier is down; the flood-fill test covers them.
- [ ] No packs spawn in the Emberworks (061 adds them).

**The barrier (sim, render)**
- [ ] A ley barrier seals the top of each ramp: a new gate `emberworks`, drawn and sounding like the Hollows' barrier. It blocks the player, enemies and every projectile.
- [ ] The Bulwark's first kill drops it for good, with the collapse and its sound. A KO never brings it back.

**Places (data)**
Names are placeholders Shaun may rename.
- [ ] **The Cinder Vents:** a resource site (032) of cinderite vents, hidden until found.
- [ ] **The Ash Kilns:** a claimable site with a pylon, by the 009/017 rules (with no guarding pack until 061, it is claimed by holding E). Claiming it gives a safe zone, a deposit point, fast travel, and supply: cinderite, added to a new cinderite supply port on the foundry's wall (tile chosen in /plan).
- [ ] **The Slag River:** a molten channel crossing part of the ring. It blocks feet but not shots. A few stone bridges cross it.
- [ ] **The Outpost Forge:** a ruined miniature foundry with a Ruined Cache (032) inside.
- [ ] **A Ley Spring** (030) on the far side of the ring from the nearest ramp.
- [ ] **The Anvil Hall:** the Forgewright's arena, walled, with a door and an altar, by 055's rules (sealed until the barrier is down, E to enter, E at the seal to leave and reset the fight).
- [ ] Each landmark gives its first-discovery XP (032).

**Cinderite (data, sim)**
- [ ] New raw item `cinderite`, gathered with E at `cinder-vent` nodes (018: uses, regrowth, visible remains).
- [ ] A vent cycles in data: closed for `closedTicks` (start 720), a glowing telegraph for `warnTicks` (start 90), then open for `openTicks` (start 360). It can be gathered only while open. An open vent never hurts anyone. Each vent starts its cycle at a different point, from the seeded RNG.
- [ ] Cinderite also drops from the Forgewright.

**The Fire rune (data, sim)**
- [ ] A new element tag `fire` (prefix "Fire", damage type `fire`) that applies to every family: arrow, bomb, ley bolt and landmine. A round still holds at most one element, so a round is frost or fire, never both.
- [ ] A new stage, the **Fire rune**: 1 cinderite per batch of 4 rounds, one build-bar piece in the Arrows group, like the frost rune (whose group is its first family). It is unlocked by hand-crafting one fire round in the crafting menu (029), and its rows show once cinderite has been carried.
- [ ] **Burn** (Shaun: spreads on death): each hit by a fire round, and each fire Burst, Bomblet and Shard, sets the enemy burning for `burnTicks` (start 180), dealing `burnShare` (start 0.25) of that hit's damage each second.
  - A new fire hit resets the timer, and the burn's damage per second becomes the larger of the old and the new. Burns never stack.
  - When a burning enemy dies, every living enemy within `spreadRadius` (start 64 px, 2 tiles) catches its burn, at its damage per second, for the full `burnTicks`. Spreading can chain.
  - Burn damage shows as small hit numbers once a second, and a burning enemy shows flames.
- [ ] Fire's keyword becomes live with its rules line generated from data (039), saying the burn and the spread. Burn is part of Fire's own rule, not a separate status keyword, so Fire's payoffs below meet the new-keyword rule.
- [ ] Fire rounds' hover summaries and Shift breakdowns (040) show the burn.

**Fire's payoffs: two talents (data)**
- [ ] Two new minor talent nodes in the Bombs lane, linked into it (placement in /plan):
  - "Fire: +50% burn duration"
  - "Fire: burn spreads 1 tile further"
- [ ] The tree goes from 19 to 21 nodes. `LEVEL_CAP` rises from 15 to 17, and `XP_CURVE` gains two steps continuing its curve.
- [ ] The keyword graph shows Fire with a source (the fire tag) and two payoffs; the new-keyword data test passes without Fire in `KEYWORD_DEBT`.

**The Forgewright (data, sim)**
All numbers are starting values in data, tuned in playtest.
- [ ] `forgewright`: a boss (`boss: true`) in the Anvil Hall, 4,000 health, walking slowly toward the player and facing them. It wakes when the player enters the hall, by 055's rules.
- [ ] **Plating:** while it isn't vented, every hit on its body is blocked: no damage, including Bursts, Bomblets, Shards and burn. A blocked hit shows a spark and a clang (the Shield's), and its health bar shows the blue shield state (054).
- [ ] **Two bellows**, one on each side of it, 2 tiles out from its centre, square to its facing, so they move and turn with it. Each has its own hurtbox and small health bar (start 150 health each).
  - Hits on a bellows damage the bellows. They still apply Cold and Fire's statuses to the Forgewright.
  - A broken bellows stays broken for `patchTicks` (start 240, 4 s), then patches itself back to full.
  - **Venting:** when both bellows are broken at the same moment, the Forgewright vents: it staggers for `ventTicks` (start 360, 6 s), unable to move or attack; its plating is open and its core glows; every hit lands. Venting resets its heat to 0. When the vent ends, both bellows come back whole.
  - From the front, the bellows are 128 px apart, so a three-lane fan's outer lanes hit both at about 7–8 tiles. Piercing arrows along a line through both also work. A single line that breaks one, then the other within 4 s, also vents it, more slowly. Interview note: the proposal's "within 0.5 s" is read as this rule, with the 4 s patch as the window.
- [ ] **Heat:** a gauge from 0 to 100 under its health bar, filling over `heatTicks` (start 1800, 30 s). Each Chill stack on the Forgewright slows the gauge by Chill's `slowPerStack`, as it slows movement (this is Cold's first payoff).
- [ ] **Forge Flood:** at full heat it raises its hammer for a 90-tick wind-up while half the hall (the half the player stands in) is shaded red, then fire pools cover that half for `floodTicks` (start 300), dealing `floodDamage` a second (start 20) to a player standing in them. Then heat resets to 0.
- [ ] **Hammer slam:** with the player within `slam.triggerRange`, a red circle at its front grows over a 54-tick wind-up (never under `MIN_TELEGRAPH_TICKS`), then deals `slam.damage` (start 45) with knockback.
- [ ] **Ember spray:** at range, a 45° cone of 7 slow embers (start 120 px/s, 20 damage each) toward the player after a 45-tick wind-up.
- [ ] **Enrage** at half health: heat fills 1.5× as fast.
- [ ] Bosses keep their own numbers: ring 4's ×4 never applies to it.
- [ ] Running away, KOs, the first kill and resets follow the Bulwark's rules (034, 055). The first kill records a boss defeat, gives `FORGEWRIGHT_XP` (start 500), and wakes the altar.
- [ ] Drops: 1 `forgewright-core`, 6–8 `cinderite`, 1–2 `forge-rivet`.
- [ ] **Altar refights:** after the first kill, the Anvil Hall's altar summons it again for 8 cinderite, as 034's altar does.

**The fourth entrance (data, sim, render)**
- [ ] The intake grows to four entrances. The new one is capped until restored, and the intake pipe and its gauge are drawn four entrances wide.
- [ ] A new research node, `entrance-4`, costs 1 `forgewright-core`, needs `entrance-3`, and opens one more entrance (033).
- [ ] Four fed entrances fire a symmetric fan by 048's rule: lanes at ±7.5° and ±22.5°.

**New items (data)**
- [ ] `cinderite` (raw), `forgewright-core` (core, research), `forge-rivet` (Region 3's machine part, research). Each has an icon and an inventory group (031).

**Goals and the end card (data)**
- [ ] After "Feed all three entrances", the goal chain gains (milestone `m2`):
  1. "Reach the Emberworks"
  2. "Gather cinderite at the Cinder Vents"
  3. "Claim the Ash Kilns' pylon"
  4. "Craft a fire round (C)"
  5. "Defeat the Forgewright"
  6. "Restore the intake's fourth entrance (E with the Forgewright core)"
  7. "Feed all four entrances"
- [ ] The end-of-demo card (042) shows after the Forgewright's first kill instead of the Bulwark's.

**Sandbox (044)**
- [ ] The sandbox gives every new item and fire round, lists the Forgewright in its spawn panel, and has the Anvil Hall.

**Saves**
- [ ] `SAVE_VERSION` goes up by one; older saves read as too old (no migration).

**Art and sound (render, data)**
- [ ] Vector art in the house style (docs/art.md): Emberworks ground, kilns, chimneys, ramps, the Slag River and its bridges, the Outpost Forge, cinder vents (closed, warning, open), the cinderite icon and node, the Fire rune machine, fire round icons for all four families, flames on a burning enemy, the Forgewright rig (idle, walk, slam wind-up and slam, spray, flood wind-up, vent stagger, hit, death) with its bellows (whole, broken, patching), its heat gauge, the flood pools, the forge rivet and Forgewright core icons, and the fourth entrance.
- [ ] Synth sounds: vent flare, burn crackle, bellows break, vent hiss, hammer slam, ember spray, flood roar.

**Review shots (docs/review/060)**
- [ ] The Emberworks from a ramp; the Cinder Vents open; the Ash Kilns claimed; a fire bomb pack burning; the Forgewright plated; venting with both bellows broken; the Forge Flood; the four-entrance intake; a four-lane volley.

## Data changes
- `worldShape.ts`: `size`, an `emberworks` outer radius, ramp bearings; a new `emberworks.ts` for the ring's places, like `hollows.ts`.
- `ringScale.ts`: `Ring` gains 4, ×4. `leveling.ts`: `RING_XP[4]`, `LEVEL_CAP` 17, two `XP_CURVE` steps, `FORGEWRIGHT_XP`.
- `items.ts`: `cinderite`, `forgewright-core`, `forge-rivet`.
- `tags.ts`: `fire` and a `FIRE` numbers block (`burnTicks`, `burnShare`, `spreadRadius`). `stages.ts`: `fire-rune`.
- `keywords.ts`: Fire live with its template and params.
- `talents.ts`: two Bombs-lane nodes.
- `research.ts`: `entrance-4`. `foundry.ts`: a fourth intake entrance; the cinderite port.
- A new `forgewright.ts` for the boss's values; its arena and altar like the Bulwark's.
- `objectives.ts`: the `m2` steps. `endCard.ts`: the Forgewright. `save.ts`: `SAVE_VERSION`.
- Nodes, landmarks, roads, minimap, sandbox, art and sound data for everything above.

## Out of scope
- The Emberworks' enemies and packs (061).
- The Smelter, the kiln, ley-steel, ley glass, and steel and glass rounds (062).
- The Bulwark's wing as a room (Shaun: no room for now).
- A heat brazier (Shaun: no).
- New relics, new research beyond `entrance-4`, Reservoir III, the fifth entrance.
- Lightning and Poison.

## Test plan
- Sim (Vitest): ring 4 and its multipliers; the barrier dropping on the Bulwark's first kill and never coming back; reachability of every landmark; vent cycles and gathering only while open; claiming the Ash Kilns and its cinderite supply; the fire tag on every family, the stage recipe and its unlock; burn timing, refresh, no stacking, spread on death and chaining; the two talents' numbers; the keyword rule for Fire; the Forgewright's plating, bellows, patching, venting, heat with and without Chill, flood, slam, spray, enrage, drops, reset and altar refight; `entrance-4` and the four-lane fan; the goal chain; the end card's trigger.
- Data tests: every reference resolves; Fire out of `KEYWORD_DEBT`; the tree has 21 nodes; every telegraph at least `MIN_TELEGRAPH_TICKS`.
- Playwright: walk up a ramp after the Bulwark falls; claim the Ash Kilns; a fire bomb burning a sandbox pen; venting the Forgewright with a three-lane fan in the sandbox; restoring the fourth entrance.
- `npm run measure`: a Forgewright target (a decent three-entrance build kills it in about 60–90 s with at most 2 KOs over 20 seeds), recorded, not tuned in the build.

## Decisions in this draft (OK them with the approval)
- Fire's burn and spread are in Fire's own rule, not a separate Burn status keyword, so the two talents (both scoped Fire) meet the new-keyword rule.
- The bellows' window is the 4 s patch: break both, at once or one after the other within 4 s, and it vents.
- Plating blocks Bursts too, unlike the Shield, so bombs don't skip the puzzle.
- Hits on a bellows still chill and burn the Forgewright; burn damage on it lands only while it's vented.
- An open vent never hurts the player.

## Open questions
None: the interview settled them (docs/brainstorm/2026-10-22-region-3.md).
