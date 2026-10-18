import { describe, expect, it } from 'vitest';
import { ammoDef } from '../../src/data/ammo';
import { CONDUIT_TICKS, STAGER_ANGLES, STAGER_TICKS } from '../../src/data/foundry';
import type { ConduitState, HopperState, StagerState } from '../../src/sim/pieces';
import { rotate, socketStreams } from '../../src/sim/spread';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { fireAt, movePlayer, run, runUntil } from './fight';
import { foundry, put } from './foundryKit';

const BOLT_TICKS = ammoDef('ley-bolt').fireTicks;
const BOMB_TICKS = ammoDef('bomb').fireTicks;

/** An attuned foundry sim carrying `cores` warden cores. */
function attuned(cores = 5) {
  const s = foundry();
  s.inventory['warden-core'] = cores;
  run(s, 1);
  return s;
}

/** A stager facing `facing` at (tx, ty), turned to `angle`. */
function stager(s: ReturnType<typeof attuned>, tx: number, ty: number, facing: 'right' | 'left' | 'up' | 'down', angle = 0) {
  const p = put<StagerState>(s, 'gravity-stager', tx, ty, facing);
  p.angle = angle;
  return p;
}

describe('placing a gravity stager', () => {
  it('costs a warden core, refunded on pick-up', () => {
    const s = attuned(1);
    stager(s, 5, 5, 'right');
    expect(s.inventory['warden-core']).toBe(0);
    run(s, 1, { place: { pieceId: 'gravity-stager', tx: 8, ty: 5, facing: 'right' } });
    expect(s.events.placeFails).toEqual([{ pieceId: 'gravity-stager', tx: 8, ty: 5, reason: 'cost' }]);
    run(s, 1, { pickUp: { tx: 5, ty: 5 } });
    expect(s.inventory['warden-core']).toBe(1);
    expect(s.events.pickUps[0]?.items).toEqual({ 'warden-core': 1 });
  });

  it('is solid to the player', () => {
    const s = attuned();
    const { x, y } = tileCentre({ tx: 10, ty: 5 });
    stager(s, 10, 5, 'right');
    movePlayer(s, x - 32, y);
    run(s, 30, { moveX: 1 });
    expect(s.player.x).toBeLessThan(x - 16);
  });
});

describe('items through a stager', () => {
  it('holds one item and passes it on after STAGER_TICKS, never taking from its front', () => {
    const s = attuned();
    const a = put<ConduitState>(s, 'conduit', 4, 5, 'right');
    const st = stager(s, 5, 5, 'right');
    const b = put<ConduitState>(s, 'conduit', 6, 5, 'right');
    a.item = 'arrow';
    run(s, CONDUIT_TICKS);
    expect(st.item).toBe('arrow');
    run(s, STAGER_TICKS - 1);
    expect([st.item, b.item]).toEqual(['arrow', null]);
    run(s, 1);
    expect([st.item, b.item]).toEqual([null, 'arrow']);
    // An item coming in from its front is refused.
    const into = put<ConduitState>(s, 'conduit', 8, 4, 'down');
    const facingUp = stager(s, 8, 5, 'up');
    into.item = 'wood';
    run(s, CONDUIT_TICKS * 3);
    expect([into.item, facingUp.item]).toEqual(['wood', null]);
  });

  it('can be fed straight from a hopper', () => {
    const s = attuned();
    const h = put<HopperState>(s, 'hopper', 4, 5, 'right');
    h.item = 'arrow';
    h.count = 2;
    const st = stager(s, 5, 5, 'right');
    run(s, 20);
    expect(st.item).toBe('arrow');
    expect(h.count).toBe(1);
  });
});

describe('angles', () => {
  it('a setAngle steps through the angles in order and wraps, recording each', () => {
    const s = attuned();
    const st = stager(s, 5, 5, 'right');
    const seen: number[] = [];
    for (let i = 0; i < STAGER_ANGLES.length; i++) {
      run(s, 1, { setAngle: { id: st.id } });
      expect(s.events.angles).toEqual([{ id: st.id, angle: st.angle }]);
      seen.push(st.angle);
    }
    expect(seen).toEqual([15, 30, -30, -15, 0]);
  });

  it('E beside a stager turns it too', () => {
    const s = attuned();
    const st = stager(s, 5, 5, 'right');
    const { x, y } = tileCentre({ tx: 5, ty: 6 });
    movePlayer(s, x, y);
    run(s, 1, { interact: true });
    expect(st.angle).toBe(15);
  });
});

describe('streams', () => {
  it('are the stagers facing the socket, nearest 0 first; a conduit into the socket adds none', () => {
    const s = attuned();
    put(s, 'tube-socket', 6, 6);
    stager(s, 5, 6, 'right', 30);
    stager(s, 7, 6, 'left', -15);
    stager(s, 6, 5, 'down', 0);
    put(s, 'conduit', 6, 7, 'up');
    // A stager next to the socket but facing away isn't a stream.
    stager(s, 8, 8, 'right', 15);
    expect(socketStreams(s.foundry)).toEqual([0, -15, 30]);
    const socket = summarize(s).foundry.pieces.find((p) => p.kind === 'socket');
    expect(socket).toMatchObject({ streams: [0, -15, 30] });
  });
});

describe('spread shots', () => {
  /** A socket with stagers at `angles` and a reservoir of `rounds` ley bolts; nothing carried. */
  function spread(angles: number[], rounds: number, item = 'ley-bolt') {
    const s = attuned();
    put(s, 'tube-socket', 6, 6);
    const spots: [number, number, 'right' | 'left' | 'down' | 'up'][] = [
      [5, 6, 'right'],
      [7, 6, 'left'],
      [6, 5, 'down'],
      [6, 7, 'up'],
    ];
    angles.forEach((a, i) => {
      const spot = spots[i];
      if (spot) stager(s, spot[0], spot[1], spot[2], a);
    });
    s.inventory = {};
    s.tube.ammoId = item;
    s.link.reservoir = { itemId: item, count: rounds };
    movePlayer(s, 400, 400);
    return s;
  }

  it('fires one projectile per stream at its angle, each costing a round', () => {
    const s = spread([0, -15, 15], 10);
    run(s, 1, fireAt(600, 400));
    expect(s.tube.shotCount).toBe(3);
    expect(s.link.reservoir.count).toBe(7);
    expect(s.events.shots).toHaveLength(3);
    const dirs = s.arrows.map((a) => [a.dx, a.dy]);
    const want = [0, -15, 15].map((deg) => rotate(1, 0, deg));
    for (const [i, d] of dirs.entries()) {
      expect(d[0]).toBeCloseTo(want[i]?.[0] ?? NaN);
      expect(d[1]).toBeCloseTo(want[i]?.[1] ?? NaN);
    }
  });

  it('fires as many as there are rounds, nearest 0 first', () => {
    const s = spread([30, 0, -30], 2);
    run(s, 1, fireAt(600, 400));
    expect(s.tube.shotCount).toBe(2);
    expect(s.link.reservoir).toEqual({ itemId: null, count: 0 });
    expect(s.arrows[0]?.dy).toBeCloseTo(0);
    expect(s.arrows[1]?.dy).toBeCloseTo(rotate(1, 0, -30)[1]);
  });

  it('with no stagers, fires one projectile straight', () => {
    const s = spread([], 5);
    run(s, 1, fireAt(600, 400));
    expect(s.tube.shotCount).toBe(1);
    expect(s.arrows[0]).toMatchObject({ dx: 1, dy: 0 });
  });

  it('carried rounds never spread', () => {
    const s = spread([0, 15, 30], 10);
    s.inventory['ley-bolt'] = 2;
    run(s, 1, fireAt(600, 400));
    expect(s.tube.shotCount).toBe(1);
    expect(s.link.reservoir.count).toBe(10);
  });

  it('bombs land at the aim distance along each angle', () => {
    const s = spread([0, 30], 4, 'bomb');
    run(s, 1, fireAt(550, 400));
    expect(s.bombs).toHaveLength(2);
    for (const b of s.bombs) expect(Math.hypot(b.toX - 400, b.toY - 400)).toBeCloseTo(150);
    expect(s.bombs[1]?.toY).toBeCloseTo(400 + 150 * Math.sin(Math.PI / 6));
    run(s, BOMB_TICKS);
  });

  it('a three-stream ley bolt line fires three bolts per shot from its refills', () => {
    const s = attuned();
    s.inventory = { 'warden-core': 3 };
    s.tube.ammoId = 'ley-bolt';
    put(s, 'tube-socket', 10, 6);
    // Three rows: hopper → grinder → focuser → stager, each stager facing the socket.
    const rows: [number, number, 'right' | 'down' | 'up'][] = [
      [6, 6, 'right'],
      [10, 2, 'down'],
      [10, 10, 'up'],
    ];
    for (const [tx, ty, f] of rows) {
      const [dx, dy] = f === 'right' ? [1, 0] : f === 'down' ? [0, 1] : [0, -1];
      const h = put<HopperState>(s, 'hopper', tx, ty, f);
      h.item = 'ley-crystal';
      h.count = 10;
      put(s, 'grinder', tx + dx, ty + dy, f);
      put(s, 'focuser', tx + 2 * dx, ty + 2 * dy, f);
      put<StagerState>(s, 'gravity-stager', tx + 3 * dx, ty + 3 * dy, f);
    }
    expect(socketStreams(s.foundry)).toHaveLength(3);
    runUntil(s, (x) => x.link.reservoir.count >= 9, 1500);
    movePlayer(s, 400, 400);
    run(s, 1, fireAt(600, 400));
    expect(s.tube.shotCount).toBe(3);
    expect(s.arrows).toHaveLength(3);
    run(s, BOLT_TICKS);
  });
});
