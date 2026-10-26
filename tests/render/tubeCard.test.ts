import { describe, expect, it } from 'vitest';
import { DEFAULT_BINDINGS } from '../../src/data/settings';
import { HUD_LAYOUT } from '../../src/data/hudLayout';
import { tubeCardLabel, wideCardBox } from '../../src/render/tubeCard';
import { tubeSlotBox } from '../../src/render/bottomHud';

// 070: with the tube empty but carried rounds ready for right click, the big ammo card reads "Tube empty · RMB fires
// carried" instead of "Melee"; with nothing carried it still reads "Melee".

const RMB = DEFAULT_BINDINGS.use;
const linked = { hasTube: true, attuned: true, carriedReady: true };

describe('the empty tube card (070)', () => {
  it('reads that right click fires carried rounds when the tube is empty after attuning and a round is ready', () => {
    expect(tubeCardLabel({ kind: 'melee' }, linked, RMB)).toBe('Tube empty · RMB fires carried');
  });

  it('still reads "Melee" with nothing carried, with no tube, or before attuning', () => {
    expect(tubeCardLabel({ kind: 'melee' }, { ...linked, carriedReady: false }, RMB)).toBe(HUD_LAYOUT.tubeSlot.melee);
    expect(tubeCardLabel({ kind: 'melee' }, { ...linked, hasTube: false }, RMB)).toBe(HUD_LAYOUT.tubeSlot.melee);
    expect(tubeCardLabel({ kind: 'melee' }, { ...linked, attuned: false }, RMB)).toBe(HUD_LAYOUT.tubeSlot.melee);
  });

  it('has no label of its own for a volley or a carried round (their counts show)', () => {
    expect(tubeCardLabel({ kind: 'volley', rounds: [{ ammoId: 'arrow', count: 3, lane: 0 }] }, linked, RMB)).toBeNull();
    expect(tubeCardLabel({ kind: 'carried', ammoId: 'arrow', count: 3 }, linked, RMB)).toBeNull();
  });

  it('names a rebound use key instead of RMB', () => {
    expect(tubeCardLabel({ kind: 'melee' }, linked, 'Q')).toBe('Tube empty · Q fires carried');
    expect(tubeCardLabel({ kind: 'melee' }, linked, 'SPACE')).toBe('Tube empty · Space fires carried');
  });

  it('a label too wide for a unit widens the card, centred where the one-unit card sits, its label clear of the ring', () => {
    const one = tubeSlotBox(1);
    const wide = wideCardBox(120, false);
    const pad = HUD_LAYOUT.tubeSlot.wellInset + HUD_LAYOUT.tubeSlot.labelPad;
    expect(wide.w).toBe(120 + 2 * pad);
    expect(wide.y).toBe(one.y);
    expect(wide.h).toBe(one.h);
    expect(Math.abs(wide.x + wide.w / 2 - (one.x + one.w / 2))).toBeLessThanOrEqual(1);
    // A short label keeps the one-unit width.
    expect(wideCardBox(10, false).w).toBe(one.w);
  });
});
