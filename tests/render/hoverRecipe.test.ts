import { describe, expect, it } from 'vitest';
import { itemDef } from '../../src/data/items';
import { recipeDef } from '../../src/data/recipes';
import { machineLines } from '../../src/render/readoutLines';
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
