import { MELEE } from '../data/combat';
import { TILE_SIZE } from '../data/config';
import { defOf } from './champions';
import type { Room } from '../data/rooms';
import { isSolid } from './collision';
import { damageEnemy, type HitStyle } from './enemies';
import { startKnock } from './knockback';
import { sectorHitsBox } from './sector';
import { roomById, type SimState } from './state';

// The punch (023): with no tube, or nothing to fire, fire throws a quick, weak
// punch toward the cursor. It resolves on the tick it starts.

/** A punch flashes and records physical damage; its knockback is its own, not the enemy's arrow knock. */
const PUNCH_HIT: HitStyle = { knock: false, flash: true, damageType: 'physical', melee: true };

/** The wall test walks the line this far at a time, px: well under a tile, so no wall is stepped over. */
const LINE_STEP = TILE_SIZE / 8;

/** True if no solid tile lies on the straight line from a to b. */
function clearLine(room: Room, ax: number, ay: number, bx: number, by: number): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / LINE_STEP));
  for (let i = 0; i <= steps; i++) {
    const x = ax + ((bx - ax) * i) / steps;
    const y = ay + ((by - ay) * i) / steps;
    if (isSolid(room, Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE))) return false;
  }
  return true;
}

/**
 * Punches along the unit aim (dirX, dirY) once both the melee cooldown and the
 * tube's fire interval have run out. Every live enemy in the player's room whose
 * hit box overlaps the arc, with no wall between, takes MELEE.damage; any that
 * isn't a boss is knocked straight away from the player. Records a melee event.
 */
export function punch(state: SimState, dirX: number, dirY: number): void {
  const { tube, player } = state;
  if (tube.meleeCooldown > 0 || tube.fireCooldown > 0) return;
  tube.meleeCooldown = MELEE.cooldownTicks;
  const room = roomById(state.roomId);
  const arc = { x: player.x, y: player.y, dirX, dirY, reach: MELEE.reach, arcDegrees: MELEE.arcDegrees };
  const hits: number[] = [];
  for (const e of state.enemies) {
    if (e.roomId !== state.roomId || e.health <= 0) continue;
    const def = defOf(e);
    const { hurtbox } = def;
    if (!sectorHitsBox(arc, { x: e.x, y: e.y + hurtbox.offsetY, w: hurtbox.w, h: hurtbox.h })) continue;
    if (!clearLine(room, player.x, player.y, e.x, e.y)) continue;
    hits.push(e.id);
    damageEnemy(state, e, MELEE.damage, dirX, dirY, PUNCH_HIT);
    if (def.boss) continue;
    // Straight away from the player; one standing right on them goes along the aim.
    const [ax, ay] = e.x === player.x && e.y === player.y ? [dirX, dirY] : [e.x - player.x, e.y - player.y];
    startKnock(e, ax, ay, MELEE.knockback, MELEE.knockTicks);
  }
  state.events.melees.push({ x: player.x, y: player.y, angle: Math.atan2(dirY, dirX), hits });
}
