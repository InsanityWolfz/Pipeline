import { unit } from './direction';

// A push spread evenly over a few ticks, on top of whatever else moves the body.

export interface Knockable {
  /** Push per tick, px. */
  knockX: number;
  knockY: number;
  /** Ticks of push left. */
  knockTicks: number;
}

export function startKnock(k: Knockable, dirX: number, dirY: number, distance: number, ticks: number): void {
  const [ux, uy] = unit(dirX, dirY);
  k.knockX = (ux * distance) / ticks;
  k.knockY = (uy * distance) / ticks;
  k.knockTicks = ticks;
}

/** This tick's push, used up as it's taken. */
export function takeKnock(k: Knockable): [number, number] {
  if (k.knockTicks <= 0) return [0, 0];
  k.knockTicks -= 1;
  return [k.knockX, k.knockY];
}
