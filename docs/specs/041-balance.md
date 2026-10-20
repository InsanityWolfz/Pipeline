# 041: Balance pass
status: approved

Approved on draft by Shaun in chat, 2026-10-19 ("Approve on draft"); from docs/brainstorm/2026-10-19-balance-ship-interview.md.

## Goal
Combat gets harder the farther out the player goes, and each ammo family has a job it is best at. Per-hit damage follows the target order (landmine > arrow > ley bolt ≈ bomb). Each danger ring multiplies enemy health and damage. The Bulwark becomes a real fight: much more health, an enrage at low health, a punish for players who circle behind it, and adds at half health. Scripted sim tests hold the numbers to Shaun's targets, so later content can't quietly break them.

Built after 040. Every new number is a tuning value in `src/data`.

## Design references
- docs/design.md:
  - "Combat": the hotbar and the layout as the ability; "Bosses are engineering puzzles" ("an armored front (arcing shots) ... A first attempt can be pure scouting ... raw throughput is always a slower but valid answer"); "Every enemy still telegraphs attacks you read and dodge"; "Running away is always allowed"
  - "World, regions, ley lines, bosses": "Difficulty by distance: enemies near the foundry are weak, and biomes get deadlier the farther out you go"; "Champions"
  - "Damage types behave differently" (Cold slows, then freezes)
- docs/brainstorm/2026-10-19-balance-ship-interview.md, "041 balance", rounds 1 and 2 (the source of truth for this spec):
  - Damage per hit: arrow 14, ley bolt 9, bomb 12; the landmine stays at 60; fire rates don't change.
  - The Bulwark: about 2,500 HP; an enrage below 30% HP (it turns faster and lobs more often); it punishes circling (a rear stomp or quick spin if the player stays behind it too long); adds at 50% HP (a couple of Shardbacks or Chargers).
  - Frost: leave it. "Freezing is for tougher enemies and bosses, and Husks can die before they freeze."
  - Ring multipliers: ×1 / ×1.6 / ×2.5 for rings 1, 2 and 3, on enemy HP and damage, on top of the tougher enemy types. Bosses keep their own numbers.
  - Test targets: a Bulwark fight takes 60–90 s with a decent build and real damage taken, and a naive bot can lose; a ring-matched pack clears in 8–15 s with a fitting volley; each ammo family wins its own scenario (arrows vs a line, bombs vs a cluster, ley bolts vs movers behind walls, mines vs a stationary target).
  - Survival: no change.
- docs/brainstorm/2026-10-19-drive-rant.md, themes 6 (ammo roles) and 9 (difficulty: "more health, more dangerous enemies further out. The Bulwark is too easy, so give it much more health and make it attack faster at low health, for tension").
- docs/specs/039-keyword-system.md: recorded the target order and today's numbers (landmine 60, ley bolt 14, bomb 15, arrow 10) for this spec. Stats are read through `resolveStat`, and content lines are % adds and × multipliers, so no talent, relic or keystone number changes here.
- docs/specs/034-stonefall-hollows.md: the Bulwark, its shield, lob and pound, the leash, the altar. Its "Raised after the build" notes: 900 HP falls to single arrows from behind in about 25 s with no damage taken.
- docs/specs/035-hollows-enemies.md: `MIN_TELEGRAPH_TICKS` (30), the Shardback and the Charger, ring 3 packs.
- docs/specs/032-landmarks-champions.md: champion multipliers (×1.5 HP, ×1.3 damage, rounded).
- docs/specs/037-leveling-talents.md: XP by ring (`RING_XP`, unchanged) and the "level 7 by the shrine region" pacing figure.

## Acceptance criteria

**Ammo damage (data)**
- [ ] Per-hit damage in `src/data/ammo.ts`: arrow `damage` 10 → **14**, ley bolt `damage` 14 → **9**, bomb `burstDamage` 15 → **12**. The landmine stays at **60**.
- [ ] Every tagged round follows its base (Frost arrow 14, Frost bomb 12, Cluster bomb 12, Homing and Split ley bolts 9, Frost landmine 60).
- [ ] Fire rates are unchanged: `fireTicks` arrow 15 (4.0/s), ley bolt 20 (3.0/s), bomb 40 (1.5/s), landmine 40 (1.5/s). Range, speed, radius, arm time and Knockback are unchanged.
- [ ] Child damage is unchanged (041.1): a Split Shard 4, a Bomblet 8, Shatterpoint's Shards ×0.5 of the bolt. The Pool-burst stays "the arrow's hit", so it follows the arrow to 14 (×1.5 through a Pool: 21).
- [ ] No talent, relic, keystone or affix number changes; they are % adds and × multipliers on the new bases (Fletcher's Eye + Hard Bore arrow: 14 × 1.16 = 16.24, shown "16.2").
- [ ] Frost is unchanged: `COLD`, `CHILL` and `FREEZE` keep their numbers (4 Chill to Freeze, 90 ticks, a Boss 45). A ring 1 Husk (40 HP) dies to its third arrow, before a Freeze, as Shaun accepted.

**Ring scaling (data, sim)**
- [ ] New data `RING_SCALE` gives each danger ring a health and a damage multiplier: ring 0 ×1 (041.2), ring 1 ×1, ring 2 ×1.6, ring 3 ×2.5. Both multipliers are the same per ring, but are separate fields so they can be tuned apart.
- [ ] An enemy's ring is its home tile's ring, set when it is created (the rule 037's `homeRing` uses for XP: `ringOf` in the overworld, ring 0 in any other room). It doesn't change as the enemy walks. Packs, landmark guards, the Cistern Terrace's guards and the Bulwark's adds all use it.
- [ ] The sim reads an enemy's def through one function (today's `defOf`), which applies the ring and then the champion: max health `round(base × ring × champion)`, and every attack's damage `round(base × ring × champion)`, each rounded once (041.3). Walk speed, size, reach, telegraphs, timings, knockback, weight, drops and XP are not ring-scaled.
- [ ] **Champions stack by multiplying** (041.3): a champion's ×1.5 health and ×1.3 damage apply on top of its ring's. A ring 1 champion is exactly as today (a Husk's swipe 26). Champion chances, size, speed and drops are unchanged.
- [ ] **Bosses keep their own numbers:** an enemy with `boss: true` (the Pylon Warden, the Bulwark) is never ring-scaled, as it is never a champion. The Bulwark's adds are not bosses and are scaled.
- [ ] The resulting numbers (a test checks this table from data):

| Enemy | Ring | Health | Attack damage | As a champion |
| --- | --- | --- | --- | --- |
| Husk | 1 | 40 | swipe 20 | 60 HP, 26 |
| Husk | 2 | 64 | swipe 32 | 96 HP, 42 |
| Wisp | 2 | 32 | orb 19 | 48 HP, 25 |
| Charger | 3 | 125 | charge 63 | 188 HP, 81 |
| Burrower | 3 | 88 | erupt 55 | 131 HP, 72 |
| Shardback | 3 | 175 | bash 50 | 263 HP, 65 |
| Sniper construct | 3 | 75 | bolt 70 | 113 HP, 91 |
| Pylon Warden, Bulwark | any | own | own | never |

- [ ] The overhead health bars, boss bar, damage numbers, 040's enemy hover and `getState()` show the scaled numbers. `getState()` reports each enemy's `ring`.

**The Bulwark: health (data)**
- [ ] `maxHealth` 900 → **2,500**. The leash's full heal, a KO reset and an altar summon all restore 2,500. Its lob (25) and pound (35) damage and timings are unchanged outside the enrage.

**The Bulwark: enrage below 30% (data, sim, render)**
- [ ] When its health first drops below `enrage.below` (0.3) of max in a fight, it enrages and stays enraged until it dies or resets (leash or KO reset).
- [ ] Entering the enrage, it roars for `enrage.roarTicks` (60) and starts no attack meanwhile, so the change is readable. A wind-up already running finishes first.
- [ ] While enraged (041.4):
  - its shield turns at `enrage.turnDegPerSec` (70°/s, from 40°/s)
  - its lob cooldown is `enrage.lobCooldownTicks` (160, from 240), with the same count, scatter, ring, fuse and damage
  - everything else is unchanged; no telegraph gets shorter
- [ ] It looks enraged: its core seam and runes burn danger red with a steam plume (render), and the boss bar's fill turns danger red. Art pending Shaun's approval by eye.
- [ ] `getState()` reports the Bulwark's `enraged` and the event `enrages`.

**The Bulwark: punishing circling (data, sim, render)**
- [ ] The punish is a **rear stomp** (041.5). The Bulwark keeps a `behind` counter: +1 each tick the player's feet are outside its shield arc (its rear half) and within `stomp.range` (160 px), and −2 each tick they aren't (never below 0).
- [ ] When `behind` reaches `stomp.behindTicks` (180, 3 s) and its stomp cooldown is ready, and no other attack is winding up, it winds up a stomp for `stomp.windupTicks` (40, at least `MIN_TELEGRAPH_TICKS`):
  - A red half-disc of `stomp.radius` (96 px) shows on the ground over its rear half, in the pound circle's style.
  - It doesn't turn during the wind-up, so the half-disc stays where it was shown.
- [ ] It then stomps: `stomp.damage` (30) and `stomp.knockback` (40 px) away from it, to a player whose feet are inside the half-disc, unless a roll's i-frames are running. The counter resets to 0.
- [ ] It recovers for `stomp.recoverTicks` (40) without turning; the cooldown is `stomp.cooldownTicks` (360, from the wind-up's start). The enrage doesn't change the stomp.
- [ ] A player who keeps stepping out of the rear arc (or out of range) before 3 s never triggers it, so hit-and-reposition is the skill it asks for.
- [ ] Render: the stomp's wind-up pose, the half-disc, the stomp's dust (034's `poundDust`, smaller) and the pound's sound pitched up. Art pending Shaun's approval by eye.
- [ ] `getState()` reports the Bulwark's `behind` counter and stomp cooldown; events `stomps`.

**The Bulwark: adds at 50% (data, sim, render)**
- [ ] The first time in a fight its health drops below `adds.below` (0.5) of max, the adds rise: **one Shardback and one Charger** (041.6), at two fixed tiles in the Sunken Forum (data in `src/data/hollows.ts`, on open floor on either side of the Bulwark's start, at least 96 px from the player's feet when they rise, using the other tile if one is too close).
- [ ] Each rises over `adds.riseTicks` (60) through a cracked red circle (the altar summon's art, smaller). While rising it can't act, be hit or block.
- [ ] They are normal ring 3 enemies (×2.5: Shardback 175 HP, Charger 125 HP), never champions, with their usual AI, drops and XP. 034's "packs never spawn in the arena" rule still holds for packs.
- [ ] **Once per fight:** the adds come once. If the Bulwark resets (the leash or a KO before its first kill), living adds sink back and are removed, and the next fight has adds again. An altar summon is a new fight with its own adds.
- [ ] Adds don't count toward the population's packs or the spawn cap.
- [ ] `getState()` reports the adds' group (`bulwark-adds`) and the event `addsRise`.

**Telegraphs (data test)**
- [ ] The data test that holds every enemy to `MIN_TELEGRAPH_TICKS` covers each of the Bulwark's attacks (lob wind-up, pound and stomp), not only the one `attackOf` returns.

**Scripted targets (sim tests)**
All bots and builds below are test code in `tests/sim`, stepped through the real sim with fixed seeds. Each target runs on 5 seeds (1–5); "takes" figures are each seed's, not an average.
- [ ] **The Bulwark with a decent build** (041.7): a bot that keeps behind the Bulwark when it can, rolls out of telegraphed circles, steps out of the rear arc before the stomp, and fires at it. Build: two entrances (the Warden core's), one arrow line and one bomb line; level 7 with six talents taken along the Arrows, Bombs and Tube lanes (Fletcher's Eye, Quick Nock, Black Powder, Hard Bore, plus the two nodes the tree requires to reach them, or the nearest legal set; recorded in the test); four Common gear pieces with mid-roll affixes. Target: it wins in **60–90 s** (3,600–5,400 ticks) and takes **at least 40% of its max health** in damage over the fight, without a KO.
- [ ] **A naive bot can lose:** a bot with the same build that walks straight at the Bulwark's front, holds fire on it and never rolls is KO'd before the Bulwark falls, on every seed.
- [ ] **Ring-matched packs** (041.8): for each ring, a scripted bot fights one population pack of that ring with a fitting volley, timed from the first round fired at the pack to the last death:
  - ring 1: 4 Husks; one arrow line
  - ring 2: 4 Husks and 1 Wisp; two arrow lines
  - ring 3: a Shardback, two Chargers, a Burrower and a Sniper construct; one arrow line and one bomb line
  - Target: **8–15 s** at ring 3. Rings 1 and 2 must clear in at most 15 s, and their times are recorded in the test and the PR (041.8). The bot is never KO'd.
- [ ] **Each ammo family wins its own scenario** (041.9): one entrance, no talents, each family's plain round (Ley fires Homing ley bolts, the Ley guide's round). "Wins" means the shortest time from the first round to the last death of the four families, by at least 10% over the next, on every seed. A family that can't finish in 60 s scores 60 s.
  - **Arrows vs a line:** 5 ring 1 Husks walking single file straight at the player, 24 px apart, from 280 px.
  - **Bombs vs a cluster:** 8 ring 2 Husks spread evenly round a 40 px ring, 240 px away, walking at the player.
  - **Ley bolts vs movers behind walls:** 4 ring 2 Wisps behind a 3-tile wall segment between them and the player, 200 px away, keeping their distance as Wisps do. The player stands still.
  - **Mines vs a stationary target:** one ring 3 Shardback, its shield facing the player, held in place by the test harness (041.10).
- [ ] **Survival is unchanged:** the player's max health (100), armor, healing rates, roll and i-frames, and every gear and talent survival number are as before. A test pins them.

**Docs (on approval)**
- [ ] docs/design.md, "Difficulty by distance" gains: "Each danger ring multiplies enemy health and damage (×1, ×1.6, ×2.5 for rings 1 to 3) on top of its tougher enemy types; bosses keep their own numbers. (Added 2026-10-19, Shaun, spec 041.)"
- [ ] docs/specs/039 and 040 keep their text; tests and examples that show the old numbers are updated in code, and the PR lists them.

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass. Every test whose expected number changes is listed in the PR with the change that moved it. Known today: tests/sim/pinned039.test.ts, talentStats.test.ts, statResolve.test.ts, bulwark.test.ts (900 HP and its 30 s yardstick, replaced by the targets above), altar.test.ts, hollowsPacks.test.ts, champions.test.ts (ring 1 unchanged), keystones.test.ts (the Pool-burst), tests/render/describe.test.ts (040's "11.6"), tests/e2e/hollows.spec.ts.

## Data changes
- `src/data/ammo.ts`: arrow `damage` 14, ley bolt `damage` 9, bomb `burstDamage` 12.
- `src/data/population.ts` (or a new `src/data/ringScale.ts`): `RING_SCALE: Record<0 | 1 | 2 | 3, { health: number; damage: number }>` = 1/1, 1/1, 1.6/1.6, 2.5/2.5.
- `src/data/bulwark.ts`: `maxHealth: 2500`; new blocks:
  - `enrage: { below: 0.3, roarTicks: 60, turnDegPerSec: 70, lobCooldownTicks: 160 }`
  - `stomp: { range: 160, behindTicks: 180, behindDecay: 2, windupTicks: 40, swipeTicks: 8, radius: 96, arcDegrees: 180, damage: 30, knockback: 40, knockTicks: 8, recoverTicks: 40, cooldownTicks: 360 }`
  - `adds: { below: 0.5, enemies: ['shardback', 'charger'], riseTicks: 60, minDistance: 96 }`
- `src/data/hollows.ts`: the arena's two add tiles.
- `src/data/champions.ts`: no number changes; its comment notes ring stacking.
- `src/data/sounds.ts`, `src/data/juice.ts`, `src/data/art`: the roar, the stomp, the enraged look, the adds' rise.
- Sim: the ring in `src/sim/enemies.ts` (set at creation), ring scaling beside the champion's in `src/sim/champions.ts` (or a new `src/sim/ringScale.ts`), and the enrage, stomp and adds in `src/sim/bulwarkAi.ts` (split into a second file if it passes ~300 lines).

## Out of scope
- New enemies, bosses, ammo, stages or keywords; any change to frost.
- Player survival: max health, armor, healing, gear and talent numbers.
- Fire rates, ranges, speeds, radii, arm time and child damage (041.1).
- Ring scaling for bosses; XP and drop changes (`RING_XP` stays 1, 1, 2, 3).
- Pack sizes, pack makeup and champion chances (041.8 records, doesn't change them).
- A damage-per-second line in the UI (040.5).
- Ascension modifiers (design.md "Endgame").
- Saves, the title screen and screen shake (042).

## Test plan
- **Vitest (data):**
  - Per-hit damage: arrow 14, ley bolt 9, bomb 12, landmine 60, and every tagged round matches its base; fire ticks 15/20/40/40.
  - `RING_SCALE` values; the ring table above, computed from data through the def function, champion column included.
  - Every Bulwark attack (lob, pound, stomp) winds up for at least `MIN_TELEGRAPH_TICKS`; the add tiles are open floor inside the arena.
  - Survival numbers pinned (max health, armor, healing, roll, i-frames, affix and talent survival lines).
- **Vitest (sim):**
  - Ring: an enemy's ring is set from its home tile and kept as it walks; a ring 2 Husk has 64 HP and swipes for 32; a ring 3 champion Sniper has 113 HP and fires for 91; the Warden and Bulwark are unscaled in any ring.
  - Enrage: below 30% it roars 60 ticks without attacking, then turns at 70°/s and lobs every 160 ticks; it stays enraged; a leash reset clears it.
  - Stomp: 180 ticks behind within 160 px starts a 40-tick wind-up; the half-disc hits inside and misses outside and in front; a roll dodges it; stepping out of the rear arc drains the counter at 2 a tick; no turning during wind-up and recovery; the 360-tick cooldown.
  - Adds: one Shardback and one Charger rise once below 50%, at least 96 px from the player; they can't act or be hit while rising; ring 3 health; not champions; a reset removes them and re-arms them; a summon has its own.
  - The scripted targets above: the decent-build fight (60–90 s, at least 40% damage taken, no KO), the naive bot's KO, the three pack clears, the four ammo scenarios. Each prints its measured ticks so the PR can list them.
  - Determinism with the enrage, stomp and adds.
- **Playwright:** with `?start=hollows`, bring the Bulwark below 50% (via the dev hook) and see two adds in `getState()`; below 30%, `enraged: true`; stand behind it 3 s and see a stomp wind-up.
- **Screenshots:** the enraged Bulwark, the stomp's half-disc, the adds rising, the boss bar enraged.

## Open questions
Each has a proposed answer that the build follows (approve-on-draft); Shaun may change any of them at playtest.

- **041.1 Do the children (Split Shards, Bomblets, Shatterpoint's Shards) change with their parents?** Proposal: no. Shards stay 4 and Bomblets 8; the interview pinned only per-hit damage. A cluster bomb now deals 12 + 4 × 8 instead of 15 + 4 × 8, and a Split ley bolt 9 + 5 × 4 instead of 14 + 5 × 4. The Pool-burst is defined as the arrow's hit, so it follows the arrow to 14.
- **041.2 Ring 0 (round the foundry, and every room that isn't the overworld)?** Proposal: ×1, like ring 1. Ring 0 has no population today.
- **041.3 How do champions stack with rings, and where is the rounding?** Proposal: multiply (ring × champion), rounded once at the end. A ring 3 champion Sniper's bolt is 28 × 2.5 × 1.3 = 91. Ring 1 champions are exactly as today.
- **041.4 The enrage's exact numbers?** Proposal: below 30% HP, a 60-tick roar, then the shield turns at 70°/s (a half turn in 2.6 s, from 4.5 s) and the lob cooldown drops to 160 ticks (from 240). The lob count, the pound and the stomp are unchanged, so "turns faster and lobs more often" are the only two changes.
- **041.5 Rear stomp or quick spin?** Proposal: the rear stomp. It punishes the circling itself with damage and knockback, it has a clear telegraph (the red half-disc), and it doesn't undo the shield puzzle the way a snap turn would. It triggers after 3 s behind it within 160 px (the counter drains twice as fast as it fills), winds up 40 ticks, hits 30 damage in a 96 px rear half-disc, and has a 6 s cooldown.
- **041.6 Which adds?** Proposal: one Shardback and one Charger, once per fight at 50%, so the fight asks for both a flank and a sidestep. Two Shardbacks would make three shields to flank at once, and two Chargers would be pure lane-dodging. They are normal ring 3 enemies (×2.5), never champions, with normal drops and XP.
- **041.7 What is a "decent build", and is 2,500 HP enough for 60–90 s?** Proposal: the build above, which is what a player has when they reach the Bulwark (two entrances, level 7). At Shaun's numbers its peak damage is about 71/s from arrows (only from behind) plus about 21/s from bombs (lobs land from any side), so 2,500 HP lasts 60–90 s only if the bot spends roughly 10–30% of the fight behind it. Today's circling bot is behind about 90% of the time. The stomp and the enrage are the first levers: tune the stomp's counter and cooldown, then the enrage turn. If the bot still wins in under 60 s, HP may rise to at most 3,000 ("about 2,500"). Anything beyond that is reported to Shaun, not built.
- **041.8 Can rings 1 and 2 reach 8–15 s?** Probably not at these numbers. A ring 1 pack (4 Husks, 160 HP) dies to one arrow line in about 3 s of fire, and a ring 2 pack (about 290 HP) to two arrow lines in about 3 s. With walk-in and dodging, expect about 4–7 s. Ring 3 (about 590 HP behind shields, burrows and cover) should land in the band. Proposal: assert 8–15 s at ring 3. Rings 1 and 2 must clear in at most 15 s, and their measured times go in the PR. Pack sizes and the approved multipliers stay as they are; Shaun decides at playtest whether rings 1–2 need bigger packs or a steeper ring 2.
- **041.9 What does "wins its scenario" measure?** Proposal: time to clear from one entrance with no talents, a 10% margin over the runner-up, on all 5 seeds. Ley fires Homing bolts, because "behind walls" is Homing's job. By arithmetic the margins are about 2.5× (arrows on the line), 1.3× (bombs on the cluster: 8 targets per burst against about 2 per arrow), clear for Ley (arrows are blocked and bombs miss Wisps that keep moving) and about 1.4× (mines on the shielded target). If a scenario fails at Shaun's per-hit numbers, the builder stops and reports with measurements, and doesn't retune damage.
- **041.10 What is "a stationary target"?** Proposal: one ring 3 Shardback (175 HP) with its shield facing the player, held in place by the test harness. That stands in for anything that plants itself, like a Bulwark in its pound or a Sniper waiting in cover. The shield matters: on an unshielded stationary target, arrows' 56 per second beats mines' 90 per second after their 5 s arm time unless the target has over about 900 HP. Behind a shield, only bombs (18 per second) and mines land, so mines win as the high-risk, high-reward hit.
- **041.11 Ring 3 hits are big against 100 HP** (a Sniper's bolt is 70, a Charger's charge 63, a champion Sniper's 91). Survival stays unchanged by Shaun's answer. Proposal: build it as approved. The pack and Bulwark tests record damage taken, and Shaun judges at playtest.

### Raised in the build (2026-10-20)
The build follows 041.1–041.11. These came up building the scripted targets; each records what was measured and what the build did, and asks Shaun. The tests that measure them print their numbers.

- **Tuning inside 041.7's levers (built):** with the spec's numbers the decent build won in 42–50 s (2,506–3,017 ticks on seeds 1–5). In the spec's order: the stomp's counter fills in **120 ticks** (2 s, from 180), the enrage turns **110°/s** (from 70), and the Bulwark has **3,000 HP** (the ceiling; from 2,500). The decent build then wins in 67.7, 76.8, 76.7, 78.1 and 69.8 s (4,060–4,687 ticks), never KO'd; on seeds 6–12 too, 67–86 s. The naive bot is KO'd at 15 s on every seed. The cooldown (360), the drain (2 a tick) and the lob cooldown (160) are as specced.
- **041.12 The Bulwark doesn't hurt a decent player (not met).** The decent bot (behind it when it can, rolling out of telegraphed circles as they land, stepping out of the rear arc before the stomp, fire held; it reads nothing else) takes 0.35, 0, 0.93, 0 and 0.46 of its max health on seeds 1–5, not the 40% asked. Every hit is an add's (a Charger's charge, 53 after the build's armor) or a stomp; none is the Bulwark's bombs or pound, which a roll's i-frames clear every time (its telegraphs are 30–90 ticks; a roll is ready again in 26). No lever 041.7 names changes this. What should make the fight hurt: more adds or adds that come back, attacks that overlap (a stomp during a lob), less readable bombs (shorter fuses are ruled out: "no telegraph gets shorter"), or a different target? Built: the target is recorded as a failing expectation (`it.fails` in tests/sim/bulwarkFight.test.ts), which turns into a failure once every seed reaches 40%.
- **041.13 Ring 3's pack clears just outside the band on one seed (not met).** With no talents and nothing worn (041.8's arithmetic), an arrow and a bomb line clear a ring 3 pack in 11.5, 16.3, 10.1, 13.1 and 13.5 s, never KO'd; seed 2 is slow because the last one standing is the Shardback, its shield turned to the player, falling to bombs alone. With 041.7's decent build instead: 10.3, 13.4, 8.6, 10.5 and 7.8 s. Rings 1 and 2 clear in 2.2–2.9 s and 2.5–4.2 s. Which build should the ring 3 target assume, and is 16 s on one seed acceptable? Built: no talents, the band recorded as `it.fails` in tests/sim/packClears.test.ts.
- **041.14 Two families don't win their scenario at your per-hit numbers (not met; the spec says stop and report, so nothing was retuned).** Measured, the same on every seed (the scenarios use no RNG):
  - Arrows vs a line: arrows 69 ticks, bombs 257, Homing ley bolts 483, landmines 60 s. Met.
  - Landmines vs the held shielded Shardback: landmines 422, bombs 602; arrows and ley bolts never get past the shield. Met.
  - Bombs vs a cluster: arrows 221, bombs 332. The cluster walks in and closes up into a rough line, so one piercing arrow hits several. Not met.
  - Homing ley bolts vs Wisps behind a wall: bombs 124, landmines 576, arrows and ley bolts never finish. The Wisps settle behind the wall to cast and hold still, so bombs land on them; a Homing bolt locks only an enemy within 64 px of the cursor, so with the wall between it flies into the wall. Not met.
  - What should change: the scenarios (a bigger or tighter cluster, Wisps that strafe, a wall further off), the rounds (Homing's lock radius or turn, bomb radius), or the targets? Built: the two misses are `it.fails` in tests/sim/ammoScenarios.test.ts. The wall is a 3-tile segment the test stands in the meadow 48 px from the player; the Wisps start 200 px off.
- **041.15 The boss bar is already danger red.** 034 made its fill `danger`, so "the boss bar's fill turns danger red" when enraged changes nothing you can see. Built: an `enragedFill` field in the bar's data, `danger` for now, and `ui().bossBar.enraged`. What should the enraged bar look like?

## Shaun's answers to 041.12–041.15 (2026-10-20)
- **041.12, Bulwark damage:** some attacks can't be rolled. The pound's shockwave and the enraged lobs ignore roll i-frames; the player has to leave the circle instead of rolling through it. The "takes real damage" test should then pass.
- **041.13, pack times:** accept. Widen ring 3's band to 8–18 s. Rings 1–2 clearing in 2–4 s is fine, so record them and don't assert a floor.
- **041.14, ammo scenarios:** fine for now; balance them later when more mechanics are folded in. Bombs-vs-cluster and homing-vs-walled-Wisps stay as recorded measurements, not targets.
- **041.15, enrage bar:** leave the bar. The red seams, steam and roar already show the enrage.

### Built after Shaun's answers (2026-10-20)
- **041.12 built:** the pound's shockwave (`pound.rollProof`) and the bombs an enraged Bulwark lobs (`enrage.rollProofLobs`) ignore a roll's i-frames; each such circle wears a second danger-red ring a few px outside its edge as the cue. A roll through a normal bomb still saves.
- **041.13, 041.14, 041.15 built as answered:** ring 3's band is 8–18 s (rings 1–2 recorded, damage taken printed); the cluster and walled-Wisps scenarios are logged measurements; the boss bar is unchanged by the enrage (`ui().bossBar.enraged` stays).
- **041.16 The decent build's fight is still short and safe (not met).** In review, the decent bot was changed to react to the stomp's visible wind-up (its half-disc) instead of the hidden counter: it steps out of the half-disc as it shows and is back behind the Bulwark straight after, so the stomp no longer keeps it off its back. It also walks or rolls out of the roll-proof circles in time (their windups are 60 and 90 ticks). Measured on seeds 1–5: 41.8, 41.8, 41.8, 37.9 and 36.3 s, damage taken 0, 0, 0, 0 and 0.93 of max health (an add's hits), never KO'd. The levers 041.7 names are spent: HP is at its 3,000 ceiling, and a shorter stomp counter or cooldown (60–30 ticks, 240–120 cooldown tried) left the fight under 60 s on most seeds and KO'd the bot on others when stomps overlapped other attacks. Both 041.7 targets (60–90 s, 40% damage) are recorded as `it.fails` in tests/sim/bulwarkFight.test.ts. What should change: a stomp the player can't simply step out of and back from, more HP, or the targets?

## Shaun's answer to 041.16 (2026-10-20)
"go ahead and do all of those suggestions". That means all four changes (the fifth option, leaving him as he is, is the alternative to these):
1. **HP ceiling raised** to about 5,000, aiming for a 60–70 s fight.
2. **Pressure on his back:** a short wave or bolt off his back every few seconds, so standing behind him always costs something. Telegraphed for at least MIN_TELEGRAPH_TICKS.
3. **Enraged attacks speed up:** shorter telegraphs while enraged, never under MIN_TELEGRAPH_TICKS (half a second).
4. **Adds keep coming:** a new pair about every 20 s after the first, never champions, still outside the spawn cap.

The targets stand: 60–90 s, real damage taken by the decent bot reacting only to visible cues, and the naive bot loses. Tune within these four levers.
