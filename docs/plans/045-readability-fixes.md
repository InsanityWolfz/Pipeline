# Plan 045: Readability fixes

Spec: docs/specs/045-readability-fixes.md (approved on draft: 045.1 and 045.2's proposals are built). Branch `claude/045-readability`, from `main`. Seven small slices, each tests first and its own commit.

## Slices

### 1. A red HP bar (note 2)
- **Data** `src/data/hudPanels.ts`: `HUD_HEALTH_LAYOUT.fillColor` `leaf` → `danger` (the palette's red, #e8322f). The low colour (`hit-red`), the pulse and the low-HP edges are unchanged.
- **Test first** `tests/data/hud.test.ts`: the fill is `danger`, a palette red, and differs from the low colour.

### 2. Wisps wake on screen (note 13)
- **Data** `src/data/enemies.ts`: `CasterDef.cast.wake: 'screen' | 'range'`; the Wisp's is `'screen'`.
- **Sim** `src/sim/casterAi.ts`: a Wisp sees the player when it is on screen (017's `inAggroBox`), or within `aggroRange` for `'range'`. Once awake it still closes to `aggroRange` before keeping its distance and casting.
- **Test first** `tests/sim/wisp.test.ts`: a Wisp at the screen's left or right edge (inside the view's half width) wakes on the next tick; one off screen stays idle.

### 3. Magnet pickup, 96 px (note 8, 045.1, 045.2)
- **Data** `src/data/player.ts`: `PICKUP_RADIUS` 96 (from 64); `MAGNET` `{ radius: PICKUP_RADIUS, accel, maxSpeed, contact }` in px/s and px. From rest an item at the edge reaches the player in about a quarter second.
- **Sim** `src/sim/drops.ts`: `GroundItem` gains `speed` (px per tick the pull has built up) and `wait` (ticks before it can be pulled; 0 for drops). Each tick an item in the player's room within `radius` of the feet box moves toward the player, its speed growing by `accel` to `maxSpeed`; on contact (within `contact` px of the feet box, or reaching it this tick) it is picked up. Out of reach it stops. The pull works in combat (045.2). Nodes still need E (untouched).
- **Save**: `SAVE_VERSION` 2, with a migration that gives saved ground items `speed: 0, wait: 0`; the shape fixture is regenerated.
- **Render** `src/render/GroundItemView.ts`: items follow their sim position each frame (shadow and icon).
- **Test first** `tests/sim/drops.test.ts` (and `tests/sim/magnet.test.ts`): an item at 95 px is pulled and picked up within ~20 ticks, never on the first; one at 97 px stays; it accelerates; through walls (021) still; it stops when the player outruns it; the data numbers.

### 4. Cache loot bursts out (note 14)
- **Data** `src/data/landmarks.ts`: `CACHE_BURST` `{ flightTicks, staggerTicks, holdTicks, arc }`.
- **Sim** `src/sim/cache.ts`: opening a cache lays each item where it lands as today, with `burst: { x, y, delay }` (the chest's point, its turn's delay) and `wait` covering its flight and hold, so the magnet pulls each one after it lands. `GroundItem.burst` is `null` for other drops.
- **Render** `src/render/GroundItemView.ts`: a bursting item stays hidden in the chest until its delay, flies out on an arc to where it lands, and shows its name over it until the pull starts. `ui().groundItems` reports each drawn item's position and label.
- **Test first** `tests/sim/cache.test.ts`: the items burst from the chest, wait out their burst, then fly to a player standing at the cache and land in the inventory with pickup events (the feed lists them). **e2e** `tests/e2e/readability.spec.ts`: open the Ruined Cache; the items show with their names, then reach the player.

### 5. E prompts on everything E uses (note 7, 043.5)
- **Data** `src/data/interact.ts` (new): `INTERACT_KINDS` (tube stone, the arena's seal, altar, pylon, waystone, stash, bench, cache, diagram, hopper, sorter, crate, node) and `INTERACT_PROMPTS: Record<InteractKind, { key: 'E'; rise }>`.
- **Sim** `src/sim/interactables.ts` (new): `interactTarget(state)`: what E would act on this tick, in the step's order (the stone, a sealed door, an altar, a pylon, the waystone, the stash or bench, a cache, a diagram, a foundry piece, a node), and the world point to float over; null while a harvest, claim or cache hold runs, or when E would do nothing (a dormant pylon, a dim altar, an opened cache, an empty crate).
- **Render** `src/render/InteractPrompt.ts` (new, in TutorialUi): the 012 key cap and the bound key over that point, the same look as the objective prompt; hidden when the objective or intake prompt already shows E there. `ui().interactPrompt` reports kind, key and point.
- **Test first** `tests/sim/interactables.test.ts`: one case per kind in `INTERACT_KINDS` puts it in reach and checks `interactTarget` names it and it has a prompt, so a new kind fails until it does; the ley vein gets the node prompt; the seal's prompt sits over the door. **e2e**: the sealed door shows E in the sandbox's forum; a ley vein shows E.

### 6. The seal's hum and collapse (043.5)
- **Data** `src/data/hollowsSounds.ts`: `sealHum`, a quiet looping ley hum (the Hollows barrier had none to reuse), and the seal drop uses `barrierCollapse`.
- **Render** `src/render/SoundView.ts`: a named loop that can be switched on and off; `src/render/HollowsView.ts`/`hollowsFeel.ts`: the hum loops while the seal stands in the shown room, and the collapse plays when it drops. `ui().hollows.sealHum`.
- **Test first** `tests/data/sounds.test.ts` (existing checks cover every recipe and wav); a render test of the hum's on/off from the seal state.

### 7. Build controls on screen (note 9)
- **Data** `src/data/hudLayout.ts`: `BUILD_STRIP` (its entries: place, rotate, flip, pick up, drag a line, exit, each with its action or mouse label; font, gap and colours).
- **Render** `src/render/buildStrip.ts` (pure layout) and the strip in `BuildView`: centred just above the build bar's group labels, only while building, with the bound keys (042); the tube slot rises above it. `ui().buildBar.strip`.
- **Test first** `tests/render/buildStrip.test.ts`: every entry, the bound keys (a rebinding changes the text), centred, clear of the HP block and under the tube slot. **e2e**: the strip shows in build mode only, with the bound keys.

## Verify
- `npm run check`; the touched e2e files while building; the full `npx playwright test` once at the end.
- Review shots `tests/e2e/readabilityShots.spec.ts` (REVIEW_SHOTS=1, docs/review/045/): the red HP bar, a ley vein's prompt, the build strip, a cache burst, the sealed door's prompt. The older shots that cover the HUD, the build bar, the Hollows and landmarks are rerun; the HP bar colour changes some, recommitted on purpose.
- `npm run measure` once; the results go in the spec.
