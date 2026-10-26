# 064: Region 4: the Stormcrown and the Conductor
status: approved

Approved by Shaun in chat, 2026-10-26 ("Approve 64-66"), with the draft's listed decisions; its plan is pre-approved ("approve the plans of any other upcoming stuff").

Drafted from Shaun's Region 4 interview (docs/brainstorm/2026-10-26-region-4-interview.md), 2026-10-26.

## Goal
The Forgewright's first kill opens the highest ring: the Stormcrown, rod-studded heights where the ley lines surface as weather. It is ×10 enemy health and damage, a real wall.

In the Stormcrown the player:
- harvests stormglass from rods in the moments after lightning strikes them;
- claims the Weathervane's pylon;
- unlocks the **Lightning rune**: a hit arcs to two more enemies;
- fights the **Conductor**, who blinks between six rods and is answered by homing ammo and by breaking his rods.

His core restores the fifth and last intake entrance: the design's five-arrow spread.

This is the first of three Region 4 specs. 065 brings the region's four enemies; until then the Stormcrown has no packs. 066 brings stormsteel.

## Design references
- docs/design.md:
  - "World, regions, ley lines, bosses": difficulty by distance; "Boss gates"; the world is round, each region a ring.
  - "The Foundry": "each boss core restores one more: ... later bosses' the 4th and 5th."
  - "Combat":
    - "Lightning chains between targets."
    - "Bosses are engineering puzzles": "evasive movement (ley-guided ammo)", with raw throughput always a slower but valid answer.
    - "Keywords": a new keyword needs a template, numbers, a source and two payoffs.
    - "Skill tree": it grows with each region.
  - "Theme rule".
- docs/specs/060-emberworks.md: the region pattern this follows, including vents (here, rods), the barrier on a boss kill, the arena with door and altar, the fourth entrance, and the world growing round its centre.
- docs/specs/061-emberworks-enemies.md: the shared ground hazards. docs/specs/062-material-tiers.md: tiers.

## Acceptance criteria

**The ring (data, sim)**
- [ ] The world grows by a fifth ring, the Stormcrown, as wide as the Emberworks (31 tiles). It runs from the Emberworks' outer radius out to about 141 tiles from the foundry's door. The world grows round its centre as in 060: one shift, every existing tile at the same offset from the centre, and an offsets snapshot test.
- [ ] Ramps rise through the Emberworks' outer cliff edge (count and bearings in data). Past the Stormcrown is a final ragged cliff edge.
- [ ] Terrain is generated from the seed with Stormcrown settings: wind-scoured rock, iron rods and cairns that block feet and straight shots, chasms that block feet only, and a slate-violet glow with cyan ley.
- [ ] **Ring 5:** `ringOf` returns 5 past the barrier (060's "region starts at the barrier" rule). `RING_SCALE[5]` is ×10 health and ×10 damage (Shaun), and `RING_XP[5]` is 10. It is region 4.
- [ ] The roads run up the ramps to every landmark. Every landmark is reachable on foot from each ramp once the barrier is down (flood-fill test).
- [ ] No packs spawn here until 065.

**The barrier (sim, render)**
- [ ] A `stormcrown` gate seals each ramp's top, drawn as the earlier barriers. The Forgewright's first kill drops it for good.

**Places (data)**
Names are placeholders.
- [ ] **The Rod Field:** a resource site of stormglass rods.
- [ ] **The Weathervane:** a claimable site with a pylon (no guards until 065). It supplies stormglass to a new port on the foundry's wall.
- [ ] **The Broken Sky-bridge:** a ruined builders' bridge arching over a chasm, crossable on its deck.
- [ ] **A Ley Spring** on the far side of the ring from the nearest ramp.
- [ ] **The Crown Spire:** the Conductor's arena, walled, with a door and altar (055's rules), ringed by six rod sockets.

**Stormglass (data, sim)**
- [ ] `stormglass`, a raw, is gathered with E at `storm-rod` nodes, and only while a rod is charged.
  - A rod cycles in data: idle for `idleTicks` (start 900), then a flashing warning for `warnTicks` (start 90), then a lightning strike, then charged for `chargedTicks` (start 240).
  - Each rod starts its cycle at its own seeded point, on its own salted rng stream.
- [ ] A strike never hurts the player (as 060's vents).
- [ ] Stormglass also drops from the Conductor.

**The Lightning rune (data, sim)**
- [ ] A new element tag `lightning` (prefix "Lightning", damage type `lightning`) for every family. A new stage, the Lightning rune: 1 stormglass per batch of 4, one build-bar piece in the Arrows group like the frost and fire runes.
  - It is unlocked by hand-crafting a lightning round.
  - Its rows show once stormglass has been carried.
- [ ] **Chain:** each lightning hit arcs on.
  - The direct hit, each Shard, and each Burst or Bomblet from the enemy nearest its centre arc to the nearest living enemy within `chainRange` (start 96 px, 3 tiles) that this chain hasn't hit.
  - That arc deals `chainShare` (start 0.5) of the hit's damage, then arcs again from there, up to `chains` (start 2) arcs.
  - Arcs skip burrowed, immune and plated enemies. A Shield doesn't stop an arc, because it comes from beside, not the front.
  - Arc hits never arc again on their own, never Split, and never set off talents that trigger on a round's hit.
  - Each arc shows as a jagged cyan-white bolt.
- [ ] Lightning's keyword becomes live with its template generated from data. The tier multiplier (062) reaches arcs through the hit's damage.

**Lightning's payoffs: two talents (data)**
- [ ] Two new minor talent nodes in the Ley lane:
  - "Lightning: +1 chain", on a new StatId `chains`;
  - "Lightning: +1 tile chain range", on a new StatId `chain-range`, so it never widens a Burst.
- [ ] The tree has 23 nodes. `LEVEL_CAP` is 19, and `XP_CURVE` gains two steps.
- [ ] The keyword rule passes for Lightning with no `KEYWORD_DEBT` entry.

**The Conductor (data, sim)**
All numbers are starting values in data, tuned in playtest. Bosses keep their own numbers; ring 5's ×10 never applies.
- [ ] `conductor`: a boss with 6,000 health, waking on entering the Crown Spire by 055's rules. It stands at a rod and faces the player.
- [ ] **Rods:** six arena rods, each with its own hurtbox and health bar (200 health). A broken rod regrows after `rodRegrowTicks` (start 1200, 20 s).
- [ ] **Blink:** every `blinkTicks` (start 240), it picks another standing rod, from the seeded rng and never its own. That rod flashes for `blinkWarnTicks` (start 45, 0.75 s), then the Conductor vanishes and appears there.
  - Shots in flight toward its old place miss.
  - A homing round that has lost its target re-locks onto it within its lock radius, by the homing rules.
  - With fewer than 2 standing rods it is **grounded**: it can't blink until a rod regrows.
- [ ] **Arc lash:** a red line from its rod to the player, locked at the wind-up's start (45 ticks), then a lash along it: 50 damage with knockback to a player on it.
- [ ] **Storm call:** 3 red circles of 40 px land on and around the player, each striking after 60 ticks for 40 damage.
- [ ] **Rod chain:** red lines between neighbouring standing rods for a 60-tick wind-up, then lightning runs along them for 30 ticks, dealing 45 to a player on a line.
- [ ] It picks its attacks in data order with cooldowns. Every telegraph is at least `MIN_TELEGRAPH_TICKS`.
- [ ] **Enrage** below half health: `blinkTicks` becomes 150.
- [ ] Running away, KOs, the first kill, resets, XP (`CONDUCTOR_XP`, start 800) and the altar (refights for 8 stormglass) follow the Forgewright's rules.
- [ ] **Drops:** 1 `conductor-core`, 6–8 `stormglass`, 1–2 `storm-coil`.

**The fifth entrance (data, sim, render)**
- [ ] The intake grows to five entrances, the new one at foundry tile tx 15, capped. `entrance-5` costs 1 `conductor-core` and needs `entrance-4`.
- [ ] Five fed entrances fire a symmetric fan by 048's rule: 0°, ±15°, ±30°.
- [ ] The intake art, the HUD tube slot and the sandbox loadout show five entrances.

**Items (data)**
- [ ] `stormglass` (raw), `conductor-core` (core, research) and `storm-coil` (Region 4's machine part, research), each with an icon and an inventory group.

**Goals and the end card (data)**
- [ ] After 062's goals, milestone `m3`:
  1. "Reach the Stormcrown"
  2. "Gather stormglass at the Rod Field"
  3. "Claim the Weathervane's pylon"
  4. "Craft a lightning round (C)"
  5. "Defeat the Conductor"
  6. "Restore the intake's fifth entrance (E with the Conductor core)"
  7. "Feed all five entrances"
- [ ] The end-of-demo card moves to the Conductor's first kill.

**Sandbox (044), saves**
- [ ] The sandbox gives the new items and lightning rounds, lists the Conductor, and has the Crown Spire. Its spawn panel offers ring 5.
- [ ] `SAVE_VERSION` goes up by one.

**Art and sound**
- [ ] **Vector art in the house style:**
  - Stormcrown ground, rods, cairns, chasms and ramps; the Sky-bridge.
  - Storm rods: idle, warning, striking and charged.
  - Icons for stormglass, the storm coil and the Conductor core; the Lightning rune machine; lightning round icons and their in-flight looks; the arc bolt.
  - The Conductor rig: idle, blink out and in, lash, call, chain, hit and death.
  - The arena rods (standing, broken, regrowing); the five-entrance intake.
- [ ] **Synth sounds:** a rod strike, a lightning arc crackle, the blink, the lash, the storm call and the rod chain.

**Measure and review shots**
- [ ] `npm run measure` gains a Conductor target, recorded and not tuned: a decent four-entrance homing-bolt build kills it in about 90–150 s with at most 2 KOs over 20 seeds. Also record a no-homing build.
- [ ] Review shots (docs/review/064):
  - the Stormcrown from a ramp, and the Rod Field charged;
  - a lightning arc across a sandbox pen;
  - the Conductor blinking, with the target rod flashing;
  - a storm call, the rod chain, and the Conductor grounded;
  - the five-entrance intake and a five-lane volley.

## Data changes
- `worldShape.ts`: the Stormcrown's radius and ramps; a new `stormcrown.ts` and `stormcrownSites.ts`.
- `ringScale.ts`: ring 5 ×10. `leveling.ts`: ring XP, the cap and curve, `CONDUCTOR_XP`.
- `items.ts`: the three new items. `tags.ts`: `lightning` and its `LIGHTNING` numbers. `stages.ts`: `lightning-rune`.
- `keywords.ts`: Lightning live. `statDefs.ts`: `chains` and `chain-range`. `talents.ts`: the two nodes.
- A new `conductor.ts`. `research.ts`: `entrance-5`. `foundry.ts`: the fifth entrance and the stormglass port.
- `objectives.ts`, `endCard.ts`, `sandbox.ts`, `save.ts`, plus art and sound data.

## Out of scope
- The Stormcrown's enemies (065) and stormsteel (066).
- Poison; a sixth entrance; tuning ring 5's ×10.

## Test plan
- **Sim (Vitest):**
  - **World and access:** the world move is pure (the offsets snapshot); ring 5 and its multipliers; the barrier on the Forgewright's kill; reachability.
  - **Rods and the Weathervane:** the rod cycle, with gathering only while charged and no damage from a strike; claiming the Weathervane and its supply.
  - **Lightning:**
    - arcs: count, range, share and nearest-first;
    - never the same enemy twice; skips burrowed, immune and plated;
    - one chain per Burst; arc hits don't arc again;
    - the talents' numbers; the keyword rule.
  - **The Conductor:**
    - the blink's timing, warning and target choice; misses on its old spot; homing re-locks;
    - rod health, breaking and regrowth; grounded with fewer than 2 rods;
    - the lash, call and chain hit and miss;
    - enrage, drops, XP, reset and altar.
  - **Goals and the end card:** `entrance-5` and the five-lane fan; the m3 goals; the end card's trigger.
- **Playwright:** walk up a Stormcrown ramp after the Forgewright; a lightning arc in the sandbox; break rods to ground the Conductor in the sandbox; restore the fifth entrance. Plus the review shots.

## Open questions
None: the interview settled them.

## Decisions in this draft (OK them with the approval)
- A lightning Burst or Bomblet chains once, from the enemy nearest its centre, not once per enemy it hit, so a bomb can't start dozens of chains.
- Arcs ignore Shields (they come from beside), but skip plated, burrowed and immune enemies.
- Arc hits don't arc again, Split, or set off on-hit talents.
- A rod strike never hurts the player, as 060's vents don't.
- The Conductor is always hittable: no plating; his rods are the puzzle.
- Fewer than 2 standing rods grounds him until one regrows.
- The end card moves to the Conductor.
