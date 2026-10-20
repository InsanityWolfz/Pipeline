# 045: Readability fixes
status: done

Approved on draft by Shaun in chat, 2026-10-20 ("Approve 45-47 on draft"): the build follows the proposals in the open questions.

From Shaun's playtest notes (docs/brainstorm/2026-10-20-playtest-notes.md, notes 2, 7, 8, 9, 13, 14) and his interview answers (docs/brainstorm/2026-10-20-playtest-interview.md), plus 043.5 from the backlog.

## Goal
Small fixes that make the game easier to read for a new player: a red HP bar, prompts where E does something, pickups that come to you, build controls on screen, Wisps that can't be sniped from the screen's edge, cache loot you can see, and a prompt and sounds on the Bulwark's sealed door.

## Design references
- docs/design.md: "Combat" (telegraphed, readable fights).
- Specs: 017 (on-screen aggro), 018 (nodes and E), 021 (pickup reach), 026 (the build bar), 031 (the HP bar, the pickup feed), 032 (the Ruined Cache), 042 (key bindings), 043.5 (the seal's prompt and sounds).

## Acceptance criteria
**HP bar (note 2)**
- [x] The HP bar's fill is red (a palette red), with nothing else added; the low-HP edges (031) stay as they are.

**E prompts (note 7, 043.5)**
- [x] Ley crystal nodes show the same E prompt as other harvestable nodes when in reach.
- [x] While the Bulwark's arena is sealed (043), an E prompt shows over the sealed door when the player is in reach. The seal plays the Hollows barrier's hum while up and its collapse sound when it drops.
- [x] A test lists every interactable kind and checks each has a prompt, so a new one can't ship without.

**Pickup (note 8)**
- [x] Drops within 96 px drift toward the player and are picked up on contact (a magnet pull). The E and walk-over pickup reach is 96 px (from 64). Nodes still need E.
- [x] Both numbers are data (`PICKUP_RADIUS`, a new magnet radius and pull speed).

**Build controls (note 9)**
- [x] In build mode, a key strip just above the build bar shows place, rotate, flip, pick up, drag a line and exit, with the player's bound keys (042). It shows only in build mode.

**Wisp aggro (note 13)**
- [x] Wisps wake as soon as they're on screen, the same rule as other enemies (017).

**Cache loot (note 14)**
- [x] Opening a Ruined Cache bursts each item out of the chest as its own icon with its name, then each flies to the player (with the magnet pull). The pickup feed lists them as usual.

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

## Raised after the build
Built on `claude/045-readability` (plan: docs/plans/045-readability-fixes.md). Each takes the most conservative reading; Shaun to confirm or change.

- **045.3 One 96 px reach for both.** `PICKUP_RADIUS` (96) is also the magnet's radius (`MAGNET` in src/data/player.ts: accel 3000 px/s², max 480 px/s, contact 2 px): an item inside it is pulled in and picked up on contact, about 0.28 s from the edge, never at once. There was no E pickup for ground items (walking near them was the only way), so only the walk-over reach changed. Proposal: keep.
- **045.4 Which things get the in-reach E prompt.** Every kind E acts on (`INTERACT_KINDS` in src/data/interact.ts): the tube stone, the sealed door, an altar, a pylon, the waystone, the stash, the bench, a cache, a research diagram, a hopper, a sorter, a crate and every gathering node. It shows only while E would do something (not on a dormant pylon, a dim altar, an opened cache, an empty crate, or the waystone with nothing claimed), hides while a harvest, claim or cache hold runs, and gives way when the objective's or the intake's prompt already shows E there. The kinds list isn't derived from the sim's E chain (src/sim/step.ts), so a new E handler must add its kind to `INTERACT_KINDS` and `interactTarget` (a comment at the chain says so); tests/sim/interactables.test.ts then holds it to a prompt. Proposal: keep.
- **045.5 The barrier had no hum to reuse.** The Hollows barrier is silent while it stands; only its collapse has a sound. The seal got a new quiet looping hum (`seal-hum`, src/data/hollowsSounds.ts) while it stands in the room on screen, and plays the barrier's collapse as it drops. The Hollows barrier itself stays silent. Proposal: keep; give the barrier the same hum only if Shaun wants it.
- **045.6 Where the cache's loot lands.** The drops scattered round the tile below the chest, where the player stands to open it, so the icons and names piled up on the player. Each item now lands on its own spot of a fan 40 px round that tile (`CACHE_BURST.fanRadius`; a spot in a wall keeps its scattered landing), the names stack so none overlap, and the bursting items draw over the player. Timing: 6 ticks between items, a 24-tick flight, a 36-tick hold with the name, then the magnet. Proposal: keep.
- **045.7 The strip's words and the tube slot.** "Click place · R rotate · G flip · Right-click pick up · Drag line · B exit" in the small label font, keys in gold (bound keys from Settings). Esc also exits build mode but isn't listed. While building the tube slot now sits above the strip, and a click on the strip doesn't place a piece. Proposal: keep.
- **045.8 Wisps once awake.** Woken on screen, a Wisp walks in to its old 160 px range before it keeps its distance and casts, so it stops being a still target without casting from the screen's edge. Proposal: keep.
- **045.9 The save.** Ground items gained optional fields: the pull's speed while it pulls, and a cache item's wait and burst while it waits (each removed once over, so a resting item saves as before). They change the save's shape, so `SAVE_VERSION` is 2, with a 1 → 2 migration that changes nothing but the number (a version 1 save reads as it is).
- **045.10 Older review shots have drifted from main.** Retaking the older shot specs that cover the HUD, the build bar, the Hollows and landmarks (030, 031, 032, 034, 035, 040, 043) gave captures that differ from the committed ones beyond 045's changes: camera and scene drift, two taken mid fade (031/09, 032/14), two under the end card (034/04–05). Only 040/* and 043/01, whose change is the red HP bar or the door's E alone, are recommitted; the rest stay as on main. A separate retake of those specs is queued as its own task.
- **045.11 A bug on main, for the backlog:** in docs/review/031/05 (main's) the inventory panel's Wood row shows "3 at risk" overlapping "home 5". Not fixed here.

### Measurements (`npm run measure`, after the build)
| Measurement | Target | Before (043) | After 045 |
| --- | --- | --- | --- |
| Ring 1 pack, seeds 1–5 | ≤ 15 s | 2.2–2.9 s (met) | 2.2–2.9 s (met) |
| Ring 2 pack, seeds 1–5 | ≤ 15 s | 2.5–4.2 s (met) | 2.8–4.2 s (met): the Wisp now wakes on screen |
| Ring 3 pack, seeds 1–5 | 8–18 s, no KO | 10.2–17.6 s (met) | 10.2–17.6 s, no KO (met) |
| Bulwark, decent build, seeds 1–20 | ≥ 15/20 meet all three; ≤ 2 KOs | 13/20, 3 KOs (missed, 043.2) | 13/20, 3 KOs (missed, unchanged) |
| Bulwark, naive bot | KO'd on every seed | met | KO'd on 5/5 (met) |
| Ammo, line: arrow / still: mine | wins by ≥ 10% every seed | met | 5/5, 5/5 (met) |
| Ammo, cluster / walls | recorded | | arrow 221 ticks / bomb 124 ticks |

Not tuned (balance is judged at playtest).

## Shaun's answers (2026-10-20)
- Shaun playtested the preview, OK'd 045.3–045.9 as built and said "Merge 33".
