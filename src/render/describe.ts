import { enemyDef } from '../data/enemies';
import { KEYWORDS } from '../data/keywords';
import type { ChipId } from '../data/legibility';
import type { EnemyState } from '../sim/enemies';
import { describeGear, describePiece, describeStage, describeTalent } from './describeContent';
import { describeKeyword } from './describeGlossary';
import { describeRound, type Seen } from './describeRound';
import { chipOf } from './statSteps';
import type { Chip, Description, TipSource } from './tipTypes';

// The describe module (040): what a round, a stage, a talent, a gear piece (relics included),
// a build-bar piece or a keyword says, as `{ chips, summary, breakdown }` from 039's data and
// the live sim state (resolveStat, playerStats, the keyword graph). Every number and keyword
// comes from data; it holds no rules text of its own. Pure (no Phaser), so tests read it.

export type { Seen } from './describeRound';
export { describeRound } from './describeRound';
export { describeGear, describePiece, describeStage, describeTalent } from './describeContent';
export { describeKeyword } from './describeGlossary';

/**
 * 050 (A.14): an inventory item that isn't a round, by its name alone. Its source's id is the name its slot shows (a
 * schematic folds under "Unknown schematic" until banked, 033), so the tip never names more than the slot does.
 */
function describeItem(name: string): Description {
  return { source: { kind: 'item', id: name }, name, chips: [], summary: [], breakdown: [], bonuses: 0 };
}

/** Whatever a tip's source is, described; null for a gear piece that's gone or a reserved keyword. */
export function describe(seen: Seen, src: TipSource): Description | null {
  switch (src.kind) {
    case 'round':
      return describeRound(seen, src.id);
    case 'stage':
      return describeStage(seen, src.id);
    case 'talent':
      return describeTalent(seen, src.id);
    case 'gear':
      return describeGear(seen, Number(src.id));
    case 'piece':
      return describePiece(src.id);
    case 'keyword':
      return describeKeyword(seen, src.id as ChipId);
    case 'item':
      return describeItem(src.id);
  }
}

/**
 * An enemy's chips on its hover name (040.4): its traits (Boss, Shield, Burrowed while underground), then its live
 * statuses ("Chill 2", "Freeze", "Stun"). Not clickable: a click in the world fires.
 */
export function enemyChips(e: Pick<EnemyState, 'enemyId' | 'chill' | 'frozen' | 'stunned' | 'underground'>): Chip[] {
  const def = enemyDef(e.enemyId);
  const ids: ChipId[] = [...(def.boss ? (['boss'] as const) : []), ...(def.shield ? (['shield'] as const) : []), ...(e.underground ? (['burrowed'] as const) : [])];
  const chips = ids.map(chipOf);
  if (e.chill > 0) chips.push({ ...chipOf('chill'), label: `${KEYWORDS.chill.name} ${e.chill}` });
  if (e.frozen > 0) chips.push(chipOf('freeze'));
  if (e.stunned > 0) chips.push(chipOf('stun'));
  return chips;
}
