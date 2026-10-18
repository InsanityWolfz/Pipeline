# 009: Claiming
status: done

Approved on Shaun's behalf for the overnight run (Shaun, 2026-10-18). He reviews it in the morning report.

## Goal
A new room, the overgrown shrine, lies through a second doorway in the ruin hall. Wisps and Husks guard it, along with the Pylon Warden by its pylon. The player clears the room, then holds E at the pylon to claim it. Claiming does four things:
- The shrine stays empty of enemies for good.
- A supply port on the foundry wall starts pushing the site's raws out at a fixed rate.
- The pylon becomes a deposit point that sends the carried haul to a stash chest in the foundry.
- The pylon and a new foundry waystone fast-travel between the two places.

## Design references
- docs/design.md: "Combat" (enemies: small packs with telegraphed attacks), "World" (Claiming: clear a site, set it up as a supply line, reactivating its pylon makes monsters stop roaming and claims are permanent; "Pylons are deposit points"; "Fast travel" between the foundry and any claimed site), "The Foundry" ("No ratio math": supply lines deliver a fixed amount per minute)
- docs/prototype.md: "Player flow" beat 8, "Content list" (Wisp, Pylon Warden, the claimable site with its pylon; warden core; "Supply line from the claimed site at a fixed rate"), "Crude animations" (pylon off and activating)
- Interview decisions (Shaun, 2026-10-18):
  - The site is a new room off the hall.
  - Supply comes through a fixed port in the foundry, cycling wood, stone, fiber and ley crystal.
  - A deposit sends items to a stash chest, a fixed chest with a menu.
  - Fast travel is E at the pylon or the waystone.
  - The pylon is claimed by holding E once the room is clear.
  - The Wisp kites and casts. The Warden slams and chases.
  - Site enemies reset on a KO until the site is claimed.

## Acceptance criteria

**The shrine (data, sim)**
- [ ] New room `shrine`, about 30×22 tiles, with ruin blocks, a few nodes (2 ley veins, 1 tree, 1 reeds) and a pylon in the middle. Its door links to a new door on the ruin hall's top wall. That door is placed away from the Husk pack, and the tiles are chosen in /plan.
- [ ] The enemies are 3 Wisps, 2 Husks and 1 Pylon Warden, which starts next to the pylon.

**Wisp (data, sim)**
- [ ] `wisp`: 20 health, floats at 40 px/s. It aggros within 160 px.
  - It keeps a preferred distance of 120 px, backing away when the player is closer than 90 px.
  - When it's ready, it charges for 48 ticks: a glow, which is the telegraph, with its aim locked at the start.
  - It then casts one orb, which flies straight at 60 px/s, deals 12 damage, ends at walls or after 240 px, and can be dodged with a roll's i-frames.
  - It waits 90 ticks between casts. It leashes and goes home like the Husk.
- [ ] Orbs are enemy projectiles in the sim, with their own list and summary, and they hit the player's feet-box area. Player shots don't hit orbs.
- [ ] Drops: 1–2 ley crystal always.

**Pylon Warden (data, sim)**
- [ ] `pylon-warden`: 200 health, walks at 35 px/s, and chases within 200 px. Within 56 px it starts a slam:
  - a 60-tick wind-up, showing a red ground circle of 64 px radius around itself
  - the hit: 30 damage and 32 px of knockback to a player inside the circle without i-frames
  - a 60-tick recovery, during which it doesn't move
  - a 120-tick cooldown before the next wind-up
- [ ] Drops: 1 `warden-core` and 2–3 stone always.

**Pylon and claiming (sim)**
- [ ] The pylon is a solid object in the shrine's room data. While any enemy lives in the shrine, E at the pylon records a `sealed` event and does nothing else.
- [ ] Once the shrine is clear, holding E within reach of the pylon for 120 ticks, like a harvest, claims it. Moving away or getting hit cancels the hold. Claiming records a claim event. The pylon plays a 60-tick activation, and from then on it shows as active.
- [ ] Claims are permanent: they survive a KO, and a claimed room's enemies never respawn.
- [ ] Claiming adds a supply port and a waystone to the foundry, and unlocks the stash. All three are fixed pieces at set tiles, so they can't be placed or picked up. The tiles are chosen in /plan, on the foundry walls, clear of the door.

**Supply port (sim)**
- [ ] Once the site is claimed, the port pushes one raw out its front every 120 ticks, cycling wood, stone, fiber, ley crystal. If the front doesn't accept an item, the port waits holding it. A wrong item stalls the conduit, as in 006.
- [ ] Before the claim, the port isn't on the grid and the tile is free. If a player's piece sits on the port's tile at claim time, it's picked up into the inventory first.

**Deposit and stash (sim, render)**
- [ ] E at a claimed pylon, a tap rather than a hold, moves every raw, part and ammo item the player carries into the stash, recording a deposit event and a short cyan swirl. A later spec adds unidentified armor, which goes too.
- [ ] The stash chest is a fixed solid piece by the foundry door. It exists from the start, so its tile is never buildable. E opens the stash menu, which works like the hopper menu: a "Take all" row, then one row per item. Clicking a row moves that stack to the inventory. Esc or walking away closes it.

**Fast travel (sim, render)**
- [ ] E at a claimed pylon offers both actions in a two-row menu, "Send haul home" and "Travel to foundry". E at the waystone travels to the shrine, standing one tile below the pylon.
- [ ] Travel changes room with the doorway fade and records a room change event. It ends build mode and resets velocity.

**Render, art**
- [ ] Sprites:
  - Wisp: idle/float, charge glow, cast, hit, death
  - orb, with a shadow
  - Warden: idle, walk, wind-up, slam, recover, hit, death, all 3 views
  - the slam's ground circle
  - pylon: off, activating (frames), active (looping glow)
  - supply port, waystone, stash chest
  - shrine floor variant
  - pylon, stash and travel menu rows
- [ ] Enemy health bars show on the Warden, as they do for Husks.

**Hook**
- [ ] `getState()` gains: orbs; `claims` (claimed room ids); the claim hold progress; the stash contents; the port's state; and the events `claims`, `sealed`, `deposits` (pylon) and `travels`.

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass. The sprites are pending Shaun's 4× review.

## Data changes
- `src/data/rooms.ts`: `shrine` room, its door and the hall's second door, and a pylon field.
- `src/data/enemies.ts`: `wisp` and `pylon-warden`. Enemy defs gain an attack union: `swipe`, `cast` or `slam`.
- `src/data/claims.ts` (new): the pylon reach and hold ticks, the port rate and cycle, and the fixed piece tiles.
- `src/data/pieces.ts`: fixed pieces `supply-port`, `waystone` and `stash`, which are never in `BUILD_BAR`.
- `src/data/playtest.ts`: unchanged, apart from 008's cores.

## Out of scope
- Ley range, more than one site, NPCs, and supply rates that change.
- Death losing the haul (011). The stash exists here, but nothing is lost yet.
- Armor drops (010).

## Test plan
- **Vitest:**
  - Wisp spacing, its charge then cast, orb flight and damage, a roll dodging an orb, and its leash.
  - Warden: the wind-up, the circle hit or miss, i-frames, and its drops.
  - Pylon: sealed while enemies live, the hold claims, a hit or moving away cancels it, and the claim survives a KO with no respawn.
  - Port rate and cycle, and that it stalls.
  - Deposit to the stash, then take one stack or all.
  - Travel both ways.
  - Determinism.
- **Playwright:**
  - Walk to the shrine, kill everything there with `?playtest` ammo, and claim the pylon.
  - Deposit, travel to the foundry, take from the stash, and travel back through the waystone.
  - Check the port pushing into a conduit.
- **Screenshots:** the shrine, a Wisp charging and its orb, the Warden's slam circle, the pylon in each state, the stash menu, the port and waystone.

## Open questions
- None. Every number is a starting value.

## Build notes
These choices were made in the overnight build, not by the spec. They're logged for Shaun to accept or overturn in the morning report.
- **Fixtures:** the stash, supply port and waystone are fixtures (`FIXTURES` in `src/data/claims.ts`, `state.fixtures`), not entries in `src/data/pieces.ts`. That keeps placed-piece ids and ordering unchanged.
- **Event names:** the pylon deposit event is `stashDeposits`, because `deposits` was already the hopper event. Taking from the stash records `stashTakes`.
- **Values the spec didn't give:**
  - orb knockback: 10 px over 4 ticks
  - the attack pose for both new enemies: 8 ticks
  - the Warden's off-screen leash grace: 120 ticks
  - Wisp cooldown: 90 ticks, counted from the wind-up's start
  - Warden cooldown: 248 ticks, counted from the wind-up's start, which leaves 120 after the recovery
- **Reach:** pylon and fixture reach is 20 px. At 12 px, standing on the tile below the pylon was on a knife edge.
- **Pylon menu rows:** icons and a count, with no text. The HUD font has no letters yet; 011 adds them.
- **The hold:** started by E like a harvest, then stand still. You don't keep E held.
- **Long menus:** the stash menu wraps into columns after 10 rows.
- **Left for 014:** the shrine floor repeats visibly. The door sprite on top and bottom walls is the side arch. The shrine's bottom door sits under the hotbar when the camera centres on it.
