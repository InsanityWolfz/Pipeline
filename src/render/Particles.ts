import { BlendModes, type GameObjects, type Scene } from 'phaser';
import type { ParticleBurst } from '../data/juice';
import { colorOf } from './color';

// Small pixel particles for feel (014): sparks, dust, chips, embers and motes.
// Each is a rectangle moved by hand every frame; render-only randomness is fine
// here because nothing feeds back into the sim.

interface Particle {
  rect: GameObjects.Rectangle;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  age: number;
  life: number;
  /** 076: a death's ley mote, counted against the live death-mote cap. */
  mote: boolean;
}

/** 076: one death mote: where it starts (already lifted to the body), its colour, size and look. */
export interface Mote {
  x: number;
  y: number;
  color: string;
}

const between = (r: readonly [number, number]): number => r[0] + Math.random() * (r[1] - r[0]);

export class Particles {
  private readonly scene: Scene;
  private readonly live: Particle[] = [];
  private motes = 0;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /** How many particles are flying now, for the test hook (064: a shot waits for a burst's sparks to go). */
  get count(): number {
    return this.live.length;
  }

  /** Throws a burst from a ground point; it draws `lift` px up and sorts just in front of it. */
  emit(burst: ParticleBurst, x: number, y: number, depth = y + 1): void {
    for (let i = 0; i < burst.count; i++) {
      const color = burst.colors[Math.floor(Math.random() * burst.colors.length)] ?? 'snow';
      const angle = burst.angle === undefined ? Math.random() * Math.PI * 2 : burst.angle + (Math.random() - 0.5) * (burst.spread ?? 0);
      const speed = between(burst.speed);
      const rect = this.scene.add.rectangle(x, y, burst.size, burst.size, colorOf(color)).setOrigin(0).setDepth(depth);
      this.live.push({
        rect,
        x,
        y: y - (burst.lift ?? 0),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: burst.gravity,
        age: 0,
        life: between(burst.lifeMs),
        mote: false,
      });
    }
  }

  /** 076: death motes, one from each point, drifting at `speed` px/s all round and rising (`gravity` < 0); additive with `add`. */
  emitMotes(motes: readonly Mote[], o: { speed: readonly [number, number]; gravity: number; lifeMs: readonly [number, number]; size: number; add: boolean; depth: number }): void {
    for (const m of motes) {
      const angle = Math.random() * Math.PI * 2;
      const speed = between(o.speed);
      const rect = this.scene.add.rectangle(m.x, m.y, o.size, o.size, colorOf(m.color)).setOrigin(0.5).setDepth(o.depth);
      if (o.add) rect.setBlendMode(BlendModes.ADD);
      this.live.push({ rect, x: m.x, y: m.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, gravity: o.gravity, age: 0, life: between(o.lifeMs), mote: true });
      this.motes += 1;
    }
  }

  /** 076: death motes flying now. */
  get deathMotes(): number {
    return this.motes;
  }

  update(deltaMs: number): void {
    const dt = deltaMs / 1000;
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i];
      if (!p) continue;
      p.age += deltaMs;
      if (p.age >= p.life) {
        if (p.mote) this.motes -= 1;
        p.rect.destroy();
        this.live.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rect.setPosition(Math.round(p.x), Math.round(p.y)).setAlpha(1 - (p.age / p.life) ** 2);
    }
  }

  /** Clears everything, as a room swap does. */
  clear(): void {
    for (const p of this.live) p.rect.destroy();
    this.live.length = 0;
    this.motes = 0;
  }
}
