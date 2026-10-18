import { TILE_SIZE } from '../data/config';
import { DESCRIPTIONS } from '../data/descriptions';
import { enemyDef } from '../data/enemies';
import { HOVER_NAME, WORLD_NAMES } from '../data/hudLayout';
import { itemDef } from '../data/items';
import { nodeDef } from '../data/nodes';
import { OVERWORLD } from '../data/overworld';
import { pieceDef } from '../data/pieces';
import { FOUNDRY_ROOM } from '../data/rooms';
import { fixtureAt, fixtureDef } from '../sim/fixtures';
import { pieceAt } from '../sim/pieces';
import { roomById, type SimState } from '../sim/state';

// What's under the cursor in the world, by name (015). Pure, so tests can check
// it; render draws the name above the thing it returns.

/** A named thing: its name, the ground point it stands on, and how far above that to draw the name. */
export interface HoverName {
  name: string;
  x: number;
  y: number;
  rise: number;
  /** A foundry piece's id, so render can sit the name above its sprite and readout. */
  pieceId?: number;
  /** A line under the name saying where materials come from (018). */
  description?: string;
}

/** Distance from a point to a polyline of tile points, px. */
function toLine(px: number, py: number, line: readonly { tx: number; ty: number }[]): number {
  let best = Infinity;
  for (let i = 0; i + 1 < line.length; i++) {
    const a = line[i];
    const b = line[i + 1];
    if (!a || !b) continue;
    const ax = (a.tx + 0.5) * TILE_SIZE;
    const ay = (a.ty + 0.5) * TILE_SIZE;
    const dx = (b.tx - a.tx) * TILE_SIZE;
    const dy = (b.ty - a.ty) * TILE_SIZE;
    const k = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(px - (ax + k * dx), py - (ay + k * dy)));
  }
  return best;
}

const inBox = (px: number, py: number, x: number, y: number, box: { w: number; h: number }): boolean =>
  Math.abs(px - x) <= box.w / 2 && py <= y + box.h * HOVER_NAME.below && py >= y - box.h;

/**
 * The name of the thing at world point (px, py) in `roomId`, in order: foundry
 * pieces and fixtures, enemies, ground items, nodes, then the pylon, the tube's
 * stone, the ley crystal, and a ley line (018). Null when nothing is there.
 */
export function nameAt(sim: SimState, roomId: string, px: number, py: number): HoverName | null {
  const tx = Math.floor(px / TILE_SIZE);
  const ty = Math.floor(py / TILE_SIZE);
  const centre = (t: { tx: number; ty: number }) => ({ x: (t.tx + 0.5) * TILE_SIZE, y: (t.ty + 1) * TILE_SIZE });
  if (roomId === FOUNDRY_ROOM) {
    const piece = pieceAt(sim.foundry, tx, ty);
    if (piece) return { name: pieceDef(piece.pieceId).name, ...centre(piece), rise: HOVER_NAME.tile.rise, pieceId: piece.id };
    const fixture = fixtureAt(sim.fixtures, tx, ty);
    if (fixture) {
      const def = fixtureDef(fixture.id);
      return { name: def.name, ...centre(def), rise: HOVER_NAME.tile.rise, ...(def.kind === 'port' ? { description: DESCRIPTIONS.port } : {}) };
    }
  }
  for (const e of sim.enemies) {
    if (e.roomId === roomId && e.health > 0 && inBox(px, py, e.x, e.y, HOVER_NAME.enemy)) {
      return { name: enemyDef(e.enemyId).name, x: e.x, y: e.y, rise: HOVER_NAME.enemy.rise };
    }
  }
  for (const g of sim.groundItems) {
    if (g.roomId === roomId && inBox(px, py, g.x, g.y, HOVER_NAME.item)) return { name: itemDef(g.itemId).name, x: g.x, y: g.y, rise: HOVER_NAME.item.rise };
  }
  for (const n of sim.nodes) {
    if (n.roomId === roomId && inBox(px, py, n.x, n.y, HOVER_NAME.node)) return { name: nodeDef(n.nodeId).name, x: n.x, y: n.y, rise: HOVER_NAME.node.rise };
  }
  const room = roomById(roomId);
  const on = (t: { tx: number; ty: number } | undefined) => t !== undefined && t.tx === tx && t.ty === ty;
  if (on(room.pylon) && room.pylon) return { name: WORLD_NAMES.pylon, ...centre(room.pylon), rise: HOVER_NAME.tile.rise, description: sim.claims.includes(room.pylon.site) ? DESCRIPTIONS.pylon : DESCRIPTIONS.pylonDormant };
  if (on(room.tubeStone) && room.tubeStone) {
    return { name: sim.hasTube ? WORLD_NAMES.tubeStone : WORLD_NAMES.dormantTube, ...centre(room.tubeStone), rise: HOVER_NAME.tile.rise };
  }
  if (on(room.crystal) && room.crystal) return { name: WORLD_NAMES.crystal, ...centre(room.crystal), rise: HOVER_NAME.tile.rise };
  if (roomId === OVERWORLD.id && Object.values(OVERWORLD.leyLines).some((l) => toLine(px, py, l) <= HOVER_NAME.leyLine)) {
    return { name: WORLD_NAMES.leyLine, x: px, y: py, rise: HOVER_NAME.leyLineRise, description: DESCRIPTIONS.leyLine };
  }
  return null;
}
