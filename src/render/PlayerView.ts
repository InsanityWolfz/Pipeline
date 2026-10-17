import type { GameObjects, Scene } from 'phaser';
import { animFrames, ATLAS_KEY, PLAYER_ANIMS, VIEWS, type PlayerAnim, type ViewMode } from '../data/assets';
import { TICK_RATE } from '../data/config';
import { FEET_BOX, ROLL_TICKS } from '../data/player';
import { isRolling } from '../sim/movement';
import type { PlayerState } from '../sim/player';

/** Below this speed (px per tick) the player shows idle instead of walking. */
const IDLE_SPEED = 0.1;

// Draws the player from sim state. In three-quarter view the sprite stands on
// the bottom of the feet box and sorts by that point against walls and ruin
// blocks; straight down, the body is centred on the feet.
export class PlayerView {
  readonly sprite: GameObjects.Sprite;
  private lastRollTick = 0;
  private view: ViewMode;

  constructor(scene: Scene, view: ViewMode) {
    this.view = view;
    for (const v of VIEWS) {
      for (const anim of Object.values(PLAYER_ANIMS[v])) {
        if (scene.anims.exists(anim.key)) continue;
        scene.anims.create({
          key: anim.key,
          frames: animFrames(anim).map((frame) => ({ key: ATLAS_KEY, frame })),
          frameRate: anim.frameRate === 'roll' ? (anim.frames * TICK_RATE) / ROLL_TICKS : anim.frameRate,
          repeat: anim.loop ? -1 : 0,
        });
      }
    }
    this.sprite = scene.add.sprite(0, 0, ATLAS_KEY, animFrames(PLAYER_ANIMS[view]['idle-down'])[0]);
    this.setView(view);
  }

  setView(view: ViewMode): void {
    this.view = view;
    this.sprite.stop();
    this.sprite.setOrigin(0.5, view === '34' ? 1 : 0.5);
  }

  update(p: PlayerState): void {
    const bottom = p.y + FEET_BOX.h / 2;
    this.sprite.setPosition(p.x, this.view === '34' ? bottom : p.y).setDepth(bottom);
    this.sprite.setFlipX(p.facing === 'left');

    const anims = PLAYER_ANIMS[this.view];
    if (isRolling(p)) {
      // Restart on a new roll, even one that follows straight after another.
      const fresh = p.rollTick < this.lastRollTick || this.sprite.anims.currentAnim?.key !== anims.roll.key;
      if (fresh) this.sprite.play(anims.roll.key);
    } else {
      const moving = Math.hypot(p.vx, p.vy) >= IDLE_SPEED;
      const dir = p.facing === 'up' || p.facing === 'down' ? p.facing : 'side';
      const name: PlayerAnim = `${moving ? 'walk' : 'idle'}-${dir}`;
      this.sprite.play(anims[name].key, true);
    }
    this.lastRollTick = p.rollTick;
  }
}
