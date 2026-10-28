import type { Scene } from 'phaser';
import { BLUEPRINT_SPRITES } from '../data/blueprintAssets';
import { AREA_MENU, BLUEPRINT_SLOTS, BLUEPRINT_TEXT, type AreaMenuRow } from '../data/blueprints';
import { SOUNDS } from '../data/sounds';
import { piecesInBox, type AreaBox } from '../sim/area';
import { blueprintsUnlocked } from '../sim/blueprints';
import type { SimState } from '../sim/state';
import { AreaView } from './AreaView';
import { blueprintIcon } from './blueprintLayout';
import { ghostOrigin, type BlueprintInput, type ToolMode, type ToolQuestion } from './blueprintInput';
import { ChoiceMenu, type Choice } from './ChoiceMenu';
import type { Controls } from './controls';
import type { SoundView } from './SoundView';
import { ToolCells, type ToolCellsShown } from './ToolCells';
import { BlueprintList, NO_BLUEPRINT_LIST, type BlueprintListShown } from './BlueprintList';
import { BlueprintGhost, NO_BLUEPRINT_GHOST, type BlueprintGhostShown } from './BlueprintGhost';
import { transformBlueprint } from '../sim/blueprintTransform';
import { stampPlan, type StampPiece } from '../sim/stamp';
import type { Tile } from '../sim/pieces';

export interface BlueprintUiShown {
  tool: ToolMode;
  /** The area box on show (dragging, or its menu up), tiles; and the ids of the pieces it counts. */
  box: AreaBox | null;
  counted: number[];
  /** The menu's rows while it's up (the release menu, or a question: which slot to overwrite, or a delete), view px. */
  menu: { text: string; x: number; y: number; w: number; h: number }[] | null;
  tools: ToolCellsShown;
  list: BlueprintListShown;
  ghost: BlueprintGhostShown;
}

/** 063's build-mode UI as drawn, for `ui().blueprints`. */
export const NO_BLUEPRINT_UI: BlueprintUiShown = { tool: 'piece', box: null, counted: [], menu: null, tools: { shown: false, cells: [], tip: null }, list: NO_BLUEPRINT_LIST, ghost: NO_BLUEPRINT_GHOST };

/** A menu row's meaning: a release menu row, or a slot a question names. */
type MenuValue = AreaMenuRow | { slot: number };

const ROW_ICONS: Readonly<Record<AreaMenuRow, readonly string[]>> = {
  pickUp: [BLUEPRINT_SPRITES.areaEmblem],
  save: [BLUEPRINT_SPRITES.listEmblem],
  saveAndPickUp: [BLUEPRINT_SPRITES.listEmblem, BLUEPRINT_SPRITES.areaEmblem],
  cancel: [],
};

const CANCEL: Choice<MenuValue> = { icons: [], text: AREA_MENU.cancel, value: 'cancel' };

// Build mode's tools on screen (063): the Tools group's cells, the Area tool's box over the foundry, and the one small
// menu they use. A released box opens it with Pick up; Save blueprint and Save and pick up once the Blueprint table is
// restored; and Cancel (only Cancel over a box with no pieces). A save with all 8 slots full asks which to overwrite,
// and a delete asks to confirm, in the same menu. The Blueprints button opens the list (BlueprintList). Choices go to the sim as commands. Holds no game rules.
export class BlueprintUi {
  private readonly cells: ToolCells;
  private readonly area: AreaView;
  private readonly menu: ChoiceMenu<MenuValue>;
  private readonly list: BlueprintList;
  private readonly ghost: BlueprintGhost;
  private tools: BlueprintInput | null = null;
  private sim: SimState | null = null;
  shown: BlueprintUiShown = NO_BLUEPRINT_UI;

  constructor(scene: Scene) {
    this.cells = new ToolCells(scene);
    this.area = new AreaView(scene);
    this.list = new BlueprintList(scene);
    this.ghost = new BlueprintGhost(scene);
    this.menu = new ChoiceMenu<MenuValue>(scene, 'blueprint-menu');
  }

  /** The release menu's rows for a box: what it can do with the pieces it counts. */
  private releaseRows(sim: SimState, box: AreaBox): Choice<MenuValue>[] {
    const any = piecesInBox(sim.foundry, box).length > 0;
    const ids: AreaMenuRow[] = any ? ['pickUp', ...(blueprintsUnlocked(sim) ? (['save', 'saveAndPickUp'] as const) : []), 'cancel'] : ['cancel'];
    return ids.map((id) => ({ icons: ROW_ICONS[id], text: AREA_MENU[id], value: id }));
  }

  /** A question's rows: every slot to overwrite, or the one to delete; then Cancel. */
  private questionRows(sim: SimState, q: ToolQuestion): Choice<MenuValue>[] {
    const row = (slot: number, text: (name: string) => string): Choice<MenuValue>[] => {
      const bp = sim.blueprints[slot];
      return bp ? [{ icons: [blueprintIcon(bp)], text: text(bp.name), value: { slot } }] : [];
    };
    const rows = q.kind === 'delete' ? row(q.slot, BLUEPRINT_TEXT.deleteRow) : sim.blueprints.flatMap((_, i) => row(i, BLUEPRINT_TEXT.overwriteRow));
    return [...rows, CANCEL];
  }

  /** The held ghost's stamp as it would go with its box centred on the cursor's tile, or null (no ghost, or off the grid). */
  private plan(sim: SimState, tools: BlueprintInput, cursor: Tile | null): StampPiece[] | null {
    const g = tools.ghost;
    if (!g || !sim.building) return null;
    const bp = sim.blueprints[g.slot];
    if (!bp) {
      // Its slot was emptied: the ghost goes.
      tools.setPiece();
      return null;
    }
    const shape = transformBlueprint(bp, g.turns, g.mirrored);
    if (!cursor) return null;
    const at = ghostOrigin(cursor, shape.w, shape.h);
    return stampPlan(sim, g.slot, at.tx, at.ty, g.turns, g.mirrored);
  }

  /** `cursor`: the foundry tile under the cursor while it's over the world, else null; `pointer` view px. */
  update(sim: SimState, tools: BlueprintInput, inFoundry: boolean, cursor: Tile | null, pointer: { x: number; y: number } | null, sound: SoundView | undefined): void {
    this.sim = sim;
    this.tools = tools;
    if (tools.takeRelease()) sound?.play(SOUNDS.areaRelease);
    const box = sim.building ? tools.box : null;
    this.area.update(box, sim.foundry, inFoundry);
    const q = sim.building ? tools.question : null;
    const released = sim.building ? tools.released : null;
    const rows = q ? this.questionRows(sim, q) : released ? this.releaseRows(sim, released) : null;
    if (rows && !this.menu.isOpen) this.menu.open();
    if (!rows && this.menu.isOpen) this.menu.close();
    if (rows) this.menu.show(rows);
    tools.listLocked = !blueprintsUnlocked(sim);
    if (tools.listLocked) tools.listOpen = false;
    this.list.update(sim.building && tools.listOpen, sim.blueprints);
    this.ghost.update(inFoundry ? this.plan(sim, tools, cursor) : null, cursor);
    this.cells.update(sim.building, tools.mode === 'area' ? 'area' : tools.listOpen ? 'list' : null, tools.listLocked, pointer);
    this.shown = { tool: tools.mode, box, counted: this.area.counted, menu: this.menu.isOpen ? this.menu.rowsShown : null, tools: this.cells.shown, list: this.list.shown, ghost: this.ghost.shown };
  }

  overUi(x: number, y: number): boolean {
    return this.menu.overUi(x, y) || this.list.overUi(x, y) || this.cells.overUi(x, y);
  }

  /** The cursor at a view point: the menu's row under it lights. */
  pointAt(x: number, y: number): void {
    this.menu.pointAt(x, y);
    this.list.pointAt(x, y);
  }

  /** A left press on the menu or the Tools cells. Returns whether it landed on them. */
  click(controls: Controls, x: number, y: number): boolean {
    const tools = this.tools;
    const value = this.menu.valueAt(x, y);
    if (tools && value !== undefined) {
      this.menu.flashAt(x, y);
      this.choose(controls, tools, value);
      return true;
    }
    // A list row takes its blueprint as the ghost; its delete mark asks to confirm.
    const hit = this.list.hit(x, y);
    if (tools && hit) {
      if (hit.del) tools.ask({ kind: 'delete', slot: hit.slot });
      else {
        const bp = this.sim?.blueprints[hit.slot];
        if (bp) tools.takeGhost(hit.slot, bp);
      }
      return true;
    }
    const tool = this.cells.toolAt(x, y);
    if (tool === 'area') tools?.toggleArea();
    if (tool === 'list') tools?.toggleList();
    return tool !== null || this.overUi(x, y);
  }

  /**
   * A menu row was clicked: send its command, or ask which slot a save with every slot full overwrites. A delete or an
   * overwrite drops a held ghost (the slots shift or change under it).
   */
  private choose(controls: Controls, tools: BlueprintInput, value: MenuValue): void {
    const box = tools.released;
    tools.closeMenu();
    if (value === 'cancel') {
      tools.question = null;
      return;
    }
    if (typeof value === 'object') {
      const q = tools.confirm();
      if (q?.kind === 'delete') controls.menus.deleteBlueprint(value.slot);
      if (q?.kind === 'overwrite') controls.menus.area(q.box, q.action, value.slot);
      return;
    }
    if (!box) return;
    if (value !== 'pickUp' && (this.sim?.blueprints.length ?? 0) >= BLUEPRINT_SLOTS) tools.ask({ kind: 'overwrite', box, action: value });
    else controls.menus.area(box, value);
  }
}
