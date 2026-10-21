import { describe, expect, it } from 'vitest';
import { UNIDENTIFIED_ARMOR } from '../../src/data/gear';
import { bodyPiece, piece, wear } from '../fixtures/gear';
import { DYING_TICKS } from '../../src/data/player';
import { FOUNDRY_ROOM, SHRINE_SITE } from '../../src/data/rooms';
import { OVERWORLD } from '../../src/data/overworld';
import { claim } from '../../src/sim/claims';
import type { ConduitState, HopperState } from '../../src/sim/pieces';
import { createSim } from '../../src/sim/state';
import { defOf } from '../../src/sim/champions';
import { stepSim } from '../../src/sim/step';
import { summarize } from '../../src/sim/summary';
import { arena, atEntrance, atPylon, command, die, HUSK, placeHusk, PLAYER_AT, run, runUntil, SEED } from './fight';
import { foundry, put } from './foundryKit';

describe('banking', () => {
  it('starts banked at the start inventory', () => {
    expect(createSim(SEED).banked).toEqual({ arrow: 30 });
  });

  it('walking into the foundry banks everything carried', () => {
    const s = arena();
    s.inventory = { arrow: 12, wood: 4 };
    atEntrance(s);
    runUntil(s, (x) => x.roomId === FOUNDRY_ROOM, 60, { moveY: -1 });
    expect(s.banked).toEqual({ arrow: 12, wood: 4 });
    expect(s.events.banks).toEqual([{ arrow: 12, wood: 4 }]);
  });

  it('a pylon deposit banks even when there was nothing to send', () => {
    const s = createSim(SEED);
    claim(s, SHRINE_SITE);
    atPylon(s);
    s.inventory = {};
    stepSim(s, command({ pylon: 'deposit' }));
    expect(s.banked).toEqual({});
    expect(s.events.banks).toEqual([{}]);
    // Arrows picked up afterwards were never banked: a death loses them.
    s.inventory = { arrow: 10 };
    die(s);
    expect(s.inventory).toEqual({});
  });

  it('pylon travel and the waystone into the foundry bank too', () => {
    const s = createSim(SEED);
    claim(s, SHRINE_SITE);
    atPylon(s);
    s.inventory = { wood: 2 };
    stepSim(s, command({ pylon: 'travel' }));
    expect(s.roomId).toBe(FOUNDRY_ROOM);
    expect(s.banked).toEqual({ wood: 2 });
  });

  it('a pylon deposit banks too, leaving nothing carried', () => {
    const s = createSim(SEED);
    claim(s, SHRINE_SITE);
    atPylon(s);
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

  it('items withdrawn from a hopper in the foundry are banked at once (050), so a death keeps them', () => {
    const s = foundry();
    run(s, 1);
    s.inventory = { wood: 5 };
    s.banked = { wood: 5 };
    const h = put<HopperState>(s, 'hopper', 20, 12, 'down');
    h.item = 'stone';
    h.count = 4;
    run(s, 1, { withdraw: { id: h.id, amount: 'all' } });
    expect(s.inventory).toEqual({ wood: 5, stone: 4 });
    expect(s.banked).toEqual({ wood: 5, stone: 4 });
    die(s);
    expect(s.inventory).toEqual({ wood: 5, stone: 4 });
    expect(s.events.lost).toEqual({});
  });

  it('keeps identified and worn gear, the stash, claims, the entrances and the foundry', () => {
    const s = foundry();
    run(s, 1);
    wear(s, bodyPiece(0, 'light', 3), piece(1, 'helm', { baseArmor: 1 }));
    s.gear.push(piece(2, 'boots'));
    s.stash = { wood: 9 };
    claim(s, SHRINE_SITE);
    Object.assign(s.link.entrances[1] ?? {}, { ammoId: 'arrow', count: 5 });
    const c = put<ConduitState>(s, 'conduit', 4, 4, 'up');
    c.item = 'stone';
    const pieces = s.foundry.pieces.length;
    die(s);
    expect(s.gear).toHaveLength(3);
    expect(s.equipped).toEqual({ helm: 1, body: 0, boots: null, trinket: null });
    expect(s.stash).toEqual({ wood: 9 });
    expect(s.claims).toEqual([SHRINE_SITE]);
    expect(s.link).toMatchObject({ attuned: true });
    expect(s.link.entrances[1]).toMatchObject({ open: true, ammoId: 'arrow', count: 5 });
    expect(s.foundry.pieces).toHaveLength(pieces);
  });

  it('resets unclaimed ground and leaves claimed sites empty', () => {
    const s = arena();
    s.enemies = s.enemies.filter((e) => e.group !== SHRINE_SITE);
    claim(s, SHRINE_SITE);
    die(s);
    const field = OVERWORLD.packs.filter((p) => p.group === 'field').length;
    expect(s.enemies.filter((e) => e.group === 'field')).toHaveLength(field);
    expect(s.enemies.filter((e) => e.group === SHRINE_SITE)).toEqual([]);
    // Full health: a champion's own (032), else the Husk's.
    expect(s.enemies.every((e) => e.health === defOf(e).maxHealth)).toBe(true);
    expect(s.enemies.some((e) => e.enemyId === 'husk' && !e.champion && e.health === HUSK.maxHealth)).toBe(true);
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
