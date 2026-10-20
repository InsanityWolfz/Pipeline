import type { GameObjects, Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { VIEW_WIDTH } from '../data/config';
import { MENU_ROW_W } from '../data/flowLayout';
import { SANDBOX_PANEL, SANDBOX_TEXT } from '../data/sandbox';
import type { SandboxCommand } from '../sim/sandbox';
import type { SimState } from '../sim/state';
import { MenuColumn, type MenuRowShown } from './flow/MenuColumn';
import { DEFAULT_PICK, sandboxClick, sandboxColumns, type SpawnPick } from './sandboxRows';
import { drawTablet } from './tablet';
import { TextLine } from './textLine';

/** The panel as drawn (044), for `ui().sandbox`: open, and both columns' rows with their boxes. */
export interface SandboxPanelState {
  open: boolean;
  rows: MenuRowShown[];
}

const P = SANDBOX_PANEL;
type Box = { x: number; y: number; w: number; h: number };

// The Sandbox panel (044), toggled by its key in the sandbox only: two tablets of 020-style
// rows, the loadout's at the left edge (each entrance's round, god mode, the boss resets) and
// the spawn panel's at the right, so the player in the middle stays in view. It never pauses.
// What the sim does is sent as `Command.sandbox`; the spawn rows' choices are the panel's own
// until Spawn sends them.
export class SandboxPanel {
  private readonly panel: GameObjects.Graphics;
  private readonly titles: TextLine[];
  private readonly columns: MenuColumn[];
  private pick: SpawnPick = { ...DEFAULT_PICK };
  private open = false;
  private boxes: Box[] = [];

  constructor(scene: Scene) {
    const depth = DEPTHS.menu;
    this.panel = scene.add.graphics().setScrollFactor(0).setDepth(depth - 1);
    this.titles = [SANDBOX_TEXT.loadout, SANDBOX_TEXT.spawn].map((t) => new TextLine(scene, 0, 0, depth + 3, false, 'title').set(t));
    this.columns = [new MenuColumn(scene, 0, 0, P.rows, depth), new MenuColumn(scene, 0, 0, P.rows, depth)];
    this.setOpen(false);
  }

  get isOpen(): boolean {
    return this.open;
  }

  setOpen(open: boolean): void {
    this.open = open;
    if (!open) this.boxes = [];
    this.panel.setVisible(open);
    for (const t of this.titles) t.setVisible(open);
    for (const c of this.columns) c.setVisible(open);
  }

  /** Redraws the rows from the sim's loadout and god mode (a sandbox sim only). */
  update(sim: SimState): void {
    const sb = sim.sandbox;
    if (!sb || !this.open) return;
    const w = MENU_ROW_W + 2 * P.pad;
    this.panel.clear();
    this.boxes = sandboxColumns(sb, this.pick).map((rows, i) => {
      const x = i === 0 ? P.margin : VIEW_WIDTH - P.margin - w;
      const box = { x, y: P.y, w, h: P.titleH + MenuColumn.heightOf(rows, P.rows) + 2 * P.pad };
      drawTablet(this.panel, box.x, box.y, box.w, box.h);
      const title = this.titles[i];
      title?.moveTo(Math.round(x + w / 2 - (title?.width ?? 0) / 2), P.y + P.titleY);
      this.columns[i]?.set(rows, x + P.pad, P.y + P.pad + P.titleH);
      return box;
    });
  }

  /** While open, the panel's tablets are UI: a press there never fires. */
  overUi(x: number, y: number): boolean {
    return this.open && this.boxes.some((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
  }

  pointAt(x: number, y: number): void {
    if (this.open) for (const c of this.columns) c.pointAt(x, y);
  }

  /**
   * A click: null off the panel; else whether it hit a row and the command to send. A spawn choice changes the
   * panel's own pick and redraws it next update.
   */
  click(sim: SimState, x: number, y: number): { hit: boolean; command: SandboxCommand | null } | null {
    const sb = sim.sandbox;
    if (!sb || !this.overUi(x, y)) return null;
    for (const c of this.columns) {
      const hit = c.click(x, y);
      if (!hit) continue;
      const out = sandboxClick(hit, sb, this.pick);
      this.pick = out.pick;
      return { hit: true, command: out.command };
    }
    return { hit: false, command: null };
  }

  get state(): SandboxPanelState {
    return { open: this.open, rows: this.open ? this.columns.flatMap((c) => c.shown) : [] };
  }
}
