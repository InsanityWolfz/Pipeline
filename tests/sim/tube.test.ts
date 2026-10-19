import { describe, expect, it } from 'vitest';
import { ammoDef } from '../../src/data/ammo';
import { MELEE } from '../../src/data/combat';
import { STARTING_INVENTORY, ROLL_TICKS } from '../../src/data/player';
import { NO_COMMAND, type Command } from '../../src/sim/input';
import { isRolling } from '../../src/sim/movement';
import { createSim, type SimState } from '../../src/sim/state';
import { stepSim } from '../../src/sim/step';
import { summarize } from '../../src/sim/summary';
import { FIRING_WALK_MULTIPLIER } from '../../src/data/player';

const SEED = 7;
const FIRE_TICKS = ammoDef('arrow').fireTicks;

function sim(): SimState {
  return createSim(SEED);
}

const command = (c: Partial<Command> = {}): Command => ({ ...NO_COMMAND, ...c });

/** Fire held, aimed `dx, dy` px from the player's feet. */
function fireAt(s: SimState, dx = 100, dy = 0, extra: Partial<Command> = {}): Command {
  return command({ fire: true, aimX: s.player.x + dx, aimY: s.player.y + dy, ...extra });
}

function run(s: SimState, c: Command | ((s: SimState) => Command), ticks: number): void {
  for (let i = 0; i < ticks; i++) stepSim(s, typeof c === 'function' ? c(s) : c);
}

/** Steps one tick and reports whether an arrow was fired on it. */
function firedOn(s: SimState, c: Command): boolean {
  const before = s.nextArrowId;
  stepSim(s, c);
  return s.nextArrowId > before;
}

describe('firing from the inventory', () => {
  it('starts with the starting arrows, ready to fire', () => {
    const s = sim();
    expect(s.inventory.arrow).toBe(STARTING_INVENTORY.arrow);
    expect(STARTING_INVENTORY.arrow).toBe(30);
    expect(summarize(s).tube).toEqual({ ammo: 'arrow', fireCooldown: 0, meleeCooldown: 0, firing: false, fromReservoir: false, shotCount: 0 });
  });

  it('takes each shot straight from the inventory', () => {
    const s = sim();
    expect(firedOn(s, fireAt(s))).toBe(true);
    expect(s.inventory.arrow).toBe(29);
    expect(s.tube.fromReservoir).toBe(false);
  });

  it('punches once the carried rounds run out (023)', () => {
    const s = sim();
    s.inventory.arrow = 1;
    expect(firedOn(s, fireAt(s))).toBe(true);
    run(s, command(), FIRE_TICKS);
    expect(firedOn(s, fireAt(s))).toBe(false);
    expect(s.events.melees).toHaveLength(1);
    expect(s.tube.meleeCooldown).toBe(MELEE.cooldownTicks);
  });
});

describe('firing', () => {
  it('fires on hold at most once per FIRE_TICKS, one round per shot', () => {
    const s = sim();
    const shots: number[] = [];
    for (let t = 1; t <= FIRE_TICKS * 3 + 1; t++) if (firedOn(s, fireAt(s))) shots.push(t);
    expect(shots).toEqual([1, 1 + FIRE_TICKS, 1 + FIRE_TICKS * 2, 1 + FIRE_TICKS * 3]);
    expect(s.inventory.arrow).toBe(30 - 4);
  });

  it('fires one arrow from a single-tick press', () => {
    const s = sim();
    expect(firedOn(s, fireAt(s))).toBe(true);
    run(s, command(), 30);
    expect(s.inventory.arrow).toBe(29);
    expect(s.nextArrowId).toBe(1);
  });

  it('only fires a press once the interval has passed', () => {
    const s = sim();
    stepSim(s, fireAt(s));
    stepSim(s, command());
    expect(firedOn(s, fireAt(s))).toBe(false);
  });

  it('punches with nothing carried, and the melee cooldown counts down (023)', () => {
    const s = sim();
    s.inventory.arrow = 0;
    expect(firedOn(s, fireAt(s))).toBe(false);
    expect(summarize(s).tube.meleeCooldown).toBe(MELEE.cooldownTicks);
    run(s, command(), MELEE.cooldownTicks);
    expect(summarize(s).tube.meleeCooldown).toBe(0);
  });

  it('never fires during a roll, then fires when it ends if still held', () => {
    const s = sim();
    expect(firedOn(s, fireAt(s, 100, 0, { dodge: true, moveX: 1 }))).toBe(false);
    let firstShot = 0;
    for (let t = 2; t <= ROLL_TICKS + 2 && firstShot === 0; t++) {
      const rolling = isRolling(s.player);
      if (firedOn(s, fireAt(s))) firstShot = t;
      else expect(rolling || isRolling(s.player)).toBe(true);
    }
    expect(firstShot).toBe(ROLL_TICKS + 1);
    expect(s.tube.firing).toBe(true);
  });

  it('slows walking only by the firing multiplier (016)', () => {
    const walker = sim();
    const shooter = sim();
    run(walker, command({ moveX: 1, moveY: 1 }), 40);
    run(shooter, (s) => fireAt(s, -50, 20, { moveX: 1, moveY: 1 }), 40);
    expect(shooter.player.vx).toBeCloseTo(walker.player.vx * FIRING_WALK_MULTIPLIER);
    expect(shooter.player.vy).toBeCloseTo(walker.player.vy * FIRING_WALK_MULTIPLIER);
  });

  it('aims from the feet to the aim point', () => {
    const s = sim();
    stepSim(s, fireAt(s, 30, -40));
    const arrow = s.arrows[0];
    expect(arrow?.dx).toBeCloseTo(0.6);
    expect(arrow?.dy).toBeCloseTo(-0.8);
  });

  it('shoots in the facing direction when aimed at the feet', () => {
    const s = sim();
    s.player.facing = 'left';
    stepSim(s, fireAt(s, 0, 0));
    expect(s.arrows[0]).toMatchObject({ dx: -1, dy: 0 });
  });

  it('stores the aim from the command and reports it', () => {
    const s = sim();
    stepSim(s, command({ aimX: 123.456, aimY: 78 }));
    expect(s.player).toMatchObject({ aimX: 123.456, aimY: 78 });
    expect(summarize(s).player.aim).toEqual({ x: 123.46, y: 78 });
  });

  it('faces the aim while firing, then follows movement again', () => {
    const s = sim();
    stepSim(s, fireAt(s, 10, 40, { moveX: 1 }));
    expect(s.player.facing).toBe('down');
    stepSim(s, fireAt(s, -40, 40, { moveX: 1 }));
    expect(s.player.facing).toBe('left');
    stepSim(s, fireAt(s, 0, -40, { moveX: 1 }));
    expect(s.player.facing).toBe('up');
    stepSim(s, command({ moveX: 1 }));
    expect(s.player.facing).toBe('right');
  });
});

describe('ammo select', () => {
  it('starts on arrows', () => {
    expect(sim().tube.ammoId).toBe('arrow');
  });

  it('switching changes the ammo and moves nothing', () => {
    const s = sim();
    stepSim(s, command({ selectAmmo: 'bomb' }));
    expect(s.tube.ammoId).toBe('bomb');
    expect(s.inventory.arrow).toBe(30);
    expect(s.events.selects).toEqual([{ ammoId: 'bomb' }]);
    expect(summarize(s).tube.ammo).toBe('bomb');
  });

  it('selecting the current ammo does nothing', () => {
    const s = sim();
    stepSim(s, command({ selectAmmo: 'arrow' }));
    expect(s.events.selects).toEqual([]);
  });

  it('ignores ammo that is not in the slot list', () => {
    const s = sim();
    stepSim(s, command({ selectAmmo: 'wood' }));
    expect(s.tube.ammoId).toBe('arrow');
  });

  it('fires the selected ammo item', () => {
    const s = sim();
    s.inventory['ley-bolt'] = 3;
    stepSim(s, command({ selectAmmo: 'ley-bolt' }));
    stepSim(s, fireAt(s));
    expect(s.inventory['ley-bolt']).toBe(2);
    expect(s.inventory.arrow).toBe(30);
  });

  it.each([
    ['arrow', 15],
    ['ley-bolt', 20],
    ['bomb', 40],
  ])('fires %s at most once per %i ticks', (ammoId, interval) => {
    const s = sim();
    s.inventory[ammoId] = 10;
    stepSim(s, command({ selectAmmo: ammoId }));
    const shots: number[] = [];
    for (let t = 1; t <= interval * 2 + 1; t++) {
      const before = s.inventory[ammoId] ?? 0;
      stepSim(s, fireAt(s));
      if ((s.inventory[ammoId] ?? 0) < before) shots.push(t);
    }
    expect(shots).toEqual([1, 1 + interval, 1 + interval * 2]);
  });
});
