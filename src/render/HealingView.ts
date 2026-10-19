import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { DEPTHS, FX_TEXTURES } from '../data/assets';
import { GLOW_TEXTURE } from '../data/juice';
import { OVERWORLD } from '../data/overworld';
import { FOUNDRY_ROOM } from '../data/rooms';
import { SPRING_LOOK, SPRING_SPRITES } from '../data/springAssets';
import { springAt } from '../sim/healing';
import { safeZones } from '../sim/population';
import type { SimState } from '../sim/state';
import { tileCentre } from '../sim/tiles';
import { colorOf } from './color';
import { addVector, textureScale } from './vector/textures';

// The Ley Springs (030) and the signs of healing: each spring's pool with its slow
// ripples and soft light, and, while the sim says the player is healing, cyan motes
// rising off them with a sign of the source: the spring's light swelling under them,
// a faint thread from the claimed pylon, or a warm-to-cyan shimmer in the foundry.
// Looks only; render-side randomness is fine here.

/** What the healing view shows, for the test hook. */
export interface HealingShown {
  /** Springs drawn (in the overworld). */
  springs: number;
  /** Healing motes in the air. */
  motes: number;
  /** The pylon's thread to the player is drawn. */
  thread: boolean;
  /** How far the foundry's shimmer is through its loop (0..1), or null when it isn't showing. */
  shimmer: number | null;
  /** The spring whose light swells under a healing player, or null. */
  poolGlow: string | null;
}

export const NO_HEALING_SHOWN: HealingShown = { springs: 0, motes: 0, thread: false, shimmer: null, poolGlow: null };

interface SpringArt {
  id: string;
  objects: GameObjects.Image[];
  ripples: GameObjects.Image[];
  light: GameObjects.Image;
  /** 0..1: how far the light has swelled toward its healing look. */
  swell: number;
}

interface Mote {
  image: GameObjects.Image;
  x: number;
  y: number;
  speed: number;
  phase: number;
  age: number;
  life: number;
  scale: number;
}

const GLOW_SIZE = GLOW_TEXTURE.radius;
const between = (r: readonly [number, number]): number => r[0] + Math.random() * (r[1] - r[0]);

/** A palette colour part way to another, as a tint. */
function blend(from: string, to: string, t: number): number {
  const a = colorOf(from);
  const b = colorOf(to);
  const mix = (shift: number) => Math.round(((a >> shift) & 0xff) * (1 - t) + ((b >> shift) & 0xff) * t) << shift;
  return mix(16) | mix(8) | mix(0);
}

export class HealingView {
  private readonly scene: Scene;
  private readonly thread: GameObjects.Graphics;
  private readonly threadGlow: GameObjects.Graphics;
  private shimmer: { light: GameObjects.Image; ring: GameObjects.Image } | null = null;
  private springs: SpringArt[] = [];
  private motes: Mote[] = [];
  private time = 0;
  private moteMs = 0;
  private shimmerMs = -1;
  private roomId = '';
  private poolGlow: string | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
    this.threadGlow = scene.add.graphics().setDepth(DEPTHS.supplyLine).setBlendMode(BlendModes.ADD);
    this.thread = scene.add.graphics().setDepth(DEPTHS.supplyLine + 1);
  }

  get shown(): HealingShown {
    return {
      springs: this.springs.filter((s) => s.light.visible).length,
      motes: this.motes.length,
      thread: this.thread.visible,
      shimmer: this.shimmer?.light.visible ? this.shimmerMs / SPRING_LOOK.shimmer.ms : null,
      poolGlow: this.poolGlow,
    };
  }

  update(sim: SimState, shown: string, deltaMs: number): void {
    this.time += deltaMs;
    if (shown !== this.roomId) {
      this.roomId = shown;
      for (const m of this.motes) m.image.destroy();
      this.motes = [];
    }
    // The light texture is made by the ambient view, built after this one.
    if (!this.shimmer && this.scene.textures.exists(FX_TEXTURES.glow)) this.build();
    const p = sim.player;
    const source = shown === sim.roomId ? p.healing : null;
    this.poolGlow = source === 'spring' ? (springAt(sim.roomId, p.x, p.y)?.id ?? null) : null;
    this.drawSprings(shown === OVERWORLD.id, deltaMs);
    this.drawMotes(p, source !== null, deltaMs);
    this.drawThread(sim, source === 'pylon');
    this.drawShimmer(p, source === 'foundry' && shown === FOUNDRY_ROOM, deltaMs);
  }

  private build(): void {
    const L = SPRING_LOOK;
    this.springs = OVERWORLD.springs.map((s) => {
      const { x, y } = tileCentre(s);
      const pool = addVector(this.scene, x, y, SPRING_SPRITES.spring).setDepth(DEPTHS.floor + 0.6);
      const ripples = L.ripples.at.map(([dx, dy]) => addVector(this.scene, x + dx, y + dy, SPRING_SPRITES.ripple).setDepth(DEPTHS.floor + 0.7));
      const light = this.scene.add.image(x, y, FX_TEXTURES.glow).setTint(colorOf(L.light.color)).setBlendMode(BlendModes.ADD).setDepth(DEPTHS.glow);
      return { id: s.id, objects: [pool, ...ripples, light], ripples, light, swell: 0 };
    });
    this.shimmer = {
      light: this.scene.add.image(0, 0, FX_TEXTURES.glow).setBlendMode(BlendModes.ADD).setVisible(false),
      ring: addVector(this.scene, 0, 0, SPRING_SPRITES.ring).setBlendMode(BlendModes.ADD).setVisible(false),
    };
  }

  /** Ripples scale out and fade on a slow loop; the light breathes, and swells under a healing player. */
  private drawSprings(visible: boolean, deltaMs: number): void {
    const { ripples: R, light: G } = SPRING_LOOK;
    const breathe = (Math.sin((this.time / G.breatheMs) * Math.PI * 2) + 1) / 2;
    for (const s of this.springs) {
      for (const o of s.objects) o.setVisible(visible);
      if (!visible) continue;
      s.ripples.forEach((r, i) => {
        const t = ((this.time + (i * R.period) / s.ripples.length) % R.period) / R.period;
        r.setScale((R.from + (R.to - R.from) * t) / textureScale()).setAlpha(R.alpha * Math.sin(Math.PI * t));
      });
      const target = s.id === this.poolGlow ? 1 : 0;
      const step = deltaMs / G.easeMs;
      s.swell = target > s.swell ? Math.min(target, s.swell + step) : Math.max(target, s.swell - step);
      const rest = G.alpha[0] + (G.alpha[1] - G.alpha[0]) * breathe;
      s.light.setAlpha(rest + (G.healAlpha - rest) * s.swell).setScale((G.radius / GLOW_SIZE) * (1 + (G.healScale - 1) * s.swell));
    }
  }

  /** Sparkles rising off a healing player, swaying as they go, fading in and out. */
  private drawMotes(p: { x: number; y: number }, on: boolean, deltaMs: number): void {
    const L = SPRING_LOOK.motes;
    this.moteMs = on ? this.moteMs + deltaMs : 0;
    while (on && this.moteMs >= L.everyMs) {
      this.moteMs -= L.everyMs;
      const x = p.x + (Math.random() * 2 - 1) * L.spread;
      const y = p.y - between(L.start);
      const image = addVector(this.scene, x, y, SPRING_SPRITES.mote).setDepth(DEPTHS.motes);
      this.motes.push({ image, x, y, speed: between(L.speed), phase: Math.random() * Math.PI * 2, age: 0, life: between(L.lifeMs), scale: between(L.scale) });
    }
    const dt = deltaMs / 1000;
    this.motes = this.motes.filter((m) => {
      m.age += deltaMs;
      if (m.age >= m.life) {
        m.image.destroy();
        return false;
      }
      const t = m.age / m.life;
      m.y -= m.speed * dt;
      m.image
        .setPosition(m.x + Math.sin(m.phase + m.age / 180) * L.sway, m.y)
        .setAlpha(Math.min(1, t * 6) * (1 - t * t))
        .setScale((m.scale * (1 - t * 0.4)) / textureScale());
      return true;
    });
  }

  /** A faint cyan thread from the claimed pylon whose zone the player heals in, waving like the supply tendril. */
  private drawThread(sim: SimState, on: boolean): void {
    const L = SPRING_LOOK.thread;
    const p = sim.player;
    const zone = on ? safeZones(sim).find((z) => z.roomId === sim.roomId && Math.hypot(p.x - z.x, p.y - z.y) <= z.r) : undefined;
    this.thread.clear().setVisible(zone !== undefined);
    this.threadGlow.clear().setVisible(zone !== undefined);
    if (!zone) return;
    const top = { x: zone.x, y: zone.y - L.pylonRise };
    const dx = p.x - top.x;
    const dy = p.y - L.playerRise - top.y;
    const len = Math.hypot(dx, dy) || 1;
    const points = Array.from({ length: L.steps + 1 }, (_, i) => {
      const k = i / L.steps;
      const wave = Math.sin(k * Math.PI * 2 * L.waves + this.time / L.waveMs) * L.wobble * Math.sin(k * Math.PI);
      return { x: top.x + dx * k - (dy / len) * wave, y: top.y + dy * k + (dx / len) * wave };
    });
    for (const [g, width, alpha, color] of [
      [this.threadGlow, L.glowWidth, L.glowAlpha, L.glow],
      [this.thread, L.width, L.alpha, L.color],
    ] as const) {
      g.lineStyle(width, colorOf(color), alpha).beginPath();
      points.forEach((q, i) => (i === 0 ? g.moveTo(q.x, q.y) : g.lineTo(q.x, q.y)));
      g.strokePath();
    }
  }

  /** In the foundry: a light round the player and a ring on the floor, swelling and fading, warm turning to cyan, on a short loop. */
  private drawShimmer(p: { x: number; y: number }, on: boolean, deltaMs: number): void {
    const L = SPRING_LOOK.shimmer;
    const fx = this.shimmer;
    if (!fx) return;
    // A loop already running plays out, so the last one fades rather than cuts.
    if (on && this.shimmerMs < 0) this.shimmerMs = 0;
    else if (this.shimmerMs >= 0) this.shimmerMs += deltaMs;
    if (this.shimmerMs >= L.ms) this.shimmerMs = on ? this.shimmerMs % L.ms : -1;
    const showing = this.shimmerMs >= 0;
    fx.light.setVisible(showing);
    fx.ring.setVisible(showing);
    if (!showing) return;
    const t = this.shimmerMs / L.ms;
    const tint = blend(L.warm, L.cool, Math.min(1, t * 1.5));
    const fade = Math.sin(Math.PI * t);
    fx.light
      .setPosition(p.x, p.y - L.rise)
      .setDepth(p.y + 1)
      .setScale((L.radius / GLOW_SIZE) * (L.from + (L.to - L.from) * t))
      .setAlpha(L.alpha * fade)
      .setTint(tint);
    fx.ring
      .setPosition(p.x, p.y)
      .setDepth(DEPTHS.groundFx)
      .setScale((L.ringFrom + (L.ringTo - L.ringFrom) * t) / textureScale())
      .setAlpha(L.ringAlpha * fade)
      .setTint(tint);
  }
}
