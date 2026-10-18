import type { GameObjects, Scene } from 'phaser';
import { animFrames, DEPTHS, SPRITES } from '../data/assets';
import { TILE_SIZE, VIEW_WIDTH } from '../data/config';
import {
  CRATE_SPRITE,
  STAGER_SPRITE,
  FACING_ARROWS,
  ICON_RISE,
  HOPPER_SPRITES,
  machineLook,
} from '../data/foundryAssets';
import { STAGER_ANGLES, STAGER_START_ANGLE } from '../data/foundry';
import { BUILD_BAR_LAYOUT, GHOST } from '../data/hudLayout';
import { BUILD_BAR, pieceDef } from '../data/pieces';
import { pieceRect, type PlaceFail, type Tile } from '../sim/pieces';
import type { Facing } from '../sim/player';
import { colorOf } from './color';
import { buildBarCells, conduitLook, inRect, pieceIcon, sorterLook } from './foundryLayout';
import { BuildTip } from './BuildTip';
import { MAX_ARROWS, placeArrows, viewOf } from './FoundryView';
import { toView } from './scale';
import { addVector, showFrame } from './vector/textures';

const FIRST_PIECE = BUILD_BAR[0] ?? '';

/** The resting frame of a piece's body as placed with `facing`. */
function bodyFrame(pieceId: string, facing: Facing, inFrom: Facing): string {
  const def = pieceDef(pieceId);
  const view = viewOf(facing);
  if (def.kind === 'machine') return machineLook(def.id, view).idle;
  if (def.kind === 'conduit') return animFrames(conduitLook(facing, inFrom).anim)[0] ?? '';
  if (def.kind === 'stager') return animFrames(STAGER_SPRITE)[STAGER_ANGLES.indexOf(STAGER_START_ANGLE)] ?? '';
  return def.kind === 'hopper' ? HOPPER_SPRITES[view] : CRATE_SPRITE;
}

// Build mode on screen: the bar of unlocked pieces with the selected one
// highlighted, and a ghost of it on the tile under the cursor, tinted by whether
// it can go there. Picking a cell goes through `onPick`.
export class BuildView {
  private readonly scene: Scene;
  private cells: { pieceId: string; images: GameObjects.Image[] }[] = [];
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
    this.setVisible(false);
  }

  /** True if a screen point is over the bar, so a click there isn't a place in the world. */
  overUi(x: number, y: number): boolean {
    return this.visible && buildBarCells(this.unlocked).some((c) => inRect(c, x, y));
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
    if (unlocked.join() !== this.unlocked.join()) this.rebuild(unlocked);
    if (!unlocked.includes(this.selected)) this.selected = unlocked[0] ?? FIRST_PIECE;
    this.setVisible(building);
    const pointer = this.scene.input.activePointer;
    const at = toView(pointer.x, pointer.y, this.scene.cameras.main.zoom);
    const hovered = building ? buildBarCells(unlocked).find((c) => inRect(c, at.x, at.y)) : undefined;
    this.tip.show(hovered?.pieceId ?? null, (hovered?.x ?? 0) + (hovered?.w ?? 0) / 2, hovered?.y ?? 0, VIEW_WIDTH);
    if (!building) return;
    const cell = buildBarCells(unlocked).find((c) => c.pieceId === this.selected);
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

  private rebuild(unlocked: readonly string[]): void {
    for (const c of this.cells) for (const o of c.images) o.destroy();
    this.unlocked = [...unlocked];
    const L = BUILD_BAR_LAYOUT;
    this.cells = buildBarCells(unlocked).map((c) => {
      const fixed = (o: GameObjects.Image, depth: number): GameObjects.Image =>
        o.setOrigin(0).setScrollFactor(0).setDepth(depth).setVisible(this.visible);
      const frame = fixed(addVector(this.scene, c.x, c.y, SPRITES.hudAmmoCell), DEPTHS.hud);
      const icon = addVector(this.scene, c.x + L.icon.x, c.y + L.icon.y, pieceIcon(c.pieceId));
      fixed(icon, DEPTHS.hud + 1);
      return { pieceId: c.pieceId, images: [frame, icon] };
    });
  }

  /** Clicking a cell selects its piece. Returns whether the click landed on one. */
  click(x: number, y: number): boolean {
    if (!this.visible) return false;
    const cell = buildBarCells(this.unlocked).find((c) => inRect(c, x, y));
    if (cell) this.selected = cell.pieceId;
    return cell !== undefined;
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
  }
}
