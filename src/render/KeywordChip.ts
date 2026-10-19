import type { GameObjects, Scene } from 'phaser';
import { CHIP, type ChipGroup } from '../data/legibility';
import { colorOf } from './color';
import { TextLine } from './textLine';
import type { Box } from './tipPlace';
import type { Chip, PlacedChip } from './tipTypes';

// Keyword chips (040): a small rounded tablet with the keyword's name in the body face,
// filled in its group's colour (039.1: All ammo and You plain grey). The tablets drawing
// chips share one Graphics for the fills; the names are pooled lines.

/** Fills a chip's tablet on `g`: its group's colour with an ink edge. */
export function drawChip(g: GameObjects.Graphics, box: Box, group: ChipGroup, alpha = 1): void {
  g.fillStyle(colorOf(CHIP.edge), alpha).fillRoundedRect(box.x - 0.5, box.y - 0.5, box.w + 1, box.h + 1, CHIP.radius + 0.5);
  g.fillStyle(colorOf(CHIP.colors[group]), CHIP.alpha * alpha).fillRoundedRect(box.x, box.y, box.w, box.h, CHIP.radius);
}

/** The chips' names on one tablet: measured and placed from a pool of lines. */
export class ChipLabels {
  private readonly scene: Scene;
  private readonly depth: number;
  private readonly world: boolean;
  private readonly lines: TextLine[] = [];
  private readonly widths = new Map<string, number>();
  private scratch: TextLine | null = null;

  constructor(scene: Scene, depth: number, world = false) {
    this.scene = scene;
    this.depth = depth;
    this.world = world;
  }

  /** A chip's width for its words, px. */
  width(label: string): number {
    let w = this.widths.get(label);
    if (w === undefined) {
      this.scratch ??= new TextLine(this.scene, 0, 0, this.depth, this.world, 'chip').setVisible(false);
      w = Math.ceil(this.scratch.set(label).width) + 2 * CHIP.padX;
      this.widths.set(label, w);
    }
    return w;
  }

  /** Draws the chips' names over their fills, hiding the rest of the pool. */
  show(chips: readonly PlacedChip[], alpha = 1): void {
    chips.forEach((c, i) => {
      const line = this.lines[i] ?? this.add();
      line.set(c.label).setAlpha(alpha).setVisible(true).moveTo(Math.round(c.box.x + CHIP.padX), Math.round(c.box.y + CHIP.textY));
    });
    for (let i = chips.length; i < this.lines.length; i++) this.lines[i]?.setVisible(false);
  }

  hide(): void {
    for (const l of this.lines) l.setVisible(false);
  }

  private add(): TextLine {
    const line = new TextLine(this.scene, 0, 0, this.depth, this.world, 'chip');
    this.lines.push(line);
    return line;
  }
}

/**
 * Lays chips out in rows from (x, y), `CHIP.gap` apart, the first row starting at `firstX`; a chip that would pass
 * `right` starts a new row `rowStep` px down at `x`. Returns them placed and how many rows they took.
 */
export function flowChips(chips: readonly Chip[], width: (label: string) => number, at: { x: number; y: number; firstX: number; right: number; rowStep: number }): { placed: PlacedChip[]; rows: number } {
  const placed: PlacedChip[] = [];
  let x = at.firstX;
  let row = 0;
  for (const c of chips) {
    const w = width(c.label);
    if (x + w > at.right && x > at.x) {
      row += 1;
      x = at.x;
    }
    placed.push({ ...c, box: { x, y: at.y + row * at.rowStep, w, h: CHIP.h } });
    x += w + CHIP.gap;
  }
  return { placed, rows: chips.length > 0 ? row + 1 : 0 };
}
