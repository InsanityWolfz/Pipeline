# 008: Spread
status: approved

Approved on Shaun's behalf for the overnight run (Shaun, 2026-10-18: "Yes, approve all"). He reviews it in the morning report.

## Goal
The player builds gravity stagers, 1×1 pass-through pieces, each set to an angle. Each stager facing into the tube socket adds one stream. A shot from the reservoir fires one projectile per stream at that stream's angle, costing one round each. Up to four stagers make up to a four-way spread. Each stager costs a warden core to place.

## Design references
- docs/design.md: "Pillars" 3 (the factory layout is the ability; every extra projectile costs real materials), "The Foundry" ("The layout is the ability": lines at angles feeding gravity stagers fire a spread), "World" (fantasy machines: gravity stagers)
- docs/prototype.md: "Player flow" beat 9 (the elite's machine part lets them build a gravity stager and turn their ammo into a spread), "Content list" (warden core is needed to build the gravity stager; "Foundry pieces": gravity stager that splits a line into a spread; "Crude animations": spreads)
- docs/specs/007-tube-link.md: the socket, the reservoir, reservoir firing
- Interview decisions (Shaun, 2026-10-18):
  - Stagers are streams into the socket.
  - Angles are preset steps cycled with a key.
  - Placing one costs a warden core, and the core is refunded on pick-up. The `?playtest` start gives 5.
  - Only reservoir shots spread.
  - Only stagers next to the socket count, so a spread has at most 4 streams.
  - A stager passes items through with a short delay and needs no materials.

## Acceptance criteria

**Stager piece (data, sim)**
- [ ] New 1×1 piece `gravity-stager`. It's solid, holds at most 1 item, takes items from any side but its front, and pushes the item out its front after 15 ticks, like a conduit.
- [ ] Each stager has an angle from `STAGER_ANGLES` = −30°, −15°, 0°, +15°, +30°, starting at 0°. A new `setAngle` command (piece id), from E on a stager or a click on it in build mode, steps it to the next angle and wraps around. It records an angle event.
- [ ] Placing a stager takes 1 `warden-core` from the inventory, and picking one up gives it back. With none carried, placing fails with reason `cost`. Stagers are always unlocked, so the core is the gate.
- [ ] New part item `warden-core`. 009 makes it drop, and `?playtest` starts with 5.

**Streams and firing (sim)**
- [ ] A stream is a stager whose front tile is the socket. The socket's streams are those stagers, ordered by angle.
- [ ] A shot from the reservoir with S streams (S ≥ 1) fires min(S, rounds) projectiles in one shot, one per stream at its angle relative to the aim, taken nearest to 0° first. Each costs one round. With no streams, it fires one projectile straight at the aim, as in 007.
- [ ] Shots from carried ammo never spread.
- [ ] Bombs lob along each stream's angle to a landing point at the same aim distance. Arrows and ley bolts fly along each angle.
- [ ] Two streams at the same angle fire two projectiles on that same line, a stacked double shot. That's allowed.

**Render, art**
- [ ] The stager is drawn as a rune-carved stone ring with a floating ley needle. The needle tilts to its angle (5 frames), and the stager pulses while it holds an item.
- [ ] Build mode shows the stager's input and output arrows, plus a faint cyan fan line from the socket for each stream's angle. Hovering a stager shows its angle in degrees.
- [ ] A spread shot plays one muzzle flash per projectile.

**Hook**
- [ ] `getState()` gains a stager's `angle`, `item` and `progress`; the socket's `streams` (angles); this tick's `shotCount`; and the `angles` events.

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass. Shaun reviews the new sprites at 4× (pending in the overnight report).

## Data changes
- `src/data/pieces.ts`: `gravity-stager` (kind `stager`, 1×1, `cost: { 'warden-core': 1 }`) in `BUILD_BAR`.
- `src/data/foundry.ts`: `STAGER_TICKS = 15` and `STAGER_ANGLES`.
- `src/data/items.ts`: `warden-core` (part).
- `src/data/playtest.ts`: `warden-core: 5`.

## Out of scope
- Spreads wider than 4 streams, stagers that chain through conduits, angle steps finer than 15°.
- Hardening, ley guides and refinement stages.
- The Warden itself (009).

## Test plan
- **Vitest:**
  - Stager timing, capacity and front rule.
  - Angle cycling and its event.
  - Core cost, refund, and the `cost` failure.
  - The streams list from adjacent stagers only.
  - Spread shot counts: S streams vs fewer rounds, carried ammo never spreads, no stagers gives a single shot.
  - Projectile directions at each angle, and bombs landing at the same distance.
  - A full spread line, three stagers into a socket, firing three arrows per shot.
  - Determinism.
- **Playwright:** with `?playtest`, build a 3-stager ley bolt spread, step until the reservoir fills, fire one shot from the reservoir, and see 3 bolts.
- **Screenshots:** a spread of arrows in flight, the stager needles at each angle, and the build-mode fan lines.

## Open questions
- None. Every number is a starting value.
