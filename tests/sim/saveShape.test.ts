import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SAVE_VERSION } from '../../src/data/save';
import { TUTORIAL_START } from '../../src/data/player';
import { createSim } from '../../src/sim/state';
import { snapshot } from '../../src/sim/save';
import { saveShape } from '../../src/sim/saveShape';
import { lateGame } from './saveRun';
import FIXED from './saveShape.json';

// 042.7: the save's key paths and value types, from a fresh and a late-game state, are fixed per SAVE_VERSION.
// When SimState's shape changes, this fails until SAVE_VERSION is bumped (with a migration for a rename or a
// reshape) and the fixture regenerated: `UPDATE_SAVE_SHAPE=1 npx vitest run tests/sim/saveShape.test.ts`.

const FIXTURE = new URL('./saveShape.json', import.meta.url);

function currentShape(): string[] {
  return [...new Set([...saveShape(snapshot(createSim(1, { start: TUTORIAL_START }))), ...saveShape(snapshot(lateGame()))])].sort();
}

describe('save shape fingerprint (042.7)', () => {
  it('matches the fixed shape for this SAVE_VERSION', () => {
    const shape = currentShape();
    if (process.env.UPDATE_SAVE_SHAPE) writeFileSync(FIXTURE, `${JSON.stringify({ version: SAVE_VERSION, shape }, null, 2)}\n`);
    const fixed = process.env.UPDATE_SAVE_SHAPE ? { version: SAVE_VERSION, shape } : FIXED;
    if (fixed.version !== SAVE_VERSION) throw new Error(`SAVE_VERSION is ${SAVE_VERSION} but the fixed shape is version ${fixed.version}: regenerate it (UPDATE_SAVE_SHAPE=1).`);
    const added = shape.filter((p) => !fixed.shape.includes(p));
    const removed = fixed.shape.filter((p) => !shape.includes(p));
    expect(
      { added, removed },
      "The save's shape changed. Bump SAVE_VERSION in src/data/save.ts, add a migration to SAVE_MIGRATIONS (src/sim/save.ts) if a field was renamed or reshaped (added fields are filled from a fresh sim), then regenerate the fixture with UPDATE_SAVE_SHAPE=1.",
    ).toEqual({ added: [], removed: [] });
  });
});
