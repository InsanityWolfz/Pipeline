# Progress

Newest entry first.

## 2026-10-20: 042 built (shippable playtest build)
**Changed:**
- Branch `claude/042-shippable-build`, stacked on `claude/043-arena-lock` (PR #28); draft PR open. Spec status stays `approved`. Plan: docs/plans/042-shippable-build.md.
- The plain URL boots to a painted vector title (the wanderer on a ridge, the ruin and its breathing pipe glow, slow ley motes, the logo with a cyan glow) with New game, Continue, Settings and Quit. A game-flow state machine in `src/render/flow/` owns the screens; the world steps only in play. `?start=…`/`?playtest` skip the title and never touch the save; `?start=tutorial` is the real start without it.
- One save slot, written on every foundry entry (door, fast travel, KO wake): the whole sim state as plain JSON in a versioned envelope (`src/sim/save.ts`, pure). Continue restores it and wakes in the foundry. New game over a save confirms and keeps a backup. Corrupt, newer and too-old saves never crash the game or get overwritten.
- Settings (title or pause): volumes (master × music/effects), Mute, Flashes, key bindings (swap on a used key; hints show the bound key; feedback F, flip G), Export save (save + notes), Import save, Export damaged save. The pause menu is Resume, Settings, Quit to title (with a confirm).
- The camera locks to the player (`CAMERA_LERP` 1). No shake at all (Shaun's change).
- The end card shows 180 ticks after the Bulwark's first kill, once per save; Keep playing resumes free play.
- F writes a feedback note (a textarea over the canvas; typing never reaches the game) with a game-state snapshot; notes go in every export.
- Open questions 042.15–042.28 are in the spec under "Raised after the build" (Esc on flow screens, fixed keys, note details, unworded messages, what Flashes off removes, list items in old saves, and more).
- Checks: `npm run check` passes (1,506 unit tests). The full e2e ran once: 117 passed, 1 failed, 106 skipped (review shots). The failure was hollows.spec.ts: the Bulwark kill now shows the end card, which covered its altar step; the test now closes the card (Keep playing) and passes (3 of 3 in that file). Review shots: docs/review/042 (10 shots).

**Next:**
1. Shaun playtests the preview (https://insanitywolfz.github.io/Pipeline/branch/claude/042-shippable-build/), looks at docs/review/042, and answers 042.15–042.28.
2. On approval: the design.md "Death and tension" line, CLAUDE.md's `flow()` note and the `.claude/rules/sim.md` save-version rule (042's Docs criteria). Then /wrapup merges to `main` only when Shaun says so.

## 2026-10-20: 043 built (arena lock, slower Shardbacks)
**Changed:**
- Branch `claude/043-arena-lock`, stacked on `claude/measure-script` (PR #26); draft PR open. Spec status stays `approved`.
- The Sunken Forum's way in seals with a ley barrier (the Hollows barrier's look) while the Bulwark fights; no feet pass it. E at the seal puts the player just outside and resets the fight at once (full health at its start, adds and bombs gone), and the seal drops. `getState().arenas` and the `arenaLeaves` event report it. A test holds that no spring or pylon safe zone reaches the arena.
- The Shardback's shield turns at 70°/s (043.1). A strafing test lands an unblocked hit every pass (none at 120°/s).
- `npm run measure`: packs all met (ring 3 10.2–17.6 s). The Bulwark target now misses, 13/20 and 3 KOs (was 17/20, 1 KO); the lock alone leaves it at 17/20, so the slower Shardback adds moved it. Recorded as 043.2, not tuned.
- Checks: `npm run check` passes (1,442 unit tests). The full e2e ran once: 102 passed, 1 failed, 104 skipped (review shots). The failure was the new arenaLock.spec.ts waiting only 5 s for the seal's 900 ms fade under load; it now waits for the fade to start, then up to 20 s for it to end, and passed 3 of 3 reruns.

**Next:**
1. Shaun answers 043.2–043.5 (spec, "Raised after the build") and playtests the preview with `?start=hollows`.
2. Then the Stages "0/4 arrows" bug (held on `claude/fix-stages-count`) and 042, each on its own branch.

## 2026-10-20: `npm run measure` (balance targets out of check)
**Changed:**
- Branch `claude/measure-script`, stacked on `claude/session-start-hook` (PR #25). Process rule 4 built: 041's scripted-bot targets (the decent-build Bulwark fight over seeds 1–20, the naive bot, the ring 1–3 pack clears, the four ammo scenarios) run under `npm run measure` (tests/measure, `vitest.measure.config.ts`). It prints per-seed tables and a summary table; a missed target never fails it, a crash does.
- `npm run check` keeps only one-seed, bounded determinism checks of each harness (the decent and naive Bulwark bots, each ring's pack fight, the ammo scenarios); the naive bot's KO is a 041.7 target and runs in measure only (review). The shared fights live in tests/sim/bulwarkBot.ts, packBot.ts and ammoScenarios.ts.
- `npm run check`: about 57 s before; after, Vitest's share drops from 32.5 s to about 26 s, and the whole check takes under a minute (43 s here, 57.9 s in review's run: it varies with machine load). `npm run measure` takes about 13 s; all 7 targets met today, 2 recorded.

**Next:**
1. Shaun reviews the draft PR for `claude/measure-script`.
2. Then, as before: the Stages "0/4 arrows" bug, 043, 042, each on its own branch.

## 2026-10-20: Process reset, 041 closed, catch-up PR for 021–041
**Changed:**
- Reviewed how the 021–041 run drifted: 21 specs on one branch with no PRs, wrapups that never happened, 041 growing to 19 items, ten specs approved on draft at once, a handoff that went stale. Shaun approved a reset; its rules are in docs/process.md, "Keeping the loop small", and in CLAUDE.md.
- 041 is closed as built. 041.18 (arena lock) and 041.19 (slower Shardbacks) moved to their own spec, 043. The 041 fix list in the old handoff was already built in 8eb2780 (the back wave waits out the roar, at most 4 adds, HP 3,800, 15 of 20 seeds asserted, dead bot code removed).
- docs/handoff.md is folded into this entry and removed.
- Opened the catch-up PR from `claude/laughing-volta-uac3nf` into `main` for 021–041.
- Measured on this branch: `npm run check` takes about 50 s (1,430 unit tests; the slowest file is bulwarkFight.test.ts at 11 s), and the full e2e takes 6.5 min (102 tests, all passing).

**Next:**
1. Shaun plays the catch-up preview and says when to merge; then /wrapup marks 021–041 done in one pass.
2. Each of these on its own branch and PR, stacked on the catch-up branch until it merges: `npm run measure` (balance targets out of `check`), the Stages "0/4 arrows" bug, 043, 042.
3. The spec interview from docs/brainstorm/2026-10-20-playtest-notes.md (needs Shaun).

**Notes (carried over from the handoff):**
- **Previews:** https://insanitywolfz.github.io/Pipeline/branch/<branch>/ (add `?playtest` for a full kit, `?start=hollows` for the Bulwark's region). The `main` preview is old until the catch-up merges.
- **Machine load causes false timeouts.** The stop hook runs `npm run check` while e2e runs, so long scenario tests have explicit budgets with a comment giving their idle time. Never raise a timeout to hide a real slowdown; measure against the commit before first.
- **Keep scratch scripts out of tests/.** Use the session scratchpad.
- **Scripted e2e bots** adapt their tactics honestly: no hidden healing, no reading hidden state a player can't see.
- **One stat path.** All stats go through `resolveStat` (src/sim/statResolve.ts); all player-facing rules text comes from the keyword data (039/040).
- **Shaun's preferences:** tell him only what needs him (approvals, decisions, playtests). He likes AskUserQuestion interviews with the recommended option first. Voice-to-text "rants" are saved verbatim in docs/brainstorm/ and processed later.
- **Playtest-notes interview themes** (docs/brainstorm/2026-10-20-playtest-notes.md): a pre-built arrow line as the foundry tutorial example; separate hotbars for the intake and carried items; a Factorio-style grid inventory and hopper screens; stages in the crafting menu (C) instead of the bench; volleys that fan across ammo types and fire together; a resin pylon to automate bombs; more ammo per early resource; a red HP bar; bigger pickup range; an E prompt on ley crystal nodes; on-screen build controls; Wisp aggro range; cache loot visuals; an early Splitter.
- **Later backlog** (docs/brainstorm/2026-10-19-drive-rant.md): horizontal content (biomes, bosses, projectiles, augments, set bonuses), Terraria-style multiplayer (keep the sim deterministic and command-driven), a bigger foundry with more involved processing.

## 2026-10-20: 039–041 and handoff to a new session
**Changed:**
- Built and reviewed 039 (keyword system) and 040 (legibility UI).
- Built most of 041 (balance): the damage numbers, ring scaling, and the Bulwark's enrage, stomp, adds, roll-proof pound and lobs, and back wave (5a5ca26). Tuned at 3,600 HP.
- Screen shake is off entirely (Shaun).
- Specs 041 and 042 were approved on draft from Shaun's interview.
- Saved Shaun's and friends' playtest notes in docs/brainstorm/2026-10-20-playtest-notes.md.

**Next:** see the 2026-10-20 process reset entry above.
1. Finish 041's last round (the fix list, 041.18 arena lock, 041.19 slower Shardbacks).
2. Build 042.
3. Fix the Stages "0/4 arrows" bug.
4. Run the playtest-notes spec interview.

**Notes:**
- A container restart lost the uncommitted 041 work, so builders now commit after each item.
- Run the full e2e once per spec, not twice.
- No broad tuning grid searches.

## 2026-10-19: Keyword audit for the next spec interview
**Changed:** wrote docs/brainstorm/2026-10-19-keyword-audit.md, from Shaun's drive rant (Part 2, themes 12–14). It covers today's keyword inventory, its problems, a v0 glossary (a proposal), a two-layer legibility proposal, and the open questions for the keyword spec interview.

Biggest findings:
- **Overloaded words.** "Burst" means five things and "Shard" seven.
- **No rules text.** Ammo shows none to the player.
- **Talents scope by ammo type, not by keyword.** For example, Wide Casing misses landmines.
- **Pillar 6 blocks Shaun's "bomb set + cluster relic" example,** because gear can't touch offense.
- **Shown numbers don't match the real ones.** Fire rate rounds to whole ticks.

**Next:** the keyword spec interview with Shaun (before or after his playtest, his choice), then the shippable-build specs (title screen, soft save, start-to-finish flow), Bulwark difficulty and the factory changes.

## 2026-10-19: 028–038 built, awaiting Shaun's playtest
**Changed:** built all eleven specs on `claude/laughing-volta-uac3nf` as separate commits:
- 028 foundry flow
- 029 ammo stages
- 030 healing
- 031 HUD and inventory
- 032 landmarks and champions
- 033 research
- 034 Stonefall Hollows and the Bulwark
- 035 Hollows enemies
- 036 equipment
- 037 leveling and talents
- 038 landmines and cluster bombs (its spec was moved out of 034 word for word)

Each had a plan (docs/plans/), tests written first, `npm run check`, two full `npm run test:e2e` runs, review screenshots (docs/review/NNN/), and a reviewer pass with every finding fixed. The final tree has 1,223 unit tests; e2e has 89 passed and the rest skipped (REVIEW_SHOTS only).

**Next:**
1. Shaun playtests 021–038 using docs/review/playtest-021-038.md, then /wrapup.
2. Turn Shaun's drive rant (docs/brainstorm/2026-10-19-drive-rant.md) into the next spec interview. Proposed first: the keyword system audit.

**Notes:**
- The biggest tuning flags are listed in the checklist:
  - the Bulwark is too easy (25 s and no damage taken against a circling bot)
  - frost can't freeze Husks
  - the entrance fire pulse can't be seen
- The "Raised after the build" section in each spec lists the choices made where a spec was silent.
- e2e tests that waited on render tween timing were made independent of machine load in 036.

## 2026-10-19: 028–038 approved; open questions settled
**Changed:**
- **Open questions.** Shaun settled the open questions (docs/brainstorm/2026-10-19-open-questions.md, "Shaun's decisions"):
  - unlimited arrow pierce
  - ley bolt homing and star split can't combine
  - parts pay for research only
  - the highest healing rate wins
  - lobs and mines get past shields
  - schematics reveal once banked
  - relics are their own tier
  - the ammo name stays "Ley bolt"
  - the cache refills after 10 minutes of play
  - every other proposal accepted
- **Specs.** All ten specs (028–037) now have their answers written in and are approved.
- **design.md.** Edited on Shaun's approval, each change tagged with the date and spec number.
- **Backlog.** 038 is landmines and cluster bombs, split out of 034.

**Next:** build 028 → 038 on this branch, one at a time, with plan, tests, verify and review, the same as 021–027.

**Notes:** the prototype.md edits several specs mention are left for each build. 021–027 still await Shaun's playtest.

## 2026-10-19: Content brainstorm, spec interview, draft specs 028–037
**Changed:**
- **Brainstorm.** Ran the content brainstorm with the playtest agent, with no code (docs/brainstorm/2026-10-19-content.md). It came from a full playtest of the 021–027 build and two critique rounds.
- **Interview.** Interviewed Shaun over 11 rounds (docs/brainstorm/2026-10-19-interview.md).
- **Drafts.** Drafted specs 028–037 from his answers and cross-checked them for consistency. All 98 open questions, each with a proposed answer, are in docs/brainstorm/2026-10-19-open-questions.md.
- **Backlog.** The backlog rows 028–037 replace the old 028/029 ideas.

**Next:**
1. Shaun settles the open questions and approves 028–037.
2. Shaun playtests 021–027.
3. Build in order 028 → 037.

**Notes:**
- **Ammo roster:** nets, swords and the flamethrower are cut. The laser is parked.
- **Firing:** one tube; one press fires the volley.
- **Healing:** none in the field; heal at safe spots only.
- **Spec 024 changes again:** each boss core opens one entrance (033), and the volley fires before carried rounds (028).
- **design.md edits:** several specs list design.md edits "on approval". Each needs Shaun's explicit OK.
## 2026-10-19: 021–027 built on one branch, awaiting Shaun's playtest
**Changed:** built all seven approved specs on `claude/laughing-volta-uac3nf`, as separate commits. Shaun approved using one branch, since this cloud session can only push there. Each spec went through a plan (docs/plans/021–027), tests first, `npm run check`, the full `npm run test:e2e`, review screenshots (docs/review/021–027) and an independent reviewer pass. Every review finding was fixed or is listed below for Shaun. The final tree has 636 unit tests; e2e has 52 passed and 14 skipped (the REVIEW_SHOTS-only screenshot tests).
- **021:** pickup reaches 64 px through anything, and items slide in. No shake on firing. A pointer draws above menus on `DEPTHS.cursor`. The arrowhead has no wood.
- **022:** hopper click = 1, Shift = half, Ctrl = all, in and out. Includes a fix for macOS Ctrl+click, which Phaser treats as a right click.
- **023:** a punch when there's no tube or nothing to fire. A `boss` flag on enemies; the Warden is a boss. Dry fire is removed.
- **024:** the gravity stager is removed. There are 3 intake entrances with a 30-round reservoir each. The centre entrance is open at the start; a warden core opens the sides. The volley fans aimed rounds 15° apart and spaces lobbed rounds 24 px. `nextPress()` is the single source for what a press fires. docs/prototype.md is updated to match.
- **025:** the 1/2/3 hotbar is centred along the bottom. The tube slot sits above it at 1.4× and shows the carried round, the volley or a fist.
- **026:** item names in the crafting menu. The build bar is grouped into Logistics, Arrows, Bombs and Ley. Locked pieces stay hidden (Shaun, 2026-10-19).
- **027:** seven foundry steps for the arrow line, with a build-bar pulse, prompts, an intake marker and a "+ part" popup.

**Next:** Shaun playtests the branch preview, then /wrapup 021–027. Meanwhile: the content brainstorm with the playtester (no code), a report, then a long spec interview (Shaun's request, 2026-10-18).

**Notes, for Shaun to confirm or overrule at playtest:**
- **023:** a punch waits out the tube's fire interval after a shot.
- **024:**
  - The volley ignores the selected hotbar ammo; fed entrances fire whatever they hold.
  - E at the intake reaches 40 px, and opening the sides takes priority over nearby hopper or crate menus.
- **025:**
  - Before the tube, the fist slot sits where the tube slot will be.
  - The tube slot stays visible in build mode.
  - The old reservoir glow is gone.
- **026:**
  - Text on rows you can't afford is drawn at 0.8 alpha so it stays readable.
  - Missing inputs are rust-light.
  - In build mode the tube slot rises above the group labels.
- **027:** the scripted tutorial run found the shrine fight harder with an arrow line than with the old ley-bolt line, so it is worth feeling out in the playtest.
- **Known limit:** the crafting menu has no scroll. One more recipe group would need one.

## 2026-10-18: Specs 021–027 from Shaun's playtest notes
**Changed:** turned Shaun's playtest notes into seven draft specs after a three-round interview:
- 021: playtest fixes (2-tile pickup through obstacles, no fire shake, a menu pointer, the arrowhead without wood)
- 022: hopper amounts
- 023: melee
- 024: spread from intake entrances, removing the gravity stager
- 025: the bottom HUD
- 026: crafting labels and build categories
- 027: the foundry tutorial

028 (leveling and the skill tree) and 029 (factory depth) are on the backlog as ideas, to plan together.
**Next:** Shaun reviews and approves 021–027 and answers the two open questions: the per-entrance cap in 024, and which line the tutorial teaches in 027. Then build in the order 021 → 027, and start the 028/029 discussion.
**Notes:**
- Interview decisions are recorded in each spec's design references.
- design.md edits for 023 (melee) and 024 (no stagers) are pre-approved by Shaun, to be made once those specs are approved.
- My defaults, which Shaun can override: melee tuning numbers; the volley fires carried rounds first, then reservoirs, then melee; the volley cooldown is the slowest ammo's; before the tube is picked up, the HUD shows only the fist.

## 2026-10-18: 016–020 wrapped up
**Changed:**
- 016–020 were merged to main (one merge of PR #22, which carried the stack) and the Pages build for main went green.
- At Shaun's request, all five specs and their backlog rows are now done.
- `docs/decisions.md` gains a 016–019 entry beside 020's.
- A new rule, `.claude/rules/tests.md`: e2e waits on state, not time (Shaun approved it after timing mistakes repeated in this run).

**Next:**
- Shaun playtests main and rants.
- The backlog has no approved specs left, so the next run starts with new `/spec` interviews.

## 2026-10-18: 020 Vector pass (unattended build)
**Changed:** built 020 on `claude/020-vector-pass`, stacked on 019, from `docs/plans/020-vector-pass.md`:
- **Fonts:** two bundled OFL fonts (Cinzel, Source Sans 3) replace the glyph fonts.
- **Vector art for everything:**
  - items and emblems
  - conduits and the logistics pieces
  - fixtures and the pylon
  - nine machines with visible mechanisms: idle, jammed and working, in three views
  - the sandstone foundry interior with a warm forge glow
  - a carved stone and brass HUD and menus, with row hover and press feedback
- **Removed:** the pixel pipeline (grids, atlas, `npm run art`, the pixel palette, nearest filtering).
- **Contact sheet:** `/sheet.html`, with screenshots in `docs/review/020/`.

**Tests:**
- Unit tests updated for vector-only assets. A new test checks the pipeline is gone, and another checks the fonts and their licences.
- The smoke test checks the fonts load offline.
- Boot waits for `ui().ready`.
- QA fixes: the status markers no longer cover the piece in front, and the press flash is see-through. The "missing" damage numbers were screenshot timing, not a bug. Review fixes are in.
- `npm run check` (unit tests) and `npm run test:e2e` (39 tests) pass.

**Follow-up (Shaun's answer):**
- Crafting no longer pauses the world.
- Esc opens a pause menu (Sound on/off, Volume, Resume) that stops it.
- An e2e test that only passed by luck (E pressed out of the hopper's reach) now steps into reach first.

**Next:** Shaun kept the floor variety and asked for 016–020 merged to main for a playtest. That ends the 016–020 run.

## 2026-10-18: 019 follow-up: Shaun's answers
**Changed:** on `claude/019-intake-pipe`:
- **The attune cutscene.**
  - The first walk into the foundry holds the player still (sim: no input while `link.attunePulse > 0`).
  - The beats are in `ATTUNE` (`src/data/tube.ts`):
    - the tube's rings light with a growing glow (1 s)
    - the camera pans to the intake pipe
    - the pipe's rings light with the same growing glow, and it turns cyan
    - the camera pans back
  - The render reads the beats from `src/render/attune.ts`.
- **The objective line** is now right-aligned on the right of the screen, below the minimap.
- **The extra wall** above the foundry stays.

**Tests:** the link test for the hold; test kits start the foundry already attuned; e2e `enterFoundry` plays the attune through.

**Next:** the run continues with 020 (vector pass), stacked on 019.

## 2026-10-18: 019 Foundry intake pipe (unattended build)
**Changed:** built 019 on `claude/019-intake-pipe`, stacked on 018, from `docs/plans/019-intake-pipe.md`.
- **The tube socket is gone.** In its place is a fixed waterslide pipe in the centre of the foundry's north wall.
  - Its mouth is three wall tiles, each fed from the floor tile directly below it, and nothing goes in before the tube attunes.
  - Everything fills the one reservoir with the old rules.
  - Stagers facing the mouth make the spread, capped at 3 streams.
- **The look:** it matches the carried tube. Dormant it is grey-cyan; its rings light one by one on attuning. A 10-ring gauge column shows the reservoir, and a ring of light runs up the pipe for each item.
- **Build mode** shows input arrows under the mouth and a fan from each facing stager. Hovering the pipe shows its name and the reservoir count.
- **Framing:** tiled rooms show 48 px more wall above their top row, so the pipe can rise up it (an open question).

Verify: all 536 unit tests and all 39 e2e tests pass. QA screenshots pass on mechanism; its visual fixes are in. Review found three blocking items, all fixed.

**Next:** Shaun answers three framing questions in the 019 spec: the extra wall, the attune off-screen, and the banner over the pipe. The run continues with 020.

## 2026-10-18: 018 Believable resources (unattended build)
**Changed:** built 018 on `claude/018-believable-resources`, stacked on 017, from `docs/plans/018-believable-resources.md`.
- **Every node stands where its material comes from:** trees in sunlit groves, boulders in rock fields, reeds at pond edges, veins on ley lines. A data test checks each placement rule. The shrine site holds one node of each type.
- **Vector nodes:**
  - Each shows its uses left by its shape, then its remains (stump and sapling, pebbles, cut stubs, dark crystal stumps), growing back in three stages.
  - Each type reacts as it's worked.
- **Drops:** Husks ooze amber resin with a slow drip. The Warden's core, a violet heart-stone like its drop (Shaun's call), glows in its chest and pulses through the wind-up.
- **The claimed pylon's harvest, made visible:** a tendril to a node, then a mote along the ley line into the foundry. The pylon, ley lines and supply port describe themselves on hover.
- **Also, at Shaun's call during the run (017):** the wake cap is gone. Anything on screen aggroes; only spawning is capped.

Verify: all 538 unit tests and all 38 e2e tests pass. QA screenshots pass; its seven fixes are in. Review found three blocking items, all fixed.

**Next:** Shaun playtests the preview (`branch/claude/018-believable-resources/`). The run continues with 019, stacked on 018.
**Notes:**
- The e2e helpers' `walkTo` now finds a path over a passable grid from the dev hook, because groves and ponds block straight walks.
- Ground item icons and the HUD font are still pixel art until 020.

## 2026-10-18: 017 Overworld and danger (unattended build)
**Changed:** built 017 on `claude/017-overworld`, stacked on 016, from `docs/plans/017-overworld.md`.
- **One open map.** An 80×45 overworld is generated from a fixed seed: groves, rock fields, ponds, ruin stones, a forest edge and dirt paths. Fixed landmarks sit on top:
  - the start stone in a meadow
  - the foundry as a buried ruin with stairs, in a ruin field
  - the walled shrine site
- **Danger rings:**
  - ring 0, round the foundry, stays calm
  - rings 1 and 2 keep packs alive once the first line fills, with respawns out of view
  - no more than 15 enemies wake within a screen of the player
- **Safe ground.** A claimed pylon makes a 10-tile safe zone.
- **Minimap** in the corner.
- **Shrine and stash.** The shrine's gap is sealed by a ley dome until the first line fills. Claims are by site.
- **Removed:** the old clearing, hall and shrine rooms, and their floors, props and ambience.

Verify: all 514 unit tests and all 36 e2e tests pass.
- The e2e suite was rewritten for the map, plus new tests:
  - minimap markers
  - a ring-2 crowd: 10+ enemies on screen, never more than 15 awake
- QA screenshots pass:
  - **Shortfall it found:** the crowd on screen was below 10, so ring 2 was tuned to 8 packs.
- Review found seven blocking items. All are fixed; the biggest was that the claimed pylon's menu, glow and claim bar didn't work in play.

**Next:** Shaun reviews the draft PR and answers the 017 spec's two open questions: spawn distance, and whether hits wake past the cap. The run continues with 018 on a branch stacked on this one.
**Notes:** see the 017 spec's build notes. QA thought the ruin-field flagstones look flat and the shrine dome faint; both are left for 020's visual pass or Shaun's call.

## 2026-10-18: 016 Art direction (unattended build)
**Changed:** built 016 on `claude/016-art-direction` from `docs/plans/016-art-direction.md`.
- **Vector art:**
  - Typed shape data in `src/data/art/`, drawn into textures at boot.
  - A daylight palette, with the old palette renamed to `PIXEL_PALETTE`.
- **The wanderer:** a rig in three facings, drawn every frame. It braces, leans and kicks while firing, and the tube has dormant, attuning and attuned states.
- **Combat art:** the Husk, Wisp and Warden as baked rigs, plus vector projectiles and effects.
- **Rendering:**
  - The game draws at the device's resolution, with a world camera and a UI camera.
  - The pixel atlas uses nearest filtering.
- **Sim:** firing slows the walk to 0.7×.
- **Docs:** `/sheet.html` is a contact sheet of every vector sprite. `art.md` and `/sprite` are rewritten.

Verify: 491 unit and 34 e2e tests pass.
- QA passed with screenshots. The fixes it led to:
  - clipped death and slam frames
  - the Wisp's charge orb when it faces up
  - bolder hose rings
- Review's three blocking items are fixed, and most of its suggestions are in.

**Next:** Shaun reviews the draft PR and the contact sheet, and playtests the preview. The run continues with 017 on a branch stacked on this one.
**Notes:** see the 016 spec's build notes. Headless rendering is slower at full resolution (software GL), but e2e stays green.

## 2026-10-18: Specs 017–020 (interviews)
**Changed:** interviewed Shaun and wrote four draft specs on `claude/016-art-direction`:
- **017 Overworld and danger:** absorbs the "more enemies" idea, at Shaun's call.
- **018 Believable resources.**
- **019 Foundry intake pipe.**
- **020 Vector pass:** it ends the pixel pipeline.

`docs/design.md` "Combat", Enemies, now says RotMG density, 15 to 20 in a busy fight, every attack still telegraphed. This follows Shaun's answer "RotMG density" to the question of what the rule should become. The backlog is renumbered 016–020.
**Next:** Shaun approved 016–020 ("I approve all") with the enemy cap lowered to 10–15 (design.md and 017 updated). Next they are built, then they are built in order as stacked branches, like the 007–015 overnight run.
**Notes:**
- All tuning numbers in the specs are proposals: pack sizes, respawn delay, safe radius, walk multiplier and ring bounds.
- 019 caps spreads at 3 streams (3-tile mouth, Shaun's pick), down from 4 sides on today's socket.
- 020 bundles two OFL fonts, which are asset files and not an npm dependency (Shaun chose bundled fonts).

## 2026-10-18: Playtest notes and 016 Art direction (spec)
**Changed:** Shaun's playtest notes became backlog items 016–021. On the branch `claude/016-art-direction`:
- **Style test:** 016 started with a style test of one scene in three styles (`docs/art/style-test.html`, https://claude.ai/artifact/J3ssrCe2V7mHMHyVuEnfxx).
- **Shaun's choices:**
  - clean vector style (C), and the environment as shown
  - a rust-cloaked hooded wanderer with a cyan face glow and leather gloves
  - a brass tank for now
  - firing slows the walk
  - scope: the pipeline, the player and combat
- **Docs:** wrote `docs/specs/016-art-direction.md` (status: draft). Updated `docs/design.md` (stack, camera and art) and `docs/prototype.md` (art style, sourcing, tools) from pixel art to vector, with Shaun's explicit approval.

**Next:** Shaun reviews and approves 016, then `/plan`.
**Notes:**
- 017 (more enemies) conflicts with design.md's "few enemies, no hordes"; its spec needs that call first.
- `docs/art.md` is rewritten in the 016 build, not here.
- The style-test numbers are proposals: the 0.7 walk multiplier and the lean and shove amounts.

## 2026-10-18: 007–015 merged
**Changed:** Shaun said "Merge all". Specs 007–015 are marked done in their specs and in `docs/backlog.md`, and their technical choices are in `docs/decisions.md`. The stacked PRs #9–#17 are merged top down, each into the branch below it and #9 into main.
**Next:** Shaun's playtest notes on main, then the next spec. Carried over from 014: the rest of the sprite redraws (walk, enemies, machines, icons, HUD frame), the pause title card, menu hover sounds, squash on pickups, and the HUD covering the hall's west door.
**Notes:** the sorter sprite, the 014 art and the build-bar descriptions are first drafts for Shaun to revise.

## 2026-10-18: 015 Fixes after the overnight run (build)
**Changed:** built 015 on `claude/015-after-overnight` (stacked on 014). Shaun approved the spec and asked me to carry it through on my own.
- **Sorter:**
  - It's a new piece: free, unlocked from the start, and second on the build bar.
  - It takes items from its back. Its chosen item leaves by its right side (left after F), and everything else goes out the front. A blocked exit stalls it.
  - E opens a picker (Clear plus every item), which sends the new `setFilter` command.
  - It's walkable, like a conduit.
- **No wasted ammo:**
  - The tube doesn't fire in the foundry. This is a sim rule.
  - A press that starts on any UI never fires.
- **Camera:** the lead toward the aim is gone.
- **Hover:**
  - Names on mouse-over for everything in the world.
  - A name and description panel on the build bar.
  - The hook gains `ui()`.

Verify: 473 unit and 32 e2e tests pass. QA confirmed:
- The sorter chain splits the supply port: wood 6, stone 5, and fiber plus ley crystal 10.
- F, the picker, every description and every world name work.
- There's no fire in the foundry, and the camera stays centred.

QA's three failures are fixed: the green sort arrow, a name on its readout at the top wall, and HUD parts that still fired. Review's blocking items are fixed: the "Clear" label, a real front-and-side split through the picker in e2e, and a test of a UI press dragged into the world. Most suggestions are in too:
- `setFilter` validation
- more sorter tests
- walkable sorters
- shared sort-side logic
- data constants
- glyph coverage for world names
- `controls.ts` back under 300 lines

**Next:** Shaun playtests 015 (the preview for `claude/015-after-overnight`, with `?playtest`) and reviews the sorter sprites. Then he decides merges for #9–#17.
**Notes:** see the 015 spec's build notes. The open calls are walkable sorters, the art, and the description wording.

## 2026-10-18: 015 Fixes after the overnight run (spec)
**Changed:** interviewed Shaun after his look at 007–014 and wrote `docs/specs/015-after-overnight.md` (status: draft) on `claude/015-after-overnight` (stacked on 014).
- **Sorter:** a free sorter piece splits one chosen item off a line. E opens a picker to set the item. It leaves by the right side, and F mirrors that to the left. A blocked exit stalls the sorter.
- **Firing:** no firing in the foundry, and never from a menu click.
- **Camera:** the camera lead while shooting is removed.
- **Hover:** names on mouse-over for everything in the world, and descriptions on the build bar.
- **Gear:** stays at the bench as it is.

**Next:** Shaun reviews and approves the spec, then `/plan`.
**Notes:** Shaun first asked what happens to gear once it's worn. It's managed only at the bench menu: clicking the worn piece takes it off, and the HUD shows its icon and value. He's happy with that.

## 2026-10-18: 014 Look and feel (overnight build)
**Changed:** built 014 on `claude/014-look-and-feel` (stacked on 013).
- **Rooms:** floor variants by tile hash, 3/4-view walls (face over floor, lit top over wall), shaped corners in every room, and props as data. Columns and rune stones stand on ruin blocks; banners, vines and braziers stand on wall faces; cracks, rubble, tufts and mushrooms lie on the floor.
- **Light and air:** pooled ley glow on veins, crystals, cracks, rune stones, braziers, conduit items, the socket, the claimed pylon and the attuned tube. Motes everywhere, fireflies in the clearing, and a dusk tint and vignette per room.
- **Juice:** shake by size, a per-enemy hit-stop, outlined damage numbers that stack, and pixel particles (sparks by damage type, death motes, embers, dust, chips, puffs, refill shimmer, pickups). Placed pieces drop in, and the camera leads the aim while firing.
- **Sound:** `npm run sound` synthesizes 32 WAVs with no new dependency. Effects play off events and state changes, and room loops crossfade. M mutes and [ ] set the volume (both saved). It's muted under test.
- **Art:** floor variants, wall tops and lips, 9 props, and the player's breathing idle, all pending review.

Verify: 445 unit and 30 e2e tests pass. QA passed 6 of 9 checks with notes; the floor lattice, foundry shape, stacked numbers, weak embers and faint brazier glow are fixed. Review: the blocking items are fixed, covering white enemy numbers, sparks by damage type, keys and tuning moved into data, and data reference tests. The not-built items are listed in the spec's build notes.
**Next:** Shaun reviews the morning report, playtests, and decides merges for #9–#16.
**Notes:** see the 014 spec's build notes. The rest of the spec's sprite redraws (walk, enemies, machines, icons, HUD frame, title card) and menu hover sounds are not done, and are listed there.

## 2026-10-18: 013 Conduit corners (overnight build)
**Changed:** built 013 on `claude/013-conduit-corners` (stacked on 012).
- **Shape:** conduits have an `inFrom` side and take items only from it. A straight conduit takes from its back, a corner from one side.
- **Auto-join:** a single conduit placed beside a lone side feeder (a piece's front, or the supply port) becomes a corner from it. Neighbours never change.
- **Drags:** a drag that turns lays a corner at the turn. Drag logic is in pure `src/render/dragPath.ts`.
- **Render:** 8 corner sprites (pending review), items ride the bend on an L path, a gold input arrow on each conduit's `inFrom` edge in build mode, and the ghost previews corners.
- **Hook:** the conduit summary has `inFrom`.

Verify: 424 unit and 30 e2e tests pass. QA passed L, U and zig-zag runs, item paths, arrows and the auto-join ghost. Review and QA both caught the ghost being wrong mid-drag; it's fixed (it now shows the held tile).
**Next:** 014 Look and feel on `claude/014-look-and-feel`.
**Notes:** see the 013 spec's build notes. The biggest call is that a drag's first tile faces the drag, not the ghost. Side feeds into straight conduits are now refused.

## 2026-10-18: 012 Tutorial flow (overnight build)
**Changed:** built 012 on `claude/012-tutorial-flow` (stacked on 011).
- **The clearing:** a new room where the real game starts. You wake with nothing; the dormant tube lies on a stone and E takes it.
- **Soft gates:**
  - rubble on the foundry door until the hall's pack is dead
  - bomb and ley bolt recipes hidden until the tube attunes
  - a ley barrier on the shrine door until the first line fills the tube
- **Objectives:** 12, shown as one line at the top centre in the new font, completing in any order, ending in `prototypeComplete`.
- **Prompts:** floating key prompts (E, C, B).
- **Starts:** three of them: tutorial (default), `?playtest`, and `?start=hall` (the sandbox the tests use).
- **End-to-end test:** a full scripted run through every beat from a fresh start, `tests/e2e/tutorial.spec.ts`.

Verify: 399 unit and 30 e2e tests pass.
**Next:** 013 on `claude/013-conduit-corners`. QA (all 7 pass) and review fixes are in: KO before the foundry opens wakes in the clearing; prompts dim until usable; objective line on a dark band; hopper prompt; harvest unaffected by fire without the tube.
**Notes:** see the 012 spec's build notes. The spread objective needs one stager, because only one warden core exists.

## 2026-10-18: 011 Death (overnight build)
**Changed:** built 011 on `claude/011-death` (stacked on 010).
- **Banking:** entering the foundry banks what you carry, and so does a pylon deposit.
- **Dying:** at 0 health a 60-tick death plays, with no input and no hits, and enemies give up. Then you wake in the foundry at full health.
- **What you keep:** the banked counts of what you still carry. The rest is lost and listed in a centred "You wake in the foundry / Lost ..." text.
- **What stays the same:** unclaimed rooms reset. The factory, reservoir, stash, claims and armor all stay.
- **Effects:** a death animation and a bank swirl.

Verify: 382 unit and 28 e2e tests pass.
**Next:** QA and review, then 012.
**Notes:** a KO no longer refills the start inventory, including `?playtest`; the start itself counts as banked. Old KO tests were updated to wake in the foundry.

## 2026-10-18: 010 Armor (overnight build)
**Changed:** built 010 on `claude/010-armor` (stacked on 009).
- Enemies drop unidentified armor; the first Husk ever killed always drops a piece.
- The identification bench (a foundry fixture at tile 1,12) identifies carried pieces for free, as light (2-4 armor) or heavy (5-8 armor, 85% walk speed), each with a name.
- One piece can be worn. Each hit loses its armor value, never below 1.
- The HUD shows the worn piece, and the body is tinted by weight.
- Added a 3×5 letter font (`hud-letters`). Menu rows now have text: "Send haul home", "Take all", "Identify all", piece names.

Verify: 373 unit and 27 e2e tests pass, and QA passes all 5 items. Review: resolved its blocking items. The hook uses the spec's names. Piece names show via the new font. The 50/50 roll moved to data. The rest are logged as build notes in the spec. I also took several suggestions: an unknown equip id is a no-op, the armor types are shared, the explicit event-key test is back, and `controls.ts` was split.
**Next:** 011 Death on `claude/011-death`.
**Notes:** see the 010 spec's build notes, especially that unidentified armor is a counted item.

## 2026-10-18: 009 Claiming (overnight build)
**Changed:** built 009 on `claude/009-claiming` (stacked on 008).
- A new shrine room through the hall's top door, with 3 Wisps (kite and cast slow orbs), 2 Husks and the Pylon Warden (a slam circle, then a recover window).
- Enemy defs are a union by attack kind, with the AI split per kind.
- Clear the shrine and hold E at its pylon to claim it for good.
- A claim adds the foundry's supply port (wood, stone, fiber, ley crystal in turn, 1 every 2 s) and a waystone.
- The claimed pylon sends the haul to a stash chest by the foundry door, or travels home.

Verify: 363 unit and 26 e2e tests pass. QA found the missing deposit swirl and a knife-edge pylon reach (both fixed), and the stash menu overflowing (it now wraps into columns). Review: fixed 4 blocking issues (the swirl, the Warden recover sprite, a port off-by-one, and missing tests) and most suggestions.
**Next:** 010 Armor on `claude/010-armor`.
**Notes:** see the build notes in the 009 spec. Art issues left for 014: the shrine floor repeats, doors on top and bottom walls, and the shrine door hides under the hotbar.

## 2026-10-18: 008 Spread (overnight build)
**Changed:** built 008 on `claude/008-spread` (stacked on 007) from `docs/plans/008-spread.md`. A gravity stager costs a warden core (refunded on pick-up). It passes items like a conduit and adds a stream when it faces the tube socket; E or a build-mode click turns it through -30..+30. A reservoir shot fires one projectile per stream. Build mode shows the spread fan, and every shot gets a muzzle flash. Verify: 327 unit and 25 e2e tests pass. QA found that the muzzle flash never reached render (fixed). Review: fixed 3 blocking issues (a determinism test, a stacked-shot test, a magic number) and most suggestions.
**Next:** 009 Claiming on `claude/009-claiming`.
**Notes:** the build-mode fan always points up, not along the aim (my call). The needle tilt at ±15 is subtle. The stager reads more like a glass dome than a stone ring; Shaun's art review will decide.

## 2026-10-18: 007 Tube link (overnight build)
**Changed:** built 007 on `claude/cool-thompson-dxlx4b` from `docs/plans/007-tube-link.md`. The tube attunes on the first foundry entry. One `tube-socket` (unlocked by attuning) fills a reservoir (cap 30) from a line. Hand-loading and R are gone, so carried ammo fires first, then the reservoir, with a cyan hotbar. `?playtest` gives a boosted start. Verify: 309 unit and 24 e2e tests pass, and the qa screenshots pass. Review: fixed the one blocking issue (data tests) and most suggestions. Draft PR InsanityWolfz/Pipeline#9.
**Next:** 008, stacked on this branch (`claude/008-spread`).
**Notes:** sprites are pending Shaun's 4× review. An empty socket's readout shows the socket emblem with 0/30 (my call). A full ley bolt line refills as fast as the tube fires, which is a feel question.

## 2026-10-18: 007 Tube link spec
**Changed:** interviewed Shaun and wrote `docs/specs/007-tube-link.md` (status: draft). Decisions:
- The tube attunes on the first foundry entry.
- A new 1×1 `tube-socket` piece (one allowed, unlocked by attuning) fills a single reservoir (cap 30) and refuses items when full, so the line backs up.
- Hand-loading and R are removed. Carried ammo fires first, then the reservoir, and the hotbar glows cyan and shows the reservoir count.
- There is one reservoir for the one supply slot, not one per ammo type. Later slots may repeat an ammo.
- The reservoir and attunement survive a KO.
- Playtest request: a `?playtest` URL flag starts with 99 of each ammo and raw, 20 of each part, and every machine unlocked.
**Next:** Shaun reviews and approves the spec, then `/plan`.
**Notes:** the numbers are starting values. Existing e2e tests that hand-load will need updating in the build.

## 2026-10-18: 006 Foundry building (build)
**Changed:** built 006 on `claude/sweet-planck-6lb10l`, following `docs/plans/006-foundry-building.md`.
- **Sim:** rooms as tags on every entity, with all rooms ticking; doors and the doorway step; foundry pieces, placement and unlocks; two-phase item flow (conduits, machines with direct hand-off, hoppers, crates, statuses); E and deposits; build mode; KO keeps the foundry.
- **Data:** the `foundry` room and doors, `pieces.ts`, `foundry.ts`, `foundryAssets.ts`, build bar, picker and readout layouts.
- **Render:** `RoomView` with the door fade, `FoundryView`, `BuildView` (bar and ghost), `HoverReadout`, `HopperPicker`, and build controls (B, R, click, right-click, drag, wheel, Esc).
- **Art:** housings, conduits, hoppers, crate, doorway, status markers and logistics icons. After Shaun's first look, machines show the item they make and wood is a side-on log.

Shaun approved the revised sprites in chat. Verify: the qa agent's screenshots pass every criterion; fixed the build-bar click race, readout clipping, the crate count position and the picker panel. Review: fixed all 3 blocking issues (3×1 front side refusing items, gaps in fast conduit drags, the door fade constant moved to data) and most suggestions. Verify rerun green: 287 unit tests and 21 e2e tests.
Playtest 1: Shaun's line didn't run. The pieces faced down into empty tiles while the conduits ran up, which a sim test confirmed. Build mode now shows a facing arrow on every piece and on the ghost.
Then: gold input arrows on every side that takes items (crates: all four, hoppers: none), crates take from every side as specced, and backlog 013 (conduit corners) added at Shaun's request. Then the hopper menu: E on a filled hopper offers to take it out or put more in (`withdraw` command). Spec lines updated as playtest changes. 295 unit tests and 21 e2e tests pass.
Shaun confirmed the playtest and approved the arrow sprites ("looks good lets move on").
**Next:** merge the 006 PR when Shaun says so, then `/spec 007` (tube link).
**Notes:** see the 006 entry in decisions.md. The prettier slip is logged there too: don't run formatters the repo doesn't use.

## 2026-10-18: Body follows the aim (fix)
**Changed:** `PlayerView` now picks the body's animation and flip from the aim direction when not rolling, matching the tube, so the idle and walk poses no longer face away from the tube. `npm run check` and 18 e2e tests pass.
**Next:** Shaun playtests the fix on the preview.
**Notes:** sim facing is unchanged; see decisions.md.

## 2026-10-18: 006 Foundry building spec
**Changed:** interviewed Shaun and wrote `docs/specs/006-foundry-building.md` (status: draft). Decisions: a separate foundry room through a doorway (fade), conduits carry items, input hoppers (one item type each, picked from held raws) and output crates (emptied with E), all nine machines for the three chains, free placement, unlock by hand-crafting once, assembler and packer 2×2, B build mode with R rotate and click place/pick up anywhere on the foundry floor, wrong items stall conduits, the foundry ticks while the player is away and survives a KO, working/starved/blocked markers with hover buffers.
**Next:** Shaun answered the open questions (direct machine hand-off, 3×1 combiners, raw-only hoppers, walkable conduits); then hoppers take any item and can feed a machine directly. Approved in chat; plan written and approved (`docs/plans/006-foundry-building.md`). Next is `/build`.
**Notes:** tuning values are starting points.

## 2026-10-18: 005 Hand crafting
**Changed:** built 005 on `claude/005-hand-crafting`, following `docs/plans/005-hand-crafting.md`.
- **Sim:** solid nodes with regrow (`nodes.ts`, obstacle rects in `collision.ts`); E harvesting (`harvest.ts`); crafting between ticks and the crafted set (`crafting.ts`); ammo select on 1–3 (`tube.ts`); piercing ley bolts (`combat.ts`); bombs, bursts and burns (`bombs.ts`, `burn.ts`); KO resets nodes, bombs, the harvest and the selection, and keeps the crafted set.
- **Data:** item kinds and 9 new items, the 9 recipes and menu groups, the 4 nodes and 11 placements in `ruin-hall`, the ammo union with ley bolt and bomb, `SLOT_AMMOS`.
- **Render:** nodes and the harvest bar, bombs on their arc, fire bursts, burn flames, the ammo strip, the C menu (pauses, click to craft, greyed rows), E, 1–3, C and Esc controls; `__GAME__.craft()`.
- **Art:** 9 item icons, 4 nodes (full and depleted), bomb and ley bolt with shadows, fire burst, burn flame, menu panel and rows, ammo strip cells. Drawn by hand (icons) and by a scratch shape script (nodes, burst, frames), committed as grids.

220 unit tests and 18 e2e tests pass.

**Verify:** `npm run check` (220) and `npm run test:e2e` (18) pass. The qa agent passed every visible criterion with screenshots (nodes full, depleted and regrown, the harvest bar, the menu with greyed rows, hotbar and strip per ammo, a bomb mid-arc, the burst, a burning Husk, a bolt through a Husk, parts in the HUD column) and saw no console errors. Its notes for Shaun's sprite review: fuse vs shaft, ley shard vs ley bolt, and casing vs bomb look alike, especially greyed; the menu panel reads as plain rather than rune-carved; the material column has no backing.

**Review:** the reviewer found five blocking issues. One was already met: per-ammo fire intervals are tested in `tube.test.ts`. One is Shaun's call: sprite approval. The other three are fixed:
- Ley bolt hits now assert knockback, flash and aggro on both Husks.
- Burst aggro is tested on an idle Husk with bombs stepped alone.
- The e2e now scripts a real two-Husk pierce (it fires only when the farther Husk is on the bolt's line) and a kill by burn tick.

Also fixed, from its suggestions:
- Tests for a bolt stopping at a wall, and for bolts and bombs passing over nodes.
- Removed dead `boxHitsSolid` obstacles and `GlyphLine.destroy`, and stopped `craft` and drops duplicating `canCraft` and `overlapsRect`.
- Named the icon size and flame depth nudge, and the starting slot icon now comes from `STARTING_AMMO`.
- The number keys follow `SLOT_AMMOS` (up to 4).
- Menu and strip layouts moved to `src/data/hudLayout.ts`, so `assets.ts` is under 300 lines.
- `tileCentre` moved to `src/sim/tiles.ts` to break the nodes/state import cycle.
- Switching ammo no longer writes a 0 into the inventory.

Re-verify: 223 unit and 18 e2e tests pass; qa re-checked real 1–3, C/Esc, E and the harvest bar with no regressions.

**Art revision:** at Shaun's request, fuse (a wound cord bundle), ley shard (crystal chunks), ley bolt (a head on a glow trail), casing (an open shell) and bomb (a dark ball with an ember band) were redrawn so the look-alike pairs differ in shape.

**Wrapup:** Shaun ran `/wrapup`, confirming the playtest. That accepts the sprites and the build choices listed in the spec's build notes. 005 is done; the PR into main is open, waiting for Shaun to say merge.

**Next:** Shaun merges the 005 PR when ready, then `/spec 006` (foundry building: grid placement of machines with facing, items moving between them, one working ammo line). The crafted set in `SimState.crafted` is ready for 006's machine unlocks.

**Notes:**
- No mistake happened twice this slice, so no new rule.
- Left from review: the real E and 1–3 keys are covered by a qa check, not an e2e test, since `step()` takes the clock from real-time input.
- The qa notes still open: the menu panel reads as plain rather than rune-carved, the material column has no backing panel, and the harvest bar draws over the player when they stand above the node.

**Notes:**
- Build choices beyond the plan:
  - Key presses now latch from the keys' down events (a tap shorter than a frame was lost before, for every key).
  - The menu works under the test hook's clock.
  - The crosshair draws above the menu and serves as its pointer.
  - Burn ticks deal damage without a flash; only the burst flashes.
- The e2e bolt check asserts a hit, not a two-Husk pierce, since lining up two Husks in real play is luck. The sim tests cover piercing.

## 2026-10-18: 005 Hand crafting spec
**Changed:** interviewed Shaun and wrote `docs/specs/005-hand-crafting.md` (status: draft). Decisions: harvest nodes (tree, rubble, reeds, ley vein) with E, 3 uses then a 30 s regrow; hand-craft the parts of each chain, then the ammo; the C menu pauses the world and crafts on click; keys 1–3 pick the one slot's ammo and switching returns loaded rounds; bombs arc to the cursor, burst and burn (no spread, no self damage); ley bolts are physical and pierce without limit; the grinder makes one part, ley shards, for both bombs and bolts; all recipes open from the start; the sim records hand-crafted items for 006; the start kit stays 30 arrows.
**Next:** Shaun approved the spec as written (2026-10-18), proposals and tuning included. The plan is approved too and saved as `docs/plans/005-hand-crafting.md`. Next is `/build`.
**Notes:** all numbers in the spec are Claude's proposals, not interview answers. The ammo strip beside the hotbar and nodes being solid while projectiles pass over them are also proposals to check at approval.

## 2026-10-18: 004 Enemies
**Changed:** specced, planned (`docs/plans/004-enemies.md`) and built 004 on `claude/004-enemies`.
- **Sim:**
  - Player health with knockback, hit invulnerability and a hit that stops loading (`health.ts`, `knockback.ts`).
  - Husks with RotMG-style aggro, leash, wind-up, swipe and recover (`enemies.ts`, `huskAi.ts`).
  - Arrow hits, knockback and death (`combat.ts`).
  - Seeded drops and walk-over pickup (`drops.ts`).
  - The placeholder KO (`resetRoom()` in `state.ts`).
  - Per-tick `events`, all reported by `getState()`.
- **Data:** Husk tuning and its drop table, room enemy placements, player health values, four materials, and a `DEPTHS` table plus render layout values in `assets.ts`.
- **Render:**
  - Husk poses, hit flash, health bar and the swipe telegraph on the ground.
  - Ground items, corpses, the pickup sparkle and "+1 [icon]" popup.
  - The KO fade.
  - The player's white hit flash.
  - The HUD health bar and material column.
- **Art:** the Husk, four materials, item shadow, pickup sparkle, player hit poses, HUD health frame and the `+` glyph.

Shaun approved the sprites by eye and playtested the preview: it's good. 153 unit tests and 14 e2e tests pass, and the qa screenshots passed. Review found one blocking issue: the player only flickered, but the spec says they flash white. It's fixed.

**Next:** Shaun merges the 004 PR when ready, then `/spec 005` (hand crafting: gather wood, stone, fiber and ley crystal; craft the three beginner ammo types).

**Notes:**
- Build choices beyond the spec, accepted in the playtest:
  - A 6-tick `swipe` pose.
  - A chasing Husk holds still in range while its cooldown runs.
  - One 16×16 sprite per material serves as both its ground sprite and HUD icon.
  - Arrows hit the Husk they reached first when hurtboxes overlap.
  - On a KO the camera holds while the screen darkens, then jumps to spawn.
- With the specced timings a swipe cycle is 66 ticks, so the 60-tick cooldown never binds. It matters only if recover is tuned shorter.
- The KO flag and the room reset share one tick.
- The Husk grids came from a scratch shape script (auto outline and shading) that isn't committed. Revise them by hand.
- The aggro model comes from the open-source RotMG server behaviours `Follow` and `StayCloseToSpawn`.
- The 003 depth-constant suggestion is done (`DEPTHS`).
- Still open from the reviewer's suggestions:
  - The KO flag could be set a tick before the reset.
  - Hit events are recorded but nothing draws them yet.
- No mistake happened twice this slice, so no new rule.

## 2026-10-17: 003 Tube firing
**Changed:** built 003 on `claude/003-tube-firing`.
- **Sim:** inventory; the tube (tap R loads one round per 15 ticks into 6, hold left mouse fires at 4 shots/s, empty tube dry-fires, no firing or loading in a roll); arrows at 480 px/s that stop at walls or after 320 px.
- **Data:** the arrow item and ammo, tube tuning, a starting stack of 30.
- **Render:** mouse aim, the tube held toward the aim, firing poses, arrows over ground shadows, a one-slot HUD with a sprite digit font, the crosshair.

Shaun approved the sprites by eye and playtested the preview: it's good. 89 unit tests and 8 e2e tests pass; review found no blocking issues.

**Next:** Shaun merges the 003 PR when ready, then `/spec 004` (enemies: the Husk, health, damage, death, drops).

**Notes:**
- Arrow damage 10 is a placeholder for 004 to tune. Arrows already carry damage and type.
- When not firing, the tube points at the cursor while the body faces the walk direction (per spec). It passed the playtest, but revisit it if it reads oddly once enemies exist.
- `NO_COMMAND` aims at the world origin. Code that steps the sim without an aim moves the tube's draw direction; the test hook avoids this by keeping the last aim.
- The reviewer's unaddressed suggestion: render depth constants (`FLOOR_DEPTH`, `SHADOW_DEPTH`, `TUBE_DEPTH_NUDGE`, `HUD_DEPTH`) could move into one table in `src/data`. Done in 004 (`DEPTHS`).
- No mistake happened twice this slice, so no new rule.

## 2026-10-17: 002 Movement
**Changed:** built 002 on `claude/002-movement`: walk, roll and feet-box collision in `src/sim`, movement tuning and the `ruin-hall` room in `src/data`, keyboard commands, room and player views, clamped camera and the `?view=` / V toggle in `src/render`; `__GAME__.step(frames, command)` and `setView()`. Sprites for both views drawn and approved by Shaun. Verify (check, e2e, qa screenshots) green; review addressed. Shaun playtested the preview: everything feels fine, and **three-quarter view wins**. Then, at Shaun's request, a cleanup removed the straight-down view, its sprites, `?view=`, V and `__GAME__.setView()`. 60 unit tests and 4 e2e tests pass.
**Next:** `/spec 003` (tube firing).
**Notes:**
- Shaun asked (in chat) that every reply end with what's needed from Shaun next; it's now a line in CLAUDE.md, committed on this branch.
- Chosen in the build, not by the spec, and accepted in the playtest: after a roll the player keeps walk speed in the roll direction (drifts ~5 px when no key is held); sliding diagonally along a wall runs at ~71% of walk speed; diagonals show the side sprite.
- CLAUDE.md's hook line now lists `step(frames, command?)`.
- `src/data/assets.ts` must stay import-free: `npm run art` loads it with Node's type stripping, which can't resolve extensionless imports.

## 2026-10-17: 002 Movement spec
**Changed:** interviewed Shaun and wrote `docs/specs/002-movement.md` (status: draft). Decisions: i-frame roll on Space in the move direction (facing when still), committed, with cooldown; snappy 8-way walk; 40×30 walled room with ruin blocks as data; smooth clamped camera; both three-quarter and straight-down views with `?view=` and a V toggle, each with its own sprite set.
**Next:** Shaun reviews and approves the spec, then `/plan`.
**Notes:** tuning values in the spec are starting points for playtest.

## 2026-10-17: 001 Scaffold
**Changed:** seeded RNG, fixed 60 Hz clock and plain-data sim state in `src/sim`; integer-zoom 640×360 render of a tiled floor with the ley crystal; `window.__GAME__` (dev only) with `getState()`/`step()`; Playwright smoke test; art pipeline (`npm run art`), `docs/art.md` and the 24-color dusk-ruins palette. Shaun approved the palette and both sprites by eye and played the Pages preview. 31 unit tests and the smoke test pass.
**Next:** `/spec 002` (movement). That interview is the place to settle the three-quarter vs straight-down camera test and how the dodge works.
**Notes:**
- Tests that use the hook should call `step(0)` first: it takes the sim off the real-time loop so nothing ticks between reads.
- After editing a sprite, run `npm run art`; `npm run check` fails if the committed atlas is stale.
- Only one floor tile exists, so the repeat is visible. Floor variants are worth adding with the first real map.
- The reviewer's unaddressed suggestions (single stepping entry point, local prod-build check, `nextInt` used only by tests) are small; pick them up when those files are next touched.

## 2026-10-17: Bootstrap
**Changed:** scaffolded Phaser 4 + TypeScript + Vite with an empty boot scene; added CLAUDE.md, .claude rules, commands, agents, hooks and settings; copied Phaser's skills; added the Pages preview workflow; created backlog, decisions and this log. `npm run check` passes.
**Next:** merge the bootstrap PR, then Shaun selects `gh-pages` / root in Settings → Pages. Then `/spec 001`.
**Notes:** process.md was updated before bootstrap (InsanityWolfz/Pipeline#1): PR-based wrapup, Pages previews, Node hooks.
