# 052 plan: Foundry logistics

Spec: docs/specs/052-foundry-logistics.md (approved on draft; the open questions' proposals are built: 052.1 a tunnel
holds as many items as the tiles it spans, like a conduit that long; 052.2 picking up one end leaves the other unpaired
until a new end is placed in reach; 052.3 the stash is always safe, unchanged).

## Approach
Four slices, each with its tests first and its own commit(s), `npm run check` green at each.

1. **Remove the sorter and the merger (C.2).** Their piece entries, states, flow rules (`splitMerge.ts` keeps only the
   splitter's two helpers), placement, the sorter's menu and `setFilter` command, the merger's research node, its
   schematic item and drop region, their art (sorter frames and emblem, merger floor frames, emblem and wall
   diagrams), their contact sheet rows, interact prompts and every test or e2e that named them. The research tests
   that used the merger as their wall node use machine speed instead. `unlockPiece` stays as an effect kind (it is a
   general rule, now with no node using it). Pieces left: conduit, splitter, hopper, crate, the underground pair, machines.
2. **The underground pair (C.1).** Data: `underground-entrance` and `underground-exit` (`tunnel-in`, `tunnel-out`),
   logistics, flat (walked over, like the splitter), unlocked from the start; reach `TUNNEL_REACH = 5` tiles between in
   `src/data/foundry.ts`. Sim (`src/sim/tunnels.ts`, rules; `flow.ts` asks it):
   - An entrance takes items only from its back and carries one across its tile like a conduit; a paired entrance
     hands it into its tunnel; an unpaired one holds it.
   - The tunnel is one slot per tile between the two ends, each crossed in `CONDUIT_TICKS`; its last slot hands to the
     exit, which carries it across its tile and out its front like a conduit. The exit takes nothing from its
     neighbours. So a pair spanning n tiles holds n items (052.1).
   - Pairing: placing an end looks along its line (an entrance ahead, an exit behind) for the nearest unpaired other
     end facing the same way with at most `TUNNEL_REACH` tiles between, and pairs them. Anything may stand between.
   - Picking up an end gives back what it and the tunnel hold and leaves the other end unpaired (052.2).
   - Conduit corners, the intake's "a line feeds it" check and build arrows treat an entrance as having no front output.
   - Tests (tests/sim/tunnels.test.ts): items pass through; the slot count and holding; reach (0 to 5 between pairs,
     6 doesn't; facing must match; nearest wins; already paired ends are skipped); either end placed second pairs;
     anything builds between; pick-ups (contents back, other end unpaired, a new end re-pairs); determinism.
   - **Shaun's case** (same file): an arrow line and a bomb line whose feeds cross (the fiber run under the stone run
     to the bomb maker's side), built from hoppers, both making rounds into their crates.
   Render: the two ends' art (a stone hood over the channel sinking into the floor, the exit its mirror), build bar
   emblems; in build mode the reach of the entrance ghost (and, with the exit selected, of every unpaired entrance)
   is marked with lines along both sides of the tiles; the exit ghost in reach shows its tunnel; hovering a paired end
   (cursor over it in the foundry) shows the tunnel to its pair. Placing an entrance selects the exit next.
3. **The stash screen (C.3).** Sim: `stashPut` and `stashTake` commands (one, half or the clicked stack, 047's
   amounts) at the stash in reach; `takeStash` with a null item (take all) stays for the hook. Render: E at the stash
   opens the grid panel in a new `stash` mode: the stash's own grid (8 wide, scrolling by rows, no limit) above, the
   inventory grid below, the same clicks both ways; its old choice menu goes. Tests: tests/sim/stash.test.ts (moves
   each way, amounts, reach, emptied kinds leave, banking unchanged) and tests/render for the layout (both grids on
   screen, apart, above the HUD).
4. **The bench by the door (C.4).** The bench's fixture moves just inside the door, (22, 6) facing left (the stash
   and waystone stay); the room's walk and the reach checks still pass. Redrawn (`fixtures.ts`): a workbench with a
   big brass magnifying glass on one side and an armor rack (a breastplate on a stand) on the other; its flare frame
   kept. Tests: the bench sits within 3 tiles of the door's arrival tile and clear of every other fixture.

Saves: piece states change (two kinds gone, two new with a pair and a tunnel), so SAVE_VERSION 6 → 7, no migration, and
the shape fixture regenerated.

## Verify
`npm run check`; e2e touched: foundry, menuLabels, tubeLink, research(+Shots), claiming, tutorial, hudInventory, a new
`tunnels.spec.ts` (place a pair with the mouse and see items come out; the stash screen opened with E and a click each
way) and its review shots (docs/review/052): a tunnel being placed with its reach, a hovered tunnel, two crossing
lines, the stash screen, the bench by the door. Older shots that cover the foundry and the build bar re-run; retake
only what 052 changes. Full `npx playwright test` once on port 5252; `npm run measure` once.
