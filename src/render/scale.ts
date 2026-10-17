import type { Game } from 'phaser';

// Keeps the canvas at the largest whole-number zoom that fits the window,
// so every sprite pixel stays a crisp square block. The page background letterboxes.
export function keepIntegerZoom(game: Game): void {
  const update = (): void => {
    game.scale.getParentBounds();
    if (game.scale.getMaxZoom() !== game.scale.zoom) game.scale.setMaxZoom();
  };
  window.addEventListener('resize', update);
  update();
}
