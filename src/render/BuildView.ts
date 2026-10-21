import type { GameObjects, Scene } from 'phaser';
import { animFrames, DEPTHS, SPRITES } from '../data/assets';
import { TILE_SIZE } from '../data/config';
import {
  CRATE_SPRITE,
  FACING_ARROWS,
  ICON_RISE,
  HOPPER_SPRITES,
  machineLook,
} from '../data/foundryAssets';
import { BUILD_BAR_LAYOUT, BUILD_PULSE, GHOST } from '../data/hudLayout';
import { BUILD_BAR, isFlatKind, pieceDef, TUNNEL_PIECES } from '../data/pieces';
import { splitterLook, tunnelLook } from './flatPieces';
import { pieceRect, type PlaceFail, type Tile } from '../sim/pieces';
import type { Facing } from '../sim/player';
import { colorOf } from './color';
import { buildBarLabelTop } from './bottomHud';
import { buildBarBox, buildBarCells, buildBarDividers, buildBarGroups, conduitLook, inRect, pieceIcon, type ScreenRect } from './foundryLayout';
import { MAX_ARROWS, placeArrows, viewOf } from './FoundryView';
import { toView } from './scale';
import { Pulse } from './pulse';
import { BuildStripView, type BuildStripState } from './BuildStripView';
import { TextLine } from './textLine';
import type { TipHit } from './tipTypes';
import { addVector, showFrame } from './vector/textures';

const FIRST_PIECE = BUILD_BAR[0] ?? '';

/** The resting frame of a piece's body as placed with `facing`. */
function bodyFrame(pieceId: string, facing: Facing, inFrom: Facing): string {
  const def = pieceDef(pieceId);
  const view = viewOf(facing);
  if (def.kind === 'machine') return machineLook(def.id, view).idle;
  if (def.kind === 'conduit') return animFrames(conduitLook(facing, inFrom).anim)[0] ?? '';
  return def.kind === 'hopper' ? HOPPER_SPRITES[view] : CRATE_SPRITE;
}

/** The build bar as drawn (026), for `ui().buildBar`, view px. */
export interface BuildBarState {
  shown: boolean;
  selected: string;
  cells: (ScreenRect & { pieceId: string })[];
  /** Each group's label as drawn: its text box (x, y the top of its capitals) and the group it heads. */
  groups: (ScreenRect & { category: string; label: string })[];
  dividers: { x: number; y: number; h: number }[];
  /** The piece whose cell pulses for the current objective (027), while it shows; else null. */
  pulsing: string | null;
  /** The pulse's alpha now, `BUILD_PULSE.min` to `max`. */
  pulseAlpha: number;
  /** 045: the build controls strip over the bar. */
  strip: BuildStripState;
}

// Build mode on screen: the bar of unlocked pieces in their groups (026), each
// group labelled with a thin divider between and the selected piece highlighted;
// and a ghost of it on the tile under the cursor, tinted by whether it can go there.
// Locked pieces aren't shown, nor a group with none unlocked. The piece the current
// objective names (027) pulses with a gold ring while the bar is open.
export class BuildView {
  private readonly scene: Scene;
  private cells: { pieceId: string; images: GameObjects.Image[] }[] = [];
  /** Each shown group's label with the group it heads. */
  private labels: { category: string; label: string; line: TextLine }[] = [];
  private readonly dividers: GameObjects.Graphics;
  private readonly highlight: GameObjects.Image;
  /** The gold ring over the cell the current objective names (027). */
  private readonly pulse: GameObjects.Image;
  private pulsing: string | null = null;
  private readonly wave: Pulse;
  private readonly ghost: GameObjects.Image;
  private readonly ghostIcon: GameObjects.Image;
  private readonly ghostArrows: GameObjects.Image[];
  private readonly strip: BuildStripView;
  private unlocked: readonly string[] = [];
  private visible = false;
  /** The piece whose cell the cursor is over (015's tip, now the legibility tablet: 040), for the test hook. */
  tipShown: string | null = null;
  selected = FIRST_PIECE;

  constructor(scene: Scene) {
    this.scene = scene;
    this.pulse = addVector(scene, 0, 0, SPRITES.buildPulse)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(DEPTHS.hud + 2)
      .setVisible(false);
    this.wave = new Pulse(scene, BUILD_PULSE.min, BUILD_PULSE.max, BUILD_PULSE.periodMs);
    this.highlight = addVector(scene, 0, 0, SPRITES.hudAmmoSelect)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(DEPTHS.hud + 2);
    this.ghost = addVector(scene, 0, 0, bodyFrame(FIRST_PIECE, 'right', 'left')).setAlpha(GHOST.alpha);
    this.ghostIcon = addVector(scene, 0, 0, pieceIcon(FIRST_PIECE)).setAlpha(GHOST.alpha);
    this.ghostArrows = Array.from({ length: MAX_ARROWS }, () => addVector(scene, 0, 0, FACING_ARROWS.out.down));
    for (const o of [this.ghost, this.ghostIcon, ...this.ghostArrows]) o.setDepth(DEPTHS.worldUi - 1);
    this.dividers = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.hud);
    this.strip = new BuildStripView(scene);
    this.setVisible(false);
  }

  /** True if a screen point is over the bar, its labels or the controls strip (045), so a click there isn't a place in the world. */
  overUi(x: number, y: number): boolean {
    return this.visible && (inRect(buildBarBox(this.unlocked), x, y) || inRect(this.strip.state.box, x, y));
  }

  /** What the bar shows, for the test hook (026). */
  get state(): BuildBarState {
    return {
      shown: this.visible,
      selected: this.selected,
      cells: buildBarCells(this.unlocked),
      groups: this.labels.map(({ category, label, line }) => ({ category, label, ...line.at, w: line.width, h: line.lineHeight })),
      dividers: buildBarDividers(this.unlocked),
      pulsing: this.pulsing,
      pulseAlpha: this.wave.value,
      strip: this.strip.state,
    };
  }

  /**
   * The piece under a view point (015, 040): a stage's summary, or another piece's name and description, over the group
   * labels so it never hides them (026).
   */
  tipAt(x: number, y: number): TipHit | null {
    const cell = this.visible ? buildBarCells(this.unlocked).find((c) => inRect(c, x, y)) : undefined;
    if (!cell) return null;
    const def = pieceDef(cell.pieceId);
    const top = buildBarLabelTop();
    const box = { x: cell.x, y: top, w: cell.w, h: cell.y + cell.h - top };
    const source = def.kind === 'machine' && def.stage ? { kind: 'stage' as const, id: def.stage } : { kind: 'piece' as const, id: cell.pieceId };
    return { source, at: { x: cell.x, y: cell.y, w: cell.w, h: cell.h }, anchor: { box, prefer: ['above'] } };
  }

  /** Moves the selection along the bar's (unlocked) pieces, wrapping. */
  step(delta: number): void {
    const i = this.unlocked.indexOf(this.selected);
    const n = this.unlocked.length;
    if (n > 0) this.selected = this.unlocked[(((i + delta) % n) + n) % n] ?? this.selected;
  }

  update(
    building: boolean,
    unlocked: readonly string[],
    cursor: Tile | null,
    facing: Facing,
    mirrored: boolean,
    canPlace: (pieceId: string, tx: number, ty: number, facing: Facing) => PlaceFail | null,
    shapeAt: (tile: Tile, facing: Facing) => { facing: Facing; inFrom: Facing },
    highlight: string | null = null,
  ): void {
    if (unlocked.join() !== this.unlocked.join()) this.rebuild(unlocked);
    if (!unlocked.includes(this.selected)) this.selected = unlocked[0] ?? FIRST_PIECE;
    this.setVisible(building);
    this.strip.update(building);
    const pointer = this.scene.input.activePointer;
    const at = toView(pointer.x, pointer.y, this.scene.cameras.main.zoom);
    const hovered = building ? buildBarCells(unlocked).find((c) => inRect(c, at.x, at.y)) : undefined;
    this.tipShown = hovered?.pieceId ?? null;
    this.showPulse(building ? buildBarCells(unlocked).find((c) => c.pieceId === highlight) : undefined);
    if (!building) return;
    const cell = buildBarCells(unlocked).find((c) => c.pieceId === this.selected);
    if (cell) this.highlight.setPosition(cell.x, cell.y);
    this.drawGhost(cursor, facing, mirrored, canPlace, shapeAt);
  }

  /** The ring over the named piece's cell, its alpha swinging gently; hidden when there's none. */
  private showPulse(cell: (ScreenRect & { pieceId: string }) | undefined): void {
    this.pulsing = cell?.pieceId ?? null;
    this.pulse.setVisible(cell !== undefined);
    if (cell) this.pulse.setPosition(cell.x - BUILD_PULSE.inset, cell.y - BUILD_PULSE.inset).setAlpha(this.wave.value);
  }

  private drawGhost(
    cursor: Tile | null,
    ghostFacing: Facing,
    mirrored: boolean,
    canPlace: (pieceId: string, tx: number, ty: number, facing: Facing) => PlaceFail | null,
    shapeAt: (tile: Tile, facing: Facing) => { facing: Facing; inFrom: Facing },
  ): void {
    const show = cursor !== null;
    this.ghost.setVisible(show);
    this.ghostIcon.setVisible(show);
    if (!cursor) {
      for (const a of this.ghostArrows) a.setVisible(false);
      return;
    }
    const pieceId = this.selected;
    const def = pieceDef(pieceId);
    // A conduit's ghost shows the shape it would take: a corner where it would join a side feeder,
    // or the held tile of a drag as it would be laid (013).
    const { facing, inFrom } = def.kind === 'conduit' ? shapeAt(cursor, ghostFacing) : { facing: ghostFacing, inFrom: ghostFacing };
    const r = pieceRect({ pieceId, tx: cursor.tx, ty: cursor.ty, facing });
    const bottom = r.y + r.h / 2;
    if (def.kind === 'splitter') {
      // 033: the splitter's ghost shows its side, which G flips.
      const look = splitterLook(facing, mirrored);
      showFrame(this.ghost, look.frame).setFlip(look.flipX, look.flipY);
    } else if (def.kind === 'tunnel-in' || def.kind === 'tunnel-out') {
      const look = tunnelLook(def.kind, facing);
      showFrame(this.ghost, look.frame).setFlip(look.flipX, false);
    } else {
      const flip = def.kind === 'conduit' ? conduitLook(facing, inFrom).flip : facing === 'left';
      showFrame(this.ghost, bodyFrame(pieceId, facing, inFrom)).setFlip(flip, false);
    }
    if (isFlatKind(def.kind)) this.ghost.setOrigin(0).setPosition(r.x - TILE_SIZE / 2, r.y - TILE_SIZE / 2);
    else this.ghost.setOrigin(0.5, 1).setPosition(r.x, bottom);
    const tint = colorOf(canPlace(pieceId, cursor.tx, cursor.ty, facing) ? GHOST.badTint : GHOST.okTint);
    this.ghost.setTint(tint);
    placeArrows(this.ghostArrows, { pieceId, tx: cursor.tx, ty: cursor.ty, facing, mirrored, ...(def.kind === 'conduit' ? { inFrom } : {}) });
    const machine = def.kind === 'machine';
    this.ghostIcon.setVisible(machine).setTint(tint);
    if (machine) {
      const rise = ICON_RISE[def.footprint][viewOf(facing)];
      this.ghostIcon.setFrame(pieceIcon(pieceId)).setPosition(r.x, bottom - rise);
    }
  }

  /** Redraws the bar for the unlocked pieces: their cells, each shown group's label, and the dividers between (026). */
  private rebuild(unlocked: readonly string[]): void {
    for (const c of this.cells) for (const o of c.images) o.destroy();
    for (const l of this.labels) l.line.destroy();
    this.unlocked = [...unlocked];
    const L = BUILD_BAR_LAYOUT;
    const fixed = (o: GameObjects.Image, depth: number): GameObjects.Image =>
      o.setOrigin(0).setScrollFactor(0).setDepth(depth).setVisible(this.visible);
    this.cells = buildBarCells(unlocked).map((c) => ({
      pieceId: c.pieceId,
      images: [
        fixed(addVector(this.scene, c.x, c.y, SPRITES.hudAmmoCell), DEPTHS.hud),
        fixed(addVector(this.scene, c.x + L.icon.x, c.y + L.icon.y, pieceIcon(c.pieceId)), DEPTHS.hud + 1),
      ],
    }));
    // Each group's label, centred over its cells.
    this.labels = buildBarGroups(unlocked).map((g) => {
      const line = new TextLine(this.scene, 0, g.y, DEPTHS.hud + 1, false, 'display').set(g.label).setVisible(this.visible);
      return { category: g.category, label: g.label, line: line.moveTo(Math.round(g.x + (g.w - line.width) / 2), g.y) };
    });
    const D = L.divider;
    this.dividers.clear().fillStyle(colorOf(D.color), D.alpha);
    for (const d of buildBarDividers(unlocked)) this.dividers.fillRect(d.x - D.width / 2, d.y, D.width, d.h);
  }

  /** Pieces were just placed (052): placing one end of the underground pair selects the other next, as Factorio's do. */
  placed(pieceIds: readonly string[]): void {
    const next = this.selected === TUNNEL_PIECES.in ? TUNNEL_PIECES.out : this.selected === TUNNEL_PIECES.out ? TUNNEL_PIECES.in : null;
    if (next && pieceIds.includes(this.selected) && this.unlocked.includes(next)) this.selected = next;
  }

  /** Clicking a cell selects its piece. Returns whether the click landed on the bar (its labels and gaps too). */
  click(x: number, y: number): boolean {
    if (!this.overUi(x, y)) return false;
    const cell = buildBarCells(this.unlocked).find((c) => inRect(c, x, y));
    if (cell) this.selected = cell.pieceId;
    return true;
  }

  private setVisible(visible: boolean): void {
    this.visible = visible;
    this.highlight.setVisible(visible);
    if (!visible) {
      this.pulse.setVisible(false);
      this.ghost.setVisible(false);
      this.ghostIcon.setVisible(false);
      for (const a of this.ghostArrows) a.setVisible(false);
    }
    for (const c of this.cells) for (const o of c.images) o.setVisible(visible);
    for (const l of this.labels) l.line.setVisible(visible);
    this.dividers.setVisible(visible);
  }
}
