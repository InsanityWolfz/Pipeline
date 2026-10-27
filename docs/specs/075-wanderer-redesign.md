# 075: The wanderer redesign
status: approved

Approved by Shaun in chat, 2026-10-27, with the whole art pass (074–081); its plan is pre-approved.

Drafted from Shaun's art-pass interview (docs/brainstorm/2026-10-27-art-interview.md, answers 5–8, 10, 11 and 17) and the "pushed further" card of the style sample page he chose from (docs/art/style-test-2.html). This is art spec 2 of 8, built in order after 074. Shaun asked for no sample pages first ("Just build it"); he reviews the result at the playtest.

## Goal
The player becomes a hooded arcane ranger: an agile, light-armoured scout with ley-etched gear. It keeps the faceless cyan glow, the minigun tube, its hose and the brass back tank, and it stays about 42 px tall. The cloak's trim and glow show the rarity of the best armour worn. The body moves with snappy, exaggerated animation (squash and stretch, anticipation): a real running stride, recoil and barrel spin on every shot, a roll, hits and a KO that read at game size, and idle breathing.

## Design references
- docs/design.md "Camera and art" (2026-10-27 wording, on 074's branch): the arcane ranger, the rarity trim, the pushed vector look, snappy animation, no screen shake outside boss spawns.
- docs/design.md: the theme rule (a lost magical civilization: rune-carved stone, ley lines, brass and crystal, nothing modern).
- docs/art.md: "Style", "Outline", "Accent", "The wanderer" and "Vector sprites". The build rewrites "The wanderer" to match this spec.
- docs/specs/074-light-and-moods.md: the art-direction rules for the whole pass, the four region moods and the readability layer the player sits in.
- Earlier specs it builds on: 016 (the vector wanderer rig), 023 (the punch and the tube jab), 036 (gear, rarities and relics), 050 (A.1 matched arms facing forward; F the title's wanderer), 065 (the slow's wind swirl), 070 (the player silhouette behind props).

## The arcane ranger
The rig stays a rig of parts posed from sim state every frame (016), in three views (side, down, up), with the same box (72×68 world px, feet at 36,52), scale (0.66) and height: about 42 world px from boot sole to hood tip, standing. Light comes from the top left. Every part has the thin ink outline. Big shapes take a soft linear gradient from their light colour (top left) to their dark colour (bottom right), and the lit edges get a rim light (below), as on the style test's "pushed further" card.

Described facing right in the side view; the down view is the front, the up view the back.

- **Hood:** a close scout's hood, narrower and more pointed than today's. Its tip sweeps back into a short tail (about 7 style px) that trails behind the head and flicks with motion. The opening faces forward: a deep `hood-dark` hollow with the faceless cyan glow (unchanged: it pulses, and flares on each shot). A thin cyan ley seam runs up the crown from the brow to the tip. The opening's edge carries the rarity trim. The hood joins a short cowl over the shoulders.
- **Cape:** shorter, for agility. It hangs from the shoulders behind the body and ends at the back of the knees, not the ankles, so the legs read in every pose. Its hem is cut into two tails with shallow points, the near tail a little longer. The hem carries the rarity trim. A ley gem clasp at the throat shows the trim's colour and glow. The cape trails behind when running and flaps in the wind of a shot.
- **Jerkin:** a fitted leather jerkin to mid-thigh, in quilted panels, with a high collar under the cowl and a split skirt (a front and a back flap) so the stride is free. Cyan ley-etched rune lines (thin, flat strokes) run down the two chest panels and along the skirt's edge. Under it, bone-pale (`robe`) sleeves show at the shoulder.
- **Bracers and gloves:** leather bracers from wrist to elbow on both forearms, each with a cyan etched line and a brass rivet. Fingerless leather gloves. The wide rust sleeve of today's near arm is gone: the arms are slim.
- **Belt and rune strap:** a wide belt with today's cyan ley buckle and a pouch on the near hip. The ranger cue is a rune bandolier: a strap from the far shoulder to the near hip carrying a row of four small brass-capped ley vials, each with a cyan glint (seen across the chest in the down view, as a diagonal in the side view, over the back in the up view). On the far hip a short leather quiver holds three carved rune stakes, tips up and back (seen in the side and up views).
- **Legs and boots:** slim dark breeches with a wrap below the knee. Legs are two segments now (thigh and shin) so knees bend. Soft, close ranger boots to mid-calf, with a folded cuff, two cross straps and a slightly pointed toe, lighter than today's blocky boots.
- **Back tank:** the brass tank with its cyan window and rising bubble stays, but it is slung higher, between the shoulder blades, over the cape, in a leather harness: two shoulder straps over the jerkin that cross the bandolier, and a waist strap. It bounces in the harness as the wanderer moves.
- **Hose:** the ringed cyan hose stays. It leaves the tank's bottom outlet, runs under the near arm round the hip, passes through a brass clip on the belt (so it swings but doesn't flail), and enters the tube's rear.
- **Tube:** its silhouette stays: the brass housing, the cyan barrel, four rings that light in order as it attunes, the muzzle. It is still held at the hip like a minigun, the near hand on the rear grip and the far hand on the front grip. New: three thin etched flutes along the barrel that show it spinning, and a leather sling from the housing to the near shoulder.
- **Theme check:** cloth, leather, brass, carved rune stakes and ley glass only. No zips, no modern buckles, no metal plate on the body.

### Rim light (shape data)
A new optional shape style, `rim: { color, width, offset }`: render clips to the shape and strokes its own path shifted down and right by `offset`, so a band of `color` shows along the shape's top and left edges only. The wanderer uses `rim-light` (new, a warm near-white) at about 0.55 alpha, width 1.2 style px, offset 1.2 style px, on the hood, cowl, cape, jerkin, sleeves and tank. It is static (the art's top-left light), not a dynamic light. It is general shape data, so 076 can use it for enemies.

## Colour schemes
A scheme sets the cloth (hood, cowl and cape) and the jerkin, each as a dark, mid and light id. Everything else is fixed in every scheme: the leathers (`leather-dark`, `leather`, `strap`), the bone sleeves (`robe`), the brass (`brass-dark`, `brass`, `brass-light`), the ley accent (`cyan-deep`, `cyan`, `cyan-glow`), the hood's hollow (`hood-dark`) and the rim (`rim-light`). Schemes are data (`WANDERER_SCHEMES`); the default is one line (`WANDERER_SCHEME`).

The player is drawn in 074's readability layer, at full daylight colour in every region, while the ground darkens in the Hollows, the Emberworks and the Stormcrown. So the risks are hue against Region 1's bright grass and dirt, and hue and value against each darker region's own colour. No scheme uses a threat's colour: telegraph red (`danger`, `hit-red`), wisp violet, or fire orange.

| Scheme | Cloth (dark, mid, light) | Jerkin (dark, mid, light) | New palette entries | Rationale |
| --- | --- | --- | --- | --- |
| **A. Ley cobalt (recommended, built as the default)** | `cobalt-dark`, `cobalt`, `cobalt-light` | `leather`, `hide`, `hide-light` | `cobalt-dark` #1f2d66, `cobalt` #3456b4, `cobalt-light` #6a8ee4, `hide` #9a6a40, `hide-light` #c8955f | A saturated blue is the one hue no ground, fire or threat uses: it is the complement of the Emberworks' orange and Region 1's grass and dirt, it stays more saturated than the Hollows' grey-blue dusk and brighter than the Stormcrown's dark, it sits with the cyan tube and etching as one ley family, and gold, cyan and violet trim all read on it. |
| B. Ember rust (today's colours) | `rust-dark`, `rust`, `rust-light` | `leather`, `hide`, `hide-light` | (shares `hide` and `hide-light` with A) | Closest to the wanderer players know and the title art, and the warm complement of the cyan; strong on grass and the cool Hollows and Stormcrown, weakest in the Emberworks, where it shares the rust light and the fire's hue and leans on the outline and rim. |
| C. Pale bone | `bone-dark`, `bone`, `bone-light` | `leather-dark`, `leather`, `strap` | `bone-dark` #a39783, `bone` #d9d0be, `bone-light` #f4efe3 | A light cape makes the wanderer the brightest thing in the three darker regions and stands out on grass; weakest on Region 1's sand and dirt paths, and the white hit flash changes it less. |

Plus `rim-light` #ffe6c4 for every scheme. All new entries go in `src/data/palette.ts` and art.md's palette table.

- With no armour worn, the hem and hood edge are the cloth's light id, with no glow.
- Shaun picks at the playtest. To compare in the preview build, `?scheme=cobalt`, `?scheme=rust` or `?scheme=bone` in the URL swaps the scheme at boot (render only, every build). The contact sheet shows each scheme, and the review shots show each scheme in each region mood.
- The title screen's wanderer (050 F) uses the chosen scheme.

## The rarity trim
- **The rule:** the trim shows the rarity of the best gear piece worn, over all four slots (helm, body, boots, trinket). Best follows a new `RARITY_ORDER` in `src/data/gear.ts`: common, fine, rare, relic (lowest to highest). Nothing worn means no rarity.
- **The sim decides it:** `wornRarity(state): Rarity | null` in `src/sim/worn.ts` reads `gear` and `equipped`. `getState()` reports it as `wornRarity`. Render reads that and never ranks rarities itself. `SimState` doesn't change, so `SAVE_VERSION` stays.
- **The look (data, `WANDERER_TRIM`):** the same colours and glows as the bench's rarity frames (036, `RARITIES` and `src/data/art/gear.ts`), so the body and the bench agree.

| Worn | Trim colour | Glow | Extra |
| --- | --- | --- | --- |
| nothing | the scheme's cloth light | none | none |
| common | `rock-light` | none | none |
| fine | `cyan` | `cyan`, blur 2 | none |
| rare | `gold-trim` | `gold-trim`, blur 2.5 | a slow pulse (0.8 to 1, about 2 s) |
| relic | `wisp-light` | `wisp`, blur 3.5 | the pulse, and a shimmer that runs along the hem about once a second |

- **Where it shows:** the cape's hem, the hood opening's edge and the throat clasp gem, in every view (the up view shows the hem and the hood's back edge).
- **Armour on the body is the trim only.** The body tint by weight from 010 and 036 (`ARMOR_TINTS`: light green, heavy grey, Featherplate as light) leaves the sprite, and `ARMOR_TINTS` goes if nothing else uses it. The hit flash (white flicker) is unchanged.
- The trim changes on the frame `wornRarity` changes.

## Animation
Snappy and exaggerated: poses snap in fast and settle with a small overshoot, contacts squash, releases stretch, and big moves get a short anticipation.

- **Squash and stretch** is a new pose value, `squash` (positive squashes, negative stretches). The body scales around the feet, keeping its area: height × (1 − squash), width × (1 + squash). Feet stay planted.
- **Anticipation is visual only.** It never delays a shot, a roll or a punch: the sim's timings, hitboxes (`FEET_BOX`) and inputs don't change. Where the sim acts on the first tick, the anticipation is compressed into that action's opening frames.
- **The motion is a pure function** in render (`wandererMotion`): sim-derived inputs and clocks in, a pose out. PlayerView keeps the clocks; the contact sheet and the tests sample the same function at fixed times.
- **No screen shake.** Nothing in the player's animation shakes the camera. `SHAKE_ON` stays false; 080's boss spawns are the only shake.
- All numbers below are starting values in `WANDERER_MOTION` (style-test px, radians, 60 Hz frames), tuned by eye.

### The four areas
1. **Run and walk.** The game has one move speed: moving is the run; moving while firing is a braced strafe walk.
   - **Run cycle:** keyed to distance (today's 0.32 rad per world px), so feet don't slide. Contact, down, passing and up for each leg: the passing knee bends up to 0.9 rad, the trailing foot kicks back and lifts 3.5 px. The body bobs 1.5 px, lowest just after contact, with squash 0.06 there and stretch 0.04 at passing. The side view leans 0.12 rad into the run.
   - **Cape trailing:** the cape's angle grows with speed, to 0.35 rad at full run, plus a flap, and its tails lag the body by about a quarter cycle. The hood tail follows the same way, smaller.
   - **Tank bouncing:** the tank rides 1.2 px up and down in its harness, a quarter cycle behind the body's bob, squashing 0.08 as it lands. The hose swings with it.
   - **Strafe walk (firing and moving):** half the stride and bob, no forward lean (the firing brace wins), the cape flapping in the shot wind.
   - **Stopping:** one settle (a 0.04 squash, then rest) as the stride ends.
2. **Firing.**
   - **Brace:** on the first frame of firing, a quick dip (3 frames, 2.5 px) before the body settles into today's brace (wider stance, crouch, lean back) with an overshoot. The first shot still leaves on its tick.
   - **Recoil on each shot:** the tube kicks back along its axis (today's 3.5 px), the shoulders shove back 1 px, and the body squashes 0.06, recovering over 6 frames through a 0.02 stretch.
   - **Barrel spin:** the barrel's three flutes roll round it. The spin ramps up over 15 frames of firing and winds down over 30 frames after firing stops.
   - **Muzzle flash:** each shot draws a 3-frame flash at the muzzle in `cyan-glow` and `cyan` with a glow: a four-point star at full size, then smaller and turned 45°, then a fading ring. Odd and even shots alternate the star's angle. 078 adds per-ammo sparks; 074's muzzle light is unchanged.
   - **Hose pulse:** each shot sends a bright `cyan-glow` bulge (1.4× the hose's width) from the tank to the tube over 150 ms, so rapid fire shows a stream of pulses. The tank window flares as each leaves.
   - **Face glow:** flares on each shot (unchanged).
3. **Roll, hit and KO.**
   - **Roll** (18 ticks, unchanged in the sim): ticks 1–2 tuck (squash 0.15), the tube pulled in to the chest. Side view: a full forward somersault about the body's centre over ticks 3–15. Down and up views: a tucked tumble (squash 0.25, wobbling ±0.3 rad), the cape wrapping round. Ticks 16–18 land (squash 0.1) and stretch back out. Today's ghost smear stays.
   - **Hit** (the 8 pose ticks of `PLAYER_HIT_FX`): on the first frame the body snaps back (lean 0.35 rad away from the aim, squash 0.12), and the hood tail and cape flick forward. Then it recovers with an overshoot. The face glow dips to 0.4 for 4 ticks. The white flicker is unchanged.
   - **KO** (the 60 ticks of `DYING_TICKS`): the wanderer turns side-on (see Decisions). Ticks 0–10 stagger back (lean −0.4, stretch 0.05, the tube dipping). Ticks 10–24 the knees buckle to a kneel. Ticks 24–36 it topples back to lying flat, landing with a squash of 0.15 on tick 36, and the tube drops from its hands to the ground beside it. From tick 36 it lies still while the face glow gutters out (flickering off by tick 48). It fades over the last third, as today.
4. **Idle life:** breathing (the chest and hips rise 0.8 px and back every 2.4 s, with a 0.02 squash), the cape and hood tail swaying ±0.05 rad with the tails lagging, the face glow pulse and the tank bubble (unchanged).

### Every pose to redo, per view
Everything below is redrawn in the new design. Each is a cell or a strip of frames on the contact sheet, sampled from `wandererMotion`.

| Pose or animation | Side | Down (front) | Up (back) |
| --- | --- | --- | --- |
| Idle breath (4 frames) | yes | yes | yes |
| Run cycle (8 frames): stride, cape trail, tank bounce | stride along x, cape and hood tail trailing back | alternating lifts with knee bends, cape swinging behind both sides, tank bobbing over the shoulders | alternating lifts, cape and tank in front of the eye, tank bouncing |
| Strafe walk (4 frames) | yes | yes | yes |
| Stop settle (2 frames) | yes | yes | yes |
| Firing brace (3 frames: dip, overshoot, held) | yes | yes | yes |
| Shot recoil (4 frames: kick and squash to recovered) | yes | yes | yes |
| Barrel spin (3 phases) | yes | yes | yes (tube seen past the body) |
| Muzzle flash (3 frames) | yes | yes | yes (flash above the head) |
| Hose pulse (3 frames along the hose) | yes | yes | yes |
| Roll (6 frames) | somersault | tumble toward the camera | tumble away |
| Hit (3 frames) | yes | yes | yes |
| KO (6 frames) | yes (all KOs play side-on) | turns side-on on its first frame | turns side-on on its first frame |
| Dormant tube | yes | yes | yes |
| Attuning (rings lighting) | yes | yes | yes |
| No tube (empty-handed) | yes | yes | yes |
| Tube jab (023), with a stretch on the thrust | yes | yes | yes |
| Punch (023), with a stretch on the thrust | yes | yes | yes |
| Facing left (mirrored) | idle, run, shot, hit, KO | n/a | n/a |
| Rarity trim: none, common, fine, rare, relic | idle | idle | idle |
| Schemes A, B, C | idle | idle | idle |

The title's pose (050 F: side-on, breathing, the hose swaying) is the side idle in the new design, with its existing motion.

## Readability
- The player stays in 074's readability layer: never darkened by a mood. Lights reach it only through 074's light catch.
- At game size (1 world px per px), the hit and the KO read as what they are: the hit's hood moves at least 3 world px from idle on its first frame, and the KO's last frame is lying down (its drawn bounds at least 1.4× as wide as tall).
- 070's silhouette behind props draws the new frame, unchanged in its rules.
- 065's slow swirl still circles the legs.

## Acceptance criteria
- [ ] **Design:** the side, down and up views are the arcane ranger above: the pointed hood with its tail, the knee-length split cape, the etched jerkin, slim arms with bracers, the rune bandolier and hip quiver, two-segment legs, ranger boots, and the harnessed tank, clipped hose and slung tube. The face glow, tube, hose and tank keep their colours and their dormant, attuning and lit states.
- [ ] **Size:** standing idle, the drawn height is 40–44 world px in the side and down views. The box, anchor and scale are unchanged.
- [ ] **Shading:** big shapes use gradients, and the `rim` style draws a band only along a shape's top and left edges (a unit test on its geometry). Every part keeps the ink outline.
- [ ] **Schemes:** `WANDERER_SCHEMES` holds A, B and C with the ids above. The default is A. Every id is in the palette, and art.md's table mirrors the new entries (the existing palette test). `?scheme=` swaps the scheme and a bad value reads as the default.
- [ ] **Trim from state:** `wornRarity` is null with nothing worn, the piece's rarity with one, the highest by `RARITY_ORDER` with several (a relic beats a rare), and it drops back when the best piece comes off. `getState().wornRarity` reports it. Render takes the rarity only from state.
- [ ] **Trim changes with rarity:** in a Playwright test, wearing a common, then a fine, a rare and a relic piece from the sandbox stash changes `ui().player.trim` to each, and the hem's pixels match that rarity's colour. Taking everything off shows the plain hem. Wearing a heavy body piece no longer tints the body.
- [ ] **Run:** a unit test on `wandererMotion` shows the stride keyed to distance, the body lowest just after contact with the squash there, the cape angle growing with speed, and the tank's bob lagging the body's by about a quarter cycle.
- [ ] **Firing:** unit tests show the brace dip on the first frames, recoil and squash recovering within 6 frames, the spin ramping up over 15 frames and down over 30, a 3-frame muzzle flash per shot, and a hose pulse travelling tank to tube in 150 ms.
- [ ] **Roll, hit, KO:** unit tests show the side roll turning a full circle over the roll, the hit snapping on its first frame and back within the 8 pose ticks, and the KO lying flat by tick 36. In a Playwright test at game size, the hit's hood moves at least 3 world px and the KO's last frame is at least 1.4× as wide as tall.
- [ ] **Idle:** the breath repeats every 2.4 s and the cape sways while standing still.
- [ ] **Anticipation never delays:** the same seed and commands give the same `getState()` as before the change, apart from the new `wornRarity` field, and the same with each scheme.
- [ ] **No screen shake:** `SHAKE_ON` stays false, and the camera doesn't move while the player fires, rolls, is hit or is KO'd.
- [ ] **Contact sheet:** /sheet.html shows every pose and strip in the table above, for each view, plus the trim and scheme rows. A Playwright test checks each section's labels against `sheetPoses` and that the page logs no console errors.
- [ ] **Existing tests hold:** the rig's pose tests (tests/data/art.test.ts "the wanderer rig": the draw order names only real parts or dynamic pieces, the window and trail parts exist, every view has the tube and hose, the up view has no face glow), titleMotion.test.ts, playerFacing.test.ts, art.spec.ts and the title test in playtestFixes2.spec.ts pass, changed only where a part is renamed.
- [ ] **Performance:** the wanderer's draw time per frame is measured in the page and reported in the PR. 074's Low frame-time probe and newGameAfterQuit.spec.ts stay green.
- [ ] **Docs:** art.md's "The wanderer" describes the arcane ranger, the schemes, the trim, the rim style and the animation. The palette table has the new entries.
- [ ] **Review shots (docs/review/075):** e2e screenshots of the wanderer idle, running and firing in each region mood (Region 1, the Hollows, the Emberworks, the Stormcrown), with scheme A and then B and C. Also: each rarity's trim; a roll, a hit and a KO at game size; and the contact sheet's wanderer sections at 4×.

## Data changes
- `src/data/palette.ts` (and art.md's table): `cobalt-dark`, `cobalt`, `cobalt-light`, `hide`, `hide-light`, `bone-dark`, `bone`, `bone-light`, `rim-light`.
- `src/data/art/types.ts`: the `rim` shape style (colour, width, offset), and its colour in `inksOf`.
- `src/data/art/wanderer.ts`: the new parts per view, split into more files if it passes about 300 lines (for example `wandererParts.ts`); new dynamic tokens as needed (cape, hood tail, trim, muzzle flash, hose pulse); two-segment legs in `WANDERER.rig`; `WANDERER_SCHEMES`, `WANDERER_SCHEME` and `WANDERER_TRIM`.
- `src/data/art/wandererMotion.ts` (new): `WANDERER_MOTION`, the numbers in "Animation". `WANDERER_FEEL` keeps what still applies.
- `src/data/gear.ts`: `RARITY_ORDER`.
- `src/data/hudLayout.ts`: `ARMOR_TINTS` removed if unused.
- Sim: `wornRarity` in `src/sim/worn.ts`, and `wornRarity` in the summary. No `SimState` change, so no `SAVE_VERSION` bump.

## Out of scope
- 076: enemies and bosses (their looks, wind-ups, hit reactions, deaths and directional rim light).
- 078: ammo trails and impacts, and the particle set (including per-ammo muzzle sparks).
- 081: the HUD (the tablets, the tube slot, the gear panel and its frames).
- Also out: the moods and lights (074, unchanged here), the foundry (079), boss intros and their shake (080), helm, boot or body-armour models on the body, a scheme picker in Settings, sound, and any change to movement, firing, roll or hit timing in the sim.

## Test plan
- **Sim (tests/sim, Vitest):** `wornRarity` with nothing, one piece, several (relic over rare, rare over fine) and after unequipping; the summary field.
- **Data (tests/data):** every scheme, trim and motion colour is a palette id; each scheme has all six ids; `WANDERER_TRIM` covers every `Rarity` and none; `RARITY_ORDER` lists every rarity once; the rig tests above.
- **Render (tests/render, Vitest):** `wandererMotion` at fixed times for each of the four areas (the run, firing, roll, hit, KO and idle criteria); the squash keeping area and the feet planted; the `rim` geometry; `?scheme=` parsing.
- **Playwright:**
  - `ui().player` reports `{ view, anim, scheme, trim, squash }`;
  - the trim walk through the rarities in the sandbox stash, with hem pixel checks, and the heavy body piece with no tint;
  - the size check and the game-size hit and KO bounds;
  - the contact sheet's sections and labels, with no console errors;
  - the camera staying still through firing, a roll, a hit and a KO;
  - the same `getState()` with each scheme;
  - the review shots, staged per region as 074's are.
- **Kept green:** art.spec.ts, playtestFixes2.spec.ts (the title), newGameAfterQuit.spec.ts, 074's Low probe, and the e2e files the change touches. The full suite runs in CI.

## Decisions in this draft
For Shaun's OK at the playtest; the conservative choice is what gets built.
- **Colour scheme:** A, Ley cobalt, is the default. B (today's rust) and C (pale bone) are one data line away, and `?scheme=` shows them in the preview.
- **Best armour** means the highest rarity among all four worn slots, a relic counting above a rare. With nothing worn, the hem is plain, with no glow.
- **Trim colours** are the bench's rarity frame colours and glows, so the body and the bench agree. Rare pulses; a relic pulses and shimmers.
- **The trim** shows on the cape hem, the hood edge and the throat gem.
- **The weight tint goes:** light and heavy body pieces (and Featherplate) no longer tint the body. Armour shows only as the trim.
- **The player stays in the readability layer** (074): never darkened by a mood.
- **The KO always plays side-on**, facing the side the aim was on (right when level), so the fall reads the same in every view.
- **The roll** is a somersault side-on and a tucked tumble facing down or up.
- **Anticipation is visual only:** sim timings are untouched, so the first shot, the roll and the punch still act on their first tick.
- **Run and walk:** the one move speed is the run cycle; moving while firing is the braced strafe walk.
- **The rim light** is static, from the top left, not driven by 074's lights.
- **The tube's shape stays.** It gains the spin flutes and a sling.
- **The muzzle flash** is drawn on the tube here; 078 adds per-ammo sparks.
- **Ranger cues:** a chest bandolier of four ley vials and a hip quiver of three rune stakes.
- **The cape** ends at the back of the knees, in two tails.

## Open questions
None.
