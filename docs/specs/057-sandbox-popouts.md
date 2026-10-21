# 057: Sandbox panels as click-open pop-outs, and a steady waypoint arrow
status: approved

Approved on draft by Shaun in chat, 2026-10-21 ("add the waypoint arrow stuttering while you're walking fix ... and then I approve on draft"): the build follows the proposals in the open questions.

From Shaun's sandbox playtest of 056, in chat on 2026-10-21: "make the panels a pop out and make it something you click open". 056 made the sandbox's controls always on screen; in play the two strips take too much of the view, so they become pop-outs. Shaun added, in chat the same day: fix the waypoint arrow (051) stuttering while you walk.

## Goal
The sandbox's controls stay one click away without covering the fight: each panel is a small tab on its screen edge that pops out when clicked. And the waypoint arrow moves smoothly while the player walks.

## Design references
- Specs: 044 (the sandbox and its panel), 056 (the left strip, the key list, the spawn column, the backquote key), 051 (the waypoint arrow).

## Acceptance criteria
- [ ] In the sandbox, the left edge shows a small "Loadout" tab and the right edge a small "Spawn" tab, always visible; nothing else of the panels shows until opened (Shaun).
- [ ] Clicking a tab pops its panel out from that edge, with the same rows as 056 (the left one with the key list under the loadout); clicking the tab again closes it (Shaun).
- [ ] An open panel's rows work as today and never pause the game.
- [ ] Nothing else changes outside the sandbox.

**The waypoint arrow (051)**
- [ ] While the player walks, the waypoint arrow doesn't stutter: at the screen's edge it slides smoothly along it, and over a target it stays put on the target, only bobbing as today (Shaun). This applies in the whole game, not only the sandbox.
- [ ] Where it points and when it switches between edge and over-target are unchanged.

## Data changes
- `src/data/sandbox.ts`: the tabs' layout and labels, the pop-out's timing.
- None for the waypoint arrow (a render fix).

## Out of scope
- The panels' contents; other sandbox features.
- The waypoint arrow's look, rules or targets.

## Test plan
- Vitest (render): tab and panel boxes; open and close state.
- Playwright: `?sandbox` shows only the tabs; a click opens each panel and a second click closes it; a row click still works with it open; the normal game shows none of it.
- Playwright: walking with the waypoint arrow on the edge and over a target, its screen position changes smoothly frame to frame (no back-and-forth jumps against the camera).
- Screenshots: both tabs closed, each panel open.

## Open questions
- **057.1 Start state.** Proposal: both closed when the sandbox loads.
- **057.2 Closing.** Proposal: the tab toggles it; clicking in the world (firing) leaves it open, so you can test with it up; Esc closes open panels before it pauses.
- **057.3 The backquote key.** Proposal: it opens or closes both panels together, and the key list calls it "Sandbox panels".
- **057.4 The pop-out.** Proposal: a quick slide from the edge (0.15 s); the tab sits on the panel's outer edge while open, so it's in the same place to close.
- **057.5 The tabs' place.** Proposal: the left tab at the strip's old top (under the boss bar), the right one under the minimap; small tablets with the label written sideways.
- **057.6 The waypoint fix's cause.** The build finds and fixes the cause (likely the arrow placed against the camera's view before the camera moves that frame, or sub-pixel positions) and records it here.

## Raised after the build
Built on `claude/fervent-hamilton-u3qlqf` (plan: docs/plans/057-sandbox-popouts.md). 057.1–057.5 are built as proposed. Each choice below took the most conservative option and stands unless Shaun says otherwise.

- **057.6 The waypoint fix's cause, as found.** The arrow was placed in the scene's update against `cameras.main.worldView`, but Phaser moves the camera after the player in the camera's own pre-render step, which runs after the update. So every frame the arrow was placed against the previous frame's view and drawn against the new one: on screen it sat off by however far the player moved that frame. A frame runs 0, 1 or 2 sim ticks as the display's clock drifts against the 60 Hz fixed step, so at the screen's edge the arrow jumped back and forth by a step's distance (about a pixel per tick) while walking. Over a target it was already steady (it's placed on the target in the world), but the switch between edge and over-target was a frame late. Rounding and the bob were not the cause. Fix (render only): the arrow and the hoppers' marks are placed again on the camera's follow update, once the view has moved and before anything is drawn; in the update they're placed against the view the camera's scroll gives (right while the attune's look moves the camera by hand). Where it points and when it switches are unchanged. tests/e2e/waypointSteady.spec.ts walks with an uneven 0–2 ticks per drawn frame and checks the edge arrow stays exactly `edgeInset` from the edge on screen every frame and slides one way only (it failed by 1.2 px before the fix), and that over a target it stays on the target and moves exactly with the camera, switching to the edge once. Proposal: keep.
- **057.7 The tab and the panel (057.4).** The tab works like a drawer's handle: closed, it sits on the screen's edge; open, it rides on the panel's outer edge (right of the Loadout panel, left of the Spawn panel), so it's always where the panel ends, ready to click shut. Open, the panels are exactly 056's boxes. Proposal: keep.
- **057.8 Mid-slide.** A panel's rows work once it's all the way out (0.15 s); a click on a sliding panel does nothing (and doesn't fire). Clicking the tab mid-slide turns it round. The slide runs on the frame's time as Phaser gives it, eased out. Proposal: keep.
- **057.9 The backquote (057.3).** With either panel open it closes both; with both closed it opens both. Under a big centred panel (056.5) it brings them back open and closes that panel, as before. Settings now names the key "Sandbox panels" too (was "Sandbox panel"), and the key list uses that name (was "Hide controls"). Proposal: keep.
- **057.10 Esc (057.2).** Esc closes the big menus and build mode first as before, then any open sandbox panels (both at once, with the menu click), and only then pauses. Proposal: keep.
- **057.11 Stepping aside.** While a big centred panel, the pause menu or a flow screen is up (056.5, 056.10), the tabs step aside with the panels, and come back as they were (each open or closed). A slide in progress waits with them. Proposal: keep.
- **057.12 The pickup feed.** In the sandbox it sits 8 px right of the Loadout tab, level with its top, and moves out with it when the panel opens (056.4 had it right of the strip). Proposal: keep.
- **057.13 The tabs' look (057.5).** 16 × 64 px tablets in the panels' style, the label in the body font, the left one reading upward and the right one downward. Under the pointer a tab gets a brass outline and the menu hover sound; a click plays the menu click. Proposal: keep.

## Results (build)
- **Criteria:** all six met. Unit (tests/render/sandboxStrip.test.ts): closed only the tabs show, on their edges at the strips' old tops; open the panels are 056's boxes with each tab on its outer edge; the slide moves one way in whole px; the tabs clear the HP block, carried bar, tube slot, minimap, boss bar and player, closed and open; start closed, a tab toggles its own panel, the key both; the slide's time; the feed beside the tab. tests/render/waypointPlace.test.ts: the view at a scroll matches Phaser's. E2e (tests/e2e/sandboxStrip.spec.ts): only the tabs on load; each tab opens its panel and a second click closes it; a row click works and nothing pauses; firing leaves them open; Esc closes them before pausing; the backquote opens and closes both; a big panel steps them aside; the key list follows a rebind; the normal game shows none of it. sandbox.spec.ts and sandboxShots.spec.ts open the panels by their tabs. tests/e2e/waypointSteady.spec.ts as in 057.6.
- **Review shots:** docs/review/057: 01 both tabs closed, 02 the Loadout panel out, 03 the Spawn panel out, 04 the waypoint arrow on the edge mid-walk, 05 the arrow over its target mid-walk.
- **Checks:** `npm run check` passes (1,848 unit tests). The full `npx playwright test`, once on the build's head: 165 passed, 0 failed, 157 skipped (review shots). Earlier, while two specs ran side by side, settings.spec.ts's persist-across-reload test timed out once under the load; it passed on its own and in the full run.
