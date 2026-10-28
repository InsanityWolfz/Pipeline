# 079: The foundry's mood — plan

Spec: docs/specs/079-foundry-mood.md. Plan pre-approved by Shaun in chat, 2026-10-27.

Stacked on 074–078 (`origin/claude/078-ammo-visuals` merged in, which carries 074–077); 079 merges after them. Render and
data only: no file under `src/sim` changes and `SAVE_VERSION` stays at main's.

## Shape of the build
One vertical slice through data, pure render models, Phaser views, the test hook and e2e, then the art's light touch.

### Data
- `src/data/moods.ts`: `FOUNDRY_MOOD` (a `RegionMood`: `resin` 0.55, wash `flame-dark` 0.05, no fog, lights cyan /
  cinder / brass-light, light scale 1).
- `src/data/juice.ts`: `ROOM_MOOD` goes (its only entry was the foundry's); AmbientView's tint rectangle goes with it.
- `src/data/lights.ts`: `FOUNDRY_LIGHTS` (`walls` by prop light key, `intake`, `machines` by machine id, `tiers`), and
  three new light source ids in `LightSourceId` (`wall`, `intake`, `forge`) the picker reads tiers for.
- `src/data/foundryFx.ts` (new): `HEAT`, `STEAM`, `QUENCH`, `SPARKS`, `FORGE_FX_MAX`, `FOUNDRY_FX_CAP` (weather's share,
  derived from `WEATHER_CAP`), `LEY_PULSE`, `FOUNDRY_FX_SEED`.
- `src/data/props.ts`: `torch` (a side-wall prop, mirrored on the east wall) and `light?` on `PropDef`; the brazier and
  torch carry one. `src/data/rooms.ts`: four torches at (0, 4), (0, 11), (23, 6), (23, 13).
- Art: the torch's four frames (`interior.ts`); `src/data/art/foundryFx.ts` (new: the shimmer's four frames, the steam
  puff and spark dot, the lit inlay rune, the bead); the rim, diagonal gradient, inner shade, soft shadow and brass
  glints in `machines.ts`, `logistics.ts`, `tunnels.ts`. Registered in `foundryAssets.ts` and `assets.ts`, with
  `DEPTHS.leyPulse` (over the floor, under conduits) and `DEPTHS.foundryFx` (under `DEPTHS.worldUi`).

### Render (pure, unit-tested)
- `src/render/foundry/runningForges.ts`: the running set. `FoundryView` already visits each machine when it draws it;
  it hands the status over (`observe`), and the set changes only when a forge machine's status changes or it goes.
- `src/render/foundry/forgeFx.ts`: which running machines get effects (on screen with a 32 px margin, nearest the
  view's centre, up to `FORGE_FX_MAX`), the steam schedule from the seeded stream, the burst counts by tier and the
  budget's thinning.
- `src/render/foundry/forgeParticles.ts`: steam, quench and sparks as a model (spawn, rise, drift, grow, fall, fade),
  every value from the seeded stream, as 077's weather model.
- `src/render/foundry/leyPulse.ts`: the inlays (from `floorFrame`), their distances from the intake's mouth, and the
  pulses (front, lit inlays, beads), the rate limit and live caps.
- `src/render/lighting/foundryLights.ts`: wall lights from the props (worked out once a room), the intake's light, and
  running on-screen forge machines' lights, flicker within ±15% (the coil steady with Flashes off).

### Render (Phaser)
- `src/render/foundry/FoundryMood.ts`: owns the running set; draws the machine glows (014's halo), the shimmer pool,
  one `ParticleEmitter` each for steam and sparks (the model drives them, as `WeatherView` does), and the ley pulses'
  pooled runes and beads; reports into the particle ledger (weather's share: motes + steam + sparks) and to
  `ui().foundryMood`.
- `LightingView`: the foundry takes `FOUNDRY_MOOD` (ambient on the world layer by tier, the wash, no fog) and places
  the foundry's lights through 074's picker. `?mood=off` skips the ambient, lights, shimmer, steam, sparks and pulses;
  the room's wash stays (it is the room's own tint, as 014's was under mood off).
- `FoundryView`: piece bodies join the world layer (machines, hoppers and crates as props; conduits, splitters and
  tunnels as flats), so the tint or lighting is set when a piece is made and on a look change only. Item icons,
  arrows and markers stay out of it.
- `ShotFxView`: 078's 4 machine sparks skip the Smelter, kiln and coil, whose sparks are 079's (078's look and colours,
  079's place, time and counts).
- `GameScene` builds `FoundryMood` and draws it after `FoundryView`; `FeelView` exposes the motes' count and the intake
  glow's swell.

## Tests first
- Unit: `tests/data/foundryMood.test.ts`, `tests/render/runningForges.test.ts`, `forgeFx.test.ts`, `leyPulse.test.ts`,
  `foundryLights.test.ts`, `forgeParticles.test.ts`; `noMathRandom` covers the new files.
- e2e: `tests/e2e/foundryMood.spec.ts` (mood and lights per tier, torches, heat on and off with status and off screen,
  sparks and quench, the caps with 12 forges, ley pulses' order, readability against mood off, bounded work, the same
  `getState()` on Low, High and mood off over 1,800 ticks), `foundryMoodProbe.spec.ts` (`PROBE=1`), and
  `foundryMoodShots.spec.ts` (`REVIEW_SHOTS=1`, docs/review/079). Helpers in `tests/e2e/foundryMoodPage.ts` build a
  forge line with `?playtest`.
- Motion: strips of working smelters and kilns, the torches and the ley pulses on a virtual clock locked to the sim
  (33 ms a frame), saved in docs/review/079.

## Order of commits
1. Plan. 2. Data and data tests. 3. Pure models and their tests. 4. Lighting in the foundry and the world layer.
5. FoundryMood view, the hook and the e2e. 6. Art. 7. Shots, motion strips and the probe. 8. Results and art.md.
