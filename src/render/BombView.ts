import type { GameObjects, Scene } from 'phaser';
import { ammoDef } from '../data/ammo';
import { BOMB_LIFT, DEPTHS } from '../data/assets';
import type { BombState } from '../sim/bombs';
import { roundTint } from './roundLook';
import { roundFx } from './fx/roundFx';
import { TICK_RATE } from '../data/config';
import { addVector } from './vector/textures';

interface Drawn {
  bomb: GameObjects.Image;
  shadow: GameObjects.Image;
  spin: number;
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
      // 078: a landmine tumbles in flight (its look's turns a second; none for a bomb), by its own flight clock.
      if (d.spin > 0) d.bomb.setRotation((b.tick / TICK_RATE) * d.spin * Math.PI * 2);
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
      bomb: addVector(this.scene, 0, 0, ammo.sprite),
      shadow: addVector(this.scene, 0, 0, ammo.shadow).setDepth(DEPTHS.shadow),
      spin: roundFx(b.ammoId).spin,
    };
    // 039.15: a Frost bomb or landmine in flight is the base's sprite in its tag's tint.
    const tint = roundTint(b.ammoId);
    if (tint !== null) d.bomb.setTint(tint);
    this.drawn.set(b.id, d);
    return d;
  }
}
