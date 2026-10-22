import { describe, expect, it } from 'vitest';
import { FIXTURES } from '../../src/data/claims';
import { EXAMPLE_LINE } from '../../src/data/exampleLine';
import { GROTTO_GROUP } from '../../src/data/grotto';
import { GUIDED_BUILDS, type Ghost } from '../../src/data/guidedBuilds';
import { INTAKE } from '../../src/data/foundry';
import { OBJECTIVES } from '../../src/data/objectives';
import { TUTORIAL_START } from '../../src/data/player';
import { FOUNDRY_ROOM, TILE } from '../../src/data/rooms';
import { claim } from '../../src/sim/claims';
import { placeExampleLine } from '../../src/sim/exampleLine';
import { nextGhost } from '../../src/sim/guided';
import { footprint } from '../../src/sim/pieces';
import { createSim, roomById, type SimState } from '../../src/sim/state';
import { tileCentre } from '../../src/sim/tiles';
import { movePlayer, run } from './fight';

// 058.5: the two guided builds' ghost layouts (src/data/guidedBuilds.ts): clear of everything fixed, and each one,
// built in order, works.

const key = (t: { tx: number; ty: number }): string => `${t.tx},${t.ty}`;
const LEY = OBJECTIVES.findIndex((o) => o.guided === 'ley-line');
const FROST = OBJECTIVES.findIndex((o) => o.guided === 'frost-line');

const placed = (id: 'ley-line' | 'frost-line'): Extract<Ghost, { kind: 'place' }>[] => GUIDED_BUILDS[id].flatMap((g) => (g.kind === 'place' ? [g] : []));

describe('the ghost layouts', () => {
  it('stand on floor, clear of the example line, the fixtures and each other', () => {
    const room = roomById(FOUNDRY_ROOM);
    const taken = new Set(EXAMPLE_LINE.flatMap((p) => footprint(p.pieceId, p.tx, p.ty, p.facing).map(key)));
    // The frost rune takes the removed conduit's tile.
    taken.delete('12,2');
    const fixtures = new Set(FIXTURES.map(key));
    const seen = new Set<string>();
    for (const g of [...placed('ley-line'), ...placed('frost-line')]) {
      for (const t of footprint(g.piece, g.tx, g.ty, g.facing)) {
        expect(room.rows[t.ty]?.[t.tx], key(t)).toBe(TILE.floor);
        expect(taken.has(key(t)), key(t)).toBe(false);
        expect(fixtures.has(key(t)), key(t)).toBe(false);
        expect(seen.has(key(t)), key(t)).toBe(false);
        seen.add(key(t));
      }
    }
  });

  it('use no tile a port feeds but their own first one', () => {
    const fed = new Set(FIXTURES.filter((f) => f.kind === 'port').map((f) => key({ tx: f.tx + 1, ty: f.ty })));
    const used = [...placed('ley-line'), ...placed('frost-line')].map(key).filter((k) => fed.has(k));
    expect(used.sort()).toEqual(['2,10', '2,12']);
  });
});

/** A new game in the foundry at `goal`, the example line laid and the ports up. */
function foundryAt(goal: number): SimState {
  const s = createSim(3, { start: TUTORIAL_START });
  s.objectives = OBJECTIVES.map((o, i) => i < goal && !o.cutIn);
  s.roomId = FOUNDRY_ROOM;
  const p = tileCentre({ tx: 20, ty: 13 });
  movePlayer(s, p.x, p.y);
  s.link.attuned = true;
  s.hasTube = true;
  s.crafted = ['arrow', 'ley-dust', 'ley-bolt', 'bomb', 'arrow+frost'];
  placeExampleLine(s);
  claim(s, 'shrine');
  return s;
}

/** Builds the current guided step's ghosts in order through commands, as the player would. */
function buildAll(s: SimState): void {
  for (let i = 0; i < 60; i++) {
    const g = nextGhost(s)?.ghost;
    if (!g) return;
    if (g.kind === 'remove') run(s, 1, { pickUp: { tx: g.tx, ty: g.ty } });
    else run(s, 1, { place: { pieceId: g.piece, tx: g.tx, ty: g.ty, facing: g.facing } });
    expect(s.events.placeFails, JSON.stringify(g)).toEqual([]);
  }
}

describe('the guided builds work', () => {
  it('the ley line puts ley bolts into the right entrance', () => {
    const s = foundryAt(LEY);
    s.research['entrance-2'] = 'restored';
    const right = s.link.entrances[2];
    if (!right) throw new Error('no right entrance');
    right.open = true;
    right.node = 'entrance-2';
    buildAll(s);
    expect(nextGhost(s)).toBeNull();
    for (let t = 0; t < 20000 && !s.objectives[LEY]; t++) run(s, 1);
    expect(s.objectives[LEY]).toBe(true);
    expect(s.link.entrances[2]?.ammoId).toBe('ley-bolt');
    expect(INTAKE.entrances[2]).toMatchObject({ tx: 13, ty: 0 });
  });

  it('the frost line, under the ley line, makes frost arrows', () => {
    const s = foundryAt(LEY);
    s.research['entrance-2'] = 'restored';
    Object.assign(s.link.entrances[2] ?? {}, { open: true, node: 'entrance-2' });
    buildAll(s);
    s.objectives = OBJECTIVES.map((o, i) => i < FROST && !o.cutIn);
    claim(s, GROTTO_GROUP);
    buildAll(s);
    expect(nextGhost(s)).toBeNull();
    const pair = s.foundry.pieces.find((p) => p.kind === 'tunnel-in');
    expect(pair?.kind === 'tunnel-in' && pair.pair).not.toBeNull();
    for (const h of s.foundry.pieces) if (h.kind === 'hopper') h.count = 40;
    for (let t = 0; t < 20000 && !s.objectives[FROST]; t++) run(s, 1);
    expect(s.objectives[FROST]).toBe(true);
    // Building opens fully the same tick.
    run(s, 1, { place: { pieceId: 'conduit', tx: 18, ty: 12, facing: 'up' } });
    expect(s.events.places).toHaveLength(1);
  });
});
