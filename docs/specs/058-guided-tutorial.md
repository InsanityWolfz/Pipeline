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
13. **Restore the right intake entrance (E at its cap with the warden core)**
14. **Put ley bolts into the second entrance** (guided, ghosts; the right entrance)
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
- [x] A new game's goals run in the order above, with the texts above; the removed steps never show (Shaun).
- [x] Step 12 shows only if the example line has run dry when the player reaches the foundry from step 11; otherwise the chain goes straight to step 13.
- [x] Step 15 is done the moment the player is outside the foundry; step 16 shows at once (Shaun: "make it go to … the second you leave the foundry").
- [x] The talent step cuts in as soon as the first point is earned and is done once a point is spent; the goal it interrupted comes back (Shaun).
- [x] After step 25 the goal panel and the waypoint arrows are gone for good; the minimap stays (Shaun).

**Equip (step 9)**
- [x] With the bench's screen open, arrows point at the identified piece and then at what to click to wear it; the step is done when any piece is worn (Shaun: "maybe you put some little arrows in the menu").

**The right entrance (step 13)**
- [x] During the tutorial, only the right entrance's cap takes the Warden's core (Shaun, 058.5); the waypoint arrow points at it.

**The build lock**
- [x] From the first foundry visit until step 19 is done, the player can't place, pick up or rotate pieces in the foundry, except as the guided steps below allow (Shaun). Hoppers, crates, the stash, the bench and the intake still work as today.
- [x] During steps 14 and 19, the only piece that can be placed is the one the step asks for next, only on its ghost tile, facing the ghost's way; anything else is refused with a short hint (Shaun).
- [x] After step 19, building is open as today.
- [x] A save that had already restored the second entrance when this ships builds freely and keeps its goals; earlier saves get the new steps (Shaun). If the build has to bump `SAVE_VERSION`, older saves read as too old (docs/process.md "Saves") and this applies only to saves the build can still read.

**The ley bolt line (step 14)**
- [x] Ghosts show a complete ley bolt line: from the ley crystal port, by conduits, into a grinder, then a focuser, then by conduits into the right entrance. They don't touch the example arrow line (Shaun).
- [x] The step's sub-lines name the next piece to place; in build mode an arrow points at that piece in the build bar, and the ghost tile it goes on is marked (Shaun: "the arrows like point you in the bottom left when you're in build mode, like what to build").
- [x] The step is done when ley bolts reach the right entrance.

**The frost rune (step 19)**
- [x] An arrow points at the conduit leaving the arrow assembler, with "Right click to remove" (Shaun). Once it's removed, an arrow points at the frost rune in the build bar and a ghost shows where it goes (Shaun).
- [x] Then ghost conduits run from the rimestone port to the frost rune, with a ghost underground entrance and exit where they cross the ley bolt line from step 14, so the player builds their first underground belt there (Shaun).
- [x] The step is done when the line makes frost arrows (today's check); the build lock lifts at the same moment.

**Placement**
- [x] The waypoint arrow over a target never overlaps the target's key prompt (E, C, B) (Shaun).
- [x] In the foundry, the goal panel sits right under the minimap (Shaun).

**Texts outside the goal line**
- [x] The pylon's "Send haul home" button reads "Send inventory to stash" (Shaun).

**Unlock banner**
- [x] When a crafting recipe becomes available, a banner at the top (where the area banners show) says "Unlocked <name>"; several unlocked at once share one banner (Shaun).

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
- Vitest (sim): the chain's order and texts; the refill skip; the talent cut-in and return; "Leave the foundry" on exit; the build lock refusing placement, pickup and rotation, and allowing only the next ghost piece on its tile and facing; the lock lifting after step 19; old saves past the second entrance building freely; only the right cap taking the core during the tutorial.
- Playwright: the tutorial bot plays the new chain from a New game to the end (rewriting today's tutorial e2e), building both guided lines on their ghosts; the bench's arrows; the build-bar arrow; the unlock banner.
- Screenshots: step 9's arrows in the bench screen; step 14's ghosts with the build-bar arrow; step 19's remove arrow, the frost rune ghost, and the underground ghosts; the goal panel under the foundry minimap; the waypoint arrow above an E prompt; an unlock banner; the empty goal area after the end.

## Open questions
Each has a proposal; the build follows it unless Shaun says otherwise.
- **058.1 The new texts.** Proposal: "Equip a piece of armor at the bench (E)", "Fast-travel to the foundry from the pylon (E)", "Restore the right intake entrance (E with the warden core)", "Put ley bolts into the second entrance (B)", "Claim the Frozen Grotto's pylon", "Press T to spend a talent point".
- **058.2 The guided sub-lines.** Proposal: one sub-line under the step for the next piece only, with its icon ("Place a conduit", "Place a grinder", "Place an underground entrance"), counting ("Place conduits 3/7") when several of the same piece come in a row.
- **058.3 Build mode while locked.** Proposal: B still opens build mode so the bar can be seen; locked pieces are greyed, and their hover says "Unlocks as the tutorial goes on". A refused placement shows "Build on the glowing outline" during a guided step and "Not yet" otherwise.
- **058.4 The talent cut-in during a guided step.** Proposal: if the point arrives while step 14 or 19 is current, the talent step waits until that step is done, so the guided build isn't broken up.
- **058.5 The ghost layouts.** Decided by Shaun after the plan found a problem (2026-10-22, "Ley bolts to the right"). Into the left entrance, the ley line and the example line fence off the room's top-left corner, so the rimestone line would cross the ley line twice or not at all. So the ley bolt line goes to the right entrance: from the ley crystal port it runs east under the example line and up into the right entrance. The rimestone line goes north from its port, crosses the ley line once with one underground pair, and feeds the frost rune from its left side. The plan picks the exact tiles; both lines stay clear of the example line, the stash, the bench and the door.
- **058.6 Removing the conduit.** Proposal: during step 19 the conduit leaving the assembler is the only piece right click can pick up; it goes into the inventory as usual.
- **058.7 The equip arrows.** Proposal: the first arrow points at the identified piece in the bench's screen, the second at the slot it goes in (or its equip button, whichever the screen uses).

## Raised after the build
Build-time choices the spec didn't decide; the conservative option is built. Shaun OKs or changes them.
- **058.8 The bench screen's arrows.** The screen has no equip button: a click on a piece's row wears it. Built: on another slot's tab, the first arrow points at that slot's tab; on it, the arrow points at the piece's row.
- **058.9 Feeding the left entrance after the tutorial.** With the frost rune fed from (11,2), the left entrance's floor tile (11,1) is boxed in by the rimestone conduit, the wall and the example line. Step 25 ("Feed all three entrances") then needs an underground pair from (11,6) up under the example line to (11,1), or a reroute; the tutorial bot uses the pair. Built: no extra hint. Does step 24 or 25 need a pointer?
  **Shaun (chat, 2026-10-22): "No hint."** Goal 25 gets no pointer for feeding the left entrance; the player has built an underground belt by then.
- **058.10 When the first talent point comes.** The tutorial bot reaches level 2 while gathering (at goal 3, "Craft arrows"), before the ruin field, so the cut-in shows there and the line goes back to "Craft arrows (C)".
- **058.11 The talent cut-in's marks.** It has no waypoint arrow or key prompt (it's done anywhere, with T); the text names the key.
- **058.12 Who the build lock applies to.** Only the real game's start (New game, and `?start=tutorial`, the same start without the title): `?playtest`, `?start=field|hollows` and the sandbox build freely. The goal flags moved, so `SAVE_VERSION` is 12 with no migration; no existing save can be read, so the old-save rule applies to none.
- **058.13 The sub-line's count.** A run of the same piece counts what's built of it: "Place conduits 0/2", then "1/2"; a lone piece reads "Place a grinder"; the removal reads "Remove the conduit".
- **058.14 The unlock banner's look.** "Unlocked" as the small line over the names, joined with commas; past 420 px it breaks after a comma onto a second line (the shrine's claim unlocks six tagged rounds at once). Recipes known when the game scene starts (a New game's arrows, a loaded save's) aren't announced.
- **058.15 The refusal hint.** "Build on the glowing outline" (guided step) or "Not yet" shows over the build bar for 1.6 s, for refused placements and pick-ups.
- **058.16 A guided conduit's shape.** On its ghost a conduit always takes the ghost's corner, whatever way the drag laid it.
- **058.17 Small things the new chain left over.** "Wait for the tube to fill with arrows" points at the intake with no key prompt; the waypoint targets no goal uses any more (site pylons, ports, the new entrance) and the away clock are gone; the prototype counts as complete at "Leave the foundry".
- **058.18 The higher goal band in the foundry.** Right under the foundry minimap, a long goal (the refill's) reaches over the hoppers' arrows when the player stands three rows or more below them; those arrows then move to the screen's edge until the player comes closer. Built as is; the band could wrap long goals instead.

## Results (build)
- Layouts (058.5, docs/plans/058-guided-tutorial.md): the ley line is 25 pieces from (2,10) along row 10 (grinder (4,10), focuser (5,10)), up column 15 and along row 1 into (13,1); the frost step is a removal, the frost rune at (12,2) and 19 pieces from (2,12) up column 3, under the ley conduit (3,10) by the pair (3,11)→(3,9), and along row 2 into (11,2). A sim test builds each in order: ley bolts reach the right entrance, frost arrows the centre one.
- Criteria: all met. Chain, refill skip, leave-at-once, talent cut-in (and 058.4), the end with no panel or arrows, the lock and its ghost-only exceptions, the right cap only, both guided lines, the pylon text: Vitest (tests/sim/guidedTutorial.test.ts, guidedLayouts.test.ts, goals, foundryTutorial, objectiveTarget). The bench arrows, the build-bar arrow with greyed cells and their locked line, the refusal hint and the unlock banner: tests/e2e/guidedTutorial.spec.ts. The prompt clearance: tests/render/waypointPlace.test.ts. The old-save criterion: met as its own clause allows (058.12).
- tests/e2e/tutorial.spec.ts plays a New game to the end (split in two after review, see below): the ruin field and the shrine fought by the bot, both guided lines built ghost by ghost (an off-ghost placement refused each time), the lock checked, and from the Frozen Grotto on the guards and the Bulwark felled through the hook (as hollows.spec.ts does). It ends with the line empty, no waypoint, the minimap shown. About 35 s locally.
- Review shots, docs/review/058: 01–02 the bench arrows (tab, then row), 03 the ley line's ghosts with the build-bar arrow, 04 the remove arrow, 05 the frost rune ghost, 06 the underground ghosts, 07 the goal panel under the foundry minimap with the arrow clear of the bench's E, 08 an unlock banner, 09 the goal area empty after the end.
- Checks: `npm run check` green (1,857 unit tests). Locally the touched e2e passed (tutorial, guidedTutorial, foundryTutorial, foundryFlow, guidance, claiming, equipment, research, tunnels and the other tutorial-start specs); older shot specs run with REVIEW_SHOTS=1 (028, 032, 035, 036, 045, 046, 051, 053, 054, 055) had their staging fixed where the chain moved (guidanceShots' refill text, its talent cut-in and stand, foundryFlow's port goal) and their images restored as on main; two of them, bossDoorsShots' Bulwark door and readabilityShots' HP bar, fail in this container on main too. CI green on 76de8d4; the head's CI is in the PR.

## Review fixes
The reviewer found no blocking issues; these suggestions were applied.
- 058.9 recorded with Shaun's answer (no hint); 058.12 names the starts that build freely (`?start=field|hollows`; `?start=tutorial` is guided).
- The Warden core's right-cap rule (`capFits`, src/sim/research.ts) reads `isGuidedGame`, so the sandbox agrees with the build lock.
- The refill's skip is decided only when the fast-travel goal is the current goal: that goal is now `inOrder`, so a fast travel made before step 11 no longer decides it early (test: tests/sim/guidedTutorial.test.ts, "is decided when the fast travel goal is current").
- One `capBox` helper (src/render/waypointPlace.ts) for the objective's and the in-reach prompt's key caps; InteractPrompt's orphaned doc comment is back on `update`.
- `GUIDED_NAMES` keeps only the conduit ("Ley conduit" reads "conduit"); the rest use the build bar's name, lowercased.
- The refusal hint counts down on the clock the scene passes (the tween clock, as the banner's), not `game.loop.delta`.
- tests/e2e/guidedTutorial.spec.ts waits on the camera settling and on a drawn frame instead of fixed timeouts; tests/sim/goals.test.ts names the last chain goal's index; the ghost-only test asserts the `ghost` reason on every refused placement.
- tests/e2e/tutorial.spec.ts (522 lines) is split at the frost step: tutorial.spec.ts plays a New game until it leaves the foundry (the talent cut-in checked there); tutorialFrost.spec.ts stages a New game to the right entrance's goal through the hook (ley bolts crafted, the shrine claimed, a Warden core and what the first half carries), builds the ley line on its ghosts again, and plays on to the end. Their shared helpers are tests/e2e/tutorialPage.ts. The second half claims through a small retry (a hit breaks a claim's hold) and fells what's near before walking out of the Bulwark's arena.
- Checks: `npm run check` green (1,858 unit tests); locally tutorial, tutorialFrost (also twice repeated), guidedTutorial, foundryTutorial, guidance, research and waypointSteady passed.
