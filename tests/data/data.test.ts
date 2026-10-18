import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { hexToRgb, OUTLINE_ID, PALETTE, TRANSPARENT } from '../../src/data/palette';
import { AMMO } from '../../src/data/ammo';
import {
  animFrames,
  digitFrame,
  BURN_FLAME,
  ENEMY_ANIMS,
  FIRE_BURST,
  NODE_SPRITES,
  HUD_DIGITS,
  PICKUP_SPARKLE,
  PLAYER_ANIMS,
  SPRITES,
  TUBE_SPRITES,
} from '../../src/data/assets';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import {
  CONDUIT_ANIMS,
  CRATE_SPRITE,
  DOORWAY_SPRITE,
  HOPPER_SPRITES,
  MACHINE_HOUSINGS,
  LOGISTICS_ICONS,
  STATUS_MARKERS,
} from '../../src/data/foundryAssets';
import { ENEMIES } from '../../src/data/enemies';
import { ROOMS, TILE } from '../../src/data/rooms';
import { ITEMS } from '../../src/data/items';
import { STARTING_INVENTORY } from '../../src/data/player';
import { SLOT_AMMOS, STARTING_AMMO } from '../../src/data/tube';
import { CRAFT_GROUPS, RECIPES } from '../../src/data/recipes';
import { NODES } from '../../src/data/nodes';
import { BUILD_BAR, PIECES } from '../../src/data/pieces';

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

describe('palette', () => {
  it('has about 24 colors', () => {
    expect(PALETTE.length).toBeGreaterThanOrEqual(20);
    expect(PALETTE.length).toBeLessThanOrEqual(28);
  });

  it('has unique kebab-case ids, unique single-char symbols and valid hex', () => {
    expect(new Set(PALETTE.map((c) => c.id)).size).toBe(PALETTE.length);
    expect(new Set(PALETTE.map((c) => c.char)).size).toBe(PALETTE.length);
    for (const color of PALETTE) {
      expect(color.id).toMatch(KEBAB);
      expect(color.char).toHaveLength(1);
      expect(color.char).not.toBe(TRANSPARENT);
      expect(color.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('includes ley-line cyan', () => {
    expect(PALETTE.some((c) => c.id === 'ley-cyan')).toBe(true);
  });

  it('uses its darkest color, not pure black, as the outline', () => {
    const darkest = [...PALETTE].sort((a, b) => luminance(a.hex) - luminance(b.hex))[0];
    expect(darkest?.id).toBe(OUTLINE_ID);
    expect(darkest?.hex).not.toBe('#000000');
  });

  it('is the palette docs/art.md names', () => {
    const doc = readFileSync('docs/art.md', 'utf8');
    for (const color of PALETTE) expect(doc).toContain(color.hex);
    expect(doc).toContain(`\`${OUTLINE_ID}\``);
  });
});

describe('assets', () => {
  const atlas = JSON.parse(readFileSync('assets/build/sprites.json', 'utf8')) as {
    frames: Record<string, unknown>;
  };

  it('has kebab-case keys that exist in the built atlas', () => {
    const nodeKeys = Object.values(NODE_SPRITES).flatMap((n) => [n.full, n.depleted]);
    for (const key of [...Object.values(SPRITES), ...Object.values(TUBE_SPRITES), ...nodeKeys]) {
      expect(key).toMatch(KEBAB);
      expect(Object.keys(atlas.frames)).toContain(key);
    }
  });

  it('has every player animation frame in the built atlas', () => {
    for (const anim of Object.values(PLAYER_ANIMS)) {
      expect(anim.key).toMatch(KEBAB);
      for (const frame of animFrames(anim)) expect(Object.keys(atlas.frames)).toContain(frame);
    }
  });

  it('has every enemy animation and the pickup sparkle in the built atlas', () => {
    for (const set of Object.values(ENEMY_ANIMS)) {
      for (const anim of [...Object.values(set), PICKUP_SPARKLE]) {
        expect(anim.key).toMatch(KEBAB);
        for (const frame of animFrames(anim)) expect(Object.keys(atlas.frames)).toContain(frame);
      }
    }
  });

  it('has the fire burst and burn flame in the built atlas', () => {
    for (const anim of [FIRE_BURST, BURN_FLAME]) {
      expect(anim.key).toMatch(KEBAB);
      for (const frame of animFrames(anim)) expect(Object.keys(atlas.frames)).toContain(frame);
    }
  });

  it('has every foundry sprite and animation frame in the built atlas, and an icon per logistics piece', () => {
    const frames = Object.keys(atlas.frames);
    for (const views of Object.values(MACHINE_HOUSINGS)) {
      for (const { idle, working } of Object.values(views)) {
        expect(frames).toContain(idle);
        for (const frame of animFrames(working)) expect(frames).toContain(frame);
      }
    }
    for (const anim of [...Object.values(CONDUIT_ANIMS), STATUS_MARKERS.working]) {
      for (const frame of animFrames(anim)) expect(frames).toContain(frame);
    }
    const singles = [
      ...Object.values(HOPPER_SPRITES),
      ...Object.values(LOGISTICS_ICONS),
      CRATE_SPRITE,
      DOORWAY_SPRITE,
      STATUS_MARKERS.blocked,
      STATUS_MARKERS.starved,
    ];
    for (const key of singles) expect(frames).toContain(key);
    const logistics = Object.values(PIECES).filter((d) => d.kind !== 'machine');
    expect(Object.keys(LOGISTICS_ICONS).sort()).toEqual(logistics.map((d) => d.id).sort());
  });

  it('has a HUD font frame for every glyph', () => {
    expect(HUD_DIGITS.glyphs).toContain('+');
    for (const ch of HUD_DIGITS.glyphs) expect(Object.keys(atlas.frames)).toContain(digitFrame(ch));
    expect(() => digitFrame('x')).toThrow();
  });
});

describe('items and ammo', () => {
  it('have kebab-case ids that match their keys', () => {
    for (const [key, item] of Object.entries(ITEMS)) {
      expect(item.id).toMatch(KEBAB);
      expect(item.id).toBe(key);
    }
    for (const [key, ammo] of Object.entries(AMMO)) {
      expect(ammo.id).toMatch(KEBAB);
      expect(ammo.id).toBe(key);
    }
  });

  it('reference items and ammo that exist', () => {
    for (const ammo of Object.values(AMMO)) expect(ITEMS[ammo.itemId]).toBeDefined();
    expect(AMMO[STARTING_AMMO]).toBeDefined();
    for (const id of Object.keys(STARTING_INVENTORY)) expect(ITEMS[id]).toBeDefined();
  });
});

describe('item kinds, ammo slots and recipes', () => {
  it('gives every item a kind, and every ammo an ammo item', () => {
    for (const item of Object.values(ITEMS)) expect(['raw', 'part', 'ammo']).toContain(item.kind);
    for (const ammo of Object.values(AMMO)) expect(ITEMS[ammo.itemId]?.kind).toBe('ammo');
  });

  it('switches between arrows, bombs and ley bolts in key order', () => {
    expect(SLOT_AMMOS).toEqual(['arrow', 'bomb', 'ley-bolt']);
    for (const id of SLOT_AMMOS) expect(AMMO[id]).toBeDefined();
  });

  it('has kebab-case recipes over items that exist', () => {
    for (const [key, r] of Object.entries(RECIPES)) {
      expect(r.id).toMatch(KEBAB);
      expect(r.id).toBe(key);
      expect(ITEMS[r.output.itemId]).toBeDefined();
      expect(r.output.count).toBeGreaterThan(0);
      for (const [id, n] of Object.entries(r.inputs)) {
        expect(ITEMS[id]).toBeDefined();
        expect(n).toBeGreaterThan(0);
      }
    }
  });

  it('lists every recipe in exactly one menu group, grouped under real ammo', () => {
    const listed = CRAFT_GROUPS.flatMap((g) => g.recipes);
    expect([...listed].sort()).toEqual(Object.keys(RECIPES).sort());
    for (const g of CRAFT_GROUPS) expect(AMMO[g.ammoId]).toBeDefined();
  });

  it('has kebab-case nodes that give items that exist', () => {
    for (const [key, n] of Object.entries(NODES)) {
      expect(n.id).toMatch(KEBAB);
      expect(n.id).toBe(key);
      expect(ITEMS[n.itemId]?.kind).toBe('raw');
    }
  });
});

describe('enemies and rooms', () => {
  it('have kebab-case enemy ids that match their keys, with known animation sets', () => {
    for (const [key, enemy] of Object.entries(ENEMIES)) {
      expect(enemy.id).toMatch(KEBAB);
      expect(enemy.id).toBe(key);
      expect(ENEMY_ANIMS[enemy.anims]).toBeDefined();
    }
  });

  it('drop items that exist', () => {
    for (const enemy of Object.values(ENEMIES)) {
      const { always, oneOf, chance } = enemy.drops;
      for (const d of always) {
        expect(ITEMS[d.itemId]).toBeDefined();
        expect(d.min).toBeLessThanOrEqual(d.max);
      }
      for (const id of oneOf) expect(ITEMS[id]).toBeDefined();
      expect(chance).toBeGreaterThanOrEqual(0);
      expect(chance).toBeLessThanOrEqual(1);
    }
  });

  it('place known enemies on floor tiles', () => {
    for (const room of Object.values(ROOMS)) {
      for (const e of room.enemies ?? []) {
        expect(ENEMIES[e.enemyId]).toBeDefined();
        expect(room.rows[e.ty]?.[e.tx]).toBe(TILE.floor);
      }
    }
  });

  it('place known nodes on clear floor in the spawn half, away from the Husks', () => {
    const room = ROOMS['ruin-hall'];
    if (!room?.nodes) throw new Error('no nodes');
    const counts: Record<string, number> = {};
    const tiles = new Set<string>();
    for (const n of room.nodes) {
      expect(NODES[n.nodeId]).toBeDefined();
      counts[n.nodeId] = (counts[n.nodeId] ?? 0) + 1;
      // The node's tile and the ones beside it are floor, so it's never wedged against a block.
      for (const dx of [-1, 0, 1]) expect(room.rows[n.ty]?.[n.tx + dx]).toBe(TILE.floor);
      expect(n.ty).toBeGreaterThanOrEqual(room.rows.length / 2 - 2);
      expect(n.tx === room.spawn.tx && n.ty === room.spawn.ty).toBe(false);
      expect(tiles.has(`${n.tx},${n.ty}`)).toBe(false);
      tiles.add(`${n.tx},${n.ty}`);
      for (const e of room.enemies ?? []) {
        const seen =
          Math.abs(e.tx - n.tx) * 32 <= VIEW_WIDTH / 2 && Math.abs(e.ty - n.ty) * 32 <= VIEW_HEIGHT / 2;
        expect(seen).toBe(false);
      }
    }
    expect(counts).toEqual({ tree: 3, rubble: 3, reeds: 3, 'ley-vein': 2 });
  });

  it('start the ruin hall Husks off screen from the spawn', () => {
    const room = ROOMS['ruin-hall'];
    expect(room?.enemies?.length).toBe(3);
    for (const e of room?.enemies ?? []) {
      const offX = Math.abs(e.tx - (room?.spawn.tx ?? 0)) * 32 > VIEW_WIDTH / 2;
      const offY = Math.abs(e.ty - (room?.spawn.ty ?? 0)) * 32 > VIEW_HEIGHT / 2;
      expect(offX || offY).toBe(true);
    }
  });
});

describe('foundry pieces', () => {
  it('have kebab-case ids matching their keys, and machines run known recipes', () => {
    for (const [key, def] of Object.entries(PIECES)) {
      expect(def.id).toBe(key);
      expect(key).toMatch(KEBAB);
      if (def.kind !== 'machine') continue;
      expect(RECIPES[def.recipeId]).toBeDefined();
      expect(def.craftTicks).toBeGreaterThan(0);
    }
  });

  it('are 1x1, apart from the three-input combiners, which are 3x1', () => {
    const wide = Object.values(PIECES)
      .filter((d) => d.footprint === '3x1')
      .map((d) => d.id);
    expect(wide.sort()).toEqual(['assembler', 'packer']);
    for (const id of wide) {
      const def = PIECES[id];
      if (def?.kind !== 'machine') throw new Error(`${id} is not a machine`);
      expect(Object.keys(RECIPES[def.recipeId]?.inputs ?? {})).toHaveLength(3);
    }
  });

  it('cover every recipe with exactly one machine', () => {
    const run = Object.values(PIECES).flatMap((d) => (d.kind === 'machine' ? [d.recipeId] : []));
    expect(run.sort()).toEqual(Object.keys(RECIPES).sort());
  });

  it('are each on the build bar exactly once', () => {
    expect([...BUILD_BAR].sort()).toEqual(Object.keys(PIECES).sort());
  });
});
