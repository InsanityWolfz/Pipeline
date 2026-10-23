import { describe, expect, it } from 'vitest';
import { summarize } from '../../src/sim/summary';
import { hudActive, nextPress } from '../../src/sim/volley';
import type { SimState } from '../../src/sim/state';
import { hold, movePlayer, run, volleyAt } from './fight';
import { foundry, stepOutside } from './foundryKit';

// The bottom HUD's intake bar (025, 047): `hudActive` says what the next fire press (left
// click) does, from the same helper the fire path uses (`nextPress`), so the two never
// disagree: the volley, or the punch. Carried rounds are the carried bar's (right click).

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
  run(s, 1, volleyAt(600, 400));
}

describe('hudActive (025)', () => {
  it('never shows a carried round: with the entrances empty it shows melee, and the press punches (047)', () => {
    const s = meadow([null, null, null], { arrow: 12, bomb: 2 });
    hold(s, 'arrow');
    expect(hudActive(s)).toEqual({ kind: 'melee' });
    press(s);
    expect(s.events.melees).toHaveLength(1);
    expect(s.arrows).toHaveLength(0);
    expect(s.inventory.arrow).toBe(12);
  });

  it('shows the whole volley, west to east, each round with its entrance count, and that is what fires, even with the selected ammo carried (028)', () => {
    const s = meadow([['arrow', 12], ['arrow', 9], ['bomb', 4]], { arrow: 5, bomb: 2 });
    hold(s, 'arrow');
    expect(hudActive(s)).toEqual({
      kind: 'volley',
      rounds: [
        { ammoId: 'arrow', count: 12, lane: -15 },
        { ammoId: 'arrow', count: 9, lane: 0 },
        { ammoId: 'bomb', count: 4, lane: 15 },
      ],
    });
    press(s);
    expect(s.tube.fromReservoir).toBe(true);
    expect(s.tube.shotCount).toBe(3);
    expect(s.arrows).toHaveLength(2);
    expect(s.bombs).toHaveLength(1);
    expect(s.link.entrances.map((e) => e.count)).toEqual([11, 8, 3, 0]);
    expect(s.inventory).toEqual({ arrow: 5, bomb: 2 });
  });

  it('skips an empty entrance in the volley', () => {
    const s = meadow([['arrow', 2], null, ['bomb', 1]], {});
    expect(hudActive(s)).toEqual({ kind: 'volley', rounds: [{ ammoId: 'arrow', count: 2, lane: -7.5 }, { ammoId: 'bomb', count: 1, lane: 7.5 }] });
  });

  it('shows melee when nothing can fire, and the press punches', () => {
    const s = meadow([null, null, null], { bomb: 3 });
    hold(s, 'arrow');
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

  it('follows the fire path through volley and melee in turn (028, 047)', () => {
    const s = meadow([null, ['arrow', 1], null], { arrow: 1 });
    const seen: string[] = [];
    for (let i = 0; i < 2; i++) {
      const active = hudActive(s);
      expect(active.kind).toBe(nextPress(s).kind);
      seen.push(active.kind);
      press(s);
    }
    expect(seen).toEqual(['volley', 'melee']);
  });

  it('is reported by getState() as hud.active', () => {
    const s = meadow([['bomb', 4], null, null], {});
    expect(summarize(s).hud).toEqual({ active: { kind: 'volley', rounds: [{ ammoId: 'bomb', count: 4, lane: 0 }] } });
  });
});
