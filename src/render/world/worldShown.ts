import type { StrikeTarget } from './weatherLightning';
import type { WeatherWind } from './weatherModel';

// 077: what the world's life reports to the test hook's ui(): `world` (the decor per built chunk, the sway's work this
// frame, ripples, beads and set pieces in view) and `weather` (blend weights, live particles per layer, the budget's
// room and weather lightning).

export interface WorldShown {
  /** `?world=off` / the hook's toggle. */
  off: boolean;
  quality: string;
  /** Each built chunk: its plants, vines, swaying trees, ruin variants and set pieces, and whether its plants show. */
  chunks: { key: string; plants: number; vines: number; trees: number; variants: number; setPieces: string[]; shown: boolean }[];
  /** Objects the sway turned this frame, the chunks it looked at, and the chunks it keeps objects for. */
  swayUpdated: number;
  swayChunks: string[];
  swaySample: number[];
  swayBuilt: number;
  ripples: number;
  glints: number;
  beads: number;
  setPiecesInView: string[];
  /** Each looping set piece's frame shown (seen in view so far). */
  loops: Record<string, number>;
}

export interface WeatherShown {
  /** Each region's weight where the camera is. */
  weights: Record<string, number>;
  /** Live weather particles by layer, and in all; the count wanted now; the budget's room this frame. */
  layers: Record<string, number>;
  live: number;
  want: number;
  room: number;
  /** A boss fight is on (weather at Low's counts, no lightning). */
  fight: boolean;
  wind: WeatherWind;
  /** Weather strikes since boot, the last one's target, whether its bolt shows, and ms to the next. */
  strikes: number;
  last: StrikeTarget | null;
  bolt: boolean;
  nextStrikeMs: number;
  margin: number;
}

export const NO_WORLD: WorldShown = { off: false, quality: 'medium', chunks: [], swayUpdated: 0, swayChunks: [], swaySample: [], swayBuilt: 0, ripples: 0, glints: 0, beads: 0, setPiecesInView: [], loops: {} };
export const NO_WEATHER: WeatherShown = { weights: {}, layers: {}, live: 0, want: 0, room: 0, fight: false, wind: { strength: 0, dx: 0, dy: 0, gust: 1 }, strikes: 0, last: null, bolt: false, nextStrikeMs: 0, margin: 0 };

/** The world's report with its chunks worked out only when read (the test hook), so no frame walks every built chunk. */
export function lazyWorld(fields: Omit<WorldShown, 'chunks'>, chunks: () => WorldShown['chunks']): WorldShown {
  return {
    ...fields,
    get chunks() {
      return chunks();
    },
  };
}
