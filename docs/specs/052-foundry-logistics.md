# 052: Foundry logistics
status: approved

Approved on draft by Shaun in chat, 2026-10-21 ("approve 050-052"): the build follows the proposals in the open questions.

From Shaun's live playtest (docs/brainstorm/2026-10-21-playtest-notes.md, theme C) and his interview answers (docs/brainstorm/2026-10-21-playtest-interview.md). Shaun found mixed arrow and bomb lines impossible to build: "until we get an underground belt, it's gonna be probably too hard to get multiple setups because you gotta cross the lines to get to different assemblers."

## Goal
Lines can cross with underground belts, the confusing pieces go, the stash becomes real storage, and the identification bench is obvious just inside the door.

## Design references
- docs/design.md: "The Foundry".
- Specs: 006 (building), 013 (conduit corners), 015 (the sorter), 033 (the splitter and merger), 036 (the bench), 047 (grid inventory and screens), 050 (E targets the hovered piece).

## Acceptance criteria
**Underground belts (C.1)**
- [ ] A new piece pair: an entrance and an exit. Items going into the entrance come out of the exit, which faces the same way, up to 5 tiles between them in a straight line (Shaun). Anything can be built on the tiles between.
- [ ] While placing an entrance, the tiles it can reach are marked; placing the exit within reach pairs them. Hovering either shows the tunnel to its pair (as Factorio).
- [ ] Unlocked from the start, like the splitter.
- [ ] A test builds Shaun's case: an arrow line and a bomb line that cross, both running.

**Removed pieces (C.2)**
- [ ] The sorter and the merger are removed, with the merger's research, schematic and art; anything that referred to them is updated (Shaun).

**The stash (C.3)**
- [ ] The stash opens a two-panel screen: the stash's own grid above, the player's inventory below. 8 wide, scrolling, no practical limit; the same clicks both ways (click one, Shift half, Ctrl stack) (Shaun).

**The bench (C.4)**
- [ ] The identification bench sits just inside the foundry's door, redrawn as a workbench with a big magnifying glass on one side and an armor rack on the other (Shaun).

## Data changes
- `src/data/pieces.ts`: the underground entrance and exit; the sorter and merger removed.
- `src/data/research.ts`: the merger's node removed.
- `src/data/foundry.ts`: the bench's spot.
- `src/data/art`: the underground pieces, the new bench.

## Out of scope
- Faster belts, longer tunnels, splitter changes.

## Test plan
- Vitest: items pass through a tunnel; reach and pairing rules; crossing lines both run; the stash's moves; nothing refers to the sorter or merger.
- Playwright: place a tunnel pair and see items come out; open the stash screen.
- Screenshots: a tunnel being placed with its reach marked, a hovered tunnel, two crossing lines, the stash screen, the new bench by the door.

## Open questions
- **052.1 Do tunnels carry one item at a time or a queue?** Proposal: they hold up to the number of tiles they span, like a conduit of that length.
- **052.2 Picking up one end.** Proposal: the other end stays; it simply has no pair until one is placed within reach.
- **052.3 The stash at death.** Proposal: unchanged: the stash is always safe.

## Raised after the build
Built on `claude/052-foundry-logistics` (plan: docs/plans/052-foundry-logistics.md). 052.1–052.3 are built as proposed: a tunnel holds one item per tile it spans, each crossing a tile in a conduit's time, so it behaves exactly like a conduit that long (tested to the tick); picking up one end gives back what it and the tunnel hold and leaves the other end unpaired until a new end is placed in reach; the stash is unchanged at death. Each choice below took the most conservative option and stands unless Shaun says otherwise.

- **052.4 Two build bar cells.** "Underground entrance" and "Underground exit" sit after the Splitter in Logistics. Placing one selects the other next, as Factorio's underground belt does, so the second click lays the exit. Proposal: keep. The alternative is no auto-switch (pick the exit by hand).
- **052.5 Pairing.** Placing either end pairs it with the nearest free other end on its line facing the same way, with at most 5 tiles between (an exit ahead of an entrance, an entrance behind an exit); an end already paired is skipped; 0 tiles between (side by side) works too. Proposal: keep.
- **052.6 What the floor shows.** Two cyan lines along each tile a tunnel passes under (Shaun's "little lines on the top and bottom of the tiles"): faint for reach, bright for a tunnel. While placing the entrance its 6 reachable tiles (up to the wall) show, ending in a tick; with the exit selected, every unpaired entrance's reach shows, and the exit's ghost in reach shows the tunnel it would make. Hovering either end of a pair shows its tunnel, in or out of build mode. Proposal: keep.
- **052.7 The pieces' rules.** Both ends lie flat (walked over, like conduits and the splitter). The entrance takes items only from its back and hands nothing out its front (a conduit beside its front doesn't corner off it); the exit takes nothing from its neighbours, only from its tunnel, and can feed the intake. Proposal: keep.
- **052.8 The stash screen.** E at the stash opens the grid panel titled "Stash": the stash's own grid, 3 rows of 8 shown, scrolling by rows with the wheel over it, no limit, above the inventory. To fit above the HUD, the inventory shows 4 rows here (it scrolls) and the at-risk footer is left off this screen (it stays on the plain inventory and the hopper and crate screens). The old stash menu (Take all, a row per item) is gone; the test hook's take-all stays. Proposal: keep.
- **052.9 Where the bench is.** At tile (22, 9), right below the tile the player arrives on, against the door's wall (the waystone is at (22, 4), the stash at (22, 11)). Two spots above the door were tried and rejected: (22, 6) is hidden behind the objective line, and (22, 7) is hidden behind the arriving player. At (22, 9) it's drawn in front of the player as they walk in and the E prompt shows at once. The bench's spot lives in `src/data/claims.ts` (the fixtures), not `src/data/foundry.ts` as the spec's data list said. Review: the bench is in reach on the arrival tile, so its E prompt sat on the arriving player's chest (A.2 asks that prompts not cover things). Rather than move the bench again (out of reach on arrival, but its prompt would still cover a player coming at it from above), its prompt now sits beside it at its middle's height, on the side away from the player (`beside` in `src/data/interact.ts`): in the foundry that's always the door's wall, just below the doorway, so it never overlaps the player. Proposal: keep.
- **052.10 The bench's look.** A wooden workbench with a rune on its front; on its left a big brass-rimmed magnifying glass on an arm over an unidentified piece, with its handle; on its right a rack holding an iron breastplate. The glass flares as gear is identified (as the old lens did). It's drawn a little wider than its tile (42 px), on the left only: review made the glass about a tile across (21 px, from 14) with a thicker rim so it reads at play scale, and kept the rack inside its tile so it no longer overlaps the door's wall. It blocks only its tile. Proposal: keep.
- **052.11 Removed with the merger.** Its research node (the north wall's east panel at (19, 0)), its schematic and drop entry, and its art. Region 1 now drops only one schematic (Machine speed). The "add a piece" research effect stays as a rule with no node using it. 033's review shot of the restore panel with a missing input now shows Reservoir II (aqueduct valves 3/4) instead of the merger's panel. The sorter's e2e file went with it; its unrelated hover and hotbar test moved to `hoverPress.spec.ts`.
- **052.12 Saves.** Piece states changed (two kinds gone, the underground pair's added, the stash's event), so SAVE_VERSION is 7 with no migration (Shaun's rule): a version 6 save reads as too old and the player starts a New game. (050, built in parallel, may bump it too; that's resolved at merge.)

### Results
- Criteria: all met. Underground belts: the pair (tests/sim/tunnels.test.ts), reach and pairing, marking and hover (tests/render/tunnelMarks.test.ts, tests/e2e/tunnels.spec.ts), unlocked from the start, and Shaun's case: an arrow line and a bomb line whose feeds cross (the bomb line's stone goes under the arrow line's fiber), both making rounds. Removed pieces: tests/data/logistics.test.ts (no piece, cell, interactable, icon, research node, schematic, drop region or frame names the sorter or merger). The stash: tests/sim/stash.test.ts, tests/e2e/stash.spec.ts. The bench: tests/sim/bench.test.ts and the review shot.
- `npm run check`: passes (1678 unit tests).
- `npx playwright test` (full run, once, on port 5252): 135 passed, 1 failed, 126 skipped (review shots). The failure was legibility.spec walking to the bench's old spot; fixed, and that file re-run passes (7 passed). Under three workers some older review-shot specs timed out on HP-chunk and healing-mote polls; they pass run alone (26 passed).
- Review shots (docs/review/052): `01-tunnel-placing-reach.png`, `02-tunnel-hovered.png`, `03-crossing-lines.png`, `04-stash-screen.png`, `05-bench-by-door.png`. Older shots 052 changes were retaken: 026/02–04 and 045/04 (the build bar's Logistics), 031/09 (every piece), 033/01–07, 09, 10 (the merger's panel and sheet row gone; 06 now Reservoir II), 028/01–03 (the west wall without the bench), 036/01 and 036/07, 039/05, 039/08 and 040/04 (at the bench by the door).
- `npm run measure`: ammo line and still 5/5 met; ring 1 2.2–3.2 s and ring 2 2.4–4.0 s met; ring 3 4/5 in band, 14.1–21.6 s (MISSED); the Bulwark's decent build 14/20 with 2 KOs (MISSED), the naive bot KO'd 5/5. Main gives the same numbers today, so 052 changes none of them.
