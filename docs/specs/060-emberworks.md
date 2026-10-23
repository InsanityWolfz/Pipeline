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
- [x] The world grows by a third ring, the Emberworks, as wide as the Hollows (31 tiles): from the Hollows' outer radius (79) out to about 110 tiles from the foundry's door. `WORLD_SHAPE.size` grows to fit (about 230), and every existing tile keeps its place relative to the centre.
- [x] The Hollows' ragged cliff edge stays as cliffs, except for a few ramps up through it (count and bearings in data). Past the Emberworks, the ground rises into a new ragged cliff edge, never a bare wall.
- [x] The terrain is generated from the map's seed with Emberworks settings, the same every run: ash-grey ground, terraced kilns and chimneys that block feet and straight shots, rust-orange glow with cyan ley.
- [x] The Emberworks is danger ring 4: `ringOf` returns 4 anywhere in it. `RING_SCALE[4]` is ×4 health and ×4 damage. `RING_XP[4]` is 4.
- [x] The road network (053) runs up the ramps to the Ash Kilns, the Cinder Vents and the Anvil Hall.
- [x] Every landmark in the Emberworks is reachable on foot from each ramp once the barrier is down; the flood-fill test covers them.
- [x] No packs spawn in the Emberworks (061 adds them).

**The barrier (sim, render)**
- [x] A ley barrier seals the top of each ramp: a new gate `emberworks`, drawn and sounding like the Hollows' barrier. It blocks the player, enemies and every projectile.
- [x] The Bulwark's first kill drops it for good, with the collapse and its sound. A KO never brings it back.

**Places (data)**
Names are placeholders Shaun may rename.
- [x] **The Cinder Vents:** a resource site (032) of cinderite vents, hidden until found.
- [x] **The Ash Kilns:** a claimable site with a pylon, by the 009/017 rules (with no guarding pack until 061, it is claimed by holding E). Claiming it gives a safe zone, a deposit point, fast travel, and supply: cinderite, added to a new cinderite supply port on the foundry's wall (tile chosen in /plan).
- [x] **The Slag River:** a molten channel crossing part of the ring. It blocks feet but not shots. A few stone bridges cross it.
- [x] **The Outpost Forge:** a ruined miniature foundry with a Ruined Cache (032) inside.
- [x] **A Ley Spring** (030) on the far side of the ring from the nearest ramp.
- [x] **The Anvil Hall:** the Forgewright's arena, walled, with a door and an altar, by 055's rules (sealed until the barrier is down, E to enter, E at the seal to leave and reset the fight).
- [x] Each landmark gives its first-discovery XP (032).

**Cinderite (data, sim)**
- [x] New raw item `cinderite`, gathered with E at `cinder-vent` nodes (018: uses, regrowth, visible remains).
- [x] A vent cycles in data: closed for `closedTicks` (start 720), a glowing telegraph for `warnTicks` (start 90), then open for `openTicks` (start 360). It can be gathered only while open. An open vent never hurts anyone. Each vent starts its cycle at a different point, from the seeded RNG.
- [x] Cinderite also drops from the Forgewright.

**The Fire rune (data, sim)**
- [x] A new element tag `fire` (prefix "Fire", damage type `fire`) that applies to every family: arrow, bomb, ley bolt and landmine. A round still holds at most one element, so a round is frost or fire, never both.
- [x] A new stage, the **Fire rune**: 1 cinderite per batch of 4 rounds, one build-bar piece in the Arrows group, like the frost rune (whose group is its first family). It is unlocked by hand-crafting one fire round in the crafting menu (029), and its rows show once cinderite has been carried.
- [x] **Burn** (Shaun: spreads on death): each hit by a fire round, and each fire Burst, Bomblet and Shard, sets the enemy burning for `burnTicks` (start 180), dealing `burnShare` (start 0.25) of that hit's damage each second.
  - A new fire hit resets the timer, and the burn's damage per second becomes the larger of the old and the new. Burns never stack.
  - When a burning enemy dies, every living enemy within `spreadRadius` (start 64 px, 2 tiles) catches its burn, at its damage per second, for the full `burnTicks`. Spreading can chain.
  - Burn damage shows as small hit numbers once a second, and a burning enemy shows flames.
- [x] Fire's keyword becomes live with its rules line generated from data (039), saying the burn and the spread. Burn is part of Fire's own rule, not a separate status keyword, so Fire's payoffs below meet the new-keyword rule.
- [x] Fire rounds' hover summaries and Shift breakdowns (040) show the burn.

**Fire's payoffs: two talents (data)**
- [x] Two new minor talent nodes in the Bombs lane, linked into it (placement in /plan):
  - "Fire: +50% burn duration"
  - "Fire: burn spreads 1 tile further"
- [x] The tree goes from 19 to 21 nodes. `LEVEL_CAP` rises from 15 to 17, and `XP_CURVE` gains two steps continuing its curve.
- [x] The keyword graph shows Fire with a source (the fire tag) and two payoffs; the new-keyword data test passes without Fire in `KEYWORD_DEBT`.

**The Forgewright (data, sim)**
All numbers are starting values in data, tuned in playtest.
- [x] `forgewright`: a boss (`boss: true`) in the Anvil Hall, 4,000 health, walking slowly toward the player and facing them. It wakes when the player enters the hall, by 055's rules.
- [x] **Plating:** while it isn't vented, every hit on its body is blocked: no damage, including Bursts, Bomblets, Shards and burn. A blocked hit shows a spark and a clang (the Shield's), and its health bar shows the blue shield state (054).
- [x] **Two bellows**, one on each side of it, 2 tiles out from its centre, square to its facing, so they move and turn with it. Each has its own hurtbox and small health bar (start 150 health each).
  - Hits on a bellows damage the bellows. They still apply Cold and Fire's statuses to the Forgewright.
  - A broken bellows stays broken for `patchTicks` (start 240, 4 s), then patches itself back to full.
  - **Venting:** when both bellows are broken at the same moment, the Forgewright vents: it staggers for `ventTicks` (start 360, 6 s), unable to move or attack; its plating is open and its core glows; every hit lands. Venting resets its heat to 0. When the vent ends, both bellows come back whole.
  - From the front, the bellows are 128 px apart, so a three-lane fan's outer lanes hit both at about 7–8 tiles. Piercing arrows along a line through both also work. A single line that breaks one, then the other within 4 s, also vents it, more slowly. Interview note: the proposal's "within 0.5 s" is read as this rule, with the 4 s patch as the window.
- [x] **Heat:** a gauge from 0 to 100 under its health bar, filling over `heatTicks` (start 1800, 30 s). Each Chill stack on the Forgewright slows the gauge by Chill's `slowPerStack`, as it slows movement (this is Cold's first payoff).
- [x] **Forge Flood:** at full heat it raises its hammer for a 90-tick wind-up while half the hall (the half the player stands in) is shaded red, then fire pools cover that half for `floodTicks` (start 300), dealing `floodDamage` a second (start 20) to a player standing in them. Then heat resets to 0.
- [x] **Hammer slam:** with the player within `slam.triggerRange`, a red circle at its front grows over a 54-tick wind-up (never under `MIN_TELEGRAPH_TICKS`), then deals `slam.damage` (start 45) with knockback.
- [x] **Ember spray:** at range, a 45° cone of 7 slow embers (start 120 px/s, 20 damage each) toward the player after a 45-tick wind-up.
- [x] **Enrage** at half health: heat fills 1.5× as fast.
- [x] Bosses keep their own numbers: ring 4's ×4 never applies to it.
- [x] Running away, KOs, the first kill and resets follow the Bulwark's rules (034, 055). The first kill records a boss defeat, gives `FORGEWRIGHT_XP` (start 500), and wakes the altar.
- [x] Drops: 1 `forgewright-core`, 6–8 `cinderite`, 1–2 `forge-rivet`.
- [x] **Altar refights:** after the first kill, the Anvil Hall's altar summons it again for 8 cinderite, as 034's altar does.

**The fourth entrance (data, sim, render)**
- [x] The intake grows to four entrances. The new one is capped until restored, and the intake pipe and its gauge are drawn four entrances wide.
- [x] A new research node, `entrance-4`, costs 1 `forgewright-core`, needs `entrance-3`, and opens one more entrance (033).
- [x] Four fed entrances fire a symmetric fan by 048's rule: lanes at ±7.5° and ±22.5°.

**New items (data)**
- [x] `cinderite` (raw), `forgewright-core` (core, research), `forge-rivet` (Region 3's machine part, research). Each has an icon and an inventory group (031).

**Goals and the end card (data)**
- [x] After "Feed all three entrances", the goal chain gains (milestone `m2`):
  1. "Reach the Emberworks"
  2. "Gather cinderite at the Cinder Vents"
  3. "Claim the Ash Kilns' pylon"
  4. "Craft a fire round (C)"
  5. "Defeat the Forgewright"
  6. "Restore the intake's fourth entrance (E with the Forgewright core)"
  7. "Feed all four entrances"
- [x] The end-of-demo card (042) shows after the Forgewright's first kill instead of the Bulwark's.

**Sandbox (044)**
- [x] The sandbox gives every new item and fire round, lists the Forgewright in its spawn panel, and has the Anvil Hall.

**Saves**
- [x] `SAVE_VERSION` goes up by one; older saves read as too old (no migration).

**Art and sound (render, data)**
- [x] Vector art in the house style (docs/art.md): Emberworks ground, kilns, chimneys, ramps, the Slag River and its bridges, the Outpost Forge, cinder vents (closed, warning, open), the cinderite icon and node, the Fire rune machine, fire round icons for all four families, flames on a burning enemy, the Forgewright rig (idle, walk, slam wind-up and slam, spray, flood wind-up, vent stagger, hit, death) with its bellows (whole, broken, patching), its heat gauge, the flood pools, the forge rivet and Forgewright core icons, and the fourth entrance.
- [x] Synth sounds: vent flare, burn crackle, bellows break, vent hiss, hammer slam, ember spray, flood roar.

**Review shots (docs/review/060)**
- [x] The Emberworks from a ramp; the Cinder Vents open; the Ash Kilns claimed; a fire bomb pack burning; the Forgewright plated; venting with both bellows broken; the Forge Flood; the four-entrance intake; a four-lane volley.

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

## Results
Built in eight slices on `claude/060-emberworks` (docs/plans/060-emberworks.md). Every criterion above is met; where the
build settled something the spec left open, it is raised below.

- **Measure** (`npm run measure`, tests/measure/forgewright.measure.ts, recorded, not tuned): the decent three-entrance
  build (041.7's level-7 build, three arrow lines) with a bot that stands 7.5 tiles off face-on, walks off the flooded
  half and rolls through embers wins on 20/20 seeds in 73.6 s with 0 KOs, inside the 60–90 s target. Every seed plays
  the same (the fight draws nothing from the RNG), and that bot takes no damage at all (0% of its health), so the fight
  may read easy to a careful player; nothing was tuned for it.

## Raised after the build (OK them, or say what to change)
Builder decisions the spec didn't settle. Slices 1–3:
- 060.1 The Cistern Terrace's ley line now arrives at 225° instead of 240°, so new pylons' lines can reach home.
- 060.2 The Ash Kilns' pylon overlooks the Cinder Vents, so the south ramp leads to the Outpost Forge.
- 060.3 New roads: from the north-west ramp to the river bridge, and round to the spring.
- 060.4 The Anvil Hall is at 345°, reached from the 325° ramp.
- 060.5 Four ash palette colours added to palette.ts and docs/art.md.
- 060.6 The Outpost Forge cache uses the existing cache table (Region 1 raws).
- 060.7 The minimap scale is 0.43.

Slices 4–6:
- 060.8 The talent names "Banked Embers" (b4) and "Kindling" (b5), branching off Swift Arc.
- 060.9 Their text reads "Fire: +50% duration" and "Fire: +1 tile spread radius" (the spec's "+50% burn duration" and "burn spreads 1 tile further", in the stat lines' form).
- 060.10 "fire" as a verb (fire rate, held fire, you fire) is exempt in the reserved-word tests.
- 060.11 A killing fire hit still sets burn, so it spreads.
- 060.12 A burn's last part-second still deals its share.
- 060.13 Immune enemies take no burn and don't catch it.
- 060.14 The crackle plays on catching fire, not every tick.
- 060.15 The Build tab goes to two columns once fire rounds are known.
- 060.16 Fire's chip is the same blue as Cold's.
- 060.17 The tutorial goal "Restore the right intake entrance" now restores tx 13, which is no longer the rightmost.
- 060.18 The pipe sits 16 px further east.
- 060.19 The sandbox key list is 8 px per line.

Slice 7, the Forgewright:
- 060.20 Numbers the spec didn't give: it walks at 16 px/s (the Bulwark's 18 is "slow" too); it turns to face the player at 60°/s (not instantly, so a player who circles can line up both bellows); its body box 52 × 64 px; each bellows' box 30 × 30 px, 24 px up from its ground point.
- 060.21 The slam: it starts with the player's feet within 80 px; its circle (48 px) lies 40 px ahead of where it faces, locked as the wind-up starts; 40 px knockback; it recovers 48 ticks; 150 ticks between slams.
- 060.22 The spray: it sprays whenever the player is beyond the slam's 80 px, every 180 ticks (counted from the wind-up); embers fly 360 px, a 10 px box, 10 px knockback; the 7 embers are spread evenly edge to edge over the 45°.
- 060.23 The flood: the hall's halves are east and west of its middle; the half is locked as the hammer rises; the pools beat on their first tick and every second after (5 beats in 300 ticks); the blow holds 12 ticks and recovers 30.
- 060.24 Heat doesn't fill through the flood (its wind-up, or while its pools are out) and goes to 0 as they dry; it pauses while the Forgewright is frozen (as its walk does); a vent sets it to 0 and it stays there through the vent.
- 060.25 A piercing shot glances off the plating and flies on (the Shield stops one), so "piercing arrows along a line through both" work: such a line always crosses its body between them.
- 060.26 A blocked hit on the body passes no Cold or Fire (only bellows hits do); a burn's beat on the plated body clangs, once a second.
- 060.27 A broken bellows is shot through (it can't be hit until it patches); a vent drops any attack it was making; the bellows' patch and the vent count down while it's frozen.
- 060.28 Enraged below half health, nothing shows but the faster heat: no roar, no telegraph change.
- 060.29 Its altar stands by the hall's west wall; the summon takes the forum's 120 ticks.
- 060.30 Look: the rig, bellows (whole, broken, patching over their last 1.5 s), brass hoses from its sides, small bars over hurt or broken bellows (brass while patching), its core glowing on its chest while it vents, the slam's circle, the spray's cone and the flood's half in the shared telegraph red, the pools as a flickering molten sheet. A draft for Shaun's eye, like the Bulwark's was.
- 060.31 The boss bar turns the immune blue with 054's shield while it's plated; the heat gauge runs under it, 12 px in from each end, flashing once full.
- 060.32 Its slam's wind-up grinds with the Bulwark's sound.

Slice 8:
- 060.33 "Reach the Emberworks" points at the top of the nearest ramp; "Craft a fire round (C)" completes on any Fire round, and points at cinderite like the frost goal.
- 060.34 The goal line no longer empties after "Feed all three entrances": Milestone 2's goals follow it, and the line empties after "Feed all four entrances".
- 060.35 The end card's words are unchanged (still "New regions and bosses" under "What's next").
- 060.36 The sandbox room grows east to hold the Anvil Hall at its Emberworks tiles (its spawn and bench stay put), and the three boss resets move under Clear in the spawn column, so the strip still ends above the HP block. Every enemy can be spawned at ring 1–4.
- 060.37 e2e specs that fell every enemy now spare the Forgewright, as they spare the Bulwark, since its first kill opens the end card.

After the review:
- 060.38 A Burst or punch that breaks the second bellows vents it but spends itself there: it lands nothing on the body it just opened; only later hits do.
- 060.39 A dying enemy's burn never spreads onto a plated Forgewright (its body passes no Fire, 060.26); a vented one catches it.

