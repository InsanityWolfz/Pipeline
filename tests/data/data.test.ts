import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DAYLIGHT_PALETTE, hexToRgb, INK_ID } from '../../src/data/palette';
import { AMMO } from '../../src/data/ammo';
import {
  animFrames,
  BURN_FLAME,
  ENEMY_ANIMS,
  MUZZLE_FLASH,
  DEPOSIT_SWIRL,
  FIRE_BURST,
  NODE_SPRITES,
  PICKUP_SPARKLE,
  SPRITES,
} from '../../src/data/assets';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../src/data/config';
import {
  CONDUIT_ANIMS,
  CONDUIT_CORNERS,
  CRATE_SPRITE,
  STAGER_SPRITE,
  TUTORIAL_SPRITES,
  PYLON_SPRITES,
  FIXTURE_SPRITES,
  ORB_SPRITES,
  SITE_ICONS,
  DOORWAY_SPRITE,
  FACING_ARROWS,
  HOPPER_SPRITES,
  MACHINE_IDS,
  MACHINE_SPRITES,
  LOGISTICS_ICONS,
  STATUS_MARKERS,
} from '../../src/data/foundryAssets';
import { ENEMIES } from '../../src/data/enemies';
import { FIXTURES, PORT_CYCLE } from '../../src/data/claims';
import { ARMOR_DROP_CHANCE, ARMOR_WEIGHTS } from '../../src/data/armor';
import { OBJECTIVES } from '../../src/data/objectives';
import { TILE, WALKABLE } from '../../src/data/rooms';
import { ITEMS } from '../../src/data/items';
import { STARTING_INVENTORY, TUTORIAL_START } from '../../src/data/player';
import { PLAYTEST_START } from '../../src/data/playtest';
import { SLOT_AMMOS, STARTING_AMMO } from '../../src/data/tube';
import { CRAFT_GROUPS, RECIPES } from '../../src/data/recipes';
import { NODES } from '../../src/data/nodes';
import { BUILD_BAR, PIECES } from '../../src/data/pieces';
import { STAGER_ANGLES, STAGER_START_ANGLE } from '../../src/data/foundry';
import { vectorFrames } from '../../src/render/vector/catalog';
import { OVERWORLD } from '../../src/data/overworld';
import { WORLD } from '../../src/sim/world';

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

describe('palette', () => {
  it('has unique kebab-case ids and valid hex', () => {
    expect(new Set(DAYLIGHT_PALETTE.map((c) => c.id)).size).toBe(DAYLIGHT_PALETTE.length);
    for (const color of DAYLIGHT_PALETTE) {
      expect(color.id).toMatch(KEBAB);
      expect(color.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('includes ley-line cyan', () => {
    expect(DAYLIGHT_PALETTE.some((c) => c.id === 'cyan')).toBe(true);
  });

  it('outlines in its ink, a dark not pure black', () => {
    const ink = DAYLIGHT_PALETTE.find((c) => c.id === INK_ID);
    expect(ink).toBeDefined();
    expect(ink?.hex).not.toBe('#000000');
    expect(luminance(ink?.hex ?? '#000000')).toBeLessThan(40);
  });
});

/** Every frame the game can show: the vector catalog's (016; the only source since 020). */
function drawnFrames(): string[] {
  return vectorFrames().map((f) => f.name);
}

describe('no pixel pipeline (020)', () => {
  it('has no sprite grids, atlas, art build script or art npm script left', () => {
    for (const path of ['assets/sprites', 'assets/build/sprites.json', 'assets/build/sprites.png', 'scripts/build-art.ts', 'scripts/art']) expect(existsSync(path), path).toBe(false);
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
    expect(pkg.scripts.art).toBeUndefined();
    expect(Object.values(pkg.scripts).join(' ')).not.toContain('npm run art');
  });
});

describe('assets', () => {
  const vectors = vectorFrames().map((f) => f.name);
  const known = vectors;

  it('has kebab-case keys that exist as vector frames', () => {
    const nodeKeys = Object.values(NODE_SPRITES).flatMap((n) => [...n.uses, ...n.regrow]);
    for (const key of [...Object.values(SPRITES), ...nodeKeys]) {
      expect(key).toMatch(KEBAB);
      expect(known).toContain(key);
    }
  });

  it('names every frame once', () => {
    expect(new Set(vectors).size).toBe(vectors.length);
  });

  it('has every enemy animation and the pickup sparkle as frames', () => {
    for (const set of Object.values(ENEMY_ANIMS)) {
      for (const anim of [...Object.values(set), PICKUP_SPARKLE]) {
        if (!anim) continue;
        expect(anim.key).toMatch(KEBAB);
        for (const frame of animFrames(anim)) expect(known).toContain(frame);
      }
    }
  });

  it('has the fire burst, burn flame, muzzle flash, deposit swirl and stager as frames', () => {
    for (const anim of [FIRE_BURST, BURN_FLAME, MUZZLE_FLASH, DEPOSIT_SWIRL, STAGER_SPRITE]) {
      expect(anim.key).toMatch(KEBAB);
      for (const frame of animFrames(anim)) expect(known).toContain(frame);
    }
  });

  it('draws every foundry sprite and animation frame (atlas or vector), and an icon per logistics piece', () => {
    const frames = drawnFrames();
    // Every machine piece has its own look in every view (020): still, jammed and a working loop.
    expect([...MACHINE_IDS].sort()).toEqual(Object.values(PIECES).filter((d) => d.kind === 'machine').map((d) => d.id).sort());
    for (const views of Object.values(MACHINE_SPRITES)) {
      for (const { idle, jammed, working } of Object.values(views)) {
        expect(frames).toContain(idle);
        expect(frames).toContain(jammed);
        for (const frame of animFrames(working)) expect(frames).toContain(frame);
      }
    }
    expect(Object.keys(CONDUIT_CORNERS)).toHaveLength(8);
    for (const anim of [...Object.values(CONDUIT_ANIMS), ...Object.values(CONDUIT_CORNERS), STATUS_MARKERS.working]) {
      for (const frame of animFrames(anim)) expect(frames).toContain(frame);
    }
    const singles = [
      ...Object.values(HOPPER_SPRITES),
      ...Object.values(LOGISTICS_ICONS),
      CRATE_SPRITE,
      DOORWAY_SPRITE,
      ...Object.values(FACING_ARROWS.in),
      ...Object.values(FACING_ARROWS.out),
      STATUS_MARKERS.blocked,
      STATUS_MARKERS.starved,
    ];
    for (const key of singles) expect(frames).toContain(key);
    const logistics = Object.values(PIECES).filter((d) => d.kind !== 'machine');
    expect(Object.keys(LOGISTICS_ICONS).sort()).toEqual(logistics.map((d) => d.id).sort());
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
    for (const item of Object.values(ITEMS)) expect(['raw', 'part', 'ammo', 'armor']).toContain(item.kind);
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

  it('place known enemies on walkable tiles', () => {
    for (const room of Object.values(WORLD)) {
      for (const e of room.enemies ?? []) {
        expect(ENEMIES[e.enemyId]).toBeDefined();
        expect(WALKABLE).toContain(room.rows[e.ty]?.[e.tx]);
      }
    }
  });

  it('place known nodes on walkable ground, every raw near the start, none in view of the field pack (017)', () => {
    const room = WORLD[OVERWORLD.id];
    if (!room?.nodes) throw new Error('no nodes');
    const tiles = new Set<string>();
    const field = OVERWORLD.packs.filter((p) => p.group === 'field');
    for (const n of room.nodes) {
      expect(NODES[n.nodeId]).toBeDefined();
      expect(WALKABLE).toContain(room.rows[n.ty]?.[n.tx]);
      expect(tiles.has(`${n.tx},${n.ty}`)).toBe(false);
      tiles.add(`${n.tx},${n.ty}`);
      for (const e of field) {
        const seen = Math.abs(e.tx - n.tx) * 32 <= VIEW_WIDTH / 2 && Math.abs(e.ty - n.ty) * 32 <= VIEW_HEIGHT / 2;
        expect(seen).toBe(false);
      }
    }
    // Every raw can be gathered in the meadow round the start, before the first fight.
    const meadow = OVERWORLD.clearings[0];
    const near = room.nodes.filter((n) => meadow && n.tx >= meadow.x0 && n.tx <= meadow.x1 && n.ty >= meadow.y0 && n.ty <= meadow.y1);
    expect(new Set(near.map((n) => n.nodeId))).toEqual(new Set(['tree', 'rubble', 'reeds', 'ley-vein']));
  });

  it("start the ruin field's Husks off screen from the starts", () => {
    const field = OVERWORLD.packs.filter((p) => p.group === 'field');
    expect(field).toHaveLength(3);
    for (const start of [OVERWORLD.field, OVERWORLD.wake]) {
      for (const e of field) {
        const offX = Math.abs(e.tx - start.tx) * 32 > VIEW_WIDTH / 2;
        const offY = Math.abs(e.ty - start.ty) * 32 > VIEW_HEIGHT / 2;
        expect(offX || offY).toBe(true);
      }
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

describe('the tube link (007)', () => {
  it('feeds the tube through the fixed foundry intake, not a placeable socket (019)', () => {
    expect(BUILD_BAR).not.toContain('tube-socket');
    expect(PIECES['tube-socket']).toBeUndefined();
  });

  it('gives the playtest start only real items, and every recipe output as crafted', () => {
    for (const id of Object.keys(PLAYTEST_START.inventory)) expect(ITEMS[id]).toBeDefined();
    const outputs = new Set(Object.values(RECIPES).map((r) => r.output.itemId));
    expect(new Set(PLAYTEST_START.crafted)).toEqual(outputs);
  });
});

describe('spreads (008)', () => {
  it('has a gravity stager on the build bar costing a warden core', () => {
    expect(BUILD_BAR).toContain('gravity-stager');
    expect(PIECES['gravity-stager']).toMatchObject({ kind: 'stager', footprint: '1x1', cost: { 'warden-core': 1 } });
    for (const def of Object.values(PIECES)) for (const id of Object.keys(def.cost ?? {})) expect(ITEMS[id]).toBeDefined();
    expect(ITEMS['warden-core']).toMatchObject({ kind: 'part' });
    expect(PLAYTEST_START.inventory['warden-core']).toBe(5);
  });

  it('has one stager frame per angle, starting at 0', () => {
    expect(STAGER_ANGLES).toContain(STAGER_START_ANGLE);
    expect(STAGER_SPRITE.frames).toBe(STAGER_ANGLES.length);
  });
});

describe('claiming (009)', () => {
  it('has every site sprite in the built atlas', () => {
    const frames = drawnFrames();
    const anims = [PYLON_SPRITES.activating, PYLON_SPRITES.active, FIXTURE_SPRITES.port, FIXTURE_SPRITES.waystone];
    for (const anim of anims) for (const frame of animFrames(anim)) expect(frames).toContain(frame);
    const singles = [PYLON_SPRITES.off, FIXTURE_SPRITES.stash, ORB_SPRITES.orb, ORB_SPRITES.shadow, ...Object.values(SITE_ICONS)];
    for (const key of singles) expect(frames).toContain(key);
  });

  it('places only known enemies, on rooms whose pylons stand on floor', () => {
    for (const room of Object.values(WORLD)) {
      for (const e of room.enemies ?? []) expect(ENEMIES[e.enemyId]).toBeDefined();
      if (room.pylon) expect(room.rows[room.pylon.ty]?.[room.pylon.tx]).toBe(TILE.floor);
    }
    for (const def of Object.values(ENEMIES)) expect(ENEMY_ANIMS[def.anims]).toBeDefined();
  });

  it('puts fixtures on open foundry floor, and the port cycles real raws', () => {
    const foundry = WORLD.foundry;
    for (const f of FIXTURES) expect(foundry?.rows[f.ty]?.[f.tx]).toBe(TILE.floor);
    for (const id of PORT_CYCLE) expect(ITEMS[id]?.kind).toBe('raw');
  });
});

describe('armor (010)', () => {
  it('has sane weight ranges, drop chances for real enemies, and the bench on open floor', () => {
    for (const w of Object.values(ARMOR_WEIGHTS)) {
      expect(w.min).toBeLessThanOrEqual(w.max);
      expect(w.adjectives.length).toBeGreaterThan(0);
      expect(w.nouns.length).toBeGreaterThan(0);
    }
    for (const [id, chance] of Object.entries(ARMOR_DROP_CHANCE)) {
      expect(ENEMIES[id]).toBeDefined();
      expect(chance).toBeGreaterThanOrEqual(0);
      expect(chance).toBeLessThanOrEqual(1);
    }
    expect(ITEMS['unidentified-armor']?.kind).toBe('armor');
    expect(FIXTURES.some((f) => f.kind === 'bench')).toBe(true);
    for (const frame of animFrames(FIXTURE_SPRITES.bench)) expect(drawnFrames()).toContain(frame);
  });
});

describe('the tutorial (012)', () => {
  it('has objectives with text, and tutorial sprites in the atlas', () => {
    expect(OBJECTIVES.length).toBeGreaterThan(0);
    for (const o of OBJECTIVES) expect(o.text.length).toBeGreaterThan(0);
    const frames = drawnFrames();
    for (const v of Object.values(TUTORIAL_SPRITES)) {
      if (typeof v === 'string') expect(frames).toContain(v);
      else for (const f of animFrames(v)) expect(frames).toContain(f);
    }
  });

  it('puts the tube stone on floor, the foundry gate on its stairs and the shrine gate on its gap', () => {
    const outside = WORLD[OVERWORLD.id];
    const stone = outside?.tubeStone;
    if (!stone) throw new Error('no tube stone');
    expect(outside.rows[stone.ty]?.[stone.tx]).toBe(TILE.floor);
    const doorGates = Object.values(WORLD).flatMap((r) => (r.doorways ?? []).flatMap((d) => (d.gate ? [d.gate] : [])));
    expect(doorGates).toEqual(['foundry']);
    const tileGates = new Set((outside.gateTiles ?? []).map((t) => t.gate));
    expect([...tileGates]).toEqual(['shrine']);
    for (const t of outside.gateTiles ?? []) expect(outside.rows[t.ty]?.[t.tx]).toBe(TILE.floor);
    for (const r of Object.values(RECIPES)) if (r.requires) expect(r.requires).toBe('attuned');
    expect(TUTORIAL_START.room).toBe(OVERWORLD.id);
  });
});
