import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, ENEMY_FX, SPRITES } from '../data/assets';
import { CHAMPIONS } from '../data/champions';
import { defOf } from '../sim/champions';
import { immune, type EnemyState } from '../sim/enemies';
import { plated } from '../sim/forgewrightParts';
import { colorOf } from './color';
import { addVector } from './vector/textures';

// An enemy's health bar over its sprite (004): shown once it's damaged, a champion's in its colour (032). 054 (E.1):
// while the sim says nothing can damage it (immune: under the ground, still rising) the bar shows even at full health,
// filled blue, with a small shield at its left end; it goes back the moment the enemy can be hit.

/** One enemy's bar as drawn, for `ui().enemyBars`. */
export interface EnemyBarShown {
  id: number;
  shown: boolean;
  immune: boolean;
}

export interface EnemyBar {
  g: GameObjects.Graphics;
  /** The shield icon, made the first time it's immune. */
  icon?: GameObjects.Image;
  shown: EnemyBarShown;
}

export const makeEnemyBar = (scene: Scene, id: number): EnemyBar => ({ g: scene.add.graphics().setDepth(DEPTHS.worldUi), shown: { id, shown: false, immune: false } });

export function destroyEnemyBar(bar: EnemyBar): void {
  bar.g.destroy();
  bar.icon?.destroy();
}

/** Draws the bar over a sprite whose top is at `top`. */
export function drawEnemyBar(scene: Scene, bar: EnemyBar, e: EnemyState, top: number): void {
  const g = bar.g.clear();
  const max = defOf(e).maxHealth;
  // 060: the Forgewright's plating shows the same blue shield until it vents.
  const shield = immune(e) || plated(e);
  const shown = shield || e.health < max;
  bar.shown = { id: e.id, shown, immune: shield && shown };
  bar.icon?.setVisible(false);
  if (!shown) return;
  const { w, h, gap, border } = ENEMY_FX.healthBar;
  const x = Math.round(e.x - w / 2);
  const y = Math.round(top - gap - h);
  g.fillStyle(colorOf(ENEMY_FX.healthBarBack)).fillRect(x - border, y - border, w + 2 * border, h + 2 * border);
  const color = shield ? ENEMY_FX.immuneBar.color : e.champion ? CHAMPIONS.barColor : ENEMY_FX.healthBarColor;
  g.fillStyle(colorOf(color)).fillRect(x, y, Math.max(1, Math.round((w * e.health) / max)), h);
  if (!shield) return;
  const I = ENEMY_FX.immuneBar.icon;
  bar.icon ??= addVector(scene, 0, 0, SPRITES.enemyImmune).setOrigin(0).setDepth(DEPTHS.worldUi + I.depth);
  bar.icon.setVisible(true).setPosition(x - border - I.gap - I.w, Math.round(y + h / 2 - I.h / 2));
}
