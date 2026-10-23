import { describe, expect, it } from 'vitest';
import { ammoDef, lobbedAmmo } from '../../src/data/ammo';
import { INTAKE, SPREAD_STEP } from '../../src/data/foundry';
import { summarize } from '../../src/sim/summary';
import { hudActive, laneAngles, volleyRounds } from '../../src/sim/volley';
import type { SimState } from '../../src/sim/state';
import { movePlayer, run, volleyAt } from './fight';
import { foundry, stepOutside } from './foundryKit';

// The volley's shape (048): each fed entrance owns a lane of a fan, west to east, SPREAD_STEP
// apart and symmetric about the cursor (048.1), whatever its ammo. Each entrance keeps its own
// rate (028) and fires down its lane every time; a bomb lands at the cursor's distance on its
// lane, so a bomb volley lands on an arc around the aim point.

const AT = { x: 400, y: 400 };

/** Out in the meadow with nothing carried, every entrance open and holding `rounds` (west to east), at AT. */
function volley(rounds: ([string, number] | null)[]): SimState {
  const s = foundry();
  s.inventory = {};
  s.link.entrances.forEach((e, i) => {
    const r = rounds[i];
    Object.assign(e, { open: true, ...(r ? { ammoId: r[0], count: r[1] } : { ammoId: null, count: 0 }) });
  });
  stepOutside(s);
  movePlayer(s, AT.x, AT.y);
  return s;
}

const deg = (dx: number, dy: number): number => Math.round(((Math.atan2(dy, dx) * 180) / Math.PI) * 10) / 10;

/** The fresh arrows' angles from the aim (right), by ammo, in order fired. */
const arrowAngles = (s: SimState, from = 0): [string, number][] => s.arrows.slice(from).map((a) => [a.ammoId, deg(a.dx, a.dy)]);

/** Each bomb's landing as [angle from the player, distance], rounded. */
const landings = (s: SimState): [number, number][] =>
  s.bombs.map((b) => [deg(b.toX - AT.x, b.toY - AT.y), Math.round(Math.hypot(b.toX - AT.x, b.toY - AT.y) * 10) / 10]);

describe('lanes', () => {
  it('fan symmetrically about the cursor, SPREAD_STEP apart, for one, two, three and four (060) fed entrances (048.1)', () => {
    expect(SPREAD_STEP).toBe(15);
    expect(laneAngles(1)).toEqual([0]);
    expect(laneAngles(2)).toEqual([-7.5, 7.5]);
    expect(laneAngles(3)).toEqual([-15, 0, 15]);
    expect(laneAngles(4)).toEqual([-22.5, -7.5, 7.5, 22.5]);
  });

  it('are owned by the entrances in lane order, west to east: west fires left of the cursor, east right', () => {
    expect(INTAKE.entrances.map((e) => e.lane)).toEqual([0, 1, 2, 3]);
    const s = volley([['arrow', 5], ['ley-bolt', 5], ['arrow+frost', 5]]);
    run(s, 1, volleyAt(600, 400));
    expect(arrowAngles(s)).toEqual([
      ['arrow', -15],
      ['ley-bolt', 0],
      ['arrow+frost', 15],
    ]);
  });

  it('a lone fed entrance fires at the cursor, whichever entrance it is (048.1)', () => {
    for (const i of [0, 1, 2, 3]) {
      const rounds: ([string, number] | null)[] = [null, null, null, null];
      rounds[i] = ['arrow', 5];
      const s = volley(rounds);
      run(s, 1, volleyAt(600, 400));
      expect(arrowAngles(s)).toEqual([['arrow', 0]]);
    }
  });

  it('every family fans, mixed or not: an arrow and a ley bolt fire 7.5° either side of the cursor', () => {
    const s = volley([['ley-bolt', 5], null, ['arrow', 5]]);
    run(s, 1, volleyAt(600, 400));
    expect(arrowAngles(s)).toEqual([
      ['ley-bolt', -7.5],
      ['arrow', 7.5],
    ]);
  });

  it('an arrow and a bomb take the two lanes: the bomb lands 7.5° off the aim at the cursor’s distance', () => {
    const s = volley([['arrow', 5], ['bomb', 5], null]);
    run(s, 1, volleyAt(550, 400));
    expect(arrowAngles(s)).toEqual([['arrow', -7.5]]);
    expect(landings(s)).toEqual([[7.5, 150]]);
  });
});

describe('timing (028 kept)', () => {
  it('each entrance fires on its own beat down its own lane, and together when the beats line up', () => {
    expect([ammoDef('arrow').fireTicks, ammoDef('ley-bolt').fireTicks, ammoDef('bomb').fireTicks]).toEqual([15, 20, 40]);
    const s = volley([['arrow', 20], ['ley-bolt', 20], ['bomb', 20]]);
    const beats: Record<string, number[]> = { arrow: [], 'ley-bolt': [], bomb: [] };
    for (let t = 0; t < 120; t++) {
      const arrows = s.arrows.length;
      const bombs = s.bombs.length;
      run(s, 1, volleyAt(550, 400));
      for (const [ammoId, angle] of arrowAngles(s, arrows)) {
        expect(angle).toBe(ammoId === 'arrow' ? -15 : 0);
        beats[ammoId]?.push(t);
      }
      if (s.bombs.length > bombs) {
        expect(landings({ ...s, bombs: s.bombs.slice(bombs) })).toEqual([[15, 150]]);
        beats.bomb?.push(t);
      }
    }
    expect(beats).toEqual({
      arrow: [0, 15, 30, 45, 60, 75, 90, 105],
      'ley-bolt': [0, 20, 40, 60, 80, 100],
      bomb: [0, 40, 80],
    });
  });
});

describe('re-fanning (048.5)', () => {
  it('when an entrance runs dry mid-hold the others re-fan from ±15° to ±7.5°, and back when it refills', () => {
    const s = volley([['arrow', 20], ['ley-bolt', 1], ['arrow', 20]]);
    const shotsAt = (ticks: number): [string, number][] => {
      let fired: [string, number][] = [];
      for (let t = 0; t < ticks; t++) {
        const from = s.arrows.length;
        run(s, 1, volleyAt(600, 400));
        if (s.arrows.length > from) fired = arrowAngles(s, from);
      }
      return fired;
    };
    // Tick 0: all three fed, so left, centre, right; the centre's one ley bolt empties it.
    expect(shotsAt(1)).toEqual([
      ['arrow', -15],
      ['ley-bolt', 0],
      ['arrow', 15],
    ]);
    expect(s.link.entrances[1]?.count).toBe(0);
    expect(summarize(s).intake.lanes).toEqual([-7.5, 7.5]);
    // The arrows' next beat (tick 15): two fed, so 7.5° either side.
    expect(shotsAt(15)).toEqual([
      ['arrow', -7.5],
      ['arrow', 7.5],
    ]);
    // Refilled, the centre takes its lane back and the arrows return to ±15°.
    Object.assign(s.link.entrances[1] ?? {}, { ammoId: 'ley-bolt', count: 5 });
    expect(summarize(s).intake.lanes).toEqual([-15, 0, 15]);
    const next = shotsAt(15).filter(([ammoId]) => ammoId === 'arrow');
    expect(next).toEqual([
      ['arrow', -15],
      ['arrow', 15],
    ]);
  });
});

describe('bombs', () => {
  it('two bomb entrances land on the arc at the cursor’s distance, 7.5° either side of the aim point', () => {
    const s = volley([['bomb', 3], null, ['bomb', 3]]);
    run(s, 1, volleyAt(550, 400));
    expect(landings(s)).toEqual([
      [-7.5, 150],
      [7.5, 150],
    ]);
  });

  it('three bombs land on the arc: left, on the aim point, right', () => {
    const s = volley([['bomb', 3], ['bomb', 3], ['bomb', 3]]);
    run(s, 1, volleyAt(400, 500));
    // Aiming down (90°): west's lane is 15° anticlockwise of it on screen.
    expect(landings(s)).toEqual([
      [75, 100],
      [90, 100],
      [105, 100],
    ]);
    expect(s.bombs[1]).toMatchObject({ toX: 400, toY: 500 });
  });

  it('a cursor past a bomb’s range lands it on its lane at its max range', () => {
    const s = volley([['bomb', 3], null, ['bomb', 3]]);
    run(s, 1, volleyAt(1000, 400));
    const range = lobbedAmmo('bomb').maxRange;
    expect(landings(s)).toEqual([
      [-7.5, range],
      [7.5, range],
    ]);
  });

  it('landmines take lanes like bombs', () => {
    const s = volley([['landmine', 3], ['arrow', 3], ['landmine', 3]]);
    run(s, 1, volleyAt(550, 400));
    expect(landings(s)).toEqual([
      [-15, 150],
      [15, 150],
    ]);
    expect(arrowAngles(s)).toEqual([['arrow', 0]]);
  });
});

describe('the hook and the tube slot', () => {
  it('getState() gives each fed entrance’s lane angle beside the volley, west to east', () => {
    const s = volley([['arrow', 5], null, ['bomb', 5]]);
    expect(summarize(s).intake.volley).toEqual(['arrow', 'bomb']);
    expect(summarize(s).intake.lanes).toEqual([-7.5, 7.5]);
    expect(summarize(volley([null, null, null])).intake.lanes).toEqual([]);
  });

  it('the tube slot lists the rounds in lane order, so its left unit fires left', () => {
    const s = volley([['bomb', 2], ['arrow', 3], ['ley-bolt', 4]]);
    const active = hudActive(s);
    expect(active.kind === 'volley' ? active.rounds.map((r) => [r.ammoId, r.lane]) : []).toEqual([
      ['bomb', -15],
      ['arrow', 0],
      ['ley-bolt', 15],
    ]);
    expect(volleyRounds(s).map((r) => r.entrance)).toEqual([0, 1, 2]);
  });
});

describe('determinism', () => {
  it('two runs of the same mixed volley end in the same state', () => {
    const play = (): unknown => {
      const s = volley([['arrow', 20], ['bomb', 20], ['ley-bolt+homing', 20]]);
      run(s, 90, volleyAt(560, 380));
      return summarize(s);
    };
    expect(play()).toEqual(play());
  });
});
