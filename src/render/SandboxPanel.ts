import type { GameObjects, Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { SANDBOX_KEY_LIST, SANDBOX_PANEL, SANDBOX_TEXT } from '../data/sandbox';
import type { SandboxCommand } from '../sim/sandbox';
import type { SimState } from '../sim/state';
import type { ScreenBox } from './bottomHud';
import { colorOf } from './color';
import { settings } from './flow/settingsStore';
import { MenuColumn, type MenuRowShown } from './flow/MenuColumn';
import { DEFAULT_PICK, sandboxClick, sandboxColumns, type SpawnPick } from './sandboxRows';
import { keyListLines, stripLayout, type KeyListLine } from './sandboxStrip';
import { drawTablet } from './tablet';
import { TextLine } from './textLine';

/** The controls as drawn (044, 056), for `ui().sandbox`: shown, both columns' rows with their boxes, the key list and the two tablets. */
export interface SandboxPanelState {
  open: boolean;
  rows: MenuRowShown[];
  keys: KeyListLine[];
  boxes: ScreenBox[];
}

const P = SANDBOX_PANEL;

// The sandbox's controls (044; 056: always on screen, in the sandbox only). Down the left edge, the strip: the loadout's
// 020-style rows (each entrance's round, god mode, the boss resets) and under them the key list (056.2), each action's
// keys read from the player's bindings every frame, so a rebind shows at once. On the right, the spawn column. They
// start shown; the panel's key hides and shows both (056.1). They step aside while a big centred panel is open (056.5)
// and come back when it closes. They never pause. What the sim does is sent as `Command.sandbox`; the spawn rows'
// choices are the panel's own until Spawn sends them.
export class SandboxPanel {
  private readonly panel: GameObjects.Graphics;
  private readonly titles: TextLine[];
  private readonly columns: MenuColumn[];
  private readonly keyNames: TextLine[];
  private readonly keyValues: TextLine[];
  private pick: SpawnPick = { ...DEFAULT_PICK };
  /** 056.1: the player's choice, shown from the start. */
  private open = true;
  /** 056.5: a big centred panel, or the pause menu or a flow screen (056.9), is open over them. */
  private covered = false;
  /** Only a sandbox sim draws them. */
  private active = false;
  private keys: KeyListLine[] = [];
  private boxes: ScreenBox[] = [];

  constructor(scene: Scene) {
    const depth = DEPTHS.menu;
    this.panel = scene.add.graphics().setScrollFactor(0).setDepth(depth - 1);
    this.titles = [SANDBOX_TEXT.loadout, SANDBOX_TEXT.spawn].map((t) => new TextLine(scene, 0, 0, depth + 3, false, 'title').set(t));
    this.columns = [new MenuColumn(scene, 0, 0, P.rows, depth), new MenuColumn(scene, 0, 0, P.rows, depth)];
    const line = (): TextLine => new TextLine(scene, 0, 0, depth + 2, false, 'body');
    const n = SANDBOX_KEY_LIST.length;
    this.keyNames = Array.from({ length: n }, line);
    this.keyValues = Array.from({ length: n }, line);
    this.show();
  }

  /** 056.5: stepped aside under a big centred panel or the pause menu. */
  get isCovered(): boolean {
    return this.covered;
  }

  /** Shown: the player hasn't hidden them (056.1). */
  get isOpen(): boolean {
    return this.open;
  }

  setOpen(open: boolean): void {
    this.open = open;
    this.show();
  }

  /**
   * 056.5: a big centred panel (the inventory, research list, talents, crafting menu or a site's menu) is open over them;
   * 056.10: or the game is paused, or a flow screen is up.
   */
  setCovered(covered: boolean): void {
    if (covered === this.covered) return;
    this.covered = covered;
    this.show();
  }

  /** On screen now: in the sandbox, shown, and not stepped aside. */
  private get visible(): boolean {
    return this.active && this.open && !this.covered;
  }

  private show(): void {
    const v = this.visible;
    if (!v) this.boxes = [];
    this.panel.setVisible(v);
    for (const t of [...this.titles, ...this.keyNames, ...this.keyValues]) t.setVisible(v);
    for (const c of this.columns) c.setVisible(v);
  }

  /** Redraws the rows from the sim's loadout and god mode, and the key list from the bindings (a sandbox sim only). */
  update(sim: SimState): void {
    const sb = sim.sandbox;
    if (Boolean(sb) !== this.active) {
      this.active = Boolean(sb);
      this.show();
    }
    if (!sb || !this.visible) return;
    const L = stripLayout();
    this.panel.clear();
    this.boxes = [L.left, L.right];
    const columns = sandboxColumns(sb, this.pick);
    [L.left, L.right].forEach((box, i) => {
      drawTablet(this.panel, box.x, box.y, box.w, box.h);
      const title = this.titles[i];
      title?.moveTo(Math.round(box.x + box.w / 2 - (title?.width ?? 0) / 2), box.y + P.titleY);
      this.columns[i]?.set(columns[i] ?? [], box.x + P.pad, box.y + P.pad + P.titleH);
    });
    const K = P.keys;
    this.panel.fillStyle(colorOf(K.rule.color), K.rule.alpha).fillRect(L.left.x + K.rule.inset, L.ruleY, L.left.w - 2 * K.rule.inset, 1);
    this.keys = keyListLines(settings().bindings);
    this.keys.forEach((line, i) => {
      const y = L.keysY + i * K.step;
      const x = L.left.x + P.pad;
      this.keyNames[i]?.set(line.label).moveTo(x + K.label.x, y);
      const value = this.keyValues[i];
      value?.set(line.keys).moveTo(Math.round(x + K.value.right - value.width), y);
    });
  }

  /** While shown, the tablets are UI: a press there never fires, and the pointer is the arrow. */
  overUi(x: number, y: number): boolean {
    return this.visible && this.boxes.some((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
  }

  pointAt(x: number, y: number): void {
    if (this.visible) for (const c of this.columns) c.pointAt(x, y);
  }

  /**
   * A click: null off the controls; else whether it hit a row and the command to send. A spawn choice changes the
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

  /** Whether any of its objects is on screen (056: never outside the sandbox), for the test hook. */
  get drawn(): boolean {
    return this.panel.visible || [...this.titles, ...this.keyNames, ...this.keyValues].some((t) => t.obj.visible);
  }

  get state(): SandboxPanelState {
    const v = this.visible;
    return { open: v, rows: v ? this.columns.flatMap((c) => c.shown) : [], keys: v ? this.keys : [], boxes: v ? [...this.boxes] : [] };
  }
}
