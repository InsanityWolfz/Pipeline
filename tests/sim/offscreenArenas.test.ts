import { describe, expect, it } from 'vitest';
import { FORUM_ARENA } from '../../src/data/arenas';
import { ADDS_GROUP } from '../../src/data/bulwark';
import { TILE_SIZE, VIEW_HEIGHT } from '../../src/data/config';
import { OVERWORLD_ROOM } from '../../src/data/overworld';
import { inAggroBox } from '../../src/sim/aiCommon';
import { playerInside } from '../../src/sim/arenaLock';
import { aggro, createEnemy, type EnemyState } from '../../src/sim/enemies';
import { clearGround, clearShot } from '../../src/sim/sightLine';
import { roomById, type SimState } from '../../src/sim/state';
import { tileCentre } from '../../src/sim/tiles';
import { arena, movePlayer, run, runUntil } from './fight';

// 073.5 (Shaun, 2026-10-27: "if an enemy is in the boss arena then the boss rules apply to its attack and aggro"):
// anything inside a boss arena with the player, the boss, its adds and anything posted there, starts its attacks from
// anywhere in the arena, on screen or not.

const ROOM = roomById(OVERWORLD_ROOM);
const { inside } = FORUM_ARENA;
/** Six tiles: past the screen's half-height, inside a Charger's 200 px trigger. */
const GAP = 6;

/** A forum column (x) with open ground from a player tile down to a tile `GAP` below, clear to feet and shots. */
function openColumn(): { player: { x: number; y: number }; enemy: { x: number; y: number } } {
  for (let tx = inside.x0 + 1; tx < inside.x1; tx++) {
    for (let ty = inside.y0 + 1; ty + GAP < inside.y1; ty++) {
      const player = tileCentre({ tx, ty });
      const enemy = tileCentre({ tx, ty: ty + GAP });
      if (clearGround(ROOM, enemy.x, enemy.y, player.x, player.y) && clearShot(ROOM, enemy.x, enemy.y, player.x, player.y)) return { player, enemy };
    }
  }
  throw new Error('no open column in the forum');
}

/** The overworld with the player inside the forum and `enemyId` awake `GAP` tiles below, in the forum too. */
function inForum(enemyId: string, group: string): { s: SimState; e: EnemyState } {
  const { player, enemy } = openColumn();
  const s = arena();
  movePlayer(s, player.x, player.y);
  const e = createEnemy(s.nextEnemyId++, enemyId, enemy, OVERWORLD_ROOM, group);
  aggro(e);
  s.enemies.push(e);
  return { s, e };
}

describe('anything inside a boss arena follows the boss rules (073.5)', () => {
  it('stages its enemies off screen, the player inside', () => {
    const { s, e } = inForum('charger', ADDS_GROUP);
    expect(playerInside(s, FORUM_ARENA)).toBe(true);
    expect(e.y - s.player.y).toBe(GAP * TILE_SIZE);
    expect(GAP * TILE_SIZE).toBeGreaterThan(VIEW_HEIGHT / 2);
    expect(inAggroBox(e, s.player)).toBe(false);
  });

  it('a Bulwark add (a Charger) starts its charge off screen', () => {
    const { s, e } = inForum('charger', ADDS_GROUP);
    run(s, 1);
    expect(e.mode).toBe('windup');
  });

  it('a Sniper posted in the forum starts its shot off screen', () => {
    const { s, e } = inForum('sniper', 'forum-post');
    run(s, 1);
    expect(e.mode).toBe('windup');
  });

  it('the Bulwark lobs at the player inside from off screen', () => {
    const { s, e } = inForum('bulwark', FORUM_ARENA.id);
    const at = { x: e.x, y: e.y };
    // Both held where they stand: it lobs when its cooldown comes round, the player never on its screen.
    runUntil(s, () => {
      e.x = at.x;
      e.y = at.y;
      expect(inAggroBox(e, s.player)).toBe(false);
      return e.mode === 'lob';
    }, 1200);
  });
});
