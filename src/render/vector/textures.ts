import type { GameObjects, Scene } from 'phaser';
import { VECTOR_KEY } from '../../data/assets';
import { MAX_TEXTURE_SCALE } from '../../data/art/style';
import { vectorFrames } from './catalog';
import { shelfPack } from './pack';

// Vector textures (016): every catalog frame is drawn once at boot at the screen's
// scale (capped), shelf-packed into canvas pages under one texture key. Objects
// showing a vector frame are scaled down by that same factor, so they keep their
// world size, and get the frame's anchor as their origin.

/** Gap between packed frames, texels, so smoothing never bleeds a neighbour in. */
const PAD = 2;
const PAGE = 2048;

let bakeScale = 1;
const anchors = new Map<string, { ox: number; oy: number }>();

/** Texels per world px of the baked frames. */
export function textureScale(): number {
  return bakeScale;
}

/** Draws every vector frame at `screenScale` (backbuffer px per world px) and registers them. Once per game. */
export function bakeVectors(scene: Scene, screenScale: number): void {
  if (scene.textures.exists(VECTOR_KEY)) return;
  bakeScale = Math.min(MAX_TEXTURE_SCALE, Math.max(1, Math.ceil(screenScale)));
  const frames = vectorFrames();
  const sizes = frames.map((f) => [Math.ceil(f.size[0] * bakeScale), Math.ceil(f.size[1] * bakeScale)] as const);
  const { placed, pages } = shelfPack(sizes, PAGE, PAD);
  const canvases = pages.map((p) => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, p.w);
    canvas.height = Math.max(1, p.h);
    return canvas;
  });
  frames.forEach((f, i) => {
    const at = placed[i];
    const c = at && canvases[at.page]?.getContext('2d');
    if (!at || !c) return;
    c.save();
    c.beginPath();
    c.rect(at.x, at.y, sizes[i]?.[0] ?? 0, sizes[i]?.[1] ?? 0);
    c.clip();
    c.translate(at.x, at.y);
    c.scale(bakeScale, bakeScale);
    c.translate(f.anchor[0], f.anchor[1]);
    f.draw(c, bakeScale);
    c.restore();
  });
  const texture = scene.textures.create(VECTOR_KEY, canvases);
  if (!texture) throw new Error('Could not create the vector texture');
  frames.forEach((f, i) => {
    const at = placed[i];
    const size = sizes[i];
    if (!at || !size) return;
    texture.add(f.name, at.page, at.x, at.y, size[0], size[1]);
    anchors.set(f.name, { ox: f.anchor[0] / f.size[0], oy: f.anchor[1] / f.size[1] });
  });
}

/** Shows `frame` on `obj`, at the texture's scale and with the frame's anchor as its origin. */
export function showFrame<T extends GameObjects.Image | GameObjects.Sprite>(obj: T, frame: string): T {
  const anchor = anchors.get(frame);
  if (!anchor) {
    // A frame that was never drawn would show as a blank square: say so, so tests catch it.
    console.error(`No frame named '${frame}'`);
    return obj;
  }
  obj.setTexture(VECTOR_KEY, frame);
  obj.setScale(1 / bakeScale);
  obj.setOrigin(anchor.ox, anchor.oy);
  return obj;
}

/** A vector image at `x, y` with its anchor there. */
export function addVector(scene: Scene, x: number, y: number, frame: string): GameObjects.Image {
  return showFrame(scene.add.image(x, y, VECTOR_KEY, frame), frame);
}

/** A vector sprite (for animations) at `x, y` showing `frame` first. */
export function addVectorSprite(scene: Scene, x: number, y: number, frame: string): GameObjects.Sprite {
  return showFrame(scene.add.sprite(x, y, VECTOR_KEY, frame), frame);
}
