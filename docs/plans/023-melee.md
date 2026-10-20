# Plan 023: Melee when the tube is empty

Spec: docs/specs/023-melee.md. Written for the unattended run (021–027 as separate commits on `claude/laughing-volta-uac3nf`). It stays inside the spec. docs/design.md already carries the melee line and the closed open question, so it isn't touched.

## Shape of the change
1. **Data.** `src/data/combat.ts` (new) holds `MELEE = { damage: 4, reach: 28, arcDegrees: 100, cooldownTicks: 24, knockback: 20, knockTicks: 8 }`. `src/data/enemies.ts`: `EnemyBase` gains `boss: boolean`; the Husk and Wisp are `false`, the Pylon Warden `true`. `src/data/tube.ts` loses `DRY_FIRE_TICKS`.
2. **Sim: when.** `src/sim/tube.ts` gets one pure helper, `hasRoundToFire(state)`: the tube is in hand and the slot count (carried rounds of the selected ammo, else the reservoir's rounds of it) is above 0. 024 extends only this helper for per-entrance reservoirs. `stepTube` faces the aim on any fire press that isn't blocked (rolling, the foundry; build mode and menu clicks never reach it as fire), then shoots if `hasRoundToFire`, else punches. The dry-fire flag, its counter and `dry` go; `firing` is now true only while the tube really fires (held with a round to fire), so `isFiringHeavy` is just `firing` and a punch never slows the walk. Ammo select still needs the tube.
3. **Sim: the punch.** `src/sim/melee.ts` (new): `punch(state, dirX, dirY)` waits out both the melee cooldown and the tube's fire cooldown, then sets `tube.meleeCooldown = MELEE.cooldownTicks` and resolves at once. Every live enemy in the player's room whose hurtbox overlaps the arc (apex the player's feet point, `MELEE.reach`, `MELEE.arcDegrees`, centred on the aim) and with no solid tile on the line from the player to its feet is hit: `damageEnemy` with `MELEE.damage` physical (flash, no def knockback), then, unless `boss`, `startKnock` straight away from the player, `MELEE.knockback` px over `MELEE.knockTicks`. It records `events.melees: { x, y, angle, hits }` (angle in radians, hits the enemy ids). The geometry is a pure, exact sector-against-box test in `src/sim/sector.ts` (apex inside the box, a corner inside the sector, or a box edge crossing either radius or the arc), and the wall test walks the line in small steps against `isSolid`.
4. **Hook.** `getState().tube` drops `dryFire` and adds `meleeCooldown`. Events carry `melees` (through the existing event clone and merge).
5. **Render.**
   - Sounds: `melee-hit` (a light, low thud) and `melee-whiff` (a short soft noise sweep) in `src/data/sounds.ts`; `dry-fire` removed; `npm run sound` regenerates the wavs and the stale `dry-fire.wav` is deleted. `FeelView` plays `melee-hit` for a punch that hit (instead of the arrow hit sound for those hits; the hurt sound, burst, number and hit-stop stay as for any hit) and `melee-whiff` for a miss. The dry-fire sound and the HUD slot's dry-fire tint go.
   - Jab: `WandererPose` gains `jab` (0..1). `PlayerView` reads it from the sim: full on the punch's tick, easing back over `WANDERER_FEEL.jab.ticks` of the melee cooldown, so a still frame under the hook shows it. With the tube, the tube thrusts forward along the aim (a negative kick: the tube-butt jab) and the body leans in; without it, the near hand drives out from the shoulder along the aim as a fist. The aim angle is kept up to date without the tube too.
   - Swoosh: `EffectsView` draws a pale slice from the feet on each melee event at the punch's real reach, arc and angle, with a brighter rim, sorted in front of the player and anything in reach (so it reads when aiming up), fading out by tween over `MELEE_SWOOSH.ms` (`src/data/assets.ts`). `ui().swooshes` counts the swooshes still drawn.

## Tests (written first)
- **Vitest** (`tests/sim/melee.test.ts`):
  - with no tube, a punch hits a Husk in the arc (health down by `MELEE.damage`, a melee event with its id, position and angle) and misses one behind the player
  - it misses one beyond reach, and one across a wall tile
  - a Husk is knocked straight away from the player by `MELEE.knockback` over `MELEE.knockTicks`; the Warden takes the damage but doesn't move
  - holding fire repeats the punch every `MELEE.cooldownTicks`; `getState()` reports the cooldown
  - no punch in the foundry or while rolling
  - with the tube: an empty reservoir and no carried rounds punch; a carried round shoots (and `hasRoundToFire` says which); a reservoir of a different ammo punches
  - the sector test on its own: edge overlap, apex inside the box, a box straddling the arc's side
- **Vitest** (data): every enemy has a `boss` flag and only the Warden is a boss.
- Existing tests that checked dry fire now check the punch instead (`tube`, `link`, `placement`, `firingWalk`).
- **Playwright** (`tests/e2e/melee.spec.ts`): from the real start (no tube), walk into view of the field's Husks and wait for the nearest to close within a punch; punch it, then check the melee event lists it, its health dropped by `MELEE.damage`, and over the knockback it moved away from where the player stood. With `REVIEW_SHOTS=1`, screenshots into `docs/review/023/` of the swoosh mid-punch, with a fist and with the empty tube (tweens stopped with `tweenSpeed(0)`, taken once `ui().swooshes > 0`). `firing.spec.ts`'s dry-fire test becomes "the tube punches once the carried arrows run out".

## Risks
- A punch on the tick after the last shot would feel like a double tap, so a punch also waits out the tube's fire cooldown.
- The punch kills on its own tick but `removeDead` runs before the tube, so a punched-out enemy is removed (and drops) on the next tick, as an arrow fired this tick lands next tick.
