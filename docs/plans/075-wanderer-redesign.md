# 075 plan: the wanderer redesign

Plan for docs/specs/075-wanderer-redesign.md on `claude/075-wanderer-redesign` (InsanityWolfz/Pipeline#92).
A plan file because the spec touches the sim (the worn rarity), data (palette, gear, the rig, schemes, trim, motion
numbers), the shape renderer (the rim style), the rig, PlayerView, the title and the contact sheet, and passes 300
lines by a long way. Each slice lists its tests first and is committed with `npm run check` green.

## Findings that shape the plan
- **The wanderer is drawn live, not baked.** PlayerView redraws the rig into one canvas texture every frame
  (`drawWanderer`); every other sprite is baked at boot. That stays: the rig is posed from sim state every frame (016).
  The new art adds gradients, a rim (a clip and a stroke) and the trim's glow, so the draw time per frame is measured
  in the page (`ui().player.drawMs`, a running mean) and reported in the PR. Boot is unchanged: nothing new is baked.
- **Today's pose eases in PlayerView** (`nextPose`, one 20% step a frame toward a target). The spec wants a pure
  `wandererMotion` with clocks in and a pose out, so PlayerView keeps only clocks: the sim tick when firing started and
  stopped, the last shot's tick and the shot count, when moving started and stopped, the distance walked, and real ms
  for idle life. Roll, hit and KO read the sim's own counters (`rollTick`, `hurtTicks`, `dying`). Every action clock
  counts sim ticks (60 Hz), so step-driven tests and the contact sheet sample the same frames.
- **Frames.** The rig moves to its own small affine helper, so a point can be carried between the feet frame, the
  figure (squash, roll spin, KO fall) and the torso (lean): the hose runs from the bouncing tank to the tube's rear in
  one frame, and the KO's dropped tube lies in the feet frame while the body falls.
- **Schemes and trim are data functions.** `wandererViews(scheme, trim)` builds the three views' parts from a scheme's
  six cloth and jerkin ids and a trim look; render caches one per (scheme, trim). `WANDERER.views` stays as the default
  scheme with no trim, so tests/data/art.test.ts's rig tests hold. The rarity pulse and the relic's shimmer are drawn
  by the rig over the trim parts (`trimParts`), from pose values.
- **Swinging parts are chains.** A view names joints (cape, cape tails, hood tail, skirt flaps, tank) and which chain
  each part hangs on, so the cape's tails lag its top, and the tank bounces in its harness, from pose channels.
- **Legs become two segments** solved by two-bone IK from the hip to a foot target. The run cycle places the feet
  (planted through the stance, a kick back and lift in the swing), so knees bend where the feet put them.
- **The worn rarity** is a sim query over `gear` and `equipped` (src/sim/worn.ts) and a top-level `wornRarity` in
  `getState()` (PlayerSummary). `SimState` doesn't change: **SAVE_VERSION stays**.
- **The weight tint goes:** `bodyLook` and the MULTIPLY tint leave PlayerView; `ARMOR_TINTS` has no other user, so it
  goes from hudLayout.ts and look.test.ts.
- **074 isn't merged.** Nothing here imports its code. The player keeps drawing as today (one image at its feet
  depth), so 074's readability layer takes it as it is. Region review shots are staged in the four regions without
  074's moods; they are retaken after 074 lands if Shaun wants them with moods (raised).

## Slices

### 1. Sim and data first (tests first)
- tests/sim/wornRarity.test.ts: null with nothing worn; one piece's rarity; a relic over a rare, a rare over a fine;
  drops back when the best comes off; `summarize().wornRarity`.
- tests/data/wanderer.test.ts: `RARITY_ORDER` lists every rarity once, lowest first; every scheme has its six ids
  and they are palette ids; the default is cobalt; `WANDERER_TRIM` covers every rarity and none, its colours match
  `RARITIES`; every colour in every scheme's and trim's parts is a palette id; motion numbers are sane.
- tests/data/art.test.ts keeps "the wanderer rig" and the palette/art.md test (which now needs the nine new rows).
- Code: `RARITY_ORDER` (gear.ts), `wornRarity` (worn.ts), the summary field, palette entries and art.md rows.

### 2. The rim style
- tests/render/rim.test.ts: `rimPath` shifts a shape by `offset` down and right, so on a rect its top and left edges
  fall inside the shape (the band shows) and its bottom and right edges fall outside (clipped away); `inksOf` names
  the rim colour.
- Code: `rim` in `ShapeStyle` (types.ts), drawn in draw.ts by clipping to the shape and stroking `rimPath`.

### 3. The arcane ranger's parts and rig
- Data: src/data/art/wanderer.ts (types, rig, limbs, schemes, trim, `wandererViews`), wandererSide.ts,
  wandererFront.ts, wandererBack.ts (one view each), wandererTube.ts (the tube with flutes and sling).
- Render: wandererRig.ts (the draw order and parts), wandererBody.ts (legs, arms, hose, pulses), wandererFx.ts (the
  flutes, muzzle flash, trim pulse and shimmer), affine.ts.
- Drawn with /sheet.html at 4× and revised until each pose reads at game size (screenshots each round).

### 4. Motion
- tests/render/wandererMotion.test.ts, at fixed clocks: stride keyed to distance (feet planted through the stance),
  the body lowest just after contact with the squash there, the cape growing with speed, the tank's bob a quarter
  cycle behind; the brace dip, recoil and squash back within 6 frames, spin up over 15 and down over 30, the 3-frame
  flash with alternating angles, a hose pulse tank to tube in 150 ms; the side roll turning a full circle, the hit
  snapping on its first frame and back within 8 ticks, the KO flat by tick 36; the breath every 2.4 s and the sway;
  squash keeping area with the feet planted; the stop settle.
- Data: src/data/art/wandererMotion.ts (`WANDERER_MOTION`); `WANDERER_FEEL` keeps aim, facing band, smear and glow.
- Render: src/render/vector/wandererMotion.ts (pure), PlayerView keeps the clocks and calls it.

### 5. Schemes, trim, title, sheet and hooks
- tests/render/wandererScheme.test.ts: `?scheme=cobalt|rust|bone` parse, a bad or missing value reads as cobalt.
- PlayerView: the trim from `getState`'s rarity (render never ranks), no weight tint, `ui().player` =
  `{ view, anim, scheme, trim, squash, hood, bounds, drawMs }`.
- TitleWanderer: the side idle in the chosen scheme with its existing motion.
- Contact sheet: one section per table row per view (strips sampled from `wandererMotion`), plus facing left, trims and
  schemes; `sheetSections` feeds both the page and the e2e test.

### 6. Playwright
- tests/e2e/wanderer.spec.ts: `ui().player`'s fields; the trim walk common → fine → rare → relic from the sandbox
  stash with hem pixel checks, all off shows the plain hem, a heavy body piece leaves no tint; standing height 40–44
  world px side and down; the hit's hood moves ≥ 3 world px, the KO's last frame ≥ 1.4× as wide as tall; the camera
  holds still (no shake) through firing, a roll, a hit and a KO; the same `getState()` with each scheme and with none.
- tests/e2e/wandererSheet.spec.ts: the sheet's wanderer sections and labels match `sheetSections`, no console errors,
  and a rim pixel check.
- tests/e2e/wandererShots.spec.ts (REVIEW_SHOTS=1, docs/review/075): the contact sheet's wanderer sections at 4×;
  idle, running and firing in Region 1, the Hollows, the Emberworks and the Stormcrown with schemes A, B and C; each
  rarity's trim; a roll, a hit and a KO at game size.
- Kept green: art.spec.ts, playtestFixes2.spec.ts (title), newGameAfterQuit.spec.ts, silhouette and slow-swirl
  specs, titleMotion.test.ts, playerFacing.test.ts.

### 7. Docs
- art.md: "The wanderer" rewritten (ranger, schemes, trim, rim, animation), the rim in "Vector sprites", the nine
  palette rows. The spec gets "Raised after the build" and Results.

## Risks
- **Draw cost.** Gradients and rim clips per frame; the trim glow's shadow blur. Measured; if it costs too much, the
  rim is drawn only on the big shapes and the glow only on the hem.
- **Art quality at 42 px.** Detail (vials, rivets, flutes) must not turn to noise: the sheet is checked at 1× too.
- **The strafe walk** at half stride keyed to distance would slide the feet; it keeps them planted by stepping at
  twice the cadence (half stride, same ground per cycle). Raised.
