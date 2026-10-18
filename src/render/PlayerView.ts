import type { GameObjects, Scene } from 'phaser';
import { animFrames, ATLAS_KEY, PLAYER_ANIMS, PLAYER_HIT_FX, TUBE_GRIP, TUBE_SPRITES, type PlayerAnim } from '../data/assets';
import { IDLE_SPEED, TICK_RATE } from '../data/config';
import { FEET_BOX, HIT_INVULN_TICKS, ROLL_TICKS } from '../data/player';
import { aimFacing } from '../sim/direction';
import { isRolling } from '../sim/movement';
import type { Facing, PlayerState } from '../sim/player';
import type { TubeState } from '../sim/tube';
import { registerAnim } from './anims';

/** Depth nudge that puts the tube just in front of or behind the player. */
const TUBE_DEPTH_NUDGE = 0.01;

type View = 'down' | 'up' | 'side';

const viewOf = (f: Facing): View => (f === 'up' || f === 'down' ? f : 'side');

// Draws the player and the held tube from sim state. The sprite stands on the
// bottom of the feet box and sorts by that point against walls and ruin blocks.
export class PlayerView {
  readonly sprite: GameObjects.Sprite;
  private readonly tube: GameObjects.Image;
  private lastRollTick = 0;

  constructor(scene: Scene) {
    for (const anim of Object.values(PLAYER_ANIMS)) {
      registerAnim(scene, anim, anim.frameRate === 'roll' ? (anim.frames * TICK_RATE) / ROLL_TICKS : undefined);
    }
    this.sprite = scene.add.sprite(0, 0, ATLAS_KEY, animFrames(PLAYER_ANIMS['idle-down'])[0]).setOrigin(0.5, 1);
    this.tube = scene.add.image(0, 0, ATLAS_KEY, TUBE_SPRITES.down).setOrigin(0, 0);
  }

  update(p: PlayerState, tube: TubeState): void {
    const bottom = p.y + FEET_BOX.h / 2;
    this.sprite.setPosition(p.x, bottom).setDepth(bottom);
    this.sprite.setFlipX(p.facing === 'left');

    const rolling = isRolling(p);
    if (rolling) {
      // Restart on a new roll, even one that follows straight after another.
      const fresh = p.rollTick < this.lastRollTick || this.sprite.anims.currentAnim?.key !== PLAYER_ANIMS.roll.key;
      if (fresh) this.sprite.play(PLAYER_ANIMS.roll.key);
    } else {
      const moving = Math.hypot(p.vx, p.vy) >= IDLE_SPEED;
      const hit = p.hurtTicks > HIT_INVULN_TICKS - PLAYER_HIT_FX.poseTicks;
      const pose = hit ? 'hit' : tube.firing ? 'fire' : moving ? 'walk' : 'idle';
      const name: PlayerAnim = `${pose}-${viewOf(p.facing)}`;
      this.sprite.play(PLAYER_ANIMS[name].key, true);
    }
    this.lastRollTick = p.rollTick;

    // Hit invulnerability shows as a flicker.
    const hidden = p.hurtTicks > 0 && Math.floor(p.hurtTicks / PLAYER_HIT_FX.flickerTicks) % 2 === 1;
    this.sprite.setVisible(!hidden);
    this.tube.setVisible(!rolling && !hidden);
    if (!rolling) this.placeTube(p, bottom);
  }

  /** Holds the tube toward the aim, snapped to 4 directions. */
  private placeTube(p: PlayerState, bottom: number): void {
    const facing = aimFacing(p.aimX - p.x, p.aimY - p.y, p.facing);
    const view = viewOf(facing);
    const grip = TUBE_GRIP[view];
    this.tube.setFrame(TUBE_SPRITES[view]);
    const left = facing === 'left';
    const x = left ? -(grip.x + this.tube.width) : grip.x;
    this.tube.setFlipX(left);
    this.tube.setPosition(p.x + x, bottom + grip.y);
    this.tube.setDepth(bottom + (grip.behind ? -TUBE_DEPTH_NUDGE : TUBE_DEPTH_NUDGE));
  }
}
