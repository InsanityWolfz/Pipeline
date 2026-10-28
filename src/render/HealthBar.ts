import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, SPRITES } from '../data/assets';
import { HP_BAR, HUD_HEALTH_LAYOUT, levelText } from '../data/hudPanels';
import { HUD_EDGES } from '../data/hudLook';
import { LEVEL_UP, TALENT_SPRITES } from '../data/talentAssets';
import type { ScreenBox } from './bottomHud';
import { colorOf } from './color';
import { DrawKey } from './drawKey';
import { chunkOf, createHealthBar, pulseOf, stepHealthBar } from './healthBarModel';
import { healthBlockBox } from './healthLayout';
import { TextLine } from './textLine';
import { addVector } from './vector/textures';
import { STORM_ENEMY_LOOK } from '../data/stormcrownEnemyAssets';

/** The HP bar as drawn (031), for `ui().health`: the block's box, its text, and its states; `chunk` is the white part in HP. */
export interface HealthShown {
  box: ScreenBox;
  text: string;
  low: boolean;
  healing: boolean;
  chunk: number;
  /** 065: the slow's wind streaks are on the fill. */
  slowed: boolean;
  /** 037's XP row: "Lv 7", the bar's fill (0..1; full at the cap), the pip while points are unspent, and the gain tick's strength (0..1). */
  xp: { text: string; fill: number; pip: boolean; tick: number; bar: ScreenBox };
}

/** The XP row's input (037): the level, how full the bar is (1 at the cap), unspent points, and whether XP came in since the last frame. */
export interface XpInput {
  level: number;
  fill: number;
  points: number;
  gained: boolean;
}

/** What the bar reads from the sim each frame. */
export interface HealthInput {
  health: number;
  max: number;
  healing: boolean;
  dying: boolean;
  /** Total armor from every worn piece (036). */
  armor: number;
  xp: XpInput;
  /** 065: the player is slowed (a gale ram's gust): wind streaks slide over the fill. */
  slowed?: boolean;
}

// The HP bar (031): bottom-left, a carved frame round a 144x12 fill reading "72 / 100",
// the shield and the total armor beside it (036). Green, red and pulsing below a quarter;
// a white chunk for damage just taken; a cyan glow while healing (030). Under it 037's XP
// row: a thin cyan bar that ticks bright on a gain (no popups), "Lv 7" and a pip while
// talent points wait. Fixed to the screen.
const E = HUD_EDGES;
/** 081's rim colours, made once. */
const RIM = {
  top: colorOf(E.hpFill.top.color),
  foot: colorOf(E.hpFill.foot.color),
  xpEdge: colorOf(E.xp.edge),
  xpLip: colorOf(E.xp.lip.color),
  xpTop: colorOf(E.xp.top),
};

/** The fill's width for `hp` of `max`, px. */
const fillPx = (hp: number, max: number): number => Math.round((HUD_HEALTH_LAYOUT.fill.w * Math.max(0, Math.min(max, hp))) / max);

export class HealthBar {
  private readonly frame: GameObjects.Image;
  private readonly glow: GameObjects.Image;
  /** The fill, the chunk and the pulse's wash, drawn from the frame's bottom-left so the pulse scales them with it. */
  private readonly fill: GameObjects.Graphics;
  private readonly text: TextLine;
  private readonly shield: GameObjects.Image;
  private readonly value: TextLine;
  private readonly model = createHealthBar(0);
  /** The images' own scale (their texture's bake scale), which the pulse multiplies. */
  private readonly baseScale: number;
  private readonly xpBar: GameObjects.Graphics;
  private readonly level: TextLine;
  private readonly pip: GameObjects.Image;
  private xpShown: HealthShown['xp'] = { text: '', fill: 0, pip: false, tick: 0, bar: { x: 0, y: 0, w: 0, h: 0 } };
  /** Ms left on the XP bar's gain tick. */
  private tickMs = 0;
  private glowAlpha = 0;
  private healing = false;
  private slowed = false;
  /** Ms on the slow's streaks' slide. */
  private slideMs = 0;
  private block: ScreenBox = healthBlockBox(null);
  /** 081: what the fill and the XP row last drew; they redraw only on a change. */
  private readonly fillKey = new DrawKey(5);
  private readonly xpKey = new DrawKey(4);

  constructor(scene: Scene) {
    const fixed = <T extends GameObjects.Components.ScrollFactor & GameObjects.Components.Depth>(o: T, depth: number = DEPTHS.hud): T => {
      o.setScrollFactor(0).setDepth(depth);
      return o;
    };
    this.glow = fixed(addVector(scene, 0, 0, SPRITES.hudHealthGlow).setOrigin(0.5), DEPTHS.hud - 1).setAlpha(0);
    // Anchored bottom-left: the pulse grows it up and right, never past the margin or onto the shield.
    this.frame = fixed(addVector(scene, 0, 0, SPRITES.hudHealth).setOrigin(0, 1));
    this.baseScale = this.frame.scaleX;
    this.fill = fixed(scene.add.graphics(), DEPTHS.hud + 1);
    this.text = new TextLine(scene, 0, 0, DEPTHS.hud + 2, false, 'count');
    this.shield = fixed(addVector(scene, 0, 0, SPRITES.hudShield).setOrigin(0));
    this.value = new TextLine(scene, 0, 0, DEPTHS.hud + 2, false, 'count');
    this.xpBar = fixed(scene.add.graphics(), DEPTHS.hud + 1);
    this.level = new TextLine(scene, 0, 0, DEPTHS.hud + 2, false, 'count');
    this.pip = fixed(addVector(scene, 0, 0, TALENT_SPRITES.pip).setOrigin(0.5), DEPTHS.hud + 2);
  }

  /** The whole block (frame, shield and value), view px: a press there never fires (015). */
  get box(): ScreenBox {
    return this.block;
  }

  /** The low-HP pulse now, 0 to 1 (0 while not low): the screen edges pulse with it. */
  get pulse(): number {
    return pulseOf(this.model);
  }

  /** 081: how many times the fill and the XP row have redrawn, for `ui().hudDraws`. */
  get draws(): { fill: number; xp: number } {
    return { fill: this.fillKey.draws, xp: this.xpKey.draws };
  }

  get shown(): HealthShown {
    return { box: { ...this.block }, text: this.text.obj.text, low: this.model.low, healing: this.healing, chunk: Math.round(chunkOf(this.model) * 100) / 100, slowed: this.slowed, xp: { ...this.xpShown } };
  }

  /** `buildBar` is the build bar's box while building (the block rises over its labels if it reaches it), else null. */
  update(input: HealthInput, buildBar: ScreenBox | null, dtMs: number): void {
    const L = HUD_HEALTH_LAYOUT;
    const m = this.model;
    stepHealthBar(m, input, dtMs);
    this.healing = input.healing && !input.dying;
    this.block = healthBlockBox(buildBar);
    const { x, y } = this.block;
    const cx = x + L.frame.w / 2;
    const cy = y + L.frame.h / 2;
    const bottom = y + L.frame.h;
    const pulse = pulseOf(m);
    const scale = 1 + pulse * HP_BAR.pulseScale;
    this.frame.setPosition(x, bottom).setScale(this.baseScale * scale);
    this.glowAlpha = Math.max(0, Math.min(1, this.glowAlpha + (this.healing ? 1 : -1) * (dtMs / HP_BAR.glow.fadeMs)));
    this.glow.setPosition(cx, cy).setAlpha(this.glowAlpha).setVisible(this.glowAlpha > 0);

    const g = this.fill.setPosition(x, bottom).setScale(scale);
    const left = L.fill.x;
    const top = L.fill.y - L.frame.h;
    const filled = fillPx(m.shown, input.max);
    const chunkEnd = fillPx(m.top, input.max);
    const slowed = input.slowed === true && !input.dying;
    if (slowed) this.slideMs = (this.slideMs + dtMs) % STORM_ENEMY_LOOK.slowBar.slideMs;
    this.slowed = slowed;
    // 081: redrawn only when what it shows changes.
    if (this.fillKey.put(filled).put(chunkEnd).put(m.low).put(pulse).put(slowed ? this.slideMs : -1).changed()) {
      g.clear();
      g.fillStyle(colorOf(m.low ? L.lowColor : L.fillColor)).fillRect(left, top, filled, L.fill.h);
      if (pulse > 0) g.fillStyle(colorOf(L.chunkColor), pulse * HP_BAR.pulseBrighten).fillRect(left, top, filled, L.fill.h);
      // 081: a rim light: a lit top line and a dark foot line on the fill.
      g.fillStyle(RIM.top, E.hpFill.top.alpha).fillRect(left, top, filled, 1);
      g.fillStyle(RIM.foot, E.hpFill.foot.alpha).fillRect(left, top + L.fill.h - 1, filled, 1);
      if (chunkEnd > filled) g.fillStyle(colorOf(L.chunkColor)).fillRect(left + filled, top, chunkEnd - filled, L.fill.h);
      if (slowed) this.drawSlow(g, left, top);
    }

    this.text.set(`${Math.ceil(input.health)} / ${input.max}`);
    this.text.moveTo(Math.round(cx - this.text.width / 2), y + L.textY);
    const S = L.shield;
    const shieldX = x + L.frame.w + S.gap;
    const alpha = input.armor > 0 ? 1 : L.dimAlpha;
    this.shield.setPosition(shieldX, y + Math.round((L.frame.h - S.h) / 2)).setAlpha(alpha);
    this.value.set(String(input.armor)).moveTo(shieldX + S.w + S.valueGap, y + S.valueY).setAlpha(alpha);
    this.drawXp(input.xp, x, bottom + L.xp.gap, shieldX, dtMs);
  }

  /** 065: slowed, short pale wind streaks slant across the fill, sliding left to right. */
  private drawSlow(g: GameObjects.Graphics, left: number, top: number): void {
    const S = STORM_ENEMY_LOOK.slowBar;
    const { w, h } = HUD_HEALTH_LAYOUT.fill;
    g.lineStyle(S.width, colorOf(S.color), S.alpha);
    for (let i = 0; i < S.streaks; i++) {
      const x = left + (((i / S.streaks + this.slideMs / S.slideMs) % 1) * (w - S.slant));
      g.lineBetween(x, top + h - 2, x + S.slant, top + 2);
    }
  }

  /** The XP row (037) at its top-left (x, y): the bar under the fill, ticking bright on a gain, and "Lv 7" with the pip under the shield. */
  private drawXp(xp: XpInput, x: number, y: number, textX: number, dtMs: number): void {
    const X = HUD_HEALTH_LAYOUT.xp;
    const B = X.bar;
    if (xp.gained) this.tickMs = LEVEL_UP.tickMs;
    this.tickMs = Math.max(0, this.tickMs - dtMs);
    const tick = this.tickMs / LEVEL_UP.tickMs;
    const fill = Math.max(0, Math.min(1, xp.fill));
    const w = Math.round(B.w * fill);
    if (this.xpKey.put(x).put(y).put(w).put(tick).changed()) {
      const bx = x + B.x;
      const by = y + B.y;
      const g = this.xpBar.clear();
      // 081: the well edged in ink, with a lit lip under it.
      g.fillStyle(RIM.xpEdge, 1).fillRect(bx - 1, by - 1, B.w + 2, 1).fillRect(bx - 1, by + B.h, B.w + 2, 1);
      g.fillRect(bx - 1, by, 1, B.h).fillRect(bx + B.w, by, 1, B.h);
      g.fillStyle(RIM.xpLip, E.xp.lip.alpha).fillRect(bx, by + B.h + 1, B.w, 1);
      g.fillStyle(colorOf(X.back), X.backAlpha).fillRect(bx, by, B.w, B.h);
      g.fillStyle(colorOf(X.fill)).fillRect(bx, by, w, B.h);
      // 081: the fill's top px lit.
      g.fillStyle(RIM.xpTop, 1).fillRect(bx, by, w, 1);
      if (tick > 0 && w > 0) g.fillStyle(colorOf(X.tickColor), tick).fillRect(bx + Math.max(0, w - LEVEL_UP.tickWidth), by, Math.min(w, LEVEL_UP.tickWidth), B.h);
    }
    const text = levelText(xp.level);
    this.level.set(text).moveTo(textX, y + X.textY);
    const pip = xp.points > 0;
    this.pip.setVisible(pip).setPosition(textX + this.level.width + X.pipGap + X.pipHalf, y + X.pipY);
    this.xpShown = { text, fill: Math.round(fill * 1000) / 1000, pip, tick: Math.round(tick * 100) / 100, bar: { x: x + B.x, y: y + B.y, w: B.w, h: B.h } };
  }
}
