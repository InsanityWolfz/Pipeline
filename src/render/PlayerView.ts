import type { GameObjects, Scene } from 'phaser';
import { TintModes } from 'phaser';
import {
  animFrames,
  ATLAS_KEY,
  DEPTHS,
  PLAYER_ANIMS,
  PLAYER_HIT_FX,
  TUBE_ATTUNE,
  TUBE_GRIP,
  TUBE_SPRITES,
  type PlayerAnim,
} from '../data/assets';
import { IDLE_SPEED, TICK_RATE } from '../data/config';
import { DYING_TICKS, FEET_BOX, HIT_INVULN_TICKS, ROLL_TICKS } from '../data/player';
import { aimFacing } from '../sim/direction';
import { isRolling } from '../sim/movement';
import type { Facing, PlayerState } from '../sim/player';
import type { ArmorWeight } from '../data/armor';
import { ARMOR_TINTS } from '../data/hudLayout';
import type { LinkState } from '../sim/link';
import type { TubeState } from '../sim/tube';
import { registerAnim } from './anims';
import { colorOf } from './color';

type View = 'down' | 'up' | 'side';

/** The share of a death, at its end, over which the remains fade out. */
const DEATH_FADE_SHARE = 1 / 3;

/** A multiply tint that leaves a corner's colour as drawn. */
const UNTINTED = 0xffffff;

const viewOf = (f: Facing): View => (f === 'up' || f === 'down' ? f : 'side');

// Draws the player and the held tube from sim state. The sprite stands on the
// bottom of the feet box and sorts by that point against walls and ruin blocks.
// While the tube attunes, a ley pulse plays over it.
export class PlayerView {
  readonly sprite: GameObjects.Sprite;
  private readonly tube: GameObjects.Image;
  private readonly attune: GameObjects.Sprite;
  private lastRollTick = 0;

  constructor(scene: Scene) {
    for (const anim of Object.values(PLAYER_ANIMS)) {
      registerAnim(scene, anim, anim.frameRate === 'roll' ? (anim.frames * TICK_RATE) / ROLL_TICKS : undefined);
    }
    this.sprite = scene.add.sprite(0, 0, ATLAS_KEY, animFrames(PLAYER_ANIMS['idle-down'])[0]).setOrigin(0.5, 1);
    this.tube = scene.add.image(0, 0, ATLAS_KEY, TUBE_SPRITES.down).setOrigin(0, 0);
    for (const anim of Object.values(TUBE_ATTUNE)) registerAnim(scene, anim);
    this.attune = scene.add.sprite(0, 0, ATLAS_KEY).setOrigin(0, 0).setVisible(false);
  }

  /** Draws the player; `shown` false hides them (they're in a room not yet on screen). */
  update(p: PlayerState, tube: TubeState, link: LinkState, armor: ArmorWeight | null, shown = true): void {
    this.sprite.setVisible(shown);
    const bottom = p.y + FEET_BOX.h / 2;
    this.sprite.setPosition(p.x, bottom).setDepth(bottom);
    const rolling = isRolling(p);
    // The body faces the aim like the tube does; a roll shows its own direction.
    const facing = rolling ? p.facing : aimFacing(p.aimX - p.x, p.aimY - p.y, p.facing);
    this.sprite.setFlipX(facing === 'left');

    // The last stretch of a death fades the remains out before waking in the foundry.
    this.sprite.setAlpha(p.dying > 0 ? Math.min(1, p.dying / (DYING_TICKS * DEATH_FADE_SHARE)) : 1);
    if (p.dying > 0) {
      if (this.sprite.anims.currentAnim?.key !== PLAYER_ANIMS.death.key) this.sprite.play(PLAYER_ANIMS.death.key);
    } else if (rolling) {
      // Restart on a new roll, even one that follows straight after another.
      const fresh = p.rollTick < this.lastRollTick || this.sprite.anims.currentAnim?.key !== PLAYER_ANIMS.roll.key;
      if (fresh) this.sprite.play(PLAYER_ANIMS.roll.key);
    } else {
      const moving = Math.hypot(p.vx, p.vy) >= IDLE_SPEED;
      const hit = p.hurtTicks > HIT_INVULN_TICKS - PLAYER_HIT_FX.poseTicks;
      const pose = hit ? 'hit' : tube.firing ? 'fire' : moving ? 'walk' : 'idle';
      const name: PlayerAnim = `${pose}-${viewOf(facing)}`;
      this.sprite.play(PLAYER_ANIMS[name].key, true);
    }
    this.lastRollTick = p.rollTick;

    // Hit invulnerability flickers between a white flash and normal, starting white.
    const elapsed = HIT_INVULN_TICKS - p.hurtTicks;
    const white = p.hurtTicks > 0 && Math.floor(elapsed / PLAYER_HIT_FX.flickerTicks) % 2 === 0;
    for (const o of [this.sprite, this.tube]) {
      if (white) o.setTint(colorOf(PLAYER_HIT_FX.flashColor)).setTintMode(TintModes.FILL);
      else o.clearTint();
    }
    // Worn armor shades the body below the head by its weight (the tube stays its own colour).
    if (!white && armor) {
      const body = colorOf(ARMOR_TINTS[armor]);
      this.sprite.setTint(UNTINTED, UNTINTED, body, body).setTintMode(TintModes.MULTIPLY);
    }
    this.tube.setVisible(shown && !rolling && p.dying === 0);
    if (!rolling) this.placeTube(p, facing, bottom);
    this.placeAttune(facing, shown && !rolling && link.attunePulse > 0);
  }

  /** The attuning pulse sits exactly over the tube, a hair in front of it. */
  private placeAttune(facing: Facing, on: boolean): void {
    this.attune.setVisible(on);
    if (!on) {
      this.attune.stop();
      return;
    }
    this.attune.play(TUBE_ATTUNE[viewOf(facing)].key, true);
    this.attune.setPosition(this.tube.x, this.tube.y).setFlipX(this.tube.flipX);
    this.attune.setDepth(this.tube.depth + DEPTHS.attuneNudge);
  }

  /** Holds the tube toward the aim, snapped to 4 directions. */
  private placeTube(p: PlayerState, facing: Facing, bottom: number): void {
    const view = viewOf(facing);
    const grip = TUBE_GRIP[view];
    this.tube.setFrame(TUBE_SPRITES[view]);
    const left = facing === 'left';
    const x = left ? -(grip.x + this.tube.width) : grip.x;
    this.tube.setFlipX(left);
    this.tube.setPosition(p.x + x, bottom + grip.y);
    this.tube.setDepth(bottom + (grip.behind ? -DEPTHS.tubeNudge : DEPTHS.tubeNudge));
  }
}
