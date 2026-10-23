import { HOLLOWS_LOOK } from '../../src/data/hollowsAssets';
import { describe, expect, it } from 'vitest';
import { SITE_SAFE_RADIUS, SITE_SUPPLY } from '../../src/data/claims';
import { ENEMIES } from '../../src/data/enemies';
import { ITEMS } from '../../src/data/items';
import { LANDMARK_LIST, LANDMARKS, type LandmarkDef } from '../../src/data/landmarks';
import { NODES } from '../../src/data/nodes';
import { OVERWORLD, ringOf, type TileRect } from '../../src/data/overworld';
import { TILE } from '../../src/data/rooms';
import { generateOverworld } from '../../src/sim/overworldGen';
import { DISCOVERY_BANNER, LANDMARK_SPRITES, MAP_ICONS } from '../../src/data/landmarkAssets';
import { TUTORIAL_LAYOUT } from '../../src/data/foundryAssets';
import { TEXT_STYLES } from '../../src/data/fonts';
import { vectorFrames } from '../../src/render/vector/catalog';
import { WORLD } from '../../src/sim/world';
import { reachable, tileKey } from '../fixtures/reach';
import { EMBERWORKS, inEmberworks } from '../../src/data/emberworks';
import { HOLLOWS, inHollows } from '../../src/data/hollows';
import { RUIN_AREA } from '../../src/data/home';
import { fromCentre, polar, WORLD_SHAPE } from '../../src/data/worldShape';

// Landmarks as data (032): typed entries stamped onto the fixed map, clear of each
// other and of the tutorial's ground, each in its declared ring and reachable on foot.

const room = generateOverworld();
const at = (tx: number, ty: number): string | undefined => room.rows[ty]?.[tx];
const overlap = (a: TileRect, b: TileRect): boolean => a.x0 <= b.x1 && b.x0 <= a.x1 && a.y0 <= b.y1 && b.y0 <= a.y1;
const inside = (r: TileRect, t: { tx: number; ty: number }): boolean => t.tx >= r.x0 && t.tx <= r.x1 && t.ty >= r.y0 && t.ty <= r.y1;
const byId = (id: string): LandmarkDef => {
  const l = LANDMARK_LIST.find((x) => x.id === id);
  if (!l) throw new Error(`no landmark ${id}`);
  return l;
};
/** Region 1's resource sites (032), each with its own pylon; Stonefall Hollows' (034) are tested in tests/data/hollows.test.ts, the Emberworks' (060) in tests/sim/emberworksSites.test.ts. */
const SITES = LANDMARK_LIST.filter((l) => l.kind === 'resource-site' && l.ring !== 3 && l.ring !== 4);

describe('landmark entries', () => {
  it('are typed with kebab-case ids, names and a known kind and marker', () => {
    const ids = LANDMARK_LIST.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const l of LANDMARK_LIST) {
      expect(l.id).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(l.name.length).toBeGreaterThan(0);
      expect(['resource-site', 'frozen-grotto', 'ley-springs', 'ruined-cache', 'ruin']).toContain(l.kind);
      expect(['site', 'grotto', 'spring', 'cache', 'aqueduct', 'river']).toContain(l.marker);
    }
    // 034's (the Hollows' spring among the springs, then its three) after 032's; 049's Husk Hive after 032's sites.
    expect(ids).toEqual([
      'frozen-grotto',
      'quarry',
      'old-grove',
      'ley-grotto',
      'reed-marsh',
      'ruined-cache',
      'husk-hive',
      'west-spring',
      'south-east-spring',
      'north-spring',
      'hollows-spring',
      // 060: the Emberworks' spring among the springs, then its places.
      'emberworks-spring',
      'ley-iron-cut',
      'broken-aqueduct',
      'cistern-terrace',
      'ash-kilns',
      'cinder-vents',
      'slag-river',
      'outpost-forge',
    ]);
  });

  it('stand at their places on the round map (053), each in its spec ring; the Grotto moved whole, the springs in their own places', () => {
    // Each Region 1 site's middle tile at its bearing and distance from the foundry's door.
    const places: [string, number, number, 1 | 2][] = [
      ['quarry', 272, 22, 1],
      ['old-grove', 297, 37, 2],
      ['ley-grotto', 95, 36, 2],
      ['reed-marsh', 155, 38, 2],
      ['ruined-cache', 212, 37, 2],
      ['husk-hive', 120, 35, 2],
    ];
    for (const [id, bearing, r, ring] of places) {
      const a = byId(id).area;
      expect({ tx: Math.floor((a.x0 + a.x1) / 2), ty: Math.floor((a.y0 + a.y1) / 2) }, id).toEqual(polar(bearing, r));
      expect(byId(id).ring, id).toBe(ring);
    }
    // 029's Grotto, moved whole (+25, +39 from its tiles before 034) to the north, and +31 with the centre (060).
    expect(byId('frozen-grotto').area).toEqual({ x0: 9 + 40 + 25 + 31, y0: 5 + 39 + 31, x1: 19 + 40 + 25 + 31, y1: 13 + 39 + 31 });
    expect(byId('frozen-grotto').ring).toBe(2);
    for (const s of OVERWORLD.springs) {
      const l = byId(s.id);
      expect(l.kind).toBe('ley-springs');
      expect(inside(l.area, s)).toBe(true);
    }
  });

  it('name only real items, enemies and nodes', () => {
    for (const l of LANDMARK_LIST) {
      for (const n of l.nodes) expect(NODES[n.nodeId], `${l.id} ${n.nodeId}`).toBeDefined();
      for (const g of l.guards) expect(ENEMIES[g.enemyId], `${l.id} ${g.enemyId}`).toBeDefined();
      for (const raw of l.pylon?.supplies ?? []) expect(ITEMS[raw]?.kind, l.id).toBe('raw');
    }
  });

  it('tune the banner, the cache re-arm (10 minutes of play) and the cache hold', () => {
    expect(LANDMARKS).toEqual({ bannerMs: 2000, cacheRearmTicks: 36_000, cacheOpenTicks: 60 });
  });

  it('put the discovery banner at the top (050), under the boss bar and above the objective band, so it covers neither', () => {
    const { objectiveTop, objectivePanel } = TUTORIAL_LAYOUT;
    const B = DISCOVERY_BANNER;
    const height = 2 * B.pad.y + TEXT_STYLES.label.lineHeight + B.kickerGap + TEXT_STYLES.title.lineHeight;
    const bar = HOLLOWS_LOOK.bossBar;
    expect(B.top).toBeGreaterThan(bar.top + bar.h + 2 * bar.border);
    expect(B.top + height).toBeLessThan(objectiveTop - objectivePanel.padY);
  });

  it('give every marker an icon, and every look a sprite on the contact sheet', () => {
    const frames = new Set(vectorFrames().map((f) => f.name));
    for (const l of LANDMARK_LIST) expect(frames.has(MAP_ICONS[l.marker]), l.id).toBe(true);
    for (const key of Object.values(LANDMARK_SPRITES).flat()) expect(frames.has(key), key).toBe(true);
  });
});

describe('landmark areas', () => {
  it("lie wholly in their region: Region 1's clear of the barrier's band, the Hollows' clear of it and of the cliff edge, the Emberworks' (060) clear of both its edges", () => {
    for (const { id, area: a } of LANDMARK_LIST) {
      const corners = [[a.x0, a.y0], [a.x1, a.y0], [a.x0, a.y1], [a.x1, a.y1]] as const;
      const hollows = inHollows(Math.round((a.x0 + a.x1) / 2), Math.round((a.y0 + a.y1) / 2));
      const ember = inEmberworks(Math.round((a.x0 + a.x1) / 2), Math.round((a.y0 + a.y1) / 2));
      for (const [tx, ty] of corners) {
        const d = fromCentre(tx, ty);
        if (ember) {
          expect(d, id).toBeGreaterThan(EMBERWORKS.radii.inner + EMBERWORKS.wall);
          expect(d, id).toBeLessThan(EMBERWORKS.radii.outer - EMBERWORKS.edge.ragged);
        } else if (hollows) {
          expect(d, id).toBeGreaterThan(WORLD_SHAPE.region1 + 1);
          expect(d, id).toBeLessThan(WORLD_SHAPE.hollows - HOLLOWS.edge.ragged);
        } else expect(d, id).toBeLessThan(WORLD_SHAPE.region1 - 1);
      }
    }
  });

  it("overlap neither each other nor the start meadow, the ruin field or the shrine's ground", () => {
    const [meadow, field, shrine] = OVERWORLD.clearings;
    if (!meadow || !field || !shrine) throw new Error('no tutorial clearings');
    for (const [i, a] of LANDMARK_LIST.entries()) {
      for (const b of LANDMARK_LIST.slice(i + 1)) expect(overlap(a.area, b.area), `${a.id} and ${b.id}`).toBe(false);
      for (const [name, r] of [['meadow', meadow], ['ruin field', field], ['shrine', shrine]] as const) expect(overlap(a.area, r), `${a.id} and the ${name}`).toBe(false);
    }
  });

  it('sit in their declared rings', () => {
    for (const l of LANDMARK_LIST) {
      const cx = Math.round((l.area.x0 + l.area.x1) / 2);
      const cy = Math.round((l.area.y0 + l.area.y1) / 2);
      expect(ringOf(cx, cy), l.id).toBe(l.ring);
      if (l.pylon) expect(ringOf(l.pylon.tx, l.pylon.ty), `${l.id} pylon`).toBe(l.ring);
    }
  });

  it('keep their own things inside them', () => {
    for (const l of LANDMARK_LIST) {
      for (const t of [...l.nodes, ...l.guards, ...(l.pylon ? [l.pylon] : []), ...(l.cache ? [l.cache] : []), ...(l.blocks ?? [])]) expect(inside(l.area, t), `${l.id} ${tileKey(t)}`).toBe(true);
    }
  });

  it('hold no generated tree, rock, water or stone: only their own features, blocks, stamped tiles (034) and pylons', () => {
    const disc = (tx: number, ty: number) =>
      OVERWORLD.features.some((f) => (f.kind === 'pond' ? Math.hypot((tx - f.cx) / f.rx, (ty - f.cy) / f.ry) <= OVERWORLD.ponds.shore : Math.hypot(tx - f.cx, ty - f.cy) <= f.r));
    for (const l of LANDMARK_LIST) {
      const blocks = new Set((l.blocks ?? []).map(tileKey));
      const stamps = new Map((l.stamps ?? []).map((t) => [tileKey(t), t.symbol]));
      for (let ty = l.area.y0; ty <= l.area.y1; ty++) {
        for (let tx = l.area.x0; tx <= l.area.x1; tx++) {
          const s = at(tx, ty);
          if (blocks.has(tileKey({ tx, ty }))) expect(s).toBe(TILE.ruinBlock);
          else if (stamps.has(tileKey({ tx, ty }))) expect(s, `${l.id} ${tx},${ty}`).toBe(stamps.get(tileKey({ tx, ty })));
          else if (!disc(tx, ty)) expect([TILE.floor, TILE.path], `${l.id} ${tx},${ty}`).toContain(s);
        }
      }
      for (const t of [...(l.pylon ? [l.pylon] : []), ...(l.cache ? [l.cache] : [])]) expect(at(t.tx, t.ty), `${l.id} ${tileKey(t)}`).toBe(TILE.floor);
    }
  });

  it('take in no generated pond (they are removed whole), and leave the rest of the map as the seed made it', () => {
    for (const p of room.terrain?.ponds ?? []) for (const l of LANDMARK_LIST) {
      for (let ty = l.area.y0; ty <= l.area.y1; ty++) {
        for (let tx = l.area.x0; tx <= l.area.x1; tx++) {
          const own = l.features.some((f) => f.kind === 'pond' && f.cx === p.cx && f.cy === p.cy);
          if (!own) expect(Math.hypot((tx - p.cx) / p.rx, (ty - p.cy) / p.ry), `${l.id}: pond at ${p.cx},${p.cy}`).toBeGreaterThan(OVERWORLD.ponds.shore);
        }
      }
    }
    // Stamped without landmarks, the same seed differs only in the areas, round the landmarks' own features, on their
    // stamped tiles (060: the Slag River runs on past its area), and where a removed pond lay.
    const bare = generateOverworld(OVERWORLD.seed, []);
    const stamped = new Set(LANDMARK_LIST.flatMap((l) => (l.stamps ?? []).map(tileKey)));
    const removed = (bare.terrain?.ponds ?? []).filter((p) => !(room.terrain?.ponds ?? []).some((q) => q.cx === p.cx && q.cy === p.cy));
    const near = (tx: number, ty: number) =>
      LANDMARK_LIST.some((l) => inside(l.area, { tx, ty }) || l.features.some((f) => Math.hypot(tx - f.cx, ty - f.cy) <= (f.kind === 'pond' ? Math.max(f.rx, f.ry) * 2 : f.r) + 1)) ||
      stamped.has(`${tx},${ty}`) ||
      removed.some((p) => Math.hypot((tx - p.cx) / p.rx, (ty - p.cy) / p.ry) <= OVERWORLD.ponds.shore + 0.01);
    for (let ty = 0; ty < OVERWORLD.height; ty++) {
      for (let tx = 0; tx < OVERWORLD.width; tx++) if (!near(tx, ty)) expect(at(tx, ty), `${tx},${ty}`).toBe(bare.rows[ty]?.[tx]);
    }
  });

  it('are reachable on foot from the wake tile: every guard, node, pylon and reliquary', () => {
    const seen = reachable(room, OVERWORLD.wake);
    for (const l of LANDMARK_LIST) {
      for (const g of l.guards) expect(seen.has(tileKey(g)), `${l.id} guard ${tileKey(g)}`).toBe(true);
      // A node, a pylon or a reliquary is used standing just below it.
      for (const t of [...l.nodes, ...(l.pylon ? [l.pylon] : []), ...(l.cache ? [l.cache] : [])]) expect(seen.has(tileKey({ tx: t.tx, ty: t.ty + 1 })), `${l.id} ${tileKey(t)}`).toBe(true);
      const someTile = [...Array(l.area.y1 - l.area.y0 + 1).keys()].some((dy) => [...Array(l.area.x1 - l.area.x0 + 1).keys()].some((dx) => seen.has(tileKey({ tx: l.area.x0 + dx, ty: l.area.y0 + dy }))));
      expect(someTile, l.id).toBe(true);
    }
  });
});

describe('resource sites', () => {
  it('are the Quarry, Old Grove, Ley Grotto, Reed Marsh and Husk Hive (049), each a cluster of 5 of its node with a pylon supplying its raw', () => {
    expect(SITES.map((l) => [l.id, l.pylon?.supplies])).toEqual([
      ['quarry', ['stone']],
      ['old-grove', ['wood']],
      ['ley-grotto', ['ley-crystal']],
      ['reed-marsh', ['fiber']],
      ['husk-hive', ['husk-resin']],
    ]);
    for (const l of SITES) {
      expect(l.nodes, l.id).toHaveLength(5);
      for (const n of l.nodes) expect(l.pylon?.supplies, l.id).toContain(NODES[n.nodeId]?.itemId);
      expect(l.pylon?.site).toBe(l.id);
    }
  });

  it('send only their own raw, with a node of it in the 7-tile zone round the pylon', () => {
    expect(SITE_SAFE_RADIUS).toBe(7);
    for (const l of SITES) {
      const pylon = l.pylon;
      if (!pylon) throw new Error(`${l.id} has no pylon`);
      expect(SITE_SUPPLY[l.id]).toEqual(pylon.supplies);
      expect(l.nodes.some((n) => Math.hypot(n.tx - pylon.tx, n.ty - pylon.ty) <= SITE_SAFE_RADIUS)).toBe(true);
    }
  });

  it('are guarded by one pack of 3–5 of the ring\'s makeup (Husks, plus Wisps in ring 2), with no boss', () => {
    for (const l of [...SITES, byId('ruined-cache')]) {
      expect(l.ring, l.id).not.toBe(3);
      expect(l.guards.length, l.id).toBeGreaterThanOrEqual(3);
      expect(l.guards.length, l.id).toBeLessThanOrEqual(5);
      const allowed = l.ring === 1 ? ['husk'] : ['husk', 'wisp'];
      for (const g of l.guards) expect(allowed, l.id).toContain(g.enemyId);
    }
    expect(byId('ruined-cache').guards.map((g) => g.enemyId).sort()).toEqual(['husk', 'husk', 'husk', 'husk', 'wisp']);
  });

  it("put no guard, and no other landmark's area, in another site's safe zone", () => {
    const pylons = WORLD[OVERWORLD.id]?.pylons ?? [];
    for (const l of LANDMARK_LIST) {
      for (const g of l.guards) {
        for (const p of pylons) if (p.site !== l.id) expect(Math.hypot(g.tx - p.tx, g.ty - p.ty), `${l.id} guard ${tileKey(g)} in ${p.site}'s zone`).toBeGreaterThan(p.safeRadius);
      }
      // Nor does any other guarded landmark's area reach into a resource site's zone (a spring has no guards).
      for (const p of l.guards.length === 0 ? [] : pylons.filter((x) => x.site !== l.id && x.site !== 'shrine')) {
        const nearest = { tx: Math.min(Math.max(p.tx, l.area.x0), l.area.x1), ty: Math.min(Math.max(p.ty, l.area.y0), l.area.y1) };
        expect(Math.hypot(nearest.tx - p.tx, nearest.ty - p.ty), `${l.id}'s area in ${p.site}'s zone`).toBeGreaterThan(p.safeRadius);
      }
    }
  });

  it('each has a ley line home from its pylon to the foundry ruin', () => {
    const r = RUIN_AREA;
    for (const l of SITES) {
      const line = OVERWORLD.leyLines[l.id];
      expect(line, l.id).toBeDefined();
      expect(line?.[0], l.id).toEqual({ tx: l.pylon?.tx, ty: l.pylon?.ty });
      // 053: home is the edge of the foundry's ruin over the stairs.
      const end = line?.[line.length - 1];
      expect(end && end.tx >= r.x0 - 0.51 && end.tx <= r.x1 + 0.51 && end.ty >= r.y0 - 0.51 && end.ty <= r.y1 + 0.51, l.id).toBe(true);
    }
  });

  it('put their pylons in the world as dormant until the shrine is claimed, at radius 7; the shrine keeps 10', () => {
    const pylons = WORLD[OVERWORLD.id]?.pylons ?? [];
    expect(pylons.map((p) => [p.site, p.safeRadius, p.wakes ?? null])).toEqual([
      ['shrine', 10, null],
      // 055: the Frozen Grotto's, first of the landmarks (029's place in the list).
      ['frozen-grotto', 7, 'shrine'],
      ['quarry', 7, 'shrine'],
      ['old-grove', 7, 'shrine'],
      ['ley-grotto', 7, 'shrine'],
      ['reed-marsh', 7, 'shrine'],
      ['husk-hive', 7, 'shrine'],
      // 034: the Hollows' one claimable site, behind the barrier the shrine's claim drops.
      ['cistern-terrace', 7, 'shrine'],
      // 060: the Emberworks' one, behind the barrier the Bulwark's first kill drops.
      ['ash-kilns', 7, 'shrine'],
    ]);
    expect(WORLD[OVERWORLD.id]?.caches).toEqual([
      { id: 'ruined-cache', ...byId('ruined-cache').cache },
      { id: 'outpost-forge', ...byId('outpost-forge').cache },
    ]);
  });
});
