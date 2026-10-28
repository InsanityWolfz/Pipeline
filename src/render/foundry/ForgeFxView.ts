import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { animFrames, DEPTHS, FX_TEXTURES, VECTOR_KEY } from '../../data/assets';
import { FOUNDRY_FX_FRAMES, MACHINE_WORK } from '../../data/foundryAssets';
import { FORGE_FX_MAX, HEAT, SPARKS } from '../../data/foundryFx';
import { GLOW_TEXTURE } from '../../data/juice';
import type { Quality } from '../../data/settings';
import { registerAnim } from '../anims';
import { colorOf } from '../color';
import { addVectorSprite, textureScale } from '../vector/textures';
import type { ForgeParticle, ForgeParticles } from './forgeParticles';
import type { ForgeAt } from './runningForges';

// 079: the forges' heat drawn: 014's additive glow at each working hot machine's fire (from a pool that grows to the
// most ever on screen), the shimmer over its top (a pool of FORGE_FX_MAX.high sprites made once), and the steam and
// sparks, one Phaser ParticleEmitter each (the particles skill: one batched draw a kind). The emitters only draw, as
// 077's WeatherView: their ops are fixed (Phaser's ranged ops would use the browser's unseeded random); every
// particle's place, size and alpha come each frame from the ForgeParticles model.

type Particle = GameObjects.Particles.Particle;
type Emitter = GameObjects.Particles.ParticleEmitter;

/** A working hot machine's glow and shimmer this frame. */
export interface HeatDrawn {
  glows: number;
  shimmers: number;
}

const LOOP_MS = (MACHINE_WORK.frames / MACHINE_WORK.frameRate) * 1000;

export class ForgeFxView {
  private readonly scene: Scene;
  private readonly glows: GameObjects.Image[] = [];
  private readonly shimmers: GameObjects.Sprite[] = [];
  private readonly steam: Emitter;
  private readonly sparks: Emitter;
  private readonly drawn = new Map<ForgeParticle, Particle>();
  private blend: Quality | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
    registerAnim(scene, FOUNDRY_FX_FRAMES.shimmer);
    for (let i = 0; i < FORGE_FX_MAX.high; i++) {
      const s = addVectorSprite(scene, 0, 0, animFrames(FOUNDRY_FX_FRAMES.shimmer)[0] ?? '').setBlendMode(BlendModes.ADD).setDepth(DEPTHS.foundryFx).setVisible(false);
      this.shimmers.push(s);
    }
    const emitter = (frame: string, reserve: number): Emitter =>
      scene.add.particles(0, 0, VECTOR_KEY, { frame, emitting: false, lifespan: 1e12, speed: 0, angle: 0, scale: 1, alpha: 1, tint: 0xffffff, quantity: 1, frequency: -1, reserve }).setDepth(DEPTHS.foundryFx);
    this.steam = emitter(FOUNDRY_FX_FRAMES.steam, 64);
    this.sparks = emitter(FOUNDRY_FX_FRAMES.spark, 64);
  }

  /** Glows at each working hot machine on screen (`hot`), shimmer over those with effects (`fx`) at the tier's alpha. */
  heat(hot: readonly ForgeAt[], fx: readonly ForgeAt[], quality: Quality, time: number): HeatDrawn {
    const [lo, hi] = HEAT.glow.alpha;
    while (this.glows.length < hot.length) {
      // 014's glow texture (AmbientView made it at boot): a soft stepped halo, tinted the fire's colour.
      this.glows.push(this.scene.add.image(0, 0, FX_TEXTURES.glow).setScale(HEAT.glow.radius / GLOW_TEXTURE.radius).setTint(colorOf(HEAT.glow.color)).setBlendMode(BlendModes.ADD).setDepth(DEPTHS.glow));
    }
    for (const [i, g] of this.glows.entries()) {
      const f = hot[i];
      g.setVisible(f !== undefined);
      if (!f) continue;
      const fire = HEAT.fire[f.pieceId] ?? { x: 0, rise: 10 };
      const beat = (Math.sin((time / LOOP_MS + f.id * 0.37) * Math.PI * 2) + 1) / 2;
      g.setPosition(f.x + fire.x, f.bottom - fire.rise).setAlpha(lo + (hi - lo) * beat);
    }
    const alpha = HEAT.shimmer.alpha[quality];
    let shimmers = 0;
    for (const [i, s] of this.shimmers.entries()) {
      const f = alpha > 0 ? fx[i] : undefined;
      if (!f) {
        if (s.visible) s.stop().setVisible(false);
        continue;
      }
      shimmers += 1;
      const at = HEAT.shimmer.at;
      s.setPosition(f.x + at.x, f.bottom - at.rise).setAlpha(alpha);
      // Its start frame from the piece id, so a row of forges doesn't shimmer in step; kept while it runs.
      if (!s.visible || s.getData('id') !== f.id) {
        s.setVisible(true).setData('id', f.id);
        s.play({ key: FOUNDRY_FX_FRAMES.shimmer.key, startFrame: f.id % FOUNDRY_FX_FRAMES.shimmer.frames });
      }
    }
    return { glows: hot.length, shimmers };
  }

  /** Draws the model: new particles emitted, the dead freed, each placed, sized and faded; sparks additive by tier. */
  draw(model: ForgeParticles, dead: readonly ForgeParticle[], quality: Quality): void {
    if (this.blend !== quality) {
      this.blend = quality;
      this.sparks.setBlendMode(SPARKS.additive.includes(quality) ? BlendModes.ADD : BlendModes.NORMAL);
    }
    for (const p of dead) this.free(p);
    const s = textureScale();
    for (const p of model.particles) {
      let d = this.drawn.get(p);
      if (!d) {
        d = (p.kind === 'steam' ? this.steam : this.sparks).emitParticleAt(p.x, p.y, 1);
        if (!d) continue;
        d.tint = colorOf(p.color);
        this.drawn.set(p, d);
      }
      d.x = p.x;
      d.y = p.y;
      // The steam texture is 7 px across at rest; a spark's is its own size.
      const size = model.sizeOf(p);
      d.scaleX = d.scaleY = (p.kind === 'steam' ? size / 7 : size) / s;
      d.alpha = model.alphaOf(p);
    }
  }

  private free(p: ForgeParticle): void {
    this.drawn.get(p)?.kill();
    this.drawn.delete(p);
  }

  /** Hides every glow and shimmer, and frees every particle drawn. */
  hide(dead: readonly ForgeParticle[]): void {
    for (const g of this.glows) g.setVisible(false);
    for (const s of this.shimmers) if (s.visible) s.stop().setVisible(false);
    for (const p of dead) this.free(p);
  }

  /** For the test hook: a shimmer sprite's frame and alpha by machine id. */
  get shimmerShown(): { id: number; alpha: number; frame: string }[] {
    return this.shimmers.filter((s) => s.visible).map((s) => ({ id: Number(s.getData('id')), alpha: s.alpha, frame: s.frame.name }));
  }

  /** The glows showing, with their alpha. */
  get glowShown(): { x: number; y: number; alpha: number }[] {
    return this.glows.filter((g) => g.visible).map((g) => ({ x: g.x, y: g.y, alpha: g.alpha }));
  }
}

