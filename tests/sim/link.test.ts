import { describe, expect, it } from 'vitest';
import { ammoDef } from '../../src/data/ammo';
import { PLAYTEST_START } from '../../src/data/playtest';
import { DEFAULT_START } from '../../src/data/player';
import { FOUNDRY_ROOM } from '../../src/data/rooms';
import { ATTUNE_TICKS } from '../../src/data/tube';
import { ENTRANCE_CAPS } from '../../src/data/foundry';
import { unlockedPieces } from '../../src/sim/placement';
import type { HopperState } from '../../src/sim/pieces';
import { createSim, type SimState } from '../../src/sim/state';
import { stepSim } from '../../src/sim/step';
import { summarize } from '../../src/sim/summary';
import { restore, snapshot } from '../../src/sim/save';
import { CARRIED_HINT } from '../../src/data/hints';
import { arena, atEntrance, command, die, fireAt, hold, HUSK, movePlayer, placeHusk, PLAYER_AT, run, runUntil, runUntilKo, SEED, volleyAt } from './fight';
import { foundry, put, stepOutside } from './foundryKit';
import { OVERWORLD_ROOM } from '../../src/data/overworld';

const HALL = OVERWORLD_ROOM;
const FIRE_TICKS = ammoDef('arrow').fireTicks;

/** The overworld with the player in front of the foundry's stairs (017). */
function atHallDoor() {
  const s = arena();
  atEntrance(s);
  return s;
}

/** Sets what the middle entrance (the one open from the start) holds. */
function setMiddle(s: ReturnType<typeof foundry>, ammoId: string | null, count: number): void {
  Object.assign(s.link.entrances[1] ?? {}, { ammoId, count });
}

/** A foundry sim, attuned, with empty entrances. */
function attuned() {
  return foundry();
}

/** A foundry sim the player has just walked into for the first time: the attune is playing. */
function attuning() {
  const s = foundry();
  s.link.attuned = false;
  run(s, 1);
  expect(s.link).toMatchObject({ attuned: true, attunePulse: ATTUNE_TICKS });
  return s;
}

/** Every hint event over the next `ticks` ticks. */
function hintsOver(s: SimState, ticks: number): { id: string }[] {
  const out: { id: string }[] = [];
  for (let i = 0; i < ticks; i++) {
    run(s, 1);
    out.push(...s.events.hints);
  }
  return out;
}

describe('attunement', () => {
  it('starts dormant and attunes on the first walk into the foundry, once', () => {
    const s = atHallDoor();
    expect(s.link.attuned).toBe(false);
    const attunes: unknown[] = [];
    runUntil(
      s,
      (x) => {
        attunes.push(...x.events.attunes);
        return x.roomId === FOUNDRY_ROOM;
      },
      60,
      { moveY: -1 },
    );
    expect(s.link).toMatchObject({ attuned: true, attunePulse: ATTUNE_TICKS });
    expect(attunes).toHaveLength(1);
    // Out and back in again, once the attune lets go: nothing more.
    run(s, ATTUNE_TICKS);
    runUntil(s, (x) => x.roomId === HALL, 120, { moveX: 1 });
    runUntil(
      s,
      (x) => {
        attunes.push(...x.events.attunes);
        return x.roomId === FOUNDRY_ROOM;
      },
      120,
      { moveY: -1 },
    );
    expect(attunes).toHaveLength(1);
  });

  it('holds the player still while the attune plays, then gives control back', () => {
    const s = attuning();
    const x = s.player.x;
    run(s, 10, { moveX: -1, fire: true, toggleBuild: true });
    expect(s.link.attunePulse).toBe(ATTUNE_TICKS - 10);
    expect(s.player.x).toBe(x);
    expect(s.building).toBe(false);
    run(s, ATTUNE_TICKS - 10, { moveX: -1 });
    expect(s.link.attunePulse).toBe(0);
    expect(s.player.x).toBe(x);
    run(s, 10, { moveX: -1 });
    expect(s.player.x).toBeLessThan(x);
  });

  it('shows the right click hint once, as the attune ends, and never again after a reload (047.9)', () => {
    const s = attuning();
    expect(hintsOver(s, ATTUNE_TICKS - 1)).toEqual([]);
    expect(hintsOver(s, 1)).toEqual([{ id: CARRIED_HINT.id }]);
    expect(s.link.attunePulse).toBe(0);
    expect(hintsOver(s, 300)).toEqual([]);
    expect(hintsOver(restore(snapshot(s)), 300)).toEqual([]);
  });

  it('a save taken while the attune plays shows the hint once, when it ends', () => {
    const s = attuning();
    run(s, 10);
    expect(hintsOver(restore(snapshot(s)), ATTUNE_TICKS + 100)).toEqual([{ id: CARRIED_HINT.id }]);
  });

  it('never shows on a start that is already attuned', () => {
    expect(hintsOver(attuned(), 300)).toEqual([]);
  });

  it('survives a KO, and so do the entrances', () => {
    const s = attuned();
    setMiddle(s, 'arrow', 7);
    s.roomId = HALL;
    movePlayer(s, PLAYER_AT.x, PLAYER_AT.y);
    placeHusk(s, PLAYER_AT.x + 20, PLAYER_AT.y);
    s.player.health = HUSK.swipe.damage;
    runUntilKo(s);
    expect(s.link.attuned).toBe(true);
    expect(s.link.entrances[1]).toMatchObject({ open: true, ammoId: 'arrow', count: 7 });
  });

  it('shows in the summary', () => {
    const s = attuned();
    setMiddle(s, 'bomb', 3);
    expect(summarize(s).link).toEqual({ attuned: true, attunePulse: 0 });
    expect(summarize(s).intake.entrances[1]).toMatchObject({ open: true, ammo: 'bomb', count: 3, cap: ENTRANCE_CAPS[0] });
  });
});

describe('firing from the reservoir', () => {
  it('fires the reservoir on left click, flagging those shots, then punches; the carried arrow waits for right click (028, 047)', () => {
    const s = stepOutside(attuned());
    s.inventory.arrow = 1;
    setMiddle(s, 'arrow', 2);
    const aim = volleyAt(s.player.x - 100, s.player.y);
    run(s, 1, aim);
    expect([s.inventory.arrow, s.link.entrances[1]?.count, s.tube.fromReservoir]).toEqual([1, 1, true]);
    expect(summarize(s).tube.fromReservoir).toBe(true);
    run(s, FIRE_TICKS, aim);
    expect(s.link.entrances[1]).toEqual({ open: true, ammoId: null, count: 0, cooldown: FIRE_TICKS, node: null });
    expect(s.tube.fromReservoir).toBe(true);
    let punches = 0;
    run(s, FIRE_TICKS, (x) => {
      punches += x.events.melees.length;
      return aim;
    });
    expect(punches).toBeGreaterThan(0);
    expect([s.inventory.arrow, s.arrows.length]).toEqual([1, 2]);
    hold(s, 'arrow');
    run(s, FIRE_TICKS, fireAt(s.player.x - 100, s.player.y));
    expect([s.inventory.arrow, s.tube.fromReservoir]).toEqual([0, false]);
  });

  it('fires the volley when an entrance holds a different ammo to the one selected (024)', () => {
    const s = stepOutside(attuned());
    s.inventory.arrow = 0;
    setMiddle(s, 'bomb', 5);
    run(s, 1, volleyAt(s.player.x - 100, s.player.y));
    expect(s.events.melees).toHaveLength(0);
    expect(s.bombs).toHaveLength(1);
    expect(s.link.entrances[1]?.count).toBe(4);
  });

  it('a ley bolt line into the intake refills the reservoir while the player fires from it', () => {
    const s = attuned();
    s.inventory = {};
    hold(s, 'ley-bolt');
    // Up the middle into the intake's middle mouth tile (019).
    const h = put<HopperState>(s, 'hopper', 12, 4, 'up');
    h.item = 'ley-crystal';
    h.count = 20;
    put(s, 'grinder', 12, 3, 'up');
    put(s, 'focuser', 12, 2, 'up');
    put(s, 'conduit', 12, 1, 'up');
    runUntil(s, (x) => (x.link.entrances[1]?.count ?? 0) >= 6, 900);
    stepOutside(s);
    let fromReservoir = 0;
    run(s, 300, (x) => {
      if (x.tube.fromReservoir) fromReservoir += 1;
      return volleyAt(x.player.x - 100, x.player.y);
    });
    expect(fromReservoir).toBeGreaterThan(6);
  });
});

describe('the playtest start', () => {
  it('starts with plenty of everything and every machine unlocked, all banked', () => {
    const s = createSim(SEED, { start: PLAYTEST_START });
    expect(s.inventory).toMatchObject({ arrow: 99, bomb: 99, 'ley-bolt': 99, wood: 99, 'husk-resin': 99, shaft: 20, fuse: 20 });
    expect(s.crafted).toEqual(PLAYTEST_START.crafted);
    // 029: every stage too, with rimestone to feed the frost rune and no tagged rounds carried; 038: the Cluster die and the landmine chain.
    expect(unlockedPieces(s)).toEqual([
      'conduit', 'splitter', 'underground-entrance', 'underground-exit', 'hopper', 'crate', 'cutter', 'knapper', 'spinner', 'assembler', 'frost-rune', 'fire-rune', 'lightning-rune', 'shaper', 'fuse-maker', 'packer', 'cluster-die', 'grinder', 'focuser', 'ley-guide', 'prism-lens', 'plate-press', 'mine-packer',
      // 062: the Forge's machines (066: and the Tempering coil).
      'smelter', 'kiln', 'tempering-coil',
    ]);
    expect(s.inventory['rimestone']).toBe(99);
    expect(s.inventory['arrow+frost']).toBeUndefined();
    // The start is banked, so a death keeps what's still carried of it (011).
    s.inventory = { wood: 1 };
    die(s);
    expect(s.inventory).toEqual({ wood: 1 });
  });

  it('leaves the normal start unchanged', () => {
    const s = createSim(SEED);
    expect(s.inventory).toEqual(DEFAULT_START.inventory);
    expect(s.inventory).toEqual({ arrow: 30 });
    expect(s.crafted).toEqual([]);
  });

  it('the same seed and start give the same run', () => {
    const play = () => {
      const s = createSim(SEED, { start: PLAYTEST_START });
      for (let t = 0; t < 300; t++) {
        stepSim(s, command({ ...fireAt(s.player.x + Math.cos(t) * 50, s.player.y + 40), moveX: t % 60 < 30 ? -1 : 0 }));
      }
      return summarize(s);
    };
    expect(play()).toEqual(play());
  });
});
