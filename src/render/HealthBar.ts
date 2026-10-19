import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, SPRITES } from '../data/assets';
import { HP_BAR, HUD_HEALTH_LAYOUT, levelText } from '../data/hudPanels';
import { LEVEL_UP, TALENT_SPRITES } from '../data/talentAssets';
import type { ScreenBox } from './bottomHud';
import { colorOf } from './color';
import { chunkOf, createHealthBar, pulseOf, stepHealthBar } from './healthBarModel';
import { healthBlockBox } from './healthLayout';
import { TextLine } from './textLine';
import { addVector } from './vector/textures';

/** The HP bar as drawn (031), for `ui().health`: the block's box, its text, and its states; `chunk` is the white part in HP. */
export interface HealthShown {
  box: ScreenBox;
  text: string;
  low: boolean;
  healing: boolean;
  chunk: number;
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
}

// The HP bar (031): bottom-left, a carved frame round a 144x12 fill reading "72 / 100",
// the shield and the total armor beside it (036). Green, red and pulsing below a quarter;
// a white chunk for damage just taken; a cyan glow while healing (030). Under it 037's XP
// row: a thin cyan bar that ticks bright on a gain (no popups), "Lv 7" and a pip while
// talent points wait. Fixed to the screen.
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
  private block: ScreenBox = healthBlockBox(null);

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

  get shown(): HealthShown {
    return { box: { ...this.block }, text: this.text.obj.text, low: this.model.low, healing: this.healing, chunk: Math.round(chunkOf(this.model) * 100) / 100, xp: { ...this.xpShown } };
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

    const g = this.fill.clear().setPosition(x, bottom).setScale(scale);
    const left = L.fill.x;
    const top = L.fill.y - L.frame.h;
    const px = (hp: number) => Math.round((L.fill.w * Math.max(0, Math.min(input.max, hp))) / input.max);
    const filled = px(m.shown);
    g.fillStyle(colorOf(m.low ? L.lowColor : L.fillColor)).fillRect(left, top, filled, L.fill.h);
    if (pulse > 0) g.fillStyle(colorOf(L.chunkColor), pulse * HP_BAR.pulseBrighten).fillRect(left, top, filled, L.fill.h);
    const chunkEnd = px(m.top);
    if (chunkEnd > filled) g.fillStyle(colorOf(L.chunkColor)).fillRect(left + filled, top, chunkEnd - filled, L.fill.h);

    this.text.set(`${Math.ceil(input.health)} / ${input.max}`);
    this.text.moveTo(Math.round(cx - this.text.width / 2), y + L.textY);
    const S = L.shield;
    const shieldX = x + L.frame.w + S.gap;
    const alpha = input.armor > 0 ? 1 : L.dimAlpha;
    this.shield.setPosition(shieldX, y + Math.round((L.frame.h - S.h) / 2)).setAlpha(alpha);
    this.value.set(String(input.armor)).moveTo(shieldX + S.w + S.valueGap, y + S.valueY).setAlpha(alpha);
    this.drawXp(input.xp, x, bottom + L.xp.gap, shieldX, dtMs);
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
    const g = this.xpBar.clear();
    g.fillStyle(colorOf(X.back), X.backAlpha).fillRect(x + B.x, y + B.y, B.w, B.h);
    g.fillStyle(colorOf(X.fill)).fillRect(x + B.x, y + B.y, w, B.h);
    if (tick > 0 && w > 0) g.fillStyle(colorOf(X.tickColor), tick).fillRect(x + B.x + Math.max(0, w - LEVEL_UP.tickWidth), y + B.y, Math.min(w, LEVEL_UP.tickWidth), B.h);
    const text = levelText(xp.level);
    this.level.set(text).moveTo(textX, y + X.textY);
    const pip = xp.points > 0;
    this.pip.setVisible(pip).setPosition(textX + this.level.width + X.pipGap + X.pipHalf, y + X.pipY);
    this.xpShown = { text, fill: Math.round(fill * 1000) / 1000, pip, tick: Math.round(tick * 100) / 100, bar: { x: x + B.x, y: y + B.y, w: B.w, h: B.h } };
  }
}
