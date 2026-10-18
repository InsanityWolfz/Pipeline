import type { Cameras, GameObjects, Scene } from 'phaser';
import { ATLAS_KEY, DEPTHS, digitFrame, HUD_DIGITS } from '../data/assets';
import { CAMERA_LEAD, DAMAGE_NUMBERS, PARTICLES, SHAKE, type ParticleBurst } from '../data/juice';
import { colorOf } from './color';
import { Particles } from './Particles';

// Feel (014): camera shake and lead, damage numbers and particles.
// Render-only: the sim never waits on any of it.

export type ShakeSize = keyof typeof SHAKE;

const SHAKE_ORDER: readonly ShakeSize[] = ['small', 'medium', 'big'];

export class JuiceView {
  private readonly scene: Scene;
  private readonly camera: Cameras.Scene2D.Camera;
  readonly particles: Particles;
  private readonly reducedMotion: boolean;
  private lead = { x: 0, y: 0 };
  /** The shake running now and when it ends (scene ms), so a smaller one never cuts it off. */
  private shaking: { size: ShakeSize; until: number } | null = null;
  /** Recent damage numbers, so ones landing together stack instead of overlapping. */
  private recent: { x: number; y: number; at: number }[] = [];

  constructor(scene: Scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
    this.particles = new Particles(scene);
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  shake(size: ShakeSize): void {
    if (this.reducedMotion) return;
    const now = this.scene.time.now;
    const running = this.shaking && now < this.shaking.until ? this.shaking.size : null;
    if (running && SHAKE_ORDER.indexOf(size) < SHAKE_ORDER.indexOf(running)) return;
    const s = SHAKE[size];
    this.shaking = { size, until: now + s.ms };
    this.camera.shake(s.ms, s.intensity, true);
  }

  burst(name: keyof typeof PARTICLES, x: number, y: number, depth?: number): void {
    const burst: ParticleBurst = PARTICLES[name];
    this.particles.emit(burst, x, y, depth ?? DEPTHS.worldUi - 1);
  }

  /** A number that pops up from a hit and floats away, outlined: white on enemies, ember on the player. */
  damageNumber(amount: number, x: number, y: number, onPlayer: boolean): void {
    const n = DAMAGE_NUMBERS;
    const now = this.scene.time.now;
    this.recent = this.recent.filter((r) => now - r.at < n.stackMs);
    const top = y - (onPlayer ? n.playerAbove : n.enemyAbove);
    const stacked = this.recent.filter((r) => Math.abs(r.x - x) < n.stackNear && Math.abs(r.y - top) < n.stackNear * 2).length;
    const startY = top - stacked * n.stackPx;
    this.recent.push({ x, y: top, at: now });

    const text = String(Math.round(amount));
    const tint = colorOf(onPlayer ? n.player : n.enemy);
    const dark = colorOf(n.outline);
    const width = text.length * HUD_DIGITS.advance;
    // A dark copy offset round each glyph outlines it, so it reads over a white hit flash.
    const glyph = (ch: string, i: number, dx: number, dy: number, color: number): GameObjects.Image =>
      this.scene.add.image(i * HUD_DIGITS.advance - width / 2 + dx, dy, ATLAS_KEY, digitFrame(ch)).setOrigin(0, 0.5).setTint(color);
    const ring = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;
    const glyphs: GameObjects.Image[] = [...text].flatMap((ch, i) => [...ring.map(([dx, dy]) => glyph(ch, i, dx, dy, dark)), glyph(ch, i, 0, 0, tint)]);
    const jitter = (Math.random() - 0.5) * n.jitter;
    const box = this.scene.add.container(Math.round(x + jitter), Math.round(startY), glyphs).setDepth(DEPTHS.worldUi + 1);
    box.setScale(n.pop);
    this.scene.tweens.add({ targets: box, scale: n.scale, duration: n.lifeMs / 5, ease: 'Back.Out' });
    this.scene.tweens.add({
      targets: box,
      y: startY - n.rise,
      alpha: 0,
      delay: n.lifeMs / 3,
      duration: (n.lifeMs * 2) / 3,
      onComplete: () => box.destroy(),
    });
  }

  /** Eases the camera toward `aim` (a world point), or back to centre with none. */
  leadToward(player: { x: number; y: number }, aim: { x: number; y: number } | null): void {
    let tx = 0;
    let ty = 0;
    if (aim) {
      const dx = aim.x - player.x;
      const dy = aim.y - player.y;
      const len = Math.hypot(dx, dy);
      if (len > 0) {
        const reach = Math.min(1, len / (CAMERA_LEAD.px * CAMERA_LEAD.fullAt));
        tx = (dx / len) * CAMERA_LEAD.px * reach;
        ty = (dy / len) * CAMERA_LEAD.px * reach;
      }
    }
    this.lead.x += (tx - this.lead.x) * CAMERA_LEAD.ease;
    this.lead.y += (ty - this.lead.y) * CAMERA_LEAD.ease;
    // A follow offset pulls the target the other way, so it's negated.
    this.camera.setFollowOffset(-Math.round(this.lead.x), -Math.round(this.lead.y));
  }

  /** Snaps the lead back to centre (build mode, room swaps). */
  resetLead(): void {
    this.lead = { x: 0, y: 0 };
    this.camera.setFollowOffset(0, 0);
  }

  update(deltaMs: number): void {
    this.particles.update(deltaMs);
  }
}
