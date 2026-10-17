# 002: Movement
status: approved

## Goal
The player walks around a walled ruin room with WASD and rolls out of the way with Space, while the camera follows. The room can be shown in three-quarter or straight-down view, toggled live, so Shaun can compare the two.

## Design references
- docs/design.md: "Combat" (WASD to move and dodge; telegraphed attacks you read and dodge; heavy armor slows but dodging is never impossible), "Tech and prototype scope" (camera and art)
- docs/prototype.md: "Player flow" beat 3 (movement and dodging), "Camera and art" (three-quarter view, try a straight-down variant early; player idle, walk in 4 directions, dodge), open question "Three-quarter view or straight top-down"
- docs/process.md: "Prototype backlog" item 002, "Art pipeline" (from 002 on every new entity gets a generated sprite)
- docs/art.md: style, scale and palette

## Acceptance criteria

**Input and commands**
- [ ] Render turns WASD and Space into a per-tick command (a move vector and a dodge press) that the sim consumes. The sim never reads the keyboard.
- [ ] `window.__GAME__` can set the command for the ticks it steps, so tests drive movement without real key presses.

**Walking (sim)**
- [ ] The player moves in 8 directions. Diagonal movement is normalized, so it is no faster than straight movement.
- [ ] Walk top speed is 120 px/s. The player reaches top speed from rest in about 6 ticks, and comes to rest about as fast after input stops.
- [ ] The player keeps a facing: the last non-zero move direction, snapped to one of 4 directions (up, down, left, right) for the sprite. It starts facing down.

**Roll (sim)**
- [ ] Pressing dodge starts a roll in the current move direction, or in the facing direction when standing still.
- [ ] A roll covers 96 px over 18 ticks on open floor. Its direction is fixed once it starts; move input doesn't steer it.
- [ ] The player is invulnerable for the first 12 ticks of the roll. The sim exposes this as a flag (nothing can hit the player yet; 004 uses it).
- [ ] After a roll ends, a new roll can't start for 30 ticks (0.5 s). Dodge presses during a roll or its cooldown do nothing and are not buffered.
- [ ] Walls and ruin blocks stop a roll the same way they stop walking.

**Room and collision (sim + data)**
- [ ] The room is 40×30 tiles (1280×960 px), bounded by walls, with a few ruin blocks inside. The layout is data in `src/data`, not code.
- [ ] The player has a small collision box at their feet. It can't overlap walls or ruin blocks, and slides along them when moving diagonally into one.
- [ ] The player spawns at a fixed open spot set in the room data.

**Camera (render)**
- [ ] The camera eases toward the player and is clamped to the room, so nothing beyond the walls is ever shown. It stays pixel-snapped (no shimmering at integer zoom).

**Views (render)**
- [ ] Two views exist: three-quarter (default) and straight-down. `?view=34` or `?view=top` picks one at load, and V swaps live.
- [ ] The view changes only what is drawn. The sim, collision and state are identical in both.
- [ ] In three-quarter view, sprites are depth-sorted by their feet, so the player is drawn behind a ruin block when standing above it and in front when below it.
- [ ] `getState()` includes the player's position, velocity, facing, roll state (rolling, invulnerable, cooldown remaining) and the current view.

**Art**
- [ ] For each view: a player sprite with idle and a walk loop in 4 directions plus a roll animation, a floor tile, a wall tile and a ruin block, all following docs/art.md. Each view's set is drawn for that camera angle.
- [ ] All asset keys are registered in `src/data/assets.ts`.
- [ ] Shaun approves every new sprite by eye at 4×.

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass.

## Data changes
- Movement tuning (new, e.g. `src/data/player.ts`): walk speed 120 px/s, acceleration and deceleration (~6 ticks to full and to rest), roll distance 96 px, roll duration 18 ticks, invulnerable ticks 12, roll cooldown 30 ticks, feet collision box size.
- Room layout (new, e.g. `src/data/rooms.ts`): 40×30 tile grid of floor, wall and ruin block, plus the spawn point.
- Camera tuning in `src/data/config.ts`: follow easing.
- `src/data/assets.ts`: keys for both views' player, floor, wall and ruin block sprites and their animations.

## Out of scope
- Mouse aiming, firing and the tube (003). Facing comes from movement only.
- Anything that can hit the player, health or damage (004). Invulnerability is only a flag.
- Armor and its speed penalty (010).
- Tiled maps. The room is a data grid for now.
- Picking a final view and closing the prototype open question. That happens after Shaun compares them.
- Gamepad input, key rebinding, sound, pause screen.
- Floor tile variants.

## Test plan
- **Vitest (`tests/sim`):** diagonal speed equals straight speed; ticks to top speed and to rest; facing follows the last move and starts down; roll distance and duration on open floor; roll direction from move input and from facing when still; roll can't be steered; invulnerable only for ticks 1 to 12; cooldown blocks a second roll for 30 ticks and presses aren't buffered; walls and blocks stop walking and rolling; diagonal slide along a wall; the same command sequence gives the same state.
- **Vitest (data test):** room is 40×30, edges are all wall, spawn is on open floor, every sprite key exists in the atlas.
- **Playwright (`tests/e2e/movement.spec.ts`):** via `__GAME__`, walk right for 60 ticks and check position; roll and check `getState()` roll fields; walk into a wall and check the player stops; `?view=top` loads in straight-down and V swaps it while the player position is unchanged; no console errors.
- **Screenshots (qa agent):** both views with the player mid-room; three-quarter with the player behind and in front of a ruin block; the camera clamped at a room corner showing no area past the walls.
- **Shaun's review:** every new sprite at 4×, then the Pages preview playtest in both views.

## Open questions
None.
