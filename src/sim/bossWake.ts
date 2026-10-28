import { defOf } from './champions';
import { lobCooldownOf } from './bulwarkPhases';
import { aggro, type EnemyState } from './enemies';

// A boss waking (034, 060, 064; 080: also as its intro ends): it starts chasing, and each boss sets up its fight, the
// Bulwark's first lob and the Forgewright's first spray on their cooldowns. One function, so the intro's end and
// today's wake can't drift apart.

/** Wakes an enemy: chasing, with its boss's wake set-up. */
export function wakeBoss(e: EnemyState): void {
  aggro(e);
  const def = defOf(e);
  if (def.kind === 'bulwark') e.lobCooldown = lobCooldownOf(e, def);
  if (def.kind === 'forgewright') e.lobCooldown = def.spray.cooldownTicks;
}
