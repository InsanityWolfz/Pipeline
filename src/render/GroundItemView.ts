import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, GROUND_ITEM_LIFT, SPRITES } from '../data/assets';
import { ITEMS } from '../data/items';
import { CACHE_BURST } from '../data/landmarks';
import type { SimState } from '../sim/state';
import { shownItem } from './itemShown';
import { PICKUP_SLIDE } from '../data/juice';
import type { GroundItem } from '../sim/drops';
import { TextLine } from './textLine';
import { burstPhase } from './cacheBurst';
import { stackedTop, type PopupBox } from './popupStack';
import { addVector } from './vector/textures';

interface Drawn {
  item: GameObjects.Image;
  shadow: GameObjects.Image;
  /** 045: a cache item's name while it bursts out and lies waiting. */
  name: TextLine | null;
}

/** A ground item as drawn (045), for the test hook: where it shows, whether it shows yet, and its name over it while bursting. */
export interface GroundItemShown {
  id: number;
  itemId: string;
  x: number;
  y: number;
  visible: boolean;
  name: string | null;
}

// Draws items lying on the ground, each over a small shadow and sorted by its ground point; pulled in (045), they follow.
// A picked-up item slides into the player instead of vanishing (021). A cache's items (045) burst out of the chest one
// by one on an arc, each with its name over it until the magnet pull takes it.
export class GroundItemView {
  private readonly drawn = new Map<number, Drawn>();
  private readonly scene: Scene;
  /** Where the player stands now, followed by items sliding in. */
  private player = { x: 0, y: 0 };
  /** Picked-up items still sliding in, and how far in the furthest one is (0 to 1) (for the test hook). */
  sliding = 0;
  slideProgress = 0;
  /** 045: every item as drawn, for the test hook. */
  shown: GroundItemShown[] = [];
  /** The burst names placed this frame, so the next stacks clear of them. */
  private names: PopupBox[] = [];

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /** `picked` holds the ids of items picked up since the last draw; `player` is where the player stands. A schematic shows as unknown until banked (033). */
  update(items: readonly GroundItem[], picked: ReadonlySet<number>, player: { x: number; y: number }, sim: Pick<SimState, 'research'>): void {
    this.player = { x: player.x, y: player.y };
    const live = new Set<number>();
    const shown: GroundItemShown[] = [];
    this.names = [];
    for (const g of items) {
      live.add(g.id);
      let d = this.drawn.get(g.id);
      if (!d) {
        const def = ITEMS[g.itemId];
        if (!def) throw new Error(`Unknown item '${g.itemId}'`);
        const look = shownItem(sim, def.id);
        d = {
          shadow: addVector(this.scene, 0, 0, SPRITES.itemShadow).setDepth(DEPTHS.shadow),
          item: addVector(this.scene, 0, 0, look.icon).setOrigin(0.5, 1),
          name: g.burst ? new TextLine(this.scene, 0, 0, DEPTHS.burstName, true, 'float').set(look.name) : null,
        };
        this.drawn.set(g.id, d);
      }
      shown.push(this.place(d, g));
    }
    this.shown = shown;
    for (const [id, d] of this.drawn) {
      if (live.has(id)) continue;
      d.shadow.destroy();
      d.name?.obj.destroy();
      if (picked.has(id)) this.slide(d.item);
      else d.item.destroy();
      this.drawn.delete(id);
    }
  }

  /** An item and its shadow at its ground point, sorted by it; a bursting one along its flight, its name over it. */
  private place(d: Drawn, g: GroundItem): GroundItemShown {
    const B = CACHE_BURST;
    const burst = burstPhase(g);
    let x = g.x;
    let y = g.y;
    let lift = 0;
    if (burst?.phase === 'chest' && g.burst) ({ x, y } = g.burst);
    if (burst?.phase === 'flight' && g.burst) {
      x = g.burst.x + (g.x - g.burst.x) * burst.t;
      y = g.burst.y + (g.y - g.burst.y) * burst.t;
      lift = 4 * B.arc * burst.t * (1 - burst.t);
    }
    const rx = Math.round(x);
    const ry = Math.round(y);
    const visible = burst?.phase !== 'chest';
    d.shadow.setPosition(rx, ry).setVisible(visible);
    // Bursting, it rides over what stands round the chest, the player too.
    d.item.setPosition(rx, Math.round(ry + GROUND_ITEM_LIFT - lift)).setDepth(burst ? DEPTHS.burstItem : ry).setVisible(visible);
    const named = d.name !== null && burst !== null && visible;
    if (d.name) {
      d.name.setVisible(named);
      if (named) {
        const box = { x: Math.round(rx - d.name.width / 2), y: Math.round(ry - lift - B.nameRise - d.name.lineHeight), w: d.name.width, h: d.name.lineHeight };
        box.y = stackedTop(box, this.names, B.nameGap);
        this.names.push(box);
        d.name.moveTo(box.x, box.y);
      }
    }
    return { id: g.id, itemId: g.itemId, x: rx, y: ry, visible, name: named && d.name ? d.name.obj.text : null };
  }

  /** Slides an item's image into the player (who may still be moving), shrinking, then removes it. */
  private slide(image: GameObjects.Image): void {
    const from = { x: image.x, y: image.y, scale: image.scaleX };
    // Over everything standing in the world (the tree it lay behind), just under the pickup sparkle and
    // particles at worldUi - 1 and the "+1" popup at worldUi.
    image.setDepth(DEPTHS.slideItem);
    this.sliding += 1;
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: PICKUP_SLIDE.ms,
      ease: 'Quad.In',
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 1;
        this.slideProgress = t;
        const to = { x: this.player.x, y: this.player.y + GROUND_ITEM_LIFT };
        image.setPosition(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
        image.setScale(from.scale * (1 + (PICKUP_SLIDE.endScale - 1) * t));
      },
      onComplete: () => {
        this.sliding -= 1;
        if (this.sliding === 0) this.slideProgress = 0;
        image.destroy();
      },
    });
  }
}
