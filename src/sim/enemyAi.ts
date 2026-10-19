import type { EnemyDef, MeleeDef } from '../data/enemies';
import { bulwarkThink } from './bulwarkAi';
import { chargeThink } from './chargerAi';
import { defOf } from './champions';
import { castThink } from './casterAi';
import { chillScale, tickCold } from './cold';
import { moveBox } from './collision';
import { aimFacing } from './direction';
import { separate, type EnemyState, type RoomBodies } from './enemies';
import { damagePlayer } from './health';
import { takeKnock } from './knockback';
import { keepOut } from './population';
import { slamThink } from './slammerAi';
import type { SimState } from './state';
import { engage, inAggroBox, leash, startWindup, stepAttack, toward } from './aiCommon';


// Enemy behaviour, RotMG style: aggro when on screen (or in range) or hit, chase
// while on screen, head home after a grace period off screen, re-aggro on the
// way. Each tick picks the AI by the enemy's kind; the melee Husk is here, the
// Wisp's casting in casterAi.ts and the Warden's slam in slammerAi.ts. A
// wind-up locks the attack direction; the attack lands once, then recovers.

/** Absorbs float error so a player exactly on the arc's edge is hit. */
const EPSILON = 1e-9;

/** Thinks, moves and faces every enemy in its own room, then pushes overlapping bodies apart. */
export function stepEnemies(state: SimState, bodies: (roomId: string) => RoomBodies): void {
  for (const e of state.enemies) {
    const { room, obstacles } = bodies(e.roomId);
    const def = defOf(e);
    if (e.cooldown > 0) e.cooldown -= 1;
    if (e.flash > 0) e.flash -= 1;
    if (e.blockFlash > 0) e.blockFlash -= 1;
    // A frozen enemy doesn't think (029): its wind-up pauses where it is. A chilled one walks slower.
    const thought: [number, number] = e.frozen > 0 ? [0, 0] : thinkOf(state, e, def);
    const slow = chillScale(e);
    // Claimed ground is safe (017): a chaser stops at the zone's edge, and a knock never carries it in either.
    const [mx, my] = keepOut(state, e, thought[0] * slow, thought[1] * slow);
    const [kx, ky] = takeKnock(e);
    const [dx, dy] = keepOut(state, e, mx + kx, my + ky);
    const { hitX, hitY } = moveBox(room, e, def.feetBox, dx, dy, obstacles);
    e.vx = hitX ? 0 : mx;
    e.vy = hitY ? 0 : my;
    e.bumped = hitX || hitY;
    // A shielded enemy (034) faces its shield's continuous angle.
    if (def.shield) e.facing = aimFacing(Math.cos(e.angle), Math.sin(e.angle), e.facing);
    else e.facing = attacking(e) ? aimFacing(e.swipeDirX, e.swipeDirY, e.facing) : aimFacing(e.vx, e.vy, e.facing);
    tickCold(state, e);
  }
  separate(state.enemies, bodies);
}

/** Each kind's AI: the Husk's here, the Wisp's, the Warden's, the Bulwark's (034) and Region 2's four (035) in their own files. */
function thinkOf(state: SimState, e: EnemyState, def: EnemyDef): [number, number] {
  switch (def.kind) {
    case 'melee':
      return think(state, e, def);
    case 'caster':
      return castThink(state, e, def);
    case 'slammer':
      return slamThink(state, e, def);
    case 'bulwark':
      return bulwarkThink(state, e, def);
    case 'charger':
      return chargeThink(state, e, def);
  }
}

function attacking(e: EnemyState): boolean {
  return e.mode === 'windup' || e.mode === 'swipe' || e.mode === 'recover';
}

/** Advances a Husk's mode and returns this tick's own move, px. */
function think(state: SimState, e: EnemyState, def: MeleeDef): [number, number] {
  const idle = engage(state, e, inAggroBox(e, state.player));
  if (idle) return idle;
  const attack = stepAttack(e, def, () => landSwipe(state, e, def));
  if (attack) return attack;
  const home = leash(e, def);
  if (home) return home;
  const dx = state.player.x - e.x;
  const dy = state.player.y - e.y;
  if (Math.hypot(dx, dy) > def.swipe.triggerRange) return toward(dx, dy, def);
  if (e.cooldown === 0) startWindup(e, def, dx, dy);
  // In range: stand and swing, or wait out the cooldown.
  return [0, 0];
}

/** Hits the player if their feet are inside the swipe arc, measured from where the enemy stands now. */
function landSwipe(state: SimState, e: EnemyState, def: MeleeDef): void {
  if (e.roomId !== state.roomId) return;
  const { swipe } = def;
  const dx = state.player.x - e.x;
  const dy = state.player.y - e.y;
  const dist = Math.hypot(dx, dy);
  if (dist > swipe.reach) return;
  const halfArc = (swipe.arcDegrees * Math.PI) / 360;
  if (dist > 0 && (dx * e.swipeDirX + dy * e.swipeDirY) / dist < Math.cos(halfArc) - EPSILON) return;
  const [kx, ky] = dist > 0 ? [dx / dist, dy / dist] : [e.swipeDirX, e.swipeDirY];
  damagePlayer(state, swipe.damage, kx, ky, swipe.knockback, swipe.knockTicks);
}
