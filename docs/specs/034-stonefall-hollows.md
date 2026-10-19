# 034: Region 2: Stonefall Hollows and the Bulwark
status: approved

Approved by Shaun in chat, 2026-10-19 ("Approve all 028–037"); open questions settled the same day.

Drafted from Shaun's spec interview (docs/brainstorm/2026-10-19-interview.md), 2026-10-19.

## Goal
The west path no longer ends in nothing. It runs to a ley barrier, and beyond it lies Stonefall Hollows: a collapsed quarry-city of the lost civilisation, with cliffs, broken aqueducts and veins of ley-iron. Claiming the shrine pylon drops the barrier.

In the Hollows the player:
- finds three landmarks
- claims the region's pylon
- gathers ley-iron, the game's first metal
- fights the Bulwark, a slow-turning shielded wall that has to be beaten from behind or from above

The Bulwark's core restores the intake's third entrance (033). After the first kill, an altar in the arena lets the player summon it again for its drops.

Ley-iron unlocks two things:
- landmines, which are shot onto the ground and explode after about 5 seconds
- the cluster stage, which makes a bomb burst into smaller explosions

## Design references
- docs/design.md:
  - "World, regions, ley lines, bosses":
    - difficulty by distance
    - claiming
    - "Regional pull"
    - "Boss gates": "each boss unlocks a new foundry wing and the next region ... and drops the cores for top-tier machines and stages"
  - "Combat", "Bosses are engineering puzzles": "an armored front (arcing shots) ... A first attempt can be pure scouting ... raw throughput is always a slower but valid answer."
  - "Combat": every enemy telegraphs attacks you read and dodge; "Running away is always allowed."
  - "Theme rule": everything fits the lost civilisation and its ley lines.
  - "The Foundry", "Ammo is built physically": each ammo has its own chain.
- docs/specs/009-claiming.md and docs/specs/017-overworld.md: the map, rings, barriers, packs, claims, safe zones, deposit and fast travel.
- docs/specs/033-research.md: `entrance-3` costs the Bulwark core; `aqueduct-valve` is Region 2's machine part.
- docs/specs/035-hollows-enemies.md: Region 2's enemies. Their shield rule is defined here and shared.
- The ammo-stage spec (029): stage machines, tags, at most one element stage and one shape stage per round, and "hand-make one first" unlocks.
- The champions and landmarks spec (032): landmark discovery and resource sites.
- docs/brainstorm/2026-10-19-content.md, section 6: "Region 2: Stonefall Hollows", ley-iron, the Bulwark "must be slow or slow to turn, or lobs need to lead the target, because bombs miss moving targets".
- Interview answers (Shaun, 2026-10-19):
  - Round 2, landmines: "good single-target damage on a delay. You shoot them onto the ground and they explode after about 5 s, with large damage in a small radius." They need metal and come after the 1st boss.
  - Round 2: a stage costs a small material input as ammo passes through (e.g. 1 stone per 4 arrows).
  - Round 3, milestone 2 includes cluster bombs ("smaller explosions around it after it bursts") and landmines. Each round takes at most one element stage and one shape stage.
  - Round 4: a guided goal chain, as data: "... claim a second pylon, breach Region 2's barrier, beat the Bulwark".
  - Round 5: "each pylon sends the resources of its area".
  - Round 8, the region: "Stonefall Hollows, a collapsed quarry-city of the lost civilisation. It has cliffs, broken aqueducts and veins of ley-iron (the metal), in grey-blue stone with rust and cyan. It's about half the current map (roughly 40×45 tiles to the west), with 2–3 landmarks, a claimable site and the boss arena."
  - Round 8, the Bulwark: "a slow-turning wall. Its shielded front blocks shots, and its back takes damage." Shaun's additions:
    - "now and then it lobs bombs, each marked by a red circle with a second red circle growing from the middle. When the two circles meet, the bomb does damage if you're standing in it. You have to position to hit it and dodge the bombs at the same time."
    - "the shield turns slowly enough that a player who gets behind it has time to hit it."
    - "if you get too close, it does a large circle attack around itself."
  - Round 9: "claiming the shrine pylon (after beating the Warden) drops [the Region 2 barrier]."
  - Round 11: "Boss refights: yes, at an altar. After the first kill, an offering at the arena summons the boss again for its drops. The first kill unlocks the gate."
  - Round 11, on the laser: "region 2 will just unlock metal for landmines and the ability to make the bombs into cluster bombs". The laser is parked.

## Acceptance criteria

**The region (data, sim)**
- [ ] The overworld grows west by a region of about 40×45 tiles, making the map about 120×45.
  - /plan decides whether existing tile coordinates shift by +40 or the region uses its own offset. Either way, every landmark, node, pack, path and test names tiles through `OVERWORLD` data, so nothing is hard-coded.
- [ ] The west path, which today ends at tile (12, 27), continues west from that end to the map's old west edge. The end becomes a fork: 029's path turns north to the Frozen Grotto, and 030's west spring sits just south of it, beside the road. At the old west edge the road reaches a gap in the region's eastern cliffs, where the barrier stands. Its exact tile is set in data alongside 032's positions.
- [ ] The terrain is generated from the fixed seed with Hollows settings, so it is the same every run:
  - grey-blue stone ground with rubble and quarry-cut terraces
  - cliff runs that block movement and straight shots (lobbed shots fly over, as they do over everything)
  - broken aqueduct spans: solid pillars and fallen sections, with walkable gaps under the broken arches
  - ley-iron seams in cliff faces and quarry walls
  - The map edge is cliffs, never a bare wall (017).
- [ ] The region is danger ring 3. `ringOf` returns 3 anywhere inside it, whatever the distance, and the ring bounds stay data.
- [ ] Every landmark in the region is reachable on foot from the barrier once it's down. The 017 flood-fill test is extended to cover them.

**The barrier (sim, render)**
- [ ] A ley barrier wall seals the gap in the eastern cliffs: a new gate `hollows`, drawn as a shimmering cyan wall in the dome's style (017). It blocks the player, enemies and every projectile.
- [ ] Claiming the shrine pylon drops it for good (round 9). This records a gate event and plays a collapse with a sound. The objective chain then points at it (see Objectives).
- [ ] A KO never brings the barrier back, since claims are permanent.

**Landmarks and the site (data)**
- [ ] Three hand-placed landmarks, hidden until found (032), each overriding the terrain under it. The names below (and the Cistern Terrace, the Sunken Forum, the plate press, the mine packer and `iron-plate`) are kept as they are; Shaun may rename them later:
  - **The Ley-iron Cut:** an open quarry face with a dense cluster of ley-iron seams and boulders. It is a resource site, as in 032.
  - **The Broken Aqueduct:** a long fallen span crossing the region, whose pillars and rubble make cover. Snipers (035) use it.
  - **A Ley Spring** (030's rules, a landmark per 032) deep in the region, on the far side from the barrier, so the push to the Bulwark has a place to heal.
- [ ] **A claimable site, the Cistern Terrace:** a ruined terrace with a pylon, guarded by a fixed Region 2 pack (035). It is claimed by the 009/017 rules: clear it, then hold E. Claiming it gives:
  - a safe zone (017)
  - a deposit point and fast travel (009)
  - supply: per round 5, it sends its area's resources, ley-iron and stone. Each is added to that resource's supply port (028), and the foundry gains a ley-iron port on the west wall beside 028's four (tile chosen in /plan, clear of the bench).
- [ ] Fast travel: the Cistern Terrace joins the waystone's menu of claimed sites (032). E at a claimed pylon still offers "Travel to foundry".
- [ ] The site can be claimed before or after the Bulwark falls.

**Ley-iron (data, sim)**
- [ ] New raw item `ley-iron`. It is gathered with E from `ley-iron-seam` nodes, which use a new placement, `cliff-seam`, at cliff and quarry faces. They follow the 018 rules: uses, regrowth and visible remains.
- [ ] Ley-iron also drops from Region 2 enemies (035) and from the Bulwark.

**The shield rule (sim, shared with 035)**
- [ ] Enemy data gains an optional `shield: { arcDegrees, turnDegPerSec }`. A shielded enemy has a continuous facing angle and turns toward the player at no more than `turnDegPerSec`. It never snaps.
- [ ] A straight projectile (arrow, ley bolt, star shard) or a punch (023) that hits a shielded enemy is **blocked** when the hit point's bearing from the enemy's centre is within `arcDegrees / 2` of its facing.
  - It deals no damage, piercing rounds stop there, and a punch does no knockback.
  - It records a `blocked` event and shows a brass spark and a clang.
  - Hits from outside the arc land normally.
- [ ] Lobbed bursts (bombs, cluster bomblets, landmines) are never blocked, even when they land on the front side. They come from above, which is design.md's "armored front (arcing shots)" answer.

**The Bulwark (data, sim)**
- [ ] `bulwark`: a boss (`boss: true`, so no punch knockback) with a new attack kind. It stands in the arena (below) and aggros when the player enters the arena. The values below are starting values in data, tuned in playtest so that triple arrows from behind kill it in about 30–45 s.
- [ ] **Shielded front:** `shield` arc 180°, turning 40°/s, so a half turn takes 4.5 s: slow enough that a player who gets behind it has time to hit it. It walks slowly toward the player and stops turning only during the pound (below).
- [ ] **Bomb lob:** every `lob.cooldownTicks` while engaged, it rears back for a 30-tick wind-up, then lobs `lob.count` bombs.
  - One lands on the player's feet at the moment of the throw. The rest land at offsets within `lob.scatter` px of it, from the seeded RNG.
  - Each landing spot shows at once as a red outer ring of `lob.radius`, with a filled red circle growing from its centre over `lob.fuseTicks`.
  - When the inner circle reaches the ring, the bomb bursts. It deals `lob.damage` and knockback to a player whose feet are inside, unless a roll's i-frames are running.
  - The Bulwark's bombs never hurt enemies.
- [ ] **Pound, at close range:** when the player's feet are within `pound.triggerRange` and its cooldown is ready, it plants its shield and winds up for `pound.windupTicks`.
  - A large red ground circle of `pound.radius` shows around it, in the Warden's slam style (009).
  - It then pounds: `pound.damage` and knockback to a player inside.
  - It recovers for `pound.recoverTicks` without turning, which is the window to punish it.
- [ ] Starting values, all tuning in data:

  | Value | Start |
  | --- | --- |
  | health | 900 (the Warden has 200) |
  | walk | 18 px/s |
  | shield | 180° arc, 40°/s turn |
  | lob | every 240 ticks; 3 bombs; 80 px scatter; ring radius 40 px; 90-tick fuse; 25 damage |
  | pound | triggers within 72 px; 60-tick wind-up; 112 px radius; 35 damage, 40 px knockback; 60-tick recovery; 300-tick cooldown |
  | drops | 1 `bulwark-core`, 4–6 `ley-iron`, 1–2 `aqueduct-valve` |

- [ ] **Running away is allowed.** There is no lock-in. If the player is outside the arena for 300 ticks (5 s), the Bulwark walks home and returns to full health.
  - Before its first kill, a KO resets it like unclaimed land (017).
  - Its first kill is permanent and recorded as a boss defeat. It never respawns except through the altar.
- [ ] **The first kill** records a `bossDefeats` event and wakes the altar. The objective chain moves on to the third entrance (033). Per round 11, this kill "unlocks the gate": it also unseals the foundry wing's door (033), whose contents come in a later spec. The Region 3 gate comes with Region 3.

**The arena and the altar (data, sim, render)**
- [ ] **The Sunken Forum:** a ruined plaza ringed by cliffs and broken colonnades, with one wide way in and no door that locks behind the player. It holds the Bulwark's start point and an altar stone. Packs never spawn inside it.
- [ ] Before the first kill, the altar is dim and E at it does nothing.
- [ ] After the first kill, the altar glows. While no Bulwark lives, E at the altar shows the offering cost in a one-row menu, in the 033 restore-panel style. Paying it:
  - records a `summons` event
  - plays a 120-tick summon: the ground cracks in a red circle at the Bulwark's start point, then it rises
  - gives the same fight and the same drops
- [ ] While a summoned Bulwark lives, the altar is spent. If the player leaves, the summoned Bulwark heals and waits, and the offering is not refunded.
- [ ] Starting offering: 8 `ley-iron`, a region resource, so a refight costs a trip but no rare drops.

**Landmines (data, sim)**

Landmines and the cluster stage below are their own vertical slice: they are split into a separate backlog item, built after 034's region and boss and after 029. Their text stays here until that item is written.

- [ ] New ammo `landmine`, a new kind `mine`:
  - It is lobbed to the aim like a bomb, with the same arc, speed and max range.
  - On landing it arms and stays on the ground, showing a fuse ring that fills over `fuseTicks` (starting 300, which is 5 s).
  - It then explodes: `damage` 60 in `radius` 24 px. That is large damage in a small radius (round 2), against a bomb's 15 in 48 px.
  - It ignores contact. Only the timer sets it off.
  - Its damage type is physical.
  - There is no cap on live mines.
  - Carried landmines take hotbar key 4 (`SLOT_AMMOS`; `AMMO_KEYS` has room for four).
- [ ] Several mines in a volley land side by side, `LOB_SPACING` apart (024).
- [ ] A mine's explosion is a lobbed burst, so shields never block it.
- [ ] Mines don't hurt the player.
- [ ] Mines left behind vanish when the player changes area or is KO'd.
- [ ] The chain, in round-2 style (starting amounts):
  - ley-iron into a **plate press** makes iron plates, 2 per ley-iron
  - 1 iron plate, 1 fuse (husk resin) and 1 ley shard go into a **mine packer**, which makes 2 landmines. It reuses the bomb chain's fuse and shard.
  - Hand-crafting each part once unlocks its machine, as today (005).
  - The recipes appear in the crafting menu once ley-iron has been picked up.

**The cluster stage (data, sim)**
- [ ] The **cluster** shape stage for bombs, built on the ammo-stage framework (029):
  - an in-line stage machine, the **Shard die**, that takes bombs in and puts bombs tagged `cluster` out
  - a stage cost of 1 ley-iron per 4 bombs (round 2)
  - unlocked by hand-applying it to a bomb at the bench once (round 4)
  - A bomb takes at most one shape stage (round 3).
- [ ] A cluster bomb bursts as a normal bomb. Then, `cluster.delayTicks` later (starting 12), `cluster.count` bomblets (starting 4) land evenly around the burst point at `cluster.distance` (starting 40 px). Each bursts for `cluster.damage` (starting 8) in `cluster.radius` (starting 20 px).
- [ ] Bomblets are lobbed bursts: shields don't block them.

**Objectives (data)**
- [ ] The Milestone 1 goal chain (028) gains these Region 2 steps, tagged `milestone: 'm1'`, after 032's "Claim a second pylon" and before the frontier line:
  1. "Breach Stonefall Hollows": the barrier is down and the player is in the region
  2. "Claim the Cistern Terrace's pylon"
  3. "Defeat the Bulwark"
  4. "Restore the intake's third entrance (E with the Bulwark core)"
  5. "Feed all three entrances" (028's goal, moved here by 033)
  
  Each uses an existing check or a new one: `inRegion`, `claimed`, `bossDefeated` and `restored` (033).

**Art (render, data)**
- [ ] The Hollows are drawn in the 016/020 vector style, with new palette entries for grey-blue stone, rust and cyan veins (docs/art.md). They include:
  - cliffs with a lit top edge
  - quarry terraces
  - aqueduct pillars, arches and fallen spans
  - ley-iron seams with cyan glints
  - rubble
- [ ] The Bulwark rig: a hulking construct behind a rune-carved shield plate. Its animations are idle, walk, turn, lob wind-up and throw, pound wind-up, pound, recover, hit, a shield-block flash, and death. The back has a glowing core seam, so it reads as the place to hit.
- [ ] Also drawn:
  - the enemy bomb with its two red circles
  - the altar: dim, awake and summoning
  - the barrier wall and its collapse
  - the Sunken Forum and the Cistern Terrace with its pylon
  - the ley-iron node and item icon, the `bulwark-core` icon (distinct from the Warden core's violet)
  - the landmine, armed with its fuse ring, and its explosion
  - the bomblets
  - the new machines
- [ ] A boss health bar with the Bulwark's name shows along the top of the screen while it is engaged.

**Docs (on approval)**
- [ ] docs/design.md, with Shaun's approval:
  - "World, regions, ley lines, bosses" gains a regions line: Region 2 is Stonefall Hollows, west of the start, opened by claiming the shrine. Its boss is the Bulwark, and its metal is ley-iron.
  - "Boss gates" gains: "After the first kill, an offering at the boss's altar summons it again for its drops" (round 11).
  - "Bosses are engineering puzzles": the armored-front example names the Bulwark and its shield rule.

**Hook**
- [ ] `getState()` reports:
  - the player's region and ring
  - the `hollows` gate
  - the Bulwark's health, facing angle, mode and cooldowns
  - enemy bombs, with position and fuse progress
  - armed mines, with their fuse
  - boss defeats and the altar's state
  - the events `blocked`, `bossDefeats`, `summons` and `mineBursts`
- [ ] A sandbox start, `?start=hollows`, puts the player at the barrier with the gate open, for tests and playtests.

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass. The full tutorial run still passes, with the barrier dropping at the shrine claim.

## Data changes
- `src/data/overworld.ts`, or a new `src/data/hollows.ts`:
  - the region's bounds, generator settings, cliffs and aqueduct
  - landmarks, nodes, paths, the barrier gate, the site with its pylon and guards
  - the arena, the Bulwark's start, the altar and its offering cost
- `src/data/rooms.ts`: `GateId` gains `hollows`.
- `src/data/population.ts`: ring 3 packs (makeup in 035). The arena is excluded.
- `src/data/enemies.ts`:
  - an optional `shield` field on enemy defs
  - `bulwark`, a new attack kind with its lob and pound blocks, and its drops (core, ley-iron, aqueduct valves)
- `src/data/items.ts`: `ley-iron` (raw), `bulwark-core` (core, if 033 hasn't added it), `iron-plate` (part), `landmine` (ammo), each with its 031 panel group.
- `src/data/nodes.ts`: `ley-iron-seam` and the `cliff-seam` placement.
- `src/data/ammo.ts`: `landmine` (kind `mine`); the cluster block on the bomb's tag behaviour (029's tag table).
- `src/data/recipes.ts` and `src/data/pieces.ts`: the plate press and the mine packer with their recipes, and the Shard die (the cluster stage machine).
- `src/data/claims.ts`: the Cistern Terrace site and its `SITE_SUPPLY` entry, a ley-iron supply port fixture, and the Terrace in 032's waystone destination list.
- `src/data/objectives.ts`: the Region 2 steps and the checks `inRegion` and `bossDefeated`.
- `src/data/palette.ts` and `src/data/art`: as listed under Art.
- Sounds: barrier collapse, shield clang, enemy bomb tick and burst, pound, summon, mine arm and burst.

## Out of scope
- Region 2's regular enemies (035), built right after 034 on its own branch. Until 035 ships, Region 2 packs and the site's guards use ring 2's Husks and Wisps as placeholders.
- The laser, oil, the flamethrower, the static-pool bomb, and the lightning and fire runes (parked or later milestones, round 11).
- The foundry wing's contents.
- The 4th and 5th entrances.
- Region 3 and its gate.
- Ley range falloff.
- XP for the boss, the site or landmarks (037).
- Gear drops from the Bulwark.

## Test plan
- **Vitest:**
  - The map: the region is generated deterministically; landmarks override terrain; everything is reachable from the barrier; cliffs block walking and straight shots but not lobs; `ringOf` returns 3 in the region.
  - The barrier: it is closed before the shrine claim, drops on the claim, and stays down after a KO.
  - Ley-iron: harvest and regrowth.
  - The site: claim, supply to the ley-iron and stone ports, and the waystone's destination menu.
  - The shield, with a fixed facing:
    - an arrow hitting the front is blocked and stopped, even when piercing
    - an arrow hitting the back deals damage
    - a punch to the front does nothing
    - a bomb burst on the front side deals damage
    - turning is capped at `turnDegPerSec`
  - Bulwark lob: it throws `count` bombs, one at the feet; the growing circle meets the ring at `fuseTicks`; damage inside, none outside; a roll avoids it; no damage to enemies.
  - Bulwark pound: it triggers in range, damages inside the radius, and holds its facing through the recovery.
  - The leash and full heal; a KO resets it before the first kill; the first kill is permanent.
  - The altar: dim before the first kill; the offering is spent; the summon after 120 ticks; drops; spent while one lives.
  - Landmines: they land at the aim, arm, and burst at 300 ticks for 60 within 24 px; contact doesn't set them off; a volley lands them side by side; they clear on an area change.
  - Cluster: tagged bombs throw 4 bomblets at 40 px after 12 ticks, and the stage cost is spent.
  - Determinism.
- **Playwright:**
  - Claim the shrine (`?playtest`), walk west and see the barrier drop.
  - With `?start=hollows`: claim the Cistern Terrace; fight the Bulwark from behind with arrows and win; see the core drop; summon it again at the altar.
  - Fire a landmine and a cluster bomb.
- **Screenshots:**
  - the barrier, then breached
  - the Ley-iron Cut, the aqueduct and the Cistern Terrace
  - the Bulwark: facing the player, mid-turn, mid-lob with the circles, and the pound circle
  - a blocked hit spark
  - the altar, dim and awake
  - an armed mine
  - a cluster burst

## Open questions
None. Settled by Shaun, 2026-10-19 (see docs/brainstorm/2026-10-19-open-questions.md).

## Raised after the build (for Shaun at playtest)
- **Bulwark HP probably too low.** At 900 HP, a bot circling behind it with single arrows kills it in about 25 s, so triple volleys would beat the 30–45 s target easily. 2,000–2,500 HP may be right. A sim test now records the full-HP fight so it can be retuned.
- **Arena-only attacks (the spec didn't say).** The Bulwark lobs and pounds only while the player is inside its arena. Before the fix it could keep lobbing at a player anywhere on the map for up to 300 ticks.
- **Stand-off distance.** It stops walking about 54 px from the player (`standOff` in data). It wasn't in the spec.
- **Altar panel.** It also opens while the altar is spent or summoning, with Summon greyed out.
- **Placement choices** are listed in the 034 plan. The Ley-iron Cut has no pylon of its own; the Cistern Terrace is the region's only claim.
- **Art** waits on Shaun's approval by eye (docs/review/034).
- **After review, measured:** a bot circling to the Bulwark's back with single carried arrows beats the full 900 HP in 1,515 ticks (about 25 s) and takes no damage at all (tests/sim/bulwark.test.ts). So the fight may need more HP, a faster turn, or more pressure on a player who circles. Shaun to tune at playtest.
