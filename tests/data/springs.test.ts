import { describe, expect, it } from 'vitest';
import { GROTTO } from '../../src/data/grotto';
import { OVERWORLD, ringOf, SPRING_CLEARING, SPRING_RADIUS } from '../../src/data/overworld';
import { TILE } from '../../src/data/rooms';
import { generateOverworld } from '../../src/sim/overworldGen';
import { springClearing } from '../../src/data/springs';
import { reachable, tileKey } from '../fixtures/reach';

// Ley Springs (030): three pools on the fixed map, each in its own clearing, on open
// ground and reachable on foot from where the player wakes.

const room = generateOverworld();
const at = (tx: number, ty: number): string | undefined => room.rows[ty]?.[tx];

/** The tiles a spring's pool covers: any tile whose centre is within the radius, plus half a tile. */
function poolTiles(s: { tx: number; ty: number; radius: number }): { tx: number; ty: number }[] {
  const out: { tx: number; ty: number }[] = [];
  const r = Math.ceil(s.radius);
  for (let ty = s.ty - r; ty <= s.ty + r; ty++) for (let tx = s.tx - r; tx <= s.tx + r; tx++) if (Math.hypot(tx - s.tx, ty - s.ty) <= s.radius + 0.5) out.push({ tx, ty });
  return out;
}

describe('Ley Springs', () => {
  it('three springs at the spec tiles and rings, each with a 1.5-tile pool', () => {
    expect(SPRING_RADIUS).toBe(1.5);
    expect(OVERWORLD.springs.map(({ id, tx, ty, radius }) => ({ id, tx, ty, radius }))).toEqual([
      { id: 'west-spring', tx: 10, ty: 31, radius: 1.5 },
      { id: 'south-east-spring', tx: 66, ty: 38, radius: 1.5 },
      { id: 'north-spring', tx: 26, ty: 8, radius: 1.5 },
    ]);
    expect(OVERWORLD.springs.map((s) => ringOf(s.tx, s.ty))).toEqual([2, 2, 1]);
    for (const s of OVERWORLD.springs) expect(s.id).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it('each sits in a clearing: no tree, rock, ruin or water on or round its pool', () => {
    for (const s of OVERWORLD.springs) {
      for (let ty = s.ty - SPRING_CLEARING; ty <= s.ty + SPRING_CLEARING; ty++) {
        for (let tx = s.tx - SPRING_CLEARING; tx <= s.tx + SPRING_CLEARING; tx++) expect([TILE.floor, TILE.path], `${s.id} ${tx},${ty}`).toContain(at(tx, ty));
      }
    }
  });

  it('no generated pond (shallows included) reaches into a spring clearing', () => {
    const ponds = room.terrain?.ponds ?? [];
    expect(ponds.length).toBeGreaterThan(0);
    for (const s of OVERWORLD.springs) {
      const c = springClearing(s);
      // A pond's water and shallows are the tiles within `shore` of its radii (the generator's own rule).
      for (const p of ponds) {
        for (let ty = c.y0; ty <= c.y1; ty++) {
          for (let tx = c.x0; tx <= c.x1; tx++) {
            expect(Math.hypot((tx - p.cx) / p.rx, (ty - p.cy) / p.ry), `${s.id}: ${tx},${ty} in the pond at ${p.cx},${p.cy}`).toBeGreaterThan(OVERWORLD.ponds.shore);
          }
        }
      }
    }
  });

  it('each pool is open ground, reachable on foot from the wake tile', () => {
    const seen = reachable(room, OVERWORLD.wake);
    for (const s of OVERWORLD.springs) {
      for (const t of poolTiles(s)) {
        expect([TILE.floor, TILE.path], `${s.id} ${tileKey(t)}`).toContain(at(t.tx, t.ty));
        expect(seen.has(tileKey(t)), `${s.id} ${tileKey(t)}`).toBe(true);
      }
    }
  });

  it("the west pool sits beside the road south of the west path's fork, not on it, and clear of the Grotto", () => {
    const west = OVERWORLD.springs.find((s) => s.id === 'west-spring');
    if (!west) throw new Error('no west spring');
    for (const t of poolTiles(west)) expect(at(t.tx, t.ty), tileKey(t)).toBe(TILE.floor);
    expect(OVERWORLD.paths.some((p) => p.some((t) => t.tx === 12 && t.ty === 27))).toBe(true);
    for (const s of OVERWORLD.springs) {
      const inGrotto = s.tx + SPRING_CLEARING >= GROTTO.area.x0 && s.tx - SPRING_CLEARING <= GROTTO.area.x1 && s.ty + SPRING_CLEARING >= GROTTO.area.y0 && s.ty - SPRING_CLEARING <= GROTTO.area.y1;
      expect(inGrotto, s.id).toBe(false);
    }
  });

  it('the south-east pool sits at the end of the south-east path', () => {
    const se = OVERWORLD.springs.find((s) => s.id === 'south-east-spring');
    const path = OVERWORLD.paths.find((p) => p[0]?.tx === 41 && p[0]?.ty === 36);
    const end = path?.[path.length - 1];
    if (!se || !end) throw new Error('no south-east spring or path');
    expect(Math.hypot(end.tx - se.tx, end.ty - se.ty)).toBeLessThanOrEqual(se.radius + 1);
  });
});
