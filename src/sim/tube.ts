import { FOUNDRY_ROOM } from '../data/rooms';
import { ammoDef } from '../data/ammo';
import { MUZZLE_OFFSET } from '../data/tube';
import { hasTagKeyword } from '../data/tags';
import { createArrow } from './arrows';
import { lockTarget } from './homing';
import { throwBomb } from './bombs';
import { aimFacing, facingVector, unit } from './direction';
import type { Command } from './input';
import { take } from './inventory';
import { takeFromEntrance } from './link';
import { punch } from './melee';
import { isRolling } from './movement';
import { nextPress, volleyShots, type VolleyShot } from './volley';
import { assignSlot, readyItem, selectSlot } from './hotbar';
import type { SimState } from './state';
import { playerStats } from './stats';
import { fireInterval, roundEmission } from './emissions';
import { statOf } from './statResolve';

// The tube (047, note 11): left click (fire) fires the intake's fed entrances (024), each
// at its own ammo's rate while held (028); with the intake dry, or no tube, it punches (023).
// Right click (use) uses the carried bar's selected item (src/sim/hotbar.ts): a carried round
// fired straight from the inventory, or a bomb or landmine thrown. Neither does the other's job.

export interface TubeState {
  /** Ticks before the next carried round can fire (a punch waits for it too), fractional (039). Each entrance shot raises it to at least that ammo's interval (028). */
  fireCooldown: number;
  /** Ticks before the next punch can happen (023). */
  meleeCooldown: number;
  /** The tube is really firing (016): a round went out this tick or fire or use is held with one to send, not rolling or in the foundry. A punch isn't firing. */
  firing: boolean;
  /** This tick's shot came from the intake's entrances (024). */
  fromReservoir: boolean;
  /** Projectiles this tick's shot fired: more than 1 for a volley of several rounds (024), 0 with no shot. */
  shotCount: number;
  /** Ticks fire has been held while firing (037: Overpressure's ramp), up to its ramp; releasing fire resets it. */
  overpressure: number;
}

export function createTube(): TubeState {
  return { fireCooldown: 0, meleeCooldown: 0, firing: false, fromReservoir: false, shotCount: 0, overpressure: 0 };
}

/** The next fire press has a volley to fire (023, 024): the tube is in hand and an open entrance holds a round. Without one, fire punches. */
export function hasRoundToFire(state: Pick<SimState, 'hasTube' | 'link'>): boolean {
  return nextPress(state).kind !== 'melee';
}

/** The walk multiplier from the tube (016): slower while it really fires, by last tick's state (037: Steady Grip eases it). */
export function firingWalkScale(state: Pick<SimState, 'tube' | 'gear' | 'equipped' | 'talents'>): number {
  return state.tube.firing ? playerStats(state).firingWalk : 1;
}

/**
 * Ticks between shots of a round (037, 039): TICK_RATE over its fire rate (resolveStat: every +% added, Overpressure's
 * ramp multiplied after). Never rounded (039, Q13): a cooldown is fractional, so the rate shown is the rate fired.
 */
export function fireTicksOf(state: SimState, ammoId: string): number {
  return fireInterval(state, ammoId);
}

/**
 * Runs after the player has moved this tick, so shots leave from where they stand now. Cooldowns (039) count down 1 a
 * tick while above 0; a round fires at 0 or less and adds its interval; one that didn't fire stops at 0, so nothing
 * banks while fire isn't held.
 */
export function stepTube(state: SimState, cmd: Command): void {
  stepFire(state, cmd);
  const { tube } = state;
  tube.fireCooldown = Math.max(0, tube.fireCooldown);
  for (const e of state.link.entrances) e.cooldown = Math.max(0, e.cooldown);
}

function stepFire(state: SimState, cmd: Command): void {
  const { tube, player } = state;
  player.aimX = cmd.aimX;
  player.aimY = cmd.aimY;
  if (tube.fireCooldown > 0) tube.fireCooldown -= 1;
  if (tube.meleeCooldown > 0) tube.meleeCooldown -= 1;
  for (const e of state.link.entrances) if (e.cooldown > 0) e.cooldown -= 1;
  if (cmd.assignSlot) assignSlot(state, cmd.assignSlot.slot, cmd.assignSlot.itemId);
  // Without the tube (012) there's nothing to switch.
  if (state.hasTube && cmd.selectSlot !== null) selectSlot(state, cmd.selectSlot);

  tube.firing = false;
  tube.fromReservoir = false;
  tube.shotCount = 0;
  // The tube is quiet in the foundry (015): clicks there are for building and menus, never shots or punches.
  if (isRolling(player) || (!cmd.fire && !cmd.use) || state.roomId === FOUNDRY_ROOM) return;
  const aim = unit(cmd.aimX - player.x, cmd.aimY - player.y);
  const [dx, dy] = aim[0] === 0 && aim[1] === 0 ? facingVector(player.facing) : aim;
  player.facing = aimFacing(dx, dy, player.facing);
  if (cmd.fire) {
    if (hasRoundToFire(state)) {
      tube.firing = true;
      fireVolley(state, cmd, dx, dy);
    } else punch(state, dx, dy);
  }
  if (cmd.use && state.hasTube) useCarried(state, cmd, dx, dy);
}

/**
 * The volley (028): every fed entrance whose own cooldown has run out fires one round from its reservoir, and waits
 * its ammo's interval; rounds fired together are shaped as one volley (024). The caller has checked there's one.
 */
function fireVolley(state: SimState, cmd: Command, dx: number, dy: number): void {
  const { tube } = state;
  const press = nextPress(state);
  if (press.kind !== 'volley') return;
  // Each round with its entrance, kept only where that entrance's own cooldown has run out. An entrance keeps its
  // cooldown when it empties and refills with another ammo: the new ammo waits out the old shot's pace.
  const ready = press.rounds.flatMap((r) => {
    const e = state.link.entrances[r.entrance];
    return e && e.cooldown <= 0 ? [{ ...r, e }] : [];
  });
  for (const { e, ...r } of ready) {
    const ticks = fireTicksOf(state, r.ammoId);
    takeFromEntrance(e);
    e.cooldown += ticks;
    state.events.entranceFires.push({ entrance: r.entrance, ammoId: r.ammoId });
  }
  if (ready.length === 0) return;
  tube.fromReservoir = true;
  const shots = volleyShots(ready.map((r) => r.ammoId), dx, dy);
  for (const shot of shots) launch(state, shot, cmd);
  tube.shotCount = shots.length;
}

/**
 * Right click (047): the carried bar's selected item, if any is carried, once the tube's interval has passed: a round
 * fires alone, a bomb or landmine is thrown. A selected slot that's empty does nothing.
 */
function useCarried(state: SimState, cmd: Command, dx: number, dy: number): void {
  const { tube } = state;
  const itemId = readyItem(state);
  if (itemId === null) return;
  tube.firing = true;
  if (tube.fireCooldown > 0) return;
  const ammoId = itemId;
  take(state.inventory, ammoDef(ammoId).itemId);
  tube.fireCooldown += fireTicksOf(state, ammoId);
  launch(state, { ammoId, dir: [dx, dy], across: 0 }, cmd);
  tube.shotCount += 1;
}

/** Sends one projectile along its direction from the tube's mouth. A bomb or landmine lands at the aim's distance, `across` px off the line. */
function launch(state: SimState, { ammoId, dir: [dx, dy], across }: VolleyShot, cmd: Command): void {
  const { player } = state;
  const muzzle = { x: player.x + dx * MUZZLE_OFFSET, y: player.y + dy * MUZZLE_OFFSET };
  state.events.shots.push({ ...muzzle, ammoId });
  if (ammoDef(ammoId).kind !== 'straight') {
    throwBomb(state, ammoId, muzzle, player, { x: cmd.aimX, y: cmd.aimY }, [dx, dy], across);
    return;
  }
  // A homing round (029) locks on at launch: the enemy nearest the cursor, if one is close enough.
  const target = hasTagKeyword(ammoId, 'homing') ? lockTarget(state, ammoId, cmd.aimX, cmd.aimY) : null;
  const arrow = createArrow(state.nextArrowId++, ammoId, state.roomId, muzzle.x, muzzle.y, dx, dy, target);
  // Its stats (037, 039) go onto the round as it leaves.
  const e = roundEmission(ammoId);
  arrow.damage = statOf(state, 'damage', e, arrow.damage);
  arrow.range = statOf(state, 'range', e, arrow.range);
  arrow.speed = statOf(state, 'speed', e, arrow.speed);
  arrow.knockback = statOf(state, 'knockback', e, arrow.knockback);
  state.arrows.push(arrow);
}
