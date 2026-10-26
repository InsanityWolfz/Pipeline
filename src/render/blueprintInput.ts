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
  /** A box was released since the last call to `takeRelease` (its sound). */
  private releasedNow = false;

  /** Back to placing the bar's piece: no drag, no menu, no ghost. */
  setPiece(): void {
    this.mode = 'piece';
    this.drag = null;
    this.released = null;
    this.question = null;
    this.ghost = null;
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

  /** A blueprint taken from the list as the ghost, unturned. */
  takeGhost(slot: number): void {
    this.setPiece();
    this.mode = 'ghost';
    this.ghost = { slot, turns: 0, mirrored: false };
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
   * Esc or a right click: a question or the menu goes, else a drag, else the ghost or the Area tool (back to the bar's piece).
   * Returns whether there was anything to back out of (else Esc leaves build mode).
   */
  back(): boolean {
    if (this.question) this.question = null;
    else if (this.released) this.released = null;
    else if (this.drag) this.drag = null;
    else if (this.mode !== 'piece') this.setPiece();
    else return false;
    return true;
  }
}
