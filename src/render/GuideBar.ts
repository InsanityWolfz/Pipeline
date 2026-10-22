import type { GameObjects, Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { TUTORIAL_LAYOUT, TUTORIAL_SPRITES } from '../data/foundryAssets';
import { GUIDED_TEXT } from '../data/guidedBuilds';
import { BUILD_PULSE, GUIDED_LOOK } from '../data/hudLayout';
import type { ScreenRect } from './foundryLayout';
import { Pulse } from './pulse';
import { TextLine } from './textLine';
import { addVector } from './vector/textures';

/** The build bar's tutorial marks as drawn (058), for `ui().buildBar.guide`, view px. */
export interface GuideBarState {
  /** The arrow over the next piece's cell: the piece and the arrow's tip. */
  arrow: { pieceId: string; x: number; y: number } | null;
  /** Cells the build lock holds back, greyed. */
  locked: string[];
  /** The locked line over a hovered locked cell, while it shows. */
  lockTip: string | null;
}

type Cell = ScreenRect & { pieceId: string };

// The build bar's part of the guided tutorial (058, 058.3): while the build lock holds, every cell but the guided
// step's next piece is greyed, and hovering one says it unlocks as the tutorial goes on; during a guided step an arrow
// bobs over the next piece's cell (Shaun: "the arrows like point you in the bottom left when you're in build mode").
export class GuideBar {
  private readonly arrow: GameObjects.Image;
  private readonly bob: Pulse;
  private readonly lockLine: TextLine;
  shown: GuideBarState = { arrow: null, locked: [], lockTip: null };

  constructor(scene: Scene) {
    this.arrow = addVector(scene, 0, 0, TUTORIAL_SPRITES.marker).setOrigin(0.5, 1).setScrollFactor(0).setDepth(DEPTHS.hud + 3).setVisible(false);
    this.bob = new Pulse(scene, 0, TUTORIAL_LAYOUT.marker.bob, TUTORIAL_LAYOUT.marker.bobMs);
    this.lockLine = new TextLine(scene, 0, 0, DEPTHS.hud + 3, false, 'label').set(GUIDED_TEXT.lockedCell).setVisible(false);
  }

  /** `cells` with their images; `guided` the next ghost's piece (or null); `locked` while the build lock holds; `hovered` the cell under the cursor. */
  update(visible: boolean, cells: readonly { cell: Cell; images: readonly GameObjects.Image[] }[], guided: string | null, locked: boolean, hovered: string | null): void {
    const held = (id: string): boolean => visible && locked && id !== guided;
    for (const { cell, images } of cells) for (const o of images) o.setAlpha(held(cell.pieceId) ? GUIDED_LOOK.lockedAlpha : 1);
    const target = visible && guided ? cells.find((c) => c.cell.pieceId === guided)?.cell : undefined;
    this.arrow.setVisible(target !== undefined);
    let arrow: GuideBarState['arrow'] = null;
    if (target) {
      const x = target.x + target.w / 2;
      const y = target.y - BUILD_PULSE.inset - GUIDED_LOOK.barArrowLift;
      this.arrow.setPosition(x, Math.round(y - this.bob.value));
      arrow = { pieceId: target.pieceId, x, y };
    }
    const over = hovered !== null && held(hovered) ? cells.find((c) => c.cell.pieceId === hovered)?.cell : undefined;
    this.lockLine.setVisible(over !== undefined);
    if (over) this.lockLine.moveTo(Math.round(over.x + (over.w - this.lockLine.width) / 2), over.y - GUIDED_LOOK.lockTipGap - this.lockLine.lineHeight);
    this.shown = { arrow, locked: cells.flatMap((c) => (held(c.cell.pieceId) ? [c.cell.pieceId] : [])), lockTip: over ? GUIDED_TEXT.lockedCell : null };
  }
}
