import type { MarksShown } from './MarkView';
import type { TrailsShown } from './TrailView';

// 078: the shot effects as the test hook reports them (`ui().ammoFx`).

/** The last impacts played, for the test hook. */
export interface ImpactShown {
  look: string;
  kind: string;
  family: string;
  element: string | null;
  tier: string;
  /** Particles thrown, the tier's glints among them. */
  particles: number;
  glints: number;
  flash: boolean;
  mark: string | null;
}

export interface AmmoFxShown {
  off: boolean;
  trails: TrailsShown['byKind'];
  slots: { live: number; created: number };
  trailCap: number;
  /** The most a drawn trail bends, degrees; trails drawn last frame for flying rounds; where the newest muzzle-begun trail starts. */
  bend: number;
  drawn: number;
  start: { x: number; y: number } | null;
  /** Fuse glints drawn (bombs and bomblets in flight). */
  fuses: number;
  marks: MarksShown;
  tracks: number;
  /** The last impacts and blasts played (up to 24), and how many since boot. */
  impacts: ImpactShown[];
  played: number;
  ends: number;
  fallbacks: number;
  /** The last shot's muzzle sparks: where they left, their lane (radians), its round, and how many flew. */
  muzzle: { x: number; y: number; angle: number; ammoId: string; sparks: number } | null;
  machineSparks: number;
  landings: number;
}

/** `ui().ammoFx` before the scene has built the view. */
export const NO_AMMO_FX: AmmoFxShown = { off: false, trails: {}, slots: { live: 0, created: 0 }, trailCap: 0, bend: 0, drawn: 0, start: null, fuses: 0, marks: { live: 0, created: 0, cap: 0, shocks: 0, flashes: 0, made: 0 }, tracks: 0, impacts: [], played: 0, ends: 0, fallbacks: 0, muzzle: null, machineSparks: 0, landings: 0 };
