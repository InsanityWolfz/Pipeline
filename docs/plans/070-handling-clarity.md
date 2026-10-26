# 070 plan: handling and clarity

Plan for docs/specs/070-handling-clarity.md on `claude/070-handling-clarity` (InsanityWolfz/Pipeline#84).
A plan file because the spec touches six systems: harvesting, crafting, the tube slot, the carried bar, the player's
drawing and the nodes. Each slice runs sim (where it has a rule), render and data together, lists its tests first, and
is committed with `npm run check` green before the next.

## Findings that shape the plan
- **E is an edge today.** `Command.interact` is "pressed this tick"; `stepHarvest` (src/sim/harvest.ts) starts a
  harvest on it and the harvest then runs on its own (`harvestTicks`, 30) unless the player moves, rolls, fires, uses
  or switches slot. A single press already harvests once.
  - Hold needs a held flag: `Command.interactHeld`, kept by `heldPart` (the test hook's held part) and set by
    `Controls` from the E key's `isDown`.
  - At a channel's end, with E still held and the node still harvestable, the next channel starts on the same node.
    Moving already cancels; release only stops the chain (the running channel finishes, as a single press does).
  - `HarvestState` keeps its shape, so the save shape doesn't change.
- **Crafting is one batch per call.** `craft()` (src/sim/crafting.ts) → `make()` (src/sim/make.ts) pushes one `crafts`
  event per batch; `GameScene.craft` plays one sound per call. The craft row's own `pointerdown` handler
  (CraftMenuView) can read `pointer.event.shiftKey`.
  - Craft max = as many batches as the carried inventory affords, as one `make` with a `batches` count and one event.
  - A tagged round's row also counts the intake's entrances (029 option A) and a plain click pulls from them. Craft
    max counts the carried inventory only (the spec's "the inventory can afford"), so a Shift-click never empties the
    tube; when only the entrances make it affordable it crafts one, as a plain click would. To be raised.
  - The pickup feed (031) shows only ground pickups; hand crafts have no line. The spec's "one feed entry" is read as
    one feed line ("+24 Arrow") for a craft max. A plain click is left as it is. To be raised.
- **The tube slot.** `hudActive` (src/sim/volley.ts) is `melee` whenever the intake is dry after attuning, and
  TubeSlotView labels the fist "Melee". Right click fires the carried bar's selected item when any is carried
  (`readyItem`, src/sim/hotbar.ts). The card's text is a render choice from sim queries (as the craft menu's dimming
  is), so it lives in a pure render function, tested in tests/render.
  - "Tube empty · RMB fires carried" is wider than a 28 px unit. That one unit widens to fit its text (fist over text,
    as "Melee" sits), drawn live with the HUD's tablet and a ringed well.
  - Rebound `use` shows its key's name in place of "RMB".
- **The carried bar.** A slot already keeps its kind when its rounds run out (047.3); HotbarView hides its icon and
  count. It now draws the icon greyed with "0". `ui().hud.hotbar.slots` gains `greyed`.
- **Nothing in render knows what stands in front of the player.** Trees and ruin blocks are tile sprites
  (OverworldView, RoomView), tree nodes are NodeView's, machines FoundryView's, the bench SiteView's; all sort by
  their bottom. A small registry (`Occluders`) takes those images as they're made; a `SilhouetteView` checks, each
  frame, whether a registered image in front of the player (deeper) covers enough of the player's body box, and then
  draws the wanderer's own texture again over the world as a tinted fill with a pale rim, as NodeView's glow is drawn.
  Its tint, alpha, rim and the share of the body that counts as hidden are data.
- **Nodes.**
  - Every harvestable node already glows (051: `harvestable`, closed vents and used-up nodes don't). A probe of the
    overworld found all 62 nodes have a standable spot in reach. So the first and third bullets are held by tests (the
    Old Grove's five trees all glow together; a used-up tree and a closed vent don't), with no code change. To be
    raised: decorative grove trees stay decorative.
  - A tree's reach is its base box plus `HARVEST_REACH` (12 px). Standing behind its trunk (the pocket tile north of
    it, under the canopy) is about 23 px off, so out of reach. `NodeDef.canopy` (trees only) adds a box over the base
    the canopy covers; `nodeInReach` takes either. The E prompt (interactables.ts) follows `nodeInReach`, so it agrees.
- **Saves.** `HarvestState`, the inventory, the hotbar and nodes keep their shapes; `SAVE_VERSION` stays unless
  tests/sim/saveShape.test.ts says otherwise.

## Slice 1: hold E to harvest
**Tests first**
- Sim (tests/sim/holdHarvest.test.ts):
  - Holding E on a 3-use tree harvests three times back to back (90 ticks), then stops with the tree empty.
  - A single press (E on the first tick, then released) harvests once.
  - Releasing E mid-chain finishes that channel and starts no other.
  - Moving while holding E cancels the channel and starts no other, even after the player stops (E still held).
  - Holding E without a press first starts nothing (the chain needs the press).
  - `heldPart` keeps `interactHeld`.
- e2e (tests/e2e/handling.spec.ts): the E key held down on a tree in the live game cuts it down to a stump.

**Code**
- src/sim/input.ts: `interactHeld`; `NO_COMMAND`, `heldPart`.
- src/sim/harvest.ts: chain the next channel at a channel's end.
- src/render/controls.ts: `interactHeld` from the interact key; dropped with the press while a menu takes E.

## Slice 2: craft max
**Tests first**
- Sim (tests/sim/craftMax.test.ts):
  - Shift (max) on a plain recipe with inputs for 4 batches makes 4, takes 4 batches' inputs, and pushes one `crafts`
    event with `batches: 4`.
  - The scarcest input decides; a plain craft still makes one with an event without `batches`.
  - Unaffordable: nothing changes but a `craftFails` event.
  - A tagged round counts only carried inputs; with none carried but the entrances holding enough, it crafts one.
- Render (tests/render/pickupFeed.test.ts): a craft max's line adds its whole count once.
- e2e: Shift-click on a crafting row crafts the most it can, and the feed shows one line.

**Code**
- src/sim/make.ts: `make(state, recipe, batches = 1)`; src/sim/stages.ts: `craftTagged(..., batches)`.
- src/sim/crafting.ts: `craftMax`, `maxBatches`. src/sim/events.ts: `batches?` on `crafts`.
- src/render/CraftMenuView.ts: Shift on the row's press. src/render/GameScene.ts: `craft(recipeId, max)`, one sound.
- src/render/HudView.ts, PickupFeed.ts: craft-max lines join the feed. Test hook: `craft(recipeId, max?)`.

## Slice 3: the empty tube's card
**Tests first**
- Render (tests/render/tubeCard.test.ts): the label is "Tube empty · RMB fires carried" when the card shows the fist
  after attuning with a carried round ready; "Melee" with nothing carried, without the tube, or before attuning; a
  rebound `use` key names that key.
- e2e: after attuning with an empty intake and arrows carried, `ui().hud.tubeSlot.labels` reads the new text and its
  label box stays inside the card; with nothing carried, "Melee".

**Code**
- src/data/hudLayout.ts: the text and the wide card's padding. src/render/tubeCard.ts: the pure label.
- src/render/TubeSlotView.ts: a wide fist unit drawn live when the label is wider than a unit.

## Slice 4: greyed empty slots
**Tests first**
- Render (tests/render/carriedSlots.test.ts): a slot whose kind has none carried shows its icon greyed and "0"; a slot
  with none shows nothing; a carried one shows its count, not greyed.
- e2e: firing the last carried arrow leaves slot 1 greyed with "0"; dragging another round onto it replaces it.

**Code**
- src/data/hudLayout.ts: the grey alpha. src/render/HotbarView.ts: draw from the pure look.

## Slice 5: the silhouette
**Tests first**
- Render (tests/render/silhouette.test.ts): hidden when a deeper prop covers at least the data share of the body box;
  not when the prop is shallower (the player in front) or covers less.
- e2e: behind a ruin block (and behind a grove tree) `ui().silhouette` is true; in the open it's false.

**Code**
- src/data/player.ts (or art): `PLAYER_SILHOUETTE` (tint, alpha, rim colour and width, body box, cover share).
- src/render/occluders.ts (registry and pure cover test), src/render/SilhouetteView.ts.
- Register: OverworldView (tree and ruin-block tiles), RoomView (ruin blocks), NodeView (trees), FoundryView
  (machines), SiteView (the bench). GameScene wires it; the test hook's `ui()` gains `silhouette`.

## Slice 6: nodes
**Tests first**
- Sim (tests/sim/harvest.test.ts): standing on the tile north of a tree, under its canopy, puts it in reach and E
  harvests it; the same spot north of a boulder (no canopy) does not.
- e2e: in the Old Grove every tree node glows at once; a cut-down one and a closed vent don't; walking under a tree's
  canopy shows its E prompt.

**Code**
- src/data/nodes.ts: `canopy` on the tree. src/sim/harvest.ts: in reach by gap or canopy.

## Review shots (docs/review/070, tests/e2e/handlingShots.spec.ts)
01 hold-E harvesting mid-chain; 02 the craft menu after a Shift-click with its feed line; 03 the empty-tube card;
04 greyed slots; 05 the silhouette behind a ruin block; 06 a grove's glows.

## Not in this plan
A "craft the whole chain" button; node yields; a silhouette for enemies.
