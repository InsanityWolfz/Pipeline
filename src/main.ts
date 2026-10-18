import { AUTO, Game, Scale } from 'phaser';
import { OUTLINE_ID, paletteHex } from './data/palette';
import { GameScene } from './render/GameScene';
import { currentFit, keepScreenFit } from './render/scale';
import { parseStart } from './render/playtest';
import { parseSeed } from './render/seed';
import { installTestHook } from './render/testHook';
import { createSim } from './sim/state';

const sim = createSim(parseSeed(window.location.search), { start: parseStart(window.location.search) });
const scene = new GameScene(sim);

const fit = currentFit();
const game = new Game({
  type: AUTO,
  parent: 'game',
  // Vector art (016) draws at the device's resolution; the pixel atlas keeps nearest filtering itself.
  width: fit.width,
  height: fit.height,
  pixelArt: false,
  backgroundColor: paletteHex(OUTLINE_ID),
  scale: { mode: Scale.NONE, autoCenter: Scale.CENTER_BOTH, zoom: fit.zoom / fit.scale },
  scene: [scene],
});
// After boot, so the scale manager exists; the scene picks up the first fit when it creates its cameras.
game.events.once('ready', () => keepScreenFit(game, (f) => scene.applyFit(f)));

if (import.meta.env.DEV) installTestHook(sim, scene);
