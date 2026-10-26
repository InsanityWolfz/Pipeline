import { describe, expect, it } from 'vitest';
import { OBJECTIVES, TIERED_ROUNDS } from '../../src/data/objectives';
import { HOLLOWS_START, PLAYTEST_START } from '../../src/data/playtest';
import { currentObjective, objectiveLine } from '../../src/sim/objectives';
import { createSim } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { run, SEED } from './fight';
import { foundry } from './foundryKit';

// 028: the objectives are one ordered chain. The prototype's goals run first and end with leaving the foundry (058);
// Milestone 1's follow. 058: the tutorial ends with feeding all three entrances, and the line is empty after it.

const LEAVE = OBJECTIVES.findIndex((o) => o.check.kind === 'outside');
const CLAIMED = OBJECTIVES.findIndex((o) => o.check.kind === 'claimed');
const CHAIN = OBJECTIVES.filter((o) => !o.cutIn);
/** The chain's last goal's index in OBJECTIVES (the talent cut-in may sit after it). */
const LAST = OBJECTIVES.findIndex((o) => o === CHAIN.at(-1));
const M1 = CHAIN.filter((o) => o.milestone === 'm1');
/** 060: Milestone 2's goals follow Milestone 1's. */
const M2_START = OBJECTIVES.findIndex((o) => o.milestone === 'm2');

describe('the chain', () => {
  it('runs the prototype goals, ending with leaving the foundry, then the Milestone 1 goals', () => {
    expect(OBJECTIVES[LEAVE]?.text).toBe('Leave the foundry');
    expect(CHAIN.slice(0, LEAVE + 1).every((o) => o.milestone === 'prototype')).toBe(true);
    const m2 = CHAIN.findIndex((o) => o.milestone === 'm2');
    expect(CHAIN.slice(LEAVE + 1, m2).every((o) => o.milestone === 'm1')).toBe(true);
    expect(CHAIN.slice(m2).every((o) => o.milestone === 'm2')).toBe(true);
    expect(M1.map((o) => o.check)).toEqual([
      { kind: 'gathered', items: ['rimestone'] },
      { kind: 'claimed', site: 'frozen-grotto' },
      { kind: 'crafted', items: ['arrow+frost'] },
      { kind: 'machineMade', item: 'arrow+frost' },
      { kind: 'claimed', site: 'husk-hive' },
      { kind: 'inRegion', region: 2 },
      { kind: 'claimed', site: 'cistern-terrace' },
      { kind: 'bossDefeated', boss: 'bulwark' },
      { kind: 'restored', node: 'entrance-3' },
      { kind: 'volley', min: 3 },
    ]);
    // The chain's last goal is the tutorial's end: 060's feeding all four, then (062) firing steel rounds (Milestone 2's
    // chain is goalsM2.test.ts's and goalsTiers.test.ts's).
    expect(M1.at(-1)?.check).toEqual({ kind: 'volley', min: 3 });
    expect(CHAIN.at(-1)?.check).toEqual({ kind: 'fired', items: TIERED_ROUNDS });
  });
});

describe('the goals', () => {
  it('feeding all three entrances completes the volley goal for three', () => {
    const s = foundry();
    const i = OBJECTIVES.findIndex((o) => o.check.kind === 'volley' && o.check.min === 3);
    for (const e of s.link.entrances) e.open = true;
    for (const [k, e] of s.link.entrances.entries()) Object.assign(e, { ammoId: 'arrow', count: 1 + k });
    run(s, 1);
    expect(s.objectives[i]).toBe(true);
  });

  it('the ley bolt goal holds only once ley bolts are in the entrance the Warden core opened', () => {
    const s = foundry();
    const i = OBJECTIVES.findIndex((o) => o.guided === 'ley-line');
    const [, centre, east] = s.link.entrances;
    if (!centre || !east) throw new Error('no entrances');
    Object.assign(east, { open: true, node: 'entrance-2', ammoId: 'arrow', count: 5 });
    Object.assign(centre, { ammoId: 'ley-bolt', count: 5 });
    run(s, 1);
    expect(s.objectives[i]).toBe(false);
    Object.assign(east, { ammoId: 'ley-bolt', count: 5 });
    run(s, 1);
    expect(s.objectives[i]).toBe(true);
  });

  it('equipping any piece completes the equip goal', () => {
    const s = createSim(SEED, { start: PLAYTEST_START });
    const i = OBJECTIVES.findIndex((o) => o.check.kind === 'equipped');
    run(s, 1);
    expect(s.objectives[i]).toBe(false);
    s.equipped.helm = s.gear[0]?.id ?? 0;
    run(s, 1);
    expect(s.objectives[i]).toBe(true);
  });

  it('prototypeComplete comes with the prototype goals, and ignores Milestone 1', () => {
    const s = createSim(SEED, { start: PLAYTEST_START });
    s.objectives = OBJECTIVES.map((o) => o.milestone === 'm1');
    run(s, 1);
    expect(s.prototypeComplete).toBe(false);
    s.objectives = OBJECTIVES.map((o) => o.milestone === 'prototype');
    run(s, 1);
    expect(s.prototypeComplete).toBe(true);
  });
});

describe('the line after the shrine', () => {
  it('shows the first unfinished goal, and agrees with the summary, whichever goals after the claim are done', () => {
    // 060: the goals from the claim to Milestone 2's in every combination (2^n grows fast); Milestone 2's left open.
    const after = M2_START - CLAIMED - 1;
    expect(after).toBeGreaterThan(0);
    expect(LAST).toBeGreaterThan(CLAIMED);
    const s = createSim(SEED);
    // The chain's last goal open, so the line isn't over; the rest after the claim in every combination.
    for (let mask = 0; mask < 1 << after; mask++) {
      s.objectives = OBJECTIVES.map((o, i) => !o.cutIn && i !== LAST && i < M2_START && (i <= CLAIMED || ((mask >> (i - CLAIMED - 1)) & 1) === 1));
      const line = objectiveLine(s);
      const first = currentObjective(s);
      expect(first, `mask ${mask}`).not.toBeNull();
      expect(line).toEqual({ index: first, text: OBJECTIVES[first ?? 0]?.text });
      if (mask % 97 === 0) expect(summarize(s).objective).toEqual(line);
    }
  }, 20_000);

  it('is empty once every goal is done, with no index (058: no frontier line)', () => {
    const s = createSim(SEED);
    s.objectives = OBJECTIVES.map(() => true);
    expect(summarize(s).objective).toEqual({ index: null, text: '' });
  });
});

describe("Region 2's goals (034)", () => {
  const at = (text: string): number => OBJECTIVES.findIndex((o) => o.text === text);

  it('reach the Hollows once the player stands in Region 2, and defeat the Bulwark on its first kill', () => {
    const s = createSim(SEED, { start: HOLLOWS_START });
    run(s, 1);
    expect(s.objectives[at('Reach Stonefall Hollows')]).toBe(true);
    expect(s.objectives[at('Defeat the Bulwark')]).toBe(false);
    const b = s.enemies.find((e) => e.enemyId === 'bulwark');
    if (b) b.health = 0;
    run(s, 1);
    expect(s.objectives[at('Defeat the Bulwark')]).toBe(true);
  });
});
