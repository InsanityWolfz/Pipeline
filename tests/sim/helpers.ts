import type { Room } from '../../src/data/rooms';
import type { Command } from '../../src/sim/input';
import { createPlayer, type PlayerState } from '../../src/sim/player';
import { stepPlayer } from '../../src/sim/movement';
import { tileCentre } from '../../src/sim/state';

/** An open walled room, w x h tiles, with optional extra rows patched in. */
export function openRoom(w = 30, h = 30, patch: Record<number, string> = {}): Room {
  const rows: string[] = [];
  for (let y = 0; y < h; y++) {
    rows.push(patch[y] ?? (y === 0 || y === h - 1 ? '#'.repeat(w) : `#${'.'.repeat(w - 2)}#`));
  }
  return { id: 'test', rows, spawn: { tx: w / 2, ty: h / 2 } };
}

export function playerIn(room: Room): PlayerState {
  return createPlayer(tileCentre(room.spawn));
}

export const cmd = (moveX: -1 | 0 | 1 = 0, moveY: -1 | 0 | 1 = 0, dodge = false): Command => ({ moveX, moveY, dodge });

export function run(player: PlayerState, room: Room, command: Command, ticks: number): void {
  for (let i = 0; i < ticks; i++) stepPlayer(player, room, command);
}
