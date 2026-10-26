import { pieceDef } from '../data/pieces';
import type { Command } from '../sim/input';
import type { Tile } from '../sim/pieces';
import type { Facing } from '../sim/player';
import { dragTo, release, type ConduitLay, type HeldConduit } from './dragPath';

/** A build action queued for a tick: a place or a pick-up, or (063) a blueprint's stamp. */
export type BuildAction = Pick<Command, 'place' | 'pickUp'> & { stamp?: Command['stamp'] };

// Placing pieces with the mouse in build mode (split from controls.ts in 047): a click places the selected piece, a
// right click picks one up; with a conduit selected, a click lays it on release with the ghost's facing, and a drag
// lays one on every tile the cursor crosses (013), each facing the next so a turn lays a corner.
export class BuildDrag {
  /** Actions waiting for their tick, one a tick. */
  readonly queue: BuildAction[] = [];
  private dragTile: Tile | null = null;
  /** The conduit tile a drag is on, held back until the next tile says which way it faces (013). */
  private held: HeldConduit | null = null;
  /** 069: a pipetted conduit's turn, laid by a click (a drag's own corners win). */
  private turn: Facing | null = null;

  /** Leaving build mode drops a drag in progress. */
  reset(): void {
    this.dragTile = null;
    this.held = null;
  }

  /** A right click on a tile: pick its piece up. */
  pickUp(tile: Tile): void {
    this.queue.push({ place: null, pickUp: tile });
  }

  /** A left press with a blueprint ghost held (063): its stamp. */
  stamp(stamp: NonNullable<Command['stamp']>): void {
    this.queue.push({ place: null, pickUp: null, stamp });
  }

  /**
   * A left press on a tile with `pieceId` selected: a conduit waits for the drag, anything else is placed now. 069: with
   * an empty hand ('') nothing is placed; a pipetted conduit's `turn` and a stage's `round` go down with it.
   */
  press(tile: Tile, pieceId: string, facing: Facing, mirrored: boolean, hand: { turn?: Facing | null; round?: string | null } = {}): void {
    this.end(pieceId, facing);
    if (pieceId === '') return;
    this.dragTile = tile;
    this.turn = hand.turn ?? null;
    const round = hand.round ? { round: hand.round } : {};
    if (pieceDef(pieceId).kind === 'conduit') this.held = { tile };
    else this.queue.push({ place: { pieceId, ...tile, facing, ...(mirrored ? { mirrored: true } : {}), ...round }, pickUp: null });
  }

  /** Release (inside the canvas or out): the held conduit is laid. */
  end(pieceId: string, facing: Facing): void {
    this.dragTile = null;
    if (this.held) this.lay(pieceId, release(this.held, facing, this.turn));
    this.held = null;
  }

  /** The conduit a drag is holding back, as it would be laid now; the ghost draws it. */
  heldLay(facing: Facing): ConduitLay | null {
    return this.held ? release(this.held, facing, this.turn) : null;
  }

  /** The cursor reached `tile` mid-drag with a conduit selected: lays one on every tile crossed. */
  move(tile: Tile, pieceId: string): void {
    const drag = this.dragTile;
    if (!drag || pieceId === '' || pieceDef(pieceId).kind !== 'conduit') return;
    const step = dragTo(this.held ?? { tile: drag }, tile);
    for (const l of step.lay) this.lay(pieceId, l);
    this.held = step.held;
    this.dragTile = tile;
  }

  /** Whether a drag is under way (a press in build mode not yet released). */
  get dragging(): boolean {
    return this.dragTile !== null;
  }

  private lay(pieceId: string, l: ConduitLay): void {
    this.queue.push({ place: { pieceId, ...l }, pickUp: null });
  }
}
