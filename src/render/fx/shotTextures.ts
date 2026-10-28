import type { Scene } from 'phaser';
import { SHOT_FX_TEXTURES } from '../../data/assets';
import { FX_LOOK } from '../../data/fxQuality';
import { textureScale } from '../vector/textures';

// 078: the shot effects' textures, white, drawn once at boot at the vector scale and tinted where used: the marks'
// blot, splash and rime, the shock ring, the flashes' ring, tick and star, and the particles' dot and puff.

/** The textures' sizes in world px (each drawn at the vector scale): marks and rings are discs `R` across. */
export const SHOT_TEXTURE_SIZE = 32;
const R = SHOT_TEXTURE_SIZE;

export function makeShotTextures(scene: Scene): void {
  const s = textureScale();
  const make = (key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, Math.ceil(w * s), Math.ceil(h * s));
    const c = tex?.getContext();
    if (!tex || !c) return;
    c.scale(s, s);
    c.fillStyle = '#ffffff';
    c.strokeStyle = '#ffffff';
    draw(c);
    tex.refresh();
  };
  const h = R / 2;
  make(SHOT_FX_TEXTURES.blot, R, R, (c) => {
    const g = c.createRadialGradient(h, h, 0, h, h, h);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.75)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, R, R);
  });
  make(SHOT_FX_TEXTURES.splash, R, R, (c) => {
    const g = c.createRadialGradient(h, h, h * 0.35, h, h, h);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, R, R);
  });
  make(SHOT_FX_TEXTURES.rime, R, R, (c) => {
    const g = c.createRadialGradient(h, h, 0, h, h, h);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, R, R);
    // Six frost spokes out of the patch.
    c.lineWidth = 1.2;
    c.lineCap = 'round';
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3 + 0.2;
      c.beginPath();
      c.moveTo(h + Math.cos(a) * h * 0.25, h + Math.sin(a) * h * 0.25);
      c.lineTo(h + Math.cos(a) * h * 0.9, h + Math.sin(a) * h * 0.9);
      c.stroke();
    }
  });
  make(SHOT_FX_TEXTURES.shock, R, R, (c) => {
    c.lineWidth = FX_LOOK.shockWidth;
    c.beginPath();
    c.arc(h, h, h - FX_LOOK.shockWidth, 0, Math.PI * 2);
    c.stroke();
  });
  make(SHOT_FX_TEXTURES.ring, 16, 16, (c) => {
    const g = c.createRadialGradient(8, 8, 2, 8, 8, 8);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.7, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 16, 16);
  });
  make(SHOT_FX_TEXTURES.tick, 8, 2, (c) => {
    const g = c.createLinearGradient(0, 0, 8, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0.4, 8, 1.2);
  });
  // Particles: a disc 4 px across with a soft rim, and a soft puff 8 px across (its edge fades out).
  make(SHOT_FX_TEXTURES.dot, 4, 4, (c) => {
    const g = c.createRadialGradient(2, 2, 0, 2, 2, 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.6, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 4, 4);
  });
  make(SHOT_FX_TEXTURES.square, 2, 2, (c) => c.fillRect(0, 0, 2, 2));
  make(SHOT_FX_TEXTURES.puff, 8, 8, (c) => {
    const g = c.createRadialGradient(4, 4, 0, 4, 4, 4);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.6)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 8, 8);
  });
  make(SHOT_FX_TEXTURES.star, 16, 16, (c) => {
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const r = i % 2 === 0 ? 8 : 2;
      c.lineTo(8 + Math.cos(a) * r, 8 + Math.sin(a) * r);
    }
    c.closePath();
    c.fill();
  });
}

