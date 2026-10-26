import type { GameObjects, Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../data/config';
import { FEET_BOX } from '../data/player';
import { INTERACT_PROMPTS } from '../data/interact';
import { TUTORIAL_LAYOUT } from '../data/foundryAssets';
import { interactTarget } from '../sim/interactables';
import { placeNameTag, type TagBox } from './nameTagPlace';
import { promptCapX } from './InteractPrompt';
import { HOVER_NAME } from '../data/hudLayout';
import { MINIMAP } from '../data/minimap';
import { OVERWORLD } from '../data/overworld';
import { pieceRect } from '../sim/pieces';
import type { SimState } from '../sim/state';
import { drawTablet } from './tablet';
import { TextLine } from './textLine';
import { HoverReadout } from './HoverReadout';
import { intakeLines, pieceLines } from './readoutLines';
import { entranceCap } from '../sim/research';
import { entranceRates } from '../sim/intakeRates';
import { nameAt } from './hoverNames';
import { enemyChips } from './describe';
import { ChipLabels, drawChip, flowChips } from './KeywordChip';
import { CHIP } from '../data/legibility';
import type { PlacedChip } from './tipTypes';

/** What the hover name shows, for `ui()`: the name, its description (018) and an enemy's chips (040.4); whether the tag draws the name (050: not over a champion). */
export const NO_HOVER_UI = { hoverName: null as string | null, hoverDescription: null as string | null, hoverChips: [] as string[], hoverBox: null as TagBox | null, hoverNameDrawn: false, hoverLines: [] as string[] };

// What the cursor is over in the world (015): its name, and over a machine or the
// intake (019, 024), the readout of what it holds (006) under the name.
export class HoverView {
  private readonly readout: HoverReadout;
  private readonly back: GameObjects.Graphics;
  private readonly name: TextLine;
  /** Where materials come from, under the name (018). */
  private readonly description: TextLine;
  /** The name and description on show, for the test hook. */
  shown: string | null = null;
  shownDescription: string | null = null;
  get ui(): typeof NO_HOVER_UI {
    return { hoverName: this.shown, hoverDescription: this.shownDescription, hoverChips: this.shownChips, hoverBox: this.shown === null || !this.tagShown ? null : this.box, hoverNameDrawn: this.shown !== null && this.nameDrawn, hoverLines: this.shownLines };
  }

  /** 069: the readout's lines on show, for the test hook. */
  private shownLines: string[] = [];

  /** An enemy's chips under its name (040.4: traits, then live statuses), by their words. Not clickable: a click there fires. */
  shownChips: string[] = [];
  /** 050: the name tag's tablet, world px. */
  private box: TagBox = { x: 0, y: 0, w: 0, h: 0 };
  /** Whether the tag draws the name line (050: not over a champion, whose nameplate already names it) and draws at all. */
  private nameDrawn = false;
  private tagShown = false;
  private readonly chipLabels: ChipLabels;

  constructor(scene: Scene) {
    this.readout = new HoverReadout(scene);
    this.back = scene.add.graphics().setDepth(DEPTHS.hoverName);
    this.name = new TextLine(scene, 0, 0, DEPTHS.hoverName + 1, true, HOVER_NAME.style);
    this.description = new TextLine(scene, 0, 0, DEPTHS.hoverName + 1, true, HOVER_NAME.style);
    this.chipLabels = new ChipLabels(scene, DEPTHS.hoverName + 2, true);
  }

  /**
   * `point` is the world point under the cursor, or null when it's over UI;
   * `topOf` gives a drawn foundry piece's sprite top; `view` (the camera's world view: its top left, and its size) keeps panels on screen.
   */
  update(sim: SimState, shown: string, point: { x: number; y: number } | null, topOf: (id: number) => number | undefined, view: { x: number; y: number; width?: number; height?: number }): void {
    const viewTop = view.y;
    const hit = point ? nameAt(sim, shown, point.x, point.y) : null;
    this.shown = hit?.name ?? null;
    this.shownDescription = hit?.description ?? null;
    const piece = hit?.pieceId !== undefined ? sim.foundry.pieces.find((p) => p.id === hit.pieceId) : undefined;
    let top = hit ? hit.y - hit.rise : 0;
    /** 050.1: where the tag goes: under the thing's feet (its ground point), or under the intake's readout. */
    let below = hit ? hit.y : 0;
    /** 069: the readout's panel, which the name tag never covers (the intake's rates widen it). */
    let panelBox: TagBox | null = null;
    // 069: the intake's lines carry each entrance's rates, as the sim measures them.
    const lines = piece ? pieceLines(piece) : hit?.intake ? intakeLines(sim.link.entrances, entranceCap(sim), entranceRates(sim)) : [];
    this.shownLines = lines.map((l) => l[1]);
    if (piece) {
      const r = pieceRect(piece);
      const spriteTop = topOf(piece.id) ?? r.y;
      const panel = this.readout.show(lines, r.x, spriteTop, viewTop);
      top = lines.length > 0 ? panel.top : spriteTop;
      if (lines.length > 0) panelBox = { x: panel.left, y: panel.top, w: panel.width, h: panel.bottom - panel.top };
    } else if (hit?.intake) {
      // The intake (019, 024): each entrance's count over its mouth, kept on screen.
      const panel = this.readout.show(lines, hit.x, hit.y, viewTop);
      top = panel.top;
      below = panel.bottom;
      panelBox = { x: panel.left, y: panel.top, w: panel.width, h: panel.bottom - panel.top };
    } else this.readout.show([], 0, 0);
    this.back.clear();
    const enemy = hit?.enemy !== undefined ? sim.enemies.find((e) => e.id === hit.enemy) : undefined;
    const chips = enemy ? enemyChips(enemy) : [];
    this.shownChips = chips.map((c) => c.label);
    // 050 (review): a champion's nameplate (032) already names it over its head, so its tag shows only its chips.
    const named = !enemy?.champion;
    this.nameDrawn = named;
    this.tagShown = hit !== null && (named || chips.length > 0 || hit.description !== undefined);
    this.name.setVisible(hit !== null && named);
    this.description.setVisible(hit?.description !== undefined);
    if (!hit || !this.tagShown) {
      this.chipLabels.hide();
      return;
    }
    this.name.set(hit.name);
    const { pad, descriptionGap } = HOVER_NAME;
    const nameH = named ? this.name.lineHeight : 0;
    // The enemy's chips in a row under its name (040.4).
    const row = flowChips(chips, (l) => this.chipLabels.width(l), { x: 0, y: 0, firstX: 0, right: Infinity, rowStep: 0 });
    const chipsW = Math.max(0, ...row.placed.map((c) => c.box.x + c.box.w));
    const chipRow = chips.length > 0 ? (named ? descriptionGap : 0) + CHIP.h : 0;
    const extra = (hit.description !== undefined ? descriptionGap + this.description.lineHeight : 0) + chipRow;
    if (hit.description !== undefined) this.description.set(hit.description);
    const w = Math.max(named ? this.name.width : 0, hit.description !== undefined ? this.description.width : 0, chipsW);
    const h = nameH + extra;
    // 050.1: under the thing's feet, clear of the E prompt; just above it where that would cover the player (or the
    // prompt), else beside it, else above its prompt; kept in the view and off the minimap.
    const p = sim.player;
    const feet = p.y + FEET_BOX.h / 2;
    const { playerBox } = HOVER_NAME;
    const here = shown === sim.roomId;
    const prompt = here ? interactTarget(sim) : null;
    const cap = HOVER_NAME.promptCap;
    const avoid = [
      ...(here ? [{ x: p.x - playerBox.w / 2, y: feet - playerBox.h, w: playerBox.w, h: playerBox.h }] : []),
      // The E prompt's key cap over whatever E acts on (045), wherever it is (beside the bench, 052.9).
      ...(prompt ? [{ x: promptCapX(prompt.kind, prompt.x, p.x) - cap.w / 2, y: prompt.y - INTERACT_PROMPTS[prompt.kind].rise - TUTORIAL_LAYOUT.promptLift - cap.h, w: cap.w, h: cap.h }] : []),
      ...(shown === OVERWORLD.id ? [minimapBox(view)] : []),
      ...(panelBox ? [panelBox] : []),
    ];
    const halfW = piece ? pieceRect(piece).w / 2 : HOVER_NAME.node.w / 2;
    const at = placeNameTag({
      cx: hit.x,
      halfW,
      feet: hit.y,
      rise: hit.rise,
      below: below + HOVER_NAME.gap,
      top,
      playerX: p.x,
      gap: HOVER_NAME.gap,
      promptClear: HOVER_NAME.promptClear,
      w: w + 2 * pad,
      h: h + 2 * pad,
      avoid,
      // 069: the world view's own size (larger in build mode's zoom out), else the view's.
      view: { x: view.x, y: viewTop, w: view.width ?? VIEW_WIDTH, h: view.height ?? VIEW_HEIGHT },
      edge: 0,
    });
    const y = Math.round(at.y + pad);
    const cx = at.x + pad + w / 2;
    this.name.moveTo(Math.round(cx - this.name.width / 2), y);
    if (hit.description !== undefined) this.description.moveTo(Math.round(cx - this.description.width / 2), y + nameH + descriptionGap);
    const left = Math.round(cx - w / 2);
    this.box = { x: left - pad, y: y - pad, w: w + 2 * pad, h: h + 2 * pad };
    drawTablet(this.back, left - pad, y - pad, w + 2 * pad, h + 2 * pad, HOVER_NAME.alpha);
    const chipsY = y + h - CHIP.h;
    const placed: PlacedChip[] = row.placed.map((c) => ({ ...c, box: { ...c.box, x: Math.round(cx - chipsW / 2 + c.box.x), y: chipsY } }));
    for (const c of placed) drawChip(this.back, c.box, c.group);
    this.chipLabels.show(placed);
  }
}

/** The minimap's frame (017) in world px, for a camera whose top left is `view`. */
function minimapBox(view: { x: number; y: number }): TagBox {
  const w = OVERWORLD.width * MINIMAP.scale + 2 * MINIMAP.frame.width;
  const h = OVERWORLD.height * MINIMAP.scale + 2 * MINIMAP.frame.width;
  const x1 = view.x + VIEW_WIDTH - MINIMAP.margin + MINIMAP.frame.width;
  const y0 = view.y + MINIMAP.margin - MINIMAP.frame.width;
  return { x: x1 - w, y: y0, w, h };
}
