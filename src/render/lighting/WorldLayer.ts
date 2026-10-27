import type { GameObjects } from 'phaser';

// 074: the world layer, the objects a region's mood darkens and its lights reach: the ground (overworld chunks, room
// floors) and the props standing on it (trees, rocks, ruins, region props, nodes, landmark dressing, sites). Views
// register each object as they make it; it leaves on its own when destroyed. The look (lit by the scene's lights, or
// tinted with the ambient) is set again over the registry only when it changes (the tier, the room, the ambient's
// quantised step), never every frame; a new object takes the current look as it registers.

type WorldObject = GameObjects.Image | GameObjects.Sprite | GameObjects.TileSprite;

/** How the world layer draws now: the ground and the props each lit or tinted (a multiply tint, or none). */
export interface WorldLook {
  litGround: boolean;
  litProps: boolean;
  /** The ambient as a multiply tint on what isn't lit (0xrrggbb), or null for none. */
  tint: number | null;
}

const NO_LOOK: WorldLook = { litGround: false, litProps: false, tint: null };

export class WorldLayer {
  private readonly ground = new Set<WorldObject>();
  private readonly props = new Set<WorldObject>();
  private look: WorldLook = NO_LOOK;
  /** How many times the look was set over the registry (for tests: it changes only on a change). */
  applied = 0;

  /** A ground object (a chunk's image, a floor tile). */
  addGround<T extends WorldObject>(o: T): T {
    return this.add(this.ground, o, this.look.litGround);
  }

  /** A prop standing on the ground (a tree, a rock, a node, a site). */
  addProp<T extends WorldObject>(o: T): T {
    return this.add(this.props, o, this.look.litProps);
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
    for (const o of this.props) paint(o, look.litProps, look.tint);
  }

  /** Objects with lighting on now, for the test hook. */
  get litCount(): number {
    return (this.look.litGround ? this.ground.size : 0) + (this.look.litProps ? this.props.size : 0);
  }

  /** Objects registered now: ground and props. */
  get counts(): { ground: number; props: number } {
    return { ground: this.ground.size, props: this.props.size };
  }

  get current(): WorldLook {
    return this.look;
  }
}

/** Lit objects take the ambient from the scene's lights, so they carry no tint; the rest carry the ambient as a tint. */
function paint(o: WorldObject, lit: boolean, tint: number | null): void {
  o.setLighting(lit);
  if (lit || tint === null) o.clearTint();
  else o.setTint(tint);
}
