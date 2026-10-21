import { describe, expect, it } from 'vitest';
import { GEAR_SPRITES } from '../../src/data/gearAssets';
import { SPRING_LOOK } from '../../src/data/springAssets';
import { vectorFrames } from '../../src/render/vector/catalog';

// 050's data: the healing signs and the ward's shield.

describe('050', () => {
  it('field regen (Mending, gear) shows no healing motes; the springs, pylons and foundry still do (A.15)', () => {
    expect(SPRING_LOOK.motes.sources).not.toContain('regen');
    expect([...SPRING_LOOK.motes.sources].sort()).toEqual(['foundry', 'pylon', 'spring']);
  });

  it('the ward has a shield icon on the contact sheet (A.16)', () => {
    expect(vectorFrames().some((f) => f.name === GEAR_SPRITES.wardShield)).toBe(true);
  });
});
