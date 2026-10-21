import { describe, expect, it } from 'vitest';
import { ammoDef } from '../../src/data/ammo';
import { CONDUIT_TICKS, ENTRANCE_CAPS, INTAKE, SPREAD_STEP } from '../../src/data/foundry';
import { MELEE } from '../../src/data/combat';
import type { EntranceState } from '../../src/sim/link';
import type { ConduitState, HopperState } from '../../src/sim/pieces';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { hasRoundToFire } from '../../src/sim/tube';
import { hudActive, nextPress, rotate } from '../../src/sim/volley';
import type { SimState } from '../../src/sim/state';
import { HALL, hold, movePlayer, run, runUntil, useAt, volleyAt } from './fight';
import { foundry, put, stepOutside } from './foundryKit';

// The intake's three entrances (024): each mouth tile is an entrance with its own
// reservoir. Only the centre starts open; each side is restored at its cap (033,
// tests/sim/researchEntrances.test.ts). While fire
// is held, each fed entrance fires at its own ammo's rate (028), down its own lane of the
// fan (048, tests/sim/volleyLanes.test.ts).

const [WEST, MIDDLE, EAST] = INTAKE.entrances;
if (!WEST || !MIDDLE || !EAST) throw new Error('the intake needs three entrances');

const ARROW_TICKS = ammoDef('arrow').fireTicks;
const BOMB_TICKS = ammoDef('bomb').fireTicks;

/** A conduit under entrance `i`, facing up into it, holding `itemId` ready to hand over. */
function feed(s: SimState, i: number, itemId: string): ConduitState {
  const e = INTAKE.entrances[i];
  if (!e) throw new Error(`no entrance ${i}`);
  const c = put<ConduitState>(s, 'conduit', e.tx, e.ty + 1, 'up');
  c.item = itemId;
  c.progress = CONDUIT_TICKS;
  return c;
}

/** An attuned foundry with every entrance open. */
function opened(): SimState {
  const s = foundry();
  for (const e of s.link.entrances) e.open = true;
  return s;
}

/** Out in the meadow with nothing carried, the entrances (all open) holding `rounds`, aiming right from (400, 400). */
function volley(rounds: ([string, number] | null)[]): SimState {
  const s = opened();
  s.inventory = {};
  rounds.forEach((r, i) => {
    const e = s.link.entrances[i];
    if (e) Object.assign(e, r ? { ammoId: r[0], count: r[1] } : { ammoId: null, count: 0 });
  });
  stepOutside(s);
  movePlayer(s, 400, 400);
  return s;
}

/** The arrows' angles from the aim (right), degrees, sorted. */
const arrowAngles = (s: SimState): number[] =>
  s.arrows.map((a) => Math.round(((Math.atan2(a.dy, a.dx) * 180) / Math.PI) * 10) / 10).sort((a, b) => a - b);

/** At the intake: feet on the floor tile under the middle entrance. */
function atIntake(s: SimState): void {
  const at = tileCentre({ tx: MIDDLE.tx, ty: MIDDLE.ty + 1 });
  movePlayer(s, at.x, at.y);
}

describe('the entrances', () => {
  it('are the three mouth tiles, the centre open and the sides capped at the start', () => {
    const s = foundry();
    expect(s.link.entrances).toEqual([
      { open: false, ammoId: null, count: 0, cooldown: 0, node: null },
      { open: true, ammoId: null, count: 0, cooldown: 0, node: null },
      { open: false, ammoId: null, count: 0, cooldown: 0, node: null },
    ]);
    expect(INTAKE.entrances.map((e) => e.startsOpen)).toEqual([false, true, false]);
    expect(ENTRANCE_CAPS[0]).toBe(30);
  });

  it('an empty entrance takes any ammo, then only that ammo until it empties', () => {
    for (const item of ['arrow', 'bomb', 'ley-bolt']) {
      const s = foundry();
      const c = feed(s, 1, item);
      run(s, 1);
      expect(c.item).toBeNull();
      expect(s.link.entrances[1]).toEqual({ open: true, ammoId: item, count: 1, cooldown: 0, node: null });
      expect(s.events.refills).toEqual([{ entrance: 1, itemId: item }]);
    }
    const s = foundry();
    const middle = s.link.entrances[1] as EntranceState;
    Object.assign(middle, { ammoId: 'arrow', count: 3 });
    const c = feed(s, 1, 'bomb');
    run(s, 5);
    expect(c.item).toBe('bomb');
    expect(middle).toMatchObject({ ammoId: 'arrow', count: 3 });
    // Once it empties it forgets its ammo, and takes the bomb.
    middle.count = 0;
    middle.ammoId = null;
    run(s, 1);
    expect(middle).toMatchObject({ ammoId: 'bomb', count: 1 });
  });

  it('a full entrance refuses, and so does anything that is not ammo, so the line backs up', () => {
    const full = foundry();
    Object.assign(full.link.entrances[1] as EntranceState, { ammoId: 'arrow', count: ENTRANCE_CAPS[0] });
    const c = feed(full, 1, 'arrow');
    run(full, 5);
    expect(c.item).toBe('arrow');
    expect(full.link.entrances[1]?.count).toBe(ENTRANCE_CAPS[0]);
    for (const item of ['wood', 'shaft', 'warden-core']) {
      const s = foundry();
      const d = feed(s, 1, item);
      run(s, 5);
      expect(d.item).toBe(item);
      expect(s.link.entrances[1]?.count).toBe(0);
    }
  });

  it('capped side entrances refuse everything', () => {
    const s = foundry();
    const west = feed(s, 0, 'arrow');
    const east = feed(s, 2, 'arrow');
    run(s, 10);
    expect([west.item, east.item]).toEqual(['arrow', 'arrow']);
    expect(s.link.entrances.map((e) => e.count)).toEqual([0, 0, 0]);
  });

  it('each open entrance fills its own reservoir', () => {
    const s = opened();
    feed(s, 0, 'arrow');
    feed(s, 1, 'bomb');
    feed(s, 2, 'arrow');
    run(s, 1);
    expect(s.link.entrances.map((e) => [e.ammoId, e.count])).toEqual([['arrow', 1], ['bomb', 1], ['arrow', 1]]);
  });
});

describe('the intake in getState', () => {
  it('getState reports each entrance, its cooldown, and the volley', () => {
    const s = volley([['arrow', 3], null, ['bomb', 2]]);
    (s.link.entrances[2] as EntranceState).cooldown = 7;
    expect(summarize(s).intake).toEqual({
      entrances: INTAKE.entrances.map((e, i) => ({
        tx: e.tx,
        ty: e.ty,
        open: true,
        ammo: ['arrow', null, 'bomb'][i] ?? null,
        count: [3, 0, 2][i] ?? 0,
        cap: ENTRANCE_CAPS[0],
        cooldown: [0, 0, 7][i] ?? 0,
      })),
      volley: ['arrow', 'bomb'],
      lanes: [-SPREAD_STEP / 2, SPREAD_STEP / 2],
    });
    expect(summarize(foundry()).intake.entrances.map((e) => e.open)).toEqual([false, true, false]);
  });
});

describe('the volley', () => {
  it('one, two and three arrow entrances fan at {0}, {±7.5} and {−15, 0, 15}', () => {
    expect(SPREAD_STEP).toBe(15);
    const cases: [([string, number] | null)[], number[]][] = [
      [[null, ['arrow', 5], null], [0]],
      [[['arrow', 5], null, ['arrow', 5]], [-7.5, 7.5]],
      [[['arrow', 5], ['arrow', 5], ['arrow', 5]], [-15, 0, 15]],
    ];
    for (const [rounds, want] of cases) {
      const s = volley(rounds);
      run(s, 1, volleyAt(600, 400));
      expect(arrowAngles(s)).toEqual(want);
      expect(s.tube.shotCount).toBe(want.length);
      expect(s.tube.fromReservoir).toBe(true);
      expect(s.events.shots).toHaveLength(want.length);
    }
  });

  it('each round costs one from its own entrance, and an empty entrance is skipped', () => {
    const s = volley([['arrow', 5], null, ['arrow', 1]]);
    run(s, 1, volleyAt(600, 400));
    expect(s.link.entrances.map((e) => [e.ammoId, e.count])).toEqual([['arrow', 4], [null, 0], [null, 0]]);
    // The east entrance ran dry, so the next press is a single arrow from the west one.
    runUntil(s, (x) => x.tube.shotCount > 0, ARROW_TICKS + 2, volleyAt(600, 400));
    expect(s.tube.shotCount).toBe(1);
    expect(s.link.entrances[0]?.count).toBe(3);
  });

  it('two bomb entrances land on the arc at the aim distance, a lane either side of the aim point (048, was side by side)', () => {
    const s = volley([['bomb', 3], ['bomb', 3], null]);
    run(s, 1, volleyAt(550, 400));
    expect(s.bombs).toHaveLength(2);
    const r = (SPREAD_STEP / 2) * (Math.PI / 180);
    const landings = s.bombs.map((b) => [Math.round(b.toX * 100) / 100, Math.round(b.toY * 100) / 100]).sort((a, b) => (a[1] ?? 0) - (b[1] ?? 0));
    const at = (sign: number) => [Math.round((400 + 150 * Math.cos(r)) * 100) / 100, Math.round((400 + sign * 150 * Math.sin(r)) * 100) / 100];
    expect(landings).toEqual([at(-1), at(1)]);
    runUntil(s, (x) => x.events.bursts.length === 2, BOMB_TICKS * 3);
  });

  it('two arrows west and east and a bomb in the centre fire one fan: the arrows ±15°, the bomb on the aim point (048, was ±7.5°)', () => {
    const s = volley([['arrow', 3], ['bomb', 3], ['arrow', 3]]);
    run(s, 1, volleyAt(550, 400));
    expect(arrowAngles(s)).toEqual([-15, 15]);
    expect(s.bombs).toHaveLength(1);
    expect(s.bombs[0]).toMatchObject({ toX: 550, toY: 400 });
    expect(s.tube.shotCount).toBe(3);
  });

  it('two arrow entrances and a bomb entrance held 120 ticks fire 8 two-arrow fans and 3 bombs (028)', () => {
    expect([ARROW_TICKS, BOMB_TICKS]).toEqual([15, 40]);
    const s = volley([['arrow', 20], ['bomb', 20], ['arrow', 20]]);
    const fans: number[] = [];
    const bombs: number[] = [];
    for (let t = 0; t < 120; t++) {
      const before = s.arrows.length;
      const bombsBefore = s.bombs.length;
      run(s, 1, volleyAt(600, 400));
      const fresh = s.arrows.slice(before);
      if (fresh.length > 0) {
        expect(fresh).toHaveLength(2);
        fans.push(t);
      }
      if (s.bombs.length > bombsBefore) {
        expect(s.bombs.length - bombsBefore).toBe(1);
        bombs.push(t);
      }
    }
    expect(fans).toEqual([0, 15, 30, 45, 60, 75, 90, 105]);
    expect(bombs).toEqual([0, 40, 80]);
    expect(s.link.entrances.map((e) => e.count)).toEqual([12, 17, 12]);
  });

  it('an entrance on cooldown does not hold back a ready one', () => {
    const s = volley([['bomb', 5], ['arrow', 5], null]);
    run(s, 1, volleyAt(600, 400));
    expect(s.link.entrances.map((e) => e.cooldown)).toEqual([BOMB_TICKS, ARROW_TICKS, 0]);
    run(s, ARROW_TICKS, volleyAt(600, 400));
    // The arrow entrance fired again on its own; the bomb entrance is still cooling down.
    expect(s.tube.shotCount).toBe(1);
    expect(s.link.entrances.map((e) => e.count)).toEqual([4, 3, 0]);
    expect(s.link.entrances[0]?.cooldown).toBe(BOMB_TICKS - ARROW_TICKS);
    expect(s.events.entranceFires).toEqual([{ entrance: 1, ammoId: 'arrow' }]);
  });

  it('each entrance counts its cooldown down every tick, fire held or not', () => {
    const s = volley([null, ['bomb', 5], null]);
    run(s, 1, volleyAt(600, 400));
    run(s, 10);
    expect(s.link.entrances[1]?.cooldown).toBe(BOMB_TICKS - 10);
  });

  it('an entrance keeps its cooldown across an ammo change: a bomb after its last arrow waits out the arrow pace', () => {
    const s = volley([null, ['arrow', 1], null]);
    run(s, 1, volleyAt(600, 400));
    expect(s.link.entrances[1]).toMatchObject({ ammoId: null, count: 0, cooldown: ARROW_TICKS });
    Object.assign(s.link.entrances[1] as EntranceState, { ammoId: 'bomb', count: 2 });
    const waited = runUntil(s, (x) => x.bombs.length > 0, ARROW_TICKS * 2, volleyAt(600, 400));
    expect(waited).toBe(ARROW_TICKS);
    expect(s.link.entrances[1]?.cooldown).toBe(BOMB_TICKS);
  });

  it('two arrow entrances that start together stay a fan', () => {
    const s = volley([['arrow', 9], null, ['arrow', 9]]);
    for (let t = 0; t < ARROW_TICKS * 4; t++) {
      const before = s.arrows.length;
      run(s, 1, volleyAt(600, 400));
      const fresh = s.arrows.slice(before);
      if (fresh.length === 0) continue;
      const angles = fresh.map((a) => Math.round(((Math.atan2(a.dy, a.dx) * 180) / Math.PI) * 10) / 10).sort((a, b) => a - b);
      expect(angles).toEqual([-7.5, 7.5]);
    }
    expect(s.link.entrances.map((e) => e.count)).toEqual([5, 0, 5]);
  });

  it('a volley never holds back a carried round: right click keeps its own pace (047)', () => {
    const s = volley([null, ['bomb', 1], null]);
    s.inventory = { arrow: 5 };
    hold(s, 'arrow');
    run(s, 1, volleyAt(600, 400));
    expect(s.bombs).toHaveLength(1);
    expect(s.tube.fireCooldown).toBe(0);
    run(s, 1, useAt(600, 400));
    expect(s.arrows).toHaveLength(1);
    expect(s.inventory.arrow).toBe(4);
  });

  it('a volley fires straight away, whatever the carried rounds left on the tube interval', () => {
    const s = volley([null, null, null]);
    s.inventory = { arrow: 1 };
    hold(s, 'arrow');
    run(s, 1, useAt(600, 400));
    expect(s.tube.fireCooldown).toBe(ARROW_TICKS);
    Object.assign(s.link.entrances[1] as EntranceState, { ammoId: 'bomb', count: 1 });
    run(s, 1, volleyAt(600, 400));
    expect(s.bombs).toHaveLength(1);
  });

  it('fires whatever ammo the entrances hold, whatever is selected', () => {
    const s = volley([null, ['bomb', 2], null]);
    hold(s, 'arrow');
    run(s, 1, volleyAt(550, 400));
    expect(s.bombs).toHaveLength(1);
    expect(s.link.entrances[1]?.count).toBe(1);
  });

  it('left click fires the volley, then punches once the entrances are dry, never a carried round (028, 047)', () => {
    const s = volley([['arrow', 1], null, ['bomb', 1]]);
    s.inventory = { arrow: 1, bomb: 4 };
    hold(s, 'arrow');
    expect(nextPress(s)).toEqual({
      kind: 'volley',
      rounds: [
        { ammoId: 'arrow', count: 1, entrance: 0, lane: -SPREAD_STEP / 2 },
        { ammoId: 'bomb', count: 1, entrance: 2, lane: SPREAD_STEP / 2 },
      ],
    });
    expect(hudActive(s).kind).toBe('volley');
    expect(summarize(s).tube.next).toBe('volley');
    run(s, 1, volleyAt(600, 400));
    expect(s.tube.shotCount).toBe(2);
    expect(s.tube.fromReservoir).toBe(true);
    expect(s.link.entrances.map((e) => e.count)).toEqual([0, 0, 0]);
    // The entrances are empty: carried arrows and bombs stay put, and the press punches.
    expect(nextPress(s)).toEqual({ kind: 'melee' });
    expect(hudActive(s)).toEqual({ kind: 'melee' });
    expect(summarize(s).tube.next).toBe('melee');
    expect(hasRoundToFire(s)).toBe(false);
    run(s, ARROW_TICKS + 1, volleyAt(600, 400));
    expect(s.inventory).toMatchObject({ arrow: 1, bomb: 4 });
    expect(s.tube.meleeCooldown).toBeGreaterThan(0);
    expect(s.tube.meleeCooldown).toBeLessThanOrEqual(MELEE.cooldownTicks);
  });

  it('without the tube, the press is melee even with fed entrances', () => {
    const s = volley([null, ['arrow', 5], null]);
    s.hasTube = false;
    expect(nextPress(s)).toEqual({ kind: 'melee' });
  });

  it('three ley bolt lines into the three entrances fire three bolts per press', () => {
    const s = opened();
    s.inventory = {};
    hold(s, 'ley-bolt');
    // Three columns up into the three entrances: hopper → grinder → focuser → conduit.
    for (const e of INTAKE.entrances) {
      const h = put<HopperState>(s, 'hopper', e.tx, 4, 'up');
      h.item = 'ley-crystal';
      h.count = 10;
      put(s, 'grinder', e.tx, 3, 'up');
      put(s, 'focuser', e.tx, 2, 'up');
      put(s, 'conduit', e.tx, 1, 'up');
    }
    runUntil(s, (x) => x.link.entrances.every((e) => e.count >= 3), 1500);
    stepOutside(s);
    movePlayer(s, 400, 400);
    run(s, 1, volleyAt(600, 400));
    expect(s.tube.shotCount).toBe(3);
    expect(arrowAngles(s)).toEqual([-15, 0, 15]);
    expect(s.arrows.every((a) => a.ammoId === 'ley-bolt')).toBe(true);
  });

  it('rotate turns a direction clockwise on screen', () => {
    const [x, y] = rotate(1, 0, 90);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(1);
  });

  it('an opening, two lines and volleys replay exactly', () => {
    const play = () => {
      const s = foundry();
      s.inventory = { 'warden-core': 1, arrow: 20, bomb: 6 };
      atIntake(s);
      run(s, 1, { interact: true });
      for (const [i, item] of [[0, 'arrow'], [2, 'bomb']] as const) {
        const e = INTAKE.entrances[i];
        if (!e) continue;
        const h = put<HopperState>(s, 'hopper', e.tx, 2, 'up');
        put(s, 'conduit', e.tx, 1, 'up');
        h.item = item;
        h.count = 6;
      }
      run(s, 200);
      s.inventory = {};
      stepOutside(s);
      run(s, 300, (x) => ({ ...volleyAt(x.player.x + 120 + (x.tick % 40), x.player.y + 20), moveX: x.tick % 90 < 45 ? 1 : -1 }));
      return summarize(s);
    };
    const a = play();
    expect(a.room).toBe(HALL);
    expect(a).toEqual(play());
  });
});
