import { RARITIES, type Affix, type GearPiece } from '../data/gear';
import { GEAR_PANEL, GEAR_SPRITES, RARITY_FRAMES } from '../data/gearAssets';
import { relicDef } from '../data/relics';
import { SPRITES } from '../data/assets';
import type { PlayerStats } from '../sim/stats';

// The words and icons the bench's gear panel shows (036), pure so tests can read them:
// an affix's label, a piece's lines, its icon and frame, and the totals.

const W = GEAR_PANEL.words;

/** One affix as the bench shows it: "+12 max HP", "+0.5 regen/s", "+4% speed", "+2 armor", "−4 roll cooldown", "+12 roll distance". */
export function affixLabel(a: Affix): string {
  switch (a.kind) {
    case 'max-health':
      return `+${a.value} max HP`;
    case 'armor':
      return `+${a.value} armor`;
    case 'regen':
      return `+${a.value.toFixed(1)} regen/s`;
    case 'move-speed':
      return `+${Math.round(a.value * 100)}% speed`;
    case 'roll-cooldown':
      return `−${a.value} roll cooldown`;
    case 'roll-distance':
      return `+${a.value} roll distance`;
  }
}

/** A piece's lines on its row: its name; "worn · heavy · armor 12" beside it; its affixes; a relic's rule (or null). */
export function pieceLines(p: GearPiece, worn: boolean): { name: string; detail: string; affixes: string; rule: string | null } {
  const detail = [worn ? W.worn : null, p.weight, `${W.armor} ${p.baseArmor}`].filter((t): t is string => t !== null).join(W.sep);
  return { name: p.name, detail, affixes: p.affixes.map(affixLabel).join(W.sep), rule: p.relic ? relicDef(p.relic).text : null };
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

/** The totals under the rows, two lines: armor, max HP and regen; walk speed and the roll's cooldown and distance. */
export function totalsLines(st: PlayerStats): [string, string] {
  const sep = W.sep;
  return [
    `Armor ${st.armor}${sep}Max HP ${st.maxHealth}${sep}Regen ${st.regen.toFixed(1)}/s`,
    `Speed ${Math.round(st.walkScale * 100)}%${sep}Roll cooldown ${st.rollCooldown}${sep}Roll ${Math.round(st.rollDistance)} px`,
  ];
}
