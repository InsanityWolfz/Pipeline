import type { Cameras, Input, Scene } from 'phaser';
import { TILE_SIZE } from '../data/config';
import { BUILD_BAR } from '../data/pieces';
import type { Tile } from '../sim/pieces';
import type { Facing } from '../sim/player';
import type { ConduitLay } from './dragPath';
import { BuildDrag } from './buildDrag';
import { clickMods, heldButtons, isLeftPress, type BuildInput } from './clickInput';
import { toView } from './scale';
import type { BlueprintInput } from './blueprintInput';

/** The build ghost's turn and flip, read when a press starts a place (they live on Controls). */
export interface GhostPose {
  facing: Facing;
  mirrored: boolean;
}

// The mouse for Controls (split out of controls.ts): the aim under the cursor, presses that land on the UI, and build
// mode's clicks and conduit drags (queued in BuildDrag). Wheel notches stay with Controls' other latched presses.
export class PointerInput {
  private readonly pointer: Input.Pointer;
  private readonly camera: Cameras.Scene2D.Camera;
  /** Build mode's mouse: places, pick-ups and conduit drags (src/render/buildDrag.ts). */
  readonly drag = new BuildDrag();
  build: BuildInput = {
    building: false,
    pieceId: () => BUILD_BAR[0] ?? '',
    overUi: () => false,
    clickUi: () => undefined,
  };
  private aimX = 0;
  private aimY = 0;
  /** A press that began over a menu or the HUD: fire stays off until the button comes up (015). */
  uiPress = false;
  /** That press was a left one (047: only a left press's release reaches the UI). */
  private leftUiPress = false;

  /** Read live: Controls turns and flips it with R and G. */
  private readonly ghost: GhostPose;
  /** 063: the Area tool and the blueprint ghost. */
  private readonly tools: BlueprintInput;

  constructor(scene: Scene, ghost: GhostPose, tools: BlueprintInput) {
    this.ghost = ghost;
    this.tools = tools;
    this.pointer = scene.input.activePointer;
    this.camera = scene.cameras.main;
    scene.input.mouse?.disableContextMenu();
    scene.input.on('pointerdown', (p: Input.Pointer) => this.pointerDown(p));
    scene.input.on('pointermove', (p: Input.Pointer) => this.pointerMove(p));
    scene.input.on('pointerup', (p: Input.Pointer) => this.release(p));
    scene.input.on('pointerupoutside', (p: Input.Pointer) => this.release(p));
  }

  /** Call once per frame before taking commands. */
  poll(build: BuildInput): void {
    this.build = build;
    if (!build.building) {
      this.drag.reset();
      if (this.tools.mode !== 'piece') this.tools.setPiece();
    }
    // The camera moves every frame, so the cursor's world point does too.
    const world = this.camera.getWorldPoint(this.pointer.x, this.pointer.y);
    this.aimX = world.x;
    this.aimY = world.y;
  }

  /** The world point under the cursor. */
  cursorPoint(): { x: number; y: number } {
    return { x: this.aimX, y: this.aimY };
  }

  /** The world tile under the cursor. */
  cursorTile(): Tile {
    return { tx: Math.floor(this.aimX / TILE_SIZE), ty: Math.floor(this.aimY / TILE_SIZE) };
  }

  /** A pointer's position in view px (the HUD's 640×360 layout), whatever the backbuffer resolution (016). */
  private view(p: { x: number; y: number }): { x: number; y: number } {
    return toView(p.x, p.y, this.camera.zoom);
  }

  /** The cursor in view px (020: for menu rows lighting under it). */
  viewPointer(): { x: number; y: number } {
    return this.view(this.pointer);
  }

  /** The cursor is over the world, not the screen's UI. */
  overWorld(): boolean {
    const v = this.view(this.pointer);
    return !this.build.overUi(v.x, v.y);
  }

  /** The mouse buttons held now (047: a Mac's Ctrl+left-click is a left click, never the carried item). */
  held(): { left: boolean; right: boolean } {
    return heldButtons(this.pointer.event as MouseEvent | undefined, this.pointer.leftButtonDown(), this.pointer.rightButtonDown());
  }

  private tileUnder(p: Input.Pointer): Tile {
    const world = this.camera.getWorldPoint(p.x, p.y);
    return { tx: Math.floor(world.x / TILE_SIZE), ty: Math.floor(world.y / TILE_SIZE) };
  }

  private release(p?: Input.Pointer): void {
    // 047: a press that began on the UI ends there too: the grid's click, or a stack dropped on the carried bar.
    if (this.uiPress && p && this.leftUiPress) {
      const v = this.view(p);
      this.build.releaseUi?.(v.x, v.y);
    }
    this.uiPress = false;
    this.leftUiPress = false;
    this.endDrag();
    this.tools.release();
  }

  private pointerDown(p: Input.Pointer): void {
    const v = this.view(p);
    const mods = clickMods(p.event);
    // Ctrl+click is a game input (022: all of a hopper stack), never a browser shortcut.
    if (mods.ctrl) p.event.preventDefault();
    if (this.build.overUi(v.x, v.y)) {
      this.uiPress = true;
      // On macOS Phaser calls Ctrl+left-click a right click; the DOM event knows better.
      if (isLeftPress(p.event, p.leftButtonDown())) {
        this.leftUiPress = true;
        this.build.clickUi(v.x, v.y, mods);
      }
      return;
    }
    if (!this.build.building) return;
    const tile = this.tileUnder(p);
    if (this.toolPress(p, tile)) return;
    if (p.rightButtonDown()) this.drag.pickUp(tile);
    else if (p.leftButtonDown()) this.drag.press(tile, this.build.pieceId(), this.ghost.facing, this.ghost.mirrored);
  }

  /**
   * 063: a press with a tool: right click backs out (the menu, the drag, the tool); with the Area tool a left press
   * starts a box, with the ghost it stamps. Returns whether a tool took it (else it places or picks up a piece).
   */
  private toolPress(p: Input.Pointer, tile: Tile): boolean {
    const t = this.tools;
    if (t.mode === 'piece' && !t.released && !t.question) return false;
    if (p.rightButtonDown()) t.back();
    else if (p.leftButtonDown() && t.mode === 'area') t.press(tile);
    else if (p.leftButtonDown() && t.mode === 'ghost') this.stampPress?.(tile);
    return true;
  }

  /** 063: a left press with the blueprint ghost held, on the tile under the cursor (Controls queues the stamp). */
  stampPress: ((tile: Tile) => void) | null = null;

  /** Release (inside the canvas or out): the held conduit is laid. */
  private endDrag(): void {
    this.drag.end(this.build.pieceId(), this.ghost.facing);
  }

  /** The conduit a drag is holding back, as it would be laid now; the ghost draws it. */
  heldLay(): ConduitLay | null {
    return this.drag.heldLay(this.ghost.facing);
  }

  /** Dragging with a conduit selected lays one on every tile the cursor crosses, however fast it moves. */
  private pointerMove(p: Input.Pointer): void {
    // 063: the Area tool's box follows the cursor.
    if (this.tools.drag && p.leftButtonDown()) this.tools.move(this.tileUnder(p));
    if (!this.drag.dragging || !this.build.building || !p.leftButtonDown()) return;
    const v = this.view(p);
    if (this.build.overUi(v.x, v.y)) return;
    this.drag.move(this.tileUnder(p), this.build.pieceId());
  }
}
