import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { DEPTHS, WEATHER_TEXTURES } from '../../data/assets';
import { DECOR_REGIONS } from '../../data/decor';
import type { Quality } from '../../data/settings';
import { WEATHER, type WeatherLayer } from '../../data/weather';
import { colorOf } from '../color';
import { textureScale } from '../vector/textures';
import { WeatherModel, type WeatherParticle } from './weatherModel';

// 077: the weather drawn: one Phaser ParticleEmitter per layer (the particles skill), so each layer is one batched
// draw. The emitters only draw: they emit nothing on their own and their ops are fixed values (Phaser's ranged ops
// would draw from the browser's unseeded random), and every particle's place, colour and alpha come each frame from WeatherModel, whose
// values come from the render-side stream. Never on the HUD camera (the emitters scroll with the world).

type Particle = GameObjects.Particles.Particle;

/** Each layer by id, and the texture its particles show. */
const LAYERS = new Map<string, WeatherLayer>(DECOR_REGIONS.flatMap((r) => WEATHER[r].layers.map((l) => [l.id, l] as const)));
const TEXTURE: Record<WeatherLayer['look'], string> = { dot: WEATHER_TEXTURES.dot, flake: WEATHER_TEXTURES.flake, streak: WEATHER_TEXTURES.streak, splash: WEATHER_TEXTURES.splash };

/** The particle textures, white, drawn once at the vector textures' scale (px a texel): a dot, a flake, a streak, a splash. */
function makeTextures(scene: Scene): void {
  const s = textureScale();
  const make = (key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, Math.ceil(w * s), Math.ceil(h * s));
    const c = tex?.getContext();
    if (!tex || !c) return;
    c.scale(s, s);
    c.fillStyle = '#ffffff';
    draw(c);
    tex.refresh();
  };
  make(WEATHER_TEXTURES.dot, 1, 1, (c) => c.fillRect(0, 0, 1, 1));
  make(WEATHER_TEXTURES.flake, 2, 1.4, (c) => {
    c.beginPath();
    c.ellipse(1, 0.7, 1, 0.7, 0, 0, Math.PI * 2);
    c.fill();
  });
  make(WEATHER_TEXTURES.streak, 1, 7, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 7);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(255,255,255,1)');
    c.fillStyle = g;
    c.fillRect(0, 0, 1, 7);
  });
  make(WEATHER_TEXTURES.splash, 6, 3, (c) => {
    for (const [x, y] of [[0.8, 1.6], [3, 0.7], [5.2, 1.6]] as const) {
      c.beginPath();
      c.arc(x, y, 0.6, 0, Math.PI * 2);
      c.fill();
    }
  });
}

export class WeatherView {
  private readonly emitters = new Map<string, GameObjects.Particles.ParticleEmitter>();
  /** Each modelled particle's drawn one. */
  private readonly drawn = new Map<WeatherParticle, Particle>();
  private additive: Quality | null = null;

  constructor(scene: Scene) {
    makeTextures(scene);
    for (const [id, layer] of LAYERS) {
      const e = scene.add.particles(0, 0, TEXTURE[layer.look], { emitting: false, lifespan: 1e12, speed: 0, angle: 0, scale: 1, alpha: 1, tint: 0xffffff, quantity: 1, frequency: -1, reserve: layer.count.high });
      this.emitters.set(id, e.setDepth(DEPTHS.weather));
    }
  }

  /** Draws the model's particles: new ones emitted, the dead freed, each placed, tinted and faded; blends set by tier. */
  draw(model: WeatherModel, dead: readonly WeatherParticle[], quality: Quality): void {
    if (this.additive !== quality) {
      this.additive = quality;
      for (const [id, e] of this.emitters) e.setBlendMode(LAYERS.get(id)?.additive.includes(quality) ? BlendModes.ADD : BlendModes.NORMAL);
    }
    for (const p of dead) {
      this.drawn.get(p)?.kill();
      this.drawn.delete(p);
    }
    const s = textureScale();
    for (const p of model.particles) {
      const layer = LAYERS.get(p.layer);
      if (!layer) continue;
      let d = this.drawn.get(p);
      if (!d) {
        const e = this.emitters.get(p.layer);
        d = e?.emitParticleAt(p.x, p.y, 1);
        if (!d) continue;
        d.tint = colorOf(p.color);
        d.scaleX = (layer.look === 'dot' ? p.size : 1) / s;
        d.scaleY = d.scaleX;
        this.drawn.set(p, d);
      }
      d.x = p.x;
      d.y = p.y;
      d.alpha = WeatherModel.alpha(p, layer);
      if (layer.look === 'streak') d.angle = (Math.atan2(p.vy, p.vx) * 180) / Math.PI - 90;
    }
  }

  /** Clears every particle (the overworld left, or weather off). */
  clear(model: WeatherModel): void {
    for (const d of this.drawn.values()) d.kill();
    this.drawn.clear();
    model.particles.length = 0;
  }
}
