import { INTAKE_SPRITES_VECTOR } from '../../src/data/art/intake';
import { ITEM_SPRITES_VECTOR } from '../../src/data/art/items';
import { LOGISTICS_SPRITES_VECTOR } from '../../src/data/art/logistics';
import { FIXTURE_SPRITES_VECTOR } from '../../src/data/art/fixtures';
import { MACHINE_SPRITES_VECTOR } from '../../src/data/art/machines';
import { INTERIOR_SPRITES_VECTOR } from '../../src/data/art/interior';
import { HUD_SPRITES_VECTOR } from '../../src/data/art/hud';
import { NODE_SPRITES_VECTOR } from '../../src/data/art/nodes';
import { describe, expect, it } from 'vitest';
import { ENEMY_ANIMS, SPRITES, TUBE_SLOT_FRAMES } from '../../src/data/assets';
import { INTAKE } from '../../src/data/foundry';
import { HUD_LAYOUT, tubeSlotWidth } from '../../src/data/hudLayout';
import { inksOf, svg, type LimbStyle, type Shape } from '../../src/data/art/types';
import { VECTOR_SPRITES } from '../../src/data/art/sprites';
import { TUBE_PARTS, WANDERER, WANDERER_DYNAMIC } from '../../src/data/art/wanderer';
import { DAYLIGHT_PALETTE } from '../../src/data/palette';
import { STAGE_SPRITES_VECTOR } from '../../src/data/art/stages';
import { SPRING_POOL_PX, SPRING_SPRITES_VECTOR } from '../../src/data/art/spring';
import { SPRING_RADIUS } from '../../src/data/overworld';
import { TILE_SIZE } from '../../src/data/config';
import { SPRING_LOOK, SPRING_SPRITES } from '../../src/data/springAssets';
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
  it('has unique kebab-case ids and valid hexes', () => {
    const ids = DAYLIGHT_PALETTE.map((c) => c.id);
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
      ...[ITEM_SPRITES_VECTOR, LOGISTICS_SPRITES_VECTOR, FIXTURE_SPRITES_VECTOR, MACHINE_SPRITES_VECTOR, INTERIOR_SPRITES_VECTOR, HUD_SPRITES_VECTOR, STAGE_SPRITES_VECTOR, SPRING_SPRITES_VECTOR].flatMap((set) =>
        set.flatMap((s) => s.frames.flat()),
      ),
    ];
    const limbs = (Object.values(WANDERER.limbs) as LimbStyle[]).flatMap((l) => [l.color, ...(l.bands ? [l.bands.color] : [])]);
    const used = [...shapes.flatMap(inksOf), ...limbs.map((i) => (typeof i === 'string' ? i : i.id))];
    expect(used.length).toBeGreaterThan(100);
    for (const id of used) expect(daylight, id).toContain(id);
  });

  it('draw the Ley Spring (030) under its keys, its pool as wide as the sim\'s, and colour its look from the palette', () => {
    expect(SPRING_SPRITES_VECTOR.map((s) => s.key).sort()).toEqual(Object.values(SPRING_SPRITES).sort());
    // The drawn pool is the sim's: 1.5 tiles, 48 px, and the sprite is wide enough for its rim stones round it.
    expect(SPRING_POOL_PX).toBe(SPRING_RADIUS * TILE_SIZE);
    expect(SPRING_POOL_PX).toBe(48);
    const pool = SPRING_SPRITES_VECTOR.find((s) => s.key === SPRING_SPRITES.spring);
    expect(Math.min(pool?.anchor[0] ?? 0, pool?.anchor[1] ?? 0)).toBeGreaterThanOrEqual(SPRING_POOL_PX + 8);
    const L = SPRING_LOOK;
    for (const id of [L.light.color, L.thread.color, L.thread.glow, L.shimmer.warm, L.shimmer.cool]) expect(daylight, id).toContain(id);
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
    // Every frame name the asset tables hold: strings, and the frames of every anim, however deep.
    const registered = new Set<string>();
    const walk = (v: unknown): void => {
      if (typeof v === 'string') registered.add(v);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') {
        if ('key' in v && 'frames' in v && typeof v.frames === 'number') for (const f of assets.animFrames(v as never)) registered.add(f);
        Object.values(v).forEach(walk);
      }
    };
    const room = await import('../../src/data/roomArt');
    const props = await import('../../src/data/props');
    const stages = await import('../../src/data/stageAssets');
    const springs = await import('../../src/data/springAssets');
    const landmarks = await import('../../src/data/landmarkAssets');
    const research = await import('../../src/data/researchAssets');
    const hollows = await import('../../src/data/hollowsAssets');
    const hollowsEnemies = await import('../../src/data/hollowsEnemyAssets');
    const gear = await import('../../src/data/gearAssets');
    const talents = await import('../../src/data/talentAssets');
    const mines = await import('../../src/data/mineAssets');
    const arenas = await import('../../src/data/arenaAssets');
    const emberworks = await import('../../src/data/emberworksAssets');
    const forge = await import('../../src/data/forgewrightAssets');
    const blueprints = await import('../../src/data/blueprintAssets');
    walk({ ...assets, ...foundry, ...room, ...props, ...stages, ...springs, ...landmarks, ...research, ...hollows, ...hollowsEnemies, ...gear, ...talents, ...mines, ...arenas, ...emberworks, ...forge, ...blueprints });
    for (const f of vectorFrames()) expect(registered, f.name).toContain(f.name);
  });
});

describe('the bottom HUD art (025)', () => {
  it('has a tube slot frame for every volley size, each a unit wider, and the fist', () => {
    expect(TUBE_SLOT_FRAMES).toHaveLength(INTAKE.entrances.length);
    const byKey = new Map(HUD_SPRITES_VECTOR.map((s) => [s.key, s]));
    TUBE_SLOT_FRAMES.forEach((key, i) => {
      const n = i + 1;
      expect(byKey.get(key)?.size).toEqual([tubeSlotWidth(n), HUD_LAYOUT.tubeSlot.h]);
    });
    expect(byKey.get(SPRITES.hudFist)?.size).toEqual([16, 16]);
  });
});
