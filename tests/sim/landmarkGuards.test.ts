import { describe, expect, it } from 'vitest';
import { LANDMARK_LIST } from '../../src/data/landmarks';
import { OVERWORLD, OVERWORLD_ROOM } from '../../src/data/overworld';
import { TILE } from '../../src/data/rooms';
import { createSim } from '../../src/sim/state';
import { tileCentre } from '../../src/sim/tiles';
import { WORLD } from '../../src/sim/world';
import { movePlayer, run, SEED } from './fight';

// Landmark guards (032) stay out of the tutorial: none wakes while the player fights
// the ruin field's pack anywhere inside its walls.

const IDS = LANDMARK_LIST.map((l) => l.id);
const rows = WORLD[OVERWORLD_ROOM]?.rows ?? [];

/** Every open tile inside the ruin field's broken walls: where the field fight happens. */
function fieldTiles(): { tx: number; ty: number }[] {
  const walls = OVERWORLD.ruinField.walls;
  const x0 = Math.min(...walls.map((t) => t.tx));
  const x1 = Math.max(...walls.map((t) => t.tx));
  const y0 = Math.min(...walls.map((t) => t.ty));
  const y1 = Math.max(...OVERWORLD.entrance.mound.map((t) => t.ty));
  const out: { tx: number; ty: number }[] = [];
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (rows[ty]?.[tx] === TILE.floor || rows[ty]?.[tx] === TILE.path) out.push({ tx, ty });
  return out;
}

describe('landmark guards and the ruin field fight', () => {
  it('none wakes with the player anywhere in the ruin field', () => {
    const s = createSim(SEED);
    const tiles = fieldTiles();
    expect(tiles.length).toBeGreaterThan(100);
    for (const t of tiles) {
      for (const e of s.enemies) {
        e.mode = 'idle';
        e.x = e.homeX;
        e.y = e.homeY;
      }
      const at = tileCentre(t);
      movePlayer(s, at.x, at.y);
      s.player.health = 100;
      run(s, 1);
      const woke = s.enemies.filter((e) => IDS.includes(e.group) && e.mode !== 'idle').map((e) => `${e.group} ${e.enemyId}`);
      expect(woke, `player at ${t.tx},${t.ty}`).toEqual([]);
    }
  });
});
