import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, MADE_POPUP } from '../data/assets';
import { TILE_SIZE } from '../data/config';
import { itemDef } from '../data/items';
import { OBJECTIVES } from '../data/objectives';
import { FOUNDRY_ROOM } from '../data/rooms';
import type { SimEvents } from '../sim/events';
import { pieceRect, type FoundryState } from '../sim/pieces';
import { phaserStyle } from './fonts';
import { textureScale } from './vector/textures';

// The foundry tutorial's "+ shaft" (027): when a step that waits on a machine
// making something completes, the item's name pops above the machine that made
// it, rises and fades. A step completes once, so each pops once (and not at all
// if the player is away from the foundry when it does).
export class MadePopups {
  private readonly scene: Scene;
  private readonly live = new Set<GameObjects.Text>();

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /** The popups still on screen, by text, for the test hook. */
  get shown(): string[] {
    return [...this.live].map((t) => t.text);
  }

  /** Pops for every machine step completed since the last draw, while the foundry is on screen. `topOf` is a drawn piece's top, world px. */
  play(events: SimEvents, foundry: FoundryState, shown: string, topOf: (id: number) => number | undefined): void {
    if (shown !== FOUNDRY_ROOM) return;
    for (const { index } of events.objectives) {
      const check = OBJECTIVES[index]?.check;
      if (check?.kind !== 'machineMade') continue;
      const made = events.made.find((m) => m.itemId === check.item);
      const piece = made && foundry.pieces.find((p) => p.id === made.id);
      if (!piece) continue;
      const r = pieceRect(piece);
      const top = topOf(piece.id) ?? r.y - TILE_SIZE;
      this.pop(`${MADE_POPUP.prefix}${itemDef(check.item).name.toLowerCase()}`, r.x, top - MADE_POPUP.above);
    }
  }

  private pop(text: string, x: number, bottom: number): void {
    const label = this.scene.add
      .text(Math.round(x), Math.round(bottom), text, phaserStyle('float', textureScale()))
      .setOrigin(0.5, 1)
      .setDepth(DEPTHS.worldUi);
    this.live.add(label);
    this.scene.tweens.add({
      targets: label,
      y: label.y - MADE_POPUP.rise,
      alpha: 0,
      duration: MADE_POPUP.durationMs,
      ease: 'Quad.In',
      onComplete: () => {
        this.live.delete(label);
        label.destroy();
      },
    });
  }
}
