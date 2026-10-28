# 074 plan: light and region moods

Plan for docs/specs/074-light-and-moods.md on `claude/074-light-and-moods` (InsanityWolfz/Pipeline#91). A plan file
because the spec spans the ground bake, a new lighting layer over every world view, Settings and the test hook, and
will pass 300 lines. Pre-approved by Shaun in chat (2026-10-27). Each slice runs data, render and tests together, lists
its tests first, and is committed with `npm run check` green before the next. 074 has no sim rule: lighting is render
only, so its "failing tests first" are data tests (tests/data) and pure render helpers (tests/render).

## Findings that shape the plan
- **Rooms.** Every boss arena stands in the overworld itself (arenas.ts), so "arenas use their ring's mood" falls out of
  the mood following the camera. The sandbox is its own room (Region 1's mood); the foundry keeps `ROOM_MOOD.foundry`
  and gets no lights, fog or tint until 079.
- **Region edges.** The ground changes at the circles 48 (Region 1 / Hollows, the barrier), 79 (Hollows / Emberworks
  cliff) and 110 (Emberworks / Stormcrown cliff), from the centre (WORLD_SHAPE). The mood blends ±4 tiles round
  those circles (the ground's own edges, not the barriers' `gateAt` a couple of tiles further out). To be raised.
- **Phaser 4.2.1 lights** (node_modules/phaser/src/gameobjects/lights, shaders/src/DefineLights.glsl): lit colour =
  texture × (ambient + Σ light × attenuation × diffuse). With no normal map the normal is flat, so diffuse is
  `z / distance`: the default `z = 0.1 r` makes a hot pin-point. Lights here use `z = LIGHT_Z × r` (data) for a soft
  pool. The manager culls by camera and nearest-to-centre; render places at most the tier's budget itself, from a
  pool of 16 `Light`s made once (hidden when unused), so Phaser's cull never decides.
- **Per-frame cost.** EnemyView, NodeView and FeelView already walk their lists each frame; 074 adds no walk over all
  props. World-layer objects register in a small registry when made (chunks, nodes, room tiles, landmark dressing,
  sites) and drop out when destroyed; tier, room and ambient changes re-apply lighting or tint over the registry once,
  on the change (the ambient is quantised so walking across a 4-tile band re-tints a handful of times, not every
  frame). New chunks take the current look as they're built. Light sources are gathered from the view rectangle
  (nodes by the existing per-frame node walk, ley lines by precomputed points bucketed by chunk). The light catch only
  looks at sprites inside the view.
- **Flash on Medium.** On Medium, props carry the ambient as a tint, so a lightning flash lifts the lit ground only
  (re-tinting every prop for half a second would be the per-frame prop walk). High lights props, so it lifts both.
- **Flashes off.** "No light flashes or flickers more than ±15%": with Flashes off, the event pulses (muzzle flash,
  bursts, the Conductor's and lightning's 200 ms lights, the face glow's flare) place no light; steady lights stay,
  fires flicker within ±15%. To be raised.
- **Low's A/B and timings are probes.** Real-time frame-time ratios on a shared 4-core machine and CI's 2-core runners
  would flake as a check, so the A/B probe and the tier timings live in `lightingProbe.spec.ts`, run with
  `PROBE=1` (as `REVIEW_SHOTS=1` runs the shot specs), and their numbers go in the spec and PR. To be raised.
- **Saves.** Graphics quality is a field of `pipeline.settings` (browser). SimState doesn't change: `SAVE_VERSION`
  stays at main's.

## Slice 1: the data (moods, lights, quality, blend)
**Tests first**
- tests/data/moods.test.ts: rings 0–5 each have a mood; every colour is a palette id; wash ≤ 0.06; Region 1's three
  rings share one mood; the approximate ambients in the spec's table (±2 per channel).
- tests/data/lights.test.ts: every source's and round light's colour is a palette id; tiers are Medium/High (rounds:
  High); budgets 0/8/16; the catch's alpha cap 0.35.
- tests/render/settingsStore.test.ts: `quality` parses good values, missing reads Medium, bad reads Medium; settings
  version stays 1.
**Code**
- src/data/moods.ts: `REGION_MOODS`, `MOOD_BLEND`, `MOOD_EDGES`, `LIGHTNING_FLASH`, `FOUNDRY_MOOD`.
- src/data/lights.ts: `LIGHT_SOURCES`, `ROUND_LIGHTS`, `LIGHT_BUDGET`, `LIGHT_CATCH`, `LIGHT_Z`, `QUALITY_LOOK` (what
  each tier turns on).
- src/data/settings.ts: `quality`, `QUALITY_TIERS`, the row's words; settingsStore parses it.
- src/data/art/ground.ts: `GROUND_BLEND`.

## Slice 2: pure helpers
**Tests first** (tests/render)
- mood.test.ts: `moodAt(distance)` is each ring's inside its band, blends linearly over ±4 tiles at 48, 79 and 110,
  and no step across a band jumps more than 1/8 of the change per tile; `ambientRgb` (white → colour by darkness).
- lightPick.test.ts: priority first, then distance from the camera's centre; budget per tier; Low places none; a
  higher priority light is never dropped for a lower one; rounds only on High.
- lightCatch.test.ts: falloff (1 at the centre, 0 at the radius), the two nearest lights, cap 0.35, none on Low.
- flash.test.ts: the lightning flash's curve (up for 120 ms, eased back over 400 ms) and none with Flashes off.
- groundBlend.test.ts: the same tile hash gives the same edge blobs; cracks only on listed terrains; Region 1's grass
  none.
**Code**: src/render/lighting/mood.ts, lightPick.ts, lightCatch.ts; src/render/overworld/groundBlend.ts (pure parts).

## Slice 3: moods on screen (ambient, tint, wash, fog) and the Settings row
**Tests first** (tests/e2e/lighting.spec.ts)
- Settings shows Graphics quality (Medium by default); clicking steps Low → Medium → High; stored in
  `pipeline.settings`; survives a reload; a bad stored value reads Medium; applies live (`ui().lighting.quality`).
- `ui().lighting` reports quality, ring and blend, ambient, lights by source, lit objects and fog layers.
- Low has no Phaser lights and no lit objects; Medium lights the ground chunks only; High the props too.
**Code**
- src/render/lighting/WorldLayer.ts (registry: ground and props; lit or tinted per tier, on change only).
- src/render/lighting/LightingView.ts (the scene's lights manager, the ambient by camera centre, wash, quality
  switching, the report), FogView.ts (a baked tileable blob texture, one or two TileSprites at depth 0.3).
- OverworldView, RoomView, NodeView, LandmarkView and SiteView register their world objects; AmbientView's wash
  follows the mood.
- main.ts: `render.maxLights` 16; a Canvas renderer runs as Low and the row shows Low, fixed.
- Settings row (SettingsView/SettingsScreen); the test hook reports `ui().lighting`; dev-only `?mood=off`.

## Slice 4: light sources
**Tests first** (lighting.spec.ts)
- On High in the Hollows' sandbox start: the face glow is placed; a volley places a muzzle flash; a burst places a
  blast light; a live ley vein places its light; rounds in flight place lights on High and none on Medium; budgets
  never exceeded (8, 16) while firing at a pack.
- In the Stormcrown: a rod strike places a `storm-pale` light and flashes the ambient (`ui().lighting.flash`); with
  Flashes off it doesn't.
**Code**: src/render/lighting/lightSources.ts (steady sources from state, by view), lightPulses.ts (timed lights from
events), ley-line points bucketed once; LightingView picks and places.
- Boss attack mapping (listed in the PR): the Conductor's `blinks` (at both ends), `lashes` (along the line),
  `strikes` and `sentinelCalls`' landings, and `chainSegments` while the chain runs; the Forgewright's venting core
  (`e.vent > 0`) and its rect flood pools while they burn.

## Slice 5: the light catch
**Tests first** (lighting.spec.ts): an enemy spawned beside a lit ley vein on Medium shows a cyan catch ≤ 0.35; none
on Low. Readability pixel checks: an enemy's body in the Stormcrown on High is ≥ 90% as bright as in Region 1; a
telegraph's red is unchanged; the HUD's pixels match.
**Code**: src/render/lighting/CatchView.ts (pooled additive copies of enemies', the player's and ground items' frames,
for sprites in view only).

## Slice 6: ground blending
**Tests first**: groundBlend.test.ts (slice 2); e2e: passable tiles unchanged with blending (the map's rows are the
sim's, so this is the data test that `passable()` is the same with `?blend=off`).
**Code**: groundBlend.ts painted into drawGround: soft ragged edges where region grounds meet (grass/Hollows stone,
ash/slag, slate/chasm floor), big soft patches in each region's colours, cracks with a lit lip, worn paths (a trodden
centre, the region's ground creeping in at the edges, pebbles). `?blend=off` (dev) for the bake-time measurement.

## Slice 7: verify, shots, probe, docs
- tests/e2e/lightingShots.spec.ts (REVIEW_SHOTS=1 → docs/review/074): each region on Low and High (same framing),
  the Stormcrown on Medium, a ley line lighting a pack at night, a lightning strike, a blended edge and a worn path,
  the Conductor's fight on High, the Settings row.
- tests/e2e/lightingProbe.spec.ts (PROBE=1): Low vs `mood=off` interleaved, and Low/Medium/High frame times in a
  Stormcrown pack fight and the Conductor's fight; chunk bake time with and without blending.
- Kept green: newGameAfterQuit, waypointSteady, and touched e2e files; older pixel or colour checks reviewed.
- docs/art.md: moods, the two layers, lights, quality tiers. The spec's Results and "Raised after the build".

## Risks
- SwiftShader (headless Chromium's software GL) runs the light shader on the CPU: tier timings on it are relative.
- Older screenshot or pixel specs over the overworld may read darker colours past Region 1; each is checked and only
  an expectation the spec changes on purpose is updated.
