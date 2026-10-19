import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DAYLIGHT_PALETTE, hexToRgb, INK_ID } from '../../src/data/palette';
import { AMMO } from '../../src/data/ammo';
import {
  animFrames,
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
  INTAKE_SPRITES,
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
import { FIXTURES, SITE_SUPPLY } from '../../src/data/claims';
import { ARMOR_DROP_CHANCE, GEAR_NAMES } from '../../src/data/gear';
import { OBJECTIVES } from '../../src/data/objectives';
import { TILE, WALKABLE } from '../../src/data/rooms';
import { ITEMS } from '../../src/data/items';
import { STARTING_INVENTORY, TUTORIAL_START } from '../../src/data/player';
import { PLAYTEST_START } from '../../src/data/playtest';
import { SLOT_AMMOS, STARTING_AMMO } from '../../src/data/tube';
import { CRAFT_GROUPS, RECIPES, recipeDef } from '../../src/data/recipes';
import { STAGE_RECIPES } from '../../src/data/stages';
import { NODES } from '../../src/data/nodes';
import { BUILD_BAR, PIECE_CATEGORIES, PIECES, pieceDef } from '../../src/data/pieces';
import { ENTRANCE_CAPS, INTAKE, LOB_SPACING, SPREAD_STEP } from '../../src/data/foundry';
import { researchNode } from '../../src/data/research';
import { ENTRANCE_GAUGE_COLORS } from '../../src/data/art/intake';
import { vectorFrames } from '../../src/render/vector/catalog';
import { OVERWORLD } from '../../src/data/overworld';
import { WORLD } from '../../src/sim/world';

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** A round id (029): a kebab-case base, then its tags, each joined by '+'. */
const ROUND = /^[a-z0-9]+(-[a-z0-9]+)*(\+[a-z0-9]+(-[a-z0-9]+)*)*$/;

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

  it('has the fire burst, muzzle flash and deposit swirl as frames, and no burn flame (029)', () => {
    expect(known.some((f) => f.startsWith('burn-flame'))).toBe(false);
    for (const anim of [FIRE_BURST, MUZZLE_FLASH, DEPOSIT_SWIRL]) {
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
      ...Object.values(FACING_ARROWS.sort),
      SPRITES.craftRowPress,
      STATUS_MARKERS.blocked,
      STATUS_MARKERS.starved,
    ];
    for (const key of singles) expect(frames).toContain(key);
    const logistics = Object.values(PIECES).filter((d) => d.kind !== 'machine');
    expect(Object.keys(LOGISTICS_ICONS).sort()).toEqual(logistics.map((d) => d.id).sort());
  });
});

const ammoIds = new Set(Object.keys(AMMO));

describe('items and ammo', () => {
  it('have kebab-case ids that match their keys', () => {
    for (const [key, item] of Object.entries(ITEMS)) {
      expect(item.id).toMatch(ammoIds.has(key) ? ROUND : KEBAB);
      expect(item.id).toBe(key);
    }
    for (const [key, ammo] of Object.entries(AMMO)) {
      expect(ammo.id).toMatch(ROUND);
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
    // 033: schematics are the one new kind.
    for (const item of Object.values(ITEMS)) expect(['raw', 'part', 'ammo', 'armor', 'schematic']).toContain(item.kind);
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
      expect(RECIPES[def.recipeId] ?? STAGE_RECIPES[def.recipeId]).toBeDefined();
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
    expect(run.sort()).toEqual([...Object.keys(RECIPES), ...Object.keys(STAGE_RECIPES)].sort());
  });

  it('are each on the build bar exactly once', () => {
    expect([...BUILD_BAR].sort()).toEqual(Object.keys(PIECES).sort());
  });
});

describe('build bar categories (026)', () => {
  it('gives every build bar piece a category', () => {
    const ids = PIECE_CATEGORIES.map((c) => c.id);
    for (const id of BUILD_BAR) expect(ids, id).toContain(pieceDef(id).category);
  });

  it('groups the bar left to right: logistics, then each ammo chain, each with its label', () => {
    expect(PIECE_CATEGORIES.map((c) => [c.id, c.label])).toEqual([
      ['logistics', 'Logistics'],
      ['arrows', 'Arrows'],
      ['bombs', 'Bombs'],
      ['ley', 'Ley'],
    ]);
    const grouped = PIECE_CATEGORIES.map((c) => BUILD_BAR.filter((id) => pieceDef(id).category === c.id));
    expect(grouped).toEqual([
      // 033: the splitter and merger, hidden until restored, beside the sorter.
      ['conduit', 'sorter', 'splitter', 'merger', 'hopper', 'crate'],
      // 029: each stage in its base ammo's group, after the chain that makes the ammo.
      ['cutter', 'knapper', 'spinner', 'assembler', 'frost-rune'],
      ['shaper', 'fuse-maker', 'packer'],
      ['grinder', 'focuser', 'ley-guide', 'shatter-lens'],
    ]);
    // In bar order the groups never interleave.
    expect([...BUILD_BAR]).toEqual(grouped.flat());
  });
});

describe('the tube link (007)', () => {
  it('feeds the tube through the fixed foundry intake, not a placeable socket (019)', () => {
    expect(BUILD_BAR).not.toContain('tube-socket');
    expect(PIECES['tube-socket']).toBeUndefined();
  });

  it('gives the playtest start only real items, and every recipe output as crafted', () => {
    for (const id of Object.keys(PLAYTEST_START.inventory)) expect(ITEMS[id]).toBeDefined();
    // 029: stage recipes count too, so every stage is unlocked.
    const outputs = new Set([...Object.values(RECIPES), ...Object.values(STAGE_RECIPES)].map((r) => r.output.itemId));
    expect(new Set(PLAYTEST_START.crafted)).toEqual(outputs);
  });
});

describe('spreads from the intake (024)', () => {
  it('has no gravity stager: the spread comes from the fed entrances', () => {
    expect(BUILD_BAR).not.toContain('gravity-stager');
    expect(PIECES['gravity-stager']).toBeUndefined();
    expect(Object.values(PIECES).map((d) => d.kind)).not.toContain('stager');
    expect(drawnFrames().some((f) => f.includes('stager'))).toBe(false);
  });

  it('restores the second entrance with a real item, which the playtest start carries (033: one entrance per core)', () => {
    expect(researchNode('entrance-2').cost).toEqual({ 'warden-core': 1 });
    expect(ITEMS['warden-core']).toMatchObject({ kind: 'part' });
    expect(PLAYTEST_START.inventory['warden-core']).toBe(5);
  });

  it('has three entrances on the mouth, the centre open, and starting numbers from the spec', () => {
    expect(INTAKE.entrances).toHaveLength(3);
    expect(INTAKE.entrances.filter((e) => e.startsOpen)).toEqual([INTAKE.entrances[1]]);
    expect([ENTRANCE_CAPS[0], SPREAD_STEP, LOB_SPACING]).toEqual([30, 15, 24]);
  });

  it('draws the brass entrance cap, and has a gauge colour for every ammo', () => {
    expect(drawnFrames()).toContain(INTAKE_SPRITES.cap);
    for (const id of Object.keys(AMMO)) expect(ENTRANCE_GAUGE_COLORS[id]).toBeDefined();
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
      for (const p of room.pylons ?? []) expect(room.rows[p.ty]?.[p.tx], p.site).toBe(TILE.floor);
    }
    for (const def of Object.values(ENEMIES)) expect(ENEMY_ANIMS[def.anims]).toBeDefined();
  });

  it('puts fixtures on open foundry floor, each port on a real raw, one port per raw', () => {
    const foundry = WORLD.foundry;
    for (const f of FIXTURES) expect(foundry?.rows[f.ty]?.[f.tx]).toBe(TILE.floor);
    const raws = FIXTURES.flatMap((f) => (f.kind === 'port' ? [f.raw] : []));
    for (const id of raws) expect(id && ITEMS[id]?.kind).toBe('raw');
    expect(new Set(raws).size).toBe(raws.length);
    for (const f of FIXTURES) expect(f.kind === 'port' ? f.raw !== undefined && f.claim === undefined : f.raw === undefined, f.id).toBe(true);
  });

  it("gives every raw a site sends a port, and a node of that raw in the site's safe zone (028)", () => {
    const ports = FIXTURES.flatMap((f) => (f.kind === 'port' ? [f.raw] : []));
    for (const [site, raws] of Object.entries(SITE_SUPPLY)) {
      const room = Object.values(WORLD).find((r) => r.pylons?.some((p) => p.site === site));
      const pylon = room?.pylons?.find((p) => p.site === site);
      if (!room || !pylon) throw new Error(`no pylon for ${site}`);
      // Each pylon's own safe radius (032: a resource site's is 7, the shrine's 10).
      const { tx, ty, safeRadius } = pylon;
      const nodes = (room.nodes ?? []).filter((n) => Math.hypot(n.tx - tx, n.ty - ty) <= safeRadius);
      for (const raw of raws) {
        expect(ports, `${site}: ${raw}`).toContain(raw);
        expect(nodes.some((n) => NODES[n.nodeId]?.itemId === raw), `${site}: a ${raw} node in its zone`).toBe(true);
      }
    }
  });
});

describe('gear (010, 036)', () => {
  it('has sane name lists, drop chances for real enemies, and the bench on open floor', () => {
    for (const w of [GEAR_NAMES.helm, GEAR_NAMES.boots, GEAR_NAMES.trinket, ...Object.values(GEAR_NAMES.body)]) {
      expect(w.adjectives.length).toBeGreaterThan(0);
      expect(w.nouns.length).toBeGreaterThan(0);
    }
    for (const [id, chance] of Object.entries(ARMOR_DROP_CHANCE)) {
      expect(ENEMIES[id]).toBeDefined();
      expect(chance).toBeGreaterThanOrEqual(0);
      expect(chance).toBeLessThanOrEqual(1);
    }
    expect(ITEMS['unidentified-armor']).toMatchObject({ kind: 'armor', name: 'Unidentified gear' });
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

  it('names real pieces and items in the foundry steps (027), each highlighted machine unlocked before its step', () => {
    /** Every item a recipe's chain makes, the output and its parts all the way down. */
    const all = [...Object.values(RECIPES), ...Object.values(STAGE_RECIPES)];
    const chain = (itemId: string): string[] => {
      const r = all.find((x) => x.output.itemId === itemId);
      return r ? [itemId, ...Object.keys(r.inputs).flatMap(chain)] : [];
    };
    const machineOutputs = Object.values(PIECES).flatMap((p) => (p.kind === 'machine' ? [recipeDef(p.recipeId).output.itemId] : []));
    for (const [i, o] of OBJECTIVES.entries()) {
      const c = o.check;
      if (c.kind === 'placed') expect(PIECES[c.piece], o.text).toBeDefined();
      if (c.kind === 'hopperHolds') expect(ITEMS[c.item], o.text).toBeDefined();
      if (c.kind === 'machineMade') expect(machineOutputs, o.text).toContain(c.item);
      if (c.kind === 'intakeFed' && c.item) expect(Object.values(AMMO).map((a) => a.itemId), o.text).toContain(c.item);
      if (!o.highlight) continue;
      expect(BUILD_BAR, o.text).toContain(o.highlight);
      const def = pieceDef(o.highlight);
      if (def.kind !== 'machine') continue;
      // Hidden pieces never show on the bar (026), so an earlier objective must have hand-crafted what it makes.
      const made = recipeDef(def.recipeId).output.itemId;
      const before = OBJECTIVES.slice(0, i).flatMap((p) => (p.check.kind === 'crafted' ? p.check.items.flatMap(chain) : []));
      expect(before, o.text).toContain(made);
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
    // 034: Stonefall Hollows' barrier seals its gap the same way.
    expect([...tileGates]).toEqual(['shrine', 'hollows']);
    for (const t of outside.gateTiles ?? []) expect(outside.rows[t.ty]?.[t.tx]).toBe(TILE.floor);
    for (const r of Object.values(RECIPES)) if (r.requires) expect(r.requires).toBe('attuned');
    expect(TUTORIAL_START.room).toBe(OVERWORLD.id);
  });
});
