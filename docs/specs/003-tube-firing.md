# 003: Tube firing
status: approved

## Goal
The player carries a stack of arrows, loads them into the dormant tube by hand with R, and holds the left mouse button to fire arrows at the cursor. Arrows fly straight and stop at walls or after a set range.

## Design references
- docs/design.md: "Combat" (mouse to aim; the tube is your only weapon; hotbar = ammo lines, start with one slot; most ammo fires at the cursor; physical deals big direct hits), "Opening: first 30 minutes" beat 1 (the tube is dormant and can only fire ammo you hand-load), "Pillars" 2 (manual first, then automated)
- docs/prototype.md: "Player flow" beats 1 and 3 (dormant tube, firing hand-loaded ammo), "Content list" (arrows: fast and straight, physical damage), "Camera and art" (player firing the tube; tube dormant; each ammo's projectile)
- docs/process.md: "Prototype backlog" item 003, "Art pipeline" (every new entity gets a generated sprite)
- docs/art.md: style, scale and palette

## Acceptance criteria

**Input and commands**
- [ ] The per-tick command gains an aim point (world px), fire held (left mouse) and a load press (R, an edge). Render converts the cursor to world coordinates; the sim never reads the mouse or keyboard.
- [ ] `window.__GAME__.step(frames, command)` accepts the new fields, so tests aim, fire and load without real input.

**Inventory and loading (sim)**
- [ ] The player has an inventory of item counts by item id. It starts with 30 arrows, set in data. The tube starts empty.
- [ ] The tube has one slot (slot 1) holding arrows, with a capacity of 6 loaded rounds.
- [ ] Tapping R starts loading if the tube isn't full and the inventory has arrows. One round moves from the inventory into the tube every 15 ticks (0.25 s). Loading continues on its own until the tube is full or the inventory is empty.
- [ ] Fire held (any fire input, including a dry fire) or starting a roll stops loading. Rounds already loaded stay loaded; partial progress on the next round is lost, and that round stays in the inventory.
- [ ] R does nothing while already loading, while the tube is full, or with no arrows in the inventory, or during a roll (presses are not buffered).

**Firing (sim)**
- [ ] While fire is held and the tube has a loaded round, the tube fires one arrow, then at most one every 15 ticks (4 shots/s). A single-tick press fires one arrow if the fire interval has passed.
- [ ] Each shot uses one loaded round. Spent arrows are gone.
- [ ] Holding fire with an empty tube dry-fires: nothing launches and loading does not start. A dry fire happens at most once per fire interval and sets a short dry-fire flag (10 ticks) in the state, for the HUD.
- [ ] The player can't fire during a roll. Fire still held when the roll ends fires as normal.
- [ ] Walking is unaffected by firing or loading.
- [ ] Aim direction is from the player's feet to the aim point. If the aim point is on the feet, the shot goes in the facing direction.
- [ ] While fire is held, the player faces the aim direction, snapped to 4 directions. Otherwise facing follows movement, as in 002.

**Arrows (sim)**
- [ ] An arrow spawns 12 px from the player's feet along the aim direction, and flies straight at 480 px/s.
- [ ] An arrow's position is its ground (shadow) point; collision uses that point. It is removed when that point enters a wall or ruin block, or after 320 px of travel. One spawned inside a wall is removed on its first tick.
- [ ] Each arrow carries its damage (10) and damage type (physical) from data. Nothing uses them yet; 004 does.
- [ ] The same seed and command sequence give the same arrows, tick for tick.

**State**
- [ ] `getState()` adds the inventory counts, the tube (loaded, capacity, loading, load progress, fire cooldown, dry-fire flag) and the live arrows (position, direction, distance travelled).

**Render**
- [ ] Arrows are drawn rotated to their direction, raised 14 px above their ground point (chest height), with a small shadow at the ground point. They are depth-sorted by their ground point like other sprites.
- [ ] The player holds the tube, drawn pointing toward the aim (snapped to 4 directions), in its dormant look. A firing pose shows while firing.
- [ ] A minimal HUD: one hotbar slot at the bottom of the screen with the arrow icon, loaded/capacity (e.g. `4/6`), the inventory count, and a load progress indicator while loading. The slot flashes on a dry fire. The HUD stays fixed on screen as the camera moves.
- [ ] The mouse cursor is a crosshair sprite over the game.

**Art**
- [ ] New sprites following docs/art.md: the tube on the player (dormant, 4 directions), a player firing pose (4 directions), the arrow projectile and its shadow, the hotbar slot frame, the arrow icon and the crosshair.
- [ ] All asset keys are registered in `src/data/assets.ts`.
- [ ] Shaun approves every new sprite by eye at 4×.

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass.

## Data changes
- Items (new, e.g. `src/data/items.ts`): the `arrow` item with its HUD icon key.
- Ammo (new, e.g. `src/data/ammo.ts`): `arrow` ammo: speed 480 px/s, range 320 px, damage 10, damage type physical, sprite key.
- Tube tuning (new, e.g. `src/data/tube.ts`): capacity 6, load interval 15 ticks, fire interval 15 ticks, dry-fire flag 10 ticks, muzzle offset 12 px, draw height 14 px.
- Player start (in `src/data/player.ts`): starting inventory of 30 arrows.
- `src/data/assets.ts`: keys for the new sprites.

## Out of scope
- Bombs, ley bolts and switching ammo (005). The arrow is the only ammo.
- Crafting and any way to get more arrows (005). At 0 arrows the player can't fire until reload.
- Enemies, hits and damage being applied (004). Damage is only data on the arrow.
- Picking spent arrows back up.
- An inventory screen. The HUD slot is the only inventory view.
- More hotbar slots, the reservoir and the foundry link (007). The tube is dormant throughout.
- Tube attuning and per-ammo firing animations beyond the arrow.
- Sound, gamepad, key rebinding, pause screen.

## Test plan
- **Vitest (`tests/sim`):** starting inventory and empty tube; tap R loads one round per 15 ticks until full (6) and inventory drops by 6; loading stops at an empty inventory; R ignored while loading, full or out of arrows; fire and roll each stop loading and keep loaded rounds; hold fire fires at 15-tick intervals and spends one round per shot; single-tick press fires one; empty tube dry-fires, sets the flag for 10 ticks and doesn't start loading; no shots during a roll and held fire resumes after; walk speed unchanged while firing; aim direction and the zero-aim fallback to facing; facing follows aim while firing; arrow spawn offset, speed, removal at 320 px, removal on wall and ruin block, removal on first tick when spawned in a wall; arrow damage and type from data; determinism of a fire/load command sequence.
- **Vitest (data test):** ammo and item ids are kebab-case and cross-reference; every new sprite key exists in the atlas.
- **Playwright (`tests/e2e/firing.spec.ts`):** via `__GAME__`, load to full and check the tube and inventory; fire at an aim point and check an arrow appears and moves toward it; fire at a nearby wall and check the arrow is removed; empty the tube and check the dry-fire flag; no console errors.
- **Screenshots (qa agent):** player firing in each of the 4 directions with arrows in flight; the HUD while loading and after a dry fire; the crosshair over the room.
- **Shaun's review:** every new sprite at 4×, then the Pages preview playtest (prototype playtest check: is firing the tube fun on hand-loaded ammo?).

## Open questions
None.
