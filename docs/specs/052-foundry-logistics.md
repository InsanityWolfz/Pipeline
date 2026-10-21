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
