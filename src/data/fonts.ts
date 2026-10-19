// Fonts (020): two open-licence faces bundled under assets/fonts (with their OFL
// licences), loaded locally at boot, no network. Cinzel, a carved roman serif, for
// titles, names and objectives; Source Sans 3, a clean sans, for numbers,
// readouts and descriptions. Sizes are view px (the 640x360 view); text is
// rendered at the screen's resolution so it stays sharp when scaled.

/** A bundled font: the family name it registers under, its file in assets/fonts, and its licence file beside it. */
export interface FontFile {
  readonly family: string;
  readonly file: string;
  readonly licence: string;
}

export const FONT_FILES = {
  display: { family: 'Cinzel', file: 'Cinzel.ttf', licence: 'Cinzel-OFL.txt' },
  body: { family: 'Source Sans 3', file: 'SourceSans3.ttf', licence: 'SourceSans3-OFL.txt' },
} as const satisfies Record<string, FontFile>;

export type FontKey = keyof typeof FONT_FILES;

/**
 * A text style: its font, size and weight, fill and outline (palette ids), and its
 * line height, all view px. `upper` draws it in capitals.
 */
export interface TextStyle {
  readonly font: FontKey;
  readonly size: number;
  readonly weight: number;
  readonly fill: string;
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly lineHeight: number;
  readonly upper?: boolean;
}

export type TextStyleKey = 'body' | 'count' | 'label' | 'display' | 'title' | 'float' | 'chip';

export const TEXT_STYLES: Readonly<Record<TextStyleKey, TextStyle>> = {
  /** Counts, readouts, key caps, descriptions. */
  body: { font: 'body', size: 8, weight: 600, fill: 'snow', stroke: 'ink', strokeWidth: 0, lineHeight: 9 },
  /** Small numbers on the hotbar, crates and pickers: an outline so they read over art. */
  count: { font: 'body', size: 7, weight: 700, fill: 'snow', stroke: 'ink', strokeWidth: 1.6, lineHeight: 8 },
  /** Small item names under the crafting menu's icons (026). */
  label: { font: 'body', size: 6, weight: 700, fill: 'snow', stroke: 'ink', strokeWidth: 1.2, lineHeight: 7 },
  /** Names and the objective line. */
  display: { font: 'display', size: 8, weight: 700, fill: 'snow', stroke: 'ink', strokeWidth: 0, lineHeight: 9 },
  /** Titles: the pause card and the wake text. */
  title: { font: 'display', size: 14, weight: 700, fill: 'snow', stroke: 'ink', strokeWidth: 2.4, lineHeight: 16 },
  /** Damage numbers and pickup popups, floating in the world. */
  float: { font: 'body', size: 8, weight: 800, fill: 'snow', stroke: 'ink', strokeWidth: 2, lineHeight: 9 },
  /** A keyword chip's name (040), on its group's colour. */
  chip: { font: 'body', size: 7, weight: 700, fill: 'snow', stroke: 'ink', strokeWidth: 1.2, lineHeight: 8 },
};
