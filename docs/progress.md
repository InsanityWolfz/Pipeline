# Progress

Newest entry first. Entries before 050 are in docs/progress-archive.md.

## 2026-10-28: Session end: the art pass merged
**Changed:** 072, 073 and the whole art pass (074–081) merged; 071 dropped for 073; fixes: keep-items-before-foundry (#89), the Conductor's intro beat (#99), and e2e tests that timed the game on the wall clock (#100: game-clock and frame-based waits, Playwright's waits sized for CI's slower renderer, weather off in the mote-colour test). The art pass was combined on 081's branch and merged as one PR (#98), which marked PRs 86, 90–94, 96 and 97 merged.

**Next:** first, main's CI: after the final merges, e2e (1) failed once on `tests/e2e/bossPhases.spec.ts:157` ("the same seed and commands give the same state through an intro on Low and High"): the High run's state was one tick ahead (2121 against 2120). `step()` stops the clock, so the extra tick likely comes from the arena helper (`enterArena`'s walk or the door's fade) depending on drawn frames; make that path tick-exact rather than loosening the comparison (a re-run was requested once). Then Shaun plays the whole game on main (`?playtest`) and answers docs/open-calls.md; then pick the next thing: a performance pass (a new game's first ~4 s run slow while the art warms up), one cheap AI playtest of the new art, or new content (Region 5, a final boss, the post-game modifiers from design.md).

**Notes:**
- Work in a fresh chat session: the working rules are in docs/process.md ("Usage": one builder at a time, lighter reviews; "Stacked art branches"), .claude/rules/render.md (motion judged in motion) and .claude/rules/tests.md (no wall-clock durations; drifting effects off in pixel checks).
- Usage ran out twice this session: running three or four Opus builders, reviewers and spec writers in parallel cost about 0.3–0.75M tokens a spec. Run one at a time.
- `SAVE_VERSION` is 24 (072's 23, 080's 24).
- GameScene.ts is 314 lines (081.10): split it the next time it grows.

## 2026-10-28: 079 The foundry's mood
**Changed:** on `claude/079-foundry-mood` (InsanityWolfz/Pipeline#95), art pass 6 of 8 (plan docs/plans/079-foundry-mood.md):
- the foundry as a warm, torch- and forge-lit workshop on 074's light system: an amber ambient, two braziers and four new side-wall torches, the intake's glow; smelters and kilns light the floor while they work (ember), the Tempering coil violet;
- heat shimmer, steam and glow on working smelters and kilns, sparks and a steam burst as a craft finishes, sharing the particle ledger; ley pulses run along the floor's inlays toward the intake as it fills (the tube is quiet in the foundry, so a fill, not a shot, sends them);
- machines and conduits keep their designs, with a light rim and soft gradients to match the pushed style; the build grid, ghosts, hover and recipe cards, purge prompts and conduit items read as before.

No sim change. Built while Shaun asked for lighter runs, so its own review was the builder's motion check and the main session's look at its shots. `npm run check` 3123 tests after main's merge; CI green. Raised for Shaun: 079.1–079.11; 079.1, 079.2, 079.4 and 079.11 need his call.

**Next:** Shaun's playtest; "merge 95".

## 2026-10-28: 081 HUD polish
**Changed:** on `claude/081-hud-polish` (InsanityWolfz/Pipeline#98, stacked on 073–080; merges last), art pass 8 of 8 (plan docs/plans/081-hud-polish.md):
- one polished stone-tablet look for every panel (stone gradient, carved inner line, lit brass corners) inside today's boxes; cut wells for the carried cells and tube card; a lit top line on the HP and XP bars; titles in pale brass;
- the boss bar framed like the HP bar, the same size, redrawing only on a change (080's intro fill included);
- five icons redrawn that read wrong: the casings (were the bomb), unidentified armour, rimestone, and the Tube talent (read as a battery);
- menu motion: open 120 ms (fade, and a 4 px rise that's visual only; Crafting fades without it), hover and tabs 80 ms, press 140 ms, close instant; never blocks input; follows the system's reduced-motion setting.

No sim change. Reviewed, with a motion check at 60 fps: two blocking findings fixed (the hover snapped out and blinked dark between rows; 081 was stacked only on 074, so its tests and the boss bar would break as 075–080 merged). `npm run check` 3055 tests; CI green. Raised for Shaun: 081.1–081.10; 081.1 and 081.2 need his call.

**Next:** Shaun's playtest; "merge 98" last, after 96, 97 and 95.

**Notes:**
- GameScene.ts is 314 lines after the 078 and 080 merges (081.10); split it next time it grows.

## 2026-10-28: 080 Boss intros and phases
**Changed:** on `claude/080-boss-intros` (InsanityWolfz/Pipeline#97, stacked on 073 and 074–076), art pass 7 of 8 (plan docs/plans/080-boss-intros.md):
- a 2.75 s intro per boss when the player first stands inside its arena: dormant, stir, rise, one beat with the only screen shake in the game (300 ms, world camera only, off with "Flashes and shake" or reduced motion), then a name card on the stone tablet; the Warden stands and slams, the Bulwark hauls its shield from the floor, the Forgewright's cold forge kindles, the Conductor draws a bolt to its staff; a short pan in and out;
- a sim `intro` mode: the boss and its posted enemies are inactive and untargetable, the player takes no damage, burns don't tick; altar re-fights get a 1 s intro with no card; it replays only when the fight restarts; each fight from the intro's end is today's fight from its wake, tick for tick;
- visible phases from existing sim flags: the Bulwark's called runes and enraged veins and roar, the Forgewright's heat bands and flame crest, the Conductor's storm dome, earthed arcs and halo.

`SAVE_VERSION` 24 (072 takes 23). Reviewed, with a motion check: two blocking findings fixed (two criteria had no test; tuning numbers lived in render), plus burns skipping intros and a 3 px hand-back. `npm run check` 2886 tests; CI green. Raised for Shaun: 080.15–080.27; 080.25 and 080.27 need his call.

**Next:** Shaun's playtest; his call on 080.27 (the Conductor's pan ends as he attacks); "merge 97" after 90 and 91–93.

**Notes:**
- `npm run measure`: every boss fight is exactly 2.75 s longer; the targets met are unchanged (Bulwark 21.2 s).

## 2026-10-28: 078 Ammo visuals and particles
**Changed:** on `claude/078-ammo-visuals` (InsanityWolfz/Pipeline#96, stacked on 074–077), art pass 5 of 8 (plan docs/plans/078-ammo-visuals.md):
- every ammo family, element and tier has its own trail and impact as data rows: arrows streak and splinter, ley bolts trail a ribbon and splash light, bombs trail fuse smoke with a glint and blast with smoke, debris, a shock ring and a scorch; frost, fire, lightning, homing, Split, Cluster and the four tiers each read (stormsteel violet in flight);
- one particle ledger (`src/render/particleBudget.ts`) shared by death motes, weather and effects, 150/300/500 on Low/Medium/High; a tier change frees the oldest effects at once;
- trails start at the drawn muzzle; player effects never draw over enemy telegraphs.

No sim change; `SAVE_VERSION` unchanged. Reviewed, with a motion check: blocking findings fixed (no fuse glint; a tier change left effects over the new share; hollow tests; strips on the wrong clock), and the 014 blast flash dimmed so the blast reads. `npm run check` 2929 tests; CI green. Raised for Shaun: 078.1–078.14.

**Next:** Shaun's playtest; "merge 96" after 91–94.

**Notes:**
- The foundry-entry tests (foundryFlow, spread, guidance) now wait by drawn frames (`frameSettled`), not a 5 s timer: under load the door's fade outlasted the timer on main's code too.

## 2026-10-28: 077 World detail, landmarks and weather
**Changed:** on `claude/077-world-and-weather` (InsanityWolfz/Pipeline#94, stacked on 074–076), art pass 4 of 8, from Shaun's art interview (plan docs/plans/077-world-and-weather.md):
- moderate world detail: flowers, rubble, plants and ruin bits per region, placed by a deterministic hash per tile, with paths and fight space kept clear;
- three landmarks per region (Region 1: Fallen Colossus, Ley Tower, The Watcher; Hollows: Unfinished Giant, Aqueduct Head, Great Crane; Emberworks: Great Furnace, Great Crucible, Toppled Stack; Stormcrown: Storm Tower, Stormcaller, Wind Harp), each only on tiles that already block, named on hover;
- swaying grass and trees on a fixed 2.4–3.6 s cycle (wind changes only amplitude, eased), rippling water and flowing ley;
- weather: pollen and ley motes in Region 1, dust with gusts in the Hollows, ash and embers in the Emberworks, rain and lightning in the Stormcrown; none in the foundry, Low's counts in boss fights; lightning never strikes through the player or under the HUD.

No sim change; `SAVE_VERSION` stays 22. Reviewed, including a motion check at real speed: two blocking findings fixed (plants snapped at every gust and fluttered at region borders; a per-frame walk over every chunk). `npm run check` 2749 tests; CI green. Raised for Shaun: 077.1–077.17; 077.3, 077.4, 077.12, 077.16 and 077.17 need his call.

**Next:** Shaun's playtest; "merge 94" after 91, 92 and 93.

**Notes:**
- Frame times (software renderer): a Stormcrown rain fight 108 / 107 / 303 ms on Low / Medium / High; Low is no slower than the world off.
- Restacked on 076 (with 075): weather reads 076's own budget constants, and `ui().particles.live` and the death-mote room both count weather; 078 turns it into one ledger.
- `tests/e2e/feedback.spec.ts` "F in play" sits near its 30 s limit on a loaded runner (typing about 350 ms a key); older than 077, worth a fix-track change.

## 2026-10-28: 076 Enemy and boss polish
**Changed:** on `claude/076-enemy-polish` (InsanityWolfz/Pipeline#93, stacked on 074 and 075), art pass 3 of 8, from Shaun's art interview (plan docs/plans/076-enemy-polish.md):
- all 19 rigs (15 enemies, 4 bosses) redrawn in a family look per region: Mossbound ruins (Region 1), Quarry constructs (the Hollows), Forge constructs (the Emberworks), Storm-works (the Stormcrown); soft gradients, a rim light per family, the thin ink outline; boxes and hitboxes unchanged;
- wind-ups gather, coil and peak by the sim's own wind-up progress (the peak trembles; the camera never moves), with sim timing unchanged and tested tick for tick;
- hit reactions: a flinch on every hit, a stagger at 40% of max health in one tick; bosses only flinch, nothing reacts mid-wind-up;
- deaths dissolve into ley motes in the family's colour (600 ms, bosses 1.4 s) under per-death and live caps that scale with Graphics quality;
- every walk calmed after Shaun's note on 075's wanderer: bob halved, squash 0.015 at most, guarded by tests.

`SAVE_VERSION` stays 22. Reviewed, including a motion check: three blocking findings fixed (a release stretch cancelled the slams' impact squash; the Forgewright's death went over the mote cap; a fight-hash baseline wasn't main's), plus beams starting from the shown frame, staggers counted per sim tick and no per-frame allocation. `npm run check` 2780 tests; CI green. Raised for Shaun: 076.1–076.12; 076.10 and 076.11 are for his eye.

**Next:** Shaun's playtest after 074 and 075; "merge 93" after 91 and 92.

**Notes:**
- After review: ground telegraphs got a 0.9-alpha `danger` rim and a fill strengthening to 0.85 at the peak, because 074's redness check sat at 25.3 against its floor of 25 on Region 1 grass once 077's detail was in; now 69.6 there and 70–93 elsewhere.
- Boot bakes more frames: 1.13 s against main's 0.63 s at 2×, 1.92 s against 1.08 s at 3×; boot to ready 3.8 s against 3.1 s.
- This machine draws 8–13 frames a second under load, so real-time motion strips have 11–19 cells a second.

## 2026-10-27: 075 The wanderer redesign
**Changed:** on `claude/075-wanderer-redesign` (InsanityWolfz/Pipeline#92), art pass 2 of 8, from Shaun's art interview (docs/brainstorm/2026-10-27-art-interview.md; plan docs/plans/075-wanderer-redesign.md):
- the wanderer is now an arcane ranger: a pointed hood with the faceless cyan glow, a knee-length cape, a ley-etched jerkin, bracers, a rune strap, and the minigun tube, hose and brass tank kept; soft gradients, a rim light and the thin ink outline;
- the default colours are "ley cobalt"; `?scheme=rust` and `?scheme=bone` show the alternatives in a preview;
- snappy animation: a real run cycle and braced strafe, firing recoil with barrel spin, a muzzle flash and hose pulse, a somersault roll, a hit snap-back, a KO, idle breathing and cape sway; no screen shake;
- the cape's hem, hood edge and throat gem show the rarity of the best armour worn (`wornRarity`, sim); the old light/heavy tint is gone.

`SAVE_VERSION` stays 22. Reviewed: three blocking findings fixed (a black review shot; the no-shake check missed rolls and hits; poses copied sim timings instead of reading them), plus per-frame allocations removed and the sleeves darkened. `npm run check` 2643 tests; CI green. Raised for Shaun: 075.1–075.12.

**Next:** Shaun's playtest; his OK on the colour scheme and 075.2, 075.3, 075.10–075.12; "merge 92".

**Notes:**
- The region review shots show today's daylight, not 074's moods; retake them on whichever of 074 and 075 merges second (075.1).
- After Shaun's first look (2026-10-28: "the walking animation is abysmal"): the walk ran at 12.2 steps a second with a 1 px hop and squash on every step; now 3.75 steps a second, a 0.4 px bob, strafing no faster, guarded by tests; a rule in .claude/rules/render.md and the reviewer's checklist now has motion judged in motion.
- Shots spawn 12 px from the feet box's centre, while the drawn muzzle sits about 26 px forward and 19 px up; older than 075, more visible with the flash (075.10).

## 2026-10-27: 074 Light and region moods
**Changed:** on `claude/074-light-and-moods` (InsanityWolfz/Pipeline#91), art pass 1 of 8, from Shaun's art interview and his pick of the "pushed vector, ley light, a mood per region" direction (docs/brainstorm/2026-10-27-art-interview.md, docs/art/style-test-2.html; plan docs/plans/074-light-and-moods.md):
- a mood per region as data: Region 1 stays sunny; the Hollows dusky (`hollow` 0.7, `hollow-dark` fog); the Emberworks rust-dark with ash smoke and a flame wash; the Stormcrown dark (`storm-dark` 0.85) with fog and lightning flashes that obey the Flashes setting;
- glowing things light what's near them: ley lines, crystals, pylons and springs, fires and the Emberworks' kilns and chimneys, the muzzle flash, bosses' attacks, rod lightning and blasts; the player and enemies are never darkened and only take a light's catch;
- ground blending: soft terrain edges, worn roads, patches and cracks;
- Settings → Graphics quality: Low (a tint, no lights), Medium (the default: soft light pools on the ground), High (per-pixel light on the ground and the props a light reaches);
- design.md's "Camera and art" rewritten for the art pass, with Shaun's approval.

`SAVE_VERSION` stays 22. Reviewed: one blocking finding fixed (on Medium, lightning didn't flash the ground), the dark moods retuned toward the approved sample, kiln fires added, altars and arena doors moved into the mood. `npm run check` 2646 tests; CI green. Raised for Shaun: 074.1–074.14; 074.5, 074.7, 074.13 and 074.14 need his call.

**Next:** Shaun's playtest, trying High on his laptop; his OK on the moods, the kiln fires and Medium's light pools; "merge 91". 075 and 076 retake their region shots once this is in.

**Notes:**
- Frame times (headless software renderer, loaded machine): a Stormcrown fight 127 / 123 / 385 ms on Low / Medium / High; Low costs no more than the moods off (0.97×). High lights only what a light reaches: 29 draw calls a frame, against 218 before.
- The sim runs fixed ticks, but under about 6 fps (`MAX_TICKS_PER_FRAME` 10) the game slows rather than skip; true on main too.
## 2026-10-27: 073 Enemies only attack on screen
**Changed:** on `claude/073-offscreen-attacks` (InsanityWolfz/Pipeline#90), from Shaun's call on 071 ("anything off the screen should de aggro") and his interview (docs/brainstorm/2026-10-27-offscreen-attacks.md; plan docs/plans/073-offscreen-attacks.md):
- no enemy starts an attack (a wind-up, a shot, a charge, a heal beam) while off screen; held, it acts as if its cooldown weren't ready, and walks home after the 1 s leash grace as before;
- ranges are kept; a wind-up seen starting and shots in flight still land; trails and pools keep burning;
- inside a boss arena, everything follows the boss rules (Shaun, on approval): it wakes once the player is inside and never leashes there, adds included;
- one shared rule, `mayStart` in `aiCommon.ts`, used by every enemy kind.

`SAVE_VERSION` stays 22. Reviewed: one blocking finding fixed (only the attack half of the arena rule was built, so arena enemies gave up after 1 s off screen), plus tests for wind-ups finishing off screen and trails burning. `npm run check` 2659 tests; CI green. Raised for Shaun: 073.7–073.14; 073.12–073.14 need his call. 071 closed unmerged.

**Next:** "merge 90". Shaun OK'd 073.12–073.14 on 2026-10-28.

**Notes:**
- `npm run measure`: pack fights and the Bulwark match main (the ring 3 stone mean 15.3 s against 15.6 s); there's no Warden measure.
- tutorialFrost.spec.ts's long walk now also clears enemies midway: pack respawn spots drift with the seeded RNG once fights go differently.

## 2026-10-27: 072 Boss return points
**Changed:** on `claude/072-boss-return-points` (InsanityWolfz/Pipeline#86), from the agent-playtest proposals Shaun picked (plan docs/plans/072-boss-return-points.md):
- a return stone stands three tiles west of each boss arena's door (the Bulwark's Forum, the Anvil Hall, the Conductor's hall); it wakes when the player passes within 2.5 tiles from outside, never from inside an arena;
- woken stones join fast travel (claimed pylons first, then stones in the order they woke), and a stone offers "Travel to foundry"; a travel lands on the tile west of the stone, clear of the door's E;
- packs never spawn within 7 tiles of a stone; woken stones survive KOs and saves.

`SAVE_VERSION` 23 (069 takes 22). Reviewed: one blocking finding fixed (the stone was drawn at about twice its size; `ui()` now reports its drawn size and the e2e checks it), plus four suggestions (the spawn margin from 5 to 7 tiles, matching a pylon's safe zone). `npm run check` 2539 tests; CI green. Raised for Shaun: 072.1–072.9; 072.5, 072.7 and 072.9 need his call.

**Next:** Shaun's playtest; his calls on 072.5 (travelling home banks the haul), 072.7 (7-tile margin), 072.9 (a minimap icon); "merge 86".

**Notes:**
- The plan's landing tile (one below the stone) was in the Forum door's E reach; it moved west of the stone.
- The container restarted twice during the build; nothing was lost.
- 2026-10-27: Shaun OK'd 072.5, 072.7 and the rest; 072.9 built on this branch (a woken stone's minimap icon, the pylon's in brass, with a hover line; shot 06); main (069) merged in.

## 2026-10-26: 070 Handling and clarity
**Changed:** on `claude/070-handling-clarity` (InsanityWolfz/Pipeline#84), from the agent-playtest proposals Shaun picked (plan docs/plans/070-handling-clarity.md, six slices):
- hold E to harvest: channels chain while E is held and the player stays in reach; release, a knockback or build mode ends the chain;
- Shift-click crafts as many batches as carried raws afford, with one feed line ("+32 Arrow");
- the empty-tube card names what right click does ("Melee" when nothing carried can fire, or in build mode); empty carried slots grey out;
- a silhouette shows the player behind ruin blocks, trees, the bench and machines (drawn pixels, cached per prop frame);
- a tree is in reach from under its canopy, behind the trunk.

`SAVE_VERSION` unchanged (no shape change; 22 after merging 069). Reviewed: one blocking finding fixed (the silhouette stayed on over a tree cut to a stump), plus five suggestions (build mode ends the chain, a one-batch craft max gets its line, the build-mode card, `reach` to data, a knockback test). `npm run check` 2556 tests; CI green. Raised for Shaun: 070.1–070.9; 070.2, 070.3, 070.5 and 070.6 need his call.

**Next:** Shaun's playtest; his calls on 070.2, 070.3, 070.5, 070.6; "merge 84".

**Notes:**
- `newGameAfterQuit.spec.ts` now polls 20 s for the new game's ticks (070.9): beside landmarks.spec on a busy runner it failed on main too; what it checks is unchanged.
- The silhouette's first version scanned every prop each frame and cost about 40% of the tick rate; it now looks only at nearby buckets and reads pixels only when its key changes.
- Shaun kept 068's balance as is (068.9–068.11), recorded in its spec and docs/brainstorm/2026-10-26-playtest-calls.md.

## 2026-10-26: 069 Factory numbers and tools
**Changed:** on `claude/069-factory-numbers-tools` (InsanityWolfz/Pipeline#83), from the agent-playtest proposals Shaun picked (plan docs/plans/069-factory-numbers-tools.md, eight slices):
- the intake's hover reads each entrance's fill, inflow over the last 5 s and its round's fire rate ("12/30 · in 2.3/s · fires 4/s");
- recipe cards on machine hovers and build-bar tips ("1 wood → 2 shafts · 1.0 s"), numbers from the sim;
- hopper screens move 10 a click (Shift half, Ctrl the stack);
- a Purge menu on an entrance's mouth empties it; a hopper or crate under the cursor keeps E;
- area pick-up fills the inventory first, then the stash;
- a pipette on Q copies a piece (and a stage's round) into the hand;
- the wheel over the world zooms the foundry out to 0.75×.

`SAVE_VERSION` 22 (the rate window and the purge event). Reviewed: two blocking findings fixed (E at a hopper by the intake opened Purge; E didn't close the purge menu), plus five suggestions (unbound keys no longer reset every binding, one stage-round helper, `hudLayout.ts` under 300 lines). `npm run check` 2570 tests; CI green. Raised for Shaun: 069.1–069.11; 069.10 (0.75× or 0.6× zoom) needs his call.

**Next:** Shaun's playtest (`?playtest`, the foundry); his call on 069.10 and OK on the rest; "merge 83".

**Notes:**
- guidedTutorialShots "07 the goal panel" fails on main since 067 (the waypoint reads "edge"); an older spec's shot, not retaken.

## 2026-10-26: 068 Tougher late bosses
**Changed:** on `claude/068-late-boss-buffs` (InsanityWolfz/Pipeline#82), from Shaun's playtest calls (docs/brainstorm/2026-10-26-playtest-calls.md; plan docs/plans/068-late-boss-buffs.md):
- the Forgewright: 6,000 health; heat keeps filling through vents (only a flood resets it); bellows of 300 that patch in 3 s; slam and spray 20% faster;
- the Conductor: 8,000 health; a storm shield blocks every hit on his body while 3 or more rods stand (the plating check, `plated`, covers both bosses); a 30-tick blink-in window where shots pass through him but his rods still take hits; the storm call drops 5 circles.

`SAVE_VERSION` 21 (067 took 20). Reviewed: no blocking findings; four suggestions applied (wrong targets in comments, `enemies.ts` back under 300 lines via `blockPlated`, a lightning round in the shield test). `npm run check` 2512 tests; CI green. Raised for Shaun: 068.1–068.12; 068.9–068.11 are balance calls.

**Next:** Shaun's playtest (the sandbox's boss rooms, or `?playtest`); his calls on 068.9–068.11 and OK on the rest; "merge 82".

**Notes:**
- `npm run measure`, recorded not tuned: the Forgewright's decent bot is KO'd at 213.7 s with 1,209 health left on him (kept-up kill 253.4 s, target 90–120 s); the Conductor with homing bolts breaking rods 206–252 s (target 120–180 s), plain arrows breaking rods 92–135 s, arrows at his body only 0/20 in 360 s; the Bulwark 18.4 s.
- CI's e2e jobs hung twice this session in `playwright install` (no job timeout); a re-run passed both times.
- 064's "Conductor grounded" review shot now times out on the camera settling, likely from fix-playtest-ui's camera lift (068.12).

## 2026-10-26: 067 The foundry after the first boss
**Changed:** on `claude/067-foundry-after-shrine` (InsanityWolfz/Pipeline#81), from Shaun's playtest calls (docs/brainstorm/2026-10-26-playtest-calls.md; plan docs/plans/067-foundry-after-shrine.md, four slices):
- arrows, bombs and ley bolts are hand-crafted from the start, with no attunement; each row shows once its raws have been carried;
- the opening runs gather, hand-craft, clear the ruin field, beat the Warden, claim the shrine; the foundry's stairs stay sealed ("Claim the shrine first") until the claim;
- the tube attunes on the first foundry entry after it, and the first arrow line is built on ghosts fed from the supply ports into the middle entrance; then 058's tutorial runs on, with the frost line moved to the rune's right side (067.3);
- the pre-built example line and the refill goal are gone; docs/prototype.md's player flow is in the new order.

`SAVE_VERSION` 20. Reviewed: one blocking finding fixed (the "Clear the ruin field" goal could never complete on `?playtest`, `?start=field` or `?start=hollows`), plus the dead `gate` objective kind removed and the bomb rows' raws read from one list. `npm run check` 2491 tests; CI green. Raised for Shaun: 067.1–067.16 (067.16 asks whether anything should bank before the claim).

**Next:** Shaun's playtest (a New game for the opening, `?playtest` for the rest); his OK on 067.1–067.16; "merge 81".

**Notes:**
- `src/sim/events.ts` sits at 302 lines; split it the next time it grows.
- 058's and 051's older review shots that show the example line can't be retaken (067.13).

## 2026-10-26: Merged 061–066, two fixes, and an agent playtest
**Changed:** Shaun merged 061, 062, 064, 065 and 066 in stack order (InsanityWolfz/Pipeline#72, #73, #75, #76, #77) and 063 (#74, merged onto them with `SAVE_VERSION` 19). Two fixes merged: the Stormcrown's damage ×8 with "each region steps up more than the last" in design.md (#78), and the inventory leaving build mode plus the KO respawn and camera (#79). Four AI playtester agents played main; their combined report is docs/brainstorm/2026-10-26-agent-playtest.md.

**Next:** Shaun picks which of the report's bugs to fix (a fix batch) and which balance and design calls become specs.

**Notes:**
- The heavy sim tests (exampleLine, emberworks' ring test, the fight harnesses, roads, sim replays) time out at Vitest's 5 s under load; they pass alone. Worth explicit measured budgets.

## 2026-10-26: 063 Blueprints and area pick-up
**Changed:** on `claude/063-blueprints` (InsanityWolfz/Pipeline#74), from Shaun's blueprints interview (docs/brainstorm/2026-10-26-blueprints-interview.md; plan docs/plans/063-blueprints.md):
- the Area tool (X, a Tools group on the build bar): drag a box over whole pieces (never fixtures), then Pick up (contents to the stash), Save blueprint, or both;
- a Blueprint table on the north wall at (18, 0), restored for 4 ancient gears and 2 aqueduct valves, unlocks saving and placing;
- 8 auto-named slots (P opens the list) keeping facings, conduit turns, splitter sides, stage rounds and tunnel links, never contents;
- a ghost that R turns and G mirrors (F is feedback); one click places everything that fits, skipping taken, fixture, wall and locked tiles; the build lock refuses it whole.

`SAVE_VERSION` 15 (061 took 14); 19 once main (061, 062, 064–066) was merged in. Reviewed: three blocking findings fixed (a stamped tunnel pair could form under the wing's wall; the "Not unlocked" hover had no test; the save version collided with 061's), plus eight suggestions. `npm run check` 2076 tests; CI green. Raised for Shaun in the spec: 063.1–063.15. Built alongside 062 in its own worktree.

**Next:** Shaun's playtest (`?playtest`, the sandbox can't reach the foundry); his OK on 063.1–063.15; "merge 74".

**Notes:**
- Main merged in (061, 062, 064–066, then fix-ring5-damage): docs, event lists, sounds and art joined; `SAVE_VERSION` 19. The Tools group still sits over the bar's right end, now above the Forge group, and the Blueprint table at (18, 0) stays clear of the five-cap intake. The clock tests moved to `tests/sim/clock.test.ts` to keep `sim.test.ts` under 300 lines. `npm run check` 2475 tests.

## 2026-10-26: 066 The third tier: stormsteel and storm glass
**Changed:** on `claude/066-stormsteel` (InsanityWolfz/Pipeline#77, stacked on 065; plan docs/plans/066-stormsteel.md, five slices):
- two more tiers in 062's system, `stormsteel` (arrows, bombs, landmines) and `storm-glass` (ley bolts), at `TIER_DAMAGE` 2.56: one breakdown step, applied once per hit, burn and Lightning arcs following the hit; 28 derived rounds with icons and gauge colours;
- the Tempering coil in the Forge group (ley-steel or ley glass + stormglass), every tiered machine's stormsteel variant, mixing and the jam status across three tiers;
- a machine now unlocks once anything it makes is hand-crafted (design.md's rule), so a Steel plate or Steel landmine unlocks the plate press or mine packer;
- three Milestone 3 goals; the coil's crackle and sharper stormsteel shots; crafting-row names kept clear of each other.

`SAVE_VERSION` stays 18 (no shape change). Reviewed: one blocking finding fixed (066.1 now says exactly what the unlock change does, pinned by a test) and seven suggestions. `npm run check` 2419 tests; CI green. Raised for Shaun: 066.1–066.19.

**Next:** Shaun's playtest; his OK on 066.1–066.19; "merge 77" last, after 72, 73, 75 and 76.

**Notes:**
- `npm run measure`: a ring 5 pack clears in 9.2 s with stormsteel against 14.6 s with steel, 20/20, no KOs.
- The whole queue (061–066) is ready to play; the stack merges in order 72 → 73 → 75 → 76 → 77, with 74 (063) independent. Save versions: 061 14, 063 15, 062 16, 064 17, 065 18; merging 063 among them needs its save-version lines resolved.

## 2026-10-26: 065 Stormcrown enemies
**Changed:** on `claude/065-stormcrown-enemies` (InsanityWolfz/Pipeline#76, stacked on 064; plan docs/plans/065-stormcrown-enemies.md, five slices):
- flight (`flight.ts`): fliers cross terrain but never arena walls, safe zones or a shut ring barrier (a full circle), never push walkers, and their drops land on open ground;
- the thunderhawk: orbits, dives down a locked line (061's `laneRun`), climbs away; homing tracks it;
- static mites: trios counting as 3 pack members, a contact zap, a killed mite's discharge chaining through its trio (never the player); a trio drops like one enemy;
- the storm sentinel: keeps its distance, calls 064's strike circles from range, one live circle;
- the gale ram: a cone gust that pushes and slows; the slow is the first player status, on walk and roll distance;
- ring 5's 12 packs once the barrier is down, the Weathervane's guards, champions in 1 in 3 packs.

`SAVE_VERSION` 18. Reviewed: one blocking bug fixed (the Weathervane's guard hawks flew over the shut barrier and one-shot a player in the Emberworks) and six suggestions. `npm run check` 2342 tests; CI green. Raised for Shaun: 065.1–065.25.

**Next:** Shaun's playtest; his OK on 065.1–065.25; "merge 76" after 72, 73 and 75.

**Notes:**
- Balance, for Shaun's call: at ring 5's ×10, every Stormcrown hit but the mite's zap one-shots a decent build (114 HP, armor 10), and even the best defensive gear (~195 HP, 32 armor) survives only the gust. `RING_SCALE` has separate health and damage values, so damage could be lowered while keeping ×10 health.
- `npm run measure`: a ring 5 pack clears in 9.9–19.7 s with steel, 17.2–29.1 s with stone, no KOs (the bot is never hit).

## 2026-10-26: 064 Region 4: the Stormcrown and the Conductor
**Changed:** on `claude/064-stormcrown` (InsanityWolfz/Pipeline#75, stacked on 062), from Shaun's Region 4 interview (docs/brainstorm/2026-10-26-region-4-interview.md; plan docs/plans/064-stormcrown.md, eight slices):
- the world grows to 292 tiles as a pure move (offsets snapshot, and a row-by-row ground fixture);
- the Stormcrown, ring 5 at ×10 (Shaun), region 4 from the barrier, opened by the Forgewright's first kill; no packs until 065;
- stormglass from rods only in the seconds after a strike; the Weathervane's pylon; the Rod Field, the Sky-bridge, a spring, the Crown Spire;
- the Lightning rune: each hit arcs to 2 more enemies within 3 tiles at half damage, one chain per Burst; two Ley-lane talents (Forked Bolt, Long Arc), 23 nodes, level cap 19;
- the Conductor: blinks between six breakable rods (boss parts shared with the Forgewright's bellows), grounded below 2 rods; arc lash, storm call, rod chain; enrage; altar refights;
- the fifth entrance and a five-lane fan; Milestone 3 goals; the end card on the Conductor.

`SAVE_VERSION` 17. Reviewed: two blocking findings fixed (stray older shots; a test budget raised without a baseline: boot measured at 3–4 s on both 062 and 064, so the bigger world doesn't slow loading) and twelve suggestions (the measure bot's reaction delay, homing re-lock narrowed to rounds that locked at launch, nested rod state, tests). `npm run check` 2276 tests; CI green. Raised for Shaun: 064.1–064.29.

**Next:** Shaun's playtest; his OK on 064.1–064.29; "merge 75" after 72 and 73.

**Notes:**
- `npm run measure`: the Conductor falls in about 58 s (20/20, 0 KOs) with homing bolts or plain arrows, against the 90–150 s target, so he likely reads easy. Recorded, not tuned.

## 2026-10-26: 062 Material tiers: ley-steel and ley glass
**Changed:** on `claude/062-material-tiers` (InsanityWolfz/Pipeline#73, stacked on 061), Shaun's material-tier idea (docs/plans/062-material-tiers.md, five slices):
- tiered rounds as a `+` segment after the base (`arrow+steel+frost`), in `src/data/tiers.ts`; steel for arrows, bombs and landmines, glass for ley bolts; ×1.6 on every hit once, through the emission (direct hits, Split Shards, Bursts, Bomblets, mines; burn follows the hit);
- the Smelter (ley-iron + cinderite → ley-steel) and the kiln (ley dust + cinderite → ley glass) in a new Forge group, unlocked by hand-crafting;
- machines run tier variants by input (knapper, shaper, plate press, focuser, assembler, packer, mine packer), never mixing tiers in one craft; a stuck hand-off reads blocked after 1 s;
- three Milestone 2 goals with a new `fired` check; tier icons and looks recoloured from the stone art; the Smelter's and kiln's sounds.

`SAVE_VERSION` 16 (a machine's `stalled` counter; 15 is 063's). Reviewed: no blocking issues; seven suggestions applied. `npm run check` 2155 tests; CI green. Raised for Shaun in the spec: 062.1–062.15.

**Next:** Shaun's playtest (`?playtest`); his OK on 062.1–062.15; "merge 73" after 72.

**Notes:**
- `npm run measure`: steel clears packs in about 67–69% of stone's time in rings 3 and 4 (14.1 → 9.4 s, 8.0 → 5.5 s), no KOs.
- Save versions across the open stack: 061 14, 063 15, 062 16, 064 17.

## 2026-10-26: 061 Emberworks enemies
**Changed:** on `claude/061-emberworks-enemies` (InsanityWolfz/Pipeline#72), the Emberworks fills with four enemies (docs/plans/061-emberworks-enemies.md, five slices):
- the cinder mote: swells and bursts into a fire pool; killed, it bursts and sets other enemies burning;
- the bellows hound: the Charger's lane dash with no wall stun, leaving a burning trail;
- the slag golem: a slam, and two slag whelps on death;
- the kiln-tender: keeps its distance and beams heals onto its most hurt packmate; damage, a blocked line or a Stun breaks it.

Ring 4 keeps 12 packs once the barrier is down, and the Ash Kilns have a guard pack to clear before claiming; champions in 1 in 4 packs. 060's flood pools became shared ground hazards (rect, circle, capsule). `SAVE_VERSION` 14. Reviewed: no blocking issues; seven suggestions applied (one shared lane run for the Charger and hound, a spent mote still spreads its burn, a Stun ends a tender's beam, tests and data tidy-ups). `npm run check` 2084 tests; CI green. Raised for Shaun in the spec: 061.1–061.22.

**Next:** Shaun's playtest; his OK on 061.1–061.22; "merge 72". 062 builds next on its stacked branch, with 063 building alongside and 064–066 queued.

**Notes:**
- `npm run measure`: a ring 4 pack clears in 5.6–11.2 s with 0 KOs against the 15–30 s target, so packs may read easy. Recorded, not tuned.
- The tender's heal scales with ring and champion multipliers like damage (061.4), 24 a second in ring 4.

## 2026-10-23: 060 Region 3: the Emberworks and the Forgewright
**Changed:** Shaun's spoken idea (material tiers: better raws from harder regions, so a build keeps its stages and talents) became a region brainstorm and interview (docs/brainstorm/2026-10-22-region-3.md), split like the Hollows into 060, 061 (its enemies) and 062 (the Smelter, the kiln, steel and glass rounds). 060 is built on `claude/060-emberworks` (InsanityWolfz/Pipeline#70) in eight slices (docs/plans/060-emberworks.md):
- the world grows to 230 tiles (one `WORLD_SHIFT`, nothing moved relative to the centre);
- the Emberworks, ring 4 (×4), behind ramp barriers the Bulwark's first kill drops; no packs until 061;
- cinderite at Cinder Vents that flare open; the Ash Kilns' pylon and a cinderite port; the Slag River, the Outpost Forge and a Ley Spring;
- the Fire rune on every family: a burn that spreads on death, with two Bombs-lane talents (21 nodes, level cap 17);
- the Forgewright in the Anvil Hall: plated until both bellows break, a heat gauge slowed by Chill, the Forge Flood, slam and ember spray, altar refights;
- its core restores the fourth intake entrance;
- the Milestone 2 goals; the end card on the Forgewright; the sandbox's Anvil Hall. `SAVE_VERSION` 13.

Reviewed: no blocking issues; six suggestions applied (the venting tick, no spread onto the plated boss, the region starting at the barrier, tidy-ups). `npm run check` 2021 tests; CI green. Raised for Shaun in the spec: 060.1–060.39.

**Next:** merged by Shaun ("Merge 70 and 71", 2026-10-23, with 060.1–060.39 as built), with the foundry e2e's crate-step fix (InsanityWolfz/Pipeline#71).

**Notes:**
- `npm run measure`: the Forgewright's decent build wins 20/20 in 73.6 s with 0 KOs, taking no damage; the fight draws no randomness, so it may read easy. Recorded, not tuned.
- A container restart mid-build cost nothing: the builder had committed slice 7 and resumed slice 8 from the working tree.

## 2026-10-22: 059 World and arena polish (058 and 059 merged)
**Changed:** on `claude/059-world-polish` (InsanityWolfz/Pipeline#65): paths read as one shape where they cross or join (every road's edge drawn before any road's dirt); small rocks, rubble, ruin stones, pillars and the forum's columns block feet, shots and every sight line only over their drawn base (`src/data/footprints.ts`; 059.5 shots too, Shaun's call); the forum's walls drawn dark; arena enemies, the Warden included, wait until E puts the player through the door; no boss-door descriptions ("Sealed" when shut); the seal hum at half volume; the Grotto's pylon at 30 rimestone a minute. Also merged today: the New game after Quit fix (#66), the diagonal flicker fix (#67), per-branch preview queues (#68).

**Next:** Shaun merged 058 and 059 together ("Merge 64 and 65"); main is ready for the next playtest.

**Notes:**
- `npm run measure`: the Bulwark's decent build meets all three on 16/20 seeds (main 8/20) with 3 KOs against the ≤2 target; the forum's columns now block only their footprints, so it's an easier fight. Recorded, not tuned.
- Two older shot tests fail on main in this container too (bossDoorsShots' Bulwark door, readabilityShots' HP bar); worth a fix-track look.

## 2026-10-22: 058 Guided tutorial
**Changed:** on `claude/058-guided-tutorial` (InsanityWolfz/Pipeline#64), a New game walks the player through the first loop one step at a time: the new goal chain (wait for the tube, equip at the bench with arrows on what to click, fast travel from the shrine's pylon, the refill only if the line ran dry, the right entrance restored, leave the foundry, the Grotto's rimestone and pylon, Reach Stonefall Hollows), with "Press T to spend a talent point" cutting in at the first point. The ley bolt line and the frost rune (with the first underground pair) are built piece by piece on glowing ghosts, with a build-bar arrow on the next piece; building is locked from the first foundry visit until the frost rune step is done. The goals end at three fed entrances, the goal panel and arrows go for good. Recipe unlock banners, the goal panel under the foundry minimap, the waypoint arrow clear of key prompts, the pylon's "Send inventory to stash". `SAVE_VERSION` 12: older saves read as too old. Reviewed: no blocking issues; the suggestions applied (the refill's skip decided only at the fast-travel step, the sandbox agreeing on the right cap, the tutorial e2e split in two). New docs/review/058 shots.

Raised for Shaun (spec "Raised after the build"): 058.8 the bench's arrows (tab, then row: the screen has no equip button), 058.10 the first talent point comes while gathering, 058.15 the refusal hint's words and 1.6 s, 058.17 the prototype counts as complete at "Leave the foundry", 058.18 a long goal under the foundry minimap can reach over the hoppers' arrows. 058.9 answered: no hint for the left entrance.

**Next:** merged by Shaun ("Merge 64 and 65").

## 2026-10-22: Playtest notes and 058 drafted
**Changed:** Shaun's fresh playtest from the title screen is in docs/brainstorm/2026-10-22-playtest-notes.md (verbatim, then grouped into proposed PRs: two fixes, a guided-tutorial spec, a world-polish spec). Shaun dropped shared processing, a bigger foundry and boss gear sets for now, with no note to do them or not.

Shaun confirmed the grouping, moved the build lock to last until the frost arrows run, and answered 058's interview (docs/brainstorm/2026-10-22-tutorial-interview.md). 058 is drafted on `claude/058-guided-tutorial`.

**Next:** Shaun approves 058; the two fixes (the New game crash, the diagonal flicker); the world-polish spec's interview.

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
