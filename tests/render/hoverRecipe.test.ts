import { describe, expect, it } from 'vitest';
import { itemDef } from '../../src/data/items';
import { RECIPES, recipeDef } from '../../src/data/recipes';
import { INTAKE } from '../../src/data/foundry';
import { INTAKE_EMPTY_ICON } from '../../src/data/foundryAssets';
import { intakeLines, machineLines, READOUT_MAX_LINES } from '../../src/render/readoutLines';
import { statusRecipe } from '../../src/sim/flow';
import type { MachineState } from '../../src/sim/pieces';
import { run } from '../sim/fight';
import { foundry, put } from '../sim/foundryKit';

// 062: a machine's hover shows the recipe its status reads, so the hover and the status's missing inputs agree.

const icons = (ids: readonly string[]): string[] => ids.map((id) => itemDef(id).icon);

describe('a tier-aware machine’s hover and status (062)', () => {
  it('an assembler that last made steel arrows, holding stone arrowheads and rope but no shaft, shows the stone recipe in both', () => {
    const s = foundry();
    const m = put<MachineState>(s, 'assembler', 6, 5);
    Object.assign(m, { made: 'arrow+steel' });
    Object.assign(m.buffer, { arrowhead: 2, rope: 2 });
    run(s, 1);
    const stone = recipeDef('arrow');
    expect(statusRecipe(m)).toBe(stone);
    expect(m).toMatchObject({ status: 'starved', missing: ['shaft'] });
    const lines = machineLines(m);
    expect(lines.map((l) => l[0])).toEqual(icons([...Object.keys(stone.inputs), 'arrow']));
    expect(lines.map((l) => l[1])).toEqual(Object.keys(stone.inputs).map((id) => String(m.buffer[id] ?? 0)).concat('0'));
  });

  it('with its last kind’s output waiting, it shows the set it holds, and that output as its last line', () => {
    const s = foundry();
    const m = put<MachineState>(s, 'assembler', 6, 5);
    Object.assign(m, { made: 'arrow', output: 8 });
    Object.assign(m.buffer, { shaft: 1, 'steel-arrowhead': 1, rope: 1 });
    run(s, 1);
    expect(statusRecipe(m).output.itemId).toBe('arrow+steel');
    expect(m.status).toBe('blocked');
    expect(machineLines(m).slice(0, -1).map((l) => l[0])).toEqual(icons(Object.keys(statusRecipe(m).inputs)));
    expect(machineLines(m).at(-1)).toEqual([itemDef('arrow').icon, String(m.output)]);
  });
});

describe('the hover readout has a line for every intake entrance (fix-playtest-ui)', () => {
  it('fits all five of the intake\'s rows, and every recipe\'s inputs and output', () => {
    const s = foundry();
    const lines = intakeLines(s.link.entrances, 30);
    expect(lines).toHaveLength(INTAKE.entrances.length);
    expect(READOUT_MAX_LINES).toBeGreaterThanOrEqual(INTAKE.entrances.length);
    for (const r of Object.values(RECIPES)) expect(READOUT_MAX_LINES).toBeGreaterThanOrEqual(Object.keys(r.inputs).length + 1);
  });
});

describe('the intake’s rates on its hover (069)', () => {
  it('reads each open entrance’s fill, its measured rate in and its fire rate, from the sim', () => {
    const s = foundry();
    const middle = INTAKE.entrances.findIndex((e) => e.startsOpen);
    const e = s.link.entrances[middle];
    if (!e) throw new Error('no entrance');
    Object.assign(e, { ammoId: 'arrow', count: 12 });
    const rates = s.link.entrances.map((_x, i) => (i === middle ? { inPerSecond: 2.3, firesPerSecond: 4 } : { inPerSecond: 0, firesPerSecond: null }));
    const lines = intakeLines(s.link.entrances, 30, rates);
    expect(lines[middle]).toEqual([itemDef('arrow').icon, '12/30 · in 2.3/s · fires 4/s']);
    // A capped entrance still reads capped; an empty open one has no round to fire.
    expect(lines.filter((_l, i) => !s.link.entrances[i]?.open).every((l) => l[1] === 'capped')).toBe(true);
    // Emptied, the sim gives it no fire rate (src/sim/intakeRates.ts), and the line shows none.
    e.ammoId = null;
    e.count = 0;
    const dry = rates.map((r) => ({ ...r, firesPerSecond: null }));
    expect(intakeLines(s.link.entrances, 30, dry)[middle]).toEqual([INTAKE_EMPTY_ICON, '0/30 · in 2.3/s']);
  });

  it('rounds a rate to one decimal and drops a trailing .0', () => {
    const s = foundry();
    const middle = INTAKE.entrances.findIndex((e) => e.startsOpen);
    Object.assign(s.link.entrances[middle] ?? {}, { ammoId: 'arrow', count: 30 });
    const rates = s.link.entrances.map(() => ({ inPerSecond: 0.2 + 0.1, firesPerSecond: 2.0000001 }));
    expect(intakeLines(s.link.entrances, 30, rates)[middle]?.[1]).toBe('30/30 · in 0.3/s · fires 2/s');
  });
});
