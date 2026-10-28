import { TILE_SIZE } from '../data/config';
import { PROPS, type PropPlacement } from '../data/props';
import { PROP_LAYOUT } from '../data/roomArt';

// Where a wall prop's sprite stands (014; 079: and a side-wall prop's), shared by RoomView, which draws it, and the
// foundry's lights, which light its flame: the point its sprite's anchor sits on, and whether it is mirrored.

export function propBase(p: PropPlacement, roomWidth: number): { x: number; y: number; flip: boolean } {
  const def = PROPS[p.propId];
  const cx = (p.tx + 0.5) * TILE_SIZE;
  const bottom = (p.ty + 1) * TILE_SIZE + (def.drop ?? 0);
  if (def.layer !== 'side') return { x: cx, y: bottom, flip: false };
  // On a side wall's top, nudged toward the room; the east wall's mirrors.
  const east = p.tx > (roomWidth - 1) / 2;
  return { x: cx + (east ? -1 : 1) * PROP_LAYOUT.sideInset, y: bottom, flip: east };
}
