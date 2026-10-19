import { describe, expect, it } from 'vitest';
import { SPREAD_STEP } from '../../src/data/foundry';
import { fillEntrance } from '../../src/sim/link';
import { summarize } from '../../src/sim/summary';
import { hudActive, nextPress, volleyShots } from '../../src/sim/volley';
import type { SimState } from '../../src/sim/state';
import { arena, fireAt, movePlayer, run } from './fight';
import { foundry, stepOutside } from './foundryKit';

// Tagged rounds in the tube (029): entrances hold one exact round kind, rounds that
// fire together fan by base ammo, and carried tagged rounds fire from their base's slot first.

const angles = (s: SimState): number[] =>
  s.arrows.map((a) => Math.round(((Math.atan2(a.dy, a.dx) * 180) / Math.PI) * 10) / 10).sort((a, b) => a - b);

describe('tagged rounds and the entrances', () => {
  it('an entrance holding frost arrows refuses plain ones until it empties', () => {
    const s = foundry();
    const e = s.link.entrances[1];
    if (!e) throw new Error('no entrance');
    expect(fillEntrance(e, 'arrow+frost')).toBe(true);
    expect(fillEntrance(e, 'arrow')).toBe(false);
    expect(summarize(s).intake.entrances[1]).toMatchObject({ ammo: 'arrow+frost', count: 1 });
  });

  it('a plain arrow and a frost arrow from two entrances fan at ±7.5°', () => {
    const s = foundry();
    for (const e of s.link.entrances) e.open = true;
    Object.assign(s.link.entrances[0] ?? {}, { ammoId: 'arrow', count: 5 });
    Object.assign(s.link.entrances[2] ?? {}, { ammoId: 'arrow+frost', count: 5 });
    s.inventory = {};
    stepOutside(s);
    movePlayer(s, 400, 400);
    run(s, 1, fireAt(1000, 400));
    expect(angles(s)).toEqual([-SPREAD_STEP / 2, SPREAD_STEP / 2]);
    expect(s.arrows.map((a) => a.ammoId).sort()).toEqual(['arrow', 'arrow+frost']);
  });

  it('groups a volley by base ammo', () => {
    const shots = volleyShots(['arrow', 'ley-bolt+homing', 'arrow+frost'], 1, 0);
    expect(shots.map((v) => v.ammoId)).toEqual(['arrow', 'arrow+frost', 'ley-bolt+homing']);
    expect(shots[2]?.dir).toEqual([1, 0]);
  });
});

describe('carried tagged rounds', () => {
  it('fire from their base ammo slot, before plain ones', () => {
    const s = arena();
    s.inventory = { arrow: 3, 'arrow+frost': 2 };
    expect(nextPress(s)).toEqual({ kind: 'carried', ammoId: 'arrow+frost', count: 2 });
    expect(hudActive(s)).toEqual({ kind: 'carried', ammoId: 'arrow+frost', count: 2 });
    const fired: string[] = [];
    for (let t = 0; t < 120; t++) {
      run(s, 1, fireAt(s.player.x + 300, s.player.y));
      fired.push(...s.events.shots.map((x) => x.ammoId));
    }
    expect(fired).toEqual(['arrow+frost', 'arrow+frost', 'arrow', 'arrow', 'arrow']);
  });

  it('wait for their slot: ley variants fire only with the ley bolt slot selected', () => {
    const s = arena();
    s.inventory = { 'ley-bolt+homing': 2, 'ley-bolt+star': 2 };
    expect(nextPress(s).kind).toBe('melee');
    run(s, 1, { selectAmmo: 'ley-bolt' });
    expect(nextPress(s)).toEqual({ kind: 'carried', ammoId: 'ley-bolt+homing', count: 2 });
  });
});
