# Plan 016: Art direction

Spec: docs/specs/016-art-direction.md. This is a vertical slice through data (palette, shape data, tuning), sim (the firing walk multiplier) and render (resolution, vector drawing, rigs, views). It is written for the unattended run, so nobody approved it in plan mode. It stays inside the spec.

## Tests first
1. `tests/sim/firingWalk.test.ts`:
   - Walking while firing reaches 0.7× top speed.
   - It's 1× when dry-firing, in the foundry, rolling, and on the tick after release.
   - Heavy armor stacks with it by multiplying.
2. `tests/data/art.test.ts`:
   - Every colour id in every shape, gradient stop, glow and limb style is in the palette.
   - Every part a rig poses exists in its rig.
   - Every vector frame key is unique and covers every anim frame `assets.ts` names for the player-free enemy, projectile and effect sets.
   - No vector key is also an atlas grid.
3. `tests/data/data.test.ts`:
   - The pixel palette is unchanged under its new name.
   - The daylight palette ids are kebab-case and unique across both palettes.
   - The `docs/art.md` tables match `palette.ts`.
4. `tests/render/` (pure helpers):
   - render-scale maths (zoom, backbuffer, UI point)
   - shelf packing of baked frames
5. `tests/e2e/art.spec.ts`:
   - No console errors at boot, with vector textures present.
   - Firing while walking covers less ground than walking.
   - Pointer-to-world and HUD clicks still land, which the existing foundry tests already exercise.

## Steps
1. **Sim:**
   - `tube.dry` marks that the last attempt found no round.
   - `firingWalkScale(state)` = `FIRING_WALK_MULTIPLIER` when the tube is firing and not dry.
   - `step.ts` multiplies it into the walk scale.
   - Data: `FIRING_WALK_MULTIPLIER` in `src/data/player.ts`.
2. **Palette:**
   - `PIXEL_PALETTE` (renamed, with chars).
   - `DAYLIGHT_PALETTE` (ids only, no chars), for the style test colours plus enemy and effect colours.
   - `paletteHex` looks up both.
   - `docs/art.md` gets both tables.
3. **Shape data** in `src/data/art/`:
   - `types.ts`: Shape, Paint, Part, Limb, VectorSprite and Rig types.
   - `wanderer.ts`: parts for side, down and up, plus limb and hose styles.
   - `tube.ts`: the tube parts and state colours, and the relic on its stone.
   - `husk.ts`, `wisp.ts`, `warden.ts`: parts per view.
   - `projectiles.ts`: arrow, bomb, ley bolt, wisp orb and their shadows.
   - `effects.ts`: muzzle flash, fire burst, burn flame, pickup sparkle and deposit swirl frames.
   - All coordinates are world px. `RIG_SCALE` fits the style-test figures to today's 32×40 player box.
4. **Drawing** in `src/render/vector/`:
   - `draw.ts`: shapes to Canvas2D, with outlines, gradients and glows. Pure canvas, no Phaser.
   - `pose.ts`: the part transform helpers.
   - `wandererRig.ts`: draws the player from sim state each frame into a canvas texture.
   - `enemyRigs.ts`: pose functions per enemy, pose and phase.
   - `bake.ts`: draws static sprites and every enemy anim frame at boot into shelf-packed canvas pages, registered as Phaser textures with the old frame names.
   - `textures.ts`: `textureOf(frame)` and `vectorScale()`.
5. **Resolution:**
   - `pixelArt: false`.
   - The backbuffer is the integer CSS zoom × devicePixelRatio × 640×360.
   - The main camera zooms to the render scale, keeping the same 640×360 world view.
   - A UI camera at the same zoom with origin 0,0 draws every scroll-factor-0 object; the main camera skips those. They're routed each frame.
   - The atlas uses nearest filtering.
   - `uiPoint()` converts pointer pixels to the 640×360 HUD space for the three raw pointer uses.
   - Window resizes are handled.
6. **Views:**
   - PlayerView uses the wanderer rig, with the hit flash, armor tint, death fade, roll and attune kept.
   - EnemyView, ArrowView, BombView, EffectsView, the orbs and the tube stone use vector frames at 1/scale.
   - The health bar uses the display height.
   - The juice particle colours move to daylight ids.
7. **Cleanup:**
   - Remove the replaced grids and the old player and tube anim keys.
   - `TUBE_GRIP` and `TUBE_ATTUNE` move into rig data.
   - Rebuild the atlas.
8. **Docs:**
   - Rewrite `docs/art.md`.
   - Update `.claude/commands/sprite.md`.
   - Add the dev contact sheet page `sheet.html`, which draws every vector sprite, pose and facing at 4×, for review and the qa screenshot.

## Risks
- Per-frame canvas upload for the player. It's one small texture, so it's fine.
- Enemy frames are baked, so a resize after boot doesn't re-bake. They stay slightly soft on a much larger window, which is acceptable under "at boot".
- The HUD no longer fades with door and KO fades, because it's on its own camera. This is a small visible change, noted in the build notes.

## As built
The files differ from the plan's names:
- **Data:**
  - `src/data/art/sprites.ts` holds the projectiles, effects and the tube stone, in place of `tube.ts`, `projectiles.ts` and `effects.ts`.
  - The tube parts live in `wanderer.ts`.
  - `enemies.ts` lists the enemy rigs.
- **Render:**
  - `src/render/vector/catalog.ts` lists every baked frame.
  - `pack.ts` shelf-packs them, and `textures.ts` bakes and registers them, in place of `bake.ts`.
  - `enemyRig.ts` is the single enemy drawer, in place of `enemyRigs.ts`.
  - Posing lives in the two rig drawers, in place of `pose.ts`.
