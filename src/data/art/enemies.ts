import type { EnemyRigDef } from './enemyRig';
import { HUSK_RIG } from './husk';
import { WARDEN_RIG } from './warden';
import { WISP_RIG } from './wisp';
import { BULWARK_RIG } from './bulwark';
import { FORGEWRIGHT_RIG } from './forgewright';
import { CHARGER_RIG } from './charger';
import { BURROWER_RIG } from './burrower';
import { SHARDBACK_RIG } from './shardback';
import { SNIPER_RIG } from './sniper';

/** Every enemy rig (016), one per `anims` key in src/data/enemies.ts. A new enemy is a new entry. */
export const ENEMY_RIGS: readonly EnemyRigDef[] = [HUSK_RIG, WISP_RIG, WARDEN_RIG, BULWARK_RIG, CHARGER_RIG, BURROWER_RIG, SHARDBACK_RIG, SNIPER_RIG, FORGEWRIGHT_RIG];
