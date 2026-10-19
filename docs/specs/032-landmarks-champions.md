# 032: Landmarks and champions
status: draft

## Goal
The world has places worth finding and fights worth remembering. Landmarks fill the dead path ends and the empty outer ring:
- **Four resource sites** (Quarry, Old Grove, Reed Marsh, Ley Grotto), each a dense cluster of one material with a claimable pylon that sends that material home.
- **A guarded Frozen Grotto**, the source of rime shards.
- **Ley Springs.**
- **A guarded Ruined Cache** with a chance at a schematic or a rare part.

Landmarks are hidden until you see them. Then they stay on the minimap, and the first sighting is recorded for XP. Any non-boss enemy can also spawn as a **champion**: bigger, tougher, glowing and named, with richer drops.

## Design references
- docs/design.md:
  - **"Pillars and design rules":** "Emergence from rules, not content". Champions are a rule applied to any enemy, not new enemies.
  - **"World, regions, ley lines, bosses":**
    - "Difficulty by distance"
    - "Claiming: clear a site, then set it up as a supply line to the foundry"
    - "Pylons are deposit points"
    - "Fast travel: between the foundry and any claimed site"
    - "Regional pull"
    - the theme rule
  - **"The Foundry":**
    - "What monsters drop": schematics "rarely, with a big visual pop when one lands"
    - "No ratio math. Supply lines deliver a fixed amount per minute."
  - **"Death and tension":** a schematic found deep in unclaimed land has to survive the trip back.
- docs/specs/017-overworld.md: the fixed-seed map, rings, landmarks that override terrain, the population, safe zones and the minimap
- docs/specs/018-believable-resources.md: node placement rules, ley lines, and the pylon harvest with motes running home
- docs/specs/009-claiming.md and 011-death.md: claim, deposit, fast travel, and what a death resets
- Draft specs this one builds on or feeds:
  - **028 (foundry flow fixes):** one supply port per resource, each showing "×N pylons" and its rate, plus the goal chain ("claim a second pylon")
  - **029 (ammo stages):** the rime shard, as the frost rune's input
  - **030 (healing):** Ley Springs and how they heal
  - **033 (research):** the schematic items, their rare-drop roll (which already lists "25% from a Ruined Cache (032)" and "5% for a champion (032)"), the pop when one lands, and the Region 1 machine part `rune-cog`
  - **034 (Stonefall Hollows):** the west path continues from (12, 27) to the Region 2 barrier
  - **037 (leveling):** XP for first discoveries and champion kills
- docs/brainstorm/2026-10-19-content.md:
  - Playtest finding: "14 nodes are scattered across the meadow, so gathering is a walk. The west and south-east paths end in nothing. The outer ring is forest with packs and no landmarks."
  - Area 9, Landmarks and champions: "Cut: Husk Den. A champion pack does the same job."
- Shaun's interview answers, 2026-10-19:
  - **Round 4:** "a frost crystal ('rime shard') gathered at a landmark such as a frozen Ley Grotto"
  - **Round 4, supply ports:** "Every claimed pylon that supplies that resource adds to its rate."
  - **Round 5:** "Each pylon sends the resources of its area. A Quarry pylon sends stone, a Ley Grotto pylon sends crystal."
  - **Round 5:** "Ley Springs: stand in the pool to heal fast. No uses and no timers."
  - **Round 6, champions:**
    - "about 1.5× size, +50% HP, +30% damage, +15% speed"
    - "2–3× drops and guaranteed armor"
    - "a glow and a name"
    - "about 1 in 8 packs has one, more often in the outer rings"
  - **Round 6, first landmarks:** "all four":
    - resource sites (Quarry, Old Grove, Reed Marsh, Ley Grotto), each with a claimable pylon sending its resource home
    - a Frozen Grotto, the guarded rime-shard source
    - Ley Springs
    - a Ruined Cache, guarded, with a chance at a schematic or rare part
  - **Round 6, discovery:** "landmarks are hidden until found. A landmark appears on the minimap once seen, and finding one gives XP."
  - **Round 6, map:** "fixed and hand-tuned, with one seed, the same world every game."
  - **Round 10:** XP comes from "kills (scaled by danger ring, more for champions) … and finding landmarks for the first time".

## Acceptance criteria

**Landmarks as data (data, sim)**
- [ ] A new `src/data/landmarks.ts` lists every landmark as a typed entry with a kebab-case id. Each entry has:
  - its name and kind (`resource-site`, `frozen-grotto`, `ley-springs` or `ruined-cache`)
  - its area, as a tile rect
  - its features and nodes, which follow 018's placement rules
  - its guard pack, if any
  - its pylon, if any: a tile, a site id and the item it supplies
  - its ley line home, if it has a pylon
  - its minimap marker
- [ ] Landmarks are stamped onto the fixed-seed map (017) the same way every game. Their areas are kept clear of generated trees, rocks, water and stones, and their own features are stamped over that.
- [ ] Data tests:
  - every landmark area is inside the map and clear of the forest edge
  - no two areas overlap, and none overlaps the start meadow, the ruin field or the shrine
  - every landmark sits in the ring its entry declares
  - every node follows its 018 placement rule
  - every landmark is reachable on foot from the start (017's flood fill)
  - every item, enemy and node id an entry names exists
- [ ] Starting positions, for review. Tile centres; rings use 017's bounds of 17 and 26 tiles from the foundry entrance.

  | Landmark | Centre | Ring | Fills |
  | --- | --- | --- | --- |
  | Quarry (stone) | (12, 23) | 2 | beside the end of the west path, which 034 carries on to its barrier |
  | Reed Marsh (fiber) | (65, 38) | 2 | the end of the south-east path |
  | Old Grove (wood) | (22, 6) | 1 | the empty north-west |
  | Ley Grotto (ley crystal) | (72, 27) | 2 | the empty east, below the shrine |
  | Ruined Cache | (9, 9) | 2 | the north-west corner |
  | Frozen Grotto (rime shard) | (11, 40) | 2 | the south-west corner, the farthest point |
  | Ley Springs | 030's position | 030's | — |

**Resource sites (data, sim, render)**
- [ ] Each resource site is a dense cluster of its node, starting at 5 nodes:
  - the **Quarry**'s boulders stand in a rock field among cut stone blocks of the lost civilisation
  - the **Old Grove**'s trees stand in a sunlit grove of old trees
  - the **Reed Marsh**'s reeds stand round a cluster of ponds
  - the **Ley Grotto**'s ley veins stand where its ley lines cross in a sunken rock hollow
- [ ] Nodes use today's `NODES` entries, with the same uses, yield and regrow. The existing 14 meadow and shrine nodes stay.
- [ ] Each resource site has a ley pylon guarded by a pack. Claiming works like the shrine's claim (009, 017):
  - clear the guards, then hold E at the pylon
  - the claim makes a safe zone and adds a deposit point
  - the claimed pylon is a fast-travel destination
  - the claim is permanent
- [ ] The overworld can hold several pylons, each with its own site id. If 028 hasn't already generalised `Room.pylon` to a list, this spec does.
  - `pylonInReach`, claiming, deposit, safe zones and the summary's `claims` work per pylon.
  - The shrine keeps its site id, `shrine`.
- [ ] **Supply (with 028):** a claimed resource-site pylon adds its supply rate to the foundry port for its item. Claiming the Quarry raises the stone port's "×N pylons" by one and adds to its rate. The rate per pylon is 028's data.
- [ ] **Ley lines home (with 018):** each resource-site pylon has a ley line in data from the pylon to the foundry stairs. The 018 harvest visuals use it: a tendril to the nearest node of that item in the zone, then a mote running home along the line.
- [ ] Hovering a landmark's pylon names the landmark and what it sends, using 018's descriptions. For example: "Quarry pylon: sends stone home."

**Frozen Grotto (data, sim, render)**
- [ ] A sunken hollow where the ley runs cold: frost-rimed rock, pale ice ground (walkable, no sliding) and a cold blue-white light, in the 016 vector style and palette.
- [ ] It holds a starting 3 rime nodes that yield the **rime shard**. The rime shard item is 029's.
  - If 029 has already added a rime node or a temporary source, this spec moves it into the Grotto.
  - Otherwise this spec adds the node type ("Rime cluster") with a placement rule, `frozen-grotto`, that keeps it inside a Frozen Grotto area.
- [ ] It is guarded by a fixed pack (starting at 5, from ring 2's makeup). It has no pylon.

**Ruined Cache (data, sim, render)**
- [ ] A sealed reliquary of the lost civilisation, in rune-carved stone with a ley seal, inside a broken ruin and guarded by a fixed pack (starting at 5, from ring 2's makeup).
- [ ] While any guard lives, the cache is sealed. Once they are dead, holding E (like a harvest, starting at 60 ticks) opens it.
  - It rolls its drop table with the seeded RNG and scatters the drops on the ground, like an enemy's.
  - Drops are picked up as normal and are at risk until banked.
- [ ] The cache's drop table is data in the same `DropTable` shape enemies use, extended with weighted rare entries. Starting values:
  - always 3–5 raw materials, from the region's raws
  - a rare-part entry: 033's Region 1 machine part, `rune-cog`, at a starting 50%
  - a schematic entry, rolled by 033's schematic roll at 033's cache chance (starting at 25%)
- [ ] **These rare entries depend on 033.** 033 owns the schematic items, their roll (no duplicates, region rules), their pop and the `rune-cog` item. This spec only gives the cache an open event and a drop-table slot that 033's roll uses.
  - If 032 is built before 033, the cache opens with its raws only.
  - 033 then fills in the rare entries as data. No cache code changes.
- [ ] An opened cache shows as open and empty until it re-arms. See open question 4.

**Ley Springs (with 030)**
- [ ] 030 defines Ley Springs and how they heal. This spec doesn't change those rules.
- [ ] This spec adds the Springs as a landmark entry at 030's position, so that they are hidden until seen, shown on the minimap once found, and recorded on first discovery like every other landmark.

**Discovery (sim, render)**
- [ ] A landmark is discovered on the first tick any part of its area is inside the camera's view. The sim already computes this view as `viewRect` (017).
- [ ] Discovery records:
  - the landmark's id in a new `discovered` list in sim state
  - a `discoveries: { landmark }` event on that tick, once ever per landmark, for 037 to turn into XP
- [ ] Discoveries are never lost. A death keeps them, like claims.
- [ ] The minimap shows a landmark's marker, a small icon per kind in palette colours from data, only once the landmark is discovered. Undiscovered landmarks have no marker. The minimap's terrain is drawn as today; there is no fog.
  - The start stone, foundry entrance and shrine keep their markers from the start, as today.
  - Claimed pylons keep the cyan claimed marker.
- [ ] On discovery, a short banner shows the landmark's name in the display font, and fades out after `LANDMARKS.bannerMs` (starting at 2000). It never covers the objective panel.
- [ ] `getState()` reports `discovered: string[]` and each landmark's `{ id, discovered, claimed, opened }`.

**Guards (data, sim)**
- [ ] Each landmark guard pack is placed in data with a group equal to its landmark's id. A pylon's site can't be claimed, and the cache can't be opened, while any of its group lives (009's `occupied`).
- [ ] Guards follow 017's rules for when they appear and reset. See open question 5 for when that is.
- [ ] Guards never spawn inside a claimed pylon's safe zone, and the guards of a claimed site despawn, as 017's packs do.

**Champions (data, sim)**
- [ ] A new `src/data/champions.ts` holds all champion tuning. Starting values, from Shaun's round 6:
  - `scale: 1.5`
  - `health: 1.5`
  - `damage: 1.3`
  - `speed: 1.15`
  - `dropRolls: [2, 3]`
  - `armor: 1`, the guaranteed unidentified pieces
  - `chanceByRing`: ring 1 is 1 in 8 and ring 2 is 1 in 5. The per-ring split is a proposal (open question 8).
  - glow colour and size
  - name lists per enemy id. These are placeholders (open question 9).
- [ ] When a population pack (017) or a landmark guard pack spawns, it rolls once against its ring's chance with the seeded RNG. On a hit, one member, picked by the RNG, is a champion.
  - Bosses (`boss: true`, such as the Pylon Warden) never are.
  - The tutorial's fixed packs (the ruin-field Husks and the shrine guards) never are.
- [ ] A champion, compared with the same enemy's def:
  - **Size:** `scale` × its sprite, feet box and hurtbox
  - **Health:** max health × `health`
  - **Damage:** every attack's damage × `damage`, rounded (swipe, orb and slam)
  - **Speed:** walk speed × `speed`
  - Attack timings, telegraph lengths and attack reach are unchanged, so every attack still reads and dodges the same.
- [ ] When a champion dies:
  - its drop table is rolled 2 or 3 times (seeded)
  - exactly one unidentified armor piece drops, guaranteed, instead of the usual armor chance
  - 033's schematic and machine-part rolls apply at their champion rates (033's data), not once per drop roll
  - the death event carries `champion: true` for 037's XP
- [ ] Champions are a rule over enemy data. Any non-boss enemy added later, such as Region 2's Charger, Burrower, Shardback and Sniper, can be a champion with no new code. A test applies the rule to every non-boss entry in `ENEMIES`.
- [ ] `getState()` reports each enemy's `champion: { name } | null`.

**Champions (render)**
- [ ] A champion is drawn at 1.5× with a soft glow round its body in the champion colour (data, starting at `gold-trim`), pulsing slowly. The glow draws under telegraph markers and hit flashes so they stay readable.
- [ ] Its name shows above it while it's on screen, for example "Mossjaw" with "Husk champion" beneath it in smaller text. The name is picked from the enemy's name list with the seeded RNG. Its hover name (015) is the same.
- [ ] Its overhead health bar is drawn in the champion colour.

**Population and safe zones (sim)**
- [ ] With every resource site and the shrine claimed, rings 1 and 2 still reach their pack targets (017). A test claims all five and steps until the targets are met. If they can't be met, the build reports it rather than changing the targets. See open question 6.

**Art (data/art)**
- [ ] New vector art in the 016 style and palette, pending Shaun's review on `/sheet.html`:
  - the quarry's cut blocks
  - the old grove's old trees
  - the marsh's ponds
  - the grotto hollows, including the frozen variant with rime nodes and remains
  - the cache, sealed, open and empty
  - the landmark minimap icons
  - the champion glow
- [ ] Everything fits the theme rule: the lost civilisation, its ley lines, nothing modern.

**Flow unchanged**
- [ ] The tutorial (012, 017, 027) still runs end to end with every objective in order. The shrine is still the first claim. See open question 5.
- [ ] `?playtest` and `?start=field` still start as before.

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass.
- [ ] Screenshots:
  - each landmark
  - the minimap before and after discovering the Quarry
  - the discovery banner
  - a claimed Quarry pylon with a mote running home
  - the stone port showing "×2 pylons"
  - the cache sealed, and opened with its drops on the ground
  - a champion Husk and a champion Wisp beside normal ones

## Data changes
- `src/data/landmarks.ts` (new): landmark entries, guard packs, the cache drop table, `LANDMARKS.bannerMs`, minimap marker styles.
- `src/data/champions.ts` (new): the champion tuning and name lists.
- `src/data/overworld.ts`:
  - landmark areas added to the clearings
  - the new features and nodes
  - ley lines for each resource site
  - pylons as a list, if 028 hasn't made them one
- `src/data/nodes.ts`: the `frozen-grotto` placement and the rime node, if 029 hasn't added them.
- `src/data/claims.ts` and 028's port data: which item each resource-site pylon supplies.
- `src/data/hudLayout.ts`: minimap landmark markers and the discovery banner.
- `src/data/descriptions.ts`: hover lines for the new pylons, the cache and the rime node.
- `src/data/art/`: the landmark, cache, rime and champion art.

## Out of scope
- XP and levels. 037 turns `discoveries` and champion kills into XP; this spec only records them.
- What schematics restore (033), and the rime shard's use (029).
- How Ley Springs heal (030).
- Region 2, its barrier and its landmarks.
- New enemy types.
- Fog of war on the minimap, or enemies on the minimap.
- Champion-only abilities or affixes beyond Shaun's stat list.
- Elite or boss variants.
- A Husk Den, which was cut in the brainstorm.

## Test plan
- **Vitest:**
  - The landmark data tests listed above.
  - **Discovery:** fires once when an area first enters `viewRect`, never again, and survives a death.
  - **Multiple pylons:** claim each in turn; check deposit and fast travel at each, a safe zone per pylon, and the 028 port's pylon count and rate rising per claim.
  - **Cache:** sealed while guards live; opens with E after; seeded drops; every item the table names exists (the rare entries only once 033 is built).
  - **Champions:**
    - the roll rate over many seeds is within tolerance of each ring's chance
    - no champion among bosses or tutorial packs
    - stats scaled from the def for every non-boss enemy
    - 2–3 drop rolls plus exactly one armor piece
    - the death event's flag
  - **Population:** targets are met with all five sites claimed.
- **Playwright:**
  - Walk toward the Quarry, see `discovered` gain `quarry` and its minimap marker appear.
  - Clear and claim the Quarry pylon, deposit there, fast travel there.
  - Open the cache.
  - Fight a champion spawned through a dev-only hook on `__GAME__`, which spawns a champion pack near the player in dev builds only.
- **Screenshots (qa):** the list under Checks.

## Open questions
1. **Positions.** The table's centres are a proposal: the Quarry beside the west path's end, the Reed Marsh at the south-east path's end, and the rest in the empty outer ground. 034 carries the west path on from (12, 27) to its barrier, and may shift every tile by +40. **Proposal:** the Quarry sits just north of the path so it never blocks the way to the barrier. Positions are named through `OVERWORLD` and landmark data only, so a shift needs no code change.
2. **Grotto form.** Are the Ley Grotto and the Frozen Grotto open-air sunken hollows on the map, or interiors you enter, like the foundry? 017 says there are no buildings "unless you enter a special dungeon". **Proposal:** open-air hollows, so they show on the minimap and need no new room.
3. **The Frozen Grotto's pylon.** Shaun listed it as a guarded source, with no pylon. **Proposal:** no pylon. Rime is gathered by hand, so carrying it home is the risk.
4. **Does the cache re-arm?** Options:
   - (a) once per game
   - (b) its guards and contents return after a stretch of play time
   - (c) it resets on death, like unclaimed land

   (c) invites dying on purpose after depositing. **Proposal:** (b), after 10 minutes of play (data), out of view. Play time only, so it never nags.
5. **When landmark guards appear, and when the new pylons can be claimed.** 017 keeps the world calm until the first line fills, and the shrine is meant to be the first claim. **Proposal:**
   - guards appear with the population at the first fill
   - until then the cache stays sealed and the new pylons stay dormant
   - the new pylons can be claimed only after the shrine is claimed
   - nodes can be gathered at any time
6. **Safe zones.** Five claimed pylons with 017's 10-tile safe zone cover much of ring 2 and may starve spawning. **Proposal:** a safe radius per pylon in data, starting at 7 tiles for resource sites, with the shrine kept at 10.
7. **Guards for resource sites.** Shaun didn't say whether they're guarded. Claiming in the design means clearing a site first. **Proposal:** one pack of the ring's makeup (Husks and Wisps, 3–5), with the usual champion roll, and no elite.
8. **Champion chance per ring.** "About 1 in 8, more in the outer rings." **Proposal:** ring 1 is 1 in 8 and ring 2 is 1 in 5. Ring 0 has no population. Later regions add their own entries.
9. **Champion names.** **Proposal:** a short epithet-style name per enemy type from a data list (for example Mossjaw, Rootgrip and Thornback for Husks), with "<Enemy> champion" beneath it. The lists are placeholders for Shaun to rewrite.
10. **The "rare part".** No such part exists today. 033 proposes `rune-cog` as Region 1's machine part. **Proposal:** the cache's rare part is the rune cog, at 50%. A rarer, cache-only part would need Shaun's call.
11. **Champion reach.** **Proposal:** a 1.5× body doesn't scale its attack reach, so telegraphs stay true to today's ranges. The alternative scales reach with size.
12. **Do the shrine and the foundry count as discoveries for XP (037)?** **Proposal:** no. They're found through the tutorial and marked from the start.
13. **Choosing a fast-travel destination.** With several claimed pylons, the waystone needs a choice. If 028 doesn't add one, **proposal:** the waystone's menu lists claimed pylons by landmark name.
