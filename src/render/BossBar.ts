import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, ENEMY_FX, SPRITES } from '../data/assets';
import { FORGE_LOOK } from '../data/forgewrightAssets';
import { forgeDefOf, plated } from '../sim/forgewrightParts';
import { addVector } from './vector/textures';
import { VIEW_WIDTH } from '../data/config';
import { enemyDef } from '../data/enemies';
import { arenaOf } from '../data/arenas';
import { HOLLOWS_LOOK } from '../data/hollowsAssets';
import { engaged } from '../sim/bulwarkAi';
import { defOf } from '../sim/champions';
import type { SimState } from '../sim/state';
import { colorOf } from './color';
import { TextLine } from './textLine';

/**
 * The boss bar as drawn (034), for `ui().bossBar`: the boss's name, health and max, and whether it's enraged (041), or
 * null while none fights; 060: whether it shows the blue shield (the Forgewright's plating), and its heat gauge's fill
 * (0..1, null for a boss without one).
 */
export type BossBarShown = { name: string; health: number; maxHealth: number; enraged: boolean; shielded: boolean; heat: number | null } | null;

const B = HOLLOWS_LOOK.bossBar;

// A region boss's health bar (034) along the top of the screen while it fights the
// player: its name over a long danger-red bar in a brass frame. Gone when it isn't engaged.
// 060: while the Forgewright's plating holds, the bar is the immune blue with 054's shield at its left end, and its
// heat gauge runs under it in ember, flashing once full.
export class BossBar {
  private readonly scene: Scene;
  private readonly bar: GameObjects.Graphics;
  private readonly name: TextLine;
  private icon?: GameObjects.Image;
  shown: BossBarShown = null;

  constructor(scene: Scene) {
    this.scene = scene;
    this.bar = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.hud);
    this.name = new TextLine(scene, 0, 0, DEPTHS.hud + 1, false, 'display');
    this.setVisible(false);
  }

  update(sim: SimState): void {
    const boss = sim.enemies.find((e) => e.roomId === sim.roomId && arenaOf(e.enemyId) !== undefined && engaged(e));
    if (!boss) {
      this.shown = null;
      this.setVisible(false);
      return;
    }
    const max = defOf(boss).maxHealth;
    const def = enemyDef(boss.enemyId);
    const forge = forgeDefOf(boss);
    const shielded = plated(boss);
    const heat = forge ? Math.min(1, boss.heat / forge.heat.max) : null;
    this.shown = { name: def.name, health: boss.health, maxHealth: max, enraged: boss.enraged, shielded, heat };
    const x = Math.round((VIEW_WIDTH - B.w) / 2);
    const g = this.bar;
    g.clear();
    g.fillStyle(colorOf(B.frame)).fillRect(x - B.border * 2, B.top - B.border * 2, B.w + B.border * 4, B.h + B.border * 4);
    g.fillStyle(colorOf(B.back)).fillRect(x - B.border, B.top - B.border, B.w + B.border * 2, B.h + B.border * 2);
    g.fillStyle(colorOf(shielded ? ENEMY_FX.immuneBar.color : B.fill)).fillRect(x, B.top, Math.max(0, Math.round((B.w * boss.health) / max)), B.h);
    this.drawShield(shielded, x);
    if (heat !== null) this.drawHeat(g, x, heat);
    this.name.set(def.name);
    this.name.moveTo(Math.round((VIEW_WIDTH - this.name.width) / 2), B.top - B.nameGap - B.border * 2 - this.name.lineHeight);
    this.setVisible(true);
  }

  /** 054's shield at the bar's left end while it's shielded. */
  private drawShield(on: boolean, x: number): void {
    if (!on) {
      this.icon?.setVisible(false);
      return;
    }
    const I = ENEMY_FX.immuneBar.icon;
    this.icon ??= addVector(this.scene, 0, 0, SPRITES.enemyImmune).setOrigin(0).setScrollFactor(0).setDepth(DEPTHS.hud + 1);
    this.icon.setVisible(true).setPosition(x - B.border * 2 - I.gap - I.w, Math.round(B.top + B.h / 2 - I.h / 2));
  }

  /** The heat gauge (060) under the bar: its fill ember, flashing light once full. */
  private drawHeat(g: GameObjects.Graphics, x: number, heat: number): void {
    const H = FORGE_LOOK.heat;
    const y = B.top + B.h + B.border * 2 + H.gap;
    const full = heat >= 1 && Math.floor(this.scene.time.now / H.pulseMs) % 2 === 0;
    g.fillStyle(colorOf(H.back)).fillRect(x - B.border, y - B.border, B.w + B.border * 2, H.h + B.border * 2);
    g.fillStyle(colorOf(full ? H.full : H.fill)).fillRect(x, y, Math.round(B.w * heat), H.h);
  }

  private setVisible(on: boolean): void {
    this.bar.setVisible(on);
    this.name.setVisible(on);
    if (!on) this.icon?.setVisible(false);
  }
}
