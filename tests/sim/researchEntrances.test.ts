import { describe, expect, it } from 'vitest';
import { CONDUIT_TICKS, ENTRANCE_CAPS, HOPPER_TICKS, INTAKE } from '../../src/data/foundry';
import { machineDef } from '../../src/data/pieces';
import { MACHINE_SPEED_MULT } from '../../src/data/research';
import type { ConduitState, CrateState, HopperState, MachineState } from '../../src/sim/pieces';
import { craftTicksAt, diagramInReach, diagrams, entranceCap, machineSpeed, restoreFail } from '../../src/sim/research';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { volleyRounds } from '../../src/sim/volley';
import { die, movePlayer, run } from './fight';
import { foundry, put, stepOutside } from './foundryKit';

// The 024 migration (033): one boss core opens one entrance, restored at the cap the
// player picks. The other cap then costs a Bulwark core. Then the reservoir's tiers
// (30 → 45 → 60) and machine speed (craft time × 0.75, rounded up).

const [WEST, MIDDLE, EAST] = INTAKE.entrances;
if (!WEST || !MIDDLE || !EAST) throw new Error('the intake needs three entrances');

/** Feet on the floor tile under a mouth tile. */
function under(s: SimState, t: { tx: number; ty: number }): void {
  const at = tileCentre({ tx: t.tx, ty: t.ty + 1 });
  movePlayer(s, at.x, at.y);
}

const opens = (s: SimState) => s.link.entrances.map((e) => e.open);

describe('restoring entrances (one core each)', () => {
  it('the warden core opens exactly the cap it is restored at, west or east', () => {
    for (const [cap, i, expected] of [[WEST, 0, [true, true, false]], [EAST, 2, [false, true, true]]] as const) {
      const s = foundry();
      s.inventory['warden-core'] = 1;
      under(s, cap);
      expect(diagramInReach(s)).toMatchObject({ node: 'entrance-2', entrance: i, dimmed: false });
      run(s, 1, { restore: 'entrance-2' });
      expect(opens(s)).toEqual(expected);
      expect(s.inventory['warden-core']).toBe(0);
      expect(s.events.restores).toEqual([{ node: 'entrance-2' }]);
      expect(s.events.intakeOpens).toEqual([{ entrance: i }]);
      expect(s.research['entrance-2']).toBe('restored');
    }
  });

  it('after the Warden, one cap stays: the third entrance costs a Bulwark core, and a second warden core does nothing for it', () => {
    const s = foundry();
    s.inventory['warden-core'] = 2;
    under(s, WEST);
    run(s, 1, { restore: 'entrance-2' });
    // The normal state now: one capped entrance and two open ones (024's "can't occur").
    expect(opens(s)).toEqual([true, true, false]);
    under(s, EAST);
    expect(diagrams(s).filter((d) => d.entrance !== null)).toEqual([expect.objectContaining({ node: 'entrance-3', entrance: 2, dimmed: false })]);
    expect(restoreFail(s, 'entrance-3')).toBe('cost');
    run(s, 1, { restore: 'entrance-3' });
    run(s, 1, { restore: 'entrance-2' });
    expect(opens(s)).toEqual([true, true, false]);
    expect(s.inventory['warden-core']).toBe(1);
    s.inventory['bulwark-core'] = 1;
    run(s, 1, { restore: 'entrance-3' });
    expect(opens(s)).toEqual([true, true, true]);
    expect(s.inventory).toMatchObject({ 'warden-core': 1, 'bulwark-core': 0 });
    expect(s.events.intakeOpens).toEqual([{ entrance: 2 }]);
    expect(diagrams(s).filter((d) => d.entrance !== null)).toEqual([]);
  });

  it('E alone restores nothing; nothing without a core, out of reach, outside the foundry, or before attuning', () => {
    const s = foundry();
    s.inventory['warden-core'] = 1;
    under(s, WEST);
    run(s, 1, { interact: true });
    expect(opens(s)).toEqual([false, true, false]);
    const none = foundry();
    under(none, WEST);
    expect(restoreFail(none, 'entrance-2')).toBe('cost');
    const far = foundry();
    far.inventory['warden-core'] = 1;
    expect(restoreFail(far, 'entrance-2')).toBe('reach');
    run(far, 1, { restore: 'entrance-2' });
    expect([opens(far), far.inventory['warden-core']]).toEqual([[false, true, false], 1]);
    const dormant = foundry();
    dormant.link.attuned = false;
    dormant.inventory['warden-core'] = 1;
    under(dormant, WEST);
    expect(restoreFail(dormant, 'entrance-2')).toBe('not-attuned');
    expect(diagramInReach(dormant)).toBeUndefined();
    const outside = foundry();
    outside.inventory['warden-core'] = 1;
    stepOutside(outside);
    expect(restoreFail(outside, 'entrance-2')).toBe('not-foundry');
  });

  it('stays open, with what the entrance holds, through a KO', () => {
    const s = foundry();
    s.inventory['warden-core'] = 1;
    under(s, WEST);
    run(s, 1, { restore: 'entrance-2' });
    Object.assign(s.link.entrances[0] ?? {}, { ammoId: 'bomb', count: 4 });
    stepOutside(s);
    die(s);
    expect(opens(s)).toEqual([true, true, false]);
    expect(s.link.entrances[0]).toMatchObject({ ammoId: 'bomb', count: 4 });
    expect(s.research['entrance-2']).toBe('restored');
  });
});

describe('the reservoir', () => {
  it('reservoir-1 (4 ancient gears, at the pipe) raises every cap 30 → 45; reservoir-2 → 60; rounds held are kept', () => {
    const s = foundry();
    for (const e of s.link.entrances) e.open = true;
    Object.assign(s.link.entrances[1] ?? {}, { ammoId: 'arrow', count: 30 });
    expect(entranceCap(s)).toBe(30);
    s.inventory['ancient-gear'] = 5;
    under(s, MIDDLE);
    expect(diagramInReach(s)?.node).toBe('reservoir-1');
    run(s, 1, { restore: 'reservoir-1' });
    expect([entranceCap(s), s.inventory['ancient-gear'], s.link.entrances[1]?.count]).toEqual([45, 1, 30]);
    expect(summarize(s).intake.entrances.map((e) => e.cap)).toEqual([45, 45, 45]);
    // Reservoir II waits on its schematic: no diagram until it's revealed.
    expect(diagrams(s).some((d) => d.node === 'reservoir-2')).toBe(false);
    s.research['reservoir-2'] = 'revealed';
    Object.assign(s.inventory, { 'schematic-reservoir-2': 1, 'aqueduct-valve': 4, 'bulwark-core': 1 });
    run(s, 1, { restore: 'reservoir-2' });
    expect([entranceCap(s), s.link.entrances[1]?.count]).toEqual([60, 30]);
    expect(s.inventory).toMatchObject({ 'schematic-reservoir-2': 0, 'aqueduct-valve': 0, 'bulwark-core': 0 });
    expect(ENTRANCE_CAPS).toEqual([30, 45, 60]);
  });

  it('a line fills an entrance past 30 once restored, and the full-line gate and the volley use the current cap', () => {
    const s = foundry();
    s.research['reservoir-1'] = 'restored';
    const middle = s.link.entrances[1];
    if (!middle) throw new Error('no middle entrance');
    Object.assign(middle, { ammoId: 'arrow', count: 30 });
    const c = put<ConduitState>(s, 'conduit', MIDDLE.tx, MIDDLE.ty + 1, 'up');
    c.item = 'arrow';
    c.progress = CONDUIT_TICKS;
    run(s, 1);
    expect([middle.count, c.item, s.firstLineFull]).toEqual([31, null, false]);
    middle.count = 45;
    run(s, 1);
    expect(s.firstLineFull).toBe(true);
    expect(volleyRounds(s).map((r) => r.ammoId)).toEqual(['arrow']);
  });

  it('reservoir-2 is dimmed and refused while reservoir-1 is not restored', () => {
    const s = foundry();
    s.research['reservoir-1'] = 'revealed';
    s.research['reservoir-2'] = 'revealed';
    Object.assign(s.inventory, { 'schematic-reservoir-2': 1, 'aqueduct-valve': 4, 'bulwark-core': 1 });
    expect(restoreFail(s, 'reservoir-2')).toBe('requires');
    // The pipe shows the first reservoir node not yet restored.
    expect(diagrams(s).find((d) => d.rect.x === (MIDDLE.tx + 0.5) * 32)?.node).toBe('reservoir-1');
  });
});

describe('machine speed', () => {
  it('rounds a craft time up to whole ticks: the assembler 90 → 68; conduits and hoppers keep their pace', () => {
    expect(machineDef('assembler').craftTicks).toBe(90);
    expect(craftTicksAt('assembler', MACHINE_SPEED_MULT)).toBe(68);
    const pace = (restoredSpeed: boolean) => {
      const s = foundry();
      if (restoredSpeed) s.research['machine-speed'] = 'restored';
      const h = put<HopperState>(s, 'hopper', 3, 8, 'right');
      Object.assign(h, { item: 'wood', count: 2 });
      put(s, 'conduit', 4, 8, 'right');
      const crate = put<CrateState>(s, 'crate', 5, 8);
      let first = -1;
      for (let t = 1; t <= 200 && first < 0; t++) {
        run(s, 1);
        if ((crate.contents.wood ?? 0) > 0) first = t;
      }
      return first;
    };
    // The same ticks from hopper to crate with machine speed restored as without: it scales machines only.
    expect(pace(true)).toBe(pace(false));
    expect(pace(false)).toBeGreaterThanOrEqual(HOPPER_TICKS + CONDUIT_TICKS);
  });

  it("scales every machine's craft time by 0.75, rounded up; conduits and hoppers are unchanged", () => {
    expect(MACHINE_SPEED_MULT).toBe(0.75);
    expect(craftTicksAt('cutter', 1)).toBe(60);
    expect(craftTicksAt('cutter', MACHINE_SPEED_MULT)).toBe(45);
    expect(craftTicksAt('assembler', MACHINE_SPEED_MULT)).toBe(Math.ceil(machineDef('assembler').craftTicks * 0.75));
    expect(craftTicksAt('frost-rune', MACHINE_SPEED_MULT)).toBe(Math.ceil(machineDef('frost-rune').craftTicks * 0.75));
    const s = foundry();
    expect(machineSpeed(s)).toBe(1);
    s.research['machine-speed'] = 'restored';
    expect(machineSpeed(s)).toBe(0.75);
    const m = put<MachineState>(s, 'cutter', 6, 8, 'right');
    m.buffer = { wood: 1 };
    run(s, 1);
    expect(m.crafting).toBe(true);
    run(s, 44);
    expect(m.output).toBe(0);
    run(s, 1);
    expect(m.output).toBeGreaterThan(0);
    expect(s.events.made).toEqual([expect.objectContaining({ id: m.id, pieceId: 'cutter', itemId: 'shaft' })]);
  });
});
