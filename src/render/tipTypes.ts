import type { ChipGroup, ChipId } from '../data/legibility';
import type { Anchor, Box } from './tipPlace';

// What the legibility UI (040) shows, pure: chips, the lines of a summary or breakdown with
// their tone, and a description of one thing. describe.ts builds them; RuleTip, the Build tab
// and the glossary draw them.

/** A chip: the keyword (or scope) it opens, its words, its group's colour. */
export interface Chip {
  id: ChipId;
  label: string;
  group: ChipGroup;
}

/** A chip laid out: where it sits, view px (world px for the enemy hover). */
export interface PlacedChip extends Chip {
  box: Box;
}

/** How a line or part reads: plain, dim, lit (a taken talent in Linked), a "when" line, or the bonus hint. */
export type Tone = 'text' | 'dim' | 'lit' | 'when' | 'hint';

export interface TipPart {
  text: string;
  tone?: Tone;
}

/** A line of a tablet: its whole text (as the hook reports it), its tone, or parts in their own tones. */
export interface TipLine {
  text: string;
  tone?: Tone;
  parts?: readonly TipPart[];
  /** A shorter form for a summary that would run past its rows ("Reaches: 5 rounds"; the full list is in the breakdown). */
  short?: string;
}

/** What a tablet can describe (040), and the build bar's other pieces (015's tip, now the same tablet). */
export type TipKind = 'round' | 'stage' | 'talent' | 'gear' | 'piece' | 'keyword';

export interface TipSource {
  kind: TipKind;
  id: string;
}

/** One thing described (040): its name and chips; its summary (hover) and breakdown (Shift) lines; how many bonuses change what it shows. */
export interface Description {
  source: TipSource;
  name: string;
  /** The name's palette colour (a gear piece's rarity), or the display face's own. */
  nameColor?: string;
  chips: Chip[];
  summary: TipLine[];
  breakdown: TipLine[];
  bonuses: number;
  /** A round's final damage and shots/s as its summary shows them (the Build tab's row reads these). */
  numbers?: { damage: string; perSecond: string };
}

/** A plain line. */
export const line = (text: string, tone?: Tone): TipLine => (tone ? { text, tone } : { text });

/** The lines' words, for tests and the hook. */
export const texts = (lines: readonly TipLine[]): string[] => lines.map((l) => l.text);

/** What a panel reports under the cursor (040): the thing's source and box, where its tablet goes, and whether it always shows the breakdown (a Build tab row). */
export interface TipHit {
  source: TipSource;
  /** The hovered thing, view px: the tablet stays while the cursor is here or on the tablet. */
  at: Box;
  anchor: Anchor;
  breakdown?: true;
  /** The tallest its summary may be, px (the talent tree's info strip, so it never covers a node). */
  maxH?: number;
}

/** A panel or HUD part that can show tips: what's under a view point, and (the Build tab) a chip there. */
export interface TipProvider {
  tipAt(x: number, y: number): TipHit | null;
  chipAt?(x: number, y: number): ChipId | null;
}
