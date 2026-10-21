import { describe, expect, it } from 'vitest';
import { TILE_SIZE } from '../../src/data/config';
import { INTAKE } from '../../src/data/foundry';
import { TUTORIAL_LAYOUT } from '../../src/data/foundryAssets';
import { OBJECTIVES } from '../../src/data/objectives';
import { markerPoint } from '../../src/render/markerPoint';
import type { EntranceState } from '../../src/sim/link';
import type { FoundryState } from '../../src/sim/pieces';
import { currentObjectiveDef, stepObjectives } from '../../src/sim/objectives';
import { PLAYTEST_START } from '../../src/data/playtest';
import { FOUNDRY_ROOM } from '../../src/data/rooms';
import { stepSim } from '../../src/sim/step';
import { createSim } from '../../src/sim/state';
import { restore } from '../../src/sim/research';
import type { SimState } from '../../src/sim/state';
import { movePlayer, SEED } from './fight';
import { foundry } from './foundryKit';
import SAVE from '../../docs/brainstorm/2026-10-21-playtest-save.json';

// 050 (A.11): Shaun built a line into the entrance the Warden's core restored and fed it, and the goal never counted;
// its arrow sat on the centre mouth, not the one he'd just opened. His save (version 5, made before 049) is laid over a
// fresh sim directly, not through the save reader (main reads version 6+).
//
// The cause: the goal checked "two entrances hold arrows" (046's `entrancesHold arrow 2`), whatever the new entrance
// held. Shaun's centre entrance held split ley bolts and his new east entrance a bomb line, so it could never hold;
// and the marker took the middle of the open entrances, which with the centre and east open is the centre.

const GOAL = OBJECTIVES.findIndex((o) => o.text === 'Feed ammo into the new entrance');

/** Shaun's save state, as the export wrote it. */
const saved = SAVE.save.state as unknown as { foundry: FoundryState; link: { entrances: Omit<EntranceState, 'node'>[] }; research: Record<string, string> };

/** The mouth an arrow marker floats over for an entrance (027's lift). */
const over = (i: number) => {
  const t = INTAKE.entrances[i];
  if (!t) throw new Error(`no entrance ${i}`);
  return { x: (t.tx + 0.5) * TILE_SIZE, y: (t.ty + 1) * TILE_SIZE - TUTORIAL_LAYOUT.marker.lift };
};

/**
 * Shaun's foundry at the moment of his note: his pieces, the centre entrance holding his split ley bolts, and only the
 * Warden's node restored, at the east cap, which his bomb line feeds. (By the end of the save the Bulwark's core had
 * opened the west cap too, and an arrow line ran there.)
 */
function shaunsFoundry(): SimState {
  const s = foundry();
  s.foundry = structuredClone(saved.foundry);
  s.research = { ...s.research, ...saved.research, 'entrance-3': 'revealed' } as SimState['research'];
  const [, centre] = saved.link.entrances;
  s.link.entrances = [
    { open: false, ammoId: null, count: 0, cooldown: 0, node: null },
    { ...(centre ?? { open: true, ammoId: null, count: 0, cooldown: 0 }), node: null },
    { open: true, ammoId: null, count: 0, cooldown: 0, node: 'entrance-2' },
  ];
  s.objectives = OBJECTIVES.map((_, i) => i < GOAL);
  return s;
}

describe("the second-line goal, from Shaun's save (050, A.11)", () => {
  it('reads "Feed ammo into the new entrance" and is the goal after restoring the second entrance', () => {
    expect(GOAL).toBeGreaterThan(0);
    expect(OBJECTIVES[GOAL - 1]?.check).toEqual({ kind: 'restored', node: 'entrance-2' });
    expect(OBJECTIVES[GOAL]?.check).toEqual({ kind: 'entranceFed', node: 'entrance-2' });
  });

  it("his save: the centre holds split bolts and the east entrance the Warden's core opened is empty, so the goal waits, marked on the east mouth", () => {
    const s = shaunsFoundry();
    expect(s.link.entrances[1]?.ammoId).toBe('ley-bolt+split');
    stepObjectives(s);
    expect(s.objectives[GOAL]).toBe(false);
    expect(currentObjectiveDef(s)?.text).toBe('Feed ammo into the new entrance');
    expect(markerPoint(s, 'newEntrance')).toEqual(over(2));
    expect(markerPoint(s, 'newEntrance')).not.toEqual(over(1));
  });

  it("end to end: 046's old check never holds on his state, while his bomb line, run tick by tick, completes the new goal", () => {
    const s = shaunsFoundry();
    // 046's check, as main had it: two entrances holding arrows.
    const oldCheck = (st: SimState) => st.link.entrances.filter((e) => e.ammoId === 'arrow' && e.count > 0).length >= 2;
    expect(oldCheck(s)).toBe(false);
    // His packer (15,3) is starved of fuse: its fuse maker's hopper (15,5) is empty in the save. Resin in it, as he'd add.
    const fuseHopper = s.foundry.pieces.find((p) => p.kind === 'hopper' && p.tx === 15 && p.ty === 5);
    if (fuseHopper?.kind !== 'hopper') throw new Error('no fuse hopper');
    expect(fuseHopper.count).toBe(0);
    fuseHopper.item = 'husk-resin';
    fuseHopper.count = 10;
    const east = () => s.link.entrances[2];
    let ticks = 0;
    for (; ticks < 3000 && (east()?.count ?? 0) === 0; ticks++) stepSim(s);
    // A bomb came down his line (15,2 → 14,2 → 13,2 → 13,1) into the east entrance, and the goal holds.
    expect(east()).toMatchObject({ ammoId: 'bomb', node: 'entrance-2' });
    expect(east()?.count).toBeGreaterThan(0);
    expect(s.objectives[GOAL]).toBe(true);
    // The old check still wouldn't: no entrance holds arrows.
    expect(oldCheck(s)).toBe(false);
  });

  it('completes once his bomb line puts a bomb in the new entrance (any ammo, not two arrow lines)', () => {
    const s = shaunsFoundry();
    const east = s.link.entrances[2];
    if (!east) throw new Error('no east entrance');
    east.ammoId = 'bomb';
    east.count = 1;
    stepObjectives(s);
    expect(s.objectives[GOAL]).toBe(true);
  });

  it('ammo in the other entrances never counts: only the one the Warden core restored', () => {
    const s = shaunsFoundry();
    const centre = s.link.entrances[1];
    if (!centre) throw new Error('no centre entrance');
    centre.ammoId = 'arrow';
    centre.count = 30;
    stepObjectives(s);
    expect(s.objectives[GOAL]).toBe(false);
  });

  it('restoring at a cap records which node opened it, west or east, and the marker follows it', () => {
    for (const cap of [0, 2]) {
      const s = createSim(SEED, { start: PLAYTEST_START });
      s.roomId = FOUNDRY_ROOM;
      const t = INTAKE.entrances[cap];
      if (!t) throw new Error('no cap');
      movePlayer(s, (t.tx + 0.5) * TILE_SIZE, (t.ty + 1.5) * TILE_SIZE);
      stepSim(s);
      expect(restore(s, 'entrance-2')).toBe(true);
      expect(s.link.entrances.map((e) => e.node)).toEqual(cap === 0 ? ['entrance-2', null, null] : [null, null, 'entrance-2']);
      expect(markerPoint(s, 'newEntrance')).toEqual(over(cap));
    }
  });
});
