# 045: Readability fixes
status: draft

From Shaun's playtest notes (docs/brainstorm/2026-10-20-playtest-notes.md, notes 2, 7, 8, 9, 13, 14) and his interview answers (docs/brainstorm/2026-10-20-playtest-interview.md), plus 043.5 from the backlog.

## Goal
Small fixes that make the game easier to read for a new player: a red HP bar, prompts where E does something, pickups that come to you, build controls on screen, Wisps that can't be sniped from the screen's edge, cache loot you can see, and a prompt and sounds on the Bulwark's sealed door.

## Design references
- docs/design.md: "Combat" (telegraphed, readable fights).
- Specs: 017 (on-screen aggro), 018 (nodes and E), 021 (pickup reach), 026 (the build bar), 031 (the HP bar, the pickup feed), 032 (the Ruined Cache), 042 (key bindings), 043.5 (the seal's prompt and sounds).

## Acceptance criteria
**HP bar (note 2)**
- [ ] The HP bar's fill is red (a palette red), with nothing else added; the low-HP edges (031) stay as they are.

**E prompts (note 7, 043.5)**
- [ ] Ley crystal nodes show the same E prompt as other harvestable nodes when in reach.
- [ ] While the Bulwark's arena is sealed (043), an E prompt shows over the sealed door when the player is in reach. The seal plays the Hollows barrier's hum while up and its collapse sound when it drops.
- [ ] A test lists every interactable kind and checks each has a prompt, so a new one can't ship without.

**Pickup (note 8)**
- [ ] Drops within 96 px drift toward the player and are picked up on contact (a magnet pull). The E and walk-over pickup reach is 96 px (from 64). Nodes still need E.
- [ ] Both numbers are data (`PICKUP_RADIUS`, a new magnet radius and pull speed).

**Build controls (note 9)**
- [ ] In build mode, a key strip just above the build bar shows place, rotate, flip, pick up, drag a line and exit, with the player's bound keys (042). It shows only in build mode.

**Wisp aggro (note 13)**
- [ ] Wisps wake as soon as they're on screen, the same rule as other enemies (017).

**Cache loot (note 14)**
- [ ] Opening a Ruined Cache bursts each item out of the chest as its own icon with its name, then each flies to the player (with the magnet pull). The pickup feed lists them as usual.

## Data changes
- `src/data/hudPanels.ts`: the HP fill colour.
- `src/data/player.ts`: `PICKUP_RADIUS` 96, the magnet radius and pull speed.
- `src/data/enemies.ts`: the Wisp's wake rule.
- `src/data/landmarks.ts` or its assets: the cache burst's timing.
- `src/data/hollowsSounds.ts`: the seal's sounds.

## Out of scope
- Anything else on the HUD; the low-HP edges.
- Other enemies' aggro.
- Inventory and hotbars (047).

## Test plan
- Vitest: the magnet pull and the 96 px reach; Wisps wake on screen; every interactable has a prompt.
- Playwright: the build strip appears only in build mode with the bound keys; a cache's items burst and reach the player.
- Screenshots: the red HP bar, the ley crystal prompt, the build strip, a cache burst, the sealed door's prompt.

## Open questions
- **045.1 How fast is the magnet pull?** Proposal: drops accelerate to the player over about a quarter second, like most action RPGs; the speed is data.
- **045.2 Does the magnet pull work in combat?** Proposal: yes, always. Risky pickups don't exist yet; if one is added, it can opt out in data.
