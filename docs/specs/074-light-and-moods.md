# 074: Light and region moods
status: approved

Approved by Shaun in chat, 2026-10-27, with the whole art pass (074–081); its plan is pre-approved.

Plan pre-approved by Shaun in chat, 2026-10-27. Plan: docs/plans/074-light-and-moods.md.

Drafted from Shaun's art-pass interview (docs/brainstorm/2026-10-27-art-interview.md) and the style sample page he chose from (docs/art/style-test-2.html). This is the first of eight art specs, built in order: "look first, then life".

## Goal
Each region has its own light: Region 1 stays sunny, Stonefall Hollows turns dusky, the Emberworks glow orange through smoke, and the Stormcrown goes dark, lit by ley lines and lightning. Glowing things light the ground and enemies near them. The ground blends softly between terrains, with worn paths, patches and cracks. Enemies and their wind-ups stay bright everywhere, and a Graphics quality setting keeps the game smooth on a modest laptop.

## Design references
- docs/design.md: "Camera and art" (changed in this spec, see "design.md change" below) and the theme rule ("World, regions, ley lines, bosses").
- docs/design.md: the round world and its rings (053, 060, 064): Region 1's rings 0–2, the Hollows ring 3, the Emberworks ring 4, the Stormcrown ring 5.
- docs/prototype.md: "Camera and art".
- docs/art.md: style, light from the top left, outline, accent colours, palette. The build updates art.md to match this spec.
- Earlier specs it builds on: 014 (glows, motes, mood tint), 017 and 053 (the overworld's chunked ground), 042 (Settings, the Flashes setting), 054 (combat readability), 059 (paths joined as one shape), 070 (the silhouette).

## Art-direction rules (for the whole pass, 074–081)
1. **Clean vector, pushed further.** Smooth shapes with the thin ink outline (`OUTLINE_WIDTH`, unchanged), soft gradients lit from the top left, and a rim light on lit edges. No pixel art and no painted textures.
2. **Two layers.**
   - The **world layer** (ground, props, trees, rocks, ruins, nodes, landmarks' ground) takes the region's mood and is lit by lights.
   - The **readability layer** is never darkened by a mood: enemies, bosses and their parts, every telegraph and wind-up, enemy and player rounds, ground items, the player, health bars, name tags, prompts, waypoints, damage numbers, the HUD and menus. In every region it draws at full daylight colour. Lights only add to it (the "light catch" below).
3. **A mood per region.** Region 1 is sunny (Realm of the Mad God). The Hollows are dusky. The Emberworks glow orange through smoke. The Stormcrown is dark, lit by ley lines and lightning (Hollow Knight).
4. **Light colours follow the theme rule.** Ley is cyan, fire is ember, lightning is storm violet. Nothing else glows.
5. **Scale stays.** The camera shows 640×360 world px. The wanderer stays about 42 px tall.
6. **Screen shake** is used only in boss spawn animations (080). Today's game already has none (`SHAKE_ON` is false), so 074 changes nothing here.
7. **Hit feedback** stays as it is.

## Region moods (data)
A new `src/data/moods.ts` holds one mood per danger ring. Render reads it; the sim never does.

Each mood has:
- **ambient:** the light the world layer sits in: a palette id and a `darkness` (0 is full white light, 1 is the colour itself). The approximate result is shown below.
- **wash:** today's screen tint (`ROOM_MOOD`), a palette id and an alpha. It covers everything, so it is capped at 0.06.
- **fog:** a soft haze that hugs the ground: a palette id, an alpha and a drift speed in px/s, or none.
- **light colours:** the region's ley, fire and accent colours (palette ids), and `lightScale`, how strongly lights show there. Daylight drowns lights; the dark lets them read.

| Ring | Region | Ambient (darkness → about) | Wash | Fog | Accent | Light scale |
| --- | --- | --- | --- | --- | --- | --- |
| 0, 1, 2 | Region 1, sunny | `sun` 0.08 → #fcfef4 | `sun` 0.04 (today's) | none | `sun` | 0.3 |
| 3 | Stonefall Hollows, dusk | `hollow-light` 0.5 → #c6ceda | `hollow-dark` 0.04 | `hollow-pale` 0.10, 4 px/s | `vein` | 0.8 |
| 4 | Emberworks, orange through smoke | `rust` 0.6 → #d39882 | `flame-dark` 0.05 | `ash` 0.18, 6 px/s | `cinder-light` | 1.0 |
| 5 | Stormcrown, dark | `storm` 0.75 → #757490 | `storm-dark` 0.06 | `storm-light` 0.12, 12 px/s | `storm-glow` | 1.4 |

- Ley light is `cyan` and fire light is `cinder` in every ring.
- **Lightning flash** (Stormcrown): when lightning strikes a rod, or the Conductor's strikes land, the ambient lifts toward `storm-pale` (darkness 0.3) for 120 ms, then eases back over 400 ms. With Flashes off (042.10) there is no ambient flash.
- **Blending:** the mood follows the camera's centre. It blends over 4 tiles each side of a region's boundary circle, so walking between regions has no hard cut. Region 1's three rings share one mood, so there is no blend inside Region 1.
- **Arenas** use their ring's mood. The sandbox uses Region 1's.
- **The foundry** keeps today's mood (`ROOM_MOOD.foundry`) until 079.
- Every colour is an existing palette id, so the palette doesn't change.

## Dynamic lights (data)
A new `src/data/lights.ts` lists light sources: what gives light, its colour (palette id), its radius in world px, its intensity, and its priority (0 is kept first). Render reads sim state and events and places lights. Lights are looks only: they never feed back into the sim, and the sim never imports them.

| Source | Colour | Radius | Intensity | Tiers | Priority |
| --- | --- | --- | --- | --- | --- |
| The wanderer's face glow; it flares ×1.6 for 120 ms on each shot | `cyan` | 48 | 0.8 | Medium, High | 0 |
| Muzzle flash on each volley (`shots` events), 80 ms | `cyan-glow` | 64 | 1.2 | Medium, High | 1 |
| Boss attacks: the Conductor's blink, arc lash, storm-call strikes and rod chain (200 ms each) | `storm-glow` | 96 | 1.4 | Medium, High | 1 |
| Boss attacks: the Forgewright's vents and heat flood, while they burn | `cinder` | 88 | 1.2 | Medium, High | 1 |
| Lightning striking a rod (Rod Field), 200 ms | `storm-pale` | 112 | 1.5 | Medium, High | 1 |
| Blasts (`bursts` events), 150 ms, coloured by damage type (physical `cyan-glow`, fire `cinder`, cold `foam`, lightning `storm-glow`) | by type | 1.5 × blast radius | 1.0 | Medium, High | 2 |
| Fires: braziers, flaring Emberworks vents, burning ground (Pool fire, hound trails); a ±15% flicker | `cinder` | 64 / 72 / 40 | 0.9 | Medium, High | 2 |
| Ley crystals, veins, pylons and Ley Springs, breathing with today's glows | their `GLOWS` colour | 1.5 × their `GLOWS` radius | 0.7 | Medium, High | 3 |
| Ley lines: one light every 3 tiles along each line in view (every 6 on Medium) | `cyan` | 40 | 0.5 | Medium, High | 3 |
| Rounds in flight: ley bolts `cyan`, fire `cinder`, cold `foam`, lightning `storm-glow`; plain arrows and bombs carry none | by round | 28 | 0.7 | High | 4 |

- Each light's intensity is multiplied by the mood's `lightScale`.
- **Budget:** at most 8 lights in view on Medium and 16 on High. Render picks them by priority, then by distance from the camera's centre.
- **Light catch:** an enemy, the player or a ground item inside a light's radius gets an additive copy of its frame, tinted the light's colour. Its alpha is the light's falloff at the feet, at most 0.35, from the two nearest lights. It is on for Medium and High. Directional rim light on enemies comes in 076.
- **Bosses' attacks** map onto the sim state and events their views already draw from today. The build lists that mapping in the PR. Boss attacks with no glow today (the Warden's, the Bulwark's) get no light in 074; 080 can add them.
- **Existing glows** (the additive glow images from 014, 018 and 051) stay on every tier as the visible halo. On Medium and High the light adds what the halo can't: the ground and props around it brighten.

## Ground blending and variation
The ground is still baked into chunk textures when a chunk is built (017, 053), so blending costs nothing per frame. New tuning goes in `GROUND_BLEND` in `src/data/art/ground.ts`, per region where it differs.
- **Soft edges:** where two terrains meet (grass and dirt, sand and water, the Hollows' flagstones and rubble, ash and slag, slate and grit), the edge is a ragged band of overlapping rounded blobs a few px deep, like the Frozen Grotto's frost wash (029), never a straight tile edge. Each tile's look comes from `worldTileHash`, so a chunk looks the same every time it's built.
- **Worn paths:** the joined path shape (059) gets a darker trodden centre, grass creeping in at its edges and a scatter of pebbles. Its outline and width don't change.
- **Patches:** broad, soft patches of lighter and darker ground, about 4–8 tiles across, in each region's own ground colours.
- **Cracks:** thin dark crack lines with a lit lip, on stone, paving, ash and slate. Each region has its own density; Region 1's grass has none.
- **Clear ground:** ground detail is flat paint. It adds no collision and no standing props, and it never hides a telegraph, a path or a ley line.

## Graphics quality setting
Settings (042) gains a row, **Graphics quality**, with Low, Medium and High. Clicking it steps to the next tier. It is stored like the other settings, in `pipeline.settings`, as `quality`. A missing or bad value reads as Medium, so `SETTINGS_VERSION` stays 1. A change applies at once, with no restart.

| | Low | Medium | High |
| --- | --- | --- | --- |
| World-layer mood | ambient as a multiply tint on the ground and props | lighting on the ground; tint on props | lighting on the ground and props |
| Dynamic lights in view | none | up to 8 | up to 16 |
| Lights from rounds in flight | no | no | yes |
| Light catch on enemies, the player and items | no | yes | yes |
| Fog | off | one layer | two layers drifting apart |
| Lightning ambient flash | no | yes (if Flashes is on) | yes (if Flashes is on) |
| Ground blending (baked) | yes | yes | yes |
| Glow halos (today's) | yes | yes | yes |

- The default is Medium. There is no automatic detection in 074.
- The game config sets `render.maxLights` to 16, High's budget. Phaser reads it once at boot.
- On the Canvas renderer (no WebGL), the game runs as Low, and the row shows Low and can't be changed.

## How it's built in Phaser 4 (from .claude/skills/phaser)
- **Lighting component** (v4-new-features, v3-to-v4-migration, game-object-components): `gameObject.setLighting(true)` lights an Image, Sprite or Graphics. It is WebGL only. Lights have a `z` height. "Lighting changes the shader, which breaks batches", so lit and unlit objects should be grouped. That is why Medium lights only the ground chunks, which draw first and together, and leaves props tinted.
- **Scene lights:** the scenes skill names `this.lights` as the `LightsManager`, and game-setup-and-config gives `maxLights` (default 10, the most lights per camera). The skill doesn't list the manager's methods, so they were checked in the installed Phaser (4.2.1, `node_modules/phaser/src/gameobjects/lights`): `lights.enable()`, `setAmbientColor(rgb)`, `addLight(x, y, radius, rgb, intensity, z)` and `removeLight(light)`, and `Light.setIntensity`, `setColor` and `setRadius`. The lit colour is the texture × (ambient + the lights' sum). `maxLights` is a shader constant read at boot and can't change at runtime. Phaser's own cull keeps the lights nearest the camera's centre and ignores their radius, so render picks lights by priority first.
- **Tint:** `setTint` with `TintModes.MULTIPLY` (game-object-components; already used for hit flashes and chill) carries the ambient on Low, and on props on Medium. Where a world object already has a tint, the mood tint multiplies with it.
- **Fog** is a soft blob texture baked once at boot, drawn as a `TileSprite` (lighting-capable, per the skill) at a depth just over the glows (0.3), so it sits over the ground and under telegraphs (`groundFx`, 0.5) and anything standing.
- **What Phaser 4 lacks, and the fallback:**
  - No per-object ambient: the ambient is one per scene. Fallback: the readability layer stays unlit, and lights reach it only through the additive light catch.
  - No Bloom filter (filters skill, gotcha 11): none is used. Glows stay the baked additive halos.
  - Filters and lighting are WebGL only: the Canvas renderer runs as Low. If tints don't draw there, it runs in plain daylight.
  - A camera colour grade (`ColorMatrix` filter) would also tint enemies, so it isn't used for moods.

## Performance budgets
- **Tick rate:** the sim still runs at 60 ticks a second (`TICK_RATE`). Lights, moods and fog are render-only.
- **Same game on every tier:** the same seed and commands give the same `getState()` on Low and High.
- **Frame time on Low:** in one page, an interleaved A/B (070's method) compares Low with a dev-only `?mood=off` flag that skips every mood, light and fog. It uses a Stormcrown fight with a ring 5 pack and the player firing. Low's mean frame time is at most 1.1× that of mood off, and its ticks per real second at least 0.9×.
- **Medium and High** frame times are measured in the same scene, in Region 1 and in the Rod Field, and reported in the PR, not asserted. Shaun judges them on his laptop at the playtest.
- **Chunk building:** ground blending adds at most 25% to a chunk's bake time (measured and reported). waypointSteady.spec.ts (057's no-stutter check) stays green.
- **newGameAfterQuit.spec.ts** passes unchanged, at the default Medium.

## Readability rules
- Everything in the readability layer is unlit and draws at full colour, as in Region 1.
- A telegraph's colours are the same in every region and tier.
- The screen wash never goes above 0.06 alpha. The vignette doesn't change.
- Fog draws under telegraphs and anything standing.
- The HUD camera is never lit or tinted. The HUD's pixels are the same in every region.
- With Flashes off, no light flashes or flickers more than ±15%, and the lightning ambient flash is off.

## Acceptance criteria
- [ ] **Moods:** `REGION_MOODS` has an entry for rings 0–5 with the values above. In the overworld on High, the ground's mean brightness drops region by region: Region 1, then the Hollows, the Emberworks and the Stormcrown.
- [ ] **Blending:** walking across a region boundary changes the ambient smoothly over the 4-tile band. No frame jumps more than a set step.
- [ ] **Lights:** on High, each source in the lights table places a light of its colour and radius when present. On Medium, rounds in flight place none. On Low, there are no Phaser lights and nothing has lighting on.
- [ ] **Budget:** lights in view never exceed 8 on Medium or 16 on High, and a higher priority light is never dropped for a lower one.
- [ ] **Light catch:** on Medium and High, an enemy beside a ley crystal shows the catch in cyan, at most 0.35 alpha. On Low there's none.
- [ ] **Lightning:** a rod strike in the Stormcrown flashes the ambient, and doesn't with Flashes off.
- [ ] **Readability:** in the Stormcrown on High, an enemy's body pixels are at least 90% as bright as the same enemy in Region 1. A telegraph's red is unchanged. The HUD's pixels match between Region 1 and the Stormcrown.
- [ ] **Ground:** terrain edges are blended, paths show wear, patches and cracks show per region, and no ground detail adds collision (passable tiles unchanged).
- [ ] **Setting:** Settings has a Graphics quality row (Low, Medium, High, default Medium). It is saved in `pipeline.settings`, survives a reload, applies at once, and a bad stored value reads as Medium.
- [ ] **Sim untouched:** the same seed and commands give the same `getState()` on Low and High. The lint rule that keeps the sim from importing render still passes.
- [ ] **Performance:** the Low frame-time and tick checks above pass. Medium and High timings, and the chunk bake time, are reported in the PR. newGameAfterQuit and waypointSteady pass.
- [ ] **Docs:** art.md describes the moods, the two layers, the lights and the quality tiers.
- [ ] **Review shots (docs/review/074):** the same spot in each region on High; the Stormcrown on Low, Medium and High; a ley line at night lighting a pack; a lightning strike; a blended terrain edge and a worn path; the Settings row.

## Data changes
- `src/data/moods.ts` (new): `REGION_MOODS` by ring, `MOOD_BLEND` (4 tiles), `LIGHTNING_FLASH`. `ROOM_MOOD` keeps the foundry's.
- `src/data/lights.ts` (new): `LIGHT_SOURCES`, `ROUND_LIGHTS` by round, `LIGHT_BUDGET` by tier, `LIGHT_CATCH`.
- `src/data/art/ground.ts`: `GROUND_BLEND` (edge depth and jitter, path wear, patch size and alpha, crack density per region).
- `src/data/settings.ts`: `quality` in `Settings` and `DEFAULT_SETTINGS`, `QUALITY_TIERS`, the row's words in `SETTINGS_TEXT`.
- `src/data/assets.ts`: a `fog` depth and the fog texture key in `FX_TEXTURES`.
- No palette, sim or save changes. `SAVE_VERSION` stays at main's.

## Out of scope
Everything in the rest of the art pass:
- 075: the wanderer's redesign, colour schemes, rarity trim and animation.
- 076: enemy and boss family looks, wind-ups, hit reactions, ley-mote deaths and directional rim light.
- 077: props, landmarks as set pieces, swaying grass and trees, water and ley motion, and weather (dust, ash, embers, rain, weather lightning).
- 078: ammo trails and impacts, and the particle set.
- 079: the foundry's mood and lights.
- 080: boss intros, the spawn shake, name cards and phase changes.
- 081: HUD polish.

Also out: automatic quality detection, normal maps, self-shadowing, sound.

## Test plan
- **Unit (tests/render, Vitest):**
  - mood lookup and blending by distance across each boundary;
  - the light picker (priority then distance, tier budgets, Low places none);
  - light catch alpha and falloff;
  - the lightning flash curve and the Flashes-off case;
  - settings parsing of `quality` (good, missing, bad);
  - ground blend helpers (the same hash gives the same edge, cracks only on listed terrains).
- **Data tests:** every mood, light and blend colour is a palette id; every ring 0–5 has a mood; the wash is ≤ 0.06.
- **Playwright:**
  - `ui().lighting` reports quality, the mood's ring and blend, lights in view by source, lit object count and fog layers;
  - region brightness order;
  - boundary blend;
  - lights per source and tier;
  - lightning on and off with Flashes;
  - readability pixel checks;
  - the Settings row, saved, reloaded and applied live;
  - same `getState()` on Low and High;
  - the Low A/B frame-time and tick probe.
- **Kept green:** newGameAfterQuit.spec.ts, waypointSteady.spec.ts, and the e2e files the change touches. The full suite runs in CI.
- **Review shots:** as listed in the criteria.

## Decisions in this draft
For Shaun's OK at the playtest; the conservative choice is what gets built.
- **Two layers:** the player, enemies, telegraphs, shots and items are never darkened. Lights reach them only as an additive catch.
- **The player** is in the readability layer for now; 075 can revisit it with the redesign.
- **Palettes:** the values in the moods table. Region 1's three rings share one sunny mood.
- **Blending:** the mood follows the camera's centre, blending over 4 tiles at each region's edge.
- **Medium** lights only the ground (props are tinted), to keep draw calls low; High lights props too.
- **Rounds in flight** carry light only on High, and plain arrows and bombs carry none. 078 owns ammo looks.
- **Default Medium**, no auto-detect, and the Canvas renderer runs as Low.
- **Fog** hugs the ground, under telegraphs.
- **Lightning** in 074 lights only today's strikes (rods and the Conductor). Weather lightning comes with 077. Both obey Flashes.
- **The foundry** keeps today's warm tint until 079.

## Open questions
None.

## design.md change (approved and applied)
Shaun approved updating design.md's art section to the new direction in chat on 2026-10-27, with the whole art pass. This wording replaces "Camera and art" in docs/design.md ("Tech and prototype scope"). It was applied in this spec's first commit:

> **Camera and art:** three-quarter top-down view in clean vector art, pushed further: smooth shapes with a thin ink outline, soft gradients lit from the top left with a rim light, glows and shadows. Each region has its own mood: Region 1 is sunny and bright like Realm of the Mad God, Stonefall Hollows is dusky, the Emberworks glow orange through smoke, and the Stormcrown is dark, lit by ley lines and lightning, like Hollow Knight. Glowing things (ley lines, fires, the tube's shots, the wanderer's face glow and bosses' attacks) light the ground and enemies near them, and a Graphics quality setting turns this down on slow laptops. Enemies and their wind-ups stay bright and readable in every region. Claude defines every sprite as shape data, and characters are rigs of parts posed by the game, with snappy, exaggerated animation (squash and stretch, anticipation), so a shot's weight shows in the body. The player is a hooded arcane ranger: an agile, light-armoured scout with ley-etched gear and a faceless cyan glow in the hood, carrying the tube like a minigun, its hose running into a brass tank on the back. The cloak's trim and glow show the rarity of the best armour worn. The camera shows 640×360 world px, and the wanderer stands about 42 px tall. Screen shake is used only in boss spawn animations. (Changed from HD pixel art on 2026-10-18, Shaun's approval, spec 016. Changed 2026-10-27, Shaun, art pass 074–081.)
