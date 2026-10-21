import type { Scene } from 'phaser';
import { TITLE_SCENE_KEY } from '../../data/assets';
import { TITLE_SCENE } from '../../data/art/title';
import { MAX_TEXTURE_SCALE, OUTLINE_WIDTH } from '../../data/art/style';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../data/config';
import { drawShapes } from '../vector/draw';

// Paints the title screen's still scene (042) once into its own canvas texture at the screen's scale (capped as the
// vector textures are). Returns the texels per view px. 050: the wanderer is drawn live over it (TitleView).

export function paintTitle(scene: Scene, screenScale: number): number {
  const s = Math.min(MAX_TEXTURE_SCALE, Math.max(1, Math.ceil(screenScale)));
  if (scene.textures.exists(TITLE_SCENE_KEY)) scene.textures.remove(TITLE_SCENE_KEY);
  const canvas = document.createElement('canvas');
  canvas.width = VIEW_WIDTH * s;
  canvas.height = VIEW_HEIGHT * s;
  const c = canvas.getContext('2d');
  if (c) {
    c.scale(s, s);
    for (const layer of TITLE_SCENE) {
      c.save();
      c.translate(layer.dx, layer.dy);
      drawShapes(c, layer.shapes, { outline: OUTLINE_WIDTH, blurScale: s });
      c.restore();
    }
  }
  scene.textures.addCanvas(TITLE_SCENE_KEY, canvas);
  return s;
}
