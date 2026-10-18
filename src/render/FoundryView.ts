import type { GameObjects, Scene } from 'phaser';
import { ATLAS_KEY, DEPTHS } from '../data/assets';
import { TILE_SIZE } from '../data/config';
import { CONDUIT_TICKS, STAGER_ANGLES } from '../data/foundry';
import {
  CONDUIT_ANIMS,
  CRATE_SPRITE,
  SOCKET_SPRITES,
  SPREAD_FAN,
  STAGER_PULSE_ALPHA,
  STAGER_SPRITE,
  FACING_ARROWS,
  FOUNDRY_LAYOUT,
  ICON_RISE,
  HOPPER_SPRITES,
  MACHINE_HOUSINGS,
  STATUS_MARKERS,
  type PieceView,
} from '../data/foundryAssets';
import { itemDef } from '../data/items';
import { pieceDef } from '../data/pieces';
import { facingVector } from '../sim/direction';
import { rotate, socketStreams } from '../sim/spread';
import { pieceRect, type FoundryState, type PieceState } from '../sim/pieces';
import type { Facing } from '../sim/player';
import { registerAnim } from './anims';
import { arrowSpots, pieceIcon } from './foundryLayout';
import { colorOf } from './color';
import { GlyphLine } from './glyphLine';

export const viewOf = (f: Facing): PieceView => (f === 'up' || f === 'down' ? f : 'side');

/** The most arrows any piece shows: a 3x1 machine's output, three along its back and one on each end. */
export const MAX_ARROWS = 6;

/**
 * Lays a piece's input and output arrows (see arrowSpots) on `pool`, hiding the
 * spares. Used for placed pieces in build mode and for the ghost.
 */
export function placeArrows(
  pool: readonly GameObjects.Image[],
  p: Pick<PieceState, 'pieceId' | 'tx' | 'ty' | 'facing'>,
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

interface Drawn {
  body: GameObjects.Sprite;
  /** Machines: what they make, on the top face. Hoppers and crates: the item they hold. Conduits: the item riding it. */
  icon: GameObjects.Image;
  /** Input and output arrows, shown in build mode (conduits show their flow instead). */
  arrows: GameObjects.Image[];
  marker?: GameObjects.Sprite;
  markerIcon?: GameObjects.Image;
  count?: GlyphLine;
}

// Draws the foundry's pieces from sim state: machines showing what they make, a
// working loop and a status marker; conduits flowing with the item they carry;
// hoppers and crates with what they hold; tube sockets flaring as they refill.
// Sorted by the bottom of their footprint.
export class FoundryView {
  private readonly scene: Scene;
  private readonly drawn = new Map<number, Drawn>();
  /** Build mode's spread fan over the tube socket. */
  private readonly fan: GameObjects.Graphics;

  constructor(scene: Scene) {
    this.scene = scene;
    this.fan = scene.add.graphics().setDepth(DEPTHS.worldUi - 2);
    for (const views of Object.values(MACHINE_HOUSINGS)) for (const v of Object.values(views)) registerAnim(scene, v.working);
    for (const anim of Object.values(CONDUIT_ANIMS)) registerAnim(scene, anim);
    registerAnim(scene, STATUS_MARKERS.working);
  }

  /** Draws the pieces, or none when the foundry isn't the room on show. Build mode adds facing arrows. */
  update(foundry: FoundryState, shown: boolean, building: boolean): void {
    const live = new Set<number>();
    for (const p of shown ? foundry.pieces : []) {
      live.add(p.id);
      const d = this.drawn.get(p.id) ?? this.create(p);
      this.draw(p, d);
      placeArrows(d.arrows, p, building);
    }
    this.drawFan(foundry, shown && building);
    for (const [id, d] of this.drawn) {
      if (live.has(id)) continue;
      for (const o of [d.body, d.icon, ...d.arrows, d.marker, d.markerIcon]) o?.destroy();
      d.count?.set('');
      this.drawn.delete(id);
    }
  }

  /** The top of a drawn piece's sprite, world px. */
  topOf(id: number): number | undefined {
    const d = this.drawn.get(id);
    return d ? d.body.y - d.body.height : undefined;
  }

  private create(p: PieceState): Drawn {
    const add = this.scene.add;
    const view = viewOf(p.facing);
    const r = pieceRect(p);
    const bottom = r.y + r.h / 2;
    const left = p.facing === 'left';
    const d: Drawn = {
      body: add.sprite(r.x, bottom, ATLAS_KEY).setOrigin(0.5, 1).setFlipX(left).setDepth(bottom),
      icon: add.image(r.x, bottom, ATLAS_KEY, pieceIcon(p.pieceId)).setOrigin(0.5),
      arrows: arrowSpots(p).map(() => add.image(0, 0, ATLAS_KEY, FACING_ARROWS.out.down).setDepth(DEPTHS.worldUi - 1)),
    };
    if (p.kind === 'conduit') {
      d.body.setOrigin(0).setPosition(r.x - TILE_SIZE / 2, r.y - TILE_SIZE / 2).setDepth(FOUNDRY_LAYOUT.conduitDepth);
      d.body.play(CONDUIT_ANIMS[view].key);
      d.icon.setDepth(FOUNDRY_LAYOUT.itemDepth);
    } else if (p.kind === 'machine') {
      const footprint = pieceDef(p.pieceId).footprint;
      d.body.setFrame(MACHINE_HOUSINGS[footprint][view].idle);
      d.icon.setPosition(r.x, bottom - ICON_RISE[footprint][view]).setDepth(bottom + FOUNDRY_LAYOUT.onTopNudge);
      d.marker = add.sprite(r.x, 0, ATLAS_KEY).setOrigin(0.5, 1).setDepth(DEPTHS.worldUi);
      d.markerIcon = add.image(r.x, 0, ATLAS_KEY).setOrigin(0.5).setDepth(DEPTHS.worldUi + 1);
    } else if (p.kind === 'socket') {
      d.body.setFrame(SOCKET_SPRITES.idle);
      d.icon.setVisible(false);
    } else if (p.kind === 'stager') {
      d.icon.setDepth(bottom + FOUNDRY_LAYOUT.onTopNudge).setVisible(false);
    } else {
      d.body.setFrame(p.kind === 'hopper' ? HOPPER_SPRITES[view] : CRATE_SPRITE);
      d.icon.setPosition(r.x, bottom - FOUNDRY_LAYOUT.contentsRise).setDepth(bottom + FOUNDRY_LAYOUT.onTopNudge);
      d.count = new GlyphLine(this.scene, r.x, bottom, bottom + 2 * FOUNDRY_LAYOUT.onTopNudge, true);
    }
    this.drawn.set(p.id, d);
    return d;
  }

  private draw(p: PieceState, d: Drawn): void {
    if (p.kind === 'conduit') this.drawConduit(p, d);
    else if (p.kind === 'machine') this.drawMachine(p, d);
    else if (p.kind === 'socket') d.body.setFrame(p.pulse > 0 ? SOCKET_SPRITES.refill : SOCKET_SPRITES.idle);
    else if (p.kind === 'stager') {
      d.body.setFrame(`${STAGER_SPRITE.key}/${Math.max(0, STAGER_ANGLES.indexOf(p.angle))}`);
      // A held item makes the ring throb as it passes through.
      const throb = p.item ? STAGER_PULSE_ALPHA + (1 - STAGER_PULSE_ALPHA) * Math.abs(Math.cos(p.progress / 3)) : 1;
      d.body.setAlpha(throb);
    }
    else {
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

  /** One faint line per stream from the socket's centre, at its angle from straight up. */
  private drawFan(foundry: FoundryState, on: boolean): void {
    this.fan.clear();
    const socket = foundry.pieces.find((p) => p.kind === 'socket');
    if (!on || !socket) return;
    const r = pieceRect(socket);
    this.fan.lineStyle(SPREAD_FAN.width, colorOf(SPREAD_FAN.color), SPREAD_FAN.alpha);
    for (const angle of socketStreams(foundry)) {
      const [dx, dy] = rotate(0, -1, angle);
      this.fan.lineBetween(r.x, r.y, r.x + dx * SPREAD_FAN.length, r.y + dy * SPREAD_FAN.length);
    }
  }

  private drawConduit(p: Extract<PieceState, { kind: 'conduit' }>, d: Drawn): void {
    d.icon.setVisible(p.item !== null);
    if (!p.item) return;
    // Slides from the back edge to the front edge as it crosses.
    const [fx, fy] = facingVector(p.facing);
    const t = p.progress / CONDUIT_TICKS - 0.5;
    const r = pieceRect(p);
    d.icon.setFrame(itemDef(p.item).icon);
    d.icon.setPosition(Math.round(r.x + fx * t * TILE_SIZE), Math.round(r.y + fy * t * TILE_SIZE - FOUNDRY_LAYOUT.itemLift));
  }

  private drawMachine(p: Extract<PieceState, { kind: 'machine' }>, d: Drawn): void {
    const housing = MACHINE_HOUSINGS[pieceDef(p.pieceId).footprint][viewOf(p.facing)];
    if (p.status === 'working') d.body.play(housing.working.key, true);
    else if (d.body.anims.isPlaying || d.body.frame.name !== housing.idle) d.body.stop().setFrame(housing.idle);
    const marker = d.marker;
    const icon = d.markerIcon;
    if (!marker || !icon) return;
    const top = d.body.y - d.body.height - FOUNDRY_LAYOUT.markerGap;
    marker.setY(top).setVisible(p.status !== 'idle');
    icon.setVisible(p.status === 'starved');
    if (p.status === 'working') marker.play(STATUS_MARKERS.working.key, true);
    else marker.stop();
    if (p.status === 'blocked') marker.setFrame(STATUS_MARKERS.blocked);
    if (p.status === 'starved') {
      marker.setFrame(STATUS_MARKERS.starved);
      const missing = p.missing[0];
      if (missing) icon.setFrame(itemDef(missing).icon).setY(top - marker.height / 2);
    }
  }
}
