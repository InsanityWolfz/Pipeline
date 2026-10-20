import { FOUNDRY_ROOM } from '../../src/data/rooms';
import { gainXp } from '../../src/sim/leveling';
import { equip } from '../../src/sim/gear';
import { BUILD_BAR } from '../../src/data/pieces';
import { place } from '../../src/sim/placement';
import type { SimState } from '../../src/sim/state';
import { atEntrance, run, runUntil } from './fight';
import { forum } from './forum';

// 042: a late-game state for the save tests: the playtest kit in Stonefall Hollows with the shrine claimed, the
// Bulwark killed, levels gained and gear worn, then walked through the foundry's door, the save taken on that tick.

/** Steps with the same scripted commands every run: walking in a loop, firing, rolling now and then. */
export function script(s: SimState, ticks: number): void {
  let i = 0;
  run(s, ticks, (x) => {
    i += 1;
    const phase = Math.floor(i / 45) % 4;
    return { moveX: phase === 0 ? 1 : phase === 2 ? -1 : 0, moveY: phase === 1 ? 1 : phase === 3 ? -1 : 0, fire: i % 90 < 40, dodge: i % 150 === 0, aimX: x.player.x + 40, aimY: x.player.y - 10, interact: i % 200 === 0 };
  });
}

/** The late-game state, stopped on the tick it walked into the foundry (its arrival event still on it). */
export function lateGame(): SimState {
  const { s, b } = forum();
  // The Bulwark's first kill (034): its altar wakes, `bossDefeats` holds it.
  b.health = 0;
  runUntil(s, (x) => x.bossDefeats.includes('bulwark'), 5);
  gainXp(s, 5000, 'kill');
  const helm = s.gear.find((g) => g.slot === 'helm');
  if (helm) equip(s, { id: helm.id });
  script(s, 120);
  // A factory: one of every unlocked piece on the build bar, in rows across the foundry.
  const outside = s.roomId;
  s.roomId = FOUNDRY_ROOM;
  BUILD_BAR.forEach((id, i) => place(s, id, 2 + (i % 6) * 3, 3 + Math.floor(i / 6) * 3, 'right'));
  s.roomId = outside;
  atEntrance(s);
  runUntil(s, (x) => x.roomId === FOUNDRY_ROOM, 120, { moveY: -1 });
  // 045: a ground item mid-pull and a cache's item still bursting out, as a save could hold them.
  s.groundItems.push(
    { id: s.nextGroundItemId++, itemId: 'wood', roomId: s.roomId, x: s.player.x + 40, y: s.player.y, speed: 2 },
    { id: s.nextGroundItemId++, itemId: 'stone', roomId: s.roomId, x: s.player.x + 60, y: s.player.y, wait: 30, burst: { x: s.player.x, y: s.player.y - 40, delay: 6 } },
  );
  return s;
}
