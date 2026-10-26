import { describe, expect, it } from 'vitest';
import { OBJECTIVES, STORM_TIERED_ROUNDS, TIERED_ROUNDS } from '../../src/data/objectives';
import { HOLLOWS_START } from '../../src/data/playtest';
import { currentObjective } from '../../src/sim/objectives';
import { createSim, type SimState } from '../../src/sim/state';
import { arena, fireAt, hold, PLAYER_AT, run } from './fight';

// 066: Milestone 3 gains three goals after "Feed all five entrances": temper stormsteel at the bench, build a Tempering
// coil into a line, and fire stormsteel rounds (any stormsteel or storm glass round fired). They end the chain.

const at = (text: string): number => {
  const i = OBJECTIVES.findIndex((o) => o.text === text);
  if (i < 0) throw new Error(`no goal '${text}'`);
  return i;
};

const STORM = ['Temper stormsteel at the bench (C)', 'Build a Tempering coil into a line', 'Fire stormsteel rounds'];

/** Every goal before `text` done, stormsteel never hand-made. */
function upTo(text: string): SimState {
  const s = createSim(3, { start: HOLLOWS_START });
  s.enemies = [];
  // The Hollows start has crafted everything (ALL_CRAFTED); this goal is about the first stormsteel.
  s.crafted = s.crafted.filter((id) => id !== 'stormsteel');
  const goal = at(text);
  s.objectives = OBJECTIVES.map((o, i) => i < goal && !o.cutIn);
  run(s, 1);
  return s;
}

describe('the storm tier goals (066)', () => {
  it('follow "Feed all five entrances", in order, tagged m3, and end the chain', () => {
    const first = at('Feed all five entrances') + 1;
    expect(OBJECTIVES.slice(first, first + 3).map((o) => o.text)).toEqual(STORM);
    for (const t of STORM) expect(OBJECTIVES[at(t)]?.milestone).toBe('m3');
    expect(OBJECTIVES.filter((o) => !o.cutIn).at(-1)?.text).toBe('Fire stormsteel rounds');
    expect(OBJECTIVES[at(STORM[0] ?? '')]).toMatchObject({ check: { kind: 'crafted', items: ['stormsteel'] }, target: { kind: 'collect' } });
    expect(OBJECTIVES[at(STORM[1] ?? '')]).toMatchObject({ check: { kind: 'machineMade', item: 'stormsteel' }, target: { kind: 'room', room: 'foundry' } });
    expect(OBJECTIVES[at(STORM[2] ?? '')]).toMatchObject({ check: { kind: 'fired', items: STORM_TIERED_ROUNDS }, target: { kind: 'intake' } });
  });

  it('take every stormsteel and storm glass round, and no steel, glass or stone one; 062’s goal takes no storm round', () => {
    expect(STORM_TIERED_ROUNDS).toContain('arrow+stormsteel');
    expect(STORM_TIERED_ROUNDS).toContain('ley-bolt+storm-glass+split');
    expect(STORM_TIERED_ROUNDS).toHaveLength(28);
    for (const r of ['arrow', 'arrow+steel', 'ley-bolt+glass+homing']) expect(STORM_TIERED_ROUNDS).not.toContain(r);
    for (const r of STORM_TIERED_ROUNDS) expect(TIERED_ROUNDS).not.toContain(r);
  });

  it('tempering stormsteel by hand, then a machine making it, complete the first two; hand-tempering never counts as built', () => {
    const s = upTo(STORM[0] ?? '');
    expect(currentObjective(s)).toBe(at(STORM[0] ?? ''));
    s.crafted.push('stormsteel');
    run(s, 1);
    expect(s.objectives[at(STORM[0] ?? '')]).toBe(true);
    expect(s.objectives[at(STORM[1] ?? '')]).toBe(false);
    s.machineMade.stormsteel = 1;
    run(s, 1);
    expect(s.objectives[at(STORM[1] ?? '')]).toBe(true);
    expect(currentObjective(s)).toBe(at('Fire stormsteel rounds'));
  });

  it('firing any stormsteel or storm glass round completes the last; a steel or stone round never does', () => {
    for (const [round, done] of [['arrow', false], ['arrow+steel', false], ['ley-bolt+glass', false], ['bomb+stormsteel', true], ['ley-bolt+storm-glass+homing', true]] as const) {
      const s = arena();
      s.objectives = OBJECTIVES.map((o, i) => i < at('Fire stormsteel rounds') && !o.cutIn);
      s.inventory = { [round]: 3 };
      hold(s, round);
      run(s, 1, fireAt(PLAYER_AT.x + 100, PLAYER_AT.y));
      expect(s.objectives[at('Fire stormsteel rounds')], round).toBe(done);
    }
  });

  it('with the last done, the chain is over', () => {
    const s = upTo('Fire stormsteel rounds');
    s.objectives[at('Fire stormsteel rounds')] = true;
    expect(currentObjective(s)).toBeNull();
  });
});
