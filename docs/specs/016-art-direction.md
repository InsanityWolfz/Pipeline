# 016: Art direction
status: approved

Approved by Shaun, 2026-10-18 ("I approve all"), for an unattended run.

## Goal
The game moves from 32-pixel grid art to clean vector art in bright daylight colours. The first pieces are the player and everything in combat. The player is a hooded wanderer in a rust cloak, with a cyan ley glow for a face. They hold the tube like a minigun, and its hose runs round them into a brass backpack tank. Firing visibly strains them and slows their walk.

## Design references
- docs/design.md: "Tech and prototype scope", Camera and art (rewritten in this spec, approved by Shaun 2026-10-18)
- docs/prototype.md: "Camera and art" and "Tech" (rewritten in this spec, approved by Shaun 2026-10-18), "Crude animations needed"
- docs/art.md: rewritten for vector art in this spec
- The style test: `docs/art/style-test.html`, published at https://claude.ai/artifact/J3ssrCe2V7mHMHyVuEnfxx (round 3 is the approved look)
- Shaun's notes, 2026-10-18:
  - Style C, clean vector.
  - Bright daylight, like RS3 or RotMG colours.
  - The environment in the style test looked good.
  - The player wears a rust cloak and a hood. A cyan glow that matches the tube replaces the face, and the hood opening is a little larger.
  - The tank is brass for now.
  - Leather gloves.
  - Firing slows the walk.
  - Scope: the pipeline, the player and combat.

## Acceptance criteria

**Pipeline (render, data)**
- [ ] Vector sprites are typed shape data in `src/data/art/`:
  - shapes: ellipses, rounded rects, and paths with lines and curves
  - fills from palette ids, including linear and radial gradients
  - an outline flag
  - a glow
  - named parts with a pivot each
- [ ] Render code draws the shapes into textures at boot, at the screen's scale, so they stay sharp at any window size. No new dependency.
- [ ] Adding or changing a sprite is a data change. No render code per sprite, except the player and enemy rigs that pose parts from sim state.
- [ ] Outlines are one shared width in `outline` (#1e1a2e), as in the style test, on characters, enemies, projectiles' bodies and props. Glows and particles have no outline.
- [ ] The game draws at the window's real resolution with smoothing on. The camera still shows the same 640×360 area of the world, so world units, tiles and the sim don't change.
- [ ] The pixel sprites that remain (rooms, foundry pieces, items, HUD) use nearest-neighbour filtering, so they stay crisp at the new resolution until later specs replace them.

**Palette (data)**
- [ ] A new daylight palette in `src/data/palette.ts`, covering at least the style test's colours: grass, dirt, water, rock, wood, leaves, ley cyan, brass, the rust cloak, straw and ember.
  - Every vector shape colours from it by id. A test checks that every id used exists.
  - The old 24-colour palette stays, renamed as the pixel palette, for the remaining grid sprites.

**The wanderer (render, data)**
- [ ] The player is a rig of parts:
  - boots and shins
  - a trailing back cloak
  - the brass backpack tank with a ley window
  - the body cloak, with a gold-trimmed hem over a pale robe, a belt and a ley buckle
  - a shoulder mantle with a gold clasp
  - a pointed hood
  - wide sleeves with dark leather gloves
  - the ringed cyan hose
  - the tube
- [ ] The hood opening is larger than in style test round 2. It holds no face, only a cyan radial glow in the tube's colours that pulses gently and flares on each shot.
- [ ] Three facings, as today: down, side (mirrored for left), and up.
  - Down shows the hood glow.
  - Up shows the back of the hood and the tank.
  - The tube always points along the aim.
- [ ] Poses from sim state:
  - Idle: a breathe and a cloak sway.
  - Walk: a stride and the hem swinging.
  - Roll: tucked, with a smear.
  - Firing:
    - The stance widens and the body crouches and leans back from the hips.
    - Each shot shoves the body back and kicks the barrel.
    - The cloak flaps harder, and the hose pulses toward the tube.
  - Hit: a flash and a flinch.
  - Death.
- [ ] The tube's states keep their meaning:
  - dormant on its stone: rings dark, no glow
  - attuning: the rings light up one by one
  - attuned: rings lit, with a glowing muzzle
  - The hose and tank window show cyan only once the tube is attuned.

**Weight (sim, data)**
- [ ] While the fire button is held and the tube is firing, walk speed is multiplied by `firingWalkMultiplier` (starting value 0.7).
  - "Firing" means not dry-firing, not in the foundry, and not during a roll.
  - It stacks with heavy armor by multiplying. Rolls are unaffected.
  - Releasing fire restores full speed on the next tick.

**Combat art (render, data)**
- [ ] Projectiles in vector:
  - the arrow, with its cyan portal trail from the style test
  - the bomb, with its arc shadow
  - the ley bolt
  - the Wisp orb
- [ ] Effects: muzzle flash, fire burst, burn flame, pickup sparkle and deposit swirl. The particles from 014 are recoloured to the daylight palette.
- [ ] Husk: the straw-bound husk with ember eyes from the style test. Poses are idle, walk, wind-up, swipe, hit and death, in three facings.
- [ ] Wisp and Pylon Warden are redrawn in vector with all their current poses in three facings. Their designs are drafts for Shaun's review, kept to the theme rule.
- [ ] Every telegraph stays at least as readable as today: the Husk swipe arc, the Wisp charge glow and the Warden slam circle.

**Docs and process**
- [ ] `docs/art.md` is rewritten for vector art: style, light, outline, palette table, how shape data and rigs work, and the review steps.
- [ ] `docs/design.md` and `docs/prototype.md` are updated from pixel art to clean vector art (done in this spec's branch, approved by Shaun).
- [ ] `.claude/commands/sprite.md` is updated for vector shape data. Drawing a vector sprite renders a 4× review image of it, as the pixel pipeline did.

**Rules unchanged**
- [ ] No other sim rule changes. Every existing unit and e2e test passes. The only updates are for the new walk multiplier and for renamed asset keys.

**Checks**
- [ ] `npm run check` and `npm run test:e2e` pass.
- [ ] A contact sheet of the wanderer, the tube states, the three enemies and the projectiles, each in every facing and pose, is pending Shaun's review.

## Data changes
- `src/data/art/` (new): shape data for the wanderer's parts, the tube, the enemies, projectiles and effects.
- `src/data/palette.ts`: the daylight palette, plus the old palette renamed as the pixel palette.
- `src/data/config.ts` or the movement data: `firingWalkMultiplier: 0.7`.
- `src/data/assets.ts`: the new vector keys. The replaced pixel keys and grids are removed.

## Out of scope
- Rooms, floors, walls and props: the overworld spec replaces them.
- Foundry machines and logistics pieces, item icons, nodes and the HUD.
- The foundry intake pipe.
- More enemies.
- Any change to enemy behaviour or tuning.
- Rendering the grass, water and rocks from the style test in game.

## Test plan
- **Vitest:**
  - Every shape colour id is in the palette.
  - Every part a rig poses exists.
  - Every vector asset key is registered.
  - The palette table in `docs/art.md` matches `palette.ts`.
  - Sim: walk speed while firing is 0.7×. It's 1× when dry-firing, in the foundry, rolling or released, and the heavy armor multiplier stacks with it.
- **Playwright:**
  - All existing tests pass.
  - Firing while walking covers less ground over the same frames than walking alone.
  - There are no console errors at boot when the textures are generated.
- **Screenshots (qa):**
  - the wanderer idle, walking and firing in each facing
  - the tube dormant, attuning and attuned
  - a Husk wind-up and swipe
  - a Wisp charging
  - the Warden's slam circle
  - each projectile in flight
  - the game at two window sizes, showing vector art sharp and pixel art crisp

## Open questions
None.
