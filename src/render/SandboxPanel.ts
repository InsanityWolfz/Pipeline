import type { GameObjects, Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { SANDBOX_KEY_LIST, SANDBOX_PANEL, SANDBOX_TEXT } from '../data/sandbox';
import type { SandboxCommand } from '../sim/sandbox';
import type { SimState } from '../sim/state';
import type { ScreenBox } from './bottomHud';
import { colorOf } from './color';
import { settings } from './flow/settingsStore';
import { MenuColumn, type MenuRowShown } from './flow/MenuColumn';
import { RowHover } from './menuFeedback';
import { DEFAULT_PICK, sandboxClick, sandboxColumns, type SpawnPick } from './sandboxRows';
import { PANEL_IDS, popoutPlace, PopoutState, type PanelId } from './sandboxPopout';
import { keyListLines, stripLayout, type KeyListLine } from './sandboxStrip';
import { drawTablet } from './tablet';
import { TextLine } from './textLine';

/** A tab as drawn (057), for `ui().sandbox`: its box, view px, and whether its panel is chosen open. */
export interface SandboxTabShown extends ScreenBox {
  id: PanelId;
  open: boolean;
}

/**
 * The controls as drawn (044, 056, 057), for `ui().sandbox`: `open` while a panel is all the way out; the rows of the
 * panels all the way out, with their boxes; the key list while the Loadout panel is out; every box drawn (tabs and
 * panels); the two tabs; and whether a panel is still sliding.
 */
export interface SandboxPanelState {
  open: boolean;
  rows: MenuRowShown[];
  keys: KeyListLine[];
  boxes: ScreenBox[];
  tabs: SandboxTabShown[];
  sliding: boolean;
}

const P = SANDBOX_PANEL;
const inBox = (b: ScreenBox, x: number, y: number): boolean => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;

// The sandbox's controls (044; 056; 057: click-open pop-outs, in the sandbox only). On each edge a small tab, always
// shown, with its label sideways: the Loadout tab on the left, the Spawn tab on the right. A click slides its panel out
// from that edge (and back), the tab riding on the panel's outer edge. The left panel holds the loadout's 020-style
// rows (each entrance's round, god mode, the boss resets) and under them the key list (056.2), read from the player's
// bindings every frame, so a rebind shows at once; the right one the spawn rows. Both start closed (057.1). They step
// aside while a big centred panel, the pause menu or a flow screen is open over them (056.5, 056.10) and come back as
// they were. They never pause. What the sim does is sent as `Command.sandbox`; the spawn rows' choices are the panel's
// own until Spawn sends them.
export class SandboxPanel {
  private readonly panel: GameObjects.Graphics;
  private readonly titles: TextLine[];
  private readonly tabLabels: TextLine[];
  private readonly columns: MenuColumn[];
  private readonly keyNames: TextLine[];
  private readonly keyValues: TextLine[];
  private readonly tabHover: RowHover;
  private readonly popout = new PopoutState();
  private pick: SpawnPick = { ...DEFAULT_PICK };
  /** 056.5: a big centred panel, or the pause menu or a flow screen (056.10), is open over them. */
  private covered = false;
  /** Only a sandbox sim draws them. */
  private active = false;
  private keys: KeyListLine[] = [];
  private boxes: ScreenBox[] = [];
  private tabs: SandboxTabShown[] = [];
  private hovered = -1;

  constructor(scene: Scene) {
    const depth = DEPTHS.menu;
    this.panel = scene.add.graphics().setScrollFactor(0).setDepth(depth - 1);
    this.titles = [SANDBOX_TEXT.loadout, SANDBOX_TEXT.spawn].map((t) => new TextLine(scene, 0, 0, depth + 3, false, 'title').set(t));
    this.tabLabels = [SANDBOX_TEXT.loadout, SANDBOX_TEXT.spawn].map((t, i) => {
      const line = new TextLine(scene, 0, 0, depth + 3, false, 'body').set(t);
      line.obj.setOrigin(0.5).setRotation(i === 0 ? P.tabs.turn.left : P.tabs.turn.right);
      return line;
    });
    this.columns = [new MenuColumn(scene, 0, 0, P.rows, depth), new MenuColumn(scene, 0, 0, P.rows, depth)];
    const line = (): TextLine => new TextLine(scene, 0, 0, depth + 2, false, 'body');
    const n = SANDBOX_KEY_LIST.length;
    this.keyNames = Array.from({ length: n }, line);
    this.keyValues = Array.from({ length: n }, line);
    this.tabHover = new RowHover(scene);
    this.show();
  }

  /** 056.5: stepped aside under a big centred panel or the pause menu. */
  get isCovered(): boolean {
    return this.covered;
  }

  /** Either panel is chosen open (it may still be sliding out). */
  get isOpen(): boolean {
    return this.popout.anyOpen;
  }

  /** 057.3: opens or closes both panels together. */
  setOpen(open: boolean): void {
    this.popout.setBoth(open);
  }

  /** 057.2: Esc closes open panels, while they're on screen, before it pauses: whether it closed any. */
  closeOpen(): boolean {
    if (!this.active || this.covered || !this.popout.anyOpen) return false;
    this.popout.setBoth(false);
    return true;
  }

  /** How far the Loadout panel is out (0–1), on screen now: 056.4's pickup feed follows its tab. */
  get loadoutOut(): number {
    return this.active && !this.covered ? this.popout.out('loadout') : 0;
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

  /** The tabs are on screen now: in the sandbox, and not stepped aside. */
  private get visible(): boolean {
    return this.active && !this.covered;
  }

  private show(): void {
    const v = this.visible;
    if (!v) {
      this.boxes = [];
      this.tabs = [];
    }
    this.panel.setVisible(v);
    for (const t of this.tabLabels) t.setVisible(v);
    if (!v) this.showPanel(0, false).showPanel(1, false);
  }

  /** One panel's title, rows and (the Loadout's) key list shown or hidden. */
  private showPanel(i: number, on: boolean): this {
    this.titles[i]?.setVisible(on);
    this.columns[i]?.setVisible(on);
    if (i === 0) for (const t of [...this.keyNames, ...this.keyValues]) t.setVisible(on);
    return this;
  }

  /** Slides the panels by the frame's `deltaMs` and redraws the tabs, and any panel out, from the sim (a sandbox sim only). */
  update(sim: SimState, deltaMs: number): void {
    const sb = sim.sandbox;
    if (Boolean(sb) !== this.active) {
      this.active = Boolean(sb);
      this.show();
    }
    if (!sb || !this.visible) return;
    this.popout.step(deltaMs);
    this.panel.clear();
    this.boxes = [];
    this.tabs = [];
    const columns = sandboxColumns(sb, this.pick);
    PANEL_IDS.forEach((id, i) => {
      const out = this.popout.out(id);
      const { panel, tab } = popoutPlace(id, out);
      this.showPanel(i, out > 0);
      if (out > 0) {
        this.boxes.push(panel);
        drawTablet(this.panel, panel.x, panel.y, panel.w, panel.h);
        const title = this.titles[i];
        title?.moveTo(Math.round(panel.x + panel.w / 2 - (title?.width ?? 0) / 2), panel.y + P.titleY);
        const column = this.columns[i];
        column?.moveTo(panel.x + P.pad, panel.y + P.pad + P.titleH);
        column?.set(columns[i] ?? []);
        if (i === 0) this.drawKeys(panel);
      }
      this.boxes.push(tab);
      this.tabs.push({ id, ...tab, open: this.popout.isOpen(id) });
      drawTablet(this.panel, tab.x, tab.y, tab.w, tab.h);
      if (this.hovered === i) this.panel.lineStyle(1, colorOf(P.keys.rule.color), 1).strokeRect(tab.x + 1.5, tab.y + 1.5, tab.w - 3, tab.h - 3);
      this.tabLabels[i]?.obj.setPosition(tab.x + tab.w / 2, tab.y + tab.h / 2);
    });
  }

  /** The key list under the loadout's rows, past a divider, in the Loadout panel where it is now. */
  private drawKeys(panel: ScreenBox): void {
    const K = P.keys;
    const L = stripLayout();
    const dy = panel.y - L.left.y;
    this.panel.fillStyle(colorOf(K.rule.color), K.rule.alpha).fillRect(panel.x + K.rule.inset, L.ruleY + dy, panel.w - 2 * K.rule.inset, 1);
    this.keys = keyListLines(settings().bindings);
    this.keys.forEach((line, i) => {
      const y = L.keysY + dy + i * K.step;
      const x = panel.x + P.pad;
      this.keyNames[i]?.set(line.label).moveTo(x + K.label.x, y);
      const value = this.keyValues[i];
      value?.set(line.keys).moveTo(Math.round(x + K.value.right - value.width), y);
    });
  }

  /** While shown, the tabs and panels are UI: a press there never fires, and the pointer is the arrow. */
  overUi(x: number, y: number): boolean {
    return this.visible && this.boxes.some((b) => inBox(b, x, y));
  }

  pointAt(x: number, y: number): void {
    if (!this.visible) return;
    PANEL_IDS.forEach((id, i) => this.columns[i]?.pointAt(this.popout.fullyOut(id) ? x : -1, y));
    const tab = this.tabs.findIndex((t) => inBox(t, x, y));
    this.tabHover.set(tab);
    this.hovered = tab;
  }

  /**
   * A click: null off the controls; else whether it hit a tab or a row and the command to send. A tab opens or closes
   * its panel; a row works only while its panel is all the way out. A spawn choice changes the panel's own pick and
   * redraws it next update.
   */
  click(sim: SimState, x: number, y: number): { hit: boolean; command: SandboxCommand | null } | null {
    const sb = sim.sandbox;
    if (!sb || !this.overUi(x, y)) return null;
    const tab = this.tabs.find((t) => inBox(t, x, y));
    if (tab) {
      this.popout.toggle(tab.id);
      return { hit: true, command: null };
    }
    for (const [i, c] of this.columns.entries()) {
      const id = PANEL_IDS[i];
      if (!id || !this.popout.fullyOut(id)) continue;
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
    return this.panel.visible || [...this.titles, ...this.tabLabels, ...this.keyNames, ...this.keyValues].some((t) => t.obj.visible);
  }

  get state(): SandboxPanelState {
    const v = this.visible;
    const out = PANEL_IDS.map((id) => v && this.popout.fullyOut(id));
    return {
      open: out.some(Boolean),
      rows: this.columns.flatMap((c, i) => (out[i] ? c.shown : [])),
      keys: out[0] ? this.keys : [],
      boxes: v ? [...this.boxes] : [],
      tabs: v ? [...this.tabs] : [],
      sliding: v && this.popout.sliding,
    };
  }
}
