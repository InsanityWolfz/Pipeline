import { describe, expect, it } from 'vitest';
import { INTAKE } from '../../src/data/foundry';
import { interactTarget } from '../../src/sim/interactables';
import { entranceTakesE, purge, purgeable } from '../../src/sim/purge';
import { diagramInReach, diagrams } from '../../src/sim/research';
import type { SimState } from '../../src/sim/state';
import { tileCentre } from '../../src/sim/tiles';
import { HALL, movePlayer, run } from './fight';
import { foundry, put } from './foundryKit';

// 069: E at an intake entrance offers Purge, which moves that entrance's reservoir into the stash (or the inventory for
// what the stash can't take), so a new round kind can flow in. Its target is the entrance under the cursor, else the
// nearest one holding rounds, unless a restore diagram is nearer (033's capped entrances sit beside it).

const MIDDLE = INTAKE.entrances.findIndex((e) => e.startsOpen);
const mouth = INTAKE.entrances[MIDDLE] ?? { tx: 0, ty: 0 };

/** The foundry, the player on the floor below the open entrance with the cursor on its mouth, it holding `count` arrows. */
function atEntrance(count = 12): SimState {
  const s = foundry();
  const at = tileCentre({ tx: mouth.tx, ty: mouth.ty + 1 });
  movePlayer(s, at.x, at.y);
  const m = tileCentre(mouth);
  s.player.aimX = m.x;
  s.player.aimY = m.y;
  Object.assign(s.link.entrances[MIDDLE] ?? {}, { ammoId: 'arrow', count });
  return s;
}

describe('purging an intake entrance (069)', () => {
  it('E’s target at an open entrance holding rounds is the entrance, with none at an empty one', () => {
    const s = atEntrance();
    expect(entranceTakesE(s)).toBe(MIDDLE);
    expect(interactTarget(s)?.kind).toBe('entrance');
    Object.assign(s.link.entrances[MIDDLE] ?? {}, { ammoId: null, count: 0 });
    expect(entranceTakesE(s)).toBeNull();
    expect(interactTarget(s)?.kind).not.toBe('entrance');
  });

  it('moves the reservoir to the stash and empties the entrance, so another round kind flows in', () => {
    const s = atEntrance(12);
    s.stash = { wood: 3 };
    run(s, 1, { purge: MIDDLE });
    expect(s.link.entrances[MIDDLE]).toMatchObject({ ammoId: null, count: 0 });
    expect(s.stash).toEqual({ wood: 3, arrow: 12 });
    expect(s.events.purges).toEqual([{ entrance: MIDDLE, itemId: 'arrow', stash: 12, inventory: 0 }]);
  });

  it('sends what the stash can’t take to the inventory, and nothing at all if both are full', () => {
    const s = atEntrance(12);
    s.stash = { wood: 5 };
    s.inventory = {};
    expect(purge(s, MIDDLE, { stash: 10, inventory: 100 })).toBe(true);
    expect(s.stash).toEqual({ wood: 5, arrow: 5 });
    expect(s.inventory).toEqual({ arrow: 7 });
    const t = atEntrance(12);
    t.stash = { wood: 5 };
    t.inventory = { stone: 3 };
    expect(purge(t, MIDDLE, { stash: 10, inventory: 9 })).toBe(false);
    expect(t.link.entrances[MIDDLE]).toMatchObject({ ammoId: 'arrow', count: 12 });
    expect(t.stash).toEqual({ wood: 5 });
  });

  it('does nothing out of reach, outside the foundry, or at a capped or empty entrance', () => {
    const far = atEntrance();
    movePlayer(far, 20 * 32, 13 * 32);
    run(far, 1, { purge: MIDDLE });
    expect(far.link.entrances[MIDDLE]?.count).toBe(12);
    const out = atEntrance();
    out.roomId = HALL;
    run(out, 1, { purge: MIDDLE });
    expect(out.link.entrances[MIDDLE]?.count).toBe(12);
    const capped = atEntrance();
    const shut = INTAKE.entrances.findIndex((e) => !e.startsOpen);
    run(capped, 1, { purge: shut });
    expect(capped.events.purges).toEqual([]);
  });

  it('the entrance under the cursor wins; else the nearest restore diagram keeps E, as before', () => {
    const s = atEntrance();
    // The first reservoir's diagram is drawn on the open entrance's own tile (033): with the cursor off the mouth, E
    // still opens its restore panel.
    const d = diagrams(s).find((x) => x.node === 'reservoir-1');
    if (!d) throw new Error('no reservoir diagram');
    expect(Math.floor(d.rect.x / 32)).toBe(mouth.tx);
    s.player.aimY += 6 * 32;
    expect(entranceTakesE(s)).toBeNull();
    expect(interactTarget(s)?.kind).toBe('diagram');
    // It can still be purged from here: its open menu stays open as the cursor moves onto the menu.
    expect(purgeable(s, MIDDLE)).toBe(true);
    // With the cursor on the open entrance's mouth (or the pipe above it), it takes E.
    s.player.aimY = tileCentre(mouth).y - 20;
    expect(entranceTakesE(s)).toBe(MIDDLE);
    expect(interactTarget(s)?.kind).toBe('entrance');
    // With no diagram in reach, the nearest entrance holding rounds takes E wherever the cursor is.
    for (let i = 0; i < 20 && diagramInReach(s); i++) {
      const near = diagramInReach(s);
      if (near) s.research[near.node] = 'restored';
    }
    s.player.aimY += 6 * 32;
    expect(diagramInReach(s)).toBeUndefined();
    expect(entranceTakesE(s)).toBe(MIDDLE);
  });

  it('a hopper or crate under the cursor, or nearer than the entrance, keeps E (review)', () => {
    const s = atEntrance();
    clearDiagrams(s);
    // A hopper feeding the mouth from row 2, the cursor on it: E opens the hopper, not Purge.
    const h = put(s, 'hopper', mouth.tx, mouth.ty + 2, 'up');
    const at = tileCentre({ tx: mouth.tx, ty: mouth.ty + 2 });
    s.player.aimX = at.x;
    s.player.aimY = at.y;
    expect(entranceTakesE(s)).toBeNull();
    expect(interactTarget(s)?.kind).toBe('hopper');
    // The cursor elsewhere, a crate beside the player and nearer than the mouth keeps E too.
    s.foundry.pieces = s.foundry.pieces.filter((p) => p.id !== h.id);
    put(s, 'crate', mouth.tx + 1, mouth.ty + 1, 'up');
    movePlayer(s, tileCentre(mouth).x + 12, tileCentre({ tx: mouth.tx, ty: mouth.ty + 1 }).y);
    s.player.aimY += 6 * 32;
    expect(entranceTakesE(s)).toBeNull();
    expect(interactTarget(s)?.kind).toBe('crate');
    // With the cursor back on the mouth, the entrance wins again.
    s.player.aimX = tileCentre(mouth).x;
    s.player.aimY = tileCentre(mouth).y;
    expect(entranceTakesE(s)).toBe(MIDDLE);
  });
});

/** Marks every restore diagram in reach restored, so none sits nearer than the entrance. */
function clearDiagrams(s: SimState): void {
  for (let i = 0; i < 20 && diagramInReach(s); i++) {
    const near = diagramInReach(s);
    if (near) s.research[near.node] = 'restored';
  }
  expect(diagramInReach(s)).toBeUndefined();
}
