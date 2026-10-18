import { INTAKE, STAGER_ANGLES } from '../data/foundry';
import { FOUNDRY_ROOM } from '../data/rooms';
import { frontTile, sameTile, sideTile, sortSide, type FoundryState } from './pieces';
import type { SimState } from './state';

// Spreads (008): every gravity stager facing the foundry intake's mouth (019) is
// a stream at its angle. A shot from the reservoir fires one projectile per stream.

/** The angles of the stagers whose front is a mouth tile of the intake, nearest 0° first (then left before right). */
export function intakeStreams(foundry: FoundryState): number[] {
  return foundry.pieces
    .flatMap((p) => (p.kind === 'stager' && INTAKE.mouth.some((m) => sameTile(frontTile(p), m)) ? [p.angle] : []))
    .sort((a, b) => Math.abs(a) - Math.abs(b) || a - b);
}

/** A line feeds the intake: some piece that hands items on (not a hopper or crate) has a mouth tile as its front, or a sorter as its side exit. */
export function feedsIntake(foundry: FoundryState): boolean {
  const mouth = (t: { tx: number; ty: number }) => INTAKE.mouth.some((m) => sameTile(t, m));
  return foundry.pieces.some((p) => {
    if (p.kind === 'hopper' || p.kind === 'crate') return false;
    return mouth(frontTile(p)) || (p.kind === 'sorter' && mouth(sideTile(p, sortSide(p))));
  });
}

/** Steps a stager to its next angle, wrapping around. Only in the foundry; records an angle event. */
export function cycleAngle(state: SimState, id: number): void {
  if (state.roomId !== FOUNDRY_ROOM) return;
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
