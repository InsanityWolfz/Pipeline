import { describe, expect, it } from 'vitest';
import { summarize } from '../../src/sim/summary';
import { hudActive, nextPress } from '../../src/sim/volley';
import type { SimState } from '../../src/sim/state';
import { fireAt, movePlayer, run } from './fight';
import { foundry, stepOutside } from './foundryKit';

// The bottom HUD's tube slot (025): `hudActive` says what the next fire press does,
// from the same helper the fire path uses (`nextPress`), so the two never disagree.

/** Out in the meadow with every entrance open and holding `rounds`, carrying `inventory`. */
function meadow(rounds: ([string, number] | null)[], inventory: Record<string, number>): SimState {
  const s = foundry();
  s.inventory = { ...inventory };
  s.link.entrances.forEach((e, i) => {
    e.open = true;
    const r = rounds[i] ?? null;
    Object.assign(e, r ? { ammoId: r[0], count: r[1] } : { ammoId: null, count: 0 });
  });
  stepOutside(s);
  movePlayer(s, 400, 400);
  return s;
}

/** One fire press toward the right, with the cooldowns run out first. */
function press(s: SimState): void {
  run(s, Math.max(s.tube.fireCooldown, s.tube.meleeCooldown));
  run(s, 1, fireAt(600, 400));
}

describe('hudActive (025)', () => {
  it('shows the carried round of the selected ammo with its carried count once the entrances are empty, and that is what fires', () => {
    const s = meadow([null, null, null], { arrow: 12, bomb: 2 });
    s.tube.ammoId = 'arrow';
    expect(hudActive(s)).toEqual({ kind: 'carried', ammoId: 'arrow', count: 12 });
    press(s);
    expect(s.tube.shotCount).toBe(1);
    expect(s.tube.fromReservoir).toBe(false);
    expect(s.arrows).toHaveLength(1);
    expect(s.inventory.arrow).toBe(11);
    expect(hudActive(s)).toEqual({ kind: 'carried', ammoId: 'arrow', count: 11 });
  });

  it('shows the whole volley, west to east, each round with its entrance count, and that is what fires, even with the selected ammo carried (028)', () => {
    const s = meadow([['arrow', 12], ['arrow', 9], ['bomb', 4]], { arrow: 5, bomb: 2 });
    s.tube.ammoId = 'arrow';
    expect(hudActive(s)).toEqual({
      kind: 'volley',
      rounds: [
        { ammoId: 'arrow', count: 12 },
        { ammoId: 'arrow', count: 9 },
        { ammoId: 'bomb', count: 4 },
      ],
    });
    press(s);
    expect(s.tube.fromReservoir).toBe(true);
    expect(s.tube.shotCount).toBe(3);
    expect(s.arrows).toHaveLength(2);
    expect(s.bombs).toHaveLength(1);
    expect(s.link.entrances.map((e) => e.count)).toEqual([11, 8, 3]);
    expect(s.inventory).toEqual({ arrow: 5, bomb: 2 });
  });

  it('skips an empty entrance in the volley', () => {
    const s = meadow([['arrow', 2], null, ['bomb', 1]], {});
    expect(hudActive(s)).toEqual({ kind: 'volley', rounds: [{ ammoId: 'arrow', count: 2 }, { ammoId: 'bomb', count: 1 }] });
  });

  it('shows melee when nothing can fire, and the press punches', () => {
    const s = meadow([null, null, null], { bomb: 3 });
    s.tube.ammoId = 'arrow';
    expect(hudActive(s)).toEqual({ kind: 'melee' });
    press(s);
    expect(s.events.melees).toHaveLength(1);
    expect(s.arrows).toHaveLength(0);
    expect(s.bombs).toHaveLength(0);
  });

  it('shows melee before the tube is taken, whatever is carried or fed', () => {
    const s = meadow([['arrow', 5], null, null], { arrow: 30 });
    s.hasTube = false;
    expect(hudActive(s)).toEqual({ kind: 'melee' });
    press(s);
    expect(s.events.melees).toHaveLength(1);
    expect(s.inventory.arrow).toBe(30);
  });

  it('follows the fire path through volley, carried and melee in turn (028)', () => {
    const s = meadow([null, ['arrow', 1], null], { arrow: 1 });
    const seen: string[] = [];
    for (let i = 0; i < 3; i++) {
      const active = hudActive(s);
      expect(active.kind).toBe(nextPress(s).kind);
      seen.push(active.kind);
      press(s);
    }
    expect(seen).toEqual(['volley', 'carried', 'melee']);
  });

  it('is reported by getState() as hud.active', () => {
    const s = meadow([['bomb', 4], null, null], {});
    expect(summarize(s).hud).toEqual({ active: { kind: 'volley', rounds: [{ ammoId: 'bomb', count: 4 }] } });
  });
});
