import { boxOf, type AreaBox } from '../sim/area';
import type { Tile } from '../sim/pieces';
import type { AreaAction } from '../sim/input';

/** What build mode's mouse does (063): place the bar's piece, drag the Area tool's box, or stamp a taken blueprint. */
export type ToolMode = 'piece' | 'area' | 'ghost';

/** A blueprint taken from the list as the ghost (063): its slot, and its turns and mirror (src/sim/blueprintTransform.ts). */
export interface GhostHold {
  slot: number;
  turns: number;
  mirrored: boolean;
}

/** A question the menus ask before acting (063): which slot a save overwrites (all 8 full), or whether to delete one. */
export type ToolQuestion = { kind: 'overwrite'; box: AreaBox; action: Exclude<AreaAction, 'pickUp'> } | { kind: 'delete'; slot: number };

/** The ghost's box top-left for the cursor's tile: the box centred on it (left and up of centre for an even size). */
export const ghostOrigin = (cursor: Tile, w: number, h: number): Tile => ({ tx: cursor.tx - Math.floor((w - 1) / 2), ty: cursor.ty - Math.floor((h - 1) / 2) });

// Build mode's tools (063), pure so Vitest can drive them: which tool the mouse uses, the Area tool's drag and the box
// it released (waiting on the release menu), and the blueprint ghost held. Controls owns one; the pointer and keys
// change it, the scene's views draw it. Esc, and a right click, back out one step at a time: the menu, then the ghost
// or the Area tool.
export class BlueprintInput {
  mode: ToolMode = 'piece';
  /** The Area tool's drag in progress: where it started and the tile under the cursor now. */
  drag: { from: Tile; to: Tile } | null = null;
  /** The box the drag released, while its menu is up. */
  released: AreaBox | null = null;
  /** A question up (which slot to overwrite, or whether to delete one), or null. */
  question: ToolQuestion | null = null;
  /** The blueprint ghost held, in ghost mode. */
  ghost: GhostHold | null = null;
  /** The held ghost's blueprint's own box size, unturned, tiles (given when it's taken). */
  private ghostBase = { w: 1, h: 1 };
  /** The blueprint list is open. */
  listOpen = false;
  /** The list can't open: the Blueprint table isn't restored (the scene keeps this current). */
  listLocked = true;
  /** A box was released since the last call to `takeRelease` (its sound). */
  private releasedNow = false;

  /** Back to placing the bar's piece: no drag, no menu, no ghost. */
  setPiece(): void {
    this.mode = 'piece';
    this.drag = null;
    this.released = null;
    this.question = null;
    this.ghost = null;
    this.listOpen = false;
  }

  /** The Blueprints button or key: the list opens (only once the table is restored), or closes. */
  toggleList(): void {
    if (this.listOpen) this.listOpen = false;
    else if (!this.listLocked) this.listOpen = true;
  }

  /** Asks a question (the release menu, if up, gives way to it). */
  ask(question: ToolQuestion): void {
    this.released = null;
    this.question = question;
  }

  /** The Area tool's button or key: on, or off again. */
  toggleArea(): void {
    if (this.mode === 'area') this.setPiece();
    else {
      this.setPiece();
      this.mode = 'area';
    }
  }

  /** A blueprint taken from the list as the ghost, unturned; `size` its own box size. */
  takeGhost(slot: number, size: { w: number; h: number }): void {
    this.setPiece();
    this.mode = 'ghost';
    this.ghost = { slot, turns: 0, mirrored: false };
    this.ghostBase = { w: size.w, h: size.h };
  }

  /** The held ghost's box size as turned now, tiles (an odd number of quarter turns swaps it; a mirror keeps it). */
  get ghostSize(): { w: number; h: number } {
    const b = this.ghostBase;
    return this.ghost && this.ghost.turns % 2 === 1 ? { w: b.h, h: b.w } : { w: b.w, h: b.h };
  }

  /** A left press with the ghost held on a tile: the stamp it asks for, its box centred there; null with no ghost. */
  stampAt(tile: Tile): { slot: number; tx: number; ty: number; turns: number; mirrored: boolean } | null {
    if (!this.ghost) return null;
    const size = this.ghostSize;
    const at = ghostOrigin(tile, size.w, size.h);
    return { slot: this.ghost.slot, ...at, turns: this.ghost.turns, mirrored: this.ghost.mirrored };
  }

  /**
   * A left press over the world: with the Area tool a drag starts, with the ghost the stamp it asks for is returned.
   * Nothing happens while the release menu or a question is up.
   */
  worldPress(tile: Tile): ReturnType<BlueprintInput['stampAt']> {
    if (this.released || this.question) return null;
    if (this.mode === 'area') this.press(tile);
    return this.mode === 'ghost' ? this.stampAt(tile) : null;
  }

  /**
   * A question was answered with a slot (a delete or an overwrite): it goes, and so does a held ghost, since the slots
   * it names may shift or change under it. Returns the question answered.
   */
  confirm(): ToolQuestion | null {
    const q = this.question;
    this.question = null;
    if (q && this.mode === 'ghost') {
      this.mode = 'piece';
      this.ghost = null;
    }
    return q;
  }

  /** The rotate key: the ghost turns 90° clockwise. */
  turn(): void {
    if (this.ghost) this.ghost = { ...this.ghost, turns: (this.ghost.turns + 1) % 4 };
  }

  /**
   * The flip key: the ghost mirrors left to right as it shows now. A ghost is (mirror, then turns) of its blueprint, so
   * mirroring a turned ghost flips the mirror and undoes the turns' direction.
   */
  mirror(): void {
    if (this.ghost) this.ghost = { ...this.ghost, mirrored: !this.ghost.mirrored, turns: (4 - this.ghost.turns) % 4 };
  }

  /** A left press over the world with the Area tool: a drag starts (not while a menu is up). */
  press(tile: Tile): void {
    if (this.mode !== 'area' || this.released || this.question) return;
    this.drag = { from: tile, to: tile };
  }

  /** The cursor reached a tile mid-drag. */
  move(tile: Tile): void {
    if (this.drag) this.drag = { ...this.drag, to: tile };
  }

  /** The button came up: the drag's box waits on the release menu. */
  release(): void {
    if (!this.drag) return;
    this.released = boxOf(this.drag.from, this.drag.to);
    this.drag = null;
    this.releasedNow = true;
  }

  /** Whether a box was released since the last call. */
  takeRelease(): boolean {
    const was = this.releasedNow;
    this.releasedNow = false;
    return was;
  }

  /** The box on show: the drag's, or the released one's while its menu is up. */
  get box(): AreaBox | null {
    return this.drag ? boxOf(this.drag.from, this.drag.to) : this.released;
  }

  /** The release menu was answered or cancelled. */
  closeMenu(): void {
    this.released = null;
  }

  /**
   * Esc or a right click: a question or the menu goes, else the list, else a drag, else the ghost or the Area tool (back to the bar's piece).
   * Returns whether there was anything to back out of (else Esc leaves build mode).
   */
  back(): boolean {
    if (this.question) this.question = null;
    else if (this.released) this.released = null;
    else if (this.listOpen) this.listOpen = false;
    else if (this.drag) this.drag = null;
    else if (this.mode !== 'piece') this.setPiece();
    else return false;
    return true;
  }
}
