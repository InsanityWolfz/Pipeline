import { describe, expect, it } from 'vitest';
import { TILE_SIZE } from '../../src/data/config';
import { HOLLOWS } from '../../src/data/hollows';
import { OVERWORLD, ringOf } from '../../src/data/overworld';
import { bearingOf, fromCentre, WORLD_SHAPE } from '../../src/data/worldShape';
import type { EnemyState } from '../../src/sim/enemies';
import { KEEP_OUT, packGround, resetPopulation } from '../../src/sim/population';
import type { SimState } from '../../src/sim/state';
import { arena, movePlayer, placeHusk, run } from './fight';

// 053: the barrier's band (a full circle, sealed into the grid as wall while it's shut) has ring 2 floor on its inner
// half. A pack placed there was pushed out to the Hollows side and stuck, its slot "alive" for good. Packs keep off
// gate tiles and every tile touching one, and an enemy at the edge of where they may stand comes inward to fight.

const tileOf = (e: Pick<EnemyState, 'x' | 'y'>) => ({ tx: Math.floor(e.x / TILE_SIZE), ty: Math.floor(e.y / TILE_SIZE) });
const nearGate = (tx: number, ty: number): boolean => HOLLOWS.gate.some((g) => Math.abs(g.tx - tx) <= 1 && Math.abs(g.ty - ty) <= 1);
const keptOut = (tx: number, ty: number): boolean => KEEP_OUT.some((r) => tx >= r.x0 && tx <= r.x1 && ty >= r.y0 && ty <= r.y1);

/** The outermost ring 2 tile a pack may stand on within 4° of a bearing, with open ground 4 tiles inward. */
function outerGround(bearing: number): { tx: number; ty: number } {
  let best: { tx: number; ty: number; score: number } | null = null;
  for (let ty = 0; ty < OVERWORLD.height; ty++) {
    for (let tx = 0; tx < OVERWORLD.width; tx++) {
      if (ringOf(tx, ty) !== 2 || !packGround(tx, ty)) continue;
      const off = Math.abs(((bearingOf(tx, ty) - bearing + 540) % 360) - 180);
      if (off > 4) continue;
      const score = fromCentre(tx, ty);
      // Open ground all the way to where the player stands, 4 tiles further in.
      const clear = [1, 2, 3, 4].every((k) => {
        const f = 1 - k / score;
        return packGround(Math.round(WORLD_SHAPE.centre.tx + (tx - WORLD_SHAPE.centre.tx) * f), Math.round(WORLD_SHAPE.centre.ty + (ty - WORLD_SHAPE.centre.ty) * f));
      });
      if (!clear) continue;
      if (!best || score > best.score) best = { tx, ty, score };
    }
  }
  if (!best) throw new Error(`no ground at bearing ${bearing}`);
  return best;
}

describe('packs and the barrier (053)', () => {
  it('no gate tile, nor any tile touching one, is ground a pack may stand on', () => {
    for (const g of HOLLOWS.gate) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) expect(packGround(g.tx + dx, g.ty + dy)).toBe(false);
  });

  it('none ever spawn on or beside the band, over many respawns', () => {
    const s: SimState = arena();
    s.populated = true;
    let seen = 0;
    for (let round = 0; round < 30; round++) {
      s.enemies = [];
      resetPopulation(s);
      run(s, 1);
      for (const e of s.enemies.filter((x) => x.group.startsWith('pop-'))) {
        const t = tileOf({ x: e.homeX, y: e.homeY });
        expect(nearGate(t.tx, t.ty)).toBe(false);
        expect(fromCentre(t.tx, t.ty)).toBeLessThan(WORLD_SHAPE.region1 - WORLD_SHAPE.barrierHalfWidth);
        seen++;
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  // Every 45° but the shrine's (its surroundings are kept clear of packs, 053.10).
  for (const bearing of [0, 90, 135, 180, 225, 270, 315]) {
    it(`an aggroed enemy at the outer edge of ring 2 ground comes inward to the player (bearing ${bearing})`, () => {
      const s = arena();
      const t = outerGround(bearing);
      const at = { x: (t.tx + 0.5) * TILE_SIZE, y: (t.ty + 0.5) * TILE_SIZE };
      // The player 4 tiles further in, towards the foundry.
      const r = fromCentre(t.tx, t.ty);
      const ux = (WORLD_SHAPE.centre.tx - t.tx) / r;
      const uy = (WORLD_SHAPE.centre.ty - t.ty) / r;
      movePlayer(s, at.x + ux * 4 * TILE_SIZE, at.y + uy * 4 * TILE_SIZE);
      s.player.health = 1e9;
      const e = placeHusk(s, at.x, at.y, OVERWORLD.id);
      e.mode = 'chase';
      let closest = Infinity;
      for (let k = 0; k < 300; k++) {
        run(s, 1);
        closest = Math.min(closest, Math.hypot(e.x - s.player.x, e.y - s.player.y));
      }
      expect(closest).toBeLessThan(40);
      const now = tileOf(e);
      expect(fromCentre(now.tx, now.ty)).toBeLessThan(r);
      expect(keptOut(t.tx, t.ty)).toBe(false);
    });
  }
});
