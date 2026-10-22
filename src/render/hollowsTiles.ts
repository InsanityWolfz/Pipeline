import { HOLLOWS } from '../data/hollows';
import { HOLLOWS_SPRITES } from '../data/hollowsAssets';
import { TILE, type Room } from '../data/rooms';

// Stonefall Hollows' standing tiles (034), shared by the overworld's view and, since 044, the
// tiled rooms' (the sandbox's Sunken Forum).

/** True on the Sunken Forum's outline (its walls, 034/055): the same tiles in the overworld and the sandbox's room. */
function onForumWall(tx: number, ty: number): boolean {
  const b = HOLLOWS.arena.bounds;
  const inside = tx >= b.x0 && tx <= b.x1 && ty >= b.y0 && ty <= b.y1;
  return inside && (tx === b.x0 || tx === b.x1 || ty === b.y0 || ty === b.y1);
}

/** A Hollows tile's standing sprite (034): a cliff (its plateau where another stands in front), a pillar, an arch, a fallen span, rubble. */
export function hollowsFrame(symbol: string, tx: number, ty: number, hash: number, room: Room | null): string | undefined {
  const S = HOLLOWS_SPRITES;
  // 059: the forum's own walls (the cliffs round its outline) are drawn dark, as walls.
  if (symbol === TILE.cliff && onForumWall(tx, ty)) return S.forumWall;
  if (symbol === TILE.cliff) return room?.rows[ty + 1]?.[tx] === TILE.cliff ? S.cliffTop : S.cliffs[hash % S.cliffs.length];
  if (symbol === TILE.pillar) return S.pillar;
  if (symbol === TILE.arch) return S.arch;
  if (symbol === TILE.fallen) return S.fallen[hash % S.fallen.length];
  if (symbol === TILE.rock) return S.rubble[hash % S.rubble.length];
  return undefined;
}
