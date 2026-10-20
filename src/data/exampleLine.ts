// The example line (046, note 10): on a new game's first foundry entry, a complete
// arrow line already stands under the intake's open centre entrance, so the first
// visit shows how a line turns raws into rounds that go up the tube. Its pieces are
// ordinary: the player can pick them up, move them and rebuild it. Laid out like
// 027's taught line: three hoppers on row 5, the part machines in front of them,
// the assembler across row 3, and two conduits up into the mouth tile (12, 0).
// Starting stock from 046.2: about 60 arrows (2 of each raw make 64 with 046's
// doubled outputs), so it runs dry during the first outing. Rules: src/sim/exampleLine.ts.

export interface ExamplePiece {
  pieceId: string;
  tx: number;
  ty: number;
  facing: 'up' | 'down' | 'left' | 'right';
  /** A hopper's starting stock. */
  stock?: { itemId: string; count: number };
}

/** Raws per hopper (046.2). */
const STOCK = 2;

export const EXAMPLE_LINE: readonly ExamplePiece[] = [
  { pieceId: 'hopper', tx: 11, ty: 5, facing: 'up', stock: { itemId: 'wood', count: STOCK } },
  { pieceId: 'hopper', tx: 12, ty: 5, facing: 'up', stock: { itemId: 'stone', count: STOCK } },
  { pieceId: 'hopper', tx: 13, ty: 5, facing: 'up', stock: { itemId: 'fiber', count: STOCK } },
  { pieceId: 'cutter', tx: 11, ty: 4, facing: 'up' },
  { pieceId: 'knapper', tx: 12, ty: 4, facing: 'up' },
  { pieceId: 'spinner', tx: 13, ty: 4, facing: 'up' },
  { pieceId: 'assembler', tx: 12, ty: 3, facing: 'up' },
  { pieceId: 'conduit', tx: 12, ty: 2, facing: 'up' },
  { pieceId: 'conduit', tx: 12, ty: 1, facing: 'up' },
];
