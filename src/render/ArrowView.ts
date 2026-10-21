import type { GameObjects, Scene } from 'phaser';
import { AMMO } from '../data/ammo';
import { DEPTHS } from '../data/assets';
import { ROUND_LOOKS, SHARD_TRAILS, STAGE_SPRITES, TRAIL_SHAPE } from '../data/stageAssets';
import { SPLIT } from '../data/tags';
import { BURNING_LOOK, TALENT_SPRITES } from '../data/talentAssets';
import { DRAW_HEIGHT } from '../data/tube';
import type { ArrowState } from '../sim/arrows';
import { burning } from '../sim/keystones';
import { colorOf } from './color';
import { addVector } from './vector/textures';

type TrailLook = NonNullable<(typeof ROUND_LOOKS)[string]['trail']>;

/** A trail (029) and the drawn points it runs along, newest last. */
interface Trail {
  g: GameObjects.Graphics;
  look: TrailLook;
  points: [number, number][];
}

interface Drawn {
  arrow: GameObjects.Image;
  shadow: GameObjects.Image;
  /** A tagged round's trail (029). */
  trail?: Trail;
  /** A Shard (054: drawn with a short trail). */
  shard?: boolean;
  /** A burning arrow's flame and ember trail (054), from the frame it caught fire. */
  burn?: { tip: GameObjects.Image; trail: Trail };
}

/** The sprite and shadow for a shot: its ammo's, or a Shard's (029), drawn as ice when it's Cold (039.3, 037's ice art). */
function spritesOf(a: Pick<ArrowState, 'ammoId' | 'damageType'>): { sprite: string; shadow: string } {
  const ammo = AMMO[a.ammoId];
  if (ammo) return ammo;
  if (a.ammoId === SPLIT.projectile) return { sprite: a.damageType === 'cold' ? TALENT_SPRITES.coldShard : STAGE_SPRITES.shard, shadow: STAGE_SPRITES.shardShadow };
  throw new Error(`Unknown ammo '${a.ammoId}'`);
}

// Draws arrows in flight: the arrow raised to chest height over a shadow on its
// ground point, sorted by that point. Sprites live as long as their sim arrow.
// A tagged round (029) takes its tag's tint and trail; a Shard is a small sliver.
export class ArrowView {
  private readonly drawn = new Map<number, Drawn>();
  private readonly scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /** How many drawn shots have a trail, and the longest trail's points, for the test hook. */
  get trails(): { count: number; longest: number } {
    const all = [...this.drawn.values()].flatMap((d) => (d.trail ? [d.trail.points.length] : []));
    return { count: all.length, longest: Math.max(0, ...all) };
  }

  /** How many Shards (029, 054's star shot) are drawn, for the test hook. */
  get shards(): number {
    return [...this.drawn.values()].filter((d) => d.shard).length;
  }

  /** How many burning arrows (054) are drawn with their flame, for the test hook. */
  get burning(): number {
    return [...this.drawn.values()].filter((d) => d.burn?.tip.visible).length;
  }

  update(arrows: readonly ArrowState[]): void {
    const live = new Set<number>();
    for (const a of arrows) {
      live.add(a.id);
      const d = this.drawn.get(a.id) ?? this.create(a);
      const angle = Math.atan2(a.dy, a.dx);
      const y = a.y - DRAW_HEIGHT;
      d.shadow.setPosition(a.x, a.y).setRotation(angle);
      d.arrow.setPosition(a.x, y).setRotation(angle).setDepth(a.y);
      if (d.trail) this.drawTrail(d.trail, a.x, y, a.y);
      if (burning(a)) this.drawBurn(d, a, y, angle);
    }
    for (const [id, d] of this.drawn) {
      if (live.has(id)) continue;
      d.arrow.destroy();
      d.shadow.destroy();
      d.trail?.g.destroy();
      d.burn?.tip.destroy();
      d.burn?.trail.g.destroy();
      this.drawn.delete(id);
    }
  }

  /** A burning arrow (054): its flame at the head, flickering, and its ember trail with embers drifting off it. */
  private drawBurn(d: Drawn, a: ArrowState, y: number, angle: number): void {
    const B = BURNING_LOOK;
    d.burn ??= { tip: addVector(this.scene, 0, 0, TALENT_SPRITES.burningTip), trail: { g: this.scene.add.graphics(), look: B.trail, points: [] } };
    const { tip, trail } = d.burn;
    const now = this.scene.time.now;
    const flicker = 1 + B.flicker * Math.sin((now / B.flickerMs) * Math.PI * 2 + a.id);
    const base = Number(tip.getData('base')) || tip.scaleX;
    tip.setData('base', base);
    tip.setPosition(a.x + a.dx * B.tipAhead, y + a.dy * B.tipAhead).setRotation(angle).setDepth(a.y + 0.01).setScale(base * flicker).setAlpha(Math.min(1, 1.1 - B.flicker + B.flicker * flicker));
    this.drawTrail(trail, a.x, y, a.y);
    const E = B.ember;
    const { g, points } = trail;
    for (let i = 0; i < points.length - 1; i += E.every) {
      const p = points[i];
      if (!p) continue;
      const k = (i + 1) / points.length;
      const drift = E.drift * (1 - k) * Math.sin(now / B.flickerMs + i * 1.7 + a.id);
      g.fillStyle(colorOf(E.color), E.alpha * k).fillCircle(p[0] + drift, p[1] - E.drift * (1 - k), E.r);
    }
  }

  private drawTrail(trail: Trail, x: number, y: number, depth: number): void {
    const last = trail.points[trail.points.length - 1];
    if (!last || last[0] !== x || last[1] !== y) trail.points.push([x, y]);
    if (trail.points.length > trail.look.points) trail.points.shift();
    const { g, look, points } = trail;
    g.clear().setDepth(depth - 0.01);
    for (const [color, width] of [[colorOf(look.color), look.width], [colorOf(look.core), look.width * TRAIL_SHAPE.core]] as const) {
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        if (!a || !b) continue;
        const k = i / (points.length - 1);
        g.lineStyle(width * (TRAIL_SHAPE.tail + (1 - TRAIL_SHAPE.tail) * k), color, look.alpha * k).lineBetween(a[0], a[1], b[0], b[1]);
      }
    }
  }

  private create(a: ArrowState): Drawn {
    const { sprite, shadow } = spritesOf(a);
    const d: Drawn = {
      arrow: addVector(this.scene, 0, 0, sprite),
      shadow: addVector(this.scene, 0, 0, shadow).setDepth(DEPTHS.shadow),
    };
    if (a.ammoId === SPLIT.projectile) {
      d.shard = true;
      d.trail = { g: this.scene.add.graphics(), look: a.damageType === 'cold' ? SHARD_TRAILS.cold : SHARD_TRAILS.ley, points: [] };
    }
    for (const tag of AMMO[a.ammoId]?.tags ?? []) {
      const look = ROUND_LOOKS[tag];
      if (look?.tint) d.arrow.setTint(colorOf(look.tint));
      if (look?.trail) d.trail = { g: this.scene.add.graphics(), look: look.trail, points: [] };
    }
    this.drawn.set(a.id, d);
    return d;
  }
}
