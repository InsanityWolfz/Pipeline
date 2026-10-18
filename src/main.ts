import { AUTO, Game, Scale } from 'phaser';
import { VIEW_HEIGHT, VIEW_WIDTH } from './data/config';
import { OUTLINE_ID, paletteHex } from './data/palette';
import { GameScene } from './render/GameScene';
import { keepIntegerZoom } from './render/scale';
import { parseStart } from './render/playtest';
import { parseSeed } from './render/seed';
import { installTestHook } from './render/testHook';
import { createSim } from './sim/state';

const sim = createSim(parseSeed(window.location.search), { start: parseStart(window.location.search) });
const scene = new GameScene(sim);

const game = new Game({
  type: AUTO,
  parent: 'game',
  width: VIEW_WIDTH,
  height: VIEW_HEIGHT,
  pixelArt: true,
  backgroundColor: paletteHex(OUTLINE_ID),
  scale: { mode: Scale.NONE, autoCenter: Scale.CENTER_BOTH, zoom: Scale.MAX_ZOOM },
  scene: [scene],
});
keepIntegerZoom(game);

if (import.meta.env.DEV) installTestHook(sim, scene);
