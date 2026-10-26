import type { EnemyDef, MeleeDef } from '../data/enemies';
import { bulwarkThink } from './bulwarkAi';
import { forgewrightThink } from './forgewrightAi';
import { stepBellows } from './forgewrightParts';
import { conductorThink } from './conductorAi';
import { stepRods } from './conductorRods';
import { chargeThink } from './chargerAi';
import { burrowThink } from './burrowerAi';
import { shardThink } from './shardbackAi';
import { snipeThink } from './sniperAi';
import { moteThink } from './moteAi';
import { houndThink } from './houndAi';
import { golemThink } from './golemAi';
import { tenderThink } from './tenderAi';
import { hawkThink } from './hawkAi';
import { miteThink } from './miteAi';
import { sentinelThink } from './sentinelAi';
import { moveBody } from './flight';
import { defOf } from './champions';
import { castThink } from './casterAi';
import { chillScale, chillSlow, tickCold } from './cold';
import { aimFacing } from './direction';
import { aggro, type EnemyState } from './enemies';
import { separate, type RoomBodies } from './separation';
import { damagePlayer } from './health';
import { takeKnock } from './knockback';
import { keepOut } from './population';
import { slamThink } from './slammerAi';
import { holdStunned, stunHolds } from './stun';
import type { SimState } from './state';
import { engage, inAggroBox, inArc, leash, startWindup, stepAttack, toward } from './aiCommon';


// Enemy behaviour, RotMG style: aggro when on screen (or in range) or hit, chase
// while on screen, head home after a grace period off screen, re-aggro on the
// way. Each tick picks the AI by the enemy's kind; the melee Husk is here, the
// Wisp's casting in casterAi.ts and the Warden's slam in slammerAi.ts. A
// wind-up locks the attack direction; the attack lands once, then recovers.

/** Thinks, moves and faces every enemy in its own room, then pushes overlapping bodies apart. */
export function stepEnemies(state: SimState, bodies: (roomId: string) => RoomBodies): void {
  const slowPerStack = chillSlow(state);
  // The enemies at the tick's start: ones that rise this tick (041: the Bulwark's adds) first act next tick.
  const list = state.enemies;
  for (let i = 0, n = list.length; i < n; i++) {
    const e = list[i];
    // Gone this tick (041: adds sunk by their Bulwark's reset earlier in the loop): it doesn't act.
    if (!e || (state.enemies !== list && !state.enemies.includes(e))) continue;
    // Rising (041): it doesn't act or move; up from the ground, it wakes.
    if (e.rising > 0) {
      e.rising -= 1;
      if (e.rising === 0) aggro(e);
      continue;
    }
    const { room, obstacles } = bodies(e.roomId);
    const def = defOf(e);
    if (e.cooldown > 0) e.cooldown -= 1;
    if (e.flash > 0) e.flash -= 1;
    if (e.blockFlash > 0) e.blockFlash -= 1;
    // 060: the Forgewright's vent and broken bellows count down whatever it does, frozen too.
    if (def.kind === 'forgewright') stepBellows(state, e, def);
    // 064: the Conductor's broken rods regrow whatever it does, frozen too.
    if (def.kind === 'conductor') stepRods(state, e, def);
    // A frozen enemy doesn't think (029): its wind-up pauses where it is. A chilled one walks slower.
    // A Stunned one (039) holds, then chases again; a Charger's wall daze is its own think's (stun.ts).
    const thought: [number, number] = stunHolds(e) ? holdStunned(e) : e.frozen > 0 ? [0, 0] : thinkOf(state, e, def);
    const slow = chillScale(e, slowPerStack);
    // Claimed ground is safe (017): a chaser stops at the zone's edge, and a knock never carries it in either.
    const [mx, my] = keepOut(state, e, thought[0] * slow, thought[1] * slow);
    const [kx, ky] = takeKnock(e);
    const [dx, dy] = keepOut(state, e, mx + kx, my + ky);
    // 065: a flier flies over terrain (flight.ts).
    const { hitX, hitY } = moveBody(room, e, def, def.feetBox, dx, dy, obstacles);
    e.vx = hitX ? 0 : mx;
    e.vy = hitY ? 0 : my;
    e.bumped = hitX || hitY;
    // A shielded enemy (034), the Forgewright (060) and the Conductor (064) face their continuous angle.
    if (def.shield || def.kind === 'forgewright' || def.kind === 'conductor') e.facing = aimFacing(Math.cos(e.angle), Math.sin(e.angle), e.facing);
    else e.facing = attacking(e) ? aimFacing(e.swipeDirX, e.swipeDirY, e.facing) : aimFacing(e.vx, e.vy, e.facing);
    tickCold(state, e);
  }
  separate(state.enemies, bodies);
}

/** Each kind's AI: the Husk's here, the Wisp's, the Warden's, the Bulwark's (034), Region 2's four (035), the Emberworks' (061) and the Conductor's (064) in their own files. */
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
    case 'forgewright':
      return forgewrightThink(state, e, def);
    case 'charger':
      return chargeThink(state, e, def);
    case 'burrower':
      return burrowThink(state, e, def);
    case 'shardback':
      return shardThink(state, e, def);
    case 'sniper':
      return snipeThink(state, e, def);
    case 'mote':
      return moteThink(state, e, def);
    case 'hound':
      return houndThink(state, e, def);
    case 'golem':
      return golemThink(state, e, def);
    case 'tender':
      return tenderThink(state, e, def);
    case 'conductor':
      return conductorThink(state, e, def);
    case 'hawk':
      return hawkThink(state, e, def);
    case 'mite':
      return miteThink(state, e, def);
    case 'sentinel':
      return sentinelThink(state, e, def);
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
  if (!inArc(dx, dy, e.swipeDirX, e.swipeDirY, swipe.reach, swipe.arcDegrees)) return;
  const dist = Math.hypot(dx, dy);
  const [kx, ky] = dist > 0 ? [dx / dist, dy / dist] : [e.swipeDirX, e.swipeDirY];
  damagePlayer(state, swipe.damage, kx, ky, swipe.knockback, swipe.knockTicks);
}
