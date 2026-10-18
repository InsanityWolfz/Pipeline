import { describe, expect, it } from 'vitest';
import { UNIDENTIFIED_ARMOR } from '../../src/data/armor';
import { DYING_TICKS } from '../../src/data/player';
import { FOUNDRY_ROOM, ROOMS, SHRINE_ROOM } from '../../src/data/rooms';
import { claim } from '../../src/sim/claims';
import { arrivalTile } from '../../src/sim/doorways';
import type { ConduitState } from '../../src/sim/pieces';
import { createSim } from '../../src/sim/state';
import { stepSim } from '../../src/sim/step';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { arena, command, die, HUSK, movePlayer, placeHusk, PLAYER_AT, run, runUntil, SEED } from './fight';
import { foundry, put } from './foundryKit';

describe('banking', () => {
  it('starts banked at the start inventory', () => {
    expect(createSim(SEED).banked).toEqual({ arrow: 30 });
  });

  it('walking into the foundry banks everything carried', () => {
    const s = arena();
    s.inventory = { arrow: 12, wood: 4 };
    const inside = tileCentre(arrivalTile('ruin-hall', 0));
    movePlayer(s, inside.x, inside.y);
    runUntil(s, (x) => x.roomId === FOUNDRY_ROOM, 60, { moveX: -1 });
    expect(s.banked).toEqual({ arrow: 12, wood: 4 });
    expect(s.events.banks).toEqual([{ arrow: 12, wood: 4 }]);
  });

  it('a pylon deposit banks too, leaving nothing carried', () => {
    const s = createSim(SEED);
    claim(s, SHRINE_ROOM);
    s.roomId = SHRINE_ROOM;
    const below = tileCentre({ tx: 15, ty: 9 });
    movePlayer(s, below.x, below.y);
    s.inventory = { stone: 5 };
    stepSim(s, command({ pylon: 'deposit' }));
    expect(s.banked).toEqual({});
    expect(s.events.banks).toHaveLength(1);
  });
});

describe('dying', () => {
  it('takes no input and no hits while the death plays, then wakes in the foundry', () => {
    const s = arena();
    s.player.health = 0;
    run(s, 1);
    expect(s.player.dying).toBe(DYING_TICKS);
    expect(s.events.dies).toBe(true);
    const x = s.player.x;
    placeHusk(s, PLAYER_AT.x + 20, PLAYER_AT.y);
    run(s, 10, { moveX: 1, fire: true, aimX: x + 100, aimY: s.player.y });
    expect(s.player.x).toBe(x);
    expect(s.arrows).toEqual([]);
    expect(s.events.hits.filter((h) => h.target === 'player')).toEqual([]);
    const ticks = runUntil(s, (y) => y.events.ko, DYING_TICKS);
    expect(ticks).toBe(DYING_TICKS - 10);
    expect(s.roomId).toBe(FOUNDRY_ROOM);
    expect(s.player.health).toBe(100);
    expect(summarize(s).player.dying).toBe(0);
  });

  it('keeps what was banked and loses what came after, reporting the loss', () => {
    const s = arena();
    s.banked = { arrow: 10, wood: 2 };
    s.inventory = { arrow: 14, wood: 1, stone: 3, [UNIDENTIFIED_ARMOR]: 1 };
    die(s);
    expect(s.inventory).toEqual({ arrow: 10, wood: 1 });
    expect(s.events.lost).toEqual({ arrow: 4, stone: 3, [UNIDENTIFIED_ARMOR]: 1 });
    expect(s.banked).toEqual({ arrow: 10, wood: 1 });
  });

  it('keeps identified and worn armor, the stash, claims, the reservoir and the foundry', () => {
    const s = foundry();
    run(s, 1);
    s.armor = [{ id: 0, weight: 'light', armor: 3, name: 'Worn Vest' }];
    s.equipped = 0;
    s.stash = { wood: 9 };
    claim(s, SHRINE_ROOM);
    s.link.reservoir = { itemId: 'arrow', count: 5 };
    const c = put<ConduitState>(s, 'conduit', 4, 4, 'up');
    c.item = 'stone';
    const pieces = s.foundry.pieces.length;
    die(s);
    expect(s.armor).toHaveLength(1);
    expect(s.equipped).toBe(0);
    expect(s.stash).toEqual({ wood: 9 });
    expect(s.claims).toEqual([SHRINE_ROOM]);
    expect(s.link).toMatchObject({ attuned: true, reservoir: { itemId: 'arrow', count: 5 } });
    expect(s.foundry.pieces).toHaveLength(pieces);
  });

  it('resets unclaimed rooms and leaves claimed ones empty', () => {
    const s = arena();
    s.enemies = s.enemies.filter((e) => e.roomId !== SHRINE_ROOM);
    claim(s, SHRINE_ROOM);
    die(s);
    const hall = ROOMS['ruin-hall']?.enemies?.length ?? 0;
    expect(s.enemies.filter((e) => e.roomId === 'ruin-hall')).toHaveLength(hall);
    expect(s.enemies.filter((e) => e.roomId === SHRINE_ROOM)).toEqual([]);
    expect(s.enemies.every((e) => e.health === HUSK.maxHealth || e.enemyId !== 'husk')).toBe(true);
  });

  it('enemies lose a dying player', () => {
    const s = arena();
    const e = placeHusk(s, PLAYER_AT.x + 60, PLAYER_AT.y);
    run(s, 2);
    expect(e.mode).toBe('chase');
    s.player.health = 0;
    run(s, HUSK.swipe.windupTicks + HUSK.swipe.swipeTicks + HUSK.swipe.recoverTicks + 2);
    expect(['return', 'idle']).toContain(e.mode);
  });

  it('replays a death identically', () => {
    const play = () => {
      const s = arena();
      placeHusk(s, PLAYER_AT.x + 20, PLAYER_AT.y);
      s.inventory = { arrow: 40, wood: 3 };
      run(s, 400, (x) => ({ fire: true, aimX: x.player.x + 50, aimY: x.player.y }));
      return summarize(s);
    };
    expect(play()).toEqual(play());
  });
});
