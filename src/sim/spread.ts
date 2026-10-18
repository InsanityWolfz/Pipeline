import { STAGER_ANGLES } from '../data/foundry';
import { frontTile, sameTile, type FoundryState } from './pieces';
import type { SimState } from './state';

// Spreads (008): every gravity stager facing the tube socket is a stream at its
// angle. A shot from the reservoir fires one projectile per stream.

/** The angles of the stagers whose front is the tube socket, nearest 0° first (then left before right). */
export function socketStreams(foundry: FoundryState): number[] {
  const socket = foundry.pieces.find((p) => p.kind === 'socket');
  if (!socket) return [];
  return foundry.pieces
    .flatMap((p) => (p.kind === 'stager' && sameTile(frontTile(p), socket) ? [p.angle] : []))
    .sort((a, b) => Math.abs(a) - Math.abs(b) || a - b);
}

/** Steps a stager to its next angle, wrapping around. Only in the foundry; records an angle event. */
export function cycleAngle(state: SimState, id: number): void {
  const p = state.foundry.pieces.find((piece) => piece.id === id);
  if (p?.kind !== 'stager') return;
  const i = STAGER_ANGLES.indexOf(p.angle);
  p.angle = STAGER_ANGLES[(i + 1) % STAGER_ANGLES.length] ?? p.angle;
  state.events.angles.push({ id, angle: p.angle });
}

/** A direction turned by `degrees` (clockwise on screen, where y points down). */
export function rotate(dx: number, dy: number, degrees: number): [number, number] {
  const r = (degrees * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [dx * c - dy * s, dx * s + dy * c];
}
