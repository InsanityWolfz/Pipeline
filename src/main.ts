import { AUTO, Game, Scale } from 'phaser';
import { INK_ID, paletteHex } from './data/palette';
import { loadFonts } from './render/fonts';
import { FlowScene } from './render/flow/FlowScene';
import { currentFit, keepScreenFit } from './render/scale';
import { installTestHook } from './render/installHook';

// The bundled fonts (020) load before the game starts, so no text draws with a fallback.
void loadFonts()
  .catch((e: unknown) => console.error('Fonts failed to load; drawing with the fallback', e))
  .then(start);

function start(): void {
  // 042: the flow scene runs the whole session: the title, then a game scene per New game or Continue.
  const flow = new FlowScene(window.location.search);

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
    scene: [flow],
  });
  // After boot, so the scale manager exists; the scenes pick up the first fit when they create their cameras.
  game.events.once('ready', () => keepScreenFit(game, (f) => flow.applyFit(f)));

  if (import.meta.env.DEV) installTestHook(flow);
}
