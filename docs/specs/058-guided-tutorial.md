# 058: The guided tutorial
status: approved

Approved on draft by Shaun in chat, 2026-10-22 ("approve 58"): the build follows the proposals in the open questions.

From Shaun's fresh playtest on 2026-10-22 (docs/brainstorm/2026-10-22-playtest-notes.md, theme C) and his spec interview the same day (docs/brainstorm/2026-10-22-tutorial-interview.md). The tutorial should be "almost brain dead" for a new player: one clear thing at a time, the foundry's first lines built piece by piece on ghosts, and nothing else to build until they've done it.

## Goal
A new player is walked through the whole first loop with one obvious step at a time. They equip their first armor, learn fast travel and talents, and build a ley bolt line and a frost rune into the arrow line piece by piece, including their first underground belt. Building opens fully only after that, and the goals end once all three entrances are fed.

## Design references
- docs/design.md: Opening: first 30 minutes (beats 5, 6 and 8), Combat (Skill tree), The Foundry (Unlocks, Restoration), World (Fast travel, Claiming).
- docs/prototype.md: Player flow 6–10.
- Specs: 012 and 027 (the tutorial flow and its foundry steps), 028 (the goal chain after the shrine), 046 (the example arrow line), 050 (the second-entrance goal), 051 (waypoint arrows, sub-steps, the goal panel), 052 (underground belts), 055 (the Grotto's rimestone pylon).

## The new goal chain
Changed or new steps are in **bold**; the rest are as today.

1. Pick up the tube (E)
2. Gather wood, stone and fiber (E)
3. Craft arrows (C)
4. Clear the ruin field of Husks
5. Craft bombs and ley bolts (C), with its sub-lines
6. Enter the foundry
7. **Wait for the tube to fill with arrows** (was "Fill the tube from your line")
8. Identify your armor at the bench (E)
9. **Equip a piece of armor at the bench**, with arrows on what to click
10. Claim the shrine's pylon
11. **Fast-travel to the foundry from the pylon**
12. **Refill the hoppers in the foundry with wood, stone and fiber (E)**, only if the example line has run dry by then; skipped otherwise
13. **Restore the left intake entrance (E at its cap with the warden core)**
14. **Put ley bolts into the second entrance** (guided, ghosts)
15. **Leave the foundry** (done on the step outside, no wait)
16. **Gather rimestone at the Frozen Grotto**
17. **Claim the Frozen Grotto's pylon**
18. Craft frost arrows (C)
19. **Build a frost rune into your arrow line** (guided, ghosts, an underground belt). Building opens fully when this is done.
20. Find the Husk Hive and claim its pylon
21. **Reach Stonefall Hollows** (was "Breach")
22. Claim the Cistern Terrace's pylon
23. Defeat the Bulwark
24. Restore the intake's third entrance (E with the Bulwark core)
25. Feed all three entrances. **The tutorial ends here.**

**Press T to spend a talent point** cuts in as the current goal when the first talent point arrives (level 2, usually in the ruin field), and the chain picks up where it was once a point is spent.

Removed: "Feed ammo into the new entrance", "Feed two entrances to fire a spread", "Head back out — the foundry keeps running", "Run a supply port into your line", "Put a second kind of ammo in another entrance", "Craft homing or split ley bolts", "Claim a second pylon", and the frontier line "Explore beyond the shrine".

## Acceptance criteria
**The chain**
- [ ] A new game's goals run in the order above, with the texts above; the removed steps never show (Shaun).
- [ ] Step 12 shows only if the example line has run dry when the player reaches the foundry from step 11; otherwise the chain goes straight to step 13.
- [ ] Step 15 is done the moment the player is outside the foundry; step 16 shows at once (Shaun: "make it go to … the second you leave the foundry").
- [ ] The talent step cuts in as soon as the first point is earned and is done once a point is spent; the goal it interrupted comes back (Shaun).
- [ ] After step 25 the goal panel and the waypoint arrows are gone for good; the minimap stays (Shaun).

**Equip (step 9)**
- [ ] With the bench's screen open, arrows point at the identified piece and then at what to click to wear it; the step is done when any piece is worn (Shaun: "maybe you put some little arrows in the menu").

**The left entrance (step 13)**
- [ ] During the tutorial, only the left entrance's cap takes the Warden's core (Shaun); the waypoint arrow points at it.

**The build lock**
- [ ] From the first foundry visit until step 19 is done, the player can't place, pick up or rotate pieces in the foundry, except as the guided steps below allow (Shaun). Hoppers, crates, the stash, the bench and the intake still work as today.
- [ ] During steps 14 and 19, the only piece that can be placed is the one the step asks for next, only on its ghost tile, facing the ghost's way; anything else is refused with a short hint (Shaun).
- [ ] After step 19, building is open as today.
- [ ] A save that had already restored the second entrance when this ships builds freely and keeps its goals; earlier saves get the new steps (Shaun). If the build has to bump `SAVE_VERSION`, older saves read as too old (docs/process.md "Saves") and this applies only to saves the build can still read.

**The ley bolt line (step 14)**
- [ ] Ghosts show a complete ley bolt line: from the ley crystal port, by conduits, into a grinder, then a focuser, then by conduits into the left entrance. They don't touch the example arrow line (Shaun).
- [ ] The step's sub-lines name the next piece to place; in build mode an arrow points at that piece in the build bar, and the ghost tile it goes on is marked (Shaun: "the arrows like point you in the bottom left when you're in build mode, like what to build").
- [ ] The step is done when ley bolts reach the left entrance.

**The frost rune (step 19)**
- [ ] An arrow points at the conduit leaving the arrow assembler, with "Right click to remove" (Shaun). Once it's removed, an arrow points at the frost rune in the build bar and a ghost shows where it goes (Shaun).
- [ ] Then ghost conduits run from the rimestone port to the frost rune, with a ghost underground entrance and exit where they cross the ley bolt line from step 14, so the player builds their first underground belt there (Shaun).
- [ ] The step is done when the line makes frost arrows (today's check); the build lock lifts at the same moment.

**Placement**
- [ ] The waypoint arrow over a target never overlaps the target's key prompt (E, C, B) (Shaun).
- [ ] In the foundry, the goal panel sits right under the minimap (Shaun).

**Texts outside the goal line**
- [ ] The pylon's "Send haul home" button reads "Send inventory to stash" (Shaun).

**Unlock banner**
- [ ] When a crafting recipe becomes available, a banner at the top (where the area banners show) says "Unlocked <name>"; several unlocked at once share one banner (Shaun).

## Data changes
- `src/data/objectives.ts`: the new chain, texts and checks (equip, fast travel, talent spent, claimed frozen-grotto, outside the foundry); the talent step as a cut-in; no frontier line.
- A new data file for the guided builds: steps 14 and 19's ghost pieces (piece, tile, facing, order), the frost step's remove target, the build lock's span.
- The pylon menu's button text; the unlock banner's text and timing (next to the area banners' data).
- The goal panel's foundry position and the waypoint arrow's clearance over a prompt (`src/data/hudLayout.ts` or `targets.ts`).
- Save: a version bump if the guided-build state needs saving, reading older saves as above.

## Out of scope
- The world-polish notes (theme D) and the two fixes (the New game crash, the diagonal flicker): their own PRs.
- Any change to how machines, ports or underground belts work; the example arrow line's layout.
- Tutorials for the splitter, bombs in the foundry or the right entrance.
- Goals after the third entrance.

## Test plan
- Vitest (sim): the chain's order and texts; the refill skip; the talent cut-in and return; "Leave the foundry" on exit; the build lock refusing placement, pickup and rotation, and allowing only the next ghost piece on its tile and facing; the lock lifting after step 19; old saves past the second entrance building freely; only the left cap taking the core during the tutorial.
- Playwright: the tutorial bot plays the new chain from a New game to the end (rewriting today's tutorial e2e), building both guided lines on their ghosts; the bench's arrows; the build-bar arrow; the unlock banner.
- Screenshots: step 9's arrows in the bench screen; step 14's ghosts with the build-bar arrow; step 19's remove arrow, the frost rune ghost, and the underground ghosts; the goal panel under the foundry minimap; the waypoint arrow above an E prompt; an unlock banner; the empty goal area after the end.

## Open questions
Each has a proposal; the build follows it unless Shaun says otherwise.
- **058.1 The new texts.** Proposal: "Equip a piece of armor at the bench (E)", "Fast-travel to the foundry from the pylon (E)", "Restore the left intake entrance (E with the warden core)", "Put ley bolts into the second entrance (B)", "Claim the Frozen Grotto's pylon", "Press T to spend a talent point".
- **058.2 The guided sub-lines.** Proposal: one sub-line under the step for the next piece only, with its icon ("Place a conduit", "Place a grinder", "Place an underground entrance"), counting ("Place conduits 3/7") when several of the same piece come in a row.
- **058.3 Build mode while locked.** Proposal: B still opens build mode so the bar can be seen; locked pieces are greyed, and their hover says "Unlocks as the tutorial goes on". A refused placement shows "Build on the glowing outline" during a guided step and "Not yet" otherwise.
- **058.4 The talent cut-in during a guided step.** Proposal: if the point arrives while step 14 or 19 is current, the talent step waits until that step is done, so the guided build isn't broken up.
- **058.5 The ghost layouts.** Proposal: the plan picks the exact tiles. The ley bolt line runs from the ley crystal port along the room's west side and the top row into the left entrance. The rimestone line runs from its port and crosses the ley bolt line once with an underground pair, reaching the frost rune from the side. Both stay clear of the example line, the stash, the bench and the door.
- **058.6 Removing the conduit.** Proposal: during step 19 the conduit leaving the assembler is the only piece right click can pick up; it goes into the inventory as usual.
- **058.7 The equip arrows.** Proposal: the first arrow points at the identified piece in the bench's screen, the second at the slot it goes in (or its equip button, whichever the screen uses).
