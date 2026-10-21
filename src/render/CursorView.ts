import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, SPRITES } from '../data/assets';
import { toView } from './scale';
import { addVector } from './vector/textures';

/** Which cursor shows, and where it draws (for the test hook). */
export interface CursorState {
  kind: 'pointer' | 'crosshair';
  depth: number;
  /** The highest depth of anything else in the scene: the cursor draws above it. */
  topOtherDepth: number;
}

// The mouse cursor (021): the crosshair over the world, and an arrow pointer while
// a menu is open or the mouse is over the build bar. Both draw on DEPTHS.cursor,
// above every menu and HUD layer. The OS cursor stays hidden. Fixed to the screen.
// 050 (A.5): the flow scene, drawn over the game, has its own (`hideOs` false), shown
// over its screens (the end card) while the game has hidden the OS cursor.
export class CursorView {
  private readonly scene: Scene;
  private readonly crosshair: GameObjects.Image;
  private readonly pointer: GameObjects.Image;

  constructor(scene: Scene, hideOs = true) {
    this.scene = scene;
    if (hideOs) scene.input.setDefaultCursor('none');
    const fixed = (o: GameObjects.Image) => o.setScrollFactor(0).setDepth(DEPTHS.cursor);
    this.crosshair = fixed(addVector(scene, 0, 0, SPRITES.crosshair));
    this.pointer = fixed(addVector(scene, 0, 0, SPRITES.pointer)).setVisible(false);
  }

  /** Follows the mouse; `pointer` shows the arrow (a menu is open, or the mouse is over clickable HUD), else the crosshair; `shown` false hides both. */
  update(pointer: boolean, shown = true): void {
    const p = this.scene.input.activePointer;
    const at = toView(p.x, p.y, this.scene.cameras.main.zoom);
    this.crosshair.setPosition(at.x, at.y).setVisible(shown && !pointer);
    this.pointer.setPosition(at.x, at.y).setVisible(shown && pointer);
  }

  /** Whether either shows. */
  get visible(): boolean {
    return this.crosshair.visible || this.pointer.visible;
  }

  get state(): CursorState {
    const mine = new Set<unknown>([this.crosshair, this.pointer]);
    let top = -Infinity;
    for (const o of this.scene.children.list) {
      if (mine.has(o)) continue;
      const depth = (o as Partial<GameObjects.Components.Depth>).depth;
      if (typeof depth === 'number') top = Math.max(top, depth);
    }
    return { kind: this.pointer.visible ? 'pointer' : 'crosshair', depth: this.pointer.visible ? this.pointer.depth : this.crosshair.depth, topOtherDepth: top };
  }
}
