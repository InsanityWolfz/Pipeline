import type { GameObjects, Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { TILE_SIZE, VIEW_WIDTH } from '../data/config';
import { FACING_ARROWS } from '../data/foundryAssets';
import { GUIDED_TEXT, type Ghost } from '../data/guidedBuilds';
import { GUIDED_LOOK } from '../data/hudLayout';
import { isFlatKind, pieceDef } from '../data/pieces';
import { FOUNDRY_ROOM } from '../data/rooms';
import type { SimEvents } from '../sim/events';
import { opposite } from '../sim/direction';
import { ghostsLeft } from '../sim/guided';
import { pieceRect, type PlaceFail } from '../sim/pieces';
import type { SimState } from '../sim/state';
import { buildBarLabelTop } from './bottomHud';
import { bodyFrame } from './BuildView';
import { colorOf } from './color';
import { conduitLook } from './foundryLayout';
import { tunnelLook } from './flatPieces';
import { MAX_ARROWS, placeArrows } from './FoundryView';
import { TextLine } from './textLine';
import { addVector, showFrame } from './vector/textures';

/** The guided build as drawn (058), for `ui().guided`: the ghosts still to build (the next first), the remove label and a refusal's hint. */
export interface GuidedShown {
  ghosts: { kind: Ghost['kind']; pieceId: string; tx: number; ty: number; next: boolean }[];
  remove: { tx: number; ty: number; text: string } | null;
  hint: string | null;
}

export const NO_GUIDED: GuidedShown = { ghosts: [], remove: null, hint: null };

/** A refused placement or pick-up's hint (058.3): on the outline during a guided step, "Not yet" otherwise. */
const hintFor = (reason: PlaceFail): string | null => (reason === 'ghost' ? GUIDED_TEXT.ghost : reason === 'tutorial' ? GUIDED_TEXT.locked : null);

// The guided builds in the foundry (058): each piece still to build is a glowing outline on its tile, the next one
// brighter with its piece drawn faintly, facing the way it must; a piece to remove gets "Right click to remove" beside
// it. A placement the build lock refuses shows a short hint over the build bar for a moment.
export class GuidedView {
  private readonly scene: Scene;
  private readonly lines: GameObjects.Graphics;
  private readonly body: GameObjects.Image;
  private readonly arrows: GameObjects.Image[];
  private readonly removeLabel: TextLine;
  private readonly hint: TextLine;
  private hintMs = 0;
  shown: GuidedShown = NO_GUIDED;

  constructor(scene: Scene) {
    this.scene = scene;
    this.lines = scene.add.graphics().setDepth(DEPTHS.worldUi - 2);
    this.body = addVector(scene, 0, 0, bodyFrame('conduit', 'right', 'left')).setAlpha(GUIDED_LOOK.bodyAlpha).setDepth(DEPTHS.worldUi - 2).setVisible(false);
    this.arrows = Array.from({ length: MAX_ARROWS }, () => addVector(scene, 0, 0, FACING_ARROWS.out.down).setDepth(DEPTHS.worldUi - 1).setVisible(false));
    this.removeLabel = new TextLine(scene, 0, 0, DEPTHS.prompt, true, 'label').set(GUIDED_TEXT.remove).setVisible(false);
    this.hint = new TextLine(scene, 0, 0, DEPTHS.hud + 3, false, 'body').setVisible(false);
  }

  update(sim: SimState, roomShown: string, events: SimEvents): void {
    const fail = [...events.placeFails, ...events.pickUpFails].map((f) => hintFor(f.reason)).find((t) => t !== null);
    if (fail) {
      this.hint.set(fail).moveTo(Math.round((VIEW_WIDTH - this.hint.width) / 2), buildBarLabelTop() - GUIDED_LOOK.hintRise - this.hint.lineHeight);
      this.hintMs = GUIDED_LOOK.hintMs;
    } else this.hintMs = Math.max(0, this.hintMs - this.scene.game.loop.delta);
    const hint = this.hintMs > 0 ? this.hint.obj.text : null;
    this.hint.setVisible(hint !== null);
    const ghosts = roomShown === FOUNDRY_ROOM && sim.roomId === FOUNDRY_ROOM ? ghostsLeft(sim) : [];
    this.draw(ghosts);
    const first = ghosts[0];
    const remove = first?.kind === 'remove' ? { tx: first.tx, ty: first.ty, text: GUIDED_TEXT.remove } : null;
    this.removeLabel.setVisible(remove !== null);
    if (remove) this.removeLabel.moveTo((remove.tx + 1) * TILE_SIZE + GUIDED_LOOK.inset, (remove.ty + 0.5) * TILE_SIZE - GUIDED_LOOK.removeLabelRise);
    this.shown = { ghosts: ghosts.map((g, i) => ({ kind: g.kind, pieceId: g.piece, tx: g.tx, ty: g.ty, next: i === 0 })), remove, hint };
  }

  /** The outlines, and the next ghost's faint piece and arrows. */
  private draw(ghosts: readonly Ghost[]): void {
    const L = GUIDED_LOOK;
    this.lines.clear();
    [...ghosts].reverse().forEach((g, k) => {
      const next = k === ghosts.length - 1;
      const look = next ? L.next : L.outline;
      const r = pieceRect({ pieceId: g.piece, tx: g.tx, ty: g.ty, facing: g.kind === 'place' ? g.facing : 'up' });
      this.lines.lineStyle(look.width, colorOf(look.color), look.alpha).strokeRect(r.x - r.w / 2 + L.inset, r.y - r.h / 2 + L.inset, r.w - 2 * L.inset, r.h - 2 * L.inset);
    });
    const g = ghosts[0];
    const place = g?.kind === 'place' ? g : null;
    this.body.setVisible(place !== null);
    if (!place) {
      for (const a of this.arrows) a.setVisible(false);
      return;
    }
    const def = pieceDef(place.piece);
    // A conduit's ghost shows its corner (its `in` side); anything else just its facing.
    const inFrom = def.kind === 'conduit' ? (place.inFrom ?? opposite(place.facing)) : place.facing;
    if (def.kind === 'tunnel-in' || def.kind === 'tunnel-out') {
      const look = tunnelLook(def.kind, place.facing);
      showFrame(this.body, look.frame).setFlip(look.flipX, false);
    } else {
      const flip = def.kind === 'conduit' ? conduitLook(place.facing, inFrom).flip : place.facing === 'left';
      showFrame(this.body, bodyFrame(place.piece, place.facing, inFrom)).setFlip(flip, false);
    }
    const r = pieceRect({ pieceId: place.piece, tx: place.tx, ty: place.ty, facing: place.facing });
    if (isFlatKind(def.kind)) this.body.setOrigin(0).setPosition(r.x - TILE_SIZE / 2, r.y - TILE_SIZE / 2);
    else this.body.setOrigin(0.5, 1).setPosition(r.x, r.y + r.h / 2);
    placeArrows(this.arrows, { pieceId: place.piece, tx: place.tx, ty: place.ty, facing: place.facing, ...(def.kind === 'conduit' ? { inFrom } : {}) });
  }
}
