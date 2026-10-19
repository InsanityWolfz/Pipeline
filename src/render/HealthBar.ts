import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, SPRITES } from '../data/assets';
import { HP_BAR, HUD_HEALTH_LAYOUT } from '../data/hudPanels';
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
}

/** What the bar reads from the sim each frame. */
export interface HealthInput {
  health: number;
  max: number;
  healing: boolean;
  dying: boolean;
  /** Total armor from every worn piece (036). */
  armor: number;
}

// The HP bar (031): bottom-left, a carved frame round a 144x12 fill reading "72 / 100",
// the shield and the total armor beside it (036). Green, red and pulsing below a quarter;
// a white chunk for damage just taken; a cyan glow while healing (030). Fixed to the screen.
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
    return { box: { ...this.block }, text: this.text.obj.text, low: this.model.low, healing: this.healing, chunk: Math.round(chunkOf(this.model) * 100) / 100 };
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
  }
}
