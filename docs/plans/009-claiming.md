# Plan: 009 Claiming (docs/specs/009-claiming.md, approved)

Written by the overnight run; it stays inside the spec. Branch `claude/009-claiming`, stacked on 008.

## Tests first
- **`tests/sim/wisp.test.ts`:**
  - It aggros within 160 px and keeps ~120 px away, backing off inside 90 px.
  - It charges for 48 ticks with its aim locked, casts an orb, and waits 90 ticks between casts.
  - An orb flies at 60 px/s, deals 12 damage, ends at a wall or after 240 px, and misses a rolling player.
  - It leashes and goes home.
  - It drops 1–2 ley crystal.
- **`tests/sim/warden.test.ts`:**
  - It chases within 200 px. Within 56 px it winds up for 60 ticks, then the slam hits a player inside 64 px (30 damage and knockback) and misses one outside or rolling.
  - It recovers for 60 ticks without moving, then waits out a 120-tick cooldown.
  - It drops 1 warden core and 2–3 stone.
- **`tests/sim/claiming.test.ts`:**
  - The shrine room and doors link both ways.
  - The pylon is solid.
  - E records `sealed` while enemies live.
  - Once clear, an E-started hold claims after 120 ticks. Moving or a hit cancels it.
  - The claim adds the supply port and waystone (a piece in the way is picked up into the inventory first).
  - Claims survive a KO, and a claimed room has no enemies after a KO.
  - **Port:** pushes wood, stone, fiber, ley crystal in turn, one every 120 ticks, and waits when its front refuses.
  - **Pylon menu:** deposit moves raws, parts and ammo into the stash; travel goes to the foundry.
  - **Stash:** taking one stack or all moves it to the inventory.
  - **Waystone:** E travels to the shrine, standing one tile below the pylon.
  - Determinism.
- **Data test:** the new enemies, rooms, fixtures, sprites and anim sets exist.
- **`tests/e2e/claiming.spec.ts`:** with `?playtest`, walk to the shrine, clear it, claim, deposit, travel home, take from the stash, travel back through the waystone, and see the port push into a conduit.

## Design
- **Enemies:**
  - `EnemyDef` becomes a union on `kind`: `melee` (swipe), `caster` (cast) or `slammer` (slam), on a shared base.
  - `huskAi.ts` keeps the shared step and melee think, and dispatches on kind.
  - New `casterAi.ts` and `slammerAi.ts`.
  - The modes are reused: `windup` is the telegraph and `swipe` is the attack pose (for every kind).
  - `fight.ts` uses `meleeDef('husk')`.
- **Orbs:** new `orbs.ts` with a state list, stepping, and player hits through `damagePlayer` (which respects i-frames).
- **Fixtures:** fixed foundry furniture (stash, supply port, waystone) lives in `state.fixtures`, not the piece list, so piece ids and orders stay put. Placement treats fixture tiles as occupied. Fixtures are solid. Flow lets the port push into the piece at its front.
- **Claims:**
  - **State:** `state.claims` (room ids) and `state.claimHold`.
  - **Pylon:** in room data, solid in collision.
  - **E at a pylon:** while enemies live, a sealed event; once clear and unclaimed, it starts the hold; once claimed, render opens the pylon menu, which sends `pylon: 'deposit' | 'travel'` commands.
  - **Waystone:** E travels.
  - **Stash:** E opens render's menu, which sends `takeStash: { itemId | null }`.
- **Travel:** a shared `travelTo(state, roomId, tile)` used by doors, the pylon and the waystone; doors keep their own arrival logic.
- **KO:** claimed rooms spawn no enemies.

## Render
- `EnemyView`: telegraphs by kind (arc, a cast glow ring, the slam circle filling in), and anim sets for the wisp and warden.
- `OrbView`.
- `FixtureView`: stash, port (glows as it pushes), waystone shimmer, and the pylon (off, activating, active).
- `RoomView`: draws the pylon (it's in room data) and the shrine floor per room theme.
- `StashMenu` and `PylonMenu`: reuse the hopper picker panel styling.
- The claim hold shows a progress bar over the pylon, like the harvest bar.

## As built
- **AI files:** `huskAi.ts` became `enemyAi.ts`, the dispatcher, plus `aiCommon.ts`, `casterAi.ts` and `slammerAi.ts`.
- **Fixtures:** they live in `src/sim/fixtures.ts`, apart from `claims.ts`, so `state.ts` has no import cycle.
- **Travel:** doors keep their own arrival logic. `travelTo` serves the pylon and the waystone.
- **Render:** `SiteView` (pylon, fixtures, orbs), `SiteMenus` and a generic `ChoiceMenu`, instead of separate Orb, Fixture, Stash and Pylon views.
