import type { GameObjects, Scene } from 'phaser';
import { colorOf } from './color';
import { drawTablet } from './tablet';
import { wideCardBox } from './tubeCard';
import { DEPTHS, SPRITES, TUBE_SLOT_FRAMES, tubeSlotFrame } from '../data/assets';
import { ammoDef } from '../data/ammo';
import { HUD_LAYOUT, ITEM_ICON_SIZE } from '../data/hudLayout';
import { itemDef } from '../data/items';
import type { HudActive } from '../sim/volley';
import { tubeSlotBox, tubeSlotUnits, type ScreenBox } from './bottomHud';
import { TextLine } from './textLine';
import { inBox, type Box } from './tipPlace';
import type { TipHit } from './tipTypes';
import { addVector, showFrame, textureScale } from './vector/textures';

interface Unit {
  icon: GameObjects.Image;
  label: TextLine;
}

/** What the tube slot shows, for the test hook: its screen rect, and each unit's icon frame and text. */
export interface TubeSlotState extends ScreenBox {
  icons: string[];
  labels: string[];
  /** Each label's left and width, view px, so a test can check it stays clear of its well's ring. */
  labelBoxes: { x: number; w: number }[];
}

// The intake's bar (025, 047: the tube slot): centred above the carried bar and `activeScale`
// times its size, it shows what the next left click does, as the sim's `hudActive` says: the
// volley, one icon per round with its entrance's count, in lane order (048: the left unit fires
// left of the cursor, the right one right); before the tube attunes, the selected
// carried round with how many are carried (047.9); else a fist labelled "Melee", or (070) "Tube empty · RMB fires
// carried" when right click has a carried round, on a card widened to fit it.
export class TubeSlotView {
  private readonly frame: GameObjects.Image;
  /** 070: the widened card, drawn live (a tablet and one ringed well) when the fist's label is wider than a unit. */
  private readonly wide: GameObjects.Graphics;
  private readonly units: Unit[];
  private shown: TubeSlotState = { ...tubeSlotBox(1), icons: [], labels: [], labelBoxes: [] };
  /** Each unit's round and box, for its tip (040); the fist has none. */
  private rounds: { ammoId: string; box: Box }[] = [];

  constructor(scene: Scene) {
    const fixed = <T extends GameObjects.Components.ScrollFactor & GameObjects.Components.Depth>(o: T, depth: number = DEPTHS.hud): T => {
      o.setScrollFactor(0).setDepth(depth);
      return o;
    };
    this.frame = fixed(addVector(scene, 0, 0, tubeSlotFrame(1)).setOrigin(0));
    this.wide = fixed(scene.add.graphics());
    this.units = TUBE_SLOT_FRAMES.map(() => ({
      icon: fixed(addVector(scene, 0, 0, SPRITES.hudFist).setOrigin(0), DEPTHS.hud + 1),
      label: new TextLine(scene, 0, 0, DEPTHS.hud + 1, false, 'count', HUD_LAYOUT.activeScale),
    }));
  }

  /** The slot's screen rect, so clicks on it never fire (015). */
  get box(): ScreenBox {
    const { x, y, w, h } = this.shown;
    return { x, y, w, h };
  }

  /** What it shows now, for `ui().hud`. */
  get state(): TubeSlotState {
    return { ...this.shown, icons: [...this.shown.icons], labels: [...this.shown.labels], labelBoxes: this.shown.labelBoxes.map((b) => ({ ...b })) };
  }

  /**
   * `building`: the build bar is up, so the slot sits above its group labels (026). `fistLabel` (070, tubeCard.ts) is
   * the fist's label when the card shows it; left out, "Melee".
   */
  update(active: HudActive, building = false, fistLabel: string | null = null): void {
    const S = HUD_LAYOUT.tubeSlot;
    // A volley has one round per intake entrance, and there's a frame for each count; more would be a bug.
    if (active.kind === 'volley' && active.rounds.length > this.units.length) {
      console.error(`The tube slot has ${this.units.length} units, but the volley has ${active.rounds.length} rounds`);
    }
    const rounds = active.kind === 'volley' ? active.rounds.slice(0, this.units.length) : active.kind === 'carried' ? [active] : [];
    const shows: { icon: string; label: string; ammoId?: string }[] =
      active.kind === 'melee' ? [{ icon: SPRITES.hudFist, label: fistLabel ?? S.melee }] : rounds.map((r) => ({ icon: ammoIcon(r.ammoId), label: String(r.count), ammoId: r.ammoId }));
    // 070: a label too wide for its unit's well widens the one-unit card.
    const first = this.units[0];
    const labelW = shows.length === 1 && first ? first.label.set(shows[0]?.label ?? '').width : 0;
    const wideBox = shows.length === 1 && labelW > S.w - 2 * (S.wellInset + S.labelPad) ? wideCardBox(labelW, building) : null;
    const box = wideBox ?? tubeSlotBox(shows.length, building);
    showFrame(this.frame, tubeSlotFrame(shows.length)).setOrigin(0).setPosition(box.x, box.y).setVisible(wideBox === null);
    this.drawWide(wideBox);
    const at = wideBox ? [{ x: wideBox.x, y: wideBox.y }] : tubeSlotUnits(shows.length, building);
    const unitW = wideBox ? wideBox.w : S.w;
    const iconSize = ITEM_ICON_SIZE * HUD_LAYOUT.activeScale;
    const labelBoxes: { x: number; w: number }[] = [];
    this.units.forEach((u, i) => {
      const show = shows[i];
      const pos = at[i];
      const visible = show !== undefined && pos !== undefined;
      u.icon.setVisible(visible);
      u.label.setVisible(visible);
      if (!show || !pos) return;
      showFrame(u.icon, show.icon)
        .setOrigin(0)
        .setScale(HUD_LAYOUT.activeScale / textureScale())
        .setPosition(pos.x + (unitW - iconSize) / 2, pos.y + S.iconY);
      u.label.set(show.label);
      const labelX = Math.round(pos.x + (unitW - u.label.width) / 2);
      u.label.moveTo(labelX, pos.y + S.countY);
      labelBoxes.push({ x: labelX, w: u.label.width });
    });
    this.shown = { ...box, icons: shows.map((s) => s.icon), labels: shows.map((s) => s.label), labelBoxes };
    this.rounds = shows.flatMap((sh, i) => (sh.ammoId && at[i] ? [{ ammoId: sh.ammoId, box: { ...(at[i] ?? { x: 0, y: 0 }), w: S.w, h: S.h } }] : []));
  }

  /** 070: the widened card as the one-unit frame draws it: a tablet with one dark well ringed in cyan; nothing for null. */
  private drawWide(box: ScreenBox | null): void {
    const g = this.wide.clear();
    if (!box) return;
    const S = HUD_LAYOUT.tubeSlot;
    const W = S.wide;
    drawTablet(g, box.x, box.y, box.w, box.h);
    const inset = S.wellInset;
    const [x, y, w, h] = [box.x + inset, box.y + inset, box.w - 2 * inset, box.h - 2 * inset];
    g.fillGradientStyle(colorOf(W.wellTop), colorOf(W.wellTop), colorOf(W.wellBottom), colorOf(W.wellBottom), 1, 1, 1, 1).fillRect(x, y, w, h);
    g.lineStyle(W.ringWidth, colorOf(W.ring), W.ringAlpha).strokeRoundedRect(x, y, w, h, 2);
  }

  /** 051 (B.7): the whole slot at this alpha (the intake's slot fading in as the old one shrinks away). */
  setAlpha(alpha: number): void {
    this.frame.setAlpha(alpha);
    this.wide.setAlpha(alpha);
    for (const u of this.units) {
      u.icon.setAlpha(alpha);
      u.label.setAlpha(alpha);
    }
  }

  /** The round under a view point (040: its summary above the slot). */
  tipAt(x: number, y: number): TipHit | null {
    const u = this.rounds.find((r) => inBox(r.box, x, y));
    return u ? { source: { kind: 'round', id: u.ammoId }, at: u.box, anchor: { box: u.box, prefer: ['above'] } } : null;
  }
}

const ammoIcon = (ammoId: string): string => itemDef(ammoDef(ammoId).itemId).icon;
