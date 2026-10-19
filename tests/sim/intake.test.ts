import { describe, expect, it } from 'vitest';
import { CONDUIT_TICKS, ENTRANCE_CAP, INTAKE } from '../../src/data/foundry';
import { BUILD_BAR, PIECES } from '../../src/data/pieces';
import { canPlace, unlockedPieces } from '../../src/sim/placement';
import { frontTile, sideTile, sortSide, type ConduitState, type HopperState, type SorterState } from '../../src/sim/pieces';
import { feedsIntake } from '../../src/sim/intake';
import { summarize } from '../../src/sim/summary';
import { HALL, run } from './fight';
import { foundry, put } from './foundryKit';

// The foundry intake (019): a fixed pipe in the north wall whose three mouth
// tiles each take items from the floor tile south of them, each into its own
// entrance's reservoir (024). The entrance rules themselves are in entrances.test.ts.

const [WEST, MIDDLE, EAST] = INTAKE.entrances;
if (!WEST || !MIDDLE || !EAST) throw new Error('the intake needs three entrances');

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
    expect(INTAKE.entrances.map((t) => t.ty)).toEqual([0, 0, 0]);
    expect(INTAKE.entrances.map((t) => t.tx)).toEqual([11, 12, 13]);
    for (const t of INTAKE.entrances) {
      expect(canPlace(s, 'conduit', t.tx, t.ty, 'up')).not.toBeNull();
      expect(canPlace(s, 'conduit', t.tx, t.ty + 1, 'up')).toBeNull();
    }
    expect(summarize(s).intake.entrances.map((e) => ({ tx: e.tx, ty: e.ty }))).toEqual(INTAKE.entrances.map((t) => ({ tx: t.tx, ty: t.ty })));
  });

  it('takes an item from the tile south of an open mouth tile into its entrance, and says which', () => {
    for (const [i, mouth] of INTAKE.entrances.entries()) {
      const { s, c } = feeding('arrow', mouth);
      for (const e of s.link.entrances) e.open = true;
      run(s, 1);
      expect(c.item).toBeNull();
      expect(s.link.entrances.map((e) => e.count)).toEqual([0, 1, 2].map((j) => (j === i ? 1 : 0)));
      expect(s.link.entrances[i]).toEqual({ open: true, ammoId: 'arrow', count: 1, cooldown: 0 });
      expect(s.events.refills).toEqual([{ entrance: i, itemId: 'arrow' }]);
    }
  });

  it('refuses everything before the tube attunes', () => {
    const { s, c } = feeding('arrow', MIDDLE, false);
    run(s, 5);
    expect(c.item).toBe('arrow');
    expect(s.link.entrances[1]?.count).toBe(0);
  });

  it('takes only its entrance ammo, and refuses when full so the line backs up', () => {
    for (const item of ['wood', 'shaft']) {
      const notAmmo = feeding(item);
      run(notAmmo.s, 1);
      expect(notAmmo.c.item).toBe(item);
    }
    const full = feeding('arrow');
    Object.assign(full.s.link.entrances[1] ?? {}, { ammoId: 'arrow', count: ENTRANCE_CAP });
    run(full.s, 5);
    expect(full.c.item).toBe('arrow');
    expect(full.s.link.entrances[1]?.count).toBe(ENTRANCE_CAP);
    const other = feeding('ley-bolt');
    Object.assign(other.s.link.entrances[1] ?? {}, { ammoId: 'arrow', count: 3 });
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
    expect(s.link.entrances[1]?.count).toBe(0);
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
