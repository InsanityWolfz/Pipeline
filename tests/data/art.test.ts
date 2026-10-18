import { INTAKE_SPRITES_VECTOR } from '../../src/data/art/intake';
import { NODE_SPRITES_VECTOR } from '../../src/data/art/nodes';
import { describe, expect, it } from 'vitest';
import { ENEMY_ANIMS } from '../../src/data/assets';
import { inksOf, svg, type LimbStyle, type Shape } from '../../src/data/art/types';
import { VECTOR_SPRITES } from '../../src/data/art/sprites';
import { TUBE_PARTS, WANDERER, WANDERER_DYNAMIC } from '../../src/data/art/wanderer';
import { DAYLIGHT_PALETTE, PIXEL_PALETTE } from '../../src/data/palette';
import { ENEMY_RIGS } from '../../src/data/art/enemies';
import { poseOfAnim } from '../../src/render/vector/catalog';

// Vector art data (016): colours, rig parts and frame counts all line up.

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const daylight = new Set(DAYLIGHT_PALETTE.map((c) => c.id));

const wandererShapes = (): Shape[] => [
  ...Object.values(WANDERER.views).flatMap((v) => [...v.parts.flatMap((p) => p.shapes), ...(v.glow ? [v.glow] : []), ...(v.window ? [v.window.bubble] : [])]),
  ...TUBE_PARTS.housing,
  ...TUBE_PARTS.barrel.lit,
  ...TUBE_PARTS.barrel.dormant,
  TUBE_PARTS.ring.lit,
  TUBE_PARTS.ring.dormant,
  TUBE_PARTS.ring.glowing,
  TUBE_PARTS.muzzle.lit,
  TUBE_PARTS.muzzle.dormant,
  TUBE_PARTS.muzzleGlow,
  WANDERER.hand,
  WANDERER.boot.back,
  WANDERER.boot.front,
];

describe('the daylight palette', () => {
  it('has kebab-case ids unique across both palettes, and valid hexes', () => {
    const ids = [...PIXEL_PALETTE, ...DAYLIGHT_PALETTE].map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of DAYLIGHT_PALETTE) {
      expect(c.id).toMatch(KEBAB);
      expect(c.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe('vector shapes', () => {
  it('colour only from the daylight palette', () => {
    const shapes = [
      ...wandererShapes(),
      ...ENEMY_RIGS.flatMap((r) => Object.values(r.views).flatMap((parts) => parts.flatMap((p) => p.shapes))),
      ...VECTOR_SPRITES.flatMap((s) => s.frames.flat()),
      ...NODE_SPRITES_VECTOR.flatMap((s) => s.frames.flat()),
      ...INTAKE_SPRITES_VECTOR.flatMap((s) => s.frames.flat()),
    ];
    const limbs = (Object.values(WANDERER.limbs) as LimbStyle[]).flatMap((l) => [l.color, ...(l.bands ? [l.bands.color] : [])]);
    const used = [...shapes.flatMap(inksOf), ...limbs.map((i) => (typeof i === 'string' ? i : i.id))];
    expect(used.length).toBeGreaterThan(100);
    for (const id of used) expect(daylight, id).toContain(id);
  });

  it('parse path strings and reject bad ones', () => {
    expect(svg('M 0 0 Q 1 2 3 4 L 5 6 Z')).toEqual([['M', 0, 0], ['Q', 1, 2, 3, 4], ['L', 5, 6], ['Z']]);
    expect(() => svg('M 0 x')).toThrow();
    expect(() => svg('A 1 1')).toThrow();
  });
});

describe('the wanderer rig', () => {
  it('orders only parts its view has, or dynamic pieces', () => {
    for (const [name, view] of Object.entries(WANDERER.views)) {
      const ids = new Set(view.parts.map((p) => p.id));
      for (const step of view.order) {
        const known = ids.has(step) || (WANDERER_DYNAMIC as readonly string[]).includes(step);
        expect(known, `${name}: ${step}`).toBe(true);
      }
      for (const p of view.parts) expect(p.id).toMatch(KEBAB);
      if (view.window) {
        expect(ids).toContain(view.window.lit);
        expect(ids).toContain(view.window.dormant);
      }
      if (view.trail) expect(ids).toContain(view.trail);
    }
  });

  it('shows the tube, hose and face glow where they belong', () => {
    for (const view of Object.values(WANDERER.views)) {
      expect(view.order).toContain('@tube');
      expect(view.order).toContain('@hose');
    }
    expect(WANDERER.views.down.glow).toBeDefined();
    expect(WANDERER.views.side.glow).toBeDefined();
    expect(WANDERER.views.up.glow).toBeUndefined();
  });
});

describe('enemy rigs', () => {
  it('cover every enemy animation, with one pose per frame', () => {
    for (const [id, anims] of Object.entries(ENEMY_ANIMS)) {
      const rig = ENEMY_RIGS.find((r) => r.id === id);
      expect(rig, id).toBeDefined();
      if (!rig) continue;
      for (const anim of Object.values(anims)) {
        if (!anim) continue;
        const { pose } = poseOfAnim(rig, anim);
        expect(rig.poses[pose]?.length, anim.key).toBe(anim.frames);
      }
    }
  });

  it('have parts with kebab-case ids, roles and the hip inside the box', () => {
    for (const rig of ENEMY_RIGS) {
      for (const parts of Object.values(rig.views)) for (const p of parts) expect(p.id).toMatch(KEBAB);
      expect(rig.box.anchor[0]).toBeLessThanOrEqual(rig.box.size[0]);
      expect(rig.box.anchor[1]).toBeLessThanOrEqual(rig.box.size[1]);
    }
  });
});

describe('docs/art.md', () => {
  it('lists every daylight colour with its hex', async () => {
    const { readFileSync } = await import('node:fs');
    const doc = readFileSync('docs/art.md', 'utf8');
    for (const c of DAYLIGHT_PALETTE) expect(doc).toContain(`| \`${c.id}\` | ${c.hex} |`);
  });
});

describe('vector frame registration', () => {
  it('names every vector frame in the asset registry, so render code reaches it by key', async () => {
    const assets = await import('../../src/data/assets');
    const foundry = await import('../../src/data/foundryAssets');
    const { vectorFrames } = await import('../../src/render/vector/catalog');
    const anims = [
      ...Object.values(assets.ENEMY_ANIMS).flatMap((set) => Object.values(set)),
      assets.PICKUP_SPARKLE,
      assets.FIRE_BURST,
      assets.DEPOSIT_SWIRL,
      assets.MUZZLE_FLASH,
      assets.BURN_FLAME,
    ].flatMap((a) => (a ? assets.animFrames(a) : []));
    const registered = new Set<string>([
      ...Object.values(assets.SPRITES),
      ...anims,
      foundry.TUTORIAL_SPRITES.stone,
      foundry.TUTORIAL_SPRITES.stoneEmpty,
      foundry.ORB_SPRITES.orb,
      foundry.ORB_SPRITES.shadow,
      ...Object.values(assets.OVERWORLD_SPRITES).flat(),
      ...Object.values(assets.NODE_SPRITES).flatMap((n) => [...n.uses, ...n.regrow]),
      ...Object.values(foundry.INTAKE_SPRITES),
      ...Object.values(foundry.LOGISTICS_ICONS),
      ...Object.values(foundry.SITE_ICONS),
      foundry.INTAKE_EMPTY_ICON,
    ]);
    for (const f of vectorFrames()) expect(registered, f.name).toContain(f.name);
  });
});
