# 070: Handling and clarity
status: approved

Approved by Shaun in chat, 2026-10-26: he picked it from the agent-playtest proposals, built as written. Its plan is pre-approved.

Drafted from the opening and Hollows playtesters' findings (docs/brainstorm/2026-10-26-agent-playtest.md) and the proposal Shaun approved.

## Goal
Fewer chores and fewer confusing moments in the field: hold E to harvest, craft as many as you can at once, an empty tube that explains itself, empty slots that remember their round, the player visible behind props, and harvestable trees that are easy to spot.

## Design references
- docs/design.md: "Manual first, then automated"; the HUD and readability specs 031, 040, 045, 051 and 054.

## Acceptance criteria
- [ ] **Harvesting:** holding E on a node keeps harvesting, one use per channel, until the node is empty, the player moves, or E is released. A single press still harvests once.
- [ ] **Crafting:** Shift-click on a crafting row crafts as many as the inventory can afford, as one action with one sound and one feed entry. A plain click still crafts one.
- [ ] **The empty tube:** when the tube is empty but carried rounds are held, the big ammo card reads "Tube empty · RMB fires carried" instead of "Melee". With nothing carried either, it still reads "Melee".
- [ ] **Empty slots:** an emptied carried-bar slot keeps its round's icon, greyed, with "0", until another round takes the slot.
- [ ] **Silhouette:** the player shows as a soft silhouette (outline and tint, in data) while behind ruin blocks, trees, the bench or machines.
- [ ] **Nodes:**
  - Every harvestable tree in a grove glows when in reach, not just one.
  - A tree's reach covers standing under its canopy.
  - Nodes that can't be harvested don't glow.
- [ ] Review shots (docs/review/070): hold-E harvesting; craft max; the empty-tube card; greyed slots; the silhouette behind a ruin block; a grove's glows.

## Out of scope
A "craft the whole chain" button; changes to node yields.

## Test plan
- Sim tests for: hold-E harvesting, its stop rules, and craft max.
- Render tests for: the card text and the greyed slots.
- Playwright for: the silhouette, grove glows and canopy reach.
- Review shots.

## Decisions in this draft
- Hold-E stops when you move, so harvesting never pins you during a fight.
- The silhouette shows only for the player, not enemies.
