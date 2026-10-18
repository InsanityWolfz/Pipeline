import type { GameObjects, Scene } from 'phaser';
import { ammoDef } from '../data/ammo';
import { ATLAS_KEY, BOMB_LIFT, DEPTHS } from '../data/assets';
import type { BombState } from '../sim/bombs';

interface Drawn {
  bomb: GameObjects.Image;
  shadow: GameObjects.Image;
}

// Draws bombs in flight: the bomb up its arc over a shadow that stays on the
// ground path, sorted by that ground point.
export class BombView {
  private readonly drawn = new Map<number, Drawn>();
  private readonly scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  update(bombs: readonly BombState[]): void {
    const live = new Set<number>();
    for (const b of bombs) {
      live.add(b.id);
      const d = this.drawn.get(b.id) ?? this.create(b);
      d.shadow.setPosition(b.x, b.y);
      d.bomb.setPosition(b.x, b.y - BOMB_LIFT - b.height).setDepth(b.y);
    }
    for (const [id, d] of this.drawn) {
      if (live.has(id)) continue;
      d.bomb.destroy();
      d.shadow.destroy();
      this.drawn.delete(id);
    }
  }

  private create(b: BombState): Drawn {
    const ammo = ammoDef(b.ammoId);
    const d: Drawn = {
      bomb: this.scene.add.image(0, 0, ATLAS_KEY, ammo.sprite),
      shadow: this.scene.add.image(0, 0, ATLAS_KEY, ammo.shadow).setDepth(DEPTHS.shadow),
    };
    this.drawn.set(b.id, d);
    return d;
  }
}
