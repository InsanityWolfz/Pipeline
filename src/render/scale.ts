import type { Game } from 'phaser';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../data/config';

// The screen (016): the game shows the same 640×360 of the world as always, at the
// largest whole-number CSS zoom that fits the window (the page letterboxes), but it
// draws at the device's real resolution so vector art stays sharp.

/** The camera that draws screen-space objects (the HUD, menus, mood) in view px. */
export const UI_CAMERA = 'ui';

export interface ScreenFit {
  /** CSS px per view px: a whole number, as before 016. */
  zoom: number;
  /** Backbuffer px per view px: the zoom times the device pixel ratio. Cameras zoom by this. */
  scale: number;
  /** Backbuffer size, px. */
  width: number;
  height: number;
}

export function fitScreen(windowWidth: number, windowHeight: number, dpr: number): ScreenFit {
  const zoom = Math.max(1, Math.floor(Math.min(windowWidth / VIEW_WIDTH, windowHeight / VIEW_HEIGHT)));
  const scale = zoom * Math.max(1, dpr);
  return { zoom, scale, width: Math.round(VIEW_WIDTH * scale), height: Math.round(VIEW_HEIGHT * scale) };
}

/** A pointer's backbuffer position in view px (the 640×360 space the HUD is laid out in). */
export function toView(x: number, y: number, scale: number): { x: number; y: number } {
  return { x: x / scale, y: y / scale };
}

export function currentFit(): ScreenFit {
  return fitScreen(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
}

/** Keeps the backbuffer matched to the window; `onFit` updates the cameras. */
export function keepScreenFit(game: Game, onFit: (fit: ScreenFit) => void): void {
  let last = '';
  const update = (): void => {
    const fit = currentFit();
    const key = `${fit.width}x${fit.height}@${fit.zoom}`;
    if (key === last) return;
    last = key;
    game.scale.resize(fit.width, fit.height);
    game.scale.setZoom(fit.zoom / fit.scale);
    onFit(fit);
  };
  window.addEventListener('resize', update);
  update();
}
