import type { GameObjects, Scene, Textures } from 'phaser';
import { DEPTHS, TITLE_WANDERER_KEY } from '../../data/assets';
import { MAX_TEXTURE_SCALE } from '../../data/art/style';
import { WANDERER } from '../../data/art/wanderer';
import { TITLE_SCREEN } from '../../data/titleScreen';
import { drawWanderer, REST_POSE } from '../vector/wandererRig';

// The title's wanderer (050, F): posed on the ridge from the player rig as 042 painted it, but drawn live into its own
// canvas texture, so it breathes (the hips dip and rise), its cloak and hose sway in the wind, and the tube's glow
// pulses. Real time: the title isn't the sim.

/** The wanderer's motion at a moment: the hips' dip (style px), the cloak's swing (radians), the hose's sway (px), the muzzle's and face's glow. */
export interface TitleMotion {
  crouch: number;
  flap: number;
  hose: number;
  muzzle: number;
  glow: number;
}

/** The motion `ms` into the title: three slow loops (breath, wind, glow), each a smooth sine. Pure, so tests can read it. */
export function titleMotion(ms: number): TitleMotion {
  const M = TITLE_SCREEN.motion;
  const breath = 0.5 - 0.5 * Math.cos((ms / M.breathMs) * Math.PI * 2);
  const pulse = 0.5 - 0.5 * Math.cos((ms / M.glowMs) * Math.PI * 2);
  const wind = Math.sin((ms / M.swayMs) * Math.PI * 2);
  return {
    crouch: M.crouch * breath,
    flap: M.flap * wind,
    // The hose trails the cloak's swing by an eighth of a loop.
    hose: M.hose * Math.sin((ms / M.swayMs) * Math.PI * 2 - Math.PI / 4),
    muzzle: M.muzzle[0] + (M.muzzle[1] - M.muzzle[0]) * pulse,
    glow: M.glow[0] + (M.glow[1] - M.glow[0]) * pulse,
  };
}

export class TitleWanderer {
  private readonly image: GameObjects.Image;
  private readonly canvas: Textures.CanvasTexture;
  private readonly s: number;
  private sinceDraw = Infinity;
  /** The motion last drawn, for the test hook. */
  shown: TitleMotion = titleMotion(0);

  constructor(scene: Scene, screenScale: number) {
    const W = TITLE_SCREEN.wanderer;
    this.s = Math.min(MAX_TEXTURE_SCALE, Math.max(1, Math.ceil(screenScale)));
    const [bw, bh] = WANDERER.box.size;
    const [ax, ay] = WANDERER.box.anchor;
    if (scene.textures.exists(TITLE_WANDERER_KEY)) scene.textures.remove(TITLE_WANDERER_KEY);
    const canvas = scene.textures.createCanvas(TITLE_WANDERER_KEY, Math.ceil(bw * W.scale * this.s), Math.ceil(bh * W.scale * this.s));
    if (!canvas) throw new Error('Could not create the title wanderer canvas');
    this.canvas = canvas;
    this.image = scene.add
      .image(W.x - ax * W.scale, W.y - ay * W.scale, TITLE_WANDERER_KEY)
      .setOrigin(0)
      .setScale(1 / this.s)
      .setScrollFactor(0)
      .setDepth(DEPTHS.titleWanderer);
    this.draw(0);
  }

  setVisible(visible: boolean): void {
    this.image.setVisible(visible);
  }

  /** `ms` since the title showed, `deltaMs` this frame: redraws every `frameMs`. */
  update(ms: number, deltaMs: number): void {
    this.sinceDraw += deltaMs;
    if (this.sinceDraw < TITLE_SCREEN.motion.frameMs) return;
    this.draw(ms);
  }

  private draw(ms: number): void {
    this.sinceDraw = 0;
    const c = this.canvas.context;
    const W = TITLE_SCREEN.wanderer;
    const m = titleMotion(ms);
    this.shown = m;
    const k = this.s * W.scale;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    c.scale(k, k);
    c.translate(WANDERER.box.anchor[0], WANDERER.box.anchor[1]);
    // Side on, facing the ruin, the tube lowered a little toward it and lit (042's pose), breathing in the wind.
    drawWanderer(c, { ...REST_POSE, view: 'side', flip: false, aim: W.aim, glow: W.glow * m.glow, muzzle: m.muzzle, crouch: m.crouch, flap: m.flap, hoseSway: m.hose }, k);
    this.canvas.refresh();
  }
}
