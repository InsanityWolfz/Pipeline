import type { Cameras, Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { DAMAGE_NUMBERS, PARTICLES, SHAKE, SHAKE_ON, type ParticleBurst } from '../data/juice';
import { introShake } from './bossIntro';
import { settings } from './flow/settingsStore';
import { paletteHex } from '../data/palette';
import { TEXT_STYLES } from '../data/fonts';
import { phaserStyle } from './fonts';
import { textureScale } from './vector/textures';
import { Particles } from './Particles';

// Feel (014): camera shake, damage numbers and particles. The camera lead
// toward the aim was taken out in 015 at Shaun's request.
// Render-only: the sim never waits on any of it.

export type ShakeSize = keyof typeof SHAKE;

/** 080: an intro's shake as logged: full or short, its length and strength, and whether the setting stopped it. */
export interface IntroShakeLog {
  kind: 'intro' | 'intro-short';
  ms: number;
  intensity: number;
  suppressed: boolean;
}

const SHAKE_ORDER: readonly ShakeSize[] = ['small', 'medium', 'big'];

/** How many recent shakes the log keeps: a cap on a debug-only log the test hook reads (021), not tuning. */
const SHAKE_LOG_MAX = 50;

export class JuiceView {
  private readonly scene: Scene;
  private readonly camera: Cameras.Scene2D.Camera;
  readonly particles: Particles;
  private readonly reducedMotion: boolean;
  /** The shake running now and when it ends (scene ms), so a smaller one never cuts it off. */
  private shaking: { size: ShakeSize; until: number } | null = null;
  /** Recent damage numbers, so ones landing together stack instead of overlapping. */
  private recent: { x: number; y: number; at: number }[] = [];
  /** Every shake asked for, oldest first, up to SHAKE_LOG_MAX: the test hook reports it (021). */
  readonly shakes: (ShakeSize | IntroShakeLog['kind'])[] = [];
  /** 080: every intro shake asked for, suppressed or not, and how many times the world camera really shook. */
  readonly introShakes: IntroShakeLog[] = [];
  cameraShakes = 0;
  /** Burn beats' small numbers shown since boot (060), for the test hook. */
  burnNumbers = 0;

  constructor(scene: Scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
    this.particles = new Particles(scene);
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  shake(size: ShakeSize): void {
    this.shakes.push(size);
    if (this.shakes.length > SHAKE_LOG_MAX) this.shakes.shift();
    if (this.reducedMotion || !SHAKE_ON) return;
    const now = this.scene.time.now;
    const running = this.shaking && now < this.shaking.until ? this.shaking.size : null;
    if (running && SHAKE_ORDER.indexOf(size) < SHAKE_ORDER.indexOf(running)) return;
    const s = SHAKE[size];
    this.shaking = { size, until: now + s.ms };
    this.cameraShakes += 1;
    this.camera.shake(s.ms, s.intensity, true);
  }

  /**
   * 080: a boss intro's beat, the only shake the game makes: on the world camera only (the UI camera holds the card,
   * the bar and the HUD still). None with Flashes off ("Flashes and shake") or a system asking for reduced motion,
   * logged as suppressed either way.
   */
  introShake(short: boolean): void {
    const kind = short ? 'intro-short' : 'intro';
    const shake = introShake(short, settings().flashes, this.reducedMotion);
    const look = shake ?? introShake(short, true, false) ?? { ms: 0, intensity: 0 };
    this.shakes.push(kind);
    if (this.shakes.length > SHAKE_LOG_MAX) this.shakes.shift();
    this.introShakes.push({ kind, ms: look.ms, intensity: look.intensity, suppressed: shake === null });
    if (this.introShakes.length > SHAKE_LOG_MAX) this.introShakes.shift();
    if (!shake) return;
    this.cameraShakes += 1;
    this.shaking = null;
    this.camera.shake(shake.ms, shake.intensity, true);
  }

  burst(name: keyof typeof PARTICLES, x: number, y: number, depth?: number): void {
    const burst: ParticleBurst = PARTICLES[name];
    this.particles.emit(burst, x, y, depth ?? DEPTHS.worldUi - 1);
  }

  /**
   * A number that pops up from a hit and floats away, outlined: white on enemies, ember on the player. `small` (060): a
   * burn's beat, smaller and in ember, and none for a sliver that rounds to nothing.
   */
  damageNumber(amount: number, x: number, y: number, onPlayer: boolean, small = false): void {
    if (small && Math.round(amount) < 1) return;
    if (small) this.burnNumbers += 1;
    const n = small ? { ...DAMAGE_NUMBERS, scale: DAMAGE_NUMBERS.scale * DAMAGE_NUMBERS.burn.scale, pop: DAMAGE_NUMBERS.pop * DAMAGE_NUMBERS.burn.scale, enemy: DAMAGE_NUMBERS.burn.color } : DAMAGE_NUMBERS;
    const now = this.scene.time.now;
    this.recent = this.recent.filter((r) => now - r.at < n.stackMs);
    const top = y - (onPlayer ? n.playerAbove : n.enemyAbove);
    const stacked = this.recent.filter((r) => Math.abs(r.x - x) < n.stackNear && Math.abs(r.y - top) < n.stackNear * 2).length;
    const startY = top - stacked * n.stackPx;
    this.recent.push({ x, y: top, at: now });

    // One Text sized at its settled scale and drawn at the resolution of its biggest pop, so it stays sharp (020).
    // The float face's dark outline reads over a white hit flash.
    const style = phaserStyle('float', textureScale() * (n.pop / n.scale));
    const size = TEXT_STYLES.float.size * n.scale;
    const box = this.scene.add
      .text(0, 0, String(Math.round(amount)), { ...style, fontSize: `${size}px`, strokeThickness: TEXT_STYLES.float.strokeWidth * n.scale, color: paletteHex(onPlayer ? n.player : n.enemy), stroke: paletteHex(n.outline) })
      .setOrigin(0.5)
      .setDepth(DEPTHS.worldUi + 1);
    const jitter = (Math.random() - 0.5) * n.jitter;
    box.setPosition(Math.round(x + jitter), Math.round(startY)).setScale(n.pop / n.scale);
    this.scene.tweens.add({ targets: box, scale: 1, duration: n.lifeMs / 5, ease: 'Back.Out' });
    this.scene.tweens.add({
      targets: box,
      y: startY - n.rise,
      alpha: 0,
      delay: n.lifeMs / 3,
      duration: (n.lifeMs * 2) / 3,
      onComplete: () => box.destroy(),
    });
  }

  /** Particles run on the tween clock (034), so the test hook's tween speed can hold a short burst for a screenshot. */
  update(deltaMs: number): void {
    this.particles.update(deltaMs * this.scene.tweens.timeScale);
  }
}
