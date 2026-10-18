import type { Cameras, GameObjects, Scene } from 'phaser';
import { ATLAS_KEY, DEPTHS, digitFrame, HUD_DIGITS } from '../data/assets';
import { CAMERA_LEAD, DAMAGE_NUMBERS, HIT_STOP, PARTICLES, SHAKE, type ParticleBurst } from '../data/juice';
import { colorOf } from './color';
import { Particles } from './Particles';

// Feel (014): camera shake and lead, hit-stop, damage numbers and particles.
// Render-only: the sim never waits on any of it.

export type ShakeSize = keyof typeof SHAKE;

export class JuiceView {
  private readonly scene: Scene;
  private readonly camera: Cameras.Scene2D.Camera;
  readonly particles: Particles;
  private readonly reducedMotion: boolean;
  /** Frames left in the current hit-stop. */
  private stopFrames = 0;
  private lead = { x: 0, y: 0 };

  constructor(scene: Scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
    this.particles = new Particles(scene);
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  shake(size: ShakeSize): void {
    if (this.reducedMotion) return;
    const s = SHAKE[size];
    this.camera.shake(s.ms, s.intensity, true);
  }

  /** Holds every world animation still for a few frames; positions still follow the sim. */
  hitStop(kind: keyof typeof HIT_STOP): void {
    this.stopFrames = Math.max(this.stopFrames, HIT_STOP[kind]);
    this.scene.anims.pauseAll();
  }

  burst(name: keyof typeof PARTICLES, x: number, y: number, depth?: number): void {
    const burst: ParticleBurst = PARTICLES[name];
    this.particles.emit(burst, x, y, depth ?? DEPTHS.worldUi - 1);
  }

  /** A number that pops up from a hit and floats away: white on enemies, red on the player. */
  damageNumber(amount: number, x: number, y: number, onPlayer: boolean): void {
    const text = String(Math.round(amount));
    const tint = colorOf(onPlayer ? DAMAGE_NUMBERS.player : DAMAGE_NUMBERS.enemy);
    const dark = colorOf(DAMAGE_NUMBERS.outline);
    const width = text.length * HUD_DIGITS.advance;
    // A dark copy offset round each glyph outlines it, so it reads over a white hit flash.
    const glyph = (ch: string, i: number, dx: number, dy: number, color: number): GameObjects.Image =>
      this.scene.add.image(i * HUD_DIGITS.advance - width / 2 + dx, dy, ATLAS_KEY, digitFrame(ch)).setOrigin(0, 0.5).setTint(color);
    const ring = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;
    const glyphs: GameObjects.Image[] = [...text].flatMap((ch, i) => [
      ...ring.map(([dx, dy]) => glyph(ch, i, dx, dy, dark)),
      glyph(ch, i, 0, 0, tint),
    ]);
    const jitter = (Math.random() - 0.5) * 8;
    const box = this.scene.add.container(Math.round(x + jitter), Math.round(y), glyphs).setDepth(DEPTHS.worldUi + 1);
    box.setScale(DAMAGE_NUMBERS.pop);
    this.scene.tweens.add({ targets: box, scale: DAMAGE_NUMBERS.scale, duration: DAMAGE_NUMBERS.lifeMs / 5, ease: 'Back.Out' });
    this.scene.tweens.add({
      targets: box,
      y: y - DAMAGE_NUMBERS.rise,
      alpha: 0,
      delay: DAMAGE_NUMBERS.lifeMs / 3,
      duration: (DAMAGE_NUMBERS.lifeMs * 2) / 3,
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
        const reach = Math.min(1, len / (CAMERA_LEAD.px * 6));
        tx = (dx / len) * CAMERA_LEAD.px * reach;
        ty = (dy / len) * CAMERA_LEAD.px * reach;
      }
    }
    this.lead.x += (tx - this.lead.x) * CAMERA_LEAD.ease;
    this.lead.y += (ty - this.lead.y) * CAMERA_LEAD.ease;
    // A follow offset pulls the target the other way, so it's negated.
    this.camera.setFollowOffset(-Math.round(this.lead.x), -Math.round(this.lead.y));
  }

  /** Snaps the lead back to centre (build mode, menus, room swaps). */
  resetLead(): void {
    this.lead = { x: 0, y: 0 };
    this.camera.setFollowOffset(0, 0);
  }

  update(deltaMs: number): void {
    this.particles.update(deltaMs);
    if (this.stopFrames > 0) {
      this.stopFrames -= 1;
      if (this.stopFrames === 0) this.scene.anims.resumeAll();
    }
  }
}
