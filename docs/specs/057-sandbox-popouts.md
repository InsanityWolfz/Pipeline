# 057: Sandbox panels as click-open pop-outs
status: draft

From Shaun's sandbox playtest of 056, in chat on 2026-10-21: "make the panels a pop out and make it something you click open". 056 made the sandbox's controls always on screen; in play the two strips take too much of the view, so they become pop-outs.

## Goal
The sandbox's controls stay one click away without covering the fight: each panel is a small tab on its screen edge that pops out when clicked.

## Design references
- Specs: 044 (the sandbox and its panel), 056 (the left strip, the key list, the spawn column, the backquote key).

## Acceptance criteria
- [ ] In the sandbox, the left edge shows a small "Loadout" tab and the right edge a small "Spawn" tab, always visible; nothing else of the panels shows until opened (Shaun).
- [ ] Clicking a tab pops its panel out from that edge, with the same rows as 056 (the left one with the key list under the loadout); clicking the tab again closes it (Shaun).
- [ ] An open panel's rows work as today and never pause the game.
- [ ] Nothing changes outside the sandbox.

## Data changes
- `src/data/sandbox.ts`: the tabs' layout and labels, the pop-out's timing.

## Out of scope
- The panels' contents; other sandbox features.

## Test plan
- Vitest (render): tab and panel boxes; open and close state.
- Playwright: `?sandbox` shows only the tabs; a click opens each panel and a second click closes it; a row click still works with it open; the normal game shows none of it.
- Screenshots: both tabs closed, each panel open.

## Open questions
- **057.1 Start state.** Proposal: both closed when the sandbox loads.
- **057.2 Closing.** Proposal: the tab toggles it; clicking in the world (firing) leaves it open, so you can test with it up; Esc closes open panels before it pauses.
- **057.3 The backquote key.** Proposal: it opens or closes both panels together, and the key list calls it "Sandbox panels".
- **057.4 The pop-out.** Proposal: a quick slide from the edge (0.15 s); the tab sits on the panel's outer edge while open, so it's in the same place to close.
- **057.5 The tabs' place.** Proposal: the left tab at the strip's old top (under the boss bar), the right one under the minimap; small tablets with the label written sideways.
