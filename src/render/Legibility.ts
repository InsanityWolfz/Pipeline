import type { Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { TIP, type ChipId } from '../data/legibility';
import type { SimState } from '../sim/state';
import { describe } from './describe';
import { GlossaryView, type GlossaryState } from './GlossaryView';
import { RuleTip, type TipContent } from './RuleTip';
import { loadoutKey } from './loadoutKey';
import { AMMO } from '../data/ammo';
import { STAGES } from '../data/stages';
import { TALENT_LIST } from '../data/talents';
import { inBox, placeTip, type Box } from './tipPlace';
import { texts, type Description, type TipHit, type TipProvider, type TipSource } from './tipTypes';

/** The tip as drawn, for `ui().tip`. */
export interface TipState {
  source: TipSource;
  mode: 'summary' | 'breakdown';
  name: string;
  chips: ChipId[];
  /** Each chip as drawn, view px (to click one). */
  chipBoxes: { id: ChipId; box: Box }[];
  lines: string[];
  box: Box;
}

/** The legibility UI's part of `ui()`. */
export interface LegibilityUi {
  tip: TipState | null;
  glossary: GlossaryState | null;
}

export const NO_LEGIBILITY_UI: LegibilityUi = { tip: null, glossary: null };

/** A description as a tablet's content: its summary (at most four rows, and inside `fit` when docked) or its breakdown (16 rows). */
function tipContent(d: Description, summary: boolean, fit: { maxH?: number; maxW?: number } = {}): TipContent {
  const { maxH, maxW } = fit;
  return {
    name: d.name,
    ...(d.nameColor ? { nameColor: d.nameColor } : {}),
    chips: d.chips,
    lines: summary ? d.summary : d.breakdown,
    maxW: summary ? Math.min(TIP.summaryW, maxW ?? TIP.summaryW) : TIP.breakdownW,
    maxRows: summary ? TIP.summaryRows : TIP.maxLines,
    ...(maxH !== undefined ? { maxH } : {}),
  };
}


// The legibility UI (040): the panels and HUD report what's under the cursor; the hover tablet
// shows its summary beside it, or its breakdown while Shift is held (a Build tab row always
// shows its breakdown). The tablet stays while the cursor is on its source or on the tablet,
// with TIP.graceMs on leaving (040.1), so its chips can be clicked: a chip opens its keyword's
// glossary entry, as a Build tab row's chips do. While the glossary is open the whole screen is
// its: a click outside closes it and never fires, and Esc closes it first.
export class Legibility {
  private readonly tip: RuleTip;
  private readonly glossary: GlossaryView;
  private readonly providers: readonly TipProvider[];
  private current: { hit: TipHit; provider: TipProvider } | null = null;
  private grace = 0;
  private shown: { desc: Description; key: string; mode: TipState['mode'] } | null = null;
  private sim: SimState | null = null;
  private readonly scene: Scene;
  private measurer: RuleTip | null = null;

  constructor(scene: Scene, providers: readonly (TipProvider | undefined)[]) {
    this.scene = scene;
    this.tip = new RuleTip(scene, DEPTHS.menu + 10);
    this.glossary = new GlossaryView(scene);
    this.providers = providers.filter((p): p is TipProvider => p !== undefined);
  }

  /** The glossary is open (the menu pointer shows, 021). */
  get isOpen(): boolean {
    return this.glossary.isOpen;
  }

  /** A press here is the tablet's, never a shot: the tip's tablet, or anywhere while the glossary is open. */
  overUi(x: number, y: number): boolean {
    const box = this.tip.box;
    return this.glossary.isOpen || (box !== null && inBox(box, x, y));
  }

  /** Esc: closes the glossary if it's open. Returns whether it took the press. */
  close(): boolean {
    if (!this.glossary.isOpen) return false;
    this.glossary.close();
    return true;
  }

  /**
   * A click: a chip opens its entry; any click on the tip's tablet is the tablet's, so nothing under it (a node, a bench
   * row, the build bar) takes it; with the glossary open, a click outside it closes it. Returns whether it was taken.
   */
  click(x: number, y: number): boolean {
    if (this.glossary.isOpen) {
      const chip = this.glossary.chipAt(x, y);
      if (chip) this.openEntry(chip);
      else if (!this.glossary.contains(x, y)) this.glossary.close();
      return true;
    }
    const box = this.tip.box;
    const onTip = box !== null && inBox(box, x, y);
    const chip = this.tip.chipAt(x, y) ?? (onTip ? null : (this.providers.map((p) => p.chipAt?.(x, y) ?? null).find((c) => c !== null) ?? null));
    if (chip) this.openEntry(chip);
    return chip !== null || onTip;
  }

  private openEntry(id: ChipId): void {
    if (!this.sim) return;
    this.glossary.open(this.sim, id);
    this.current = null;
    this.hideTip();
  }

  /** Each frame, after the panels: what the cursor is over (view px; none over the pause menu), Shift, and the frame's real time. */
  update(sim: SimState, pointer: { x: number; y: number } | null, shift: boolean, deltaMs: number): void {
    this.sim = sim;
    this.glossary.update();
    if (this.glossary.isOpen || !pointer) {
      this.current = null;
      this.hideTip();
      return;
    }
    const box = this.tip.box;
    const onTip = box !== null && inBox(box, pointer.x, pointer.y);
    const kept = this.current && this.stillThere(this.current) ? this.current : null;
    if (onTip && kept) this.grace = TIP.graceMs;
    else {
      const hit = this.hitAt(pointer.x, pointer.y);
      if (hit) {
        this.current = hit;
        this.grace = TIP.graceMs;
      } else {
        this.grace -= deltaMs;
        if (!kept || this.grace <= 0) this.current = null;
      }
    }
    this.draw(sim, shift);
  }

  /** The first provider with something under the point. */
  private hitAt(x: number, y: number): { hit: TipHit; provider: TipProvider } | null {
    for (const provider of this.providers) {
      const hit = provider.tipAt(x, y);
      if (hit) return { hit, provider };
    }
    return null;
  }

  /** Whether the hovered thing is still there (its panel open, the same thing at its spot). */
  private stillThere(c: { hit: TipHit; provider: TipProvider }): boolean {
    const { at, source } = c.hit;
    const now = c.provider.tipAt(at.x + at.w / 2, at.y + at.h / 2);
    return now !== null && now.source.kind === source.kind && now.source.id === source.id;
  }

  private draw(sim: SimState, shift: boolean): void {
    const c = this.current;
    if (!c) {
      this.hideTip();
      return;
    }
    const mode = shift || c.hit.breakdown ? 'breakdown' : 'summary';
    const key = `${c.hit.source.kind}:${c.hit.source.id}|${loadoutKey(sim)}`;
    if (this.shown?.key !== key) {
      const desc = describe(sim, c.hit.source);
      this.shown = desc ? { desc, key, mode } : null;
    }
    if (!this.shown) {
      this.tip.hide();
      return;
    }
    this.shown.mode = mode;
    const d = this.shown.desc;
    const summary = mode === 'summary';
    const content = tipContent(d, summary, summary ? { ...(c.hit.maxH !== undefined ? { maxH: c.hit.maxH } : {}), ...(c.hit.maxW !== undefined ? { maxW: c.hit.maxW } : {}) } : {});
    const { w, h } = this.tip.measure(content);
    const at = placeTip(c.hit.anchor, w, h);
    this.tip.show(content, at.x, at.y);
  }

  /**
   * Every summary the game can show, laid out as drawn (040: at most four rows): each round, talent, stage and the
   * player's gear pieces, for the test hook. Measured on a hidden tablet.
   */
  summaryRows(sim: SimState): { source: TipSource; rows: number; cut: boolean; w: number; h: number }[] {
    this.measurer ??= new RuleTip(this.scene, DEPTHS.menu);
    const measurer = this.measurer;
    const sources: TipSource[] = [
      ...Object.keys(AMMO).map((id) => ({ kind: 'round' as const, id })),
      ...TALENT_LIST.map((t) => ({ kind: 'talent' as const, id: t.id })),
      ...Object.keys(STAGES).map((id) => ({ kind: 'stage' as const, id })),
      ...sim.gear.map((g) => ({ kind: 'gear' as const, id: String(g.id) })),
    ];
    return sources.flatMap((source) => {
      const d = describe(sim, source);
      if (!d) return [];
      const size = measurer.measure(tipContent(d, true));
      return [{ source, ...measurer.drawnRows, ...size }];
    });
  }

  private hideTip(): void {
    this.shown = null;
    this.tip.hide();
  }

  /** The tip and the glossary as drawn, for the test hook. */
  get ui(): LegibilityUi {
    const box = this.tip.box;
    const s = this.shown;
    const tip = s && box ? { source: s.desc.source, mode: s.mode, name: s.desc.name, chips: s.desc.chips.map((c) => c.id), chipBoxes: this.tip.placedChips.map((c) => ({ id: c.id, box: c.box })), lines: texts(s.mode === 'summary' ? s.desc.summary : s.desc.breakdown), box } : null;
    return { tip, glossary: this.glossary.state };
  }
}
