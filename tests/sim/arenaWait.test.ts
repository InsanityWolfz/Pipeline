import { describe, expect, it } from 'vitest';
import { FORUM_ARENA, SHRINE_ARENA, type ArenaDef } from '../../src/data/arenas';
import { TILE_SIZE } from '../../src/data/config';
import { OVERWORLD_ROOM } from '../../src/data/overworld';
import { HOLLOWS_START } from '../../src/data/playtest';
import { MAX_HEALTH, TUTORIAL_START } from '../../src/data/player';
import { arenaWaits } from '../../src/sim/arenaWait';
import { playerInside } from '../../src/sim/arenaLock';
import { createEnemy, type EnemyState } from '../../src/sim/enemies';
import { createSim, type SimState } from '../../src/sim/state';
import { tileCentre } from '../../src/sim/tiles';
import { movePlayer, placeHusk, run, SEED } from './fight';

// 059 (059.2, Shaun: "stay put and don't react until the player is through the door"): an enemy whose post is inside
// a boss arena doesn't wake, even on sight, until E at the door has put the player in; one awake when the player
// leaves goes back to its post. Nothing gathers at the doorway outside.

const W = SHRINE_ARENA;
const mid = (a: ArenaDef) => a.door.tiles[Math.floor(a.door.tiles.length / 2)] ?? { tx: 0, ty: 0 };
const shrineCrew = (s: SimState): EnemyState[] => s.enemies.filter((e) => e.group === W.id);
const atPost = (e: EnemyState): boolean => e.mode === 'idle' && Math.hypot(e.x - e.homeX, e.y - e.homeY) <= TILE_SIZE;

/** The tutorial with the shrine open and the player just outside its door, its Warden, Wisps and Husks at their posts. */
function outsideShrine(): SimState {
  const s = createSim(SEED, { start: TUTORIAL_START });
  s.roomId = OVERWORLD_ROOM;
  s.gates.shrine = true;
  s.enemies = s.enemies.filter((e) => e.group === W.id);
  const out = tileCentre(W.door.leaveTo);
  movePlayer(s, out.x, out.y);
  return s;
}

/** Holds the player's health up so a long wait never ends in a knockout. */
const runAlive = (s: SimState, ticks: number, c: Parameters<typeof run>[2] = {}): void => {
  for (let t = 0; t < ticks; t++) {
    s.player.health = MAX_HEALTH;
    run(s, 1, c);
  }
};

describe('arena enemies wait inside (059)', () => {
  it("the shrine's Warden, Wisps and Husks all stand inside its walls", () => {
    const crew = shrineCrew(outsideShrine());
    expect(crew.map((e) => e.enemyId).sort()).toEqual(['husk', 'husk', 'pylon-warden', 'wisp', 'wisp', 'wisp']);
    for (const e of crew) expect(arenaWaits(outsideShrine(), e), e.enemyId).toBe(true);
  });

  it('stay at their posts while the player waits outside the door, in sight of them', () => {
    const s = outsideShrine();
    runAlive(s, 600);
    expect(playerInside(s, W)).toBe(false);
    for (const e of shrineCrew(s)) expect(atPost(e), e.enemyId).toBe(true);
  });

  it('wake once E at the door has put the player inside', () => {
    const s = outsideShrine();
    run(s, 1, { interact: true });
    expect(playerInside(s, W)).toBe(true);
    runAlive(s, 60);
    expect(shrineCrew(s).filter((e) => e.mode !== 'idle').length).toBeGreaterThan(0);
  });

  it('go back to their posts once the player leaves, and none gathers at the door', () => {
    const s = outsideShrine();
    run(s, 1, { interact: true });
    runAlive(s, 90);
    expect(shrineCrew(s).some((e) => e.mode !== 'idle')).toBe(true);
    // Back to the door from inside, and out.
    const by = tileCentre({ tx: mid(W).tx, ty: mid(W).ty - 1 });
    movePlayer(s, by.x, by.y);
    run(s, 1, { interact: true });
    expect(playerInside(s, W)).toBe(false);
    runAlive(s, 900);
    for (const e of shrineCrew(s)) expect(atPost(e), e.enemyId).toBe(true);
  });

  it("an enemy outside an arena still wakes on sight as before (017)", () => {
    const s = outsideShrine();
    const out = tileCentre(W.door.leaveTo);
    const husk = placeHusk(s, out.x + 96, out.y + 64);
    expect(arenaWaits(s, husk)).toBe(false);
    runAlive(s, 5);
    expect(husk.mode).not.toBe('idle');
  });

  it("an enemy posted in the Bulwark's forum waits too, until the player is through its door", () => {
    const s = createSim(SEED, { start: HOLLOWS_START });
    s.gates.hollows = true;
    const inside = tileCentre(FORUM_ARENA.door.enterTo);
    const post = { x: inside.x, y: inside.y + 96 };
    const husk = createEnemy(9001, 'husk', post, OVERWORLD_ROOM);
    s.enemies = [husk];
    // Just outside the door's middle, in E's reach.
    const out = tileCentre({ tx: mid(FORUM_ARENA).tx, ty: mid(FORUM_ARENA).ty - 1 });
    movePlayer(s, out.x, out.y);
    expect(arenaWaits(s, husk)).toBe(true);
    runAlive(s, 300);
    expect(atPost(husk)).toBe(true);
    run(s, 1, { interact: true });
    expect(playerInside(s, FORUM_ARENA)).toBe(true);
    expect(arenaWaits(s, husk)).toBe(false);
    runAlive(s, 5);
    expect(husk.mode).not.toBe('idle');
  });
});
