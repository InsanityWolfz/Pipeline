import { describe, expect, it } from 'vitest';
import { TILE_SIZE } from '../../src/data/config';
import { HOVER_USE_REACH } from '../../src/data/foundry';
import { deposit, stillUsable, usableInReach, withdraw } from '../../src/sim/foundryUse';
import type { CrateState, HopperState } from '../../src/sim/pieces';
import type { SimState } from '../../src/sim/state';
import { tileCentre } from '../../src/sim/tiles';
import { movePlayer } from './fight';
import { foundry, put } from './foundryKit';

// 050 (A.9, Shaun): "if you're within 3 tiles of a hopper and your mouse is on it and you hit E, that's the one you
// should open." With nothing hovered in reach, E falls back to the nearest in reach, as before.

/** Stands the player on a tile and points the cursor at another tile's centre. */
function stand(s: SimState, at: { tx: number; ty: number }, aim: { tx: number; ty: number } | null): void {
  const p = tileCentre(at);
  movePlayer(s, p.x, p.y);
  if (aim) {
    const a = tileCentre(aim);
    s.player.aimX = a.x;
    s.player.aimY = a.y;
  }
}

describe('E on the hovered hopper or crate (050)', () => {
  it('reaches 3 tiles', () => {
    expect(HOVER_USE_REACH).toBe(3 * TILE_SIZE);
  });

  it('picks the hopper under the cursor over the one the player stands beside', () => {
    const s = foundry();
    const near = put<HopperState>(s, 'hopper', 10, 8);
    const hovered = put<HopperState>(s, 'hopper', 12, 8);
    stand(s, { tx: 10, ty: 9 }, null);
    expect(usableInReach(s)?.id).toBe(near.id);
    stand(s, { tx: 10, ty: 9 }, { tx: 12, ty: 8 });
    expect(usableInReach(s)?.id).toBe(hovered.id);
  });

  it('a crate under the cursor within 3 tiles, and not beyond', () => {
    const s = foundry();
    const crate = put<CrateState>(s, 'crate', 10, 4);
    // Standing three tiles below it (feet box to box, under 3 tiles): in reach; four below: not.
    stand(s, { tx: 10, ty: 7 }, { tx: 10, ty: 4 });
    expect(usableInReach(s)?.id).toBe(crate.id);
    stand(s, { tx: 10, ty: 8 }, { tx: 10, ty: 4 });
    expect(usableInReach(s)).toBeUndefined();
  });

  it('with the cursor on nothing usable, falls back to the nearest in reach', () => {
    const s = foundry();
    const near = put<HopperState>(s, 'hopper', 10, 8);
    put<HopperState>(s, 'hopper', 14, 8);
    stand(s, { tx: 10, ty: 9 }, { tx: 6, ty: 12 });
    expect(usableInReach(s)?.id).toBe(near.id);
  });

  it('deposits and withdraws reach the opened piece within 3 tiles, and its screen stays usable that far', () => {
    const s = foundry();
    const hopper = put<HopperState>(s, 'hopper', 10, 5);
    stand(s, { tx: 10, ty: 8 }, { tx: 10, ty: 5 });
    s.inventory = { wood: 10 };
    deposit(s, hopper.id, 'wood', 'all');
    expect(hopper.count).toBe(10);
    withdraw(s, hopper.id, 'one');
    expect(hopper.count).toBe(9);
    expect(stillUsable(s, hopper.id)).toBe(true);
    stand(s, { tx: 10, ty: 9 }, { tx: 10, ty: 5 });
    expect(stillUsable(s, hopper.id)).toBe(false);
    deposit(s, hopper.id, 'wood', 'all');
    expect(hopper.count).toBe(9);
  });
});
