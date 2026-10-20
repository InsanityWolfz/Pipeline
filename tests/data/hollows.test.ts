import { describe, expect, it } from 'vitest';
import { SITE_SAFE_RADIUS } from '../../src/data/claims';
import { ENEMIES } from '../../src/data/enemies';
import { HOLLOWS } from '../../src/data/hollows';
import { HOLLOWS_SITES } from '../../src/data/hollowsSites';
import { ITEMS } from '../../src/data/items';
import { NODES } from '../../src/data/nodes';
import { OBJECTIVES } from '../../src/data/objectives';
import { OVERWORLD, ringOf } from '../../src/data/overworld';
import { POPULATION } from '../../src/data/population';

// Stonefall Hollows as data (034): its landmarks and site name only real things, sit in
// ring 3, and the Cistern Terrace's zone holds what it sends home.

const byId = (id: string) => {
  const l = HOLLOWS_SITES.find((x) => x.id === id);
  if (!l) throw new Error(`no ${id}`);
  return l;
};
const inside = (r: { x0: number; y0: number; x1: number; y1: number }, t: { tx: number; ty: number }) => t.tx >= r.x0 && t.tx <= r.x1 && t.ty >= r.y0 && t.ty <= r.y1;

describe('the Hollows landmarks', () => {
  it('are the Ley-iron Cut, the Broken Aqueduct and the Cistern Terrace (with 030\'s spring), all in ring 3', () => {
    expect(HOLLOWS_SITES.map((l) => [l.id, l.name, l.kind, l.marker])).toEqual([
      ['ley-iron-cut', 'Ley-iron Cut', 'resource-site', 'site'],
      ['broken-aqueduct', 'Broken Aqueduct', 'ruin', 'aqueduct'],
      ['cistern-terrace', 'Cistern Terrace', 'resource-site', 'site'],
    ]);
    for (const l of HOLLOWS_SITES) {
      expect(l.ring).toBe(3);
      expect(ringOf(Math.round((l.area.x0 + l.area.x1) / 2), Math.round((l.area.y0 + l.area.y1) / 2))).toBe(3);
      for (const n of l.nodes) expect(NODES[n.nodeId], l.id).toBeDefined();
      for (const g of l.guards) expect(ENEMIES[g.enemyId], l.id).toBeDefined();
      for (const t of l.stamps ?? []) expect(inside(l.area, t), `${l.id} ${t.tx},${t.ty}`).toBe(true);
    }
    expect(OVERWORLD.springs.find((s) => s.id === 'hollows-spring')).toMatchObject({ ring: 3 });
  });

  it('give the Cut a dense cluster of ley-iron seams under its quarry face, and boulders', () => {
    const cut = byId('ley-iron-cut');
    expect(cut.nodes.filter((n) => n.nodeId === 'ley-iron-seam')).toHaveLength(5);
    expect(cut.nodes.filter((n) => n.nodeId === 'rubble').length).toBeGreaterThanOrEqual(2);
    expect(cut.pylon).toBeUndefined();
  });

  it("put the Terrace's pylon among a fixed pack of six of the region's four (035), with a ley-iron seam and a boulder in its zone", () => {
    const t = byId('cistern-terrace');
    const pylon = t.pylon;
    if (!pylon) throw new Error('no pylon');
    expect(pylon.supplies).toEqual(['ley-iron', 'stone']);
    for (const raw of pylon.supplies) expect(ITEMS[raw]?.kind).toBe('raw');
    // 035: 2 Shardbacks, 2 Chargers, 1 Burrower and 1 Sniper.
    const count = (id: string) => t.guards.filter((g) => g.enemyId === id).length;
    expect(t.guards).toHaveLength(6);
    expect([count('shardback'), count('charger'), count('burrower'), count('sniper')]).toEqual([2, 2, 1, 1]);
    const nodes = OVERWORLD.nodes.filter((n) => Math.hypot(n.tx - pylon.tx, n.ty - pylon.ty) <= SITE_SAFE_RADIUS);
    for (const raw of pylon.supplies) expect(nodes.some((n) => NODES[n.nodeId]?.itemId === raw), raw).toBe(true);
    const line = OVERWORLD.leyLines[t.id];
    expect(line?.[0]).toEqual({ tx: pylon.tx, ty: pylon.ty });
    const door = OVERWORLD.entrance.door;
    const end = line?.[line.length - 1];
    expect(end && Math.hypot(end.tx - door.tx, end.ty - door.ty) <= 3).toBe(true);
  });

  it('keep the arena out of every landmark, and packs out of it', () => {
    for (const l of HOLLOWS_SITES) {
      const a = HOLLOWS.arena.bounds;
      expect(l.area.x1 < a.x0 || l.area.x0 > a.x1 || l.area.y1 < a.y0 || l.area.y0 > a.y1, l.id).toBe(true);
    }
    expect(POPULATION.rings[3]).toEqual({ packs: 6, size: [4, 5], enemies: ['shardback', 'charger', 'charger', 'burrower', 'sniper'], limits: { sniper: 1, burrower: 2 } });
  });
});

describe('the Region 2 goals (034)', () => {
  it("follow 032's \"Claim a second pylon\", end with 028's \"Feed all three entrances\", all in Milestone 1", () => {
    const i = OBJECTIVES.findIndex((o) => o.text === 'Claim a second pylon');
    expect(OBJECTIVES.slice(i + 1).map((o) => [o.text, o.check, o.milestone])).toEqual([
      ['Breach Stonefall Hollows', { kind: 'inRegion', region: 2 }, 'm1'],
      ["Claim the Cistern Terrace's pylon", { kind: 'claimed', site: 'cistern-terrace' }, 'm1'],
      ['Defeat the Bulwark', { kind: 'bossDefeated', boss: 'bulwark' }, 'm1'],
      ["Restore the intake's third entrance (E with the Bulwark core)", { kind: 'restored', node: 'entrance-3' }, 'm1'],
      ['Feed all three entrances', { kind: 'volley', min: 3 }, 'm1'],
    ]);
  });
});
