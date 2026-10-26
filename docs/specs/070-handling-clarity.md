# 070: Handling and clarity
status: approved

Approved by Shaun in chat, 2026-10-26: he picked it from the agent-playtest proposals, built as written. Its plan is pre-approved.

Plan pre-approved by Shaun in chat, 2026-10-26. Plan: docs/plans/070-handling-clarity.md.

Drafted from the opening and Hollows playtesters' findings (docs/brainstorm/2026-10-26-agent-playtest.md) and the proposal Shaun approved.

## Goal
Fewer chores and fewer confusing moments in the field: hold E to harvest, craft as many as you can at once, an empty tube that explains itself, empty slots that remember their round, the player visible behind props, and harvestable trees that are easy to spot.

## Design references
- docs/design.md: "Manual first, then automated"; the HUD and readability specs 031, 040, 045, 051 and 054.

## Acceptance criteria
- [x] **Harvesting:** holding E on a node keeps harvesting, one use per channel, until the node is empty, the player moves, or E is released. A single press still harvests once.
- [x] **Crafting:** Shift-click on a crafting row crafts as many as the inventory can afford, as one action with one sound and one feed entry. A plain click still crafts one.
- [x] **The empty tube:** when the tube is empty but carried rounds are held, the big ammo card reads "Tube empty · RMB fires carried" instead of "Melee". With nothing carried either, it still reads "Melee".
- [x] **Empty slots:** an emptied carried-bar slot keeps its round's icon, greyed, with "0", until another round takes the slot.
- [x] **Silhouette:** the player shows as a soft silhouette (outline and tint, in data) while behind ruin blocks, trees, the bench or machines.
- [x] **Nodes:**
  - Every harvestable tree in a grove glows when in reach, not just one.
  - A tree's reach covers standing under its canopy.
  - Nodes that can't be harvested don't glow.
- [x] Review shots (docs/review/070): hold-E harvesting; craft max; the empty-tube card; greyed slots; the silhouette behind a ruin block; a grove's glows.

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

## Raised after the build
Build-time choices the spec didn't decide; the least surprising reading is built. Items marked **Shaun** need his call.
- **070.1 Hold E's stop rules.** Letting go of E finishes the channel already running and starts no other (so a single press still harvests once). The next channel also needs the player still in reach, so a knockback ends the chain. Build mode ends it too (after review: B kept the chain going). A held E never starts a harvest by itself: the first press does.
- **070.2 Craft max on a tagged round (Shaun).** A tagged row (frost arrows and the rest) counts the intake's entrances as held (029 option A) and a plain click draws on them. Read literally ("as many as the inventory can afford"), craft max counts only carried rounds, so a Shift-click never empties the tube; when only the entrances make the row affordable, it crafts one, as a plain click does. The other reading would let one Shift-click drain the intake.
- **070.3 The feed entry (Shaun).** Hand crafts had no pickup-feed line (031 left them out). A craft max now adds one line ("+32 Arrow"), even when it affords only one batch (after review); a plain click still adds none. Proposal: keep; the alternative is a line for every hand craft.
- **070.4 "Carried rounds are held".** Read as "right click would fire one": the carried bar's selected slot holds rounds (`readyItem`). With rounds only on another slot, right click does nothing (047.14), so the card still reads "Melee". A rebound use key is named in place of "RMB". The card widens to fit the text, fist over it as "Melee" sits. In build mode, where right click is the build tools' and `use` is off, the card reads "Melee" as before (after review: it named RMB there); no new text.
- **070.5 What hides the player (Shaun).** As the spec lists: ruin blocks (and the block props standing in for them), grove trees and tree nodes, the bench and machines. Walls, cliffs, boulders and pylons don't (the grove shot shows the player half behind the Old Grove's pylon with no silhouette). The test samples 15 points over the body box against the props' drawn pixels; 30% covered shows it. The silhouette is a cyan fill at 40% inside an ink rim, drawn over every prop, so it also tints the parts of the player still in view while it shows.
- **070.6 The grove's glows (Shaun).** Every harvestable node already glowed (051), and a probe of the overworld found all 62 nodes have a spot to stand in reach, so the first and third Nodes bullets needed tests, not code: the Old Grove's five trees glow together, and every drawn node glows exactly when it can be harvested now. The playtester's "only one tree in a grove is harvestable" was about the grove's decorative trees (tiles round each tree node), which stay decorative and don't glow; making them harvestable would change node yields (out of scope). Proposal: keep; the alternative is a new spec.
- **070.7 A tree's canopy.** A tree is in reach with the player's feet within 24 px either side of its trunk and up to 44 px behind it (the tile behind the trunk, under its leaves), as well as by 018's 12 px round its base. The E prompt follows it.
- **070.8 Saves.** No save-shape change: `HarvestState`, the inventory and the hotbar keep their shapes (`Command.interactHeld` and the craft event's `batches` aren't saved). `SAVE_VERSION` stays at main's 20.

## Results (build)
- Plan: docs/plans/070-handling-clarity.md (six slices), followed as written; one change during the build: the silhouette's cover test reads the props' drawn pixels, not their bounding boxes (a round canopy's empty corners showed it beside a tree, caught on review shot 01). CI's first run (newGameAfterQuit, a real-time tick count) caught the check scanning every registered prop each frame, about 40% of the tick rate on this loaded machine; the registry now buckets props by where they stand, measures each prop's bounds once, and keeps its answer while the player and the props in front don't change, and an interleaved A/B shows no cost left. Review then found that cache missed a prop's frame change: cut to a stump from under its canopy, the player kept a silhouette over a bare stump until they moved (and regrowth the same). The key now holds each prop in front with its frame.
- Criteria: all met.
  - Harvesting: tests/sim/holdHarvest.test.ts (three channels then stop, full channel times, a single press, release mid-chain, moving, pushed out of reach, build mode, held without a press, `heldPart`); e2e holds the real E key down on a tree until it's a stump.
  - Crafting: tests/sim/craftMax.test.ts (batches by the scarcest input, one event with `batches`, a plain craft, unaffordable, tagged rows carried-only and the one-from-the-entrances case); tests/render/pickupFeed.test.ts (one line for a craft max, none for a plain craft); e2e Shift-clicks the Arrow row (3 batches, 24 arrows, one feed line). One sound: one `craft` call plays one.
  - The empty tube: tests/render/tubeCard.test.ts (the label's cases, a rebound key, the widened card's box); e2e reads the label, keeps it inside the card, and reads "Melee" once the arrows are spent.
  - Empty slots: tests/render/carriedSlots.test.ts; e2e spends the arrows (greyed, "0") and drags a bomb onto the slot. hud.spec.ts's slot expectations gain `greyed`.
  - Silhouette: tests/render/silhouette.test.ts (the body's samples, the cover share, depths); e2e behind a lone ruin block, in the open, behind a grove tree, and that tree cut to a stump from under its canopy without moving (no silhouette); the render test holds the cache key to each prop's frame.
  - Nodes: tests/sim/harvest.test.ts (behind the trunk in reach and harvested; the canopy's edges; a boulder from the same spot isn't); e2e: the Old Grove's trees all glow, every node's glow matches its harvestability, a cut tree stops glowing, and behind a trunk its E prompt is lit and E harvests it.
- Review shots, docs/review/070 (tests/e2e/handlingShots.spec.ts): 01 hold E, the second channel on a tree with one use cut; 02 the crafting menu after a Shift-click, "+32 Arrow" in the feed; 03 the empty-tube card; 04 greyed slots (arrows spent, a dry bomb slot); 05 the silhouette behind a ruin pillar; 06 the Old Grove, four trees glowing and the cut one a stump.
- Checks (after merging main with 067): `npm run check` green (2,521 unit tests). Locally, one file at a time on port 5332: handling (7), hud (3, 4 shot tests skipped), crafting (4), hotbars (3), carriedBeforeAttune (2), melee (1), resources (2), ammoStages (2) and guidance (4) passed; handlingShots with REVIEW_SHOTS=1 (6). The full suite runs in CI. No balance targets, so no `npm run measure`.

