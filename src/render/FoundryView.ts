import type { GameObjects, Scene } from 'phaser';
import { animFrames, DEPTHS } from '../data/assets';
import { TILE_SIZE } from '../data/config';
import { CONDUIT_TICKS } from '../data/foundry';
import {
  CONDUIT_ANIMS,
  CONDUIT_CORNERS,
  CRATE_SPRITE,
  FACING_ARROWS,
  FOUNDRY_LAYOUT,
  ICON_RISE,
  HOPPER_SPRITES,
  JAM_SHAKE,
  MACHINE_SPRITES,
  machineLook,
  STATUS_MARKERS,
  type PieceView,
} from '../data/foundryAssets';
import { itemDef } from '../data/items';
import { isFlatKind, pieceDef } from '../data/pieces';
import { facingVector } from '../sim/direction';
import { pieceRect, type FoundryState, type PieceState } from '../sim/pieces';
import type { Facing } from '../sim/player';
import { SQUASH } from '../data/juice';
import { registerAnim } from './anims';
import { arrowSpots, conduitLook, pieceIcon } from './foundryLayout';
import { TextLine } from './textLine';
import { addVector, addVectorSprite, textureScale } from './vector/textures';
import type { Occluders } from './occluders';
import type { WorldLayer } from './lighting/WorldLayer';
import type { RunningForges } from './foundry/runningForges';
import { riderAt, splitterLook, tunnelLook, tunnelRiderAt } from './flatPieces';

export const viewOf = (f: Facing): PieceView => (f === 'up' || f === 'down' ? f : 'side');

/** The most arrows any piece shows: a 3x1 machine's output, three along its back and one on each end. */
export const MAX_ARROWS = 6;

/**
 * Lays a piece's input and output arrows (see arrowSpots) on `pool`, hiding the
 * spares. Used for placed pieces in build mode and for the ghost.
 */
export function placeArrows(
  pool: readonly GameObjects.Image[],
  p: Pick<PieceState, 'pieceId' | 'tx' | 'ty' | 'facing'> & { inFrom?: Facing; mirrored?: boolean },
  visible = true,
): void {
  const spots = arrowSpots(p);
  const reach = TILE_SIZE / 2 + FOUNDRY_LAYOUT.arrowOffset;
  for (const [i, arrow] of pool.entries()) {
    const spot = spots[i];
    arrow.setVisible(visible && spot !== undefined);
    if (!spot) continue;
    const [ex, ey] = facingVector(spot.edge);
    const x = (spot.tx + 0.5) * TILE_SIZE + ex * reach;
    const y = (spot.ty + 0.5) * TILE_SIZE + ey * reach;
    arrow.setFrame(FACING_ARROWS[spot.kind][viewOf(spot.points)]).setFlipX(spot.points === 'left');
    arrow.setPosition(Math.round(x), Math.round(y));
  }
}

/** The frame a piece's body shows first, before `draw` animates or turns it. */
function firstFrame(p: PieceState): string {
  const view = viewOf(p.facing);
  if (p.kind === 'conduit') return animFrames(conduitLook(p.facing, p.inFrom).anim)[0] ?? '';
  if (p.kind === 'machine') return machineLook(p.pieceId, view).idle;
  if (p.kind === 'splitter') return splitterLook(p.facing, p.mirrored).frame;
  if (p.kind === 'tunnel-in' || p.kind === 'tunnel-out') return tunnelLook(p.kind, p.facing).frame;
  return p.kind === 'hopper' ? HOPPER_SPRITES[view] : CRATE_SPRITE;
}

interface Drawn {
  body: GameObjects.Sprite;
  /** Machines: what they make, on the top face. Hoppers and crates: the item they hold. Conduits: the item riding it. */
  icon: GameObjects.Image;
  /** Input and output arrows, shown in build mode (conduits show their flow instead). */
  arrows: GameObjects.Image[];
  marker?: GameObjects.Sprite;
  markerIcon?: GameObjects.Image;
  count?: TextLine;
}

// Draws the foundry's pieces from sim state: machines showing what they make, a
// working loop and a status marker; conduits flowing with the item they carry;
// hoppers and crates with what they hold. The intake pipe is IntakeView's (019).
// Sorted by the bottom of their footprint.
export class FoundryView {
  private readonly scene: Scene;
  private readonly drawn = new Map<number, Drawn>();
  /** Pieces just placed, which drop in with a bounce when next drawn (014). */
  private readonly dropping = new Set<number>();

  private readonly occluders: Occluders | undefined;
  private readonly world: WorldLayer | undefined;
  private readonly forges: RunningForges | undefined;

  /**
   * `occluders` (070): machines can hide the player. 079: `world`, the world layer the pieces' bodies join (the mood's
   * tint or light, set as a piece is made and on a look change); `forges`, the running set each machine's status feeds.
   */
  constructor(scene: Scene, occluders?: Occluders, world?: WorldLayer, forges?: RunningForges) {
    this.scene = scene;
    this.occluders = occluders;
    this.world = world;
    this.forges = forges;
    for (const views of Object.values(MACHINE_SPRITES)) for (const v of Object.values(views)) registerAnim(scene, v.working);
    for (const anim of [...Object.values(CONDUIT_ANIMS), ...Object.values(CONDUIT_CORNERS)]) registerAnim(scene, anim);
    registerAnim(scene, STATUS_MARKERS.working);
  }

  /** Draws the pieces, or none when the foundry isn't the room on show. Build mode adds facing arrows. */
  update(foundry: FoundryState, shown: boolean, building: boolean): void {
    const live = new Set<number>();
    for (const p of shown ? foundry.pieces : []) {
      live.add(p.id);
      const d = this.drawn.get(p.id) ?? this.create(p);
      this.bounce(p.id, d.body);
      this.draw(p, d);
      placeArrows(d.arrows, p, building);
    }
    for (const [id, d] of this.drawn) {
      if (live.has(id)) continue;
      for (const o of [d.body, d.icon, ...d.arrows, d.marker, d.markerIcon]) o?.destroy();
      d.count?.set('');
      this.drawn.delete(id);
      this.forges?.remove(id);
    }
  }

  /** A piece was just placed: it drops in with a little squash when it's drawn. */
  dropIn(id: number): void {
    this.dropping.add(id);
  }

  private bounce(id: number, body: GameObjects.Sprite): void {
    if (!this.dropping.delete(id)) return;
    const y = body.y;
    // Relative to its resting scale: a vector frame rests at 1 / texture scale.
    const rest = 1 / textureScale();
    body.setY(y - SQUASH.dropPx).setScale(rest * (1 - SQUASH.squash), rest * (1 + SQUASH.squash));
    this.scene.tweens.add({ targets: body, y, duration: SQUASH.ms, ease: 'Bounce.Out' });
    this.scene.tweens.add({ targets: body, scaleX: rest, scaleY: rest, duration: SQUASH.ms * SQUASH.settle, ease: 'Back.Out' });
  }

  /** The top of a drawn piece's sprite, world px. */
  topOf(id: number): number | undefined {
    const d = this.drawn.get(id);
    return d ? d.body.y - d.body.displayHeight : undefined;
  }

  private create(p: PieceState): Drawn {
    const view = viewOf(p.facing);
    const r = pieceRect(p);
    const bottom = r.y + r.h / 2;
    const left = p.facing === 'left';
    const d: Drawn = {
      body: addVectorSprite(this.scene, r.x, bottom, firstFrame(p)).setOrigin(0.5, 1).setFlipX(left).setDepth(bottom),
      icon: addVector(this.scene, r.x, bottom, pieceIcon(p.pieceId)).setOrigin(0.5),
      arrows: arrowSpots(p).map(() => addVector(this.scene, 0, 0, FACING_ARROWS.out.down).setDepth(DEPTHS.worldUi - 1)),
    };
    if (p.kind === 'conduit') {
      const look = conduitLook(p.facing, p.inFrom);
      d.body.setOrigin(0).setPosition(r.x - TILE_SIZE / 2, r.y - TILE_SIZE / 2).setDepth(FOUNDRY_LAYOUT.conduitDepth);
      d.body.setFlipX(look.flip).play(look.anim.key);
      d.icon.setDepth(FOUNDRY_LAYOUT.itemDepth);
    } else if (p.kind === 'machine') {
      const footprint = pieceDef(p.pieceId).footprint;
      this.occluders?.add(d.body);
      d.icon.setPosition(r.x, bottom - ICON_RISE[footprint][view]).setDepth(bottom + FOUNDRY_LAYOUT.onTopNudge);
      d.marker = addVectorSprite(this.scene, r.x, 0, STATUS_MARKERS.blocked).setOrigin(0.5, 1).setDepth(DEPTHS.worldUi);
      d.markerIcon = addVector(this.scene, r.x, 0, pieceIcon(p.pieceId)).setOrigin(0.5).setDepth(DEPTHS.worldUi + 1);
    } else if (p.kind === 'splitter') {
      // 033: flat, still (no flow animation), the riding item drawn as on a conduit.
      const look = splitterLook(p.facing, p.mirrored);
      d.body.setOrigin(0.5).setPosition(r.x, r.y).setDepth(FOUNDRY_LAYOUT.conduitDepth).setFlip(look.flipX, look.flipY);
      d.icon.setDepth(FOUNDRY_LAYOUT.itemDepth);
    } else if (p.kind === 'tunnel-in' || p.kind === 'tunnel-out') {
      // 052: flat and still like the splitter; the riding item slides into, or out of, the hood's mouth.
      d.body.setOrigin(0.5).setPosition(r.x, r.y).setDepth(FOUNDRY_LAYOUT.conduitDepth).setFlip(tunnelLook(p.kind, p.facing).flipX, false);
      d.icon.setDepth(FOUNDRY_LAYOUT.itemDepth);
    } else {
      d.body.setFrame(p.kind === 'hopper' ? HOPPER_SPRITES[view] : CRATE_SPRITE);
      d.icon.setPosition(r.x, bottom - FOUNDRY_LAYOUT.contentsRise).setDepth(bottom + FOUNDRY_LAYOUT.onTopNudge);
      d.count = new TextLine(this.scene, r.x, bottom, bottom + 2 * FOUNDRY_LAYOUT.onTopNudge, true, 'count');
    }
    // 079: the body takes the foundry's mood (flat pieces lie at one depth, so lit ones batch together); the icon,
    // arrows, marker and count stay in the readability layer.
    if (isFlatKind(p.kind)) this.world?.addFlat(d.body);
    else this.world?.addProp(d.body);
    this.drawn.set(p.id, d);
    return d;
  }

  private draw(p: PieceState, d: Drawn): void {
    if (p.kind === 'conduit') this.drawConduit(p, d);
    else if (p.kind === 'machine') this.drawMachine(p, d);
    else if (p.kind === 'splitter' || p.kind === 'tunnel-in' || p.kind === 'tunnel-out') {
      d.icon.setVisible(p.item !== null);
      if (!p.item) return;
      const at = p.kind === 'splitter' ? riderAt(p) : tunnelRiderAt(p);
      d.icon.setFrame(itemDef(p.item).icon).setPosition(at.x, at.y - FOUNDRY_LAYOUT.itemLift);
    } else {
      const items = p.kind === 'hopper' ? (p.item ? { [p.item]: p.count } : {}) : p.contents;
      const first = Object.entries(items).find(([, n]) => n > 0);
      const total = Object.values(items).reduce((a, b) => a + b, 0);
      d.icon.setVisible(first !== undefined);
      if (first) d.icon.setFrame(itemDef(first[0]).icon);
      d.count?.set(total > 0 ? String(total) : '');
      // Beside the icon, clear of the crate's lock.
      d.count?.moveTo(Math.round(d.body.x + FOUNDRY_LAYOUT.countX), Math.round(d.icon.y + FOUNDRY_LAYOUT.countY));
    }
  }

  private drawConduit(p: Extract<PieceState, { kind: 'conduit' }>, d: Drawn): void {
    d.icon.setVisible(p.item !== null);
    if (!p.item) return;
    // Slides in from its entry edge to the middle, then out to the front edge, so it rides a corner's bend.
    const t = p.progress / CONDUIT_TICKS;
    const [vx, vy] = t < 0.5 ? facingVector(p.inFrom) : facingVector(p.facing);
    const k = t < 0.5 ? 0.5 - t : t - 0.5;
    const r = pieceRect(p);
    d.icon.setFrame(itemDef(p.item).icon);
    d.icon.setPosition(Math.round(r.x + vx * k * TILE_SIZE), Math.round(r.y + vy * k * TILE_SIZE - FOUNDRY_LAYOUT.itemLift));
  }

  private drawMachine(p: Extract<PieceState, { kind: 'machine' }>, d: Drawn): void {
    // The mechanism moves while working, stands still while idle or starved, and jams (stuck, shaking) while blocked.
    const look = machineLook(p.pieceId, viewOf(p.facing));
    const r = pieceRect(p);
    this.forges?.observe(p, { x: r.x, bottom: r.y + r.h / 2 });
    const still = p.status === 'blocked' ? look.jammed : look.idle;
    if (p.status === 'working') d.body.play(look.working.key, true);
    else if (d.body.anims.isPlaying || d.body.frame.name !== still) d.body.stop().setFrame(still);
    const shake = p.status === 'blocked' && Math.floor(this.scene.time.now / JAM_SHAKE.ms) % 2 === 0 ? JAM_SHAKE.px : 0;
    d.body.setX(pieceRect(p).x + shake);
    const marker = d.marker;
    const icon = d.markerIcon;
    if (!marker || !icon) return;
    const top = d.body.y - d.body.displayHeight + FOUNDRY_LAYOUT.markerDrop;
    marker.setPosition(pieceRect(p).x + FOUNDRY_LAYOUT.markerX, top).setVisible(p.status !== 'idle');
    icon.setVisible(p.status === 'starved');
    if (p.status === 'working') marker.play(STATUS_MARKERS.working.key, true);
    else marker.stop();
    if (p.status === 'blocked') marker.setFrame(STATUS_MARKERS.blocked);
    if (p.status === 'starved') {
      marker.setFrame(STATUS_MARKERS.starved);
      const missing = p.missing[0];
      if (missing) icon.setFrame(itemDef(missing).icon).setPosition(marker.x, top - marker.displayHeight / 2);
    }
  }
}
