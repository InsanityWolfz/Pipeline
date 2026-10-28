import { BlendModes, type GameObjects, type Scene } from 'phaser';
import type { FlashFx, MarkFx, ShockFx } from '../../data/ammoFx';
import { DEPTHS, SHOT_FX_TEXTURES } from '../../data/assets';
import { FX_LOOK, FX_QUALITY } from '../../data/fxQuality';
import type { Quality } from '../../data/settings';
import { colorOf } from '../color';
import { textureScale } from '../vector/textures';
import { makeShotTextures, SHOT_TEXTURE_SIZE as R } from './shotTextures';
import { MarkRing, Pool } from './fxPool';

// 078: what a shot leaves on the ground and its short flashes, from fixed pools of images (made once, hidden, reused):
// - marks (scorch, rime, ley splash) at `shotMark`, capped by tier, the oldest recycled first, fading out;
// - shock rings growing to a blast's radius at `shotMark`, a tier's core ring inside;
// - the flashes (the ley ring, the arrow's tick, the lightning star) at the depth they're given; none with Flashes off.
// Every texture is white, drawn once at boot at the vector scale, and tinted. Marks draw in their own colours in every
// mood (on the world camera only).

interface Mark {
  image: GameObjects.Image;
  ms: number;
  life: number;
  alpha: number;
}

interface Shock {
  ring: GameObjects.Image;
  core: GameObjects.Image;
  ms: number;
  life: number;
  alpha: number;
  /** Its final scale. */
  to: number;
  cored: boolean;
}

interface Flash {
  image: GameObjects.Image;
  ms: number;
  look: FlashFx;
  base: number;
  turn: number;
}

const TEXTURE_OF: Readonly<Record<MarkFx['look'], string>> = { scorch: SHOT_FX_TEXTURES.blot, rime: SHOT_FX_TEXTURES.rime, splash: SHOT_FX_TEXTURES.splash };
const FLASH_TEXTURE: Readonly<Record<FlashFx['look'], string>> = { ring: SHOT_FX_TEXTURES.ring, tick: SHOT_FX_TEXTURES.tick, star: SHOT_FX_TEXTURES.star };

export interface MarksShown {
  live: number;
  created: number;
  cap: number;
  shocks: number;
  flashes: number;
  /** Pooled objects made since boot: marks, shock rings and flashes together. */
  made: number;
}

export class MarkView {
  private readonly marks: MarkRing<Mark>;
  private readonly shocks: Pool<Shock>;
  private readonly flashes: Pool<Flash>;
  private readonly unit: number;
  private cap = 0;

  constructor(scene: Scene) {
    makeShotTextures(scene);
    this.unit = 1 / textureScale();
    const image = (key: string, depth: number) => scene.add.image(0, 0, key).setDepth(depth).setVisible(false);
    this.marks = new MarkRing(() => ({ image: image(SHOT_FX_TEXTURES.blot, DEPTHS.shotMark), ms: 0, life: 1, alpha: 0 }));
    this.shocks = new Pool(() => ({ ring: image(SHOT_FX_TEXTURES.shock, DEPTHS.shotMark + 0.001), core: image(SHOT_FX_TEXTURES.shock, DEPTHS.shotMark + 0.002), ms: 0, life: 1, alpha: 0, to: 1, cored: false }));
    this.flashes = new Pool(() => ({ image: image(SHOT_FX_TEXTURES.ring, 0), ms: 0, look: { look: 'ring', size: 1, ms: 1, frames: 1, color: 'snow', alpha: 1 }, base: 1, turn: 0 }));
  }

  /** A tier's mark cap applies at once: the oldest marks past it go. */
  setQuality(quality: Quality): void {
    if (this.cap === FX_QUALITY[quality].markCap) return;
    this.cap = FX_QUALITY[quality].markCap;
    for (const m of this.marks.trim(this.cap)) m.image.setVisible(false);
    // Pools only grow: a tier's marks, shock rings and flashes are made once, as it comes in.
    this.marks.warm(this.cap);
    this.shocks.warm(FX_LOOK.shockRings);
    this.flashes.warm(FX_LOOK.flashes);
  }

  /** A mark at a ground point: `radius` px for a blast's (`perRadius`), else its own size. */
  mark(look: MarkFx, x: number, y: number, radius: number): void {
    const m = this.marks.place(this.cap);
    const across = look.perRadius ? look.size * 2 * radius : look.size;
    m.ms = 0;
    m.life = look.ms;
    m.alpha = look.alpha;
    m.image
      .setTexture(TEXTURE_OF[look.look])
      .setPosition(x, y)
      .setTint(colorOf(look.color))
      // Flattened to the three-quarter view's ground.
      .setScale((across / R) * this.unit, (across / R) * this.unit * 0.62)
      .setAlpha(look.alpha)
      .setVisible(true);
  }

  /** A shock ring on the ground growing to `radius` px, its core ring in the tier's colour (or none for stone). */
  shock(look: ShockFx & { core: string | null }, x: number, y: number, radius: number): void {
    if (this.shocks.live.length >= FX_LOOK.shockRings) return;
    const s = this.shocks.take();
    s.ms = 0;
    s.life = look.ms;
    s.alpha = look.alpha;
    s.to = ((radius * 2) / R) * this.unit;
    s.cored = look.core !== null;
    s.ring.setPosition(x, y).setTint(colorOf(look.color)).setAlpha(look.alpha).setVisible(true);
    s.core.setPosition(x, y).setTint(colorOf(look.core ?? look.color)).setAlpha(look.alpha).setVisible(s.cored);
    this.stepShock(s);
  }

  /** A flash at a point (already lifted to its height) at `depth`, turned to `angle` (the tick lies along the flight); additive by tier. */
  flash(look: FlashFx, x: number, y: number, depth: number, angle: number, additive: boolean, scale = 1): void {
    if (this.flashes.live.length >= FX_LOOK.flashes) return;
    const f = this.flashes.take();
    f.ms = 0;
    f.look = look;
    f.turn = angle;
    const w = look.look === 'tick' ? 8 : 16;
    f.base = ((look.size * scale) / w) * this.unit;
    f.image
      .setTexture(FLASH_TEXTURE[look.look])
      .setPosition(x, y)
      .setDepth(depth)
      .setRotation(angle)
      .setTint(colorOf(look.color))
      .setBlendMode(additive ? BlendModes.ADD : BlendModes.NORMAL)
      .setAlpha(look.alpha)
      .setScale(f.base)
      .setVisible(true);
  }

  private stepShock(s: Shock): void {
    const t = Math.min(1, s.ms / s.life);
    const k = s.to * (0.2 + 0.8 * Math.sqrt(t));
    const a = s.alpha * (1 - t);
    s.ring.setScale(k, k * 0.62).setAlpha(a);
    if (s.cored) s.core.setScale(k * 0.86, k * 0.86 * 0.62).setAlpha(a);
  }

  update(deltaMs: number): void {
    const marks = this.marks.live;
    for (let i = marks.length - 1; i >= 0; i--) {
      const m = marks[i];
      if (!m) continue;
      m.ms += deltaMs;
      if (m.ms >= m.life) {
        m.image.setVisible(false);
        this.marks.expire(m);
        continue;
      }
      // Held, then fading over the last half of its life.
      const t = m.ms / m.life;
      m.image.setAlpha(m.alpha * Math.min(1, 2 * (1 - t)));
    }
    const shocks = this.shocks.live;
    for (let i = shocks.length - 1; i >= 0; i--) {
      const s = shocks[i];
      if (!s) continue;
      s.ms += deltaMs;
      if (s.ms >= s.life) {
        s.ring.setVisible(false);
        s.core.setVisible(false);
        this.shocks.release(i);
        continue;
      }
      this.stepShock(s);
    }
    const flashes = this.flashes.live;
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      if (!f) continue;
      f.ms += deltaMs;
      if (f.ms >= f.look.ms) {
        f.image.setVisible(false);
        this.flashes.release(i);
        continue;
      }
      const t = f.ms / f.look.ms;
      // Its frames: a ring swells, a star turns 45° and shrinks, a tick holds; each fading.
      const frame = Math.min(f.look.frames - 1, Math.floor(t * f.look.frames));
      const k = f.look.look === 'ring' ? 0.7 + 0.5 * t : f.look.look === 'star' ? 1 - 0.35 * frame : 1;
      f.image.setScale(f.base * k).setRotation(f.turn + (f.look.look === 'star' ? (frame * Math.PI) / 4 : 0)).setAlpha(f.look.alpha * (1 - t * t));
    }
  }

  /** Clears everything (a room swap). */
  clear(): void {
    for (const m of this.marks.trim(0)) m.image.setVisible(false);
    for (const s of this.shocks.live) {
      s.ring.setVisible(false);
      s.core.setVisible(false);
    }
    this.shocks.releaseAll();
    for (const f of this.flashes.live) f.image.setVisible(false);
    this.flashes.releaseAll();
  }

  get shown(): MarksShown {
    return { live: this.marks.live.length, created: this.marks.created, cap: this.cap, shocks: this.shocks.live.length, flashes: this.flashes.live.length, made: this.marks.created + this.shocks.created + this.flashes.created };
  }
}
