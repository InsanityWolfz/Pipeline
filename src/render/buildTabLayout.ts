import { BUILD_TAB, LEGIBILITY_WORDS as W } from '../data/legibility';
import { TALENT_PANEL } from '../data/talentAssets';
import { KEYWORDS, type KeywordId } from '../data/keywords';
import { BASE_FAMILY, roundKeywords } from '../data/roundKeywords';
import { roundBase, roundTags, roundTier, tagDef, withTier } from '../data/tags';
import { TIERS } from '../data/tiers';
import { knownRounds } from '../sim/knownRounds';
import { describeRound, type Seen } from './describe';
import { chipsOf, fill } from './statSteps';
import type { Box } from './tipPlace';
import type { Chip } from './tipTypes';

// The T panel's Build tab (040), pure: every round the player knows (040.2) under a header
// per family (a family with none hidden), each row its shape and element chips, its final
// damage, shots/s and how many talents, relics and affixes change it; laid out in the panel
// at BUILD_TAB.rowH a row, in a second column only when one doesn't fit (031's rule). 062: a tiered round shares its
// stone round's row (the stone round's while it's known, its name marked with each known tier), so every round fits.

export interface BuildTabRow {
  round: string;
  name: string;
  icon: string;
  chips: Chip[];
  damage: string;
  perSecond: string;
  sources: number;
  sourcesText: string;
}

export interface BuildTabGroup {
  family: KeywordId;
  label: string;
  rows: BuildTabRow[];
}

/** A round's shape chip (if any) and its element: its damage type (040.3: Physical too). */
const shapeAndElement = (round: string): KeywordId[] => [
  ...roundTags(round)
    .map((t) => tagDef(t))
    .filter((t) => t.slot === 'shape')
    .map((t) => t.keyword),
  ...roundKeywords(round).filter((k) => KEYWORDS[k].group === 'damage-type'),
];

/** The known rounds by family, each with its numbers from its description (resolveStat through describe). */
export function buildTabGroups(seen: Seen, icon: (round: string) => string, name: (round: string) => string): BuildTabGroup[] {
  const known = knownRounds(seen);
  // Each stone kind once, in order: its stone round's row if known, else its first known tiered round's.
  const kinds = [...new Set(known.map((r) => withTier(r, 'stone')))];
  return Object.entries(BASE_FAMILY).flatMap(([base, family]) => {
    const rows = kinds
      .filter((r) => roundBase(r) === base)
      .map((stone) => {
        const same = known.filter((r) => withTier(r, 'stone') === stone);
        const round = same.includes(stone) ? stone : (same[0] ?? stone);
        const tiers = same.filter((r) => r !== round).flatMap((r) => {
          const t = roundTier(r);
          return t === 'stone' ? [] : [TIERS[t].prefix];
        });
        const d = describeRound(seen, round);
        const n = d.numbers ?? { damage: '', perSecond: '' };
        return {
          round,
          name: tiers.length > 0 ? fill(W.rowTiers, { name: name(round), tiers: tiers.join(', ') }) : name(round),
          icon: icon(round),
          chips: chipsOf(shapeAndElement(round)),
          damage: n.damage,
          perSecond: n.perSecond,
          sources: d.bonuses,
          sourcesText: fill(d.bonuses === 1 ? W.rowSource : W.rowSources, { count: d.bonuses }),
        };
      });
    return rows.length > 0 ? [{ family, label: KEYWORDS[family].name, rows }] : [];
  });
}

/** Where a row's fields sit in a column `columnW` wide, px from the column's left: the name's room, the chips' start (none in a compact column), each number's right edge. */
export interface RowFields {
  compact: boolean;
  name: { x: number; w: number };
  chipsX: number | null;
  damageRight: number;
  rateRight: number;
  sourcesRight: number;
}

export function rowFields(columnW: number): RowFields {
  const F = BUILD_TAB.fields;
  const compact = columnW < BUILD_TAB.compact.below;
  const sourcesRight = columnW;
  const rateRight = sourcesRight - (compact ? BUILD_TAB.compact.sourcesW : F.sourcesW);
  const damageRight = rateRight - F.rateW;
  const chipsX = compact ? null : damageRight - F.damageW - F.gap - F.chipsW;
  const nameEnd = (chipsX ?? damageRight - F.damageW) - F.gap;
  return { compact, name: { x: BUILD_TAB.name.x, w: nameEnd - BUILD_TAB.name.x }, chipsX, damageRight, rateRight, sourcesRight };
}

export interface BuildTabLayout {
  headers: { family: KeywordId; label: string; x: number; y: number }[];
  rows: { round: string; box: Box }[];
  columns: number;
  columnW: number;
}

/** Where the headers and rows sit in the panel: one column if they fit, else two, a header never last in a column. */
export function buildTabLayout(panel: Box, groups: readonly BuildTabGroup[]): BuildTabLayout {
  const pad = TALENT_PANEL.pad;
  const top = panel.y + BUILD_TAB.top;
  const perColumn = Math.floor((panel.y + panel.h - pad - top) / BUILD_TAB.rowH);
  const items = groups.flatMap((g) => [{ header: g }, ...g.rows.map((r) => ({ row: r }))]);
  const columns = items.length > perColumn ? BUILD_TAB.columns : 1;
  const inner = panel.w - 2 * pad;
  const columnW = columns === 1 ? inner : Math.floor((inner - (columns - 1) * BUILD_TAB.columnGap) / columns);
  const out: BuildTabLayout = { headers: [], rows: [], columns, columnW };
  let col = 0;
  let slot = 0;
  items.forEach((item, i) => {
    // A header never ends a column: it moves to the next with its rows.
    const full = slot >= perColumn || ('header' in item && slot === perColumn - 1 && i < items.length - 1);
    if (full && col < columns - 1) {
      col += 1;
      slot = 0;
    }
    const x = panel.x + pad + col * (columnW + BUILD_TAB.columnGap);
    const y = top + slot * BUILD_TAB.rowH;
    if ('header' in item) out.headers.push({ family: item.header.family, label: item.header.label, x, y });
    else out.rows.push({ round: item.row.round, box: { x, y, w: columnW, h: BUILD_TAB.rowH } });
    slot += 1;
  });
  return out;
}
