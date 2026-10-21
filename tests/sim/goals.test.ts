import { describe, expect, it } from 'vitest';
import { FRONTIER_GOAL, OBJECTIVES } from '../../src/data/objectives';
import { SUPPLY_TICKS } from '../../src/data/claims';
import { OVERWORLD_ROOM } from '../../src/data/overworld';
import { FOUNDRY_ROOM, SHRINE_SITE } from '../../src/data/rooms';
import { HOLLOWS_START, PLAYTEST_START } from '../../src/data/playtest';
import { claim } from '../../src/sim/claims';
import { currentObjective, objectiveLine } from '../../src/sim/objectives';
import { createSim } from '../../src/sim/state';
import { stepSim } from '../../src/sim/step';
import { summarize } from '../../src/sim/summary';
import { command, run, SEED } from './fight';
import { foundry, put } from './foundryKit';

// 028: the objectives are one ordered chain. The prototype's goals run first and end
// with heading back out; Milestone 1's follow; once every goal is done, the line shows
// the frontier goal, so it never goes blank after the shrine.

const AWAY = OBJECTIVES.findIndex((o) => o.check.kind === 'awayRunning');
const CLAIMED = OBJECTIVES.findIndex((o) => o.check.kind === 'claimed');
const M1 = OBJECTIVES.map((o, i) => [o, i] as const).filter(([o]) => o.milestone === 'm1');

describe('the chain', () => {
  it('runs the prototype goals, ending with heading back out, then the Milestone 1 goals', () => {
    expect(OBJECTIVES[AWAY]?.text).toBe('Head back out — the foundry keeps running');
    expect(OBJECTIVES.slice(0, AWAY + 1).every((o) => o.milestone === 'prototype')).toBe(true);
    expect(OBJECTIVES.slice(AWAY + 1).every((o) => o.milestone === 'm1')).toBe(true);
    expect(M1.map(([o]) => o.text)).toEqual([
      'Run a supply port into your line',
      'Put a second kind of ammo in another entrance',
      'Gather rimestone at the Frozen Grotto',
      'Craft frost arrows (C)',
      'Build a frost rune into your arrow line',
      'Craft homing or split ley bolts (C)',
      'Claim a second pylon',
      // 049.2: the Husk Hive's resin pylon, after the Warden.
      'Find the Husk Hive and claim its pylon',
      // 034: Region 2's steps.
      'Breach Stonefall Hollows',
      "Claim the Cistern Terrace's pylon",
      'Defeat the Bulwark',
      "Restore the intake's third entrance (E with the Bulwark core)",
      // 033: the third entrance needs the Bulwark's core, so this waits just before the frontier line.
      'Feed all three entrances',
    ]);
    expect(M1.map(([o]) => o.check)).toEqual([
      { kind: 'portDelivered' },
      { kind: 'mixedVolley' },
      { kind: 'gathered', items: ['rimestone'] },
      { kind: 'crafted', items: ['arrow+frost'] },
      { kind: 'machineMade', item: 'arrow+frost' },
      { kind: 'craftedAny', items: ['ley-bolt+homing', 'ley-bolt+split'] },
      { kind: 'claimedCount', min: 2 },
      { kind: 'claimed', site: 'husk-hive' },
      { kind: 'inRegion', region: 2 },
      { kind: 'claimed', site: 'cistern-terrace' },
      { kind: 'bossDefeated', boss: 'bulwark' },
      { kind: 'restored', node: 'entrance-3' },
      { kind: 'volley', min: 3 },
    ]);
    // 029: building the frost rune pulses its build-bar cell.
    expect(M1[4]?.[0].highlight).toBe('frost-rune');
    // The last goal before the frontier line, so the line never points at it before the other goals are done.
    expect(OBJECTIVES.at(-1)?.check).toEqual({ kind: 'volley', min: 3 });
  });

  it('the port goal points at the ports and pulses the conduit cell', () => {
    const [port] = M1[0] ?? [];
    expect(port?.target).toEqual({ kind: 'ports' });
    expect(port?.highlight).toBe('conduit');
  });

  it('the frontier goal is a standing line with no check', () => {
    expect(FRONTIER_GOAL).toEqual({ text: 'Explore beyond the shrine' });
  });
});

describe('the goals', () => {
  it('portDelivered completes once a piece takes an item from any port', () => {
    const s = foundry();
    const i = OBJECTIVES.findIndex((o) => o.check.kind === 'portDelivered');
    claim(s, SHRINE_SITE);
    run(s, SUPPLY_TICKS + 2);
    expect(s.objectives[i]).toBe(false);
    // The stone port at (1, 6) hands into (2, 6).
    put(s, 'crate', 2, 6);
    run(s, 1);
    expect(s.objectives[i]).toBe(true);
  });

  it('mixedVolley completes once the volley holds two different ammo', () => {
    const s = foundry();
    const i = OBJECTIVES.findIndex((o) => o.check.kind === 'mixedVolley');
    for (const e of s.link.entrances) e.open = true;
    Object.assign(s.link.entrances[0] ?? {}, { ammoId: 'arrow', count: 3 });
    Object.assign(s.link.entrances[2] ?? {}, { ammoId: 'arrow', count: 3 });
    run(s, 1);
    expect(s.objectives[i]).toBe(false);
    Object.assign(s.link.entrances[1] ?? {}, { ammoId: 'bomb', count: 1 });
    run(s, 1);
    expect(s.objectives[i]).toBe(true);
  });

  it('feeding all three entrances completes the volley goal for three', () => {
    const s = foundry();
    const i = OBJECTIVES.findIndex((o) => o.check.kind === 'volley' && o.check.min === 3);
    for (const e of s.link.entrances) e.open = true;
    for (const [k, e] of s.link.entrances.entries()) Object.assign(e, { ammoId: 'arrow', count: 1 + k });
    run(s, 1);
    expect(s.objectives[i]).toBe(true);
  });

  it('craftedAny (029) completes once either ley variant is hand-made', () => {
    const i = OBJECTIVES.findIndex((o) => o.check.kind === 'craftedAny');
    for (const item of ['ley-bolt+homing', 'ley-bolt+split']) {
      const s = foundry(false);
      run(s, 1);
      expect(s.objectives[i]).toBe(false);
      s.crafted.push(item);
      run(s, 1);
      expect(s.objectives[i]).toBe(true);
    }
  });

  it("the away clock runs only once every goal before it is done, whatever comes after", () => {
    const s = createSim(SEED, { start: PLAYTEST_START });
    s.roomId = FOUNDRY_ROOM;
    stepSim(s, command({ place: { pieceId: 'conduit', tx: 12, ty: 1, facing: 'up' } }));
    s.roomId = OVERWORLD_ROOM;
    // One goal before it still open: no clock, even with the Milestone 1 goals done.
    s.objectives = OBJECTIVES.map((_, i) => i !== AWAY - 1 && i !== AWAY);
    run(s, 10);
    expect(s.awayTicks).toBe(0);
    s.objectives = OBJECTIVES.map((_, i) => i < AWAY);
    run(s, 10);
    expect(s.awayTicks).toBe(10);
  });

  it('prototypeComplete comes with the prototype goals, and ignores Milestone 1', () => {
    const s = createSim(SEED, { start: PLAYTEST_START });
    s.objectives = OBJECTIVES.map((o) => o.milestone === 'm1');
    run(s, 1);
    expect(s.prototypeComplete).toBe(false);
    s.objectives = OBJECTIVES.map((o) => o.milestone === 'prototype');
    run(s, 1);
    expect(s.prototypeComplete).toBe(true);
    expect(s.objectives.filter((done, i) => !done && OBJECTIVES[i]?.milestone === 'm1').length).toBeGreaterThan(0);
  });
});

describe('the line after the shrine', () => {
  it('is never blank, whichever goals after the claim are done', () => {
    const after = OBJECTIVES.length - CLAIMED - 1;
    expect(after).toBeGreaterThan(0);
    // One sim, reused: the line only reads the done flags, and 034 grew the chain to
    // thousands of combinations, too many to build a world for each.
    const s = createSim(SEED);
    for (let mask = 0; mask < 1 << after; mask++) {
      s.objectives = OBJECTIVES.map((_, i) => i <= CLAIMED || ((mask >> (i - CLAIMED - 1)) & 1) === 1);
      const line = objectiveLine(s);
      expect(line.text.length, `mask ${mask}`).toBeGreaterThan(0);
      const first = currentObjective(s);
      expect(line.index).toBe(first);
      expect(line.text).toBe(first === null ? FRONTIER_GOAL.text : OBJECTIVES[first]?.text);
      // The full summary is costly; check it agrees on a spread of masks, ends included.
      if (mask % 97 === 0 || mask === (1 << after) - 1) expect(summarize(s).objective).toEqual(line);
    }
  });

  it('shows the frontier goal once every goal is done, with no index', () => {
    const s = createSim(SEED);
    s.objectives = OBJECTIVES.map(() => true);
    expect(summarize(s).objective).toEqual({ index: null, text: 'Explore beyond the shrine' });
  });
});

describe("Region 2's goals (034)", () => {
  const at = (text: string): number => OBJECTIVES.findIndex((o) => o.text === text);

  it('breach the Hollows once the player stands in Region 2, and defeat the Bulwark on its first kill', () => {
    const s = createSim(SEED, { start: HOLLOWS_START });
    run(s, 1);
    expect(s.objectives[at('Breach Stonefall Hollows')]).toBe(true);
    expect(s.objectives[at('Defeat the Bulwark')]).toBe(false);
    const b = s.enemies.find((e) => e.enemyId === 'bulwark');
    if (b) b.health = 0;
    run(s, 1);
    expect(s.objectives[at('Defeat the Bulwark')]).toBe(true);
  });
});
