import type { Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../data/config';
import { GLOSSARY, TIP, type ChipId } from '../data/legibility';
import { describeKeyword, type Seen } from './describe';
import { RuleTip } from './RuleTip';
import { inBox, type Box } from './tipPlace';
import { texts, type Description } from './tipTypes';

/** The glossary entry as drawn, for `ui().glossary`. */
export interface GlossaryState {
  keyword: ChipId;
  lines: string[];
  box: Box;
}

// A keyword's glossary entry (040): a stone tablet centred above any open panel, at most
// 260 × 170, every word generated from 039's data (describeGlossary). Its chips open their
// own entries in its place. Esc or a click outside closes it; the world keeps running (031).
export class GlossaryView {
  private readonly tablet: RuleTip;
  private keyword: ChipId | null = null;
  private entry: Description | null = null;

  constructor(scene: Scene) {
    this.tablet = new RuleTip(scene, DEPTHS.menu + 20);
  }

  get isOpen(): boolean {
    return this.keyword !== null;
  }

  /** Opens a keyword's entry (replacing any open one). A keyword with no entry (reserved) opens nothing. */
  open(seen: Seen, id: ChipId): void {
    this.entry = describeKeyword(seen, id);
    this.keyword = this.entry ? id : null;
  }

  close(): void {
    this.keyword = null;
    this.entry = null;
    this.tablet.hide();
  }

  /** True if a view point is on the entry. */
  contains(x: number, y: number): boolean {
    const box = this.tablet.box;
    return box !== null && inBox(box, x, y);
  }

  /** The keyword of a chip on the entry under a view point, or null. */
  chipAt(x: number, y: number): ChipId | null {
    return this.isOpen ? this.tablet.chipAt(x, y) : null;
  }

  /** Draws the open entry centred on the view. */
  update(): void {
    const e = this.entry;
    if (!e) return;
    // Its rows fit 170 px however many rows its chips take (tipFit's textRoom).
    const content = { name: e.name, chips: e.chips, lines: e.breakdown, maxW: GLOSSARY.w, maxRows: TIP.maxLines, maxH: GLOSSARY.h };
    const { w, h } = this.tablet.measure(content);
    this.tablet.show(content, Math.round((VIEW_WIDTH - w) / 2), Math.round((VIEW_HEIGHT - h) / 2));
  }

  get state(): GlossaryState | null {
    const box = this.tablet.box;
    return this.keyword && this.entry && box ? { keyword: this.keyword, lines: texts(this.entry.breakdown), box } : null;
  }
}
