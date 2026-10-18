import type { GameObjects, Scene } from 'phaser';
import { AMMO } from '../data/ammo';
import { ATLAS_KEY, DEPTHS } from '../data/assets';
import { DRAW_HEIGHT } from '../data/tube';
import type { ArrowState } from '../sim/arrows';

interface Drawn {
  arrow: GameObjects.Image;
  shadow: GameObjects.Image;
}

// Draws arrows in flight: the arrow raised to chest height over a shadow on its
// ground point, sorted by that point. Sprites live as long as their sim arrow.
export class ArrowView {
  private readonly drawn = new Map<number, Drawn>();
  private readonly scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  update(arrows: readonly ArrowState[]): void {
    const live = new Set<number>();
    for (const a of arrows) {
      live.add(a.id);
      const d = this.drawn.get(a.id) ?? this.create(a);
      const angle = Math.atan2(a.dy, a.dx);
      d.shadow.setPosition(a.x, a.y).setRotation(angle);
      d.arrow.setPosition(a.x, a.y - DRAW_HEIGHT).setRotation(angle).setDepth(a.y);
    }
    for (const [id, d] of this.drawn) {
      if (live.has(id)) continue;
      d.arrow.destroy();
      d.shadow.destroy();
      this.drawn.delete(id);
    }
  }

  private create(a: ArrowState): Drawn {
    const ammo = AMMO[a.ammoId];
    if (!ammo) throw new Error(`Unknown ammo '${a.ammoId}'`);
    const d: Drawn = {
      arrow: this.scene.add.image(0, 0, ATLAS_KEY, ammo.sprite),
      shadow: this.scene.add.image(0, 0, ATLAS_KEY, ammo.shadow).setDepth(DEPTHS.shadow),
    };
    this.drawn.set(a.id, d);
    return d;
  }
}
