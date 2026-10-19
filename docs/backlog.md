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
| 021 | Playtest fixes: 2-tile pickup reach through obstacles, no screen shake on firing, a menu pointer above buttons, the arrowhead without wood; Shaun's playtest rant 2026-10-18 | approved |
| 022 | Hopper amounts: click one, Shift+click half, Ctrl+click all, both in and out | approved |
| 023 | Melee: with no tube or nothing to fire, a quick punch toward the cursor (small damage, knockback except bosses); closes the melee open question | approved |
| 024 | Spread from the intake: the gravity stager is removed; each fed entrance has its own reservoir and adds a round to the volley (arrows fan, bombs land side by side, mixes fire together); the warden core opens entrances 2 and 3 | approved |
| 025 | Bottom HUD: hotbar 1-2-3 centred, the tube slot centred above it and larger, showing the round, the volley or a fist | approved |
| 026 | Menu labels: item names in the crafting menu; build bar grouped into Logistics, Arrows, Bombs and Ley | approved |
| 027 | Foundry tutorial: step-by-step objectives for building the first arrow line into the intake | approved |
| 028 | Foundry flow: a supply port per resource (×N pylons), hoppers fed by conduits, each entrance at its own rate, the volley before carried rounds, a goal chain after the shrine | draft |
| 029 | Ammo roles and stages: arrows pierce, ley bolts don't, 48 px bombs with no burn; ammo tags; stage machines (frost rune, homing, star split) with a small Frozen Grotto | draft |
| 030 | Healing: none in the field; pylon safe zones, Ley Springs and the foundry | draft |
| 031 | HUD pass: inventory panel (at risk or banked), large bottom-left HP bar, pickup feed, black-sphere casing | draft |
| 032 | Landmarks and champions: resource sites with pylons, a Ruined Cache, hidden until found; empowered enemies | draft |
| 033 | Foundry research as restoration: one entrance per boss core (changes 024), reservoir size, machine speed, splitter and merger, schematics | draft |
| 034 | Region 2, Stonefall Hollows: the Bulwark, ley-iron, landmines, cluster bombs, boss altar refights | draft |
| 035 | Hollows enemies: Charger, Burrower, Shardback, Sniper construct | draft |
| 036 | Equipment: helm, body, boots and trinket; defensive affixes; Common, Fine and Rare; relics | draft |
| 037 | Leveling and the talent tree: XP from combat and exploration, 1 point per level, a 19-node tree, free respec | draft |

008–014 were approved on Shaun's behalf for the overnight run (Shaun, 2026-10-18: "Yes, approve all"), from his interview answers. He reviews them in the morning report.

016–020 were approved by Shaun on 2026-10-18 ("I approve all") for an unattended run after the spec interviews. The enemy cap was lowered to 10–15 at approval. They were merged to main on 2026-10-18 for Shaun's playtest and wrapped up as done at his request.

021–029 come from Shaun's playtest notes and spec interview on 2026-10-18. Suggested build order: 021, 022, 023, 024, 025, 026, 027 (025 needs 023 and 024; 027 needs 024 and 026).
021–027 were approved by Shaun in chat on 2026-10-18 ("approve 21-27").

028–037 come from the content brainstorm and Shaun's spec interview (docs/brainstorm/2026-10-19-*.md), and replace the old 028/029 idea rows. Their open questions are collected in docs/brainstorm/2026-10-19-open-questions.md.
