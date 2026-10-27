import { describe, expect, it } from 'vitest';
import { MACHINE_SPEED_MULT } from '../../src/data/research';
import { describePiece, describeStage } from '../../src/render/describe';
import { nameAt } from '../../src/render/hoverNames';
import { cardText, machineCardText } from '../../src/render/recipeText';
import { texts } from '../../src/render/tipTypes';
import type { MachineState } from '../../src/sim/pieces';
import { machineCard, pieceCard } from '../../src/sim/recipeCard';
import { createSim } from '../../src/sim/state';
import { run } from '../sim/fight';
import { foundry, put } from '../sim/foundryKit';

// 069: a recipe card's words. The numbers are the sim's (src/sim/recipeCard.ts); render only words them: "1 wood → 2
// shafts · 1.0 s", and a running machine adds what it makes a minute.

const card = (pieceId: string, speed = 1) => {
  const c = pieceCard(pieceId, speed);
  if (!c) throw new Error(`${pieceId} has no card`);
  return c;
};

describe('a recipe card’s words (069)', () => {
  it('reads as the spec’s example, raw materials uncounted and parts plural', () => {
    expect(cardText(card('cutter'))).toBe('1 wood → 2 shafts · 1.0 s');
    expect(cardText(card('assembler'))).toBe('1 shaft + 1 arrowhead + 1 rope → 8 arrows · 1.5 s');
    expect(cardText(card('grinder'))).toBe('1 ley crystal → 2 ley dust · 1.0 s');
    expect(cardText(card('frost-rune'))).toBe('4 arrows + 1 rimestone → 4 frost arrows · 1.0 s');
  });

  it('shows machine-speed’s shorter craft', () => {
    expect(cardText(card('cutter', MACHINE_SPEED_MULT))).toBe('1 wood → 2 shafts · 0.8 s');
  });

  it('a running machine adds its items a minute; an idle one doesn’t', () => {
    const s = foundry();
    const m = put<MachineState>(s, 'cutter', 4, 4);
    expect(machineCardText(machineCard(m, 1))).toBe('1 wood → 2 shafts · 1.0 s');
    m.buffer = { wood: 2 };
    run(s, 1);
    expect(m.status).toBe('working');
    expect(machineCardText(machineCard(m, 1))).toBe('1 wood → 2 shafts · 1.0 s · 120 shafts/min');
  });

  it('is a placed machine’s hover line under its name', () => {
    const s = foundry();
    const m = put<MachineState>(s, 'cutter', 4, 4);
    const hit = nameAt(s, 'foundry', 4.5 * 32, 4.5 * 32);
    expect(hit?.pieceId).toBe(m.id);
    expect(hit?.description).toBe('1 wood → 2 shafts · 1.0 s');
  });

  it('leads a build-bar machine’s and stage’s hover, at the speed now', () => {
    const s = createSim(1);
    expect(texts(describePiece('cutter').summary)[0]).toBe('1 wood → 2 shafts · 1.0 s');
    expect(texts(describePiece('cutter', MACHINE_SPEED_MULT).summary)[0]).toBe('1 wood → 2 shafts · 0.8 s');
    expect(texts(describeStage(s, 'frost-rune').summary)[0]).toBe('4 arrows + 1 rimestone → 4 frost arrows · 1.0 s');
    // A piece that makes nothing has no card.
    expect(texts(describePiece('splitter').summary)).toEqual(['Sends items out its front and side in turn. G flips the side.']);
  });
});
