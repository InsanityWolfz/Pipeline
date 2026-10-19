import { FOUNDRY_ROOM } from '../data/rooms';
import { FIRING_WALK_MULTIPLIER } from '../data/player';
import { ammoDef } from '../data/ammo';
import { MUZZLE_OFFSET, SLOT_AMMOS, STARTING_AMMO } from '../data/tube';
import { hasBehaviour } from '../data/tags';
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
import type { SimState } from './state';

// The tube: picking the slot's ammo and firing it. Once linked, the tube fires the
// intake's fed entrances first (024), each at its own ammo's rate while fire is held
// (028); once they're empty, carried rounds fire straight from the inventory. With
// no tube, or nothing to fire, fire punches instead (023).

export interface TubeState {
  /** The ammo hotbar slot 1 fires. */
  ammoId: string;
  /** Ticks before the next carried round can fire (a punch waits for it too). Each entrance shot raises it to at least that ammo's fireTicks (028). */
  fireCooldown: number;
  /** Ticks before the next punch can happen (023). */
  meleeCooldown: number;
  /** The tube is really firing (016): fire held this tick with a round to fire, not rolling or in the foundry. A punch isn't firing. */
  firing: boolean;
  /** This tick's shot came from the intake's entrances (024). */
  fromReservoir: boolean;
  /** Projectiles this tick's shot fired: more than 1 for a volley of several rounds (024), 0 with no shot. */
  shotCount: number;
}

export function createTube(): TubeState {
  return { ammoId: STARTING_AMMO, fireCooldown: 0, meleeCooldown: 0, firing: false, fromReservoir: false, shotCount: 0 };
}

/** Switches the slot to another ammo. The current ammo, or one the slot can't take, does nothing. */
export function selectAmmo(state: SimState, ammoId: string): void {
  const { tube } = state;
  if (ammoId === tube.ammoId || !SLOT_AMMOS.includes(ammoId)) return;
  tube.ammoId = ammoId;
  state.events.selects.push({ ammoId });
}

/**
 * The next fire press has something to fire (023, 024): the tube is in hand and an
 * open entrance holds a round, or a round of the slot's ammo is carried. Without one, fire punches.
 */
export function hasRoundToFire(state: Pick<SimState, 'hasTube' | 'tube' | 'inventory' | 'link'>): boolean {
  return nextPress(state).kind !== 'melee';
}

/** The walk multiplier from the tube (016): slower while it really fires, by last tick's state. */
export function firingWalkScale(state: Pick<SimState, 'tube'>): number {
  return state.tube.firing ? FIRING_WALK_MULTIPLIER : 1;
}

/** Runs after the player has moved this tick, so shots leave from where they stand now. */
export function stepTube(state: SimState, cmd: Command): void {
  const { tube, player } = state;
  player.aimX = cmd.aimX;
  player.aimY = cmd.aimY;
  if (tube.fireCooldown > 0) tube.fireCooldown -= 1;
  if (tube.meleeCooldown > 0) tube.meleeCooldown -= 1;
  for (const e of state.link.entrances) if (e.cooldown > 0) e.cooldown -= 1;
  // Without the tube (012) there's nothing to switch.
  if (state.hasTube && cmd.selectAmmo !== null) selectAmmo(state, cmd.selectAmmo);

  tube.firing = false;
  tube.fromReservoir = false;
  tube.shotCount = 0;
  // The tube is quiet in the foundry (015): clicks there are for building and menus, never shots or punches.
  if (isRolling(player) || !cmd.fire || state.roomId === FOUNDRY_ROOM) return;
  const aim = unit(cmd.aimX - player.x, cmd.aimY - player.y);
  const [dx, dy] = aim[0] === 0 && aim[1] === 0 ? facingVector(player.facing) : aim;
  player.facing = aimFacing(dx, dy, player.facing);
  if (!hasRoundToFire(state)) {
    punch(state, dx, dy);
    return;
  }
  tube.firing = true;
  fire(state, cmd, dx, dy);
}

/**
 * Fires along the unit aim (dx, dy). The volley (028): every fed entrance whose own
 * cooldown has run out fires one round from its reservoir, and waits its ammo's
 * fireTicks; rounds fired together are shaped as one volley (024). Otherwise, once
 * the tube's interval has passed, a carried round of the slot's ammo fires alone.
 * The caller has checked there's one to fire.
 */
function fire(state: SimState, cmd: Command, dx: number, dy: number): void {
  const { tube } = state;
  const press = nextPress(state);
  if (press.kind === 'volley') {
    // Each round with its entrance, kept only where that entrance's own cooldown has run out. An entrance keeps its
    // cooldown when it empties and refills with another ammo: the new ammo waits out the old shot's pace.
    const ready = press.rounds.flatMap((r) => {
      const e = state.link.entrances[r.entrance];
      return e && e.cooldown === 0 ? [{ ...r, e }] : [];
    });
    for (const { e, ...r } of ready) {
      const ticks = ammoDef(r.ammoId).fireTicks;
      takeFromEntrance(e);
      e.cooldown = ticks;
      // The first carried round once the entrances run dry never comes sooner than the last entrance's own pace.
      tube.fireCooldown = Math.max(tube.fireCooldown, ticks);
      state.events.entranceFires.push({ entrance: r.entrance, ammoId: r.ammoId });
    }
    if (ready.length === 0) return;
    tube.fromReservoir = true;
    const shots = volleyShots(ready.map((r) => r.ammoId), dx, dy);
    for (const shot of shots) launch(state, shot, cmd);
    tube.shotCount = shots.length;
    return;
  }
  if (press.kind !== 'carried' || tube.fireCooldown > 0) return;
  take(state.inventory, ammoDef(press.ammoId).itemId);
  tube.fireCooldown = ammoDef(press.ammoId).fireTicks;
  launch(state, { ammoId: press.ammoId, dir: [dx, dy], across: 0 }, cmd);
  tube.shotCount = 1;
}

/** Sends one projectile along its direction from the tube's mouth. A bomb lands at the aim's distance, `across` px off the line. */
function launch(state: SimState, { ammoId, dir: [dx, dy], across }: VolleyShot, cmd: Command): void {
  const { player } = state;
  const muzzle = { x: player.x + dx * MUZZLE_OFFSET, y: player.y + dy * MUZZLE_OFFSET };
  state.events.shots.push({ ...muzzle, ammoId });
  if (ammoDef(ammoId).kind === 'lob') {
    throwBomb(state, ammoId, muzzle, player, { x: cmd.aimX, y: cmd.aimY }, [dx, dy], across);
    return;
  }
  // A homing round (029) locks on at launch: the enemy nearest the cursor, if one is close enough.
  const target = hasBehaviour(ammoId, 'homing') ? lockTarget(state, cmd.aimX, cmd.aimY) : null;
  state.arrows.push(createArrow(state.nextArrowId++, ammoId, state.roomId, muzzle.x, muzzle.y, dx, dy, target));
}
