import type { GameObjects, Scene } from 'phaser';
import { TIP } from '../data/legibility';
import { UNITS } from '../data/rulesText';
import { ChipLabels, drawChip, flowChips } from './KeywordChip';
import { fitRows, textRoom } from './tipFit';
import { drawTablet } from './tablet';
import { TextLine } from './textLine';
import { inBox, type Box } from './tipPlace';
import type { Chip, PlacedChip, TipLine, Tone } from './tipTypes';

/** What a tablet shows: a name (in the display face) with its chips after it, then lines wrapped to `maxW`. */
export interface TipContent {
  name: string;
  nameColor?: string;
  chips: readonly Chip[];
  lines: readonly TipLine[];
  /** The tablet's widest, px. */
  maxW: number;
  /** The most rows it holds, name and chip rows included (a summary's 4, the breakdown's 16); a cut line ends with "…". */
  maxRows: number;
  /** The tallest it may be, px (the glossary's 170, the talent tree's info strip). */
  maxH?: number;
}

/** A row's words: each run of one tone, where it starts. */
interface Run {
  text: string;
  tone: Tone;
  x: number;
}

const toneColor = (t: Tone): string => TIP.colors[t];

// A rule tablet (040): a 020 stone tablet with brass corners, the name in the display face and
// its keyword chips flowing after it (a second row only if they don't fit), then its lines in
// the body face, word-wrapped to the width, each run of words in its tone (Linked's taken
// names lit). It lays itself out for its content and is placed by the caller. The hover tip
// and the glossary entry are both one.
export class RuleTip {
  private readonly scene: Scene;
  private readonly depth: number;
  private readonly g: GameObjects.Graphics;
  private readonly name: TextLine;
  private readonly labels: ChipLabels;
  private readonly runs: TextLine[] = [];
  private readonly widths = new Map<string, number>();
  private scratch: TextLine | null = null;
  private space = 0;
  private key = '';
  private size = { w: 0, h: 0 };
  private rows: Run[][] = [];
  /** The chips laid out, px from the tablet's top-left; and as last drawn, view px. */
  private chips: PlacedChip[] = [];
  private drawn: PlacedChip[] = [];
  private chipRows = 1;
  private cut = false;
  private shownBox: Box | null = null;

  constructor(scene: Scene, depth: number) {
    this.scene = scene;
    this.depth = depth;
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(depth);
    this.name = new TextLine(scene, 0, 0, depth + 2, false, 'display').setVisible(false);
    this.labels = new ChipLabels(scene, depth + 2);
  }

  /** The tablet's box while it shows, view px. */
  get box(): Box | null {
    return this.shownBox;
  }

  /** The chips as drawn, view px. */
  get placedChips(): readonly PlacedChip[] {
    return this.shownBox ? this.drawn : [];
  }

  /** The keyword of the chip under a view point, or null. */
  chipAt(x: number, y: number): Chip['id'] | null {
    return this.placedChips.find((c) => inBox(c.box, x, y))?.id ?? null;
  }

  /** Lays the content out (only when it changed) and returns its size, px. */
  measure(content: TipContent): { w: number; h: number } {
    const key = JSON.stringify(content);
    if (key !== this.key) {
      this.key = key;
      this.layout(content);
    }
    return this.size;
  }

  /** Shows the content with its top-left at (x, y), view px. */
  show(content: TipContent, x: number, y: number): void {
    const { w, h } = this.measure(content);
    this.shownBox = { x, y, w, h };
    const g = this.g.clear().setVisible(true);
    drawTablet(g, x, y, w, h);
    const P = TIP.pad;
    this.name.set(content.name).setFill(content.nameColor).setVisible(true).moveTo(x + P, y + P + 3);
    // The laid-out chips are relative to the tablet; the drawn ones are on screen.
    this.drawn = this.chips.map((c) => ({ ...c, box: { ...c.box, x: c.box.x + x, y: c.box.y + y } }));
    for (const c of this.drawn) drawChip(g, c.box, c.group);
    this.labels.show(this.drawn);
    const top = y + P + this.chipRows * TIP.nameRow;
    let i = 0;
    this.rows.forEach((row, r) => {
      for (const run of row) {
        const line = this.runs[i] ?? this.addRun();
        line.set(run.text).setFill(toneColor(run.tone)).setVisible(true).moveTo(x + P + run.x, top + r * TIP.lineHeight + 1);
        i += 1;
      }
    });
    for (; i < this.runs.length; i++) this.runs[i]?.setVisible(false);
  }

  hide(): void {
    this.shownBox = null;
    this.g.clear().setVisible(false);
    this.name.setVisible(false);
    this.labels.hide();
    for (const r of this.runs) r.setVisible(false);
  }

  private addRun(): TextLine {
    const line = new TextLine(this.scene, 0, 0, this.depth + 2, false, 'body');
    this.runs.push(line);
    return line;
  }

  /** A word's width in the body face, px (measured once). */
  private wordWidth(word: string): number {
    let w = this.widths.get(word);
    if (w === undefined) {
      this.scratch ??= new TextLine(this.scene, 0, 0, this.depth, false, 'body').setVisible(false);
      if (this.space === 0) this.space = this.scratch.set('a a').width - this.scratch.set('aa').width;
      w = this.scratch.set(word).width;
      this.widths.set(word, w);
    }
    return w;
  }

  private layout(c: TipContent): void {
    const P = TIP.pad;
    const inner = c.maxW - 2 * P;
    const nameW = Math.ceil(this.name.set(c.name).width);
    const flow = flowChips(c.chips, (l) => this.labels.width(l), { x: 0, y: 1, firstX: nameW + TIP.nameGap, right: inner, rowStep: TIP.nameRow });
    this.chipRows = Math.max(1, flow.rows);
    // Each line wrapped (and its short form), then fitted: the hint always shows, a short form before any cut (tipFit).
    const form = (l: TipLine, text: string | undefined) => (text === undefined ? undefined : this.wrap({ text, ...(l.tone ? { tone: l.tone } : {}) }, inner));
    const lines = c.lines.map((l) => {
      const short = form(l, l.short);
      const shorter = form(l, l.shorter);
      return { rows: this.wrap(l, inner), ...(short ? { short } : {}), ...(shorter ? { shorter } : {}), keep: l.tone === 'hint' };
    });
    const fit = fitRows(lines, textRoom(this.chipRows, c.maxRows, c.maxH), (row) => {
      const last = row[row.length - 1];
      return last ? [...row.slice(0, -1), { ...last, text: `${last.text}${TIP.more}` }] : row;
    });
    // Each run starts where the one before it ends, as drawn (a run's width isn't quite its words' and spaces' sum).
    let widest = Math.max(nameW, ...flow.placed.map((p) => p.box.x + p.box.w));
    for (const row of fit.rows) {
      let x = 0;
      for (const run of row) {
        run.x = x;
        x += this.wordWidth(run.text) + this.space;
      }
      widest = Math.max(widest, x - this.space);
    }
    this.rows = fit.rows;
    this.cut = fit.cut;
    this.chips = flow.placed.map((p) => ({ ...p, box: { ...p.box, x: p.box.x + P, y: p.box.y + P } }));
    this.size = { w: Math.min(c.maxW, Math.ceil(widest) + 2 * P), h: this.chipRows * TIP.nameRow + fit.rows.length * TIP.lineHeight + 2 * P };
  }

  /** A line's words in their tones, wrapped greedily to `inner` px, as rows of runs. */
  private wrap(l: TipLine, inner: number): Run[][] {
    const words = glue((l.parts ?? [{ text: l.text, tone: l.tone }]).flatMap((p) => p.text.split(' ').filter((w) => w !== '').map((w) => ({ w, tone: p.tone ?? l.tone ?? 'text' }))));
    const rows: Run[][] = [];
    let row: { w: string; tone: Tone; x: number }[] = [];
    let x = 0;
    for (const word of words) {
      const w = this.wordWidth(word.w);
      if (x > 0 && x + w > inner) {
        rows.push(runsOf(row));
        row = [];
        x = 0;
      }
      row.push({ ...word, x });
      x += w + this.space;
    }
    if (row.length > 0) rows.push(runsOf(row));
    return rows;
  }

  /** The rows drawn (name and chip rows included) and whether a line was cut, for the hook. */
  get drawnRows(): { rows: number; cut: boolean } {
    return { rows: this.chipRows + this.rows.length, cut: this.cut };
  }
}

/** A unit after a number ("0.21 s", "48 px") never starts a row: it's glued to its number (rulesText's units). */
const UNIT = new RegExp(`^(${Object.values(UNITS).map((u) => u.replace('/', '\\/')).join('|')})[.,;)]*$`);

function glue(words: { w: string; tone: Tone }[]): { w: string; tone: Tone }[] {
  const out: { w: string; tone: Tone }[] = [];
  for (const word of words) {
    const last = out[out.length - 1];
    if (last && UNIT.test(word.w) && last.tone === word.tone) last.w = `${last.w} ${word.w}`;
    else out.push({ ...word });
  }
  return out;
}

/** A row's words joined into runs of one tone. */
function runsOf(row: readonly { w: string; tone: Tone; x: number }[]): Run[] {
  const runs: Run[] = [];
  for (const word of row) {
    const last = runs[runs.length - 1];
    if (last && last.tone === word.tone) last.text += ` ${word.w}`;
    else runs.push({ text: word.w, tone: word.tone, x: word.x });
  }
  return runs;
}
