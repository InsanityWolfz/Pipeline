import type { GameObjects, Scene } from 'phaser';
import { TintModes } from 'phaser';
import { animFrames, ATLAS_KEY, DEPTHS, ENEMY_ANIMS, ENEMY_FX } from '../data/assets';
import { IDLE_SPEED } from '../data/config';
import { enemyDef } from '../data/enemies';
import type { EnemyState } from '../sim/enemies';
import type { Facing } from '../sim/player';
import { registerAnim } from './anims';
import { colorOf } from './color';

interface Drawn {
  sprite: GameObjects.Sprite;
  telegraph: GameObjects.Graphics;
  bar: GameObjects.Graphics;
}

const viewOf = (f: Facing): 'down' | 'up' | 'side' => (f === 'up' || f === 'down' ? f : 'side');

// Draws live enemies from sim state: the animation for their mode and facing, a
// hit flash, a health bar once damaged and the swipe telegraph on the ground.
export class EnemyView {
  private readonly drawn = new Map<number, Drawn>();
  private readonly scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
    for (const set of Object.values(ENEMY_ANIMS)) for (const anim of Object.values(set)) registerAnim(scene, anim);
  }

  update(enemies: readonly EnemyState[]): void {
    const live = new Set<number>();
    for (const e of enemies) {
      live.add(e.id);
      const d = this.drawn.get(e.id) ?? this.create(e);
      const def = enemyDef(e.enemyId);
      const bottom = e.y + def.feetBox.h / 2;
      const anims = ENEMY_ANIMS[def.anims];
      if (!anims) throw new Error(`Unknown enemy anims '${def.anims}'`);
      d.sprite.setPosition(e.x, bottom).setDepth(bottom).setFlipX(e.facing === 'left');
      // Switch only on a change, so a one-shot swipe holds its last frame instead of restarting.
      const key = anims[`${poseOf(e)}-${viewOf(e.facing)}`].key;
      if (d.sprite.anims.currentAnim?.key !== key) d.sprite.play(key);
      if (e.flash > 0) d.sprite.setTint(colorOf(ENEMY_FX.flashColor)).setTintMode(TintModes.FILL);
      else d.sprite.clearTint();
      this.drawBar(d.bar, e, bottom - d.sprite.height);
      this.drawTelegraph(d.telegraph, e);
    }
    for (const [id, d] of this.drawn) {
      if (live.has(id)) continue;
      d.sprite.destroy();
      d.telegraph.destroy();
      d.bar.destroy();
      this.drawn.delete(id);
    }
  }

  private create(e: EnemyState): Drawn {
    const anims = ENEMY_ANIMS[enemyDef(e.enemyId).anims];
    const first = anims ? animFrames(anims['idle-down'])[0] : undefined;
    const d: Drawn = {
      sprite: this.scene.add.sprite(0, 0, ATLAS_KEY, first).setOrigin(0.5, 1),
      telegraph: this.scene.add.graphics().setDepth(DEPTHS.groundFx),
      bar: this.scene.add.graphics().setDepth(DEPTHS.worldUi),
    };
    this.drawn.set(e.id, d);
    return d;
  }

  /** A small bar over the sprite, only once the enemy has taken damage. */
  private drawBar(g: GameObjects.Graphics, e: EnemyState, top: number): void {
    g.clear();
    const max = enemyDef(e.enemyId).maxHealth;
    if (e.health >= max) return;
    const { w, h, gap, border } = ENEMY_FX.healthBar;
    const x = Math.round(e.x - w / 2);
    const y = Math.round(top - gap - h);
    g.fillStyle(colorOf(ENEMY_FX.healthBarBack)).fillRect(x - border, y - border, w + 2 * border, h + 2 * border);
    g.fillStyle(colorOf(ENEMY_FX.healthBarColor)).fillRect(x, y, Math.max(1, Math.round((w * e.health) / max)), h);
  }

  /** The swipe arc at its real reach and angle, filling in as the wind-up runs. */
  private drawTelegraph(g: GameObjects.Graphics, e: EnemyState): void {
    g.clear();
    if (e.mode !== 'windup') return;
    const { swipe } = enemyDef(e.enemyId);
    const angle = Math.atan2(e.swipeDirY, e.swipeDirX);
    const half = (swipe.arcDegrees * Math.PI) / 360;
    const color = colorOf(ENEMY_FX.telegraphColor);
    const progress = Math.min(1, e.modeTicks / swipe.windupTicks);
    g.fillStyle(color, ENEMY_FX.telegraphAlpha);
    g.slice(e.x, e.y, swipe.reach, angle - half, angle + half, false);
    g.fillPath();
    g.fillStyle(color, ENEMY_FX.telegraphFillAlpha);
    g.slice(e.x, e.y, swipe.reach * progress, angle - half, angle + half, false);
    g.fillPath();
  }
}

function poseOf(e: EnemyState): 'idle' | 'walk' | 'windup' | 'swipe' | 'hit' {
  if (e.flash > 0 && e.mode !== 'windup' && e.mode !== 'swipe') return 'hit';
  if (e.mode === 'windup' || e.mode === 'swipe') return e.mode;
  return Math.hypot(e.vx, e.vy) >= IDLE_SPEED ? 'walk' : 'idle';
}
