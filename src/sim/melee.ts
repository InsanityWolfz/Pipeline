import { MELEE } from '../data/combat';
import type { Room } from '../data/rooms';
import { defOf } from './champions';
import { damageEnemy, immune, targetable, type EnemyState, type HitStyle } from './enemies';
import { startKnock } from './knockback';
import { sectorHitsBox, type Sector } from './sector';
import { recordBlock, shieldBlocks } from './shield';
import { hitPart, wholeParts } from './bossParts';
import { roomById, type SimState } from './state';
import { clearGround } from './sightLine';

// The punch (023): with no tube, or nothing to fire, fire throws a quick, weak
// punch toward the cursor. It resolves on the tick it starts.

/** A punch flashes and records physical damage; its push is its own, not Knockback (039.5). */
const PUNCH_HIT: HitStyle = { knock: 0, flash: true, damageType: 'physical', melee: true };

/** A boss's whole parts a punch's arc strikes (060: the Forgewright's bellows; 064: the Conductor's rods), each over clear ground from the player to its own point. */
function struckParts(room: Room, arc: Sector, e: EnemyState): number[] {
  return wholeParts(e).flatMap(({ part, box, point }) => (sectorHitsBox(arc, box) && clearGround(room, arc.x, arc.y, point.x, point.y) ? [part] : []));
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
    if (e.roomId !== state.roomId || e.health <= 0 || immune(e)) continue;
    const def = defOf(e);
    const { hurtbox } = def;
    // 060: each of the Forgewright's whole bellows in the arc takes the punch, which spends itself there: no clang on
    // its plated body, and nothing on the body a break just vented. Else its plated body blocks it (damageEnemy).
    const parts = struckParts(room, arc, e);
    for (const part of parts) hitPart(state, e, part, MELEE.damage, PUNCH_HIT);
    // 068: a body it can't reach yet (the Conductor blinking in) takes nothing.
    if (parts.length > 0 || !targetable(e)) continue;
    if (!sectorHitsBox(arc, { x: e.x, y: e.y + hurtbox.offsetY, w: hurtbox.w, h: hurtbox.h })) continue;
    if (!clearGround(room, player.x, player.y, e.x, e.y)) continue;
    // Into a shield's front (034): no damage, no knockback, a block between them.
    if (shieldBlocks(e, player.x, player.y)) {
      recordBlock(state, e, (e.x + player.x) / 2, (e.y + player.y) / 2);
      continue;
    }
    hits.push(e.id);
    damageEnemy(state, e, MELEE.damage, dirX, dirY, PUNCH_HIT);
    if (def.boss) continue;
    // Straight away from the player; one standing right on them goes along the aim.
    const [ax, ay] = e.x === player.x && e.y === player.y ? [dirX, dirY] : [e.x - player.x, e.y - player.y];
    startKnock(e, ax, ay, MELEE.knockback, MELEE.knockTicks);
  }
  state.events.melees.push({ x: player.x, y: player.y, angle: Math.atan2(dirY, dirX), hits });
}
