# 056: Sandbox controls always on screen
status: done

Approved on draft by Shaun in chat, 2026-10-21 ("approve 56"): the build follows the proposals in the open questions.

From Shaun in chat, 2026-10-21: "add the controls in the sandbox to a static strip on the left side of the screen so i always know my options in the sand box". His answers to the two interview questions: the strip shows **both** the sandbox panel's controls and a key list; the spawn controls **stay on the right**.

## Goal
In the sandbox (044), every option is always visible: the loadout controls and a key list in a fixed strip down the left edge, the spawn controls fixed on the right, with no key to open them first.

## Design references
- Specs: 044 (the sandbox, its panel and key), 042 (key bindings in Settings), 047 (the hotbars), 050 (top banners), 051 (the minimap in the top right).

## Acceptance criteria
- [x] In the sandbox, the loadout column (each entrance's round, god mode, the boss resets) is drawn in a fixed strip down the left edge of the screen, always visible from the moment the sandbox loads (Shaun).
- [x] Under it in the same strip, a key list names each action and its current key, read from the player's bindings (042), so a rebind shows at once (Shaun).
- [x] The spawn column stays on the right edge, always visible too (Shaun).
- [x] Both stay clickable as today, never pause the game, and don't cover the player, the hotbars, the HP bar or the minimap. Met, with one limit (056.9): near the room's side walls the player can pass under a strip.
- [x] Nothing changes outside the sandbox.

## Data changes
- `src/data/sandbox.ts`: the strip's layout and the key list's actions.

## Out of scope
- New sandbox features; the rest of the HUD.

## Test plan
- Vitest (render): the key list follows a rebind; the strip's boxes avoid the HUD's.
- Playwright: `?sandbox` shows both columns and the key list without a key press; clicking a row still works; the normal game shows none of it.
- Screenshots: the sandbox on load with the strip, the right column and the key list; after a rebind.

## Open questions
- **056.1 The backquote key.** Today it opens the panel. Proposal: it now hides and shows both strips together (for clean screenshots), and they start shown.
- **056.2 Which keys the list shows.** Proposal: the bound actions that do something in the sandbox, in 042's names and order: Move (the four keys on one line), Roll, Interact, Crafting menu, Inventory, Talents, Use carried item, Carried slots 1–5 (one line), Feedback note, and the hide key (056.1); plus the fixed ones, Left click (fire), Esc (pause). Build, Research, Rotate and Flip are left off: they work only in the foundry, which the sandbox can't reach.
- **056.3 The objective band and minimap space.** The sandbox has no objectives (044.5), so the right column runs from under the minimap to above the hotbar. Proposal: keep both columns at today's width and let the camera stay centred on the player (the room is wide enough to keep the player clear of both).

## Raised after the build
Built on `claude/056-sandbox-strip`. 056.1–056.3 are built as proposed. Each choice below took the most conservative option and stands unless Shaun says otherwise.

- **056.4 The pickup feed.** It sat top-left, where the strip now is. In the sandbox only, it moves to just right of the strip, level with the strip's top (clear of the boss bar, the player and the spawn column). Everywhere else it's where it was. Proposal: keep.
- **056.5 The big panels.** The inventory, research list, talent tree, crafting menu and a site's menu (the bench's gear panel) are centred and wide enough to overlap both strips. While one is open, the strips step aside; they come back when it closes. Pressing the backquote with one open brings the strips back and closes it, as the old panel key did. Esc no longer closes the strips (it pauses, or closes a menu, as everywhere else). Proposal: keep.
- **056.6 Fitting the strip.** For the loadout's rows and the 12-line key list to fit above the HP block, the rows are 2 px apart (were 4) in both columns, and the strip starts at y 34, under the boss bar (a boss fight's bar would otherwise sit over its corner). The spawn column starts under the minimap's space (056.3). Both stay 200 px wide. Proposal: keep.
- **056.7 The key list's words.** Move shows its keys up, left, down, right, so the defaults read "W A S D". The panel key's line says "Hide controls" (Settings still calls it "Sandbox panel"). An unbound action shows "—". The backquote shows as "`", as in Settings; it's small. Proposal: keep.
- **056.8 The pointer.** It's the arrow only over the strips; elsewhere it stays the crosshair (it was the arrow whenever the old panel was open). Proposal: keep.
- **056.9 The player near the walls.** The camera stays centred on the player (056.3) only where the room allows: near a wall it stops at the room's edge (RoomViews), and the player walks off centre. Near the left wall or the first pen the player can be under the left strip, and near the right wall under the spawn column. The backquote hides both. No camera offset was added; that would be a design call. Proposal: keep, or say if the camera should shift.
- **056.10 Paused.** While the game is paused (Esc), or a flow screen such as Settings is up, the strips step aside as they do for a big panel (056.5), so they don't draw over the pause dim or light up under the pointer. Closing back to play brings them back. Proposal: keep.

## Results (build)
- **Criteria:** all five met. tests/render/sandboxStrip.test.ts checks the strip's and spawn column's boxes against the HP block, carried bar, tube slot (1–5 units), minimap, boss bar and player, and the key list against a rebind; tests/e2e/sandboxStrip.spec.ts checks both columns and the key list on load with no key press, a row click, no pause, the hide key, a big panel stepping them aside, a rebind through Settings, and that the normal game shows none of it.
- **Checks:** see the review fixes below.
- **Review shots:** docs/review/056: 01 the strip on load, 02 the key list after rebinding Roll to Shift. 044's shots all retaken (the room's shots now show the controls; the volley and pack shots hide them with the backquote). The retaken 044 shots also show the red HP bar and the five-slot carried bar at 99 each: those come from main (045's red fill and 047's carried bar landed after 044's shots were taken), not from 056.
- **For Shaun's playtest:** at the spawn, the left strip hides the identification bench until you walk toward it (or press the backquote).

## Review fixes
- 056.9 and 056.10 recorded above. The row counts the layout uses come from `sandboxColumns`, with a test that no row has a sub line. The normal-game e2e reads the panel's own objects (`ui().sandboxDrawn`). A new e2e step checks that Esc pauses with the strips up and resumes back to them.
- **Checks after the fixes:** `npm run check` passes (1,841 tests). The full Playwright run: 163 passed, 0 failed, 155 skipped (review shots).

## Shaun's merge (2026-10-21)
- Shaun said "Merge 53" after playing the preview. He changed none of the raised items, so they stand as built.
