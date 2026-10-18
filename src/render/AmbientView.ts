import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { DEPTHS, FX_TEXTURES } from '../data/assets';
import { TILE_SIZE, VIEW_HEIGHT, VIEW_WIDTH } from '../data/config';
import { AMBIENT, GLOW_TEXTURE, GLOWS, ROOM_MOOD, VIGNETTE } from '../data/juice';
import { OUTLINE_ID, hexToRgb, paletteHex } from '../data/palette';
import { PROPS, type PropDef } from '../data/props';
import type { Room } from '../data/rooms';
import { colorOf } from './color';

// The room's air (014): soft ley light pooled around glowing things, drifting
// motes (fireflies in the clearing), and a dusk tint with a vignette. Looks only.

const GLOW_KEY = FX_TEXTURES.glow;
const VIGNETTE_KEY = FX_TEXTURES.vignette;
const GLOW_SIZE = GLOW_TEXTURE.radius;

/** A light to pool on the floor: where, its palette colour and radius. */
export interface GlowSpot {
  x: number;
  y: number;
  color: string;
  radius: number;
}

interface Mote {
  dot: GameObjects.Rectangle;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  firefly: boolean;
}

export class AmbientView {
  private readonly scene: Scene;
  private glows: GameObjects.Image[] = [];
  /** Glows that come and go with the sim (conduit items, the tube), redrawn each frame. */
  private live: GameObjects.Image[] = [];
  private motes: Mote[] = [];
  private readonly tint: GameObjects.Rectangle;
  private readonly vignette: GameObjects.Image;
  private bounds = { w: 0, h: 0 };
  private time = 0;

  constructor(scene: Scene) {
    this.scene = scene;
    makeTextures(scene);
    this.tint = scene.add.rectangle(0, 0, VIEW_WIDTH, VIEW_HEIGHT, 0).setOrigin(0).setScrollFactor(0).setDepth(DEPTHS.mood);
    this.vignette = scene.add.image(0, 0, VIGNETTE_KEY).setOrigin(0).setScrollFactor(0).setDepth(DEPTHS.mood + 1);
  }

  /** Sets up a room's fixed lights, motes and mood. */
  show(room: Room, extra: readonly GlowSpot[]): void {
    for (const g of this.glows) g.destroy();
    for (const m of this.motes) m.dot.destroy();
    this.glows = [];
    this.motes = [];
    this.bounds = { w: (room.rows[0]?.length ?? 0) * TILE_SIZE, h: room.rows.length * TILE_SIZE };
    const props = (room.props ?? []).flatMap((p): GlowSpot[] => {
      const def: PropDef = PROPS[p.propId];
      const glow = def.glow;
      return glow ? [{ x: (p.tx + 0.5) * TILE_SIZE, y: (p.ty + 0.5) * TILE_SIZE, ...glow }] : [];
    });
    for (const spot of [...props, ...extra]) this.glows.push(this.glow(spot));
    const mood = ROOM_MOOD[room.id];
    this.tint.setFillStyle(mood ? colorOf(mood.tint) : 0, mood?.alpha ?? 0);
    const fireflies = room.floor === 'clearing' ? AMBIENT.fireflies : 0;
    for (let i = 0; i < AMBIENT.motes + fireflies; i++) this.motes.push(this.mote(i >= AMBIENT.motes));
  }

  private glow(spot: GlowSpot): GameObjects.Image {
    return this.scene.add
      .image(spot.x, spot.y, GLOW_KEY)
      .setScale(spot.radius / GLOW_SIZE)
      .setTint(colorOf(spot.color))
      .setBlendMode(BlendModes.ADD)
      .setDepth(DEPTHS.glow);
  }

  private mote(firefly: boolean): Mote {
    const x = Math.random() * this.bounds.w;
    const y = Math.random() * this.bounds.h;
    const color = firefly ? AMBIENT.fireflyColor : (AMBIENT.moteColors[Math.floor(Math.random() * AMBIENT.moteColors.length)] ?? 'white');
    const dot = this.scene.add.rectangle(x, y, 1, 1, colorOf(color)).setOrigin(0).setDepth(DEPTHS.motes);
    const speed = AMBIENT.moteSpeed[0] + Math.random() * (AMBIENT.moteSpeed[1] - AMBIENT.moteSpeed[0]);
    const angle = firefly ? Math.random() * Math.PI * 2 : -Math.PI / 2 + (Math.random() - 0.5);
    return { dot, x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, phase: Math.random() * Math.PI * 2, firefly };
  }

  /** Per frame: breathes the lights, drifts the motes, and redraws the moving lights. */
  update(deltaMs: number, moving: readonly GlowSpot[]): void {
    this.time += deltaMs;
    const breathe = (Math.sin((this.time / AMBIENT.glowBreatheMs) * Math.PI * 2) + 1) / 2;
    const [lo, hi] = AMBIENT.glowAlpha;
    for (const [i, g] of this.glows.entries()) g.setAlpha(lo + (hi - lo) * ((breathe + i * AMBIENT.glowStagger) % 1));
    while (this.live.length < moving.length) this.live.push(this.glow({ x: 0, y: 0, ...GLOWS.conduitItem }));
    for (const [i, g] of this.live.entries()) {
      const spot = moving[i];
      g.setVisible(spot !== undefined);
      if (spot) g.setPosition(spot.x, spot.y).setScale(spot.radius / GLOW_SIZE).setTint(colorOf(spot.color)).setAlpha(hi);
    }
    const dt = deltaMs / 1000;
    for (const m of this.motes) {
      const sway = m.firefly ? AMBIENT.fireflySway : AMBIENT.moteSway;
      m.phase += dt * sway.rate;
      m.x += (m.vx + Math.cos(m.phase) * sway.x) * dt;
      m.y += (m.vy + Math.sin(m.phase * AMBIENT.swayYSkew) * sway.y) * dt;
      if (m.y < 0) m.y += this.bounds.h;
      if (m.x < 0) m.x += this.bounds.w;
      if (m.x > this.bounds.w) m.x -= this.bounds.w;
      if (m.y > this.bounds.h) m.y -= this.bounds.h;
      const flicker = (Math.sin(m.phase * sway.flicker) + 1) / 2;
      const { minAlpha, alphaRange } = AMBIENT.moteSway;
      m.dot.setPosition(Math.round(m.x), Math.round(m.y)).setAlpha(m.firefly ? flicker : minAlpha + alphaRange * flicker);
    }
  }
}

/** The glow (a stepped radial falloff, white so it can be tinted) and the vignette, drawn once. */
function makeTextures(scene: Scene): void {
  if (!scene.textures.exists(GLOW_KEY)) {
    const size = GLOW_SIZE * 2;
    const tex = scene.textures.createCanvas(GLOW_KEY, size, size);
    const ctx = tex?.getContext();
    if (tex && ctx) {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const d = Math.hypot(x + 0.5 - GLOW_SIZE, y + 0.5 - GLOW_SIZE) / GLOW_SIZE;
          if (d >= 1) continue;
          const band = Math.ceil((1 - d) * GLOW_TEXTURE.bands) / GLOW_TEXTURE.bands;
          ctx.fillStyle = `rgba(255,255,255,${(band * band * GLOW_TEXTURE.alpha).toFixed(3)})`;
          ctx.fillRect(x, y, 1, 1);
        }
      }
      tex.refresh();
    }
  }
  if (!scene.textures.exists(VIGNETTE_KEY)) {
    const tex = scene.textures.createCanvas(VIGNETTE_KEY, VIEW_WIDTH, VIEW_HEIGHT);
    const ctx = tex?.getContext();
    if (tex && ctx) {
      const r = Math.hypot(VIEW_WIDTH, VIEW_HEIGHT) / 2;
      const grad = ctx.createRadialGradient(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, r * VIGNETTE.inner, VIEW_WIDTH / 2, VIEW_HEIGHT / 2, r);
      const [r8, g8, b8] = hexToRgb(paletteHex(OUTLINE_ID));
      grad.addColorStop(0, `rgba(${r8},${g8},${b8},0)`);
      grad.addColorStop(1, `rgba(${r8},${g8},${b8},${VIGNETTE.alpha})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      tex.refresh();
    }
  }
}
