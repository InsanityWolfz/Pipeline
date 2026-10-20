# Plan 030: Healing, safe spots only

Spec: docs/specs/030-healing.md, with Shaun's override (docs/brainstorm/2026-10-19-open-questions.md, "Shaun's decisions", D): the highest healing rate wins and sources don't stack. Written for the unattended run (028–038 as separate commits on `claude/laughing-volta-uac3nf`). docs/design.md already carries the 030 wording (Combat, the healing line, Death and tension), so it isn't touched; the spec doesn't ask for a docs/prototype.md change.

## Shape of the change
Small vertical commits, tests first in each:

1. **Data.** `src/data/player.ts`: `HEALING` (`foundry` 50, `pylon` 10, `spring` 10, `fieldRegen` 0 HP/s, `afterHitDelay` 0 ticks); `MAX_HEALTH`'s "no regen yet" note goes. `src/data/overworld.ts`: `SpringDef` (`id`, centre tile, pool `radius` in tiles), `SPRING_RADIUS` 1.5, `SPRING_CLEARING` 3, and `OVERWORLD.springs`: `west-spring` (10, 31), `south-east-spring` (66, 38), `north-spring` (26, 8).
2. **Clearings.** `generateOverworld` stamps a square of open ground `SPRING_CLEARING` tiles round each spring with the other landmarks, after the terrain is generated. Not through `OVERWORLD.clearings`: those also steer the generator, and a new clearing there shifts the seeded RNG's stream and reshuffles every grove, rock field and pond on the map. Stamped as a landmark, only the three clearings change (checked by diffing the generated rows before and after).
3. **Healing** (`src/sim/healing.ts`, new), run once a tick after `checkKo`, so a hit that drops health to 0 starts the KO before anything could heal it:
   - `fieldRegen(tuning)`: the one function the field regen stat is read through (`HEALING.fieldRegen` now; 036/037 add gear and talents there).
   - `springAt(roomId, x, y)`: the spring whose pool holds the feet point (overworld only, `hypot ≤ radius × TILE_SIZE`).
   - `healingRates(state)`: every rate that applies (foundry room; `inSafeZone` at the feet; a spring's pool; field regen anywhere); `strongest(rates)` keeps the highest above 0. Ties go to the table's order (foundry, pylon, spring, regen).
   - `stepHealing(state)`: nothing while dying, at max health, during `healDelay`, or with no rate above 0 (carry cleared). Otherwise `healCarry += rate` (HP·ticks), whole points `floor(healCarry / TICK_RATE)` go on, capped at `MAX_HEALTH`; the carry is reset when health reaches max. Integer arithmetic, so 10 HP/s is exactly 10 HP in 60 ticks.
   - `PlayerState` gains `healing` (`'foundry' | 'pylon' | 'spring' | 'regen' | null`), `healCarry`, `lastHitTick`. `damagePlayer` records the hit's tick; healing waits `afterHitDelay` ticks from it, the hit's own tick first, so a delay of N pauses exactly N ticks (0: healing carries on).
   - `events.heals`: `{ source, kind: 'start' | 'stop' }` whenever `healing` changes (a switch of source stops one and starts the other).
4. **Hook.** `player.healing`; `springs` (id, tile, pool radius px, `inside`); `heals` in `events`. Dev hook `setPlayerHealth(health)` for the e2e and screenshots (a damaged player without a fight).
5. **Render** (`src/render/HealingView.ts`, new, owned by `RoomViews` so GameScene stays under its limit; the ui fields join `RoomUiState`):
   - Art (`src/data/art/spring.ts`): the Ley Spring in the 020 vector style: a low ring of rune-carved stones (rock greys, cyan runes) round a pool of glowing ley-cyan water (radial `cyan-glow` → `cyan` → `cyan-deep`), a highlight, and a ripple ring sprite. Laid flat just above the ground (under shadows) so feet, enemies and shots draw over it.
   - The spring's look: ripples scale out and fade on a slow loop, staggered; a soft light (the shared glow texture, ADD) breathes over it and swells while the player heals in that pool.
   - While `healing` is set: small cyan motes rise from the player (a `heal-mote` sparkle, one every `everyMs`, glowing so it reads over the cyan pool as well as grass and flagstones; plain particle squares vanished against the water); pylon: a faint cyan thread from the pylon's top to the player, waving like the supply tendril; foundry: a warm-to-cyan shimmer round the player (a light and a ring on the floor, ember → cyan tint, swelling and fading) on a short loop.
   - Sound `heal-start` (a soft generated chime, `npm run sound`), played by `FeelView` on a `heals` start, nothing while it carries on.
   - The HP bar is left alone (031).
6. **Look data** (`src/data/springAssets.ts`: `SPRING_SPRITES` keys and `SPRING_LOOK`): ripple, light, motes, thread and shimmer numbers.

## Tests (written first)
- **Vitest** `tests/sim/healing.test.ts`:
  - the open field: health doesn't change over 600 ticks; `healing` null.
  - the shrine's safe zone, claimed: +30 in 180 ticks exactly (and not before the claim).
  - each spring's pool: +30 in 180 ticks; one tile outside it nothing.
  - the foundry: 10 → 100 in exactly 108 ticks (not 107).
  - the highest rate wins: no spring sits in a pylon's zone on the fixed map, so the rule is checked on `strongest` (spring 10 and pylon 10 give 10, not 20) and in play with field regen raised to 10 inside a spring and inside the claimed zone (10 HP/s, not 20), and to 60 in the foundry (60, not 110).
  - never above `MAX_HEALTH`; nothing while dying; a KO still wakes at full health.
  - `healing` null at full health, names the source while gaining; `heals` start and stop events, and a switch of source.
  - raising `fieldRegen` heals in the open field and reports `'regen'`; it doesn't add to the foundry's 50.
  - healing carries on through hits (the tick after a hit still heals).
  - a spring is no safe zone: a Husk follows the player into the pool and hits them there.
  - summary: `player.healing`, `springs` with `inside`.
- **Vitest** `tests/data/springs.test.ts`: three springs at the spec tiles and rings with radius 1.5; each pool on open ground in a clearing (no tree, rock or water within the clearing); each reachable on foot from the wake tile; the west pool off the road (no path tile under it).
- Rewritten if they break: tests whose players stand hurt in the foundry or a claimed zone (none expected; the arena is open field).
- **Playwright** `tests/e2e/healing.spec.ts`: from `?start=field`, `setPlayerHealth(40)`, walk to the west spring with `step()`, see `player.healing === 'spring'` and health rising, step out and see it stop (`heals` stop and health still). `tests/e2e/healingShots.spec.ts` with `REVIEW_SHOTS=1` into docs/review/030/: each spring, the player healing in a spring with motes, healing in the shrine's safe zone with the thread, the foundry shimmer.

## Not dictated by the spec
- "Raised health this tick" counts the fraction building up: `healing` stays on the source on every tick a rate is filling the carry, not only on the 1-in-6 ticks a whole point lands, so the glow and the start/stop events don't flicker.
- Ties between equal rates report the table's order: foundry, pylon, spring, regen (a spring inside a claimed zone reads `'pylon'`).
- The fraction carried is cleared at full health and whenever nothing heals, so leaving a spring and coming back starts from zero.
- Healing runs after the KO check each tick.
- "Feet inside the pool" is the feet centre point within the radius.
- Spring ids are `west-spring`, `south-east-spring`, `north-spring`; their clearings are 7×7 tiles.
- Spring clearings are stamped as landmarks instead of joining `OVERWORLD.clearings` (see 2).
- No spring sits in a pylon's zone on the fixed map, so "a spring inside a safe zone gives 10, not 20" is tested on the pure `strongest` and in play by overlapping sources with raised field regen.
- `setPlayerHealth` dev hook.
- The look's numbers and keys live in `src/data/springAssets.ts` (as 029's in `stageAssets.ts`), since `assets.ts` is near its size limit.
- `fieldRegen(tuning = HEALING)` takes no state yet: nothing it reads is in the state until 036/037. `HEALING` is read-only; `healingRates` and `stepHealing` take an optional tuning so tests can raise field regen or the hit delay without changing the data.
- The chime plays at `SOUND_LEVELS.quiet` on a real start only, not when healing just changes source (a stop in the same frame).
- Under the test hook the sim holds still between steps, so `healing` stays set and the effects keep running while a screenshot waits; the foundry shot waits for the shimmer's brightest stretch.

## Risks
- e2e specs that take hits and then check health after a walk through the foundry would now see it refill; none found by grep, the full run will tell.
- The north spring's clearing cuts into a grove's edge; the map elsewhere is unchanged.
