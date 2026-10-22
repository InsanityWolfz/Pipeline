# Progress

Newest entry first. Entries before 050 are in docs/progress-archive.md.

## 2026-10-22: 059 World and arena polish
**Changed:** on `claude/059-world-polish` (InsanityWolfz/Pipeline#65): paths read as one shape where they cross or join (every road's edge drawn before any road's dirt); small rocks, rubble, ruin stones, pillars and the forum's columns block feet, shots and every sight line only over their drawn base (`src/data/footprints.ts`; 059.5 shots too, Shaun's call); the forum's walls drawn dark; arena enemies, the Warden included, wait until E puts the player through the door; no boss-door descriptions ("Sealed" when shut); the seal hum at half volume; the Grotto's pylon at 30 rimestone a minute. Also merged today: the New game after Quit fix (#66), the diagonal flicker fix (#67), per-branch preview queues (#68).

**Next:** Shaun's playtest of the preview; "merge 65" when happy.

**Notes:**
- `npm run measure`: the Bulwark's decent build meets all three on 16/20 seeds (main 8/20) with 3 KOs against the ≤2 target; the forum's columns now block only their footprints, so it's an easier fight. Recorded, not tuned.
- Two older shot tests fail on main in this container too (bossDoorsShots' Bulwark door, readabilityShots' HP bar); worth a fix-track look.

## 2026-10-22: Housekeeping
**Changed:** a cleanup batch at Shaun's request, each its own PR, all merged: workflow actions on v5 (InsanityWolfz/Pipeline#57); progress entries before 050 moved to docs/progress-archive.md (#58); agent worktrees under .claude/worktrees ignored by git and ESLint (#59); files over 300 lines split (#60: separation.ts, pointerInput.ts, pointerUi.ts, roomFollow.ts, summaryPlayer.ts); the bomb+frost+cluster summary no longer cut under full font hinting (#61: a Burst line drops "dmg" only when the summary wouldn't fit, Shaun OK'd); all 37 review-shot specs run again (#62). Shaun deleted the old branches and turned on "Automatically delete head branches", so merged PR branches go away by themselves.

**Next:** the next spec, from Shaun's playthrough notes.

**Notes:**
- This container has 4 cores: run at most two agents with Playwright at once, or unit tests time out under load. CI runs the full suite.
- Effects in review shots advance per drawn frame, so waits on a busy machine need generous budgets.
- This session's git access can push but can't delete remote branches; GitHub's auto-delete covers it now.

## 2026-10-21: 057 Sandbox pop-outs and a steady waypoint arrow
**Changed:** on `claude/fervent-hamilton-u3qlqf` (InsanityWolfz/Pipeline#56), the sandbox's panels are click-open pop-outs: a "Loadout" tab on the left edge and a "Spawn" tab on the right, always shown; a click slides the panel out (0.15 s) with 056's rows, a second closes it. Both start closed; Esc closes them before pausing; the backquote opens or closes both ("Sandbox panels"). The waypoint arrow's stutter is fixed (057.6: it was placed against the previous frame's camera view; now placed again on the camera's follow update). Render and data only. Raised 057.7–057.13. Reviewed: the over-target e2e made steady, older specs' retaken shots put back (rule 9), the pickup feed follows the tab the same frame, the tab hover and ease in data. New docs/review/057 shots.

**Next:** Shaun's playtest of `?sandbox` and a walk with the waypoint arrow; "merge 56" when happy.

## 2026-10-21: Faster process
**Changed:** at Shaun's request, the process got lighter (docs/process.md "Two tracks", "Keeping the loop small" 6, 8, 9, "Working with Shaun"; CLAUDE.md; .claude/commands): a fix track for small bugs (no spec, plan, review or wrapup); the spec as the first commit of its build PR, no separate spec PR; plan files only for big specs; CI (.github/workflows/ci.yml) runs `npm run check` and the full Playwright suite in 4 shards on every push, so sessions run only the touched e2e files; the wrapup goes in before the playtest; progress.md is one entry per merged PR, not per step; review shots for the current spec only; ETAs from git history.

**Next:** 057 (already building under the old steps) is the last spec on them.

## 2026-10-21: 056 merged
**Changed:** Shaun merged 056 (the sandbox's controls always on screen: the loadout and a key list in a left strip, the spawn column on the right), InsanityWolfz/Pipeline#53.

**Next:** Shaun's playthrough with commentary tonight, then the playtest interview for the next batch.

## 2026-10-21: 056 built
**Changed:** on `claude/056-sandbox-strip` (InsanityWolfz/Pipeline#53), the sandbox's controls are always on screen: the loadout's rows and a key list (from the player's bindings, so a rebind shows at once) in a strip down the left, the spawn column on the right under the minimap's space, shown from load. The backquote hides and shows both (056.1). Render and data only. Raised 056.4–056.8 (the pickup feed moves right of the strip in the sandbox, the strips step aside for big panels, tighter rows, the key list's words, the pointer). New docs/review/056 shots; 044's shots retaken.

**Next:** review, then Shaun's playtest of `?sandbox`.

## 2026-10-21: 056 drafted
**Changed:** drafted 056 (the sandbox's controls always on screen) from Shaun's request and his two answers (both the panel and a key list in a left strip; spawn stays on the right).

**Next:** Shaun approves 056; then build.

## 2026-10-21: 49–51 merged
**Changed:** Shaun merged the three small fixes ("Merge 49-51"): the sandbox panel's − onto Empty (InsanityWolfz/Pipeline#49), 037's Shatterpoint shot (#50), the older review shots on the round map (#51).

**Next:** spec 056, the sandbox's controls strip.

## 2026-10-21: Bug: the sandbox panel's − onto Empty
**Changed:** on `claude/fix-sandbox-minus`, the sandbox loadout panel's "−" now steps an entrance onto Empty (and "+" wraps onto it); render's `cycle` treated the null Empty choice as a miss and kept the current round. Render only; the sim's loadout command was already right. New unit and e2e tests. `npm run check` passes; sandbox.spec.ts and sandboxShots.spec.ts pass.

## 2026-10-21: Bug: 037's Shatterpoint review shot
**Changed:** on `claude/fix-037-shatterpoint-shot`, the Shatterpoint shot (talentsShots.spec.ts) selects the frost arrows it picks up; it fired the plain arrows in the hotbar's first slot, so the Husk never froze and no shatter came. Retook docs/review/037/05 only. `npm run check` passes; talentsShots.spec.ts passes with REVIEW_SHOTS=1.

## 2026-10-21: Bug: older review shots on the round map
**Changed:** on `claude/fix-old-review-shots`, 032's landmark shots walk to the nearest tile the player can reach below each landmark (the fixed spot was solid or cut off on the round map for the Quarry, Old Grove, Ley Grotto and North Spring), failing if that tile is more than 3 from the aim; Old Grove, Ley Grotto and North Spring aim at their area's middle so they're framed whole (review). Retook 032/01, 02, 03, 09, and 030/05 (the shrine moved and got its walls). 030's and 031's specs already passed on main after 055; nothing to change there. `npm run check` passes; landmarksShots, healingShots and hudInventoryShots pass with REVIEW_SHOTS=1 (26/26).

**Next:** Shaun merges the PR.

## 2026-10-21: 055 merged
**Changed:** Shaun merged 055 (boss doors and the rimestone pylon: both arenas walled with a door, E in and out, the Frozen Grotto's rimestone pylon), InsanityWolfz/Pipeline#48.

**Next:** the small fixes (sandbox minus button, 037's Shatterpoint shot, older review shots), then a full-loop playtest and its interview.

## 2026-10-21: 053 merged
**Changed:** Shaun merged 053 (the round world: Region 1 a disc round the foundry, the Hollows a ring round it, one road network, ley lines carrying icons, the foundry gatehouse), InsanityWolfz/Pipeline#47.

**Next:** 055 (boss doors and the rimestone pylon), InsanityWolfz/Pipeline#48, merges main and goes to Shaun's playtest.

## 2026-10-21: 054 merged
**Changed:** Shaun merged 054 (combat readability: the blue immune bar, the shaded back wave, burning Pool arrows, slower homing bolts, the star shot's shards), InsanityWolfz/Pipeline#46.

**Next:** 053 merges next; 055 (boss doors) follows it.

## 2026-10-21: 054 combat readability built (draft PR)
**Changed:** built 054 on `claude/054-combat-readability` (merged with main's 052). The sim's `immune` flag (a burrowed Burrower, a rising add; never a shield's front) turns an enemy's bar blue with a small shield, shown even at full health. The Bulwark's back wave shades its area red under its ripples. An arrow through a Pool (Blastfletch) burns for the rest of its flight: a flame on its head, an ember trail and a small flash on each hit, nothing extra (054.2). Homing ley bolts fly at 0.6 speed (180 px/s), same turn. The star shot: 5 bigger Shards with a short trail, each half the bolt's damage, out to 96 px, skipping the struck enemy; the Split rule reads 054.1's text. No save shape change. `npm run check` passes (1763); the full Playwright run: 155 passed, 0 failed, 144 skipped. `npm run measure` identical to 051. Review shots in docs/review/054; older shots retaken only where 054 shows. Spec status stays approved.

**Next:** review, then Shaun answers 054.3–054.9 (spec, "Raised after the build") and playtests the preview.

## 2026-10-21: 055 boss doors and the rimestone pylon built (draft PR)
**Changed:** built 055 on `claude/055-boss-doors`, stacked on 053. Both boss arenas are walled all round with one big door (a new solid tile, `G`, stopping feet and straight shots): the Warden's shrine (its fallen stretches and side gaps closed, its door where 012's gate was) and the Bulwark's forum (its door across 034's way in). A door is sealed until its gate opens (the shrine gate for the Warden, the Hollows barrier for the Bulwark), with its hint on hover; then E goes in, and E inside leaves and resets a live boss through 043's lock (`src/sim/arenaLock.ts` is the shared door system; 043's seal now shows while the player fights inside either arena). The sandbox's forum door is always open. Door art: one sprite per width, sealed and open. The Frozen Grotto has a pylon, claimed like any site, sending rimestone up a new port at (1, 12), with a ley line home. SAVE_VERSION 11, no migration. e2e helpers enter and leave arenas by their doors. `npm run check` passes (1,819); the full Playwright run: 155 passed, 0 failed (the review-shot specs skipped). `npm run measure`: as 053 but the Bulwark's decent build 8/20, 7 KOs (053: 9/20, 6). Review shots in docs/review/055; 043/01–02, 044/04, 032/06 and 031/04 retaken. Spec status stays approved; its "Raised after the build" lists 055.3–055.12.

Review fixes (no blockers): a test for the forum door's gate in the overworld; E at a door steps aside to a clear tile if an enemy stands on its landing tile; arena exports only from src/data/arenas.ts; the e2e arena helpers in tests/e2e/arenaHelpers.ts; the spec's criterion 2 recorded as met as amended by 055.3. After them `npm run check` passes (1,822) and the full Playwright run is 155 passed, 0 failed. Six older review-shot tests (032 landmark walks, 030/031 timing) fail on 053 too, so they are not 055's.

**Next:** Shaun answers 055.3–055.12 and playtests the preview.

## 2026-10-21: 053 review fixes
**Changed:** on `claude/053-round-world`, fixed 053's review. Packs keep off the barrier's band and every tile touching it (an enemy there was pushed to the Hollows side and stuck) and out of the shrine's surroundings (`POPULATION.shrineMargin`), so the Warden's fight is unjoined and the tutorial e2e wins it unaided (no pops cleared through the hook). Separation's `NEAR` derived from the largest feet box (144 px) and tested against an all-pairs pass; gate keys by the room's width. Region 1 reachable with the barrier shut; pylons block in the reach fixture. The overworld builds the chunk row below the view at once and the rest nearest-first; `ui().overworldChunks` lists keys. The hive road's hairpin is left (a road change rerolls the generated map; 053.14). Shaun's answers recorded (053.4 keep radius 48; 053.10 keep 8/12/12, judge at playtest) in the spec and the interview notes. `npm run check` passes (1,795); the full Playwright run: 153 passed, 0 failed; `npm run measure` unchanged.

**Next:** Shaun playtests the preview.

## 2026-10-21: 053 the round world built (draft PR)
**Changed:** built 053 on `claude/053-round-world`. Region 1 is a disc of radius 48 round the foundry (twice the old region), its danger rings concentric (17, 30); Stonefall Hollows is the ring to 79 (053.2) with the ley barrier on the whole circle and a ragged cliff edge past it. Every landmark moved whole to its place round the circle (the Warden's shrine north-east, the Bulwark's forum in the ring's north-west). Roads are one network out of the foundry's courtyard without crossings or doubled strips (src/data/roads.ts); each pylon's ley line is one smooth curve to the foundry's ruin, meeting no road or other line (src/data/leyLines.ts); claimed lines carry their raws' icons home, staggered. The foundry's entrance is a 9 × 5 gatehouse with a lit doorway, steps down and beacon pillars. The overworld's ground streams by chunk near the camera; the minimap shows the whole round world at 0.6 px a tile. Pack counts grew with the map (8/12/12). Two per-tick costs fixed (gate tiles, enemy separation). design.md's round-world line (053.1). Merged 052 from main; SAVE_VERSION 10, no migration. `npm run check` passes (1780); the full Playwright run: 152 passed, 1 failed (armor's walk round the ruin, fixed and passed alone twice), 145 skipped. `npm run measure`: as main but the Bulwark's decent build (9/20, 6 KOs; main 14/20, 2 KOs). Review shots in docs/review/053; older shots retaken where 053 changes their subject (032/10, 11, 13; 034/01–03; 049/04; 051/05). Spec status stays approved; its "Raised after the build" lists 053.4–053.13.

**Next:** review, then Shaun answers 053.4–053.13 and playtests the preview.

## 2026-10-21: World and combat interview; 053–055 drafted
**Changed:** ran the interview for the next batch (docs/brainstorm/2026-10-21-world-combat-interview.md) and drafted 053 (the round world), 054 (combat readability) and 055 (boss doors and the rimestone pylon).

**Next:** Shaun approves 053–055. 054 can build alongside 053; 055 follows 053.

## 2026-10-21: 052 merged
**Changed:** Shaun merged 052 (foundry logistics: underground belts, stash, bench), InsanityWolfz/Pipeline#43.

**Next:** the rest of 050–052, then the next batch: 053 (world and bosses) and 054 (combat readability).

## 2026-10-21: 052 merged with main (050, 051)
**Changed:** on `claude/052-foundry-logistics`, merged main after 050 and 051. E closes the inventory, hopper, crate and stash screens (the stash's screen is the inventory's now) and opens the hovered hopper or crate within 3 tiles; a crate's slots link the screen's cols and the stash screen keeps its own entry; item name tips also show in the stash's grid; the name tag avoids the bench's beside-prompt. The foundry map draws an underground pair's ends as lines and lists no sorter or merger; the bench's map icon and waypoint follow it to (22, 9) (tested). SAVE_VERSION 9, no migration. 050's bench e2e and shots walk to the new bench. Older review shots retaken where the merge changes them; noise restored.

**Next:** review of the merge; Shaun answers 052.4–052.12 and playtests the preview.

## 2026-10-21: 051 merged
**Changed:** Shaun merged 051 (guidance), InsanityWolfz/Pipeline#44.

**Next:** the rest of 050–052, then the next batch: 053 (world and bosses) and 054 (combat readability).

## 2026-10-21: 050 merged
**Changed:** Shaun merged 050 (playtest fixes and the title screen), InsanityWolfz/Pipeline#42.

**Next:** the rest of 050–052, then the next batch: 053 (world and bosses) and 054 (combat readability).

## 2026-10-21: 051 review fixes
**Changed:** fixed 051's review on `claude/051-guidance`: 032/14 waits out the door's fade (retaken); TUTORIAL_LAYOUT.marker keeps only the bob; the Hollows' boulders draw as its stone on the minimap (tested in both regions); default-run e2e for the minimap's hover name (cleared as the pointer leaves the canvas) and the arena's icon once seen; the waypoint arrow keeps clear of the corner map, objective band and bottom HUD (051/03 retaken); hopper icons only on the refill goal; the minimap's seen rule and fog packing in src/sim/fog.ts; render magic numbers to data; `gates` required; more objectiveTarget tests; 051/07b polls the swap's progress; noise retakes put back; the minimap's data in src/data/minimap.ts. `npm run check` passes (1743); the full Playwright run: 149 passed, 0 failed, 135 skipped.

**Next:** Shaun answers 051.3–051.11 and playtests the preview.

## 2026-10-21: 051 guidance built (draft PR)
**Changed:** built 051 on `claude/051-guidance`, stacked on 050 (merged with its review fixes). Every goal names a target (src/data/targets.ts, src/sim/objectiveTarget.ts): an arrow at the screen's edge while it's off screen, over it on screen, through the foundry's door or to its stairs when it's on the other side; the nearest of several (051.2). The refill goal marks each unfilled hopper with an arrow and its raw's icon. "Craft bombs and ley bolts (C)" comes before the foundry (its recipes known once the stairs open, 051.3) with indented "Collect stone"-style sub-lines and icons that tick off. Harvestable nodes have a pale outline glow and a glint. The minimap has a saved fog of war (051.1), no water or scenery, icons for the foundry, the shrine's pylon and the arena once seen, and names on hover; in the foundry its place shows the foundry map. 047.9's banner gave way to a mouse beside the carried bar and the slot swap as the attune ends. SAVE_VERSION 8, no migration. `npm run check` passes (1731); the full Playwright run: 147 passed, 0 failed, 135 skipped. `npm run measure` identical to 050. Review shots in docs/review/051; older shots retaken where 051 shows. Spec status stays approved.

**Next:** review, then Shaun answers 051.3–051.11 (spec, "Raised after the build") and playtests the preview.

## 2026-10-21: 050 playtest fixes and the title screen built (draft PR)
**Changed:** built 050 on `claude/050-playtest-fixes`. The second-line goal's cause, reproduced from Shaun's save: it checked "two entrances hold arrows" and its arrow took the middle open entrance; each entrance now records the node that opened it, the goal reads "Feed ammo into the new entrance" (any ammo in the Warden core's entrance) and points at that entrance. SAVE_VERSION 7, no migration. E opens the hovered hopper or crate within 3 tiles and closes the inventory, hopper, crate and stash screens; a crate's 8 slots hold stacks; gains in the foundry are banked at once. Name tags are small and sit under the feet (050.1), banners at the top, the end card has a cursor; inventory items show their names; the gear list scrolls; a gear tip goes as the cursor leaves its square. No sparkle for field regen; the ward ring keeps still, with a shield. The wanderer facing forward has matched arms, shoulders under the hood and a belt that wraps. The title's wanderer breathes and sways, its tube glow pulses; the logo and buttons are bigger. F11: the page no longer overflows (050.2). `npm run check` passes (1701); the full Playwright run: 141 passed, 2 failed (050's own gear test, fixed; settings.spec timed out under load, passes alone here and on main), 128 skipped. `npm run measure` identical to main. Review shots in docs/review/050; older shots retaken only where 050 changes them. Spec status stays approved.

**Next:** review, then Shaun answers 050.4–050.9 (spec, "Raised after the build") and playtests the preview.

## 2026-10-21: 052 review suggestions applied
**Changed:** on `claude/052-foundry-logistics`. The bench's magnifying glass is about a tile across (thicker rim, readable at play scale) and its rack stays inside its tile, clear of the door's wall. The bench's E prompt sits beside it, away from the player (on the door's wall in the foundry), so it never covers the arriving player (052.9). The stash screen says "Stash" once. Tunnel look numbers and emblem keys moved into data; the stash's unused take/put events dropped (SAVE_VERSION stays 7). Shot specs wait on state; 036/07, 028/01, 052/03–05 and 036's bench shots retaken.
**Next:** Shaun answers 052.4–052.12 and playtests the preview.

## 2026-10-21: 052 built (foundry logistics)
**Changed:** on `claude/052-foundry-logistics` (draft PR). The underground pair: an entrance and an exit, up to 5 tiles between in a straight line, anything built between; a tunnel holds as many items as tiles it spans, like a conduit that long. Its reach shows while placing, the tunnel on hover; placing one end selects the other. Shaun's crossing case (an arrow line and a bomb line whose feeds cross) is a sim test. The sorter and the merger are gone, with the merger's research, schematic and art. The stash opens a two-panel screen (its own scrolling grid over the inventory, the same clicks). The bench sits just inside the door at (22, 9), redrawn as a workbench with a magnifying glass and an armor rack. SAVE_VERSION 7, no migration. `npm run check` passes (1678); full Playwright: 135 passed, 1 failed (fixed, file re-run passes), 126 skipped. Measure unchanged from main (ring 3 and the Bulwark's decent build MISSED there too).

**Next:** review; Shaun answers 052.4–052.12 and playtests the preview.

## 2026-10-21: Live-playtest interview; 050–052 drafted
**Changed:** ran the spec interview on Shaun's live playtest notes (answers in docs/brainstorm/2026-10-21-playtest-interview.md) and drafted 050 (playtest fixes and title screen), 051 (guidance), 052 (foundry logistics). 053 (world and bosses) and 054 (combat readability) are ideas for the next batch.

**Next:** Shaun approves 050–052; build them one branch and PR each.

## 2026-10-21: Shaun's live playtest notes saved
**Changed:** saved Shaun's narrated playtest of main verbatim, with a themed reading, in docs/brainstorm/2026-10-21-playtest-notes.md, plus his exported save.

**Next:** the spec interview on those notes.
