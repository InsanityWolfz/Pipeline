import { describe, expect, it } from 'vitest';
import { CONDUIT_TICKS } from '../../src/data/foundry';
import { STAGES } from '../../src/data/stages';
import { fixtureDef } from '../../src/sim/fixtures';
import { offerFromOutside } from '../../src/sim/flow';
import type { ConduitState, CrateState, HopperState, MachineState } from '../../src/sim/pieces';
import { unlockedPieces } from '../../src/sim/placement';
import { applyStage, stagesKnown } from '../../src/sim/stages';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import type { SimState } from '../../src/sim/state';
import { movePlayer, run } from './fight';
import { foundry, put } from './foundryKit';

// Stage machines (029): a stage takes finished rounds of its base plus a little
// material and hands them out of its front with its tag added. Each is hand-applied
// once at the bench before it can be built.

const FROST = STAGES['frost-rune'];
if (!FROST) throw new Error('no frost rune');

/** Offers one item to the piece at (tx, ty) from the tile (fx, fy). */
const offer = (s: SimState, tx: number, ty: number, fx: number, fy: number, item: string): boolean =>
  offerFromOutside(s.foundry, { tx, ty }, { tx: fx, ty: fy }, item);

describe('a stage machine', () => {
  it('makes 4 frost arrows from 4 arrows and 1 rime shard in 60 ticks, out of its front', () => {
    const s = foundry();
    const m = put<MachineState>(s, 'frost-rune', 6, 5, 'right');
    const crate = put<CrateState>(s, 'crate', 7, 5, 'right');
    m.buffer = { arrow: 4, 'rime-shard': 1 };
    run(s, 1);
    expect(m.crafting).toBe(true);
    expect(m.status).toBe('working');
    const made: { itemId: string; count: number }[] = [];
    let ticks = 0;
    while (made.length === 0 && ticks < 100) {
      run(s, 1);
      ticks += 1;
      made.push(...s.events.made.map(({ itemId, count }) => ({ itemId, count })));
    }
    expect(ticks).toBe(FROST.craftTicks);
    expect(made).toEqual([{ itemId: 'arrow+frost', count: 4 }]);
    run(s, 4);
    expect(crate.contents).toEqual({ 'arrow+frost': 4 });
    expect(s.machineMade['arrow+frost']).toBe(4);
    expect(m.buffer).toEqual({ arrow: 0, 'rime-shard': 0 });
  });

  it('takes rounds and rime from any side but its front, and refuses ley bolts and frost arrows', () => {
    const s = foundry();
    put<MachineState>(s, 'frost-rune', 6, 5, 'right');
    expect(offer(s, 6, 5, 7, 5, 'arrow')).toBe(false);
    expect(offer(s, 6, 5, 5, 5, 'ley-bolt')).toBe(false);
    expect(offer(s, 6, 5, 5, 5, 'arrow+frost')).toBe(false);
    expect(offer(s, 6, 5, 5, 5, 'wood')).toBe(false);
    expect(offer(s, 6, 5, 5, 5, 'arrow')).toBe(true);
    expect(offer(s, 6, 5, 6, 4, 'rime-shard')).toBe(true);
    expect(offer(s, 6, 5, 6, 6, 'arrow')).toBe(true);
  });

  it('caps its buffers like a machine', () => {
    const s = foundry();
    const m = put<MachineState>(s, 'frost-rune', 6, 5, 'right');
    for (let i = 0; i < 4; i++) expect(offer(s, 6, 5, 5, 5, 'arrow')).toBe(true);
    expect(offer(s, 6, 5, 5, 5, 'arrow')).toBe(false);
    expect(m.buffer.arrow).toBe(4);
  });

  it('starves without rime, and backs up the line when blocked', () => {
    const s = foundry();
    const m = put<MachineState>(s, 'frost-rune', 6, 5, 'right');
    m.buffer = { arrow: 4 };
    run(s, 1);
    expect(m.status).toBe('starved');
    expect(m.missing).toEqual(['rime-shard']);
    // Nothing takes its output: one batch fills it, and the next arrows wait on the conduit behind.
    m.buffer = { arrow: 4, 'rime-shard': 2 };
    const c = put<ConduitState>(s, 'conduit', 5, 5, 'right');
    run(s, FROST.craftTicks + 2);
    expect(m.output).toBe(4);
    m.buffer = { arrow: 4, 'rime-shard': 1 };
    c.item = 'arrow';
    c.progress = CONDUIT_TICKS;
    run(s, 5);
    expect(m.status).toBe('blocked');
    expect(c.item).toBe('arrow');
  });

  it('a shape stage refuses a round that already has a shape: the ley guide refuses star bolts, the lens homing ones', () => {
    const s = foundry();
    put<MachineState>(s, 'ley-guide', 6, 5, 'right');
    put<MachineState>(s, 'shatter-lens', 6, 8, 'right');
    expect(offer(s, 6, 5, 5, 5, 'ley-bolt+star')).toBe(false);
    expect(offer(s, 6, 5, 5, 5, 'ley-bolt+homing')).toBe(false);
    expect(offer(s, 6, 5, 5, 5, 'ley-bolt')).toBe(true);
    expect(offer(s, 6, 5, 5, 5, 'ley-crystal')).toBe(true);
    expect(offer(s, 6, 8, 5, 8, 'ley-bolt+homing')).toBe(false);
    expect(offer(s, 6, 8, 5, 8, 'ley-bolt')).toBe(true);
  });

  it('is fed by hoppers, and its summary shows its status and what its output holds', () => {
    const s = foundry();
    const arrows = put<HopperState>(s, 'hopper', 5, 5, 'right');
    Object.assign(arrows, { item: 'arrow', count: 8 });
    const rime = put<HopperState>(s, 'hopper', 6, 4, 'down');
    Object.assign(rime, { item: 'rime-shard', count: 2 });
    put<MachineState>(s, 'frost-rune', 6, 5, 'right');
    put<CrateState>(s, 'crate', 7, 5, 'right');
    run(s, 300);
    expect(s.machineMade['arrow+frost']).toBe(8);
    const piece = summarize(s).foundry.pieces.find((p) => p.pieceId === 'frost-rune');
    expect(piece).toMatchObject({ kind: 'machine', status: 'idle', made: 'arrow+frost' });
  });
});

/** The foundry with the player beside the identification bench. */
function atBench(): SimState {
  const s = foundry(false);
  const bench = fixtureDef('identification-bench');
  const at = tileCentre({ tx: bench.tx + 1, ty: bench.ty });
  movePlayer(s, at.x, at.y);
  s.inventory = { arrow: 9, 'rime-shard': 3, 'ley-bolt': 4, 'ley-crystal': 2 };
  return s;
}

describe('hand-applying a stage at the bench', () => {
  it('is unknown before the shrine claim', () => {
    const s = atBench();
    expect(stagesKnown(s)).toBe(false);
    expect(applyStage(s, 'frost-rune')).toBe(false);
    expect(s.inventory).toMatchObject({ arrow: 9, 'rime-shard': 3 });
  });

  it('takes the inputs and gives the tagged rounds, which unlocks the stage in the build bar', () => {
    const s = atBench();
    s.claims.push('shrine');
    expect(stagesKnown(s)).toBe(true);
    expect(unlockedPieces(s)).not.toContain('frost-rune');
    expect(applyStage(s, 'frost-rune')).toBe(true);
    expect(s.inventory).toMatchObject({ arrow: 5, 'rime-shard': 2, 'arrow+frost': 4 });
    expect(s.crafted).toContain('arrow+frost');
    expect(unlockedPieces(s)).toContain('frost-rune');
    expect(unlockedPieces(s)).not.toContain('ley-guide');
    expect(summarize(s).stagesUnlocked).toEqual(['frost-rune']);
  });

  it('works any number of times, until the inputs run short', () => {
    const s = atBench();
    s.claims.push('shrine');
    expect(applyStage(s, 'frost-rune')).toBe(true);
    expect(applyStage(s, 'frost-rune')).toBe(true);
    expect(applyStage(s, 'frost-rune')).toBe(false);
    expect(s.inventory).toMatchObject({ arrow: 1, 'rime-shard': 1, 'arrow+frost': 8 });
  });

  it('needs the bench in reach', () => {
    const s = atBench();
    s.claims.push('shrine');
    movePlayer(s, s.player.x + 200, s.player.y);
    expect(applyStage(s, 'frost-rune')).toBe(false);
  });

  it('comes as a command from the bench menu', () => {
    const s = atBench();
    s.claims.push('shrine');
    run(s, 1, { applyStage: 'shatter-lens' });
    expect(s.inventory).toMatchObject({ 'ley-bolt': 0, 'ley-crystal': 0, 'ley-bolt+star': 4 });
    expect(unlockedPieces(s)).toContain('shatter-lens');
  });
});
