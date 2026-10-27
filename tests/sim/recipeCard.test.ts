import { describe, expect, it } from 'vitest';
import { TICK_RATE } from '../../src/data/config';
import { MACHINE_SPEED_MULT } from '../../src/data/research';
import { machineCard, pieceCard } from '../../src/sim/recipeCard';
import type { MachineState } from '../../src/sim/pieces';
import { machineSpeed } from '../../src/sim/research';
import { summarize } from '../../src/sim/summary';
import { run } from './fight';
import { foundry, put } from './foundryKit';

// 069: a machine's recipe card, from the sim (render only words it): what it takes, what it makes, its craft time with
// machine-speed applied, and the items it makes a minute while it runs. A tiered machine's card is the variant it's
// running now; a stage on the bar shows its plain recipe, a placed one the round it's working on.

describe('a recipe card (069)', () => {
  it('a cutter: 1 wood → 2 shafts in 1.0 s, 120 a minute', () => {
    expect(pieceCard('cutter', 1)).toEqual({ inputs: [{ itemId: 'wood', count: 1 }], output: { itemId: 'shaft', count: 2 }, seconds: 1, perMinute: 120 });
  });

  it('machine-speed shortens the craft and raises the minute’s count', () => {
    const fast = pieceCard('cutter', MACHINE_SPEED_MULT);
    const ticks = Math.ceil(60 * MACHINE_SPEED_MULT);
    expect(fast?.seconds).toBe(ticks / TICK_RATE);
    expect(fast?.perMinute).toBe((2 * 60 * TICK_RATE) / ticks);
    // An assembler's 90 ticks × 0.75 round up to 68.
    expect(pieceCard('assembler', MACHINE_SPEED_MULT)?.seconds).toBe(68 / TICK_RATE);
  });

  it('a tiered machine shows the variant it’s running now', () => {
    const s = foundry();
    const m = put<MachineState>(s, 'knapper', 4, 4);
    m.buffer = { 'ley-steel': 1 };
    run(s, 1);
    expect(m.crafting).toBe(true);
    expect(machineCard(m, 1)).toMatchObject({ inputs: [{ itemId: 'ley-steel', count: 1 }], output: { itemId: 'steel-arrowhead', count: 2 }, running: true });
  });

  it('a stage on the bar shows its plain recipe; placed on bombs, the bomb one', () => {
    expect(pieceCard('frost-rune', 1)).toMatchObject({ inputs: [{ itemId: 'arrow', count: 4 }, { itemId: 'rimestone', count: 1 }], output: { itemId: 'arrow+frost', count: 4 } });
    const s = foundry();
    const m = put<MachineState>(s, 'frost-rune', 4, 4);
    m.made = 'bomb+frost';
    expect(machineCard(m, 1)).toMatchObject({ inputs: [{ itemId: 'bomb', count: 4 }, { itemId: 'rimestone', count: 1 }], output: { itemId: 'bomb+frost', count: 4 }, running: false });
  });

  it('a piece that isn’t a machine has none', () => {
    expect(pieceCard('conduit', 1)).toBeNull();
  });

  it('is in getState with each machine, at the restored speed', () => {
    const s = foundry();
    const m = put<MachineState>(s, 'cutter', 4, 4);
    s.research['machine-speed'] = 'restored';
    expect(machineSpeed(s)).toBe(MACHINE_SPEED_MULT);
    const row = summarize(s).foundry.pieces.find((p) => p.id === m.id);
    expect(row?.kind === 'machine' ? row.card : null).toEqual(machineCard(m, MACHINE_SPEED_MULT));
  });
});
