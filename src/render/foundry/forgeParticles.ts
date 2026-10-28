import type { FxPuff } from '../../data/foundryFx';
import { MACHINE_SPARKS } from '../../data/fxQuality';
import { nextFloat, type RngState } from '../../sim/rng';

// 079: the forges' steam, quench puffs and sparks as a model (render only, pure): each particle's place, motion, size,
// alpha and life, every value from the render-side seeded stream, as 077's weather model. Steam rises, drifts, grows and
// fades; sparks fly up in 078's machine-spark cone and fall. ForgeFxView draws it with one emitter for each kind.

export type ForgeParticleKind = 'steam' | 'spark';

export interface ForgeParticle {
  kind: ForgeParticleKind;
  x: number;
  y: number;
  /** px/s, up is negative. */
  vx: number;
  vy: number;
  /** ms. */
  age: number;
  life: number;
  color: string;
  size: readonly [number, number];
  alpha: readonly [number, number];
  /** px/s², down is positive. */
  gravity: number;
}

const between = (rng: RngState, r: readonly [number, number]): number => r[0] + nextFloat(rng) * (r[1] - r[0]);
const pick = <T>(rng: RngState, list: readonly T[]): T | undefined => list[Math.floor(nextFloat(rng) * list.length)];

export class ForgeParticles {
  readonly particles: ForgeParticle[] = [];
  private readonly rng: RngState;

  constructor(rng: RngState) {
    this.rng = rng;
  }

  /** `n` soft steam blobs from (x, y): rising, drifting either way, growing and fading. */
  puff(x: number, y: number, look: FxPuff, n: number): void {
    for (let i = 0; i < n; i++) {
      const color = pick(this.rng, look.colors) ?? 'foam';
      this.particles.push({ kind: 'steam', x: x + (nextFloat(this.rng) * 2 - 1) * 2, y, vx: (nextFloat(this.rng) * 2 - 1) * look.drift, vy: -between(this.rng, look.rise), age: 0, life: between(this.rng, look.lifeMs), color, size: look.size, alpha: look.alpha, gravity: 0 });
    }
  }

  /** `n` sparks from (x, y), thrown up in 078's machine-spark cone at its speeds, falling, in `colors`. */
  sparks(x: number, y: number, colors: readonly string[], n: number): void {
    const S = MACHINE_SPARKS.burst;
    for (let i = 0; i < n; i++) {
      const angle = (nextFloat(this.rng) - 0.5) * S.cone;
      const speed = between(this.rng, S.speed);
      const color = pick(this.rng, colors) ?? 'cinder';
      this.particles.push({ kind: 'spark', x, y, vx: Math.sin(angle) * speed, vy: -Math.cos(angle) * speed, age: 0, life: between(this.rng, S.lifeMs), color, size: [S.size, S.size], alpha: [1, 0.4], gravity: S.gravity });
    }
  }

  /** Moves every particle on `ms`; returns those that died (removed). */
  step(ms: number): ForgeParticle[] {
    const dt = ms / 1000;
    const dead: ForgeParticle[] = [];
    let keep = 0;
    for (const p of this.particles) {
      p.age += ms;
      if (p.age >= p.life) {
        dead.push(p);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      this.particles[keep++] = p;
    }
    this.particles.length = keep;
    return dead;
  }

  sizeOf(p: ForgeParticle): number {
    return p.size[0] + (p.size[1] - p.size[0]) * Math.min(1, p.age / p.life);
  }

  alphaOf(p: ForgeParticle): number {
    return p.alpha[0] + (p.alpha[1] - p.alpha[0]) * Math.min(1, p.age / p.life);
  }

  get count(): number {
    return this.particles.length;
  }

  get counts(): { steam: number; sparks: number } {
    let steam = 0;
    for (const p of this.particles) if (p.kind === 'steam') steam += 1;
    return { steam, sparks: this.particles.length - steam };
  }

  /** Every particle gone (the foundry left, the effects off); returns them, for the view to free. */
  clear(): ForgeParticle[] {
    return this.particles.splice(0);
  }
}
