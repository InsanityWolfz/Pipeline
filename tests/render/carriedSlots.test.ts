import { describe, expect, it } from 'vitest';
import { CARRIED_EMPTY } from '../../src/data/hudLayout';
import { itemDef } from '../../src/data/items';
import { carriedSlotLook } from '../../src/render/carriedSlot';

// 070: an emptied carried-bar slot keeps its round's icon, greyed, with "0", until another round takes the slot.

describe('carried bar slots (070)', () => {
  it('a slot whose round has none carried shows its icon greyed, with "0"', () => {
    expect(carriedSlotLook('arrow', 0)).toEqual({ icon: itemDef('arrow').icon, count: '0', alpha: CARRIED_EMPTY.alpha, greyed: true });
  });

  it('a carried round shows its icon and count, not greyed', () => {
    expect(carriedSlotLook('bomb', 7)).toEqual({ icon: itemDef('bomb').icon, count: '7', alpha: 1, greyed: false });
  });

  it('a slot with no round shows nothing', () => {
    expect(carriedSlotLook(null, 0)).toEqual({ icon: null, count: null, alpha: 1, greyed: false });
  });

  it('the grey is faint but visible', () => {
    expect(CARRIED_EMPTY.alpha).toBeGreaterThan(0.15);
    expect(CARRIED_EMPTY.alpha).toBeLessThan(0.7);
  });
});
