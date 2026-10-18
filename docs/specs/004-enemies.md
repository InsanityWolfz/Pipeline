# 004: Enemies
status: done

## Goal
A pack of three Husks waits in the ruin hall. They notice the player once they come on screen, shamble after them, and telegraph a swipe the player can read and dodge. Arrows damage, knock back and kill them, and each dead Husk drops husk resin (and sometimes another raw) that the player walks over to collect. The player now has health; at 0 the room resets (a placeholder until 011).

## Design references
- docs/design.md: "Combat" (small packs with telegraphed attacks you read and dodge; few enemies, each one matters; running away is always allowed; physical deals big direct hits; the player has a health pool; simple stats: max health, health regen), "The Foundry" ("What monsters drop": raw materials in small amounts, enough to hand-craft ammo in a pinch), "Pillars" 1 and 2
- docs/prototype.md: "Player flow" beat 3 (first fight: weak enemies teach movement, dodging and firing hand-loaded ammo, and drop raw materials), "Content list" (Husk: slow melee, telegraphed swipe, starting area; raw materials incl. husk resin), "Camera and art" (enemies: idle, move, attack wind-up, attack, hit, death; player hit; pickup sparkle)
- docs/process.md: "Prototype backlog" item 004, "Art pipeline"
- docs/art.md: style, scale and palette
- Aggro and leash follow Realm of the Mad God's model, at Shaun's request: one range both acquires and keeps a target, the enemy chases as long as the player stays in range, and it walks home once out of range but re-acquires straight away on return (checked against the open-source RotMG server behaviors `Follow` and `StayCloseToSpawn`).

## Acceptance criteria

**Player health (sim)**
- [x] The player has health, starting at max health 100 (data). There is no regen in 004.
- [x] A swipe that connects deals its damage (20) and grants 30 ticks (0.5 s) of hit invulnerability. During that time, and during a roll's existing i-frames, swipes deal no damage and apply no knockback.
- [x] A hit knocks the player back 24 px directly away from the Husk, over 6 ticks, stopped by walls and ruin blocks. Input still steers on top of the knockback.
- [x] A hit stops loading the same way firing or rolling does: loaded rounds stay and partial progress is lost. Firing is unaffected.
- [x] **Placeholder KO:** when health reaches 0, the sim sets a KO flag for one tick, then resets the whole room to its start state: player at spawn with full health, the starting inventory (30 arrows), an empty tube, every Husk back at its home at full health, no ground drops and no live arrows. The RNG is **not** reseeded, so a run after a KO doesn't repeat the first one. 011 replaces this with the real death rule.

**Husks (sim)**
- [x] Husk is an enemy definition in data (max health 40, walk speed 50 px/s, feet box, hurtbox, swipe and drop numbers below). Enemy placements are part of the room data: `ruin-hall` gets a pack of 3 Husks in the upper-right area, all off screen from the spawn.
- [x] Husks collide with walls and ruin blocks like the player (feet box, sliding). Husks push apart so they don't overlap each other. The player can walk through Husks and Husks don't block the player.
- [x] Each Husk has a home (its placement) and one of these states: **idle**, **chase**, **wind-up**, **swipe**, **recover** or **return**.

**Aggro and leash (sim)**
- [x] **Aggro box:** a 640×360 box (the view size from config) centred on the player's feet. A Husk is "on screen" when its feet are inside the box. The sim uses this box, not the camera.
- [x] An idle or returning Husk aggros (goes to chase) when it's on screen or when an arrow hits it.
- [x] A chasing Husk walks straight at the player's feet at its walk speed (no pathfinding) and keeps chasing with no time limit while it stays on screen.
- [x] Once a chasing Husk has been off screen for 60 ticks in a row (1 s), it goes to return. Coming back on screen resets that count.
- [x] A returning Husk walks straight back to its home at walk speed. It re-aggros the moment it's on screen or hit. It can always be damaged.
- [x] A Husk that reaches its home (within 4 px) while returning heals to full and goes idle.
- [x] A Husk mid-swipe (wind-up, swipe or recover) finishes the swipe before the aggro and leash rules apply again.

**Swipe (sim)**
- [x] A chasing Husk that has the player's feet within 28 px of its own feet starts a wind-up, if its swipe cooldown is over. It stops moving and locks its swipe direction toward the player's feet at that moment.
- [x] Wind-up lasts 36 ticks (0.6 s). The swipe hits on the next tick: the player takes the hit if their feet are within the swipe arc, which is 40 px reach and 120° wide, centred on the locked direction. The swipe checks for a hit on that one tick only.
- [x] Recover lasts 24 ticks, then the Husk goes back to chase. The swipe cooldown (60 ticks from the start of the wind-up) stops back-to-back swipes.
- [x] Knockback moves a Husk during a wind-up but doesn't cancel it: the arc stays at the locked direction, measured from where the Husk is when the swipe lands.
- [x] Facing follows movement (4 directions, as for the player), and the locked direction during a swipe.

**Arrows hitting Husks (sim)**
- [x] An arrow hits the first Husk whose hurtbox contains the arrow's ground point. The arrow is removed, and the Husk takes the arrow's damage (10, from 003's ammo data). Arrows don't pierce.
- [x] A hit knocks the Husk back 6 px along the arrow's direction over 4 ticks, stopped by walls and ruin blocks. It sets a 6-tick hit-flash flag for render.
- [x] At 0 health the Husk dies. It's removed from the live enemies, its drops are rolled, and a death event (position, facing) is recorded for render's death animation.

**Drops and pickup (sim)**
- [x] A dead Husk always drops 1–2 husk resin (seeded roll) and has a 50% seeded chance of one extra item: wood, stone or fiber, picked evenly. The rolls come from `src/sim/rng.ts`.
- [x] Each dropped item is one ground item. Ground items scatter to seeded spots within 12 px of the corpse that aren't inside a wall or ruin block, and fall back to the corpse point if no clear spot is found.
- [x] A ground item goes into the inventory when the player's feet box touches it (an 8 px pickup radius). Ground items stay until picked up or the KO reset clears them. A pickup event (item id, position) is recorded for render.
- [x] Items: `husk-resin`, `wood`, `stone`, `fiber` exist as data with icons. Nothing uses them yet (005 does).

**Determinism and state**
- [x] The same seed and command sequence give the same Husks, hits, drops and pickups, tick for tick, including across a KO reset.
- [x] `getState()` adds the player's health, max health, hit invulnerability and KO flag; the live Husks (id, position, home, facing, state, state timer, health, locked swipe direction, hit flash); the ground items (id, item id, position); and this tick's hit, death and pickup events.
- [x] `window.__GAME__` can still drive everything through `step(frames, command)`. A test can get a Husk into a known spot by stepping the sim; no new test-only hooks unless /plan shows one is needed.

**Render**
- [x] Husks are drawn with their animations: idle, move, wind-up (the telegraph), swipe, hit and death, in 4 directions where the pose needs it (side drawn flipped, as for the player). They're depth-sorted by their feet like other sprites.
- [x] **Telegraph:** during the wind-up, the swipe arc is drawn on the ground at its real reach, angle and direction, filling in over the wind-up, so the player can see exactly where it lands.
- [x] Hit flash: a Husk, or the player, flashes white while its hit-flash or invulnerability timer is running. The player's invulnerability shows as a flicker.
- [x] A small health bar shows over a Husk once it has taken damage and while it's below full.
- [x] The death animation plays where the Husk died, then the corpse fades.
- [x] Ground items are drawn as their item sprites with a small shadow and a pickup sparkle on collection. On pickup a "+1 [icon]" rises from the player and fades.
- [x] HUD: a player health bar, and a small column listing the count and icon of each material the player holds (only materials with a count above 0, not arrows). Both stay fixed on screen.
- [x] KO: the screen fades out and back in over ~0.5 s. This is render only; the sim has already reset.

**Art**
- [x] New sprites following docs/art.md: the Husk (idle, move, wind-up, swipe, hit, death; 4 directions where the pose needs it); ground and icon sprites for husk resin, wood, stone and fiber; the pickup sparkle; the player hit pose; the HUD health bar frame. The Husk fits the theme rule (a lost-civilization creature, not modern).
- [x] The swipe telegraph is drawn from palette colours (shape or sprite, chosen in /plan).
- [x] All asset keys are registered in `src/data/assets.ts`.
- [x] Shaun approves every new sprite by eye at 4×.

**Checks**
- [x] `npm run check` and `npm run test:e2e` pass.

## Data changes
- Enemies (new, e.g. `src/data/enemies.ts`): `husk`: max health 40, walk speed 50 px/s, feet box, hurtbox (around the body, set in /plan from the sprite), swipe trigger range 28 px, swipe reach 40 px, arc 120°, wind-up 36 ticks, recover 24 ticks, cooldown 60 ticks, swipe damage 20, player knockback 24 px over 6 ticks, arrow knockback 6 px over 4 ticks, hit flash 6 ticks, leash grace 60 ticks, home tolerance 4 px, drop table (husk resin 1–2 always; 50% one of wood/stone/fiber), animation keys.
- Rooms (`src/data/rooms.ts`): an `enemies` list on `Room` (enemy id, tile); `ruin-hall` gets 3 Husks in the upper-right area, off screen from spawn (e.g. tiles (31,4), (33,5), (32,7), confirmed in /plan).
- Player (`src/data/player.ts`): max health 100, hit invulnerability 30 ticks, pickup radius 8 px.
- Items (`src/data/items.ts`): `husk-resin`, `wood`, `stone`, `fiber` with icons and ground sprites.
- Drops: scatter radius 12 px (data, beside the enemy or in a small loot file).
- `src/data/assets.ts`: keys for the new sprites and animations.

## Out of scope
- Wisp, Pylon Warden and the elite (009). Husk is the only enemy.
- The real death rule: going home and losing the haul (011). The KO reset is a placeholder.
- Armor, the armor stat and unidentified armor drops (010). Health regen.
- Pathfinding. Husks walk in straight lines and slide along walls; one stuck behind a ruin block stays stuck.
- Enemy respawn, other than the KO reset.
- Crafting or any use for the materials (005). An inventory screen.
- Other damage types and their behaviors. Arrows are physical only.
- Interrupting or stunning a Husk with hits.
- Bombs and ley bolts hitting Husks (005).
- Sound, screen shake, damage numbers.

## Test plan
- **Vitest (`tests/sim`):**
  - Health: start at max; a connecting swipe deals 20 and grants 30 ticks of invulnerability; no damage during hit invulnerability or roll i-frames; knockback distance and direction, stopped by a wall; a hit stops loading and keeps the loaded rounds.
  - KO: at 0 health the flag is set and the room resets (player, inventory, tube, Husks, ground items, arrows); the RNG continues instead of repeating.
  - Aggro: idle Husk ignores a player off screen; aggros inside the box (edges of the box and corners), and when hit from off screen; chases at walk speed; leaves after 60 ticks off screen, and the count resets on return; returning Husk re-aggros on screen and when hit; reaching home heals to full and idles; a swipe in progress finishes before leashing.
  - Swipe: starts at 28 px with the cooldown over; locks direction; hits on tick 37 inside the arc (reach and angle edges); misses outside the arc, after a sidestep, and through a roll; recover and cooldown timings; knockback during wind-up doesn't change the locked direction.
  - Arrows: hit the first Husk in the hurtbox, removed, no pierce; 10 damage; Husk knockback and hit flash; 4 arrows kill a Husk.
  - Drops: resin 1–2 always; the extra item chance and pick come from the seeded RNG; scatter avoids walls; pickup on touch adds to the inventory and records the event; items persist until picked up.
  - Separation: Husks don't overlap; the player passes through Husks.
  - Determinism: a fight with a seed and command sequence replays tick for tick, including a KO.
- **Vitest (data test):** enemy, item and room enemy references exist and are kebab-case; drop table items exist; every new sprite key is in the atlas.
- **Playwright (`tests/e2e/enemies.spec.ts`):** via `__GAME__`, walk toward the pack and check the Husks aggro; let a Husk swipe and check the player's health drops; roll through a swipe and check it doesn't; shoot a Husk to death and check the drops appear and are picked up into the inventory; walk away and check the Husks return home at full health; take swipes to 0 and check the KO reset; no console errors.
- **Screenshots (qa agent):** a Husk in each pose and direction; the wind-up telegraph at start and full; a damaged Husk's health bar; ground drops and the pickup popup; the HUD health bar and material column; the KO fade.
- **Shaun's review:** every new sprite at 4×, then the Pages preview playtest (is the first fight fun on hand-loaded arrows? can the swipe be read and dodged?).

## Open questions
None.

## Build notes
Choices made in the build, not by the spec, and accepted in Shaun's playtest:
- The swipe pose holds for 6 ticks (`swipeTicks`); the hit still lands on its first tick only.
- A chasing Husk in trigger range stands still while its cooldown runs, rather than walking into the player.
- With these timings a swipe cycle is 66 ticks, so the 60-tick cooldown never binds; it matters if recover is tuned shorter.
- When hurtboxes overlap, an arrow hits the Husk it reached first along its flight.
- The KO flag and the room reset happen on the same tick.
- The player's invulnerability flickers between a white flash and normal every 4 ticks, starting white; the hit pose shows for the first 8 ticks.
- On a KO the camera holds still while the screen darkens, then jumps to spawn and follows again; corpses from before the KO are cleared.
- Each material's one 16×16 sprite is both its ground sprite and its HUD icon.
- `getState()` also reports each Husk's `maxHealth` and `modeTicks`; events include player hits.
