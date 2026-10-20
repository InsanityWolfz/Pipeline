import { HOLLOWS } from '../data/hollows';
import { TILE, type Room } from '../data/rooms';
import { SANDBOX, SANDBOX_PENS, WARDEN_ARENA } from '../data/sandbox';
import type { TileRect } from '../data/tiles';

// The sandbox's room (044), built from its layout (src/data/sandbox.ts) once, like the
// overworld is generated: an outer wall, the pens along the north wall each open to the
// south, the open middle with the spawn and the bench, the Warden's walled arena and the
// Sunken Forum (its own cliffs, colonnade and columns, at the Hollows' tiles) along the
// south. No doors: the sandbox is its own world.

type Grid = string[][];

const set = (grid: Grid, tx: number, ty: number, symbol: string): void => {
  const row = grid[ty];
  if (row && tx >= 0 && tx < row.length) row[tx] = symbol;
};

/** A rect's outline in walls, with a gap in one of its sides (columns `gap.x0..x1` of row `gapRow`). */
function walls(grid: Grid, r: TileRect, gap: { x0: number; x1: number }, gapRow: number): void {
  for (let tx = r.x0; tx <= r.x1; tx++) {
    for (const ty of [r.y0, r.y1]) if (ty !== gapRow || tx < gap.x0 || tx > gap.x1) set(grid, tx, ty, TILE.wall);
  }
  for (let ty = r.y0 + 1; ty < r.y1; ty++) {
    set(grid, r.x0, ty, TILE.wall);
    set(grid, r.x1, ty, TILE.wall);
  }
}

export function buildSandboxRoom(): Room {
  const { width, height } = SANDBOX;
  const grid: Grid = Array.from({ length: height }, (_, ty) =>
    Array.from({ length: width }, (_, tx) => (tx === 0 || ty === 0 || tx === width - 1 || ty === height - 1 ? TILE.wall : TILE.floor)),
  );
  for (const p of SANDBOX_PENS) walls(grid, p.bounds, p.gap, p.bounds.y1);
  walls(grid, WARDEN_ARENA.bounds, WARDEN_ARENA.way, WARDEN_ARENA.bounds.y0);
  for (const t of HOLLOWS.arena.walls) set(grid, t.tx, t.ty, t.symbol);
  set(grid, SANDBOX.bench.tx, SANDBOX.bench.ty, TILE.ruinBlock);
  return {
    id: SANDBOX.room,
    rows: grid.map((r) => r.join('')),
    spawn: SANDBOX.spawn,
    props: [{ propId: 'bench', tx: SANDBOX.bench.tx, ty: SANDBOX.bench.ty }],
  };
}
