import type { GameObjects, Scene } from 'phaser';
import { AMMO } from '../data/ammo';
import { DEPTHS } from '../data/assets';
import { ROUND_LOOKS, STAGE_SPRITES, TRAIL_SHAPE } from '../data/stageAssets';
import { SPLIT } from '../data/tags';
import { TALENT_SPRITES } from '../data/talentAssets';
import { DRAW_HEIGHT } from '../data/tube';
import type { ArrowState } from '../sim/arrows';
import { colorOf } from './color';
import { addVector } from './vector/textures';

interface Drawn {
  arrow: GameObjects.Image;
  shadow: GameObjects.Image;
  /** A tagged round's trail (029) and the drawn points it runs along, newest last. */
  trail?: { g: GameObjects.Graphics; look: NonNullable<(typeof ROUND_LOOKS)[string]['trail']>; points: [number, number][] };
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
    }
    for (const [id, d] of this.drawn) {
      if (live.has(id)) continue;
      d.arrow.destroy();
      d.shadow.destroy();
      d.trail?.g.destroy();
      this.drawn.delete(id);
    }
  }

  private drawTrail(trail: NonNullable<Drawn['trail']>, x: number, y: number, depth: number): void {
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
    for (const tag of AMMO[a.ammoId]?.tags ?? []) {
      const look = ROUND_LOOKS[tag];
      if (look?.tint) d.arrow.setTint(colorOf(look.tint));
      if (look?.trail) d.trail = { g: this.scene.add.graphics(), look: look.trail, points: [] };
    }
    this.drawn.set(a.id, d);
    return d;
  }
}
