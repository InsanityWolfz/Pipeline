import { AUTO, Game, Scale } from 'phaser';
import { INK_ID, paletteHex } from './data/palette';
import { loadFonts } from './render/fonts';
import { GameScene } from './render/GameScene';
import { currentFit, keepScreenFit } from './render/scale';
import { parseStart } from './render/playtest';
import { parseSeed } from './render/seed';
import { installTestHook } from './render/testHook';
import { createSim } from './sim/state';

// The bundled fonts (020) load before the game starts, so no text draws with a fallback.
void loadFonts().then(start);

function start(): void {
  const sim = createSim(parseSeed(window.location.search), { start: parseStart(window.location.search) });
  const scene = new GameScene(sim);

  const fit = currentFit();
  const game = new Game({
    type: AUTO,
    parent: 'game',
    // Vector art (016) draws at the device's resolution.
    // Textures are smoothed when baked, so the canvas needs no multisampling, which is costly at full resolution.
    width: fit.width,
    height: fit.height,
    pixelArt: false,
    antialiasGL: false,
    roundPixels: true,
    backgroundColor: paletteHex(INK_ID),
    scale: { mode: Scale.NONE, autoCenter: Scale.CENTER_BOTH, zoom: fit.zoom / fit.scale },
    scene: [scene],
  });
  // After boot, so the scale manager exists; the scene picks up the first fit when it creates its cameras.
  game.events.once('ready', () => keepScreenFit(game, (f) => scene.applyFit(f)));

  if (import.meta.env.DEV) installTestHook(sim, scene);
}
