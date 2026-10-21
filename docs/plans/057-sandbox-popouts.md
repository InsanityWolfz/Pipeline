# 057 plan: Sandbox pop-out panels and a steady waypoint arrow

Spec: docs/specs/057-sandbox-popouts.md (approved on draft: the open questions' proposals 057.1–057.5 are built as
written; 057.6 is found by the build and recorded). Branch `claude/fervent-hamilton-u3qlqf`, on main.

Render and data only: the sim doesn't change (no sim tests; determinism and the save shape are untouched).

## Approach

**Pop-outs (057.1–057.5).** 056's two always-on tablets become drawers. Each has a small tab on its screen edge that is
always visible in the sandbox (the "Loadout" tab on the left at the strip's old top, y 34 under the boss bar; the
"Spawn" tab on the right under the minimap, y 113), a tablet with its label written sideways. Clicking a tab slides its
panel out from that edge in 0.15 s; the tab rides on the panel's outer edge, so it is under the pointer's reach to
click again and close. The panels hold exactly 056's rows (the loadout's rows with the key list under them; the spawn
column). Both start closed. Firing into the world leaves them open. Esc closes any open panel before it pauses. The
backquote opens both (or closes both if either is open); the key list names it "Sandbox panels" (042's name for the
action changes to match). 056.5 and 056.10 stand: under a big centred panel, the pause menu or a flow screen, the tabs
and panels step aside, and come back as they were.

- `src/data/sandbox.ts`: `SANDBOX_PANEL.tabs` (size, places, labels' rotation) and `slideMs`; the key list's line.
- `src/render/sandboxPopout.ts` (new, pure): the open/close state with its slide (`PopoutState`), and the layout of the
  tabs and panels at any slide fraction (`popoutLayout`), built on 056's `stripLayout()` for the open boxes.
- `src/render/SandboxPanel.ts`: draws the tabs and the panels where `popoutLayout` puts them; tab clicks toggle;
  rows click only while their panel is fully out; `ui().sandbox` reports the tabs, each panel's state and the rows.
- `src/render/MenuRouter.ts`: Esc closes open panels before pausing; the backquote opens or closes both.
- `src/render/HudView.ts` / `src/render/sandboxStrip.ts`: 056.4's pickup feed follows the Loadout tab.

**Waypoint arrow (057.6).** Found in the build (see the spec's "Raised after the build"): the arrow is placed in the
scene's update from `cameras.main.worldView`, but Phaser moves the camera after its follow target in `Camera.preRender`,
during the render that comes after the update. So the arrow was placed against the previous frame's view, and on screen
it sat off by however far the player moved that frame. A frame runs 0, 1 or 2 sim ticks as the display's clock drifts
against the fixed step, so the edge arrow jumped back and forth by a step's distance while walking. Fix (render only):
`WaypointView` keeps the frame's goal and places the arrow and the hoppers' marks again on the main camera's
`FOLLOW_UPDATE` event (fired inside `preRender` once the view has moved, before anything is drawn); in update it places
against the view the camera's scroll gives (right while the attune's look drives the camera by hand).

## Tests first

1. **Waypoint (e2e, tests/e2e/waypointSteady.spec.ts):** walking with an uneven mix of 0–2 ticks per rendered frame,
   one frame between reads, the edge arrow stays `edgeInset` from the left edge on screen every frame and slides along
   it one way only (fails before the fix by a step's distance); over a target its world point stays on the target, so
   on screen it moves exactly with the camera, and the edge/over switch happens once with no flicker.
   **Unit (tests/render/waypointPlace.test.ts):** `viewAt` matches Phaser's view at zoom 1 and 2.
2. **Pop-out layout and state (tests/render/sandboxPopout.test.ts):** closed, only the tabs are on screen, at their
   edges, panels fully off screen; open, the panels are 056's boxes and each tab sits on its panel's outer edge; the
   tabs clear the HP block, carried bar, tube slot, minimap and boss bar in both states; toggling one leaves the other;
   the slide takes `slideMs` and runs both ways; `setBoth`/`closeAll`; the start state is closed.
   tests/render/sandboxStrip.test.ts keeps 056's checks; its key list line is renamed.
3. **E2E (tests/e2e/sandboxStrip.spec.ts, updated, and sandboxPage.ts):** `?sandbox` shows only the two tabs; a click
   opens each panel and a second closes it; a row click works with it open and doesn't pause; firing leaves it open;
   Esc closes open panels before pausing; the backquote opens and closes both; a big panel steps tabs and panels aside;
   the key list follows a rebind; the normal game shows none of it. sandbox.spec.ts and sandboxShots.spec.ts open the
   panels through the helpers (by the tabs) instead of expecting them up.
4. **Review shots (REVIEW_SHOTS=1):** docs/review/057: both tabs closed, the Loadout panel open, the Spawn panel open,
   the waypoint arrow on the edge and over its target. 056's and 044's shots retaken (they show the controls).

## Slices (each commit with `npm run check` green)
1. The waypoint fix with its e2e and unit test.
2. Pop-out data, `sandboxPopout.ts` and its unit tests.
3. `SandboxPanel` tabs and slide, router (Esc, backquote), the feed, the test hook; e2e updates.
4. Review shots, the spec's "Raised after the build", progress.
