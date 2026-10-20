import { describe, expect, it } from 'vitest';
import { DAYLIGHT_PALETTE } from '../../src/data/palette';
import { BLASTFLETCH, LANE_ANGLES, LANE_COLORS, OVERPRESSURE, SHATTERPOINT, TALENT_LIST, TALENT_START, TALENTS } from '../../src/data/talents';

// The tree as data (037): 19 nodes and the start, three keystones, links both ways to real
// ids, every node reachable, no pierce or foundry effects.

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe('the talent tree', () => {
  it('has the start and the spec’s 19 nodes, three of them keystones', () => {
    expect(TALENT_LIST.map((t) => t.id)).toEqual(['start', 'a1', 'a2', 'a3', 'b1', 'b2', 'b3', 'l1', 'l2', 'l3', 't1', 't2', 't3', 's1', 's2', 's3', 's4', 'k1', 'k2', 'k3']);
    expect(TALENT_LIST.filter((t) => t.kind === 'keystone').map((t) => t.name)).toEqual(['Blastfletch', 'Shatterpoint', 'Overpressure']);
    expect(TALENT_LIST.filter((t) => t.kind === 'minor')).toHaveLength(16);
    expect(TALENTS[TALENT_START]?.kind).toBe('start');
    for (const t of TALENT_LIST) expect(t.id).toMatch(KEBAB);
  });

  it('links both ways, only to real nodes, as the spec’s table', () => {
    for (const t of TALENT_LIST) {
      for (const l of t.links) {
        expect(TALENTS[l], `${t.id} → ${l}`).toBeDefined();
        expect(TALENTS[l]?.links, `${l} → ${t.id}`).toContain(t.id);
      }
    }
    expect(TALENTS.start?.links).toEqual(['a1', 'b1', 'l1', 't1', 's1']);
    expect(TALENTS.a3?.links).toEqual(['a2', 'k1', 'k2']);
    expect(TALENTS.k1?.links).toEqual(['a3', 'b3']);
    expect(TALENTS.k2?.links).toEqual(['a3', 'l3']);
    expect(TALENTS.k3?.links).toEqual(['t3']);
    expect(TALENTS.s4?.links).toEqual(['s3']);
  });

  it('reaches every node from the start', () => {
    const seen = new Set([TALENT_START]);
    const queue = [TALENT_START];
    for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
      for (const l of TALENTS[id]?.links ?? []) {
        if (seen.has(l)) continue;
        seen.add(l);
        queue.push(l);
      }
    }
    expect(seen.size).toBe(TALENT_LIST.length);
  });

  it('touches no pierce, foundry or active skill (its regen’s whole healing steps are checked with 030’s rates)', () => {
    const lines = TALENT_LIST.flatMap((t) => t.lines);
    for (const l of lines) expect(l.scope, JSON.stringify(l)).not.toBe('pierce');
    const stats = new Set(lines.flatMap((l) => ('stat' in l ? [l.stat] : [])));
    for (const st of stats) expect(['damage', 'fire-rate', 'stacks-to-freeze', 'duration', 'radius', 'flight-time', 'turn-rate', 'shards', 'firing-walk', 'max-health', 'field-regen', 'armor', 'move-speed']).toContain(st);
    // Keystones are rule lines, one rule each but Blastfletch's two; only keystones carry rules.
    for (const t of TALENT_LIST) expect(t.lines.some((l) => 'rule' in l), t.id).toBe(t.kind === 'keystone');
  });

  it('places the lanes: Arrows up, Ley up-right, Tube down-right, Survival down-left, Bombs up-left; keystones between their lanes', () => {
    const p = (id: string) => TALENTS[id]?.pos ?? { x: NaN, y: NaN };
    expect(p('start')).toEqual({ x: 0, y: 0 });
    expect(p('a1').x).toBe(0);
    expect(p('a1').y).toBeLessThan(0);
    expect(p('l1').x).toBeGreaterThan(0);
    expect(p('l1').y).toBeLessThan(0);
    expect(p('t1').x).toBeGreaterThan(0);
    expect(p('t1').y).toBeGreaterThan(0);
    expect(p('s1').x).toBeLessThan(0);
    expect(p('s1').y).toBeGreaterThan(0);
    expect(p('b1').x).toBeLessThan(0);
    expect(p('b1').y).toBeLessThan(0);
    // Blastfletch between Arrows and Bombs (up-left of the Arrows lane), Shatterpoint between Arrows and Ley.
    expect(p('k1').x).toBeLessThan(0);
    expect(p('k1').y).toBeLessThan(p('b3').y);
    expect(p('k2').x).toBeGreaterThan(0);
    expect(p('k2').y).toBeLessThan(p('l3').y);
    // Overpressure at the Tube lane's tip, beyond Hard Bore.
    expect(Math.hypot(p('k3').x, p('k3').y)).toBeGreaterThan(Math.hypot(p('t3').x, p('t3').y));
    expect(Object.keys(LANE_ANGLES).sort()).toEqual(['arrows', 'bombs', 'ley', 'survival', 'tube']);
    const ids = new Set(DAYLIGHT_PALETTE.map((c) => c.id));
    for (const c of Object.values(LANE_COLORS)) expect(ids.has(c), c).toBe(true);
  });

  it('keeps the keystones’ tuning as the spec says', () => {
    // 039.3: a Pool-burst and Shatterpoint's Shards take their round's damage type.
    expect(BLASTFLETCH).toEqual({ poolTicks: 20, damageScale: 1.5, burstRadius: 24 });
    expect(SHATTERPOINT).toEqual({ damageScale: 2, shards: 4, shardScale: 0.5, range: 64, speed: 360 });
    expect(OVERPRESSURE).toEqual({ rampTicks: 120, rate: 1.25 });
  });
});
