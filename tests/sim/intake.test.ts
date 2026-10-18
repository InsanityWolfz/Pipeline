import { describe, expect, it } from 'vitest';
import { CONDUIT_TICKS, INTAKE } from '../../src/data/foundry';
import { BUILD_BAR, PIECES } from '../../src/data/pieces';
import { RESERVOIR_CAP } from '../../src/data/tube';
import { canPlace, unlockedPieces } from '../../src/sim/placement';
import { frontTile, sideTile, sortSide, type ConduitState, type HopperState, type SorterState, type StagerState } from '../../src/sim/pieces';
import { feedsIntake, intakeStreams } from '../../src/sim/spread';
import { summarize } from '../../src/sim/summary';
import { HALL, run } from './fight';
import { foundry, put } from './foundryKit';

// The foundry intake (019): a fixed pipe in the north wall whose three mouth
// tiles each take items from the floor tile south of them into the tube's one reservoir.

const [WEST, MIDDLE, EAST] = INTAKE.mouth;
if (!WEST || !MIDDLE || !EAST) throw new Error('the intake needs three mouth tiles');

/** A foundry with the tube attuned (unless told otherwise) and a conduit under a mouth tile, facing up into it, holding an item ready to hand over. */
function feeding(itemId = 'arrow', mouth: { tx: number; ty: number } = MIDDLE, attuned = true) {
  const s = foundry();
  s.link.attuned = attuned;
  const c = put<ConduitState>(s, 'conduit', mouth.tx, mouth.ty + 1, 'up');
  c.item = itemId;
  c.progress = CONDUIT_TICKS;
  // The foundry runs wherever the player is; outside, the tube can't attune by walking in.
  if (!attuned) s.roomId = HALL;
  return { s, c };
}

describe('the foundry intake', () => {
  it('is three wall tiles at the centre of the north wall, with buildable floor in front', () => {
    const s = foundry();
    expect(INTAKE.mouth.map((t) => t.ty)).toEqual([0, 0, 0]);
    expect(INTAKE.mouth.map((t) => t.tx)).toEqual([11, 12, 13]);
    for (const t of INTAKE.mouth) {
      expect(canPlace(s, 'conduit', t.tx, t.ty, 'up')).not.toBeNull();
      expect(canPlace(s, 'conduit', t.tx, t.ty + 1, 'up')).toBeNull();
    }
    expect(summarize(s).intake.mouth).toEqual(INTAKE.mouth.map((t) => ({ tx: t.tx, ty: t.ty })));
  });

  it('takes an item from the tile south of a mouth tile into the reservoir, and says which mouth', () => {
    for (const [i, mouth] of INTAKE.mouth.entries()) {
      const { s, c } = feeding('arrow', mouth);
      run(s, 1);
      expect(c.item).toBeNull();
      expect(s.link.reservoir).toEqual({ itemId: 'arrow', count: 1 });
      expect(s.events.refills).toEqual([{ mouth: i, itemId: 'arrow' }]);
    }
  });

  it('refuses everything before the tube attunes', () => {
    const { s, c } = feeding('arrow', MIDDLE, false);
    run(s, 5);
    expect(c.item).toBe('arrow');
    expect(s.link.reservoir.count).toBe(0);
  });

  it('takes only the reservoir ammo, and refuses when full so the line backs up', () => {
    for (const item of ['wood', 'shaft']) {
      const notAmmo = feeding(item);
      run(notAmmo.s, 1);
      expect(notAmmo.c.item).toBe(item);
    }
    const full = feeding('arrow');
    full.s.link.reservoir = { itemId: 'arrow', count: RESERVOIR_CAP };
    run(full.s, 5);
    expect(full.c.item).toBe('arrow');
    expect(full.s.link.reservoir.count).toBe(RESERVOIR_CAP);
    const other = feeding('ley-bolt');
    other.s.link.reservoir = { itemId: 'arrow', count: 3 };
    run(other.s, 1);
    expect(other.c.item).toBe('ley-bolt');
  });

  it('never takes from a hopper, which only feeds lines', () => {
    const s = foundry();
    s.link.attuned = true;
    const h = put<HopperState>(s, 'hopper', MIDDLE.tx, MIDDLE.ty + 1, 'up');
    h.item = 'arrow';
    h.count = 5;
    run(s, 60);
    expect(s.link.reservoir.count).toBe(0);
  });

  it('streams once per stager whose front is a mouth tile, nearest 0° first, then left before right: three at most', () => {
    const s = foundry();
    s.inventory['warden-core'] = 4;
    const angles = [30, -15, 0];
    for (const [i, mouth] of INTAKE.mouth.entries()) put<StagerState>(s, 'gravity-stager', mouth.tx, mouth.ty + 1, 'up').angle = angles[i] ?? 0;
    // A stager beside them, facing along the wall, isn't a stream.
    put<StagerState>(s, 'gravity-stager', EAST.tx + 1, EAST.ty + 1, 'left').angle = 15;
    expect(intakeStreams(s.foundry)).toEqual([0, -15, 30]);
    expect(summarize(s).intake.streams).toEqual([0, -15, 30]);
  });

  it('counts as fed for the objective by a line whose front, or a sorter whose side exit, is a mouth tile; never a hopper or crate', () => {
    for (const pieceId of ['hopper', 'crate']) {
      const s = foundry();
      put(s, pieceId, MIDDLE.tx, MIDDLE.ty + 1, 'up');
      expect(feedsIntake(s.foundry), pieceId).toBe(false);
    }
    const conduit = foundry();
    put(conduit, 'conduit', MIDDLE.tx, MIDDLE.ty + 1, 'up');
    expect(feedsIntake(conduit.foundry)).toBe(true);
    // Facing right, a sorter sorts out its right side: up, from a tile facing along the wall.
    const sorter = foundry();
    const sorted = put<SorterState>(sorter, 'sorter', MIDDLE.tx, MIDDLE.ty + 1, 'left');
    expect(frontTile(sorted)).not.toEqual(MIDDLE);
    expect(sideTile(sorted, sortSide(sorted))).toEqual({ tx: MIDDLE.tx, ty: MIDDLE.ty });
    expect(feedsIntake(sorter.foundry)).toBe(true);
  });

  it('replaces the tube socket: no socket piece, build bar entry or unlock', () => {
    expect(PIECES['tube-socket']).toBeUndefined();
    expect(BUILD_BAR).not.toContain('tube-socket');
    const s = foundry();
    s.link.attuned = true;
    expect(unlockedPieces(s)).not.toContain('tube-socket');
  });
});
