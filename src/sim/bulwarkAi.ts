import { TILE_SIZE } from '../data/config';
import type { BulwarkDef } from '../data/enemies';
import { arenaOf } from '../data/hollows';
import { enter, hold, startWindup, stepAttack, toward, walkHome } from './aiCommon';
import { aggro, type EnemyState } from './enemies';
import { throwBombs } from './enemyBombs';
import { damagePlayer } from './health';
import { turnToward } from './shield';
import type { SimState } from './state';

// The Bulwark (034): it stands in its arena and wakes when the player's feet enter it.
// Engaged, it turns its shield toward the player (slowly: 40°/s) and walks at them; every
// so often it rears back and lobs bombs (still turning); up close it plants its shield and
// pounds the ground round itself, then recovers without turning, the window to punish it.
// It never leaves its arena, and walks home to heal after the player has been out of it a while.

/** It keeps this fraction of the pound's trigger range from the player rather than walking into them. */
const STAND_OFF = 0.75;

/** True if a feet point is inside a tile rect, px. */
const insidePx = (r: { x0: number; y0: number; x1: number; y1: number }, x: number, y: number): boolean =>
  x >= r.x0 * TILE_SIZE && x < (r.x1 + 1) * TILE_SIZE && y >= r.y0 * TILE_SIZE && y < (r.y1 + 1) * TILE_SIZE;

/** A move, with each axis dropped that would carry the feet out of the arena (it never steps out). */
function inArena(e: EnemyState, def: BulwarkDef, mx: number, my: number): [number, number] {
  const arena = arenaOf(e.enemyId);
  if (!arena) return [mx, my];
  const r = arena.inside;
  const hw = def.feetBox.w / 2;
  const hh = def.feetBox.h / 2;
  const okX = e.x + mx - hw >= r.x0 * TILE_SIZE && e.x + mx + hw <= (r.x1 + 1) * TILE_SIZE;
  const okY = e.y + my - hh >= r.y0 * TILE_SIZE && e.y + my + hh <= (r.y1 + 1) * TILE_SIZE;
  return [okX ? mx : 0, okY ? my : 0];
}

/** True while it fights: not idle, not walking home. */
export const engaged = (e: Pick<EnemyState, 'mode'>): boolean => e.mode !== 'idle' && e.mode !== 'return';

/** Hits the player if their feet are inside the pound's circle round its feet. */
function landPound(state: SimState, e: EnemyState, def: BulwarkDef): void {
  const { pound } = def;
  state.events.pounds.push({ id: e.id, x: e.x, y: e.y, radius: pound.radius });
  if (e.roomId !== state.roomId) return;
  const dx = state.player.x - e.x;
  const dy = state.player.y - e.y;
  const dist = Math.hypot(dx, dy);
  if (dist > pound.radius) return;
  const [kx, ky] = dist > 0 ? [dx / dist, dy / dist] : [e.swipeDirX, e.swipeDirY];
  damagePlayer(state, pound.damage, kx, ky, pound.knockback, pound.knockTicks);
}

/** Advances the Bulwark's mode and returns this tick's own move, px. */
export function bulwarkThink(state: SimState, e: EnemyState, def: BulwarkDef): [number, number] {
  const p = state.player;
  const arena = arenaOf(e.enemyId);
  const here = e.roomId === state.roomId && p.dying === 0;
  const playerIn = here && arena !== undefined && insidePx(arena.inside, p.x, p.y);
  // A dying player is gone: it turns for home at once (as every chaser does).
  if (engaged(e) && !here && p.dying > 0) {
    e.mode = 'return';
    e.modeTicks = 0;
  }
  if (e.mode === 'idle' || e.mode === 'return') {
    if (!playerIn) {
      if (e.mode === 'idle') return [0, 0];
      turnToward(e, e.homeX, e.homeY);
      return walkHome(e, def);
    }
    aggro(e);
    e.lobCooldown = def.lob.cooldownTicks;
  }
  if (e.lobCooldown > 0) e.lobCooldown -= 1;
  e.offScreenTicks = playerIn ? 0 : e.offScreenTicks + 1;
  // The pound: wind-up, pound and recovery, all without turning.
  const pounding = stepAttack(e, def, () => landPound(state, e, def));
  if (pounding) return pounding;
  if (e.mode === 'lob' || e.mode === 'throw') {
    turnToward(e, p.x, p.y);
    if (e.mode === 'lob') {
      if (e.modeTicks < def.lob.windupTicks) return hold(e);
      throwBombs(state, e);
      enter(e, 'throw');
      return [0, 0];
    }
    if (e.modeTicks < def.lob.throwTicks) return hold(e);
    e.mode = 'chase';
    e.modeTicks = 0;
  }
  if (e.offScreenTicks >= def.leashTicks) {
    e.mode = 'return';
    e.modeTicks = 0;
    return walkHome(e, def);
  }
  turnToward(e, p.x, p.y);
  const dx = p.x - e.x;
  const dy = p.y - e.y;
  const dist = Math.hypot(dx, dy);
  if (playerIn && dist <= def.pound.triggerRange && e.cooldown === 0) {
    startWindup(e, def, dx, dy);
    return [0, 0];
  }
  if (e.lobCooldown === 0 && here) {
    e.lobCooldown = def.lob.cooldownTicks;
    enter(e, 'lob');
    return [0, 0];
  }
  if (dist <= def.pound.triggerRange * STAND_OFF) return [0, 0];
  const [mx, my] = toward(dx, dy, def);
  return inArena(e, def, mx, my);
}
