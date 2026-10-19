# Open questions for specs 028–037

Oct 19, 2026 · Shaun's decision list for the draft specs 028–037. They come from the interview in docs/brainstorm/2026-10-19-interview.md.

Each line gives the question, then the proposed answer. Numbers match the "Open questions" section of each spec (028.1 is spec 028, question 1). Answer "yes" to accept a proposal, or give your own answer. There are 98 questions in all.

## Cross-spec decisions

These touch several specs. The specs already use the proposed answer, so a different answer means editing every spec listed.

- **A. Name of the ley ammo** (029.3, 034, 037). You call it "ley crystals", but that is already the raw's name. Proposal: the ammo stays `ley-bolt` ("Ley bolt"). Variants are "Homing ley bolt" and "Star ley bolt".
- **B. Region 1 machine part** (033.2, 031, 032.10). Proposal: one part, `ancient-gear` ("Ancient gear"). Husks and Wisps drop it at 4%, champions at 12%, and the Ruined Cache at 50%. The drafts also used the name `rune-cog`; that is dropped. Region 2's part is `aqueduct-valve`.
- **C. The west path's end at (12, 27)** (029, 030, 032.1, 034). Proposal: the end becomes a fork. 029's path runs north to the Frozen Grotto, 034's road runs west to the Region 2 barrier, and 030's west spring sits beside the road at (10, 31). 032's landmarks fill the empty outer ground instead. Region 2 may shift every tile by +40 (034).
- **D. Healing doesn't stack** (030.1, 036.8, 037). Proposal: the highest rate applies. Gear and talent field regen is one of those rates, so it doesn't add to spring or pylon healing.
- **E. Order of the goal chain** (028.5, 029, 032, 033, 034). Proposal: 028's goals come first. "Feed all three entrances" moves later, because the third entrance now needs the Bulwark core. The order is then: 029's stage goals, 032's "Claim a second pylon", then 034's steps (breach, claim the Terrace, beat the Bulwark, restore the 3rd entrance, feed all three). The frontier line comes last.
- **F. Who owns schematics and drops** (032.3, 032.10, 033.4, 033.10). Proposal: 033 owns the schematic items, their drop roll (1% for a normal enemy, 5% for a champion, 20% from the cache, no duplicates), the pop and the parts. 032 owns the cache and champions, which only call that roll. If 032 is built first, its cache gives raws only.
- **G. Choosing where to fast travel** (032.13, 034). Proposal: 032 adds a waystone menu of claimed pylons, listed by landmark name, and 034 adds the Cistern Terrace to it.
- **H. Shield rule** (034.3, 035.1). Proposal: 034 owns it. Straight shots and punches into the front arc are blocked. Bombs, bomblets and mines always land. The Shardback (035) reuses the rule.
- **I. XP values** (037.10, 034, 035). Proposal: 037 sets every XP value, including Region 2's. 032 only sends a `discoveries` event and a `champion` flag on deaths.
- **J. Bulwark cores** (033.3, 034.7). Proposal: `entrance-3` and `reservoir-2` each cost one Bulwark core, so the second core means a refight at the altar. The altar offering is 8 ley-iron.
- **K. Sealed foundry wing** (033.8, 034.6). Proposal: the Bulwark's first kill unseals it. What's inside comes in a later spec.
- **L. Keys** (031.4, 033.7, 037.9). Proposal: I or Tab opens the inventory, J the research list and T the talents. None of the panels pauses the game.

## 028 Foundry flow

- 028.1 Where do the four ports go? Proposal: on the west wall at (1, 4), (1, 6), (1, 8) and (1, 10). The bench stays at (1, 12).
- 028.2 When do ports appear? Proposal: each appears with its first supplying pylon, not all four from the start shown at "×0".
- 028.3 What supply rate? Proposal: 15 a minute per pylon for each raw (`SUPPLY_TICKS` 240), so 60 a minute in all from the shrine.
- 028.4 Hopper caps? Proposal: items arriving by line cap at 99. Hand-filling stays uncapped.
- 028.5 What shows when every goal is done? Proposal: a standing frontier line, "Explore beyond the shrine", rather than naming the next milestone.
- 028.6 Goal wording? Proposal: build with the first drafts, and you edit the text at approval.

## 029 Ammo stages

- 029.1 Arrow pierce limit? Proposal: an arrow passes through 2 enemies and hits 3. The alternative is unlimited pierce.
- 029.2 Bomb damage type now that burn is gone? Proposal: physical, until the fire rune.
- 029.3 Ley ammo name? Proposal: keep "Ley bolt" (see A).
- 029.4 Ley guide input? Proposal: 1 ley crystal per 4 rounds.
- 029.5 Shatter lens input? Proposal: 2 ley crystals per 4 rounds, because a star bolt adds 5 projectiles.
- 029.6 Stage names? Proposal: the frost rune, the ley guide and the shatter lens.
- 029.7 Is homing a shape? Proposal: yes, so a bolt is homing or star, never both.
- 029.8 What is the "selected target" for homing? Proposal: the enemy nearest the cursor when you fire, with no new targeting key.
- 029.9 Cold numbers? Proposal: 4 hits freeze an enemy for 1.5 s, bosses for half as long, then a 2 s window with no new freeze. Tune in playtest.
- 029.10 When do the bench's Stages rows appear? Proposal: once the shrine is claimed.
- 029.11 Carried tagged rounds? Proposal: they fire from their base ammo's slot, before plain rounds.
- 029.12 Frozen Grotto guards and place? Proposal: 3 Husks and a Wisp that come back on a KO, in the north-west at (9, 5)–(19, 13).

## 030 Healing

- 030.1 Healing rates? Proposal: pylon zones and springs both 10 HP/s, the foundry 50 HP/s, field regen 0.
- 030.2 Healing at the foundry: a fast fill or instant? Proposal: a fast fill, about 2 s from empty, so the heal shows on screen.
- 030.3 Pause healing after a hit? Proposal: no pause.
- 030.4 Where do the springs go? Proposal: west at (10, 31) and south-east at (66, 38), plus a north spring at (26, 8) that is cut if healing near home is too easy.
- 030.5 Pool radius? Proposal: 1.5 tiles.
- 030.6 Springs on the minimap? Proposal: not until 032's discovery rules.

## 031 HUD and inventory

- 031.1 Does the panel show the stash? Proposal: yes, a dim "home N" on each row beside the safe and at-risk counts.
- 031.2 Where do schematics go? Proposal: under Parts, so there is no sixth group (033 agrees).
- 031.3 Too many gear pieces? Proposal: list the worn piece and the unidentified count, then "N spare pieces". 036 replaces this.
- 031.4 Where does the pickup feed go? Proposal: top-left, where the materials column was.
- 031.5 HP bar size? Proposal: a 144×12 fill that rises above the build bar in build mode.
- 031.6 Normal fill colour? Proposal: green (`leaf`), turning red below 25%.
- 031.7 Armor icon? Proposal: a shield with the armor value. Armor weight shows only in the inventory panel.

## 032 Landmarks and champions

- 032.1 Landmark positions? Proposal: the table as written (Old Grove (8, 19), Quarry (21, 18), Ley Grotto (73, 24), Reed Marsh (73, 35), Ruined Cache (11, 38)).
- 032.2 What form does the Ley Grotto take? Proposal: an open-air sunken hollow, not an interior you enter.
- 032.3 Does the cache re-arm? Proposal: yes, after 10 minutes of play time, out of view. Not on a KO, since that would reward dying on purpose.
- 032.4 When do guards appear and pylons wake? Proposal: guards are there from the start and come back on a KO. The new pylons stay dormant until the shrine is claimed.
- 032.5 Can landmark guards include champions? Proposal: yes, the Grotto's guards included. The tutorial packs never do.
- 032.6 Are resource sites guarded? Proposal: yes, by one pack of 3–5 of the ring's enemies, with no elite.
- 032.7 How big are safe zones? Proposal: 7 tiles for resource sites, so 5 claims don't stop spawning. The shrine stays at 10.
- 032.8 Champion chance per ring? Proposal: 1 in 8 in ring 1 and 1 in 5 in ring 2.
- 032.9 Champion names? Proposal: placeholder epithets such as "Mossjaw", with "Husk champion" beneath, for you to rewrite.
- 032.10 What is the cache's "rare part"? Proposal: the ancient gear, at 50% (see B).
- 032.11 Does a champion's reach grow with its size? Proposal: no, so telegraphs stay true.
- 032.12 Do the shrine and the foundry count as discoveries? Proposal: no.
- 032.13 How do you pick a fast-travel destination? Proposal: a waystone menu of claimed pylons (see G).

## 033 Research

- 033.1 Which entrance does a core open? Proposal: the one whose cap you restore. The alternative is a fixed order.
- 033.2 What are machine parts for? Proposal: one per region (ancient gear, aqueduct valve), spent only on restoration for now. Placing a machine stays free.
- 033.3 Node costs? Proposal: the table as written. `reservoir-1` costs Region 1 parts only, and machine speed is ×0.75.
- 033.4 Schematic drop rates? Proposal: 1% for a normal enemy, 5% for a champion and 20% from the cache, with no duplicates.
- 033.5 When does a schematic reveal its node? Proposal: once banked, not on pickup.
- 033.6 How do the splitter and merger work? Proposal: the splitter alternates between its two outputs, and the merger takes from its three inputs in turn.
- 033.7 Which key opens the research list? Proposal: J.
- 033.8 The sealed wing? Proposal: draw only its door now. The Bulwark's first kill unseals it.
- 033.9 Can the Warden be refought at an altar? Proposal: no, altars are for region bosses only.
- 033.10 Where do the drop-table changes live? Proposal: in 033 (see F).

## 034 Stonefall Hollows

- 034.1 Placeholder names (Ley-iron Cut, Broken Aqueduct, Cistern Terrace, Sunken Forum, plate press, mine packer)? Proposal: keep them.
- 034.2 A third landmark? Proposal: a Ley Spring deep in the region.
- 034.3 Do shields block lobbed rounds? Proposal: no, bursts always land.
- 034.4 Bulwark shield arc and turn speed? Proposal: a 180° arc turning 40°/s, at an 18 px/s walk.
- 034.5 The Bulwark's other numbers? Proposal: 900 HP and the lob and pound values as written, aiming for a 30–45 s kill from behind.
- 034.6 What does "the first kill unlocks the gate" mean? Proposal: it wakes the altar, advances the goals and unseals the foundry wing. The Region 3 gate comes later.
- 034.7 The altar's offering? Proposal: 8 ley-iron.
- 034.8 Running from the boss? Proposal: there is no lock-in. After 5 s out of the arena, it walks home and heals.
- 034.9 Landmine chain? Proposal: ley-iron → plate press → iron plate, then plate + fuse + ley shard → mine packer → 2 landmines.
- 034.10 Landmine rules? Proposal: only the timer sets them off, they never hurt the player, they deal physical damage, and live mines have no cap.
- 034.11 Cluster stage? Proposal: 4 bomblets, 8 damage each in 20 px, at a cost of 1 ley-iron per 4 bombs. The machine is the "Shard die".
- 034.12 Hotbar key for landmines? Proposal: 4.
- 034.13 Split landmines and the cluster stage into their own backlog item? Proposal: yes, built after 034.
- 034.14 Region 2 packs before 035 ships? Proposal: Husks and Wisps as placeholders, with 035 built next.
- 034.15 Region 2 part? Proposal: `aqueduct-valve`. The Bulwark also drops 1–2.

## 035 Hollows enemies

- 035.1 The Shardback's attack? Proposal: a short frontal shield bash, with no bombs and no pound.
- 035.2 A Charger that hits a wall? Proposal: a 1 s stun as a punish window.
- 035.3 A Burrower underground? Proposal: nothing can hit it, bombs included. It follows normal ground collision.
- 035.4 Sniper cover? Proposal: cover is worked out from the tile grid. The laser doesn't show through solids, and a blocked line cancels the shot.
- 035.5 Telegraph colour? Proposal: the shared enemy red, including the laser.
- 035.6 Numbers? Proposal: the table as written. Ring 3 has 6 packs of 4–5 and a 1 in 4 champion chance.
- 035.7 Drops? Proposal: 1 ley-iron always, a 4% aqueduct valve, and the schematic roll. Unidentified armor drops at 10%.
- 035.8 Are the new enemies Region 2 only? Proposal: yes. There are no Husks or Wisps in Region 2, and no new enemies in rings 1–2.
- 035.9 When to build 035? Proposal: right after 034, on its own branch.

## 036 Equipment

- 036.1 Armor floor? Proposal: a hit always deals at least 25% of its damage.
- 036.2 Base armor for helm, boots and trinket? Proposal: helm and boots 1–2, trinket 0.
- 036.3 Relic list? Proposal: keep all four (Rollbreaker, Wardstone, Featherplate, Last Ember) for the playtest.
- 036.4 What does a relic carry? Proposal: its rule plus 2 affixes. Duplicates are allowed.
- 036.5 Rarity odds? Proposal: flat 60/30/10, with 3% relics everywhere for now.
- 036.6 Any affix on any slot? Proposal: yes.
- 036.7 Equip anywhere? Proposal: no, only at the bench.
- 036.8 Does regen stack with healing? Proposal: no. The highest rate applies (see D).
- 036.9 Too many pieces? Proposal: no scrapping yet. Revisit with the merchant.
- 036.10 What are "Rare Relics"? Proposal: a separate relic tier (its rule + 2 affixes). The alternative is a Rare piece with 3 affixes plus a rule.

## 037 Leveling and talents

- 037.1 The 19-node list? Proposal: keep it for the first playtest.
- 037.2 Keystone mix? Proposal: two combos (Blastfletch, Shatterpoint) and one capstone (Overpressure).
- 037.3 Is Shatterpoint too late, since it needs frost arrows? Proposal: keep it as a goal to build toward.
- 037.4 XP curve and cap? Proposal: the curve as written, capped at level 15.
- 037.5 XP for a boss refight? Proposal: 50% of the boss's XP.
- 037.6 Ring 0 XP? Proposal: ×1.
- 037.7 Where can points be spent? Proposal: anywhere. Respec is at the foundry only.
- 037.8 Does the tree panel pause the game? Proposal: no.
- 037.9 Key for the tree? Proposal: T.
- 037.10 Region 2 XP? Proposal: 6 per enemy (×3 in ring 3) and 300 for the Bulwark.

## Shaun's decisions (2026-10-19)
- **029.1 Arrow pierce:** unlimited. Arrows pass through everything until their range runs out. This replaces the "through 2" proposal, and the specs need updating.
- **029.7 Ley stages:** homing and star split are both shapes, so a bolt is one or the other, never both.
- **033.2 Parts:** pay for research and restoration only. Placing machines stays free.
- **D, 030.1 and 036.8 Healing:** the highest rate wins; sources don't stack.
- **H, 034.3 Shields:** lobbed rounds and mines always land. Straight shots and punches into the front are blocked.
- **033.5 Schematics:** a schematic drops as an unknown, with the pop. What it unlocks is revealed once it's banked.
- **036.10 Relics:** their own tier, above Rare: a unique rule plus 2 affixes.
- **A, 029.3 Ley ammo:** stays "Ley bolt".
