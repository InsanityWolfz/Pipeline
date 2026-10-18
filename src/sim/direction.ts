import type { Facing } from './player';

// Direction helpers shared by movement and the tube.

export function unit(x: number, y: number): [number, number] {
  const len = Math.hypot(x, y);
  return len === 0 ? [0, 0] : [x / len, y / len];
}

/** Snaps a direction to 4 ways; horizontal wins on diagonals. Zero keeps the current facing. */
export function facingOf(x: number, y: number, current: Facing): Facing {
  if (x !== 0) return x > 0 ? 'right' : 'left';
  if (y !== 0) return y > 0 ? 'down' : 'up';
  return current;
}

/** Snaps an aim direction to its dominant axis; horizontal wins ties. Zero keeps the current facing. */
export function aimFacing(x: number, y: number, current: Facing): Facing {
  if (x === 0 && y === 0) return current;
  if (Math.abs(x) >= Math.abs(y)) return x > 0 ? 'right' : 'left';
  return y > 0 ? 'down' : 'up';
}

/** The facing a quarter turn clockwise. */
export function rotateCw(f: Facing): Facing {
  return f === 'up' ? 'right' : f === 'right' ? 'down' : f === 'down' ? 'left' : 'up';
}

/** The facing a quarter turn anticlockwise. */
export function rotateCcw(f: Facing): Facing {
  return f === 'up' ? 'left' : f === 'left' ? 'down' : f === 'down' ? 'right' : 'up';
}

export function facingVector(f: Facing): [number, number] {
  return f === 'up' ? [0, -1] : f === 'down' ? [0, 1] : f === 'left' ? [-1, 0] : [1, 0];
}

/** The opposite direction. */
export function opposite(f: Facing): Facing {
  return f === 'up' ? 'down' : f === 'down' ? 'up' : f === 'left' ? 'right' : 'left';
}
