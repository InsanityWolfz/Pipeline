# 051: Guidance
status: draft

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
