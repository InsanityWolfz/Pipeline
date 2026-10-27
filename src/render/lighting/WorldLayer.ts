import type { GameObjects } from 'phaser';

// 074: the world layer, the objects a region's mood darkens and its lights reach: the ground (overworld chunks, room
// floors) and the props standing on it (trees, rocks, ruins, region props, nodes, landmark dressing, sites). Views
// register each object as they make it; it leaves on its own when destroyed. The look (lit by the scene's lights, or
// tinted with the ambient) is set again over the registry only when it changes (the tier, the room, the ambient's
// quantised step), never every frame; a new object takes the current look as it registers. The overworld's ground
// chunks (a few big images) are the exception: each frame only those a placed light reaches are lit, the rest carry
// the ambient as a tint, which looks the same (lit with no light is the ambient) for a fraction of the lighting's cost.
// Props likewise (074 review): on High only the props a placed light reaches are lit, found through buckets of the
// props by where they stand, so a frame looks only at the buckets round its lights; lit props break Phaser's batches
// (one draw each), so keeping them few keeps the draw calls down.

type WorldObject = GameObjects.Image | GameObjects.Sprite | GameObjects.TileSprite;

/** How the world layer draws now: the ground and the props each lit or tinted (a multiply tint, or none). */
export interface WorldLook {
  litGround: boolean;
  litProps: boolean;
  /** The ambient as a multiply tint on what isn't lit (0xrrggbb), or null for none. */
  tint: number | null;
}

/** Props are bucketed by where they stand (their feet) in squares this many px across. */
const PROP_BUCKET = 160;
/** A prop reaches this far up from its feet and this far either side, px: a light that far off still falls on it. */
const PROP_REACH = 96;
const PROP_HALF = 32;

const bucketOf = (x: number, y: number): string => `${Math.floor(x / PROP_BUCKET)},${Math.floor(y / PROP_BUCKET)}`;

/** How far over the unlit chunks the lit ones sit, so they sort after them without passing anything else. */
const LIT_NUDGE = 1e-4;

const NO_LOOK: WorldLook = { litGround: false, litProps: false, tint: null };

export class WorldLayer {
  private readonly ground = new Set<WorldObject>();
  private readonly props = new Set<WorldObject>();
  /** Props by bucket (`PROP_BUCKET` px squares of where they stand), and those lit now. */
  private readonly propBuckets = new Map<string, Set<WorldObject>>();
  private readonly propsLit = new Set<WorldObject>();
  /** The overworld's ground chunks, lit only where a light reaches (`lightChunks`). */
  private readonly chunks = new Set<GameObjects.Image>();
  private chunksLit = 0;
  /** The chunks' depth; a lit chunk sits a hair over it, so all the lit ones draw together after the unlit (one batch each). */
  private chunkDepth = 0;
  /** The tint the chunks no light reaches carry now (the ambient, a lightning flash included), for the test hook. */
  groundTint: number | null = null;
  private look: WorldLook = NO_LOOK;
  /** How many times the look was set over the registry (for tests: it changes only on a change). */
  applied = 0;

  /** A ground object (a chunk's image, a floor tile). */
  addGround<T extends WorldObject>(o: T): T {
    return this.add(this.ground, o, this.look.litGround);
  }

  /** An overworld ground chunk: lit each frame only if a light reaches it. */
  addChunk(o: GameObjects.Image): GameObjects.Image {
    this.chunks.add(o);
    this.chunkDepth = o.depth;
    o.once('destroy', () => this.chunks.delete(o));
    paint(o, false, this.look.tint);
    return o;
  }

  /**
   * Per frame, over the chunks only: lights the ground chunks a light's circle reaches (when the ground is lit), and
   * tints the rest with `tint` (the ambient, the lightning flash's included, so the two match).
   */
  lightChunks(lights: readonly { x: number; y: number; radius: number }[], tint: number | null, view: { x: number; y: number; width: number; height: number }): void {
    let lit = 0;
    this.groundTint = tint;
    for (const c of this.chunks) {
      // Off screen, it isn't drawn: it keeps its last look until it comes into view.
      if (c.x > view.x + view.width || c.x + c.displayWidth < view.x || c.y > view.y + view.height || c.y + c.displayHeight < view.y) continue;
      const reached = this.look.litGround && lights.some((l) => l.x + l.radius > c.x && l.x - l.radius < c.x + c.displayWidth && l.y + l.radius > c.y && l.y - l.radius < c.y + c.displayHeight);
      if (reached) lit += 1;
      if (c.lighting !== reached) c.setDepth(this.chunkDepth + (reached ? LIT_NUDGE : 0));
      paint(c, reached, tint);
    }
    this.chunksLit = lit;
  }

  /** A prop standing on the ground (a tree, a rock, a node, a site). */
  addProp<T extends WorldObject>(o: T): T {
    const key = bucketOf(o.x, o.y);
    const bucket = this.propBuckets.get(key) ?? new Set<WorldObject>();
    this.propBuckets.set(key, bucket);
    bucket.add(o);
    o.once('destroy', () => {
      bucket.delete(o);
      this.propsLit.delete(o);
    });
    // Lit only once a light reaches it (`lightProps`).
    return this.add(this.props, o, false);
  }

  /**
   * Per frame, on High: lights the props a light reaches (a light's circle, reaching up a prop's height, over the
   * buckets it touches) and lets go of the rest lit last frame, back to the ambient's tint.
   */
  lightProps(lights: readonly { x: number; y: number; radius: number }[], view: { x: number; y: number; width: number; height: number }): void {
    const reached = new Set<WorldObject>();
    if (this.look.litProps) {
      for (const l of lights) {
        if (l.x + l.radius < view.x || l.x - l.radius > view.x + view.width || l.y - l.radius > view.y + view.height + PROP_REACH || l.y + l.radius < view.y) continue;
        for (let by = Math.floor((l.y - l.radius) / PROP_BUCKET); by <= Math.floor((l.y + l.radius + PROP_REACH) / PROP_BUCKET); by++) {
          for (let bx = Math.floor((l.x - l.radius) / PROP_BUCKET); bx <= Math.floor((l.x + l.radius) / PROP_BUCKET); bx++) {
            for (const o of this.propBuckets.get(`${bx},${by}`) ?? []) {
              if (Math.abs(o.x - l.x) < l.radius + PROP_HALF && o.y > l.y - l.radius && o.y - PROP_REACH < l.y + l.radius) reached.add(o);
            }
          }
        }
      }
    }
    for (const o of this.propsLit) if (!reached.has(o)) paint(o, false, this.look.tint);
    for (const o of reached) if (!this.propsLit.has(o)) paint(o, true, null);
    this.propsLit.clear();
    for (const o of reached) this.propsLit.add(o);
  }

  private add<T extends WorldObject>(set: Set<WorldObject>, o: T, lit: boolean): T {
    set.add(o);
    o.once('destroy', () => set.delete(o));
    paint(o, lit, this.look.tint);
    return o;
  }

  /** Sets the look over every registered object, only if it changed. */
  apply(look: WorldLook): void {
    const was = this.look;
    if (was.litGround === look.litGround && was.litProps === look.litProps && was.tint === look.tint) return;
    this.look = look;
    this.applied += 1;
    for (const o of this.ground) paint(o, look.litGround, look.tint);
    for (const o of this.props) if (!this.propsLit.has(o)) paint(o, false, look.tint);
  }

  /** Objects with lighting on now, for the test hook. */
  get litCount(): number {
    return (this.look.litGround ? this.ground.size : 0) + this.propsLit.size + this.chunksLit;
  }

  /** Objects registered now: ground and props. */
  get counts(): { ground: number; props: number } {
    return { ground: this.ground.size, props: this.props.size };
  }

  /** Ground chunks lit now (a light reaches them). */
  get chunksLitNow(): number {
    return this.chunksLit;
  }

  get current(): WorldLook {
    return this.look;
  }
}

/** Lit objects take the ambient from the scene's lights, so they carry no tint; the rest carry the ambient as a tint. */
function paint(o: WorldObject, lit: boolean, tint: number | null): void {
  if (o.lighting !== lit) o.setLighting(lit);
  if (lit || tint === null) o.clearTint();
  else o.setTint(tint);
}
