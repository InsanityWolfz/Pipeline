import { Game, AUTO, Scale } from 'phaser';
import { BootScene } from './render/BootScene';

new Game({
  type: AUTO,
  parent: 'game',
  width: 640,
  height: 360,
  pixelArt: true,
  backgroundColor: '#0b0f14',
  scale: { mode: Scale.FIT, autoCenter: Scale.CENTER_BOTH },
  scene: [BootScene],
});
