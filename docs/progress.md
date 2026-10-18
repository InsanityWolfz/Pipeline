# Progress

Newest entry first.

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
