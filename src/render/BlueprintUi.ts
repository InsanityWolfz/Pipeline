import type { Scene } from 'phaser';
import { BLUEPRINT_SPRITES } from '../data/blueprintAssets';
import { AREA_MENU, BLUEPRINT_TABLE, type AreaMenuRow } from '../data/blueprints';
import { SOUNDS } from '../data/sounds';
import { piecesInBox, type AreaBox } from '../sim/area';
import { isRestored } from '../sim/research';
import type { SimState } from '../sim/state';
import { AreaView } from './AreaView';
import type { BlueprintInput, ToolMode } from './blueprintInput';
import { ChoiceMenu, type Choice } from './ChoiceMenu';
import type { Controls } from './controls';
import type { SoundView } from './SoundView';
import { ToolCells, type ToolCellsShown } from './ToolCells';

/** 063's build-mode UI as drawn, for `ui().blueprints`. */
export const NO_BLUEPRINT_UI: BlueprintUiShown = { tool: 'piece', box: null, counted: [], menu: null, tools: { shown: false, cells: [], tip: null } };

export interface BlueprintUiShown {
  tool: ToolMode;
  /** The area box on show (dragging, or its menu up), tiles; and the ids of the pieces it counts. */
  box: AreaBox | null;
  counted: number[];
  /** The release menu's rows while it's up, view px. */
  menu: { text: string; x: number; y: number; w: number; h: number }[] | null;
  tools: ToolCellsShown;
}

const ROW_ICONS: Readonly<Record<AreaMenuRow, readonly string[]>> = {
  pickUp: [BLUEPRINT_SPRITES.areaEmblem],
  save: [BLUEPRINT_SPRITES.listEmblem],
  saveAndPickUp: [BLUEPRINT_SPRITES.listEmblem, BLUEPRINT_SPRITES.areaEmblem],
  cancel: [],
};

// Build mode's tools on screen (063): the Tools group's cells, the Area tool's box over the foundry, and the menu a
// released box opens (Pick up; Save blueprint and Save and pick up once the Blueprint table is restored; Cancel; only
// Cancel over a box with no pieces). The choice goes to the sim as the `area` command. Holds no game rules.
export class BlueprintUi {
  private readonly cells: ToolCells;
  private readonly area: AreaView;
  private readonly menu: ChoiceMenu<AreaMenuRow>;
  private tools: BlueprintInput | null = null;
  shown: BlueprintUiShown = { tool: 'piece', box: null, counted: [], menu: null, tools: { shown: false, cells: [], tip: null } };

  constructor(scene: Scene) {
    this.cells = new ToolCells(scene);
    this.area = new AreaView(scene);
    this.menu = new ChoiceMenu<AreaMenuRow>(scene);
  }

  /** The menu's rows for the released box: what it can do with the pieces it counts. */
  private rows(sim: SimState, box: AreaBox): Choice<AreaMenuRow>[] {
    const any = piecesInBox(sim.foundry, box).length > 0;
    const saves = isRestored(sim, BLUEPRINT_TABLE);
    const ids: AreaMenuRow[] = any ? ['pickUp', ...(saves ? (['save', 'saveAndPickUp'] as const) : []), 'cancel'] : ['cancel'];
    return ids.map((id) => ({ icons: ROW_ICONS[id], text: AREA_MENU[id], value: id }));
  }

  update(sim: SimState, tools: BlueprintInput, inFoundry: boolean, pointer: { x: number; y: number } | null, sound: SoundView | undefined): void {
    this.tools = tools;
    if (tools.takeRelease()) sound?.play(SOUNDS.areaRelease);
    const box = sim.building ? tools.box : null;
    this.area.update(box, sim.foundry, inFoundry);
    const released = sim.building ? tools.released : null;
    if (released && !this.menu.isOpen) this.menu.open();
    if (!released && this.menu.isOpen) this.menu.close();
    if (released) this.menu.show(this.rows(sim, released));
    this.cells.update(sim.building, tools.mode === 'area' ? 'area' : null, !isRestored(sim, BLUEPRINT_TABLE), pointer);
    this.shown = { tool: tools.mode, box, counted: this.area.counted, menu: this.menu.isOpen ? this.menu.rowsShown : null, tools: this.cells.shown };
  }

  overUi(x: number, y: number): boolean {
    return this.menu.overUi(x, y) || this.cells.overUi(x, y);
  }

  /** The cursor at a view point: the menu's row under it lights. */
  pointAt(x: number, y: number): void {
    this.menu.pointAt(x, y);
  }

  /** A left press on the menu or the Tools cells. Returns whether it landed on them. */
  click(controls: Controls, x: number, y: number): boolean {
    const tools = this.tools;
    const box = tools?.released;
    const row = this.menu.valueAt(x, y);
    if (tools && box && row) {
      this.menu.flashAt(x, y);
      if (row !== 'cancel') controls.menus.area(box, row);
      tools.closeMenu();
      return true;
    }
    const tool = this.cells.toolAt(x, y);
    if (tool === 'area') tools?.toggleArea();
    return tool !== null || this.overUi(x, y);
  }

  /** Whether the release menu is up. */
  get menuOpen(): boolean {
    return this.menu.isOpen;
  }
}
