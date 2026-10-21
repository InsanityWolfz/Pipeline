# Plan 050: Playtest fixes and the title screen

Spec: docs/specs/050-playtest-fixes-2.md (approved on draft: 050.1 and 050.2's proposals are built). Branch `claude/050-playtest-fixes`, from `main`. Each fix is its own small slice, tests first, its own commit. Rules in src/sim, views in src/render, numbers and words in src/data. Nothing beyond the spec; anything it doesn't decide goes under "Raised after the build" with the most conservative choice built.

## Slices

### 1. The second-line goal (A.11)
- **Reproduce first** `tests/sim/secondLine.test.ts`: Shaun's save (docs/brainstorm/2026-10-21-playtest-save.json, version 5) is laid over a fresh sim directly (its foundry, link, research, objectives), not through the save reader. Rewound to the moment of his note: only the Warden's entrance restored, at the east cap (index 2), his bomb line feeding it and his split ley bolts in the centre. The test shows the goal doesn't complete and the marker sits on the centre mouth, then holds the fix.
- **Cause** (to confirm in the test): the goal's check is `entrancesHold` arrow ×2, so it needs two entrances holding arrows, whatever the new entrance holds; and `markerPoint('intake')` takes the middle of the open entrances, which with the centre and east open is the centre.
- **Sim** `src/sim/link.ts`/`research.ts`: an entrance records the node that opened it (`EntranceState.node`, null for the centre). New check `entranceFed { node }`: the entrance that node opened holds any ammo.
- **Data** `src/data/objectives.ts`: the goal reads "Feed ammo into the new entrance", checks `entranceFed entrance-2`, marker `newEntrance`.
- **Render** `src/render/markerPoint.ts`: `newEntrance` points at the mouth of the entrance entrance-2 opened.
- **Save**: SimState's shape changes, so SAVE_VERSION 7, no migration; the shape fixture regenerated.

### 2. E on the hovered hopper or crate; E closes screens (A.8, A.9)
- **Data** `src/data/foundry.ts`: `HOVER_USE_REACH` 3 tiles (feet box to piece box).
- **Sim** `src/sim/foundryUse.ts`: `usableInReach(state)` is the hopper or crate under the cursor (`player.aimX/aimY`) when it's within 3 tiles, else the nearest in reach as today. Deposits and withdraws work on a piece within 3 tiles, and a screen stays open while its piece is.
- **Render** `src/render/MenuRouter.ts`: E with the inventory or a hopper's, crate's or stash's screen open closes it, as Esc does.
- **Tests first** `tests/sim/hoverUse.test.ts`: the hovered hopper 2 tiles away wins over the nearer one; beyond 3 tiles it doesn't; nothing hovered falls back to the nearest; deposits reach 3 tiles. e2e `tests/e2e/playtestFixes2.spec.ts`: E opens the hovered hopper; E closes it and the inventory.

### 3. Crate slots hold stacks (A.12)
- **Data** `src/data/foundry.ts`: `CRATE_SLOTS` 8 replaces `CRATE_CAP`.
- **Sim** `src/sim/crate.ts` (new, small): how many of an item a crate still takes, in stacks of 047's sizes over 8 slots; `foundryUse.deposit` and `flow.ts` use it.
- **Tests first** `tests/sim/crateStacks.test.ts`: 8 stacks of wood (400) fit, a 9th kind doesn't, a line fills it to 8 stacks.

### 4. Gains in the foundry are banked at once (A.10)
- **Sim** `src/sim/banking.ts`: each tick in the foundry, anything held above what's banked is banked (picked up, crafted, taken from a crate, a hopper or the stash).
- **Tests first** `tests/sim/banking.test.ts`: a crate withdrawal, a stash take, a pickup and a craft in the foundry leave nothing at risk; outside they're still at risk.

### 5. Name tags, banners, the end card's cursor (A.2, A.3, A.5)
- **Data** `src/data/hudLayout.ts`: `HOVER_NAME` in the label style; `DISCOVERY_BANNER.top` under the boss bar.
- **Render** `src/render/nameTagPlace.ts` (new, pure): the tag sits under the hovered thing's feet; if that would cover the player, above the E prompt. `HoverView` uses it. `Banner` at the top. `FlowScene` draws its own pointer over its screens while a game runs (the game's cursor is under the flow scene).
- **Tests first** `tests/render/nameTag.test.ts`; e2e: the banner box sits above the player, the end card's cursor shows above it, a boulder's tag doesn't meet its E prompt.

### 6. Inventory and gear tips (A.6, A.7, A.13, A.14)
- **Render**: an item tip kind (its name), from the grid and a container's slots; the gear list scrolls by row on the wheel (no pages); a gear row's or cell's tip goes the moment the cursor leaves its square; Shift over gear shows its breakdown (reproduce first in e2e).
- **Tests first** `tests/render/gearPanelLayout.test.ts` (scrolling), e2e for the tips.

### 7. Mending and the ward (A.15, A.16)
- **Render** `HealingView`: no motes for field regen (Mending). `RelicView`: the ring follows the player's sprite point exactly (no rounding against it), with a small shield icon in it while the ward is ready; the burst on a block unchanged.
- **Art** `src/data/art/gear.ts`: `ward-shield`, a small violet shield.
- e2e: no motes while regen heals; the ring keeps its offset to the player while walking.

### 8. The wanderer facing forward (A.1)
- **Art** `src/data/art/wanderer.ts` (down view): both arms the same wide sleeve and forearm; the arms and mantle drawn under the hood so the shoulders never cross it; the belt follows the cloak's edges, curving round. Checked on /sheet.html at 4×.

### 9. The title screen (F)
- **Render** `TitleView`: the wanderer drawn live (no longer in the painted scene): a slow breathing bob (the hips dip), the cloak and hose swaying, the tube's glow pulsing. `MenuColumn` takes a scale; the logo and rows bigger, centred where they are.
- **Data** `src/data/titleScreen.ts`: the motion's periods and sizes, the new logo and menu scale.
- e2e via `flow().ui.title.motion`.

### 10. F11 (A.4)
- **Cause**: the page has no overflow rule and the canvas is inline, so at some window sizes the page is a few px taller than the window; a scroll bar appears, the window narrows, the fit changes, the bar goes, and round it goes. **Fix** `index.html`: `overflow: hidden` on html and body, the canvas a block.
- e2e: at 1920×1080 the page never scrolls.

## Verify
- `npm run check`; the touched e2e files while building; the full `npx playwright test` once at the end.
- Review shots `tests/e2e/playtestFixes2Shots.spec.ts` (REVIEW_SHOTS=1, docs/review/050/): the wanderer facing forward, a name tag beside an E prompt, a top banner, the ward ring, the title screen. Older shots covering the title, HUD, gear and inventory rerun; only what 050 changes is retaken.
- `npm run measure` once; recorded, not tuned.
