import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { DEPTHS, FX_TEXTURES, SET_PIECE_FRAMES } from '../../data/assets';
import { SWAY } from '../../data/ambient';
import { TILE_SIZE } from '../../data/config';
import { GLOW_TEXTURE } from '../../data/juice';
import type { Room } from '../../data/rooms';
import { SET_PIECES, setPieceAnchor, type SetPieceDef } from '../../data/setPieces';
import { PLAYER_SILHOUETTE } from '../../data/silhouette';
import { colorOf } from '../color';
import type { WorldLayer } from '../lighting/WorldLayer';
import type { Occluders } from '../occluders';
import { addVector } from '../vector/textures';
import { chunkDecor } from './decorPlace';
import type { SwayStepper } from './sway';

// 077: a ground chunk's detail, made when the chunk is built and destroyed with it: its plants in one Phaser Layer at
// DEPTHS.decor (one child of the scene, shown only while the chunk is in view), its vines hung on the cliff faces,
// and the set pieces whose anchor stands in it (a still base that hides the player, a loop overlay, a swaying part,
// glow halos). Swaying objects (plants, vines, the chunk's trees, the Colossus's ivy) are filed with the stepper.

const T = TILE_SIZE;

/** A set piece as made: its base, and its loop, swaying part and halos if it has them. */
export interface PieceObjects {
  def: SetPieceDef;
  base: GameObjects.Image;
  loop: GameObjects.Image | null;
  sway: GameObjects.Image | null;
  halos: { image: GameObjects.Image; alpha: number; breathe: boolean }[];
}

/** A built chunk's detail. */
export interface ChunkDetail {
  layer: GameObjects.Layer;
  plants: number;
  vines: GameObjects.Image[];
  pieces: PieceObjects[];
  trees: number;
  /** Solid tiles drawn as a ruin variant. */
  variants: number;
  shown: boolean;
}

/** A hash's share 0..1 and a period in a range, for a swaying thing's own beat. */
const beat = (h: number, range: readonly [number, number]): number => range[0] + ((h >>> 3) % 1000) / 1000 * (range[1] - range[0]);

/** Which chunk a world point stands in. */
export const chunkOf = (x: number, y: number, size: number): string => `${Math.floor(x / size)},${Math.floor(y / size)}`;

export class DecorView {
  private readonly scene: Scene;
  private readonly sway: SwayStepper;
  private readonly world: WorldLayer | undefined;
  private readonly occluders: Occluders | undefined;
  private readonly size: number;
  readonly chunks = new Map<string, ChunkDetail>();
  /** `?world=off` / the hook: plants and vines aren't made, and existing ones hide. */
  off = false;
  private roomShown = false;

  constructor(scene: Scene, sway: SwayStepper, size: number, world?: WorldLayer, occluders?: Occluders) {
    this.scene = scene;
    this.sway = sway;
    this.size = size;
    this.world = world;
    this.occluders = occluders;
  }

  /** Makes a chunk's plants, vines and set pieces (hidden until `show`). */
  build(room: Room, cx: number, cy: number): void {
    const key = `${cx},${cy}`;
    if (this.chunks.has(key)) return;
    const layer = this.scene.add.layer().setDepth(DEPTHS.decor).setVisible(false);
    // With the world off (the probe's A/B), no plants or vines are made.
    const { plants, vines } = this.off ? { plants: [], vines: [] } : chunkDecor(room, cx, cy, this.size);
    for (const p of plants) {
      const image = addVector(this.scene, p.x, p.y, p.frame).setDepth(DEPTHS.decor).setFlipX(p.flip);
      layer.add(image);
      this.world?.addFlat(image);
      this.sway.add(key, { target: image, x: p.x, y: p.y, kind: p.sway, period: beat(Math.floor(p.phase * 997), SWAY.periodMs[p.sway]), phase: p.phase });
    }
    const vineImages = vines.map((v) => {
      // A vine hangs over its cliff's face: just in front of the cliff, behind anything standing below it.
      const image = addVector(this.scene, v.x, v.y, v.frame).setDepth((v.ty + 1) * T + 0.02).setFlipX(v.flip).setVisible(this.roomShown && !this.off);
      this.world?.addProp(image);
      this.sway.add(key, { target: image, x: v.x, y: v.y, kind: 'vine', period: beat(Math.floor(v.phase * 991), SWAY.periodMs.vine), phase: v.phase });
      return image;
    });
    const pieces = SET_PIECES.filter((p) => {
      const a = setPieceAnchor(p, T);
      return chunkOf(a.x, a.y - 1, this.size) === key;
    }).map((p) => this.piece(key, p));
    this.chunks.set(key, { layer, plants: plants.length, vines: vineImages, pieces, trees: 0, variants: 0, shown: false });
  }

  /** A solid tile of a built chunk drawn as a ruin variant (for the test hook). */
  noteVariant(key: string): void {
    const c = this.chunks.get(key);
    if (c) c.variants += 1;
  }

  /** A tree (or an old tree) standing in a built chunk sways like a tree. */
  addTree(key: string, image: GameObjects.Image, hash: number): void {
    const c = this.chunks.get(key);
    if (c) c.trees += 1;
    this.sway.add(key, { target: image, x: image.x, y: image.y, kind: 'tree', period: beat(hash, SWAY.periodMs.tree), phase: ((hash >>> 11) % 1000) / 1000 });
  }

  private piece(key: string, def: SetPieceDef): PieceObjects {
    const a = setPieceAnchor(def, T);
    const frames = SET_PIECE_FRAMES[def.id];
    const base = addVector(this.scene, a.x, a.y, frames.base).setDepth(a.y).setVisible(this.roomShown);
    if (PLAYER_SILHOUETTE.setPieces) this.occluders?.add(base);
    this.world?.addProp(base);
    const loopFrame = 'loop' in frames ? frames.loop[0] : undefined;
    const loop = loopFrame ? addVector(this.scene, a.x, a.y, loopFrame).setDepth(a.y + 0.02).setVisible(this.roomShown) : null;
    if (loop) this.world?.addProp(loop);
    const swayFrame = 'sway' in frames ? frames.sway : undefined;
    let sway: GameObjects.Image | null = null;
    if (swayFrame && def.swayAt) {
      const x = a.x + def.swayAt[0];
      const y = a.y + def.swayAt[1];
      sway = addVector(this.scene, x, y, swayFrame).setDepth(a.y + 0.03).setVisible(this.roomShown);
      this.world?.addProp(sway);
      this.sway.add(key, { target: sway, x, y, kind: 'vine', period: 3000, phase: 0.3 });
    }
    const halos = (def.halos ?? []).map((h) => ({
      image: this.scene.add
        .image(a.x + h.x, a.y + h.y, FX_TEXTURES.glow)
        .setScale(h.radius / GLOW_TEXTURE.radius)
        .setTint(colorOf(h.color))
        .setBlendMode(BlendModes.ADD)
        .setDepth(a.y + 0.04)
        .setVisible(this.roomShown),
      alpha: 0.85,
      breathe: h.breathe,
    }));
    return { def, base, loop, sway, halos };
  }

  /** Shows or hides a built chunk's plants as it comes into or leaves the view (on a change only; never while off). */
  show(key: string, inView: boolean): void {
    const c = this.chunks.get(key);
    if (!c) return;
    c.shown = inView;
    c.layer.setVisible(inView && this.roomShown && !this.off);
  }

  /** The overworld shown or not (a room change): its set pieces and vines with it, as its standing sprites. */
  setRoomShown(on: boolean): void {
    this.roomShown = on;
    for (const [key, c] of this.chunks) {
      this.show(key, c.shown);
      for (const v of c.vines) v.setVisible(on && !this.off);
      for (const p of c.pieces) for (const o of [p.base, p.loop, p.sway, ...p.halos.map((h) => h.image)]) o?.setVisible(on);
    }
  }

  /** Destroys a dropped chunk's detail and forgets its swaying objects. */
  drop(key: string): void {
    const c = this.chunks.get(key);
    if (!c) return;
    c.layer.destroy(true);
    for (const v of c.vines) v.destroy();
    for (const p of c.pieces) for (const o of [p.base, p.loop, p.sway, ...p.halos.map((h) => h.image)]) o?.destroy();
    this.chunks.delete(key);
    this.sway.removeChunk(key);
  }

  /** Re-applies `off` to every built chunk (a toggle: once, not per frame). */
  setOff(off: boolean): void {
    this.off = off;
    this.setRoomShown(this.roomShown);
  }
}
