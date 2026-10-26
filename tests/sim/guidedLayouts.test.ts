import { describe, expect, it } from 'vitest';
import { FIXTURES } from '../../src/data/claims';
import { GROTTO_GROUP } from '../../src/data/grotto';
import { GUIDED_BUILDS, LOCK_UNTIL, type Ghost, type GuidedId } from '../../src/data/guidedBuilds';
import { INTAKE } from '../../src/data/foundry';
import { OBJECTIVES } from '../../src/data/objectives';
import { TUTORIAL_START } from '../../src/data/player';
import { FOUNDRY_ROOM, TILE } from '../../src/data/rooms';
import { claim } from '../../src/sim/claims';
import { buildLocked, nextGhost } from '../../src/sim/guided';
import { footprint } from '../../src/sim/pieces';
import { createSim, roomById, type SimState } from '../../src/sim/state';
import { tileCentre } from '../../src/sim/tiles';
import { movePlayer, run } from './fight';

// 058.5, 067: the three guided builds' ghost layouts (src/data/guidedBuilds.ts): clear of everything fixed and of each
// other, and each one, built in order after the ones before it, works. 067's arrow line comes first, from the ports.

const key = (t: { tx: number; ty: number }): string => `${t.tx},${t.ty}`;
const ARROW = OBJECTIVES.findIndex((o) => o.guided === 'arrow-line');
const LEY = OBJECTIVES.findIndex((o) => o.guided === 'ley-line');
const FROST = OBJECTIVES.findIndex((o) => o.guided === 'frost-line');

const placed = (id: GuidedId): Extract<Ghost, { kind: 'place' }>[] => GUIDED_BUILDS[id].flatMap((g) => (g.kind === 'place' ? [g] : []));

describe('the ghost layouts', () => {
  it('stand on floor, clear of the fixtures and each other (the frost rune on the conduit it replaces)', () => {
    const room = roomById(FOUNDRY_ROOM);
    const fixtures = new Set(FIXTURES.map(key));
    const seen = new Set<string>();
    for (const id of ['arrow-line', 'ley-line', 'frost-line'] as const) {
      for (const g of GUIDED_BUILDS[id]) {
        if (g.kind === 'remove') {
          expect(seen.delete(key(g)), key(g)).toBe(true);
          continue;
        }
        for (const t of footprint(g.piece, g.tx, g.ty, g.facing)) {
          expect(room.rows[t.ty]?.[t.tx], key(t)).toBe(TILE.floor);
          expect(fixtures.has(key(t)), key(t)).toBe(false);
          expect(seen.has(key(t)), key(t)).toBe(false);
          seen.add(key(t));
        }
      }
    }
  });

  it('use no tile a port feeds but each line’s own first ones', () => {
    const fed = new Set(FIXTURES.filter((f) => f.kind === 'port').map((f) => key({ tx: f.tx + 1, ty: f.ty })));
    const used = (id: GuidedId) => placed(id).map(key).filter((k) => fed.has(k)).sort();
    expect(used('arrow-line')).toEqual(['2,4', '2,6', '2,8']);
    expect(used('ley-line')).toEqual(['2,10']);
    expect(used('frost-line')).toEqual(['2,12']);
  });

  it('the arrow line is the cutter, knapper, spinner and assembler, ending under the middle entrance, with no hoppers', () => {
    const pieces = placed('arrow-line').map((g) => g.piece);
    expect(pieces.filter((p) => p !== 'conduit')).toEqual(['cutter', 'knapper', 'spinner', 'assembler']);
    expect(pieces).not.toContain('hopper');
    const middle = INTAKE.entrances.find((e) => e.startsOpen);
    expect(placed('arrow-line').at(-1)).toMatchObject({ piece: 'conduit', tx: middle?.tx, ty: (middle?.ty ?? 0) + 1, facing: 'up' });
    // Its first conduits start in front of the wood, stone and fiber ports.
    const ports = FIXTURES.filter((f) => f.kind === 'port' && ['wood', 'stone', 'fiber'].includes(f.raw ?? ''));
    for (const p of ports) expect(placed('arrow-line').some((g) => g.tx === p.tx + 1 && g.ty === p.ty), p.id).toBe(true);
  });
});

/** A new game in the foundry after the shrine's claim, at `goal`: the tube attuned, the arrow chain hand-crafted. */
function foundryAt(goal: number): SimState {
  const s = createSim(3, { start: TUTORIAL_START });
  s.objectives = OBJECTIVES.map((o, i) => i < goal && !o.cutIn);
  claim(s, 'shrine');
  s.roomId = FOUNDRY_ROOM;
  const p = tileCentre({ tx: 20, ty: 13 });
  movePlayer(s, p.x, p.y);
  s.hasTube = true;
  s.crafted = ['shaft', 'arrowhead', 'rope', 'arrow', 'ley-dust', 'ley-bolt', 'bomb', 'arrow+frost'];
  run(s, 1);
  // The attune holds the player still (019).
  while (s.link.attunePulse > 0) run(s, 1);
  return s;
}

/** Builds the current guided step's ghosts in order through commands, as the player would. */
function buildAll(s: SimState): void {
  for (let i = 0; i < 80; i++) {
    const g = nextGhost(s)?.ghost;
    if (!g) return;
    if (g.kind === 'remove') run(s, 1, { pickUp: { tx: g.tx, ty: g.ty } });
    else run(s, 1, { place: { pieceId: g.piece, tx: g.tx, ty: g.ty, facing: g.facing } });
    expect(s.events.placeFails, JSON.stringify(g)).toEqual([]);
  }
}

/** Runs until a goal is done (or `limit` ticks), emptying nothing. */
function until(s: SimState, goal: number, limit = 20000): void {
  for (let t = 0; t < limit && !s.objectives[goal]; t++) run(s, 1);
}

describe('the guided builds work', () => {
  it('the arrow line, fed by the ports alone, puts arrows into the middle entrance and fills the tube', () => {
    const s = foundryAt(ARROW);
    expect(s.link.attuned).toBe(true);
    expect(s.foundry.pieces).toEqual([]);
    buildAll(s);
    expect(nextGhost(s)).toBeNull();
    run(s, 1);
    expect(s.objectives[ARROW]).toBe(true);
    expect(s.foundry.pieces.some((p) => p.kind === 'hopper')).toBe(false);
    const FILL = OBJECTIVES.findIndex((o) => o.check.kind === 'lineFull');
    expect(FILL).toBe(ARROW + 1);
    until(s, FILL);
    expect(s.objectives[FILL]).toBe(true);
    expect(s.link.entrances[1]).toMatchObject({ ammoId: 'arrow', count: 30 });
  });

  it('the ley line, after it, puts ley bolts into the right entrance', () => {
    const s = foundryAt(ARROW);
    buildAll(s);
    s.objectives = OBJECTIVES.map((o, i) => i < LEY && !o.cutIn);
    s.research['entrance-2'] = 'restored';
    Object.assign(s.link.entrances[2] ?? {}, { open: true, node: 'entrance-2' });
    buildAll(s);
    expect(nextGhost(s)).toBeNull();
    until(s, LEY);
    expect(s.objectives[LEY]).toBe(true);
    expect(s.link.entrances[2]?.ammoId).toBe('ley-bolt');
    expect(INTAKE.entrances[2]).toMatchObject({ tx: 13, ty: 0 });
  });

  it('the frost line, under the ley line, makes frost arrows from the port-fed arrow line, and lifts the lock', () => {
    const s = foundryAt(ARROW);
    buildAll(s);
    s.objectives = OBJECTIVES.map((o, i) => i < LEY && !o.cutIn);
    s.research['entrance-2'] = 'restored';
    Object.assign(s.link.entrances[2] ?? {}, { open: true, node: 'entrance-2' });
    buildAll(s);
    s.objectives = OBJECTIVES.map((o, i) => i < FROST && !o.cutIn);
    claim(s, GROTTO_GROUP);
    expect(LOCK_UNTIL).toBe('frost-line');
    expect(buildLocked(s)).toBe(true);
    buildAll(s);
    expect(nextGhost(s)).toBeNull();
    const pair = s.foundry.pieces.find((p) => p.kind === 'tunnel-in');
    expect(pair?.kind === 'tunnel-in' && pair.pair).not.toBeNull();
    until(s, FROST);
    expect(s.objectives[FROST]).toBe(true);
    expect(buildLocked(s)).toBe(false);
    // Building opens fully the same tick.
    run(s, 1, { place: { pieceId: 'conduit', tx: 18, ty: 12, facing: 'up' } });
    expect(s.events.places).toHaveLength(1);
  });
});
