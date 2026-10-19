import type { GameObjects, Scene } from 'phaser';
import { animFrames, DEPTHS, SPRITES } from '../data/assets';
import { TILE_SIZE, VIEW_WIDTH } from '../data/config';
import {
  CRATE_SPRITE,
  FACING_ARROWS,
  ICON_RISE,
  HOPPER_SPRITES,
  machineLook,
} from '../data/foundryAssets';
import { BUILD_BAR_LAYOUT, GHOST } from '../data/hudLayout';
import { BUILD_BAR, pieceDef } from '../data/pieces';
import { pieceRect, type PlaceFail, type Tile } from '../sim/pieces';
import type { Facing } from '../sim/player';
import { colorOf } from './color';
import { buildBarLabelTop } from './bottomHud';
import { buildBarBox, buildBarCells, buildBarDividers, buildBarGroups, conduitLook, inRect, pieceIcon, sorterLook, type ScreenRect } from './foundryLayout';
import { BuildTip } from './BuildTip';
import { MAX_ARROWS, placeArrows, viewOf } from './FoundryView';
import { toView } from './scale';
import { TextLine } from './textLine';
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
  cells: (ScreenRect & { pieceId: string; locked: boolean })[];
  /** Each group's label as drawn: its text box (x, y the top of its capitals) and the group it heads. */
  groups: (ScreenRect & { category: string; label: string })[];
  dividers: { x: number; y: number; h: number }[];
}

// Build mode on screen: the bar of every piece in its groups (026), each group
// labelled with a thin divider between, locked pieces greyed in their place and
// the selected one highlighted; and a ghost of it on the tile under the cursor,
// tinted by whether it can go there.
export class BuildView {
  private readonly scene: Scene;
  private readonly cells: { pieceId: string; images: GameObjects.Image[] }[];
  /** Each group's label with the group it heads. */
  private readonly labels: { category: string; label: string; line: TextLine }[];
  private readonly dividers: GameObjects.Graphics;
  private readonly highlight: GameObjects.Image;
  private readonly ghost: GameObjects.Image;
  private readonly ghostIcon: GameObjects.Image;
  private readonly ghostArrows: GameObjects.Image[];
  private unlocked: readonly string[] = [];
  private visible = false;
  readonly tip: BuildTip;
  selected = FIRST_PIECE;

  constructor(scene: Scene) {
    this.scene = scene;
    this.highlight = addVector(scene, 0, 0, SPRITES.hudAmmoSelect)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(DEPTHS.hud + 2);
    this.ghost = addVector(scene, 0, 0, bodyFrame(FIRST_PIECE, 'right', 'left')).setAlpha(GHOST.alpha);
    this.ghostIcon = addVector(scene, 0, 0, pieceIcon(FIRST_PIECE)).setAlpha(GHOST.alpha);
    this.ghostArrows = Array.from({ length: MAX_ARROWS }, () => addVector(scene, 0, 0, FACING_ARROWS.out.down));
    for (const o of [this.ghost, this.ghostIcon, ...this.ghostArrows]) o.setDepth(DEPTHS.worldUi - 1);
    this.tip = new BuildTip(scene);
    const L = BUILD_BAR_LAYOUT;
    const fixed = (o: GameObjects.Image, depth: number): GameObjects.Image => o.setOrigin(0).setScrollFactor(0).setDepth(depth);
    this.cells = buildBarCells().map((c) => ({
      pieceId: c.pieceId,
      images: [
        fixed(addVector(scene, c.x, c.y, SPRITES.hudAmmoCell), DEPTHS.hud),
        fixed(addVector(scene, c.x + L.icon.x, c.y + L.icon.y, pieceIcon(c.pieceId)), DEPTHS.hud + 1),
      ],
    }));
    // Each group's label, centred over its cells.
    this.labels = buildBarGroups().map((g) => {
      const line = new TextLine(scene, 0, g.y, DEPTHS.hud + 1, false, 'display').set(g.label);
      return { category: g.category, label: g.label, line: line.moveTo(Math.round(g.x + (g.w - line.width) / 2), g.y) };
    });
    this.dividers = scene.add.graphics().setScrollFactor(0).setDepth(DEPTHS.hud);
    const D = L.divider;
    this.dividers.fillStyle(colorOf(D.color), D.alpha);
    for (const d of buildBarDividers()) this.dividers.fillRect(d.x - D.width / 2, d.y, D.width, d.h);
    this.setVisible(false);
  }

  /** True if a screen point is over the bar or its labels, so a click there isn't a place in the world. */
  overUi(x: number, y: number): boolean {
    return this.visible && inRect(buildBarBox(), x, y);
  }

  /** What the bar shows, for the test hook (026). */
  get state(): BuildBarState {
    return {
      shown: this.visible,
      selected: this.selected,
      cells: buildBarCells().map((c) => ({ ...c, locked: !this.unlocked.includes(c.pieceId) })),
      groups: this.labels.map(({ category, label, line }) => ({ category, label, ...line.at, w: line.width, h: line.lineHeight })),
      dividers: buildBarDividers(),
    };
  }

  /** Moves the selection along the bar, wrapping. */
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
  ): void {
    if (unlocked.join() !== this.unlocked.join()) this.restyle(unlocked);
    if (!unlocked.includes(this.selected)) this.selected = unlocked[0] ?? FIRST_PIECE;
    this.setVisible(building);
    const pointer = this.scene.input.activePointer;
    const at = toView(pointer.x, pointer.y, this.scene.cameras.main.zoom);
    const hovered = building ? buildBarCells().find((c) => inRect(c, at.x, at.y)) : undefined;
    // The tip sits over the group labels, so it never hides them (026).
    this.tip.show(hovered?.pieceId ?? null, (hovered?.x ?? 0) + (hovered?.w ?? 0) / 2, buildBarLabelTop(), VIEW_WIDTH);
    if (!building) return;
    const cell = buildBarCells().find((c) => c.pieceId === this.selected);
    if (cell) this.highlight.setPosition(cell.x, cell.y);
    this.drawGhost(cursor, facing, mirrored, canPlace, shapeAt);
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
    if (def.kind === 'sorter') {
      // A sorter's ghost shows which side its item will leave by; F flips it (015).
      const look = sorterLook(facing, mirrored);
      showFrame(this.ghost, animFrames(look.anim)[0] ?? '').setFlip(look.flipX, look.flipY);
    } else {
      const flip = def.kind === 'conduit' ? conduitLook(facing, inFrom).flip : facing === 'left';
      showFrame(this.ghost, bodyFrame(pieceId, facing, inFrom)).setFlip(flip, false);
    }
    if (def.kind === 'conduit' || def.kind === 'sorter') this.ghost.setOrigin(0).setPosition(r.x - TILE_SIZE / 2, r.y - TILE_SIZE / 2);
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

  /** Greys the pieces not yet unlocked, in their places (026). */
  private restyle(unlocked: readonly string[]): void {
    this.unlocked = [...unlocked];
    for (const c of this.cells) {
      const alpha = unlocked.includes(c.pieceId) ? 1 : BUILD_BAR_LAYOUT.lockedAlpha;
      for (const o of c.images) o.setAlpha(alpha);
    }
  }

  /** Clicking an unlocked piece's cell selects it; a locked one stays unselectable. Returns whether the click landed on the bar. */
  click(x: number, y: number): boolean {
    if (!this.overUi(x, y)) return false;
    const cell = buildBarCells().find((c) => inRect(c, x, y));
    if (cell && this.unlocked.includes(cell.pieceId)) this.selected = cell.pieceId;
    return true;
  }

  private setVisible(visible: boolean): void {
    this.visible = visible;
    this.highlight.setVisible(visible);
    if (!visible) {
      this.ghost.setVisible(false);
      this.ghostIcon.setVisible(false);
      for (const a of this.ghostArrows) a.setVisible(false);
    }
    for (const c of this.cells) for (const o of c.images) o.setVisible(visible);
    for (const l of this.labels) l.line.setVisible(visible);
    this.dividers.setVisible(visible);
  }
}
