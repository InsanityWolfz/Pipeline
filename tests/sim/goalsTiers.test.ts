import { describe, expect, it } from 'vitest';
import { OBJECTIVES, TIERED_ROUNDS } from '../../src/data/objectives';
import { HOLLOWS_START } from '../../src/data/playtest';
import { currentObjective } from '../../src/sim/objectives';
import { createSim, type SimState } from '../../src/sim/state';
import { arena, fireAt, hold, PLAYER_AT, run } from './fight';

// 062: Milestone 2 gains three goals after "Feed all four entrances": smelt ley-steel at the bench, build a Smelter
// into a line, and fire steel rounds (any steel or glass round fired).

const at = (text: string): number => {
  const i = OBJECTIVES.findIndex((o) => o.text === text);
  if (i < 0) throw new Error(`no goal '${text}'`);
  return i;
};

const TIERS = ['Smelt ley-steel at the bench (C)', 'Build a Smelter into a line', 'Fire steel rounds'];

/** Every goal before `text` done. */
function upTo(text: string): SimState {
  const s = createSim(3, { start: HOLLOWS_START });
  s.enemies = [];
  // The Hollows start has crafted everything (ALL_CRAFTED); this goal is about the first ley-steel.
  s.crafted = s.crafted.filter((id) => id !== 'ley-steel');
  const goal = at(text);
  s.objectives = OBJECTIVES.map((o, i) => i < goal && !o.cutIn);
  run(s, 1);
  return s;
}

describe('the material tier goals (062)', () => {
  it('follow "Feed all four entrances", in order, tagged m2, and end Milestone 2 (064: Milestone 3 follows)', () => {
    const first = at('Feed all four entrances') + 1;
    expect(OBJECTIVES.slice(first, first + 3).map((o) => o.text)).toEqual(TIERS);
    for (const t of TIERS) expect(OBJECTIVES[at(t)]?.milestone).toBe('m2');
    expect(OBJECTIVES.filter((o) => !o.cutIn && o.milestone !== 'm3').at(-1)?.text).toBe('Fire steel rounds');
    expect(OBJECTIVES[at(TIERS[0] ?? '')]).toMatchObject({ check: { kind: 'crafted', items: ['ley-steel'] }, target: { kind: 'collect' } });
    expect(OBJECTIVES[at(TIERS[1] ?? '')]).toMatchObject({ check: { kind: 'machineMade', item: 'ley-steel' }, target: { kind: 'room', room: 'foundry' } });
    expect(OBJECTIVES[at(TIERS[2] ?? '')]).toMatchObject({ check: { kind: 'fired', items: TIERED_ROUNDS }, target: { kind: 'intake' } });
    expect(TIERED_ROUNDS).toContain('arrow+steel');
    expect(TIERED_ROUNDS).toContain('ley-bolt+glass+split');
    expect(TIERED_ROUNDS).not.toContain('arrow');
  });

  it('smelting ley-steel by hand, then a machine making it, complete the first two; hand-smelting never counts as built', () => {
    const s = upTo(TIERS[0] ?? '');
    expect(currentObjective(s)).toBe(at(TIERS[0] ?? ''));
    s.crafted.push('ley-steel');
    run(s, 1);
    expect(s.objectives[at(TIERS[0] ?? '')]).toBe(true);
    expect(s.objectives[at(TIERS[1] ?? '')]).toBe(false);
    s.machineMade['ley-steel'] = 1;
    run(s, 1);
    expect(s.objectives[at(TIERS[1] ?? '')]).toBe(true);
    expect(currentObjective(s)).toBe(at('Fire steel rounds'));
  });

  it('firing any steel or glass round completes the last; a stone round never does', () => {
    for (const [round, done] of [['arrow', false], ['arrow+frost', false], ['bomb+steel', true], ['ley-bolt+glass+homing', true]] as const) {
      const s = arena();
      s.objectives = OBJECTIVES.map((o, i) => i < at('Fire steel rounds') && !o.cutIn);
      s.inventory = { [round]: 3 };
      hold(s, round);
      run(s, 1, fireAt(PLAYER_AT.x + 100, PLAYER_AT.y));
      expect(s.objectives[at('Fire steel rounds')], round).toBe(done);
    }
  });

  it('with the last done, Milestone 3’s first goal is current (064; the chain was over)', () => {
    const s = upTo('Fire steel rounds');
    s.objectives[at('Fire steel rounds')] = true;
    expect(currentObjective(s)).toBe(at('Reach the Stormcrown'));
  });
});
