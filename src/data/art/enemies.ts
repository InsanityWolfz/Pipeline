import type { EnemyRigDef } from './enemyRig';
import { HUSK_RIG } from './husk';
import { WARDEN_RIG } from './warden';
import { WISP_RIG } from './wisp';
import { BULWARK_RIG } from './bulwark';
import { FORGEWRIGHT_RIG } from './forgewright';
import { CONDUCTOR_RIG } from './conductor';
import { CHARGER_RIG } from './charger';
import { BURROWER_RIG } from './burrower';
import { SHARDBACK_RIG } from './shardback';
import { SNIPER_RIG } from './sniper';
import { CINDER_MOTE_RIG } from './cinderMote';
import { BELLOWS_HOUND_RIG } from './bellowsHound';
import { SLAG_GOLEM_RIG, SLAG_WHELP_RIG } from './slagGolem';
import { KILN_TENDER_RIG } from './kilnTender';
import { THUNDERHAWK_RIG } from './thunderhawk';
import { STATIC_MITE_RIG } from './staticMite';
import { STORM_SENTINEL_RIG } from './stormSentinel';

/** Every enemy rig (016), one per `anims` key in src/data/enemies.ts. A new enemy is a new entry. */
export const ENEMY_RIGS: readonly EnemyRigDef[] = [HUSK_RIG, WISP_RIG, WARDEN_RIG, BULWARK_RIG, CHARGER_RIG, BURROWER_RIG, SHARDBACK_RIG, SNIPER_RIG, FORGEWRIGHT_RIG, CONDUCTOR_RIG, CINDER_MOTE_RIG, BELLOWS_HOUND_RIG, SLAG_GOLEM_RIG, SLAG_WHELP_RIG, KILN_TENDER_RIG, THUNDERHAWK_RIG, STATIC_MITE_RIG, STORM_SENTINEL_RIG];
