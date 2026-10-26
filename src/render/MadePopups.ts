import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, MADE_POPUP } from '../data/assets';
import { TILE_SIZE } from '../data/config';
import { FOUNDRY_ROOM } from '../data/rooms';
import type { SimEvents } from '../sim/events';
import { pieceRect, type FoundryState } from '../sim/pieces';
import { phaserStyle } from './fonts';
import { madeText, mergeInto, stackedTop, type PopupBox } from './popupStack';
import { textureScale } from './vector/textures';

/** A popup on screen: its text, the machine and item it's for, when it started (scene ms) and how many it counts. */
interface LivePopup {
  label: GameObjects.Text;
  /** The width it keeps clear for itself: its text with the widest count a merge could give it. */
  room: number;
  pieceId: number;
  itemId: string;
  bornMs: number;
  count: number;
}

/** A live popup as drawn, for `ui().madePopups`: its text and its box in view px. */
export interface MadePopupShown extends PopupBox {
  text: string;
}

// The "+ shaft" popups (027): the first time machines ever make an item, its name pops
// above the machine that made it, rises and fades (046: no longer tied to 027's build
// steps; 067: the first guided arrow line's first run shows +shaft, +arrowhead, +rope and +arrow).
// Each item pops once (and not at all if the player is away from the foundry then).
// 031: a popup that would overlap a live one starts just above it, and they rise
// together; the same machine and item twice in a short window merge into one with a count.
export class MadePopups {
  private readonly scene: Scene;
  private readonly live: LivePopup[] = [];

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /** The popups still on screen, by text and screen box, for the test hook. */
  get shown(): MadePopupShown[] {
    const view = this.scene.cameras.main.worldView;
    return this.live.map((p) => {
      const b = boxOf(p.label);
      return { text: p.label.text, x: b.x - view.x, y: b.y - view.y, w: b.w, h: b.h };
    });
  }

  /** Pops for every item machines made for the first time ever since the last draw (046), while the foundry is on screen. `topOf` is a drawn piece's top, world px. */
  play(events: SimEvents, foundry: FoundryState, shown: string, topOf: (id: number) => number | undefined): void {
    if (shown !== FOUNDRY_ROOM) return;
    for (const made of events.firstMade) {
      const piece = foundry.pieces.find((p) => p.id === made.id);
      if (!piece) continue;
      const r = pieceRect(piece);
      const top = topOf(piece.id) ?? r.y - TILE_SIZE;
      this.pop(piece.id, made.itemId, r.x, top - MADE_POPUP.above);
    }
  }

  private pop(pieceId: number, itemId: string, x: number, bottom: number): void {
    const now = this.scene.time.now;
    const merged = mergeInto(this.live, pieceId, itemId, now);
    if (merged) {
      merged.count += 1;
      merged.label.setText(madeText(itemId, merged.count));
      return;
    }
    const label = this.scene.add
      .text(Math.round(x), Math.round(bottom), madeText(itemId, 1), phaserStyle('float', textureScale()))
      .setOrigin(0.5, 1)
      .setDepth(DEPTHS.worldUi);
    // Clear of every live popup: just above any it would cover.
    const room = label.setText(madeText(itemId, MADE_POPUP.reserveCount)).displayWidth;
    label.setText(madeText(itemId, 1));
    const box = boxOf(label, room);
    const top = stackedTop(box, this.live.map((p) => boxOf(p.label, p.room)), MADE_POPUP.stackGap);
    label.setY(label.y + top - box.y);
    const popup: LivePopup = { label, room, pieceId, itemId, bornMs: now, count: 1 };
    this.live.push(popup);
    // A steady rise, so popups stacked a moment apart keep their gap; only the fade eases.
    this.scene.tweens.add({ targets: label, y: label.y - MADE_POPUP.rise, duration: MADE_POPUP.durationMs, ease: 'Linear' });
    this.scene.tweens.add({
      targets: label,
      alpha: 0,
      duration: MADE_POPUP.durationMs,
      ease: 'Quad.In',
      onComplete: () => {
        this.live.splice(this.live.indexOf(popup), 1);
        label.destroy();
      },
    });
  }
}

/** A popup's box in world px (its origin is its bottom centre), `w` wide: its text's width unless given. */
function boxOf(label: GameObjects.Text, w: number = label.displayWidth): PopupBox {
  const h = label.displayHeight;
  return { x: label.x - w / 2, y: label.y - h, w, h };
}
