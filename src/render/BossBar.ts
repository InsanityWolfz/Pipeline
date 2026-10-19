import type { GameObjects, Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { VIEW_WIDTH } from '../data/config';
import { enemyDef } from '../data/enemies';
import { HOLLOWS_LOOK } from '../data/hollowsAssets';
import { engaged } from '../sim/bulwarkAi';
import { defOf } from '../sim/champions';
import type { SimState } from '../sim/state';
import { colorOf } from './color';
import { TextLine } from './textLine';

/** The boss bar as drawn (034), for `ui().bossBar`: the boss's name, health and max, or null while none fights. */
export type BossBarShown = { name: string; health: number; maxHealth: number } | null;

const B = HOLLOWS_LOOK.bossBar;

// A region boss's health bar (034) along the top of the screen while it fights the
// player: its name over a long danger-red bar in a brass frame. Gone when it isn't engaged.
export class BossBar {
  private readonly bar: GameObjects.Graphics;
  private readonly name: TextLine;
  shown: BossBarShown = null;

  constructor(scene: Scene) {
    this.bar = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.hud);
    this.name = new TextLine(scene, 0, 0, DEPTHS.hud + 1, false, 'display');
    this.setVisible(false);
  }

  update(sim: SimState): void {
    const boss = sim.enemies.find((e) => e.roomId === sim.roomId && enemyDef(e.enemyId).kind === 'bulwark' && engaged(e));
    if (!boss) {
      this.shown = null;
      this.setVisible(false);
      return;
    }
    const max = defOf(boss).maxHealth;
    const def = enemyDef(boss.enemyId);
    this.shown = { name: def.name, health: boss.health, maxHealth: max };
    const x = Math.round((VIEW_WIDTH - B.w) / 2);
    const g = this.bar;
    g.clear();
    g.fillStyle(colorOf(B.frame)).fillRect(x - B.border * 2, B.top - B.border * 2, B.w + B.border * 4, B.h + B.border * 4);
    g.fillStyle(colorOf(B.back)).fillRect(x - B.border, B.top - B.border, B.w + B.border * 2, B.h + B.border * 2);
    g.fillStyle(colorOf(B.fill)).fillRect(x, B.top, Math.max(0, Math.round((B.w * boss.health) / max)), B.h);
    this.name.set(def.name);
    this.name.moveTo(Math.round((VIEW_WIDTH - this.name.width) / 2), B.top - B.nameGap - B.border * 2 - this.name.lineHeight);
    this.setVisible(true);
  }

  private setVisible(on: boolean): void {
    this.bar.setVisible(on);
    this.name.setVisible(on);
  }
}
