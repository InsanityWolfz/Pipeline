import type { SniperDef } from '../data/hollowsEnemies';
import { engage, inAggroBox, leash, startWindup, stepAttack, toward } from './aiCommon';
import { coverSpot, peekSpot, type Spot } from './cover';
import type { EnemyState } from './enemies';
import { castOrb } from './orbs';
import { clearShot, shotReach } from './sightLine';
import { roomById, type SimState } from './state';
import { unit } from './direction';

// The Sniper construct (035): a tall tripod with one ley lens. It aggros from farther than
// anything else, slips behind cover (worked out from the tile grid) while its cooldown runs,
// then steps out to a tile that sees the player and paints them with its laser: tracking
// (a line blocked by a solid cancels it, and it steps out again), then locked and blinking,
// the cue to dodge. It fires one fast bolt down the locked line and goes back to cover.
// Crowded, it retreats to cover farther away instead of shooting.

/** Advances a Sniper's mode and returns this tick's own move, px. */
export function snipeThink(state: SimState, e: EnemyState, def: SniperDef): [number, number] {
  const { snipe } = def;
  const p = state.player;
  const dx = p.x - e.x;
  const dy = p.y - e.y;
  const dist = Math.hypot(dx, dy);
  const here = e.roomId === state.roomId;
  const idle = engage(state, e, inAggroBox(e, p) || dist <= snipe.aggroRange);
  if (idle) return idle;
  // Its long sight keeps it engaged beyond the screen.
  if (here && dist <= snipe.aggroRange) e.offScreenTicks = 0;
  const room = roomById(e.roomId);
  // Tracking for the wind-up's first `trackTicks` ticks (its start among them), then locked.
  if (e.mode === 'windup' && e.modeTicks < snipe.trackTicks) {
    if (here && clearShot(room, e.x, e.y, p.x, p.y)) [e.swipeDirX, e.swipeDirY] = unit(dx, dy);
    else {
      // The line is blocked: the shot is off, and it steps out again at once.
      e.cooldown = 0;
      e.mode = 'peek';
      e.modeTicks = 0;
    }
  }
  const attack = stepAttack(e, def, () => fire(state, e));
  if (attack) return attack;
  const home = leash(e, def);
  if (home) return home;
  if (!here) return [0, 0];
  if (dist < snipe.backOff) {
    e.mode = 'chase';
    const away = coverSpot(state, e, def, dist);
    return away ? walkTo(e, def, away) : toward(-dx, -dy, def);
  }
  if (e.cooldown === 0) {
    if (clearShot(room, e.x, e.y, p.x, p.y)) {
      startWindup(e, def, dx, dy);
      return [0, 0];
    }
    // Step out to a tile that sees them, or with none in a step, close in until one does.
    e.mode = 'peek';
    const peek = peekSpot(state, e, def);
    return peek ? walkTo(e, def, peek) : toward(dx, dy, def);
  }
  e.mode = 'chase';
  const cover = coverSpot(state, e, def);
  if (cover) return walkTo(e, def, cover);
  // No cover in reach: keep its distance in the open, as the Wisp (009).
  const off = dist - snipe.keepAway;
  if (Math.abs(off) < snipe.settle) return [0, 0];
  const [sx, sy] = toward(dx, dy, def);
  const scale = Math.min(1, Math.abs(off) / Math.hypot(sx, sy)) * Math.sign(off);
  return [sx * scale, sy * scale];
}

const walkTo = (e: EnemyState, def: SniperDef, to: Spot): [number, number] => toward(to.x - e.x, to.y - e.y, def);

/** Fires its bolt along the locked line (an enemy projectile, in the orbs' list). */
function fire(state: SimState, e: EnemyState): void {
  castOrb(state, e);
  state.events.snipes.push({ id: e.id, x: e.x, y: e.y, dx: e.swipeDirX, dy: e.swipeDirY });
}

/** Its phase (035: getState): in cover or in the open while it waits, stepping out, the sight tracking or locked, firing. */
export type SnipePhase = 'idle' | 'return' | 'cover' | 'open' | 'peek' | 'tracking' | 'locked' | 'fire';

export function snipePhase(state: SimState, e: EnemyState, def: SniperDef): SnipePhase {
  switch (e.mode) {
    case 'idle':
    case 'return':
    case 'peek':
      return e.mode;
    case 'windup':
      return e.modeTicks < def.snipe.trackTicks ? 'tracking' : 'locked';
    case 'swipe':
    case 'recover':
      return 'fire';
    default:
      return clearShot(roomById(e.roomId), e.x, e.y, state.player.x, state.player.y) ? 'open' : 'cover';
  }
}

/** Its laser's ground line while it winds up, else null: to the player's feet while tracking, along the locked aim to the first solid (or its range) once locked. */
export function snipeLine(state: SimState, e: EnemyState, def: SniperDef): { x0: number; y0: number; x1: number; y1: number } | null {
  if (e.mode !== 'windup') return null;
  if (e.modeTicks < def.snipe.trackTicks) return { x0: e.x, y0: e.y, x1: state.player.x, y1: state.player.y };
  const reach = shotReach(roomById(e.roomId), e.x, e.y, e.swipeDirX, e.swipeDirY, def.snipe.range);
  return { x0: e.x, y0: e.y, x1: e.x + e.swipeDirX * reach, y1: e.y + e.swipeDirY * reach };
}
