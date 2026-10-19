import { affixLine, RARITIES, type Affix, type GearPiece } from '../data/gear';
import { isRuleLine, type ContentLine } from '../data/lines';
import { ROLL_DISTANCE } from '../data/player';
import { changeText, formatStat, ruleText, scopeName } from '../data/rulesText';
import { STATS, type StatId } from '../data/statDefs';
import { GEAR_PANEL, GEAR_SPRITES, RARITY_FRAMES } from '../data/gearAssets';
import { relicDef } from '../data/relics';
import { SPRITES } from '../data/assets';
import type { PlayerStats } from '../sim/stats';

// The words and icons the bench's gear panel shows (036), pure so tests can read them:
// an affix's label, a piece's lines, its icon and frame, and the totals.

const W = GEAR_PANEL.words;

/** One affix as the bench shows it (039: generated, its scope You left implied): "+12 max health", "+0.5 HP/s field regen", "−15% roll cooldown". */
export function affixLabel(a: Affix): string {
  return changeText(affixLine(a));
}

/** A gear line on a row: a You line without its scope (every gear line is the player's), any other with it. */
export function gearLineText(l: ContentLine): string {
  const body = isRuleLine(l) ? ruleText(l) : changeText(l);
  return l.scope === 'you' ? body.charAt(0).toUpperCase() + body.slice(1) : `${scopeName(l.scope)}: ${body}`;
}

/** A piece's lines on its row: its name; "Rare · worn · heavy · armor 12" beside it (the rarity in words as well as colour); its affixes; a relic's rule (or null). */
export function pieceLines(p: GearPiece, worn: boolean): { name: string; detail: string; affixes: string; rule: string | null } {
  const detail = [RARITIES[p.rarity].name, worn ? W.worn : null, p.weight, `${W.armor} ${p.baseArmor}`].filter((t): t is string => t !== null).join(W.sep);
  return { name: p.name, detail, affixes: p.affixes.map(affixLabel).join(W.sep), rule: p.relic ? relicDef(p.relic).lines.map(gearLineText).join(W.sep) : null };
}

/** A piece's icon: a relic's own, the body's by weight (010), else its slot's. */
export function pieceIcon(p: Pick<GearPiece, 'slot' | 'weight' | 'relic'>): string {
  if (p.relic) return relicDef(p.relic).icon;
  if (p.slot === 'body') return p.weight === 'heavy' ? SPRITES.iconArmorHeavy : SPRITES.iconArmorLight;
  return GEAR_SPRITES[p.slot];
}

/** A slot's icon with nothing worn there (the body's light icon). */
export function slotIcon(slot: GearPiece['slot']): string {
  return slot === 'body' ? SPRITES.iconArmorLight : GEAR_SPRITES[slot];
}

/** A piece's frame and the colour its name is drawn in. */
export function rarityLook(p: Pick<GearPiece, 'rarity'>): { frame: string; color: string } {
  return { frame: RARITY_FRAMES[p.rarity], color: RARITIES[p.rarity].color };
}

/** A stat's label as a total's name: "Max health". */
const named = (id: StatId): string => STATS[id].label.charAt(0).toUpperCase() + STATS[id].label.slice(1);

/**
 * The totals under the rows, two lines, each stat by its one label and unit (039, STATS): armor, max health and field
 * regen; move speed, roll cooldown in seconds and roll distance as a share of the bare roll (no px in a summary, Q14).
 */
export function totalsLines(st: PlayerStats): [string, string] {
  const sep = W.sep;
  return [
    `${named('armor')} ${st.armor}${sep}${named('max-health')} ${st.maxHealth}${sep}${named('field-regen')} ${formatStat(st.regen, 'hp-per-s')}`,
    `${named('move-speed')} ${formatStat(st.walkScale, 'fraction')}${sep}${named('roll-cooldown')} ${formatStat(st.rollCooldown, 'seconds')}${sep}${named('roll-distance')} ${formatStat(st.rollDistance / ROLL_DISTANCE, 'fraction')}`,
  ];
}
