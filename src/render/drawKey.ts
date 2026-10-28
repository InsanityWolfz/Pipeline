/**
 * What a live Graphics piece last drew (081), so it redraws only when what it shows changes. Each frame the piece
 * `put`s the numbers its drawing depends on, in a fixed order, then asks `changed()`: true (and counted in `draws`)
 * when any differs from the last frame's, or on the first call. Allocates nothing per frame.
 */
export class DrawKey {
  private readonly last: number[];
  private i = 0;
  private dirty = true;
  /** How many times the piece has redrawn, for `ui().hudDraws`. */
  draws = 0;

  constructor(size: number) {
    this.last = new Array<number>(size).fill(Number.NaN);
  }

  /** The next number the drawing depends on (a boolean as 0 or 1). */
  put(value: number | boolean): this {
    const v = typeof value === 'boolean' ? (value ? 1 : 0) : value;
    if (!Object.is(this.last[this.i], v)) {
      this.last[this.i] = v;
      this.dirty = true;
    }
    this.i++;
    return this;
  }

  /** Whether anything put since the last call changed; counts a redraw when it did. */
  changed(): boolean {
    this.i = 0;
    const dirty = this.dirty;
    this.dirty = false;
    if (dirty) this.draws++;
    return dirty;
  }

  /** Forces the next `changed()` true (the piece was hidden, or its look must be redrawn). */
  invalidate(): void {
    this.dirty = true;
  }
}
