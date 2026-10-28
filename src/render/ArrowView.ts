import type { GameObjects, Scene } from 'phaser';
import { AMMO } from '../data/ammo';
import { DEPTHS } from '../data/assets';
import { FX_LOOK } from '../data/fxQuality';
import { ROUND_LOOKS, STAGE_SPRITES } from '../data/stageAssets';
import { SPLIT } from '../data/tags';
import { BURNING_LOOK, TALENT_SPRITES } from '../data/talentAssets';
import { DRAW_HEIGHT } from '../data/tube';
import type { ArrowState } from '../sim/arrows';
import { burning } from '../sim/keystones';
import { colorOf } from './color';
import { burningFx, roundFx, shardFx, type RoundLook } from './fx/roundFx';
import type { TrailView } from './fx/TrailView';
import { addVector } from './vector/textures';

interface Drawn {
  arrow: GameObjects.Image;
  shadow: GameObjects.Image;
  look: RoundLook;
  /** A Shard (054: drawn with a short trail). */
  shard: boolean;
  /** A burning arrow's flame (054), from the frame it caught fire. */
  burn?: GameObjects.Image;
  /** Where it was last drawn, for a Split round's Shards to find their tier when it goes. */
  x: number;
  y: number;
  /** The frame it was last drawn. */
  seen: number;
}

/** A split round that ended this frame: its Shards, appearing about here, take its tier. */
interface SplitEnd {
  x: number;
  y: number;
  tier: string;
}

/** A Shard appears this close to where its Split round was last drawn; a round this new (px flown) starts its trail at the drawn muzzle (075.10). */
const { splitNear: SPLIT_NEAR, freshPx: FRESH_PX } = FX_LOOK;

/** The sprite and shadow for a shot: its ammo's, or a Shard's (029), drawn as ice when it's Cold (039.3, 037's ice art). */
function spritesOf(a: Pick<ArrowState, 'ammoId' | 'damageType'>): { sprite: string; shadow: string } {
  const ammo = AMMO[a.ammoId];
  if (ammo) return ammo;
  if (a.ammoId === SPLIT.projectile) return { sprite: a.damageType === 'cold' ? TALENT_SPRITES.coldShard : STAGE_SPRITES.shard, shadow: STAGE_SPRITES.shardShadow };
  throw new Error(`Unknown ammo '${a.ammoId}'`);
}

// Draws arrows in flight: the arrow raised to chest height over a shadow on its ground point, sorted by that point.
// Sprites live as long as their sim arrow. A tagged round (029) takes its tag's tint; a Shard is a small sliver.
// 078: each round hands its look (AMMO_FX, composed by roundFx) and drawn point to the shared TrailView; a round
// fired this frame starts its trail at the tube's drawn muzzle.
export class ArrowView {
  private readonly drawn = new Map<number, Drawn>();
  private readonly scene: Scene;
  private readonly trails: TrailView;
  private splitEnds: SplitEnd[] = [];
  private frame = 0;

  constructor(scene: Scene, trails: TrailView) {
    this.scene = scene;
    this.trails = trails;
  }

  /** How many drawn shots have a trail, and the longest trail's points, for the test hook (029). */
  get trailsShown(): { count: number; longest: number } {
    const all = [...this.drawn.keys()].map((id) => this.trails.points(id)).filter((n) => n > 0);
    return { count: all.length, longest: Math.max(0, ...all) };
  }

  /** 078: how a drawn round looks (a Shard's tier, a burning arrow's fire), for the shot effects. */
  lookOf(id: number): RoundLook | undefined {
    return this.drawn.get(id)?.look;
  }

  /** How many Shards (029, 054's star shot) are drawn, for the test hook. */
  get shards(): number {
    return [...this.drawn.values()].filter((d) => d.shard).length;
  }

  /** How many burning arrows (054) are drawn with their flame, for the test hook. */
  get burning(): number {
    return [...this.drawn.values()].filter((d) => d.burn?.visible).length;
  }

  /** `muzzle`: the tube's drawn muzzle this frame (075's rig), where a new round's trail starts; no trails with `fx` off. */
  update(arrows: readonly ArrowState[], muzzle: { x: number; y: number } | null, fx = true): void {
    this.frame += 1;
    for (const a of arrows) {
      const d = this.drawn.get(a.id);
      if (d) d.seen = this.frame;
    }
    // A Split round that ended this frame: its Shards spawned where it hit (it had flown no further).
    let ended: SplitEnd[] | null = null;
    for (const d of this.drawn.values()) if (d.seen !== this.frame && d.look.impact.split) (ended ??= []).push({ x: d.x, y: d.y, tier: d.look.tier });
    if (ended) this.splitEnds = ended;
    for (const a of arrows) {
      const d = this.drawn.get(a.id) ?? this.create(a);
      d.seen = this.frame;
      const angle = Math.atan2(a.dy, a.dx);
      const y = a.y - DRAW_HEIGHT;
      d.x = a.x;
      d.y = a.y;
      d.shadow.setPosition(a.x, a.y).setRotation(angle);
      d.arrow.setPosition(a.x, y).setRotation(angle).setDepth(a.y);
      if (burning(a)) {
        if (!d.burn) d.look = burningFx(a.ammoId);
        this.drawBurn(d, a, y, angle);
      }
      const fresh = !d.shard && a.travelled <= FRESH_PX && muzzle !== null;
      if (fx) this.trails.track(a.id, d.look, a.x, y, fresh ? muzzle : null);
    }
    for (const [id, d] of this.drawn) {
      if (d.seen === this.frame) continue;
      d.arrow.destroy();
      d.shadow.destroy();
      d.burn?.destroy();
      this.drawn.delete(id);
    }
  }

  /** A burning arrow (054): its flame at the head, flickering (its trail is the fire element's, 078). */
  private drawBurn(d: Drawn, a: ArrowState, y: number, angle: number): void {
    const B = BURNING_LOOK;
    d.burn ??= addVector(this.scene, 0, 0, TALENT_SPRITES.burningTip);
    const tip = d.burn;
    const now = this.scene.time.now;
    const flicker = 1 + B.flicker * Math.sin((now / B.flickerMs) * Math.PI * 2 + a.id);
    const base = Number(tip.getData('base')) || tip.scaleX * B.tipScale;
    tip.setData('base', base);
    tip.setPosition(a.x + a.dx * B.tipAhead, y + a.dy * B.tipAhead).setRotation(angle).setDepth(a.y + B.tipDepth).setScale(base * flicker).setAlpha(Math.min(1, B.tipAlpha - B.flicker + B.flicker * flicker));
  }

  /** A Shard's tier: its Split round's, the one that ended nearest where it appears (stone if none did). */
  private shardTier(a: ArrowState): string {
    let best: SplitEnd | null = null;
    for (const e of this.splitEnds) if (Math.hypot(e.x - a.x, e.y - a.y) <= SPLIT_NEAR && (!best || Math.hypot(e.x - a.x, e.y - a.y) < Math.hypot(best.x - a.x, best.y - a.y))) best = e;
    return best?.tier ?? 'stone';
  }

  private create(a: ArrowState): Drawn {
    const { sprite, shadow } = spritesOf(a);
    const shard = a.ammoId === SPLIT.projectile;
    const d: Drawn = {
      arrow: addVector(this.scene, 0, 0, sprite),
      shadow: addVector(this.scene, 0, 0, shadow).setDepth(DEPTHS.shadow),
      look: shard ? shardFx(a.damageType, this.shardTier(a)) : roundFx(a.ammoId),
      shard,
      x: a.x,
      y: a.y,
      seen: this.frame,
    };
    if (!shard) for (const tag of AMMO[a.ammoId]?.tags ?? []) {
      const tint = ROUND_LOOKS[tag]?.tint;
      if (tint) d.arrow.setTint(colorOf(tint));
    }
    this.drawn.set(a.id, d);
    return d;
  }
}
