import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, ENEMY_FX, SPRITES } from '../data/assets';
import { FORGE_LOOK } from '../data/forgewrightAssets';
import { forgeDefOf } from '../sim/forgewrightParts';
import { plated } from '../sim/bossParts';
import { addVector } from './vector/textures';
import { VIEW_WIDTH } from '../data/config';
import { enemyDef } from '../data/enemies';
import { HOLLOWS_LOOK } from '../data/hollowsAssets';
import { engagedBoss } from './bossLook';
import { defOf } from '../sim/champions';
import type { SimState } from '../sim/state';
import { colorOf } from './color';
import { TextLine } from './textLine';
import { DrawKey } from './drawKey';
import { HUD_EDGES } from '../data/hudLook';
import { barAlpha, barFill } from './bossIntro';
import { introShort } from '../sim/bossIntro';

/**
 * The boss bar as drawn (034), for `ui().bossBar`: the boss's name, health and max, and whether it's enraged (041), or
 * null while none fights; 060: whether it shows the blue shield (the Forgewright's plating), and its heat gauge's fill
 * (0..1, null for a boss without one). 080: `fill`, how much of its health the bar shows: it fills from empty during its
 * intro (`health` is still the sim's). 081: `frameAlpha`, the baked frame's alpha (it fades in with the bar through 080's intro).
 */
export type BossBarShown = { name: string; health: number; maxHealth: number; enraged: boolean; shielded: boolean; heat: number | null; fill: number; frameAlpha: number } | null;

const B = HOLLOWS_LOOK.bossBar;
/** 081's lit lines, made once. */
const LIT = { top: colorOf(HUD_EDGES.hpFill.top.color), foot: colorOf(HUD_EDGES.hpFill.foot.color), lip: colorOf(HUD_EDGES.well.lip.color) };

// A region boss's health bar (034) along the top of the screen while it fights the
// player: its name over a long danger-red bar in a brass frame. Gone when it isn't engaged.
// 060: while the Forgewright's plating holds, the bar is the immune blue with 054's shield at its left end, and its
// heat gauge runs under it in ember, flashing once full.
// 081: the frame is baked (`hud-boss-bar`, the HP bar's carved look at the same outer box), the fill has a lit top
// line, the heat gauge sits in a carved well, the name has an ink outline, and the bar redraws only on a change.
export class BossBar {
  private readonly scene: Scene;
  private readonly frame: GameObjects.Image;
  private readonly bar: GameObjects.Graphics;
  private readonly name: TextLine;
  private icon?: GameObjects.Image;
  private readonly key = new DrawKey(5);
  private readonly record: NonNullable<BossBarShown> = { name: '', health: 0, maxHealth: 0, enraged: false, shielded: false, heat: null, fill: 1, frameAlpha: 1 };
  shown: BossBarShown = null;

  constructor(scene: Scene) {
    this.scene = scene;
    this.frame = addVector(scene, 0, 0, SPRITES.hudBossBar).setOrigin(0).setScrollFactor(0).setDepth(DEPTHS.hud);
    this.bar = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.hud + 0.5);
    this.name = new TextLine(scene, 0, 0, DEPTHS.hud + 1, false, 'bossName');
    this.setVisible(false);
  }

  /** 081: how many times the bar has redrawn, for `ui().hudDraws`. */
  get draws(): number {
    return this.key.draws;
  }

  update(sim: SimState): void {
    const boss = engagedBoss(sim);
    if (!boss) {
      this.shown = null;
      this.setVisible(false);
      this.key.invalidate();
      return;
    }
    const max = defOf(boss).maxHealth;
    const forge = forgeDefOf(boss);
    const shielded = plated(boss);
    const heat = forge ? Math.min(1, boss.heat / forge.heat.max) : null;
    // 080: the bar fills from empty and fades in through the intro's card (the short intro's whole length).
    const short = boss.mode === 'intro' && introShort(sim, boss);
    const fill = boss.mode === 'intro' ? barFill(boss.modeTicks, short) : 1;
    const alpha = boss.mode === 'intro' ? barAlpha(boss.modeTicks, short) : 1;
    this.frame.setAlpha(alpha);
    this.bar.setAlpha(alpha);
    this.name.setAlpha(alpha);
    // What the bar draws, kept in one record (081: no object a frame), heat at its real value.
    const r = this.record;
    r.name = enemyDef(boss.enemyId).name;
    r.health = boss.health;
    r.maxHealth = max;
    r.enraged = boss.enraged;
    r.shielded = shielded;
    r.heat = heat;
    r.fill = fill;
    r.frameAlpha = this.frame.alpha;
    this.shown = r;
    const H = FORGE_LOOK.heat;
    const heatW = heat === null ? -1 : Math.round((B.w - 2 * H.inset) * heat);
    const full = heat !== null && heat >= 1 && Math.floor(this.scene.time.now / H.pulseMs) % 2 === 0;
    const w = Math.max(0, Math.round((B.w * boss.health * fill) / max));
    // 081: redrawn only when what it draws changes: the boss, the fill's width (080's intro fill included), the shield, the heat.
    const changed = this.key.put(boss.id).put(w).put(shielded).put(heatW).put(full).changed();
    this.setVisible(true);
    if (!changed) return;
    const x = Math.round((VIEW_WIDTH - B.w) / 2);
    this.frame.setPosition(x - B.border * 2, B.top - B.border * 2);
    const g = this.bar.clear();
    g.fillStyle(colorOf(shielded ? ENEMY_FX.immuneBar.color : B.fill)).fillRect(x, B.top, w, B.h);
    g.fillStyle(LIT.top, HUD_EDGES.hpFill.top.alpha).fillRect(x, B.top, w, 1);
    g.fillStyle(LIT.foot, HUD_EDGES.hpFill.foot.alpha).fillRect(x, B.top + B.h - 1, w, 1);
    this.drawShield(shielded, x);
    if (heat !== null) this.drawHeat(g, x, heatW, full);
    this.name.set(r.name);
    this.name.moveTo(Math.round((VIEW_WIDTH - this.name.width) / 2), B.top - B.nameGap - B.border * 2 - this.name.lineHeight);
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

  /** The heat gauge (060) under the bar, `w` px of it filled: its fill ember, flashing light once full; 081: in a carved well. */
  private drawHeat(g: GameObjects.Graphics, x: number, w: number, full: boolean): void {
    const H = FORGE_LOOK.heat;
    const y = B.top + B.h + B.border * 2 + H.gap;
    const left = x + H.inset;
    const span = B.w - 2 * H.inset;
    g.fillStyle(colorOf(H.back)).fillRect(left - B.border, y - B.border, span + B.border * 2, H.h + B.border * 2);
    g.fillStyle(LIT.lip, HUD_EDGES.well.lip.alpha).fillRect(left, y + H.h, span, B.border);
    g.fillStyle(colorOf(full ? H.full : H.fill)).fillRect(left, y, w, H.h);
    g.fillStyle(LIT.top, HUD_EDGES.hpFill.top.alpha).fillRect(left, y, w, 1);
  }

  private setVisible(on: boolean): void {
    this.frame.setVisible(on);
    this.bar.setVisible(on);
    this.name.setVisible(on);
    if (!on) this.icon?.setVisible(false);
  }
}
