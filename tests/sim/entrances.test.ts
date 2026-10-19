import { describe, expect, it } from 'vitest';
import { ammoDef } from '../../src/data/ammo';
import { CONDUIT_TICKS, ENTRANCE_CAP, INTAKE, LOB_SPACING, OPEN_ENTRANCES_COST, SPREAD_STEP } from '../../src/data/foundry';
import { MELEE } from '../../src/data/combat';
import { intakeInReach, intakeOpenable } from '../../src/sim/intake';
import type { EntranceState } from '../../src/sim/link';
import type { ConduitState, HopperState } from '../../src/sim/pieces';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { hasRoundToFire } from '../../src/sim/tube';
import { nextPress, rotate } from '../../src/sim/volley';
import type { SimState } from '../../src/sim/state';
import { fireAt, HALL, movePlayer, placeHusk, run, runUntil, runUntilKo } from './fight';
import { foundry, put, stepOutside } from './foundryKit';

// The intake's three entrances (024): each mouth tile is an entrance with its own
// reservoir. Only the centre starts open; a warden core opens the sides. One fire
// press fires a volley, one round from every fed entrance.

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
      { open: false, ammoId: null, count: 0 },
      { open: true, ammoId: null, count: 0 },
      { open: false, ammoId: null, count: 0 },
    ]);
    expect(INTAKE.entrances.map((e) => e.startsOpen)).toEqual([false, true, false]);
    expect(ENTRANCE_CAP).toBe(30);
  });

  it('an empty entrance takes any ammo, then only that ammo until it empties', () => {
    for (const item of ['arrow', 'bomb', 'ley-bolt']) {
      const s = foundry();
      const c = feed(s, 1, item);
      run(s, 1);
      expect(c.item).toBeNull();
      expect(s.link.entrances[1]).toEqual({ open: true, ammoId: item, count: 1 });
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
    Object.assign(full.link.entrances[1] as EntranceState, { ammoId: 'arrow', count: ENTRANCE_CAP });
    const c = feed(full, 1, 'arrow');
    run(full, 5);
    expect(c.item).toBe('arrow');
    expect(full.link.entrances[1]?.count).toBe(ENTRANCE_CAP);
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

describe('opening the side entrances', () => {
  it('E at the intake with a warden core spends it and opens both sides for good', () => {
    const s = foundry();
    s.inventory['warden-core'] = 2;
    atIntake(s);
    expect(intakeInReach(s)).toBe(true);
    expect(intakeOpenable(s)).toBe(true);
    run(s, 1, { interact: true });
    expect(s.link.entrances.map((e) => e.open)).toEqual([true, true, true]);
    expect(s.inventory['warden-core']).toBe(2 - (OPEN_ENTRANCES_COST['warden-core'] ?? 0));
    expect(s.events.intakeOpens).toEqual([{ entrances: [0, 2] }]);
    expect(intakeOpenable(s)).toBe(false);
    // Again: nothing more to open, nothing spent.
    run(s, 1, { interact: true });
    expect(s.inventory['warden-core']).toBe(1);
    expect(s.events.intakeOpens).toEqual([]);
  });

  it('does nothing without a core, out of reach, or before the tube attunes', () => {
    const none = foundry();
    none.inventory['warden-core'] = 0;
    atIntake(none);
    run(none, 1, { interact: true });
    expect(none.link.entrances.map((e) => e.open)).toEqual([false, true, false]);

    const far = foundry();
    far.inventory['warden-core'] = 1;
    expect(intakeInReach(far)).toBe(false);
    run(far, 1, { interact: true });
    expect(far.link.entrances.map((e) => e.open)).toEqual([false, true, false]);
    expect(far.inventory['warden-core']).toBe(1);

    const dormant = foundry();
    dormant.link.attuned = false;
    dormant.link.attunePulse = 0;
    dormant.inventory['warden-core'] = 1;
    atIntake(dormant);
    expect(intakeOpenable(dormant)).toBe(false);
  });

  it('stays open, with what the entrances hold, through a KO', () => {
    const s = foundry();
    s.inventory['warden-core'] = 1;
    atIntake(s);
    run(s, 1, { interact: true });
    Object.assign(s.link.entrances[0] as EntranceState, { ammoId: 'bomb', count: 4 });
    stepOutside(s);
    s.player.health = 1;
    const at = { x: s.player.x, y: s.player.y };
    placeHusk(s, at.x + 20, at.y);
    runUntilKo(s, 400);
    expect(s.link.entrances.map((e) => e.open)).toEqual([true, true, true]);
    expect(s.link.entrances[0]).toEqual({ open: true, ammoId: 'bomb', count: 4 });
  });

  it('getState reports each entrance and the volley', () => {
    const s = volley([['arrow', 3], null, ['bomb', 2]]);
    expect(summarize(s).intake).toEqual({
      entrances: INTAKE.entrances.map((e, i) => ({
        tx: e.tx,
        ty: e.ty,
        open: true,
        ammo: ['arrow', null, 'bomb'][i] ?? null,
        count: [3, 0, 2][i] ?? 0,
        cap: ENTRANCE_CAP,
      })),
      volley: ['arrow', 'bomb'],
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
      run(s, 1, fireAt(600, 400));
      expect(arrowAngles(s)).toEqual(want);
      expect(s.tube.shotCount).toBe(want.length);
      expect(s.tube.fromReservoir).toBe(true);
      expect(s.events.shots).toHaveLength(want.length);
    }
  });

  it('each round costs one from its own entrance, and an empty entrance is skipped', () => {
    const s = volley([['arrow', 5], null, ['arrow', 1]]);
    run(s, 1, fireAt(600, 400));
    expect(s.link.entrances.map((e) => [e.ammoId, e.count])).toEqual([['arrow', 4], [null, 0], [null, 0]]);
    // The east entrance ran dry, so the next press is a single arrow from the west one.
    runUntil(s, (x) => x.tube.shotCount > 0, ARROW_TICKS + 2, fireAt(600, 400));
    expect(s.tube.shotCount).toBe(1);
    expect(s.link.entrances[0]?.count).toBe(3);
  });

  it('two bomb entrances land side by side, LOB_SPACING apart across the aim point', () => {
    expect(LOB_SPACING).toBe(24);
    const s = volley([['bomb', 3], ['bomb', 3], null]);
    run(s, 1, fireAt(550, 400));
    expect(s.bombs).toHaveLength(2);
    const landings = s.bombs.map((b) => [Math.round(b.toX * 100) / 100, Math.round(b.toY * 100) / 100]).sort((a, b) => (a[1] ?? 0) - (b[1] ?? 0));
    expect(landings).toEqual([
      [550, 388],
      [550, 412],
    ]);
    runUntil(s, (x) => x.events.bursts.length === 2, BOMB_TICKS * 3);
  });

  it('two arrows and a bomb fire two angled arrows and one straight bomb', () => {
    const s = volley([['arrow', 3], ['bomb', 3], ['arrow', 3]]);
    run(s, 1, fireAt(550, 400));
    expect(arrowAngles(s)).toEqual([-7.5, 7.5]);
    expect(s.bombs).toHaveLength(1);
    expect(s.bombs[0]).toMatchObject({ toX: 550, toY: 400 });
    expect(s.tube.shotCount).toBe(3);
  });

  it('waits the longest fireTicks of the ammo it fired', () => {
    const s = volley([['arrow', 9], ['bomb', 9], null]);
    run(s, 1, fireAt(550, 400));
    expect(s.tube.fireCooldown).toBe(BOMB_TICKS);
    let presses = 1;
    for (let t = 0; t < BOMB_TICKS * 2; t++) {
      run(s, 1, fireAt(550, 400));
      if (s.tube.shotCount > 0) presses += 1;
    }
    expect(presses).toBe(3);
    expect(s.link.entrances[0]?.count).toBe(6);
  });

  it('fires whatever ammo the entrances hold, whatever is selected', () => {
    const s = volley([null, ['bomb', 2], null]);
    s.tube.ammoId = 'arrow';
    run(s, 1, fireAt(550, 400));
    expect(s.bombs).toHaveLength(1);
    expect(s.link.entrances[1]?.count).toBe(1);
  });

  it('fires a carried round of the selected ammo first, alone; then the volley; then melee', () => {
    const s = volley([['arrow', 1], null, ['bomb', 1]]);
    s.inventory = { arrow: 1, bomb: 4 };
    s.tube.ammoId = 'arrow';
    expect(nextPress(s)).toEqual({ kind: 'carried', ammoId: 'arrow', count: 1 });
    expect(hasRoundToFire(s)).toBe(true);
    run(s, 1, fireAt(600, 400));
    expect(s.tube.shotCount).toBe(1);
    expect(s.tube.fromReservoir).toBe(false);
    expect(s.link.entrances.map((e) => e.count)).toEqual([1, 0, 1]);
    // Carried bombs aren't the selected ammo: the volley is next.
    expect(nextPress(s)).toEqual({
      kind: 'volley',
      rounds: [
        { ammoId: 'arrow', count: 1, entrance: 0 },
        { ammoId: 'bomb', count: 1, entrance: 2 },
      ],
    });
    expect(summarize(s).tube.next).toBe('volley');
    run(s, ARROW_TICKS, fireAt(600, 400));
    expect(s.link.entrances.map((e) => e.count)).toEqual([0, 0, 0]);
    expect(s.inventory.bomb).toBe(4);
    expect(nextPress(s)).toEqual({ kind: 'melee' });
    expect(hasRoundToFire(s)).toBe(false);
    run(s, BOMB_TICKS + 1, fireAt(600, 400));
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
    s.tube.ammoId = 'ley-bolt';
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
    run(s, 1, fireAt(600, 400));
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
      run(s, 300, (x) => ({ ...fireAt(x.player.x + 120 + (x.tick % 40), x.player.y + 20), moveX: x.tick % 90 < 45 ? 1 : -1 }));
      return summarize(s);
    };
    const a = play();
    expect(a.room).toBe(HALL);
    expect(a).toEqual(play());
  });
});
