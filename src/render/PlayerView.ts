import type { GameObjects, Scene } from 'phaser';
import { animFrames, ATLAS_KEY, PLAYER_ANIMS, type PlayerAnim } from '../data/assets';
import { IDLE_SPEED, TICK_RATE } from '../data/config';
import { FEET_BOX, ROLL_TICKS } from '../data/player';
import { isRolling } from '../sim/movement';
import type { PlayerState } from '../sim/player';

// Draws the player from sim state. The sprite stands on the bottom of the
// feet box and sorts by that point against walls and ruin blocks.
export class PlayerView {
  readonly sprite: GameObjects.Sprite;
  private lastRollTick = 0;

  constructor(scene: Scene) {
    for (const anim of Object.values(PLAYER_ANIMS)) {
      if (scene.anims.exists(anim.key)) continue;
      scene.anims.create({
        key: anim.key,
        frames: animFrames(anim).map((frame) => ({ key: ATLAS_KEY, frame })),
        frameRate: anim.frameRate === 'roll' ? (anim.frames * TICK_RATE) / ROLL_TICKS : anim.frameRate,
        repeat: anim.loop ? -1 : 0,
      });
    }
    this.sprite = scene.add.sprite(0, 0, ATLAS_KEY, animFrames(PLAYER_ANIMS['idle-down'])[0]).setOrigin(0.5, 1);
  }

  update(p: PlayerState): void {
    const bottom = p.y + FEET_BOX.h / 2;
    this.sprite.setPosition(p.x, bottom).setDepth(bottom);
    this.sprite.setFlipX(p.facing === 'left');

    if (isRolling(p)) {
      // Restart on a new roll, even one that follows straight after another.
      const fresh = p.rollTick < this.lastRollTick || this.sprite.anims.currentAnim?.key !== PLAYER_ANIMS.roll.key;
      if (fresh) this.sprite.play(PLAYER_ANIMS.roll.key);
    } else {
      const moving = Math.hypot(p.vx, p.vy) >= IDLE_SPEED;
      const dir = p.facing === 'up' || p.facing === 'down' ? p.facing : 'side';
      const name: PlayerAnim = `${moving ? 'walk' : 'idle'}-${dir}`;
      this.sprite.play(PLAYER_ANIMS[name].key, true);
    }
    this.lastRollTick = p.rollTick;
  }
}
