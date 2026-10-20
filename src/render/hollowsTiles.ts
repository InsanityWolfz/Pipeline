import { HOLLOWS_SPRITES } from '../data/hollowsAssets';
import { TILE, type Room } from '../data/rooms';

// Stonefall Hollows' standing tiles (034), shared by the overworld's view and, since 044, the
// tiled rooms' (the sandbox's Sunken Forum).

/** A Hollows tile's standing sprite (034): a cliff (its plateau where another stands in front), a pillar, an arch, a fallen span, rubble. */
export function hollowsFrame(symbol: string, tx: number, ty: number, hash: number, room: Room | null): string | undefined {
  const S = HOLLOWS_SPRITES;
  if (symbol === TILE.cliff) return room?.rows[ty + 1]?.[tx] === TILE.cliff ? S.cliffTop : S.cliffs[hash % S.cliffs.length];
  if (symbol === TILE.pillar) return S.pillar;
  if (symbol === TILE.arch) return S.arch;
  if (symbol === TILE.fallen) return S.fallen[hash % S.fallen.length];
  if (symbol === TILE.rock) return S.rubble[hash % S.rubble.length];
  return undefined;
}
