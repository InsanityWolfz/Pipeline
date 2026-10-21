# 051: Guidance
status: approved

Approved on draft by Shaun in chat, 2026-10-21 ("approve 050-052"): the build follows the proposals in the open questions.

From Shaun's live playtest (docs/brainstorm/2026-10-21-playtest-notes.md, theme B) and his interview answers (docs/brainstorm/2026-10-21-playtest-interview.md). Shaun: "Just so people know where they're going. Like, claim the shrine's pylon is kind of vague, unless you have an arrow to go there and do that."

## Goal
A new player always knows where to go and what to do: an arrow to the current goal, clear marks on what can be harvested, a minimap that fills in as they explore, a map of the foundry, and a clearer way to learn right click.

## Design references
- Specs: 012 and 027 (objectives), 017 (the minimap), 018 (nodes), 028 (the goal chain), 032 (landmarks, hidden until found), 045 (E prompts), 046 (the example line, the refill goal), 047 (the carried bar, 047.9's hint).

## Acceptance criteria
**Waypoint arrows (B.1, B.2)**
- [ ] Every objective names a target (a place, a piece or a thing). While it's off screen, an arrow at the screen's edge points to it; when the target is on the other side of the foundry door, the arrow points to the door (or, outside, to the foundry's entrance). While it's on screen, an arrow hovers over it. Always on (Shaun).
- [ ] The refill goal marks the hoppers with an arrow and an icon of the resource each one needs (wood, stone, fiber).

**Objective sub-steps (B.3)**
- [ ] "Craft bombs and ley bolts (C)" comes before entering the foundry. Under it, indented sub-lines such as "Collect stone" and "Collect ley crystal" appear only when the player lacks what they need, each with a small icon of the resource (Shaun), and tick off as they're gathered.

**Harvestable nodes (B.4)**
- [ ] Harvestable trees, rocks and veins have a soft pale outline glow and an occasional sparkle; decorative ones don't. A used-up node loses it until it regrows.

**The minimap (B.5)**
- [ ] Fog of war: a tile is revealed on the minimap once it has been on screen, for good (saved).
- [ ] Water and other scenery are off the minimap. Pylons, the foundry and boss arenas show as icons once discovered.
- [ ] Hovering a minimap icon names it.

**The foundry minimap (B.6)**
- [ ] Inside the foundry, the minimap's place shows the foundry: conduits as lines, machines as dots, and icons for the tube, bench, stash, entrances and ports. Items moving aren't shown.

**Learning right click (B.7)**
- [ ] 047.9's banner is replaced: a small mouse icon with the right button lit sits beside the carried bar.
- [ ] On the first foundry entry after attuning, the old left-click arrow slot animates shrinking down into the carried bar, and the intake's slot appears in its place.

## Out of scope
- The round map and boss doors; the foundry layout (052 moves the bench).

## Test plan
- Vitest: each objective's target; the arrow's target through the door; sub-lines appear only when lacking and tick off; fog reveal is saved; node glow state follows use and regrow.
- Playwright: an edge arrow for an off-screen goal; the foundry minimap's pieces in `ui()`; the right-click mouse icon and the slot animation.
- Screenshots: an edge arrow, the hovering arrow over a hopper with its icon, sub-steps with icons, a glowing node, the fogged minimap, the foundry minimap, the mouse icon.

## Open questions
- **051.1 Saving the fog.** Proposal: a revealed-tiles bitmap in SimState (a shape change: SAVE_VERSION bumps with no migration).
- **051.2 Goals with several targets** (e.g. "gather wood, stone and fiber"). Proposal: point to the nearest unfinished one.

## Raised after the build
Built on `claude/051-guidance` (plan: docs/plans/051-guidance.md). 051.1 and 051.2 are built as proposed. Each choice below took the most conservative option and stands unless Shaun says otherwise.

- **051.1 The fog, as built.** A revealed-tiles bitmap in SimState (`fog`, overworld tiles packed 32 to a number), revealed each tick from the camera's view (the same view 032's discovery uses), kept through a KO and saved. SAVE_VERSION 8, no migration (an older save reads as too old). Proposal: keep.
- **051.2 Several targets.** The arrow goes to the nearest of the goal's targets in the player's room; with none there, to the door of the room that leads to one (the foundry's door inside, its stairs outside). Proposal: keep.
- **051.3 Bombs before the foundry needs their recipes earlier.** Bomb and ley bolt recipes (and their parts) used to appear as the tube attuned, which happens on the first entry, so "Craft bombs and ley bolts" before the foundry couldn't be done. Built: they're known once the foundry's stairs open (the ruin field cleared), the moment the goal shows; attuning still reveals them too. Proposal: keep; say if they should wait for something else.
- **051.4 Targets for goals without one place.** A craft goal points at the nodes of what it still lacks (Husk resin at the nearest Husk outside, the Hive's seeps only with none left); with nothing lacking there's no arrow, as crafting is anywhere and the C prompt already floats over the player. "Clear the ruin field" points at the nearest living Husk of its pack; "Head back out" at the door inside and nothing outside; "Build a frost rune into your arrow line" at the foundry (its stairs outside, nothing inside); "Restore an entrance" at the capped mouths; "Feed two/all three entrances" and "Put a second kind of ammo in another entrance" at the open entrances still empty (all open ones once each holds ammo); "Breach Stonefall Hollows" at the barrier's gap; "Defeat the Bulwark" at the boss, or its arena's start once it's gone. Proposal: keep.
- **051.5 Pylons not yet found.** "Claim a second pylon" points at the nearest discovered, unclaimed, awake site pylon, and with none discovered at the nearest awake one (the arrow only gives the direction; the minimap still shows a landmark only once found, 032). Before, 032's marker showed nothing until one was found. The Husk Hive's and the Cistern Terrace's goals point at their pylons, found or not, since the goal names them. Proposal: keep.
- **051.6 The refill goal's hoppers.** Each unfilled hopper (its raw not yet put back) gets an arrow pointing down into its bowl, and its raw's icon in a small plate in front of it (below), where the player stands: the machines stand behind the hoppers and the E prompt floats over them. The raw is the first input of the machine the hopper feeds (wood, stone, fiber for the example line), else what it last held. Proposal: keep.
- **051.7 The sub-lines.** Only the bomb goal has them (the spec's). They read "Collect stone", "Collect husk resin", "Collect ley crystal", each with the raw's icon; one appears once the player lacks that raw while the goal is current, ticks (a ley tick, the text dimmed) once enough is carried, and unticks if it's spent again. What's lacking counts parts already made, and a part two crafts share (ley dust) once. Proposal: keep.
- **051.8 The minimap.** Water, shallows, trees, boulders and ruin stones are drawn as the ground round them; paths, walls, cliffs and the aqueduct's stones stay. The foundry's stairs (a brass arch), the shrine's pylon (a stone needle with its violet crystal) and the Bulwark's arena (crossed blades) show as icons once their tile has been on screen; landmarks as 032 (once discovered), claimed pylons as the cyan dot. Hovering an icon or dot within 5 view px names it in a small tablet left of the map; the player and schematics have no name. Proposal: keep.
- **051.9 The foundry map.** 4 view px per tile in the minimap's corner, the room's floor and walls drawn. Besides machines, hoppers and crates are dots too (smaller, stone and wood coloured); splitters, mergers and sorters are straight lines like conduits; the player is a white dot; the waystone isn't shown. The foundry's door gets an icon of its own (the spec lists "entrances": its door to the stairs is drawn as an arch, besides the intake's open entrances as dots). The sandbox has no foundry map (nor the overworld's minimap), as it has no goals or rooms to find. Proposal: keep.
- **051.10 Right click.** The mouse (right button lit cyan) sits right of the carried bar whenever the bar shows, before and after attuning; with "Use carried item" bound to a key it shows that key's label instead. Through the attune the intake's bar now keeps the old left-click slot (before, it switched as the attune began); as it ends the slot shrinks into the carried bar's selected cell (0.7 s) while the intake's slot fades in (0.45 s). Once per save. 047.9's "Right click: carried items" banner line is gone. Proposal: keep.
- **051.11 Small choices.** The node glow is a 2 px pale outline of the node's own shape, breathing, with a glint every 2.6 s at a spot that moves. The edge arrow sits 14 px in from the edge, 1.3× the hovering arrow's size, pulsing; at the top-right it can pass under the minimap. The arrow stays on alongside an E prompt over the same thing. Proposal: keep.
- **051.12 Results.** `npm run check` passes (1731 unit tests). The full `npx playwright test`, once at the end (merged with 050's review fixes): 147 passed, 0 failed, 135 skipped (review shots). Review shots in docs/review/051: 01 an edge arrow, 02 the arrows over the example line's hoppers with their raws, 03 the bomb goal's sub-lines (stone ticked), 04 a glowing tree beside a cut one, 05 the fogged minimap with the foundry named on hover, 06a/b the foundry minimap, 07a the mouse beside the carried bar, 07b the slot swap mid-way. Older shots covering the HUD, minimap, objectives and foundry rerun with REVIEW_SHOTS=1 (028, 031, 032, 033, 042, 045, 046, 047, 050) and retaken, since each shows the minimap's fog, the waypoint arrow, the foundry map or the mouse; the title-only ones (042/01–07, 050/05) and the contact sheet (032/19) are unchanged and kept. 031's low-HP shot timed out once under the parallel shot run and passes alone. `npm run measure`, recorded, not tuned, identical to 050: ammo line and still 5/5 met; ring 1 2.2–3.2 s, ring 2 2.4–4.0 s met; ring 3 4/5 in band (14.1–21.6 s, MISSED); the Bulwark's decent build 14/20 with 2 KOs (MISSED); the naive bot KO'd 5/5.
