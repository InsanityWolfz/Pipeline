import { BlendModes, type GameObjects, type Scene } from 'phaser';
import type { FxBurst } from '../data/ammoFx';
import { FX_QUALITY, type FxPriority } from '../data/fxQuality';
import { PARTICLE_SHARES, type ParticleBurst } from '../data/juice';
import type { Quality } from '../data/settings';
import { colorOf } from './color';
import { Pool } from './fx/fxPool';
import { fxCount } from './fx/roundFx';
import type { ParticleKind, ParticleLedger } from './particleBudget';

// Small particles for feel (014): sparks, dust, chips, embers and motes, moved by hand every frame; render-only
// randomness is fine here because nothing feeds back into the sim. 078: a pool. Its squares are made once, up to the
// tier's high-water mark (the death share and the effect share), hidden when they die and reused through a
// swap-remove live list, so emitting makes no object, array, closure or tween. Every particle reports to the scene's
// ledger, and a burst is thinned to the room its kind and priority have (src/render/particleBudget.ts) and scaled by
// the Graphics quality (Medium is 014's counts).

interface Particle {
  rect: GameObjects.Rectangle;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  age: number;
  life: number;
  size: number;
  grow: number;
  alpha: number;
  kind: ParticleKind;
  priority: FxPriority;
  /** 076: a death's ley mote (its palette id); null for any other particle. */
  mote: string | null;
}

/** 076: one death mote: where it starts (already lifted to the body), its colour, size and look. */
export interface Mote {
  x: number;
  y: number;
  color: string;
}

const between = (r: readonly [number, number]): number => r[0] + Math.random() * (r[1] - r[0]);
const AIM: Readonly<Record<NonNullable<FxBurst['aim']>, number | null>> = { flight: 0, up: -Math.PI / 2, down: Math.PI / 2, round: null };

export class Particles {
  private readonly scene: Scene;
  /** 078: the scene's ledger this pool reports to. */
  readonly ledger: ParticleLedger;
  private readonly quality: () => Quality;
  private readonly pool: Pool<Particle>;
  private motes = 0;
  /** 076: death motes thrown since boot, for tests (a peak count misses waves a slow runner lets expire). */
  private thrown = 0;
  /** 078: live effect particles by priority, and the most the pool has been warmed to. */
  private readonly priorities: Record<FxPriority, number> = { cue: 0, shot: 0, soft: 0 };
  private warmed = 0;

  constructor(scene: Scene, ledger: ParticleLedger, quality: () => Quality) {
    this.scene = scene;
    this.ledger = ledger;
    this.quality = quality;
    this.pool = new Pool(() => ({
      rect: scene.add.rectangle(0, 0, 1, 1, 0xffffff).setOrigin(0.5).setVisible(false),
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      gravity: 0,
      age: 0,
      life: 1,
      size: 1,
      grow: 1,
      alpha: 1,
      kind: 'effect',
      priority: 'shot',
      mote: null,
    }));
    this.warm();
  }

  /** Makes the pool's squares up to the tier's high-water mark (the death and effect shares), once; it only grows. */
  private warm(): void {
    const s = PARTICLE_SHARES[this.quality()];
    const want = s.death + s.effect;
    if (want <= this.warmed) return;
    const taken = Math.max(0, want - this.pool.created);
    for (let i = 0; i < taken; i++) this.pool.take();
    for (let i = 0; i < taken; i++) this.pool.release(this.pool.live.length - 1);
    this.warmed = want;
  }

  /** How many particles are flying now, for the test hook (064: a shot waits for a burst's sparks to go). */
  get count(): number {
    return this.pool.live.length;
  }

  /** 078: the pool's objects made since boot, and the live effects by priority. */
  get created(): number {
    return this.pool.created;
  }

  get byPriority(): Record<FxPriority, number> {
    return { ...this.priorities };
  }

  /** One particle from the pool, or none when the kind has no room. */
  private spawn(kind: ParticleKind, priority: FxPriority, color: string, x: number, y: number, depth: number, size: number, add: boolean): Particle {
    const p = this.pool.take();
    p.kind = kind;
    p.priority = priority;
    p.x = x;
    p.y = y;
    p.age = 0;
    p.size = size;
    p.grow = size;
    p.alpha = 1;
    p.mote = null;
    p.rect.setFillStyle(colorOf(color)).setDepth(depth).setScale(size).setAlpha(1).setVisible(true).setBlendMode(add ? BlendModes.ADD : BlendModes.NORMAL).setPosition(Math.round(x), Math.round(y));
    this.ledger.add(kind);
    if (kind === 'effect') this.priorities[priority] += 1;
    return p;
  }

  /** 014's bursts from a ground point: drawn `lift` px up at `depth`, scaled by the tier, within the effect share's room. Returns how many flew. */
  emit(burst: ParticleBurst, x: number, y: number, depth = y + 1, priority: FxPriority = 'shot'): number {
    const q = this.quality();
    this.warm();
    const n = Math.min(fxCount(burst.count, q, false), this.ledger.room('effect', priority, q));
    for (let i = 0; i < n; i++) {
      const p = this.spawn('effect', priority, burst.colors[Math.floor(Math.random() * burst.colors.length)] ?? 'snow', x, y - (burst.lift ?? 0), depth, burst.size, false);
      const angle = burst.angle === undefined ? Math.random() * Math.PI * 2 : burst.angle + (Math.random() - 0.5) * (burst.spread ?? 0);
      const speed = between(burst.speed);
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.gravity = burst.gravity;
      p.life = between(burst.lifeMs);
    }
    return Math.max(0, n);
  }

  /**
   * 078: one of a look's bursts at `x, y` (a ground point; it lifts by `lift`), aimed along `angle` for `aim: 'flight'`,
   * scaled by the tier (an impact keeps at least one) and thinned to the effect share's room for `priority`.
   */
  emitFx(b: FxBurst, x: number, y: number, depth: number, angle: number, priority: FxPriority, impact: boolean, scale = 1): number {
    const q = this.quality();
    this.warm();
    const add = (b.additive ?? false) && FX_QUALITY[q].additive;
    const n = Math.min(fxCount(Math.round(b.count * scale), q, impact), this.ledger.room('effect', priority, q));
    const aim = AIM[b.aim ?? 'round'];
    for (let i = 0; i < n; i++) {
      const p = this.spawn('effect', priority, b.colors[Math.floor(Math.random() * b.colors.length)] ?? 'snow', x, y - (b.lift ?? 0), depth, b.size, add);
      const a = aim === null ? Math.random() * Math.PI * 2 : aim + (b.aim === 'flight' ? angle : 0) + (Math.random() - 0.5) * (b.cone ?? 0);
      const speed = between(b.speed);
      p.vx = Math.cos(a) * speed;
      p.vy = Math.sin(a) * speed;
      p.gravity = b.gravity;
      p.life = between(b.lifeMs);
      p.grow = b.grow ?? b.size;
      p.alpha = b.alpha ?? 1;
      p.rect.setAlpha(p.alpha);
    }
    return Math.max(0, n);
  }

  /** 076: death motes, one from each point, drifting at `speed` px/s all round and rising (`gravity` < 0); additive with `add`. */
  emitMotes(motes: readonly Mote[], o: { speed: readonly [number, number]; gravity: number; lifeMs: readonly [number, number]; size: number; add: boolean; depth: number }): void {
    this.warm();
    for (const m of motes) {
      const p = this.spawn('death', 'cue', m.color, m.x, m.y, o.depth, o.size, o.add);
      const angle = Math.random() * Math.PI * 2;
      const speed = between(o.speed);
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.gravity = o.gravity;
      p.life = between(o.lifeMs);
      p.mote = m.color;
      this.motes += 1;
      this.thrown += 1;
    }
  }

  /** 076: death motes flying now. */
  get deathMotes(): number {
    return this.motes;
  }

  /** 076: death motes thrown since boot. */
  get motesThrown(): number {
    return this.thrown;
  }

  /** 076: the death motes flying now, by palette id. */
  get moteColors(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const p of this.pool.live) if (p.mote) out[p.mote] = (out[p.mote] ?? 0) + 1;
    return out;
  }

  private free(i: number): void {
    const p = this.pool.live[i];
    if (!p) return;
    if (p.mote) this.motes -= 1;
    if (p.kind === 'effect') this.priorities[p.priority] -= 1;
    this.ledger.remove(p.kind);
    p.rect.setVisible(false);
    this.pool.release(i);
  }

  update(deltaMs: number): void {
    const dt = deltaMs / 1000;
    const live = this.pool.live;
    for (let i = live.length - 1; i >= 0; i--) {
      const p = live[i];
      if (!p) continue;
      p.age += deltaMs;
      if (p.age >= p.life) {
        this.free(i);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const k = p.age / p.life;
      p.rect.setPosition(Math.round(p.x), Math.round(p.y)).setAlpha(p.alpha * (1 - k * k));
      if (p.grow !== p.size) p.rect.setScale(p.size + (p.grow - p.size) * k);
    }
  }

  /** Clears everything, as a room swap does. */
  clear(): void {
    for (let i = this.pool.live.length - 1; i >= 0; i--) this.free(i);
    this.motes = 0;
  }
}
