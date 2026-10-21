# 056: Sandbox controls always on screen
status: approved

Approved on draft by Shaun in chat, 2026-10-21 ("approve 56"): the build follows the proposals in the open questions.

From Shaun in chat, 2026-10-21: "add the controls in the sandbox to a static strip on the left side of the screen so i always know my options in the sand box". His answers to the two interview questions: the strip shows **both** the sandbox panel's controls and a key list; the spawn controls **stay on the right**.

## Goal
In the sandbox (044), every option is always visible: the loadout controls and a key list in a fixed strip down the left edge, the spawn controls fixed on the right, with no key to open them first.

## Design references
- Specs: 044 (the sandbox, its panel and key), 042 (key bindings in Settings), 047 (the hotbars), 050 (top banners), 051 (the minimap in the top right).

## Acceptance criteria
- [ ] In the sandbox, the loadout column (each entrance's round, god mode, the boss resets) is drawn in a fixed strip down the left edge of the screen, always visible from the moment the sandbox loads (Shaun).
- [ ] Under it in the same strip, a key list names each action and its current key, read from the player's bindings (042), so a rebind shows at once (Shaun).
- [ ] The spawn column stays on the right edge, always visible too (Shaun).
- [ ] Both stay clickable as today, never pause the game, and don't cover the player, the hotbars, the HP bar or the minimap.
- [ ] Nothing changes outside the sandbox.

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
