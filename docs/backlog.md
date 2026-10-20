# Backlog

Build order: combat first, then the foundry, then claiming. Statuses: idea, draft, approved, done.
Only Shaun moves a spec to approved. Unattended runs only pick up approved items.

| # | Item | Status |
| --- | --- | --- |
| 001 | Scaffold: sim/render split, seeded RNG, fixed timestep, `window.__GAME__` hook, Playwright smoke test, docs/art.md and the art pipeline (`npm run art`) | done |
| 002 | Movement: walk and dodge in three-quarter view with camera follow | done |
| 003 | Tube firing: hand-loaded ammo in an inventory, cursor aiming, projectiles in the sim | done |
| 004 | Enemies: Husk with a telegraphed swipe, health, damage, death, raw material drops | done |
| 005 | Hand crafting: gather wood, stone, fiber and ley crystal; craft the three beginner ammo types | done |
| 006 | Foundry building: grid placement of machines with facing, items moving between them, one working ammo line | done |
| 007 | Tube link: the tube attunes at the foundry; reservoir drains while firing and refills from the line | done |
| 008 | Spread: gravity stager splits a line into angled streams that fire as a spread | done |
| 009 | Claiming: Wisp and Pylon Warden, pylon activation, supply line, deposit point, fast travel | done |
| 010 | Armor: unidentified drops, identification at the foundry, equip, heavy versus light | done |
| 011 | Death: return to the foundry and lose the carried haul | done |
| 012 | Tutorial flow: the prototype's player flow end to end (the art pass moved to 014) | done |
| 013 | Conduit corners: a conduit placed between two neighbours joins them as an L (auto-facing rules, corner sprites); from the 006 playtest | done |
| 014 | Look and feel: hand-shaped rooms, detailed sprites, juice and generated sound; Shaun's request 2026-10-18 | done |
| 015 | Fixes after the overnight run: sorter piece, no firing in the foundry or on menu clicks, no camera pan, hover names and build-bar descriptions | done |
| 016 | Art direction: clean vector art in daylight colours; the cloaked wanderer with the minigun tube, hose and brass tank; firing slows the walk; projectiles and the three enemies redrawn; from Shaun's playtest rant 2026-10-18 | done |
| 017 | Overworld and danger: one open map with a centre start, the foundry as a buried ruin entrance, danger rings, a living RotMG-density population (10–15 at most) once the first line fills, safe zones around claimed pylons, a minimap | done |
| 018 | Believable resources: nodes where they make sense, visible remains and regrowth, Husk resin, the Warden's core, the claimed pylon visibly harvesting and sending motes home | done |
| 019 | Foundry intake pipe: the placeable socket becomes a fixed 3-tile ringed cyan pipe on the north wall that matches the tube, with a reservoir gauge and fill pulses | done |
| 020 | Vector pass: the foundry interior, machines with visible mechanisms, pieces, fixtures, items, HUD and menus in vector with bundled fonts; the pixel pipeline is removed | done |
| 021 | Playtest fixes: 2-tile pickup reach through obstacles, no screen shake on firing, a menu pointer above buttons, the arrowhead without wood; Shaun's playtest rant 2026-10-18 | done |
| 022 | Hopper amounts: click one, Shift+click half, Ctrl+click all, both in and out | done |
| 023 | Melee: with no tube or nothing to fire, a quick punch toward the cursor (small damage, knockback except bosses); closes the melee open question | done |
| 024 | Spread from the intake: the gravity stager is removed; each fed entrance has its own reservoir and adds a round to the volley (arrows fan, bombs land side by side, mixes fire together); the warden core opens entrances 2 and 3 | done |
| 025 | Bottom HUD: hotbar 1-2-3 centred, the tube slot centred above it and larger, showing the round, the volley or a fist | done |
| 026 | Menu labels: item names in the crafting menu; build bar grouped into Logistics, Arrows, Bombs and Ley | done |
| 027 | Foundry tutorial: step-by-step objectives for building the first arrow line into the intake | done |
| 028 | Foundry flow: a supply port per resource (×N pylons), hoppers fed by conduits, each entrance at its own rate, the volley before carried rounds, a goal chain after the shrine | done |
| 029 | Ammo roles and stages: arrows pierce, ley bolts don't, 48 px bombs with no burn; ammo tags; stage machines (frost rune, homing, star split) with a small Frozen Grotto | done |
| 030 | Healing: none in the field; pylon safe zones, Ley Springs and the foundry | done |
| 031 | HUD pass: inventory panel (at risk or banked), large bottom-left HP bar, pickup feed, black-sphere casing | done |
| 032 | Landmarks and champions: resource sites with pylons, a Ruined Cache, hidden until found; empowered enemies | done |
| 033 | Foundry research as restoration: one entrance per boss core (changes 024), reservoir size, machine speed, splitter and merger, schematics | done |
| 034 | Region 2, Stonefall Hollows: the Bulwark, ley-iron, landmines, cluster bombs, boss altar refights | done |
| 035 | Hollows enemies: Charger, Burrower, Shardback, Sniper construct | done |
| 036 | Equipment: helm, body, boots and trinket; defensive affixes; Common, Fine and Rare; relics | done |
| 037 | Leveling and the talent tree: XP from combat and exploration, 1 point per level, a 19-node tree, free respec | done |
| 038 | Landmines and the cluster-bomb stage (ley-iron): split out of 034 by the accepted proposal; the spec text lives in 034 until it moves to its own file | done |
| 039 | Keyword system: a closed keyword list in data, one word per rule (renames), one scope per content line, generated rules text, Stun, Pool, Knockback on rounds, elements on every family, exact fire rates | done |
| 040 | Legibility UI: hover summary with keyword chips, Shift+hover breakdown with the damage calculation, a Build tab on the T panel, clickable glossary chips | done |
| 041 | Balance pass: per-hit damage arrow 14, ley bolt 9, bomb 12 (landmine 60); ring ×1/×1.6/×2.5 on enemy HP and damage; the Bulwark at 2,500 HP with an enrage, a rear stomp and adds; scripted sim targets | done |
| 042 | Shippable playtest build: painted title screen, game-flow state machine, one save slot saved on entering the foundry (Continue, export and import, versioned), Settings (volumes, shake, flashes, key bindings), big-moment-only shake and a locked camera, end-of-demo card, F feedback notes | done |
| 043 | Arena lock and slower Shardbacks: the Sunken Forum seals when the Bulwark engages (E at the seal leaves and resets the fight); Shardback shields turn at 70°/s; moved out of 041 (041.18, 041.19) | done |
| 044 | Sandbox: `?sandbox` boots a test room with every item, round, stage and gear piece, max level, a loadout panel for the intake's volley, a spawn panel, enemy pens and both boss arenas, and god mode; from Shaun's request 2026-10-20 | done |
| 045 | Readability fixes: red HP bar, E prompts on ley crystals and the sealed door (043.5), a 96 px magnet pickup, build controls on screen, Wisps wake on screen, cache loot bursts out | approved |
| 046 | Foundry onboarding: a working example arrow line on the first visit, the tutorial's second line after the Warden, double Region 1 outputs, the Splitter from the start | approved |
| 047 | Inventory and hotbars: an intake bar (left click) and a carried bar (1–5, right click), a Factorio-style grid inventory and hopper screens, crafting tabs per ammo type with tagged rounds in them | approved |
| 048 | Volley shape: two entrances fire at two angles, three as a centre and two sides, all together (note 5) | idea |
| 049 | Resin pylon: a supply for Husk resin so bombs can be automated (note 16) | idea |

008–014 were approved on Shaun's behalf for the overnight run (Shaun, 2026-10-18: "Yes, approve all"), from his interview answers. He reviews them in the morning report.

016–020 were approved by Shaun on 2026-10-18 ("I approve all") for an unattended run after the spec interviews. The enemy cap was lowered to 10–15 at approval. They were merged to main on 2026-10-18 for Shaun's playtest and wrapped up as done at his request.

021–029 come from Shaun's playtest notes and spec interview on 2026-10-18. Suggested build order: 021, 022, 023, 024, 025, 026, 027 (025 needs 023 and 024; 027 needs 024 and 026).
021–027 were approved by Shaun in chat on 2026-10-18 ("approve 21-27").

028–037 come from the content brainstorm and Shaun's spec interview (docs/brainstorm/2026-10-19-*.md), and replace the old 028/029 idea rows. Their open questions are collected in docs/brainstorm/2026-10-19-open-questions.md.
028–037 were approved by Shaun in chat on 2026-10-19 ("Approve all 028–037"), with every open question settled.
038 is the landmine and cluster-bomb slice that 034 split out, which the accepted proposals cover. It is built after 037.

Shaun's drive rant on 2026-10-19 (docs/brainstorm/2026-10-19-drive-rant.md) is queued to become the next spec interview once 038 is done. Its themes are a shippable build for friend playtests (title screen, soft save, start-to-finish flow), harder combat and the Bulwark, the ammo roles, simpler Factorio-like processing and a bigger foundry, boss spawners, and horizontal content after that.

028–038 were built on 2026-10-19 (docs/review/playtest-021-038.md).

039–042 come from Shaun's keyword spec interview on 2026-10-19 (docs/brainstorm/2026-10-19-keyword-interview.md, after the drive rant and docs/brainstorm/2026-10-19-keyword-audit.md). 039 and 040 were approved on draft by Shaun in chat ("Approve on draft").
041 and 042 come from Shaun's spec interview on 2026-10-19 (docs/brainstorm/2026-10-19-balance-ship-interview.md) and were approved on draft by Shaun in chat ("Approve on draft"), to be built after 040, in that order.

021–041 were merged to main on 2026-10-20 in the catch-up PR InsanityWolfz/Pipeline#24 after Shaun's playtest ("Merge 24") and wrapped up as done.

043 holds 041.18 and 041.19, moved out on 2026-10-20 under the process reset Shaun approved in chat ("approve the reset"), so 041 could close. Built in InsanityWolfz/Pipeline#28 and merged on Shaun's word ("approve everything", 2026-10-20).

045–047 come from the playtest-notes interview on 2026-10-20 (docs/brainstorm/2026-10-20-playtest-interview.md); 048 and 049 are the next batch.

## Approved, not built yet
- 043.5 (now part of 045): an "E" prompt over the Bulwark's sealed door, and the barrier's hum and collapse sounds for the seal (Shaun, 2026-10-20). For the legibility work.

## Bugs
Fixes to built behaviour that need no design. Each goes on its own branch and PR.
- The Stages panel showed "0/4 arrows" while the player had arrows in an intake entrance and in the inventory (Shaun, 2026-10-20). Fixed in InsanityWolfz/Pipeline#27: the panel counts carried rounds plus the intake entrances (Shaun chose option A, 2026-10-20).
