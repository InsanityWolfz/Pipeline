import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, OVERWORLD_SPRITES, OVERWORLD_TEXTURES } from '../../data/assets';
import { GROUND, SITE_LOOK } from '../../data/art/ground';
import { TILE_SIZE } from '../../data/config';
import { LANDMARK_LIST } from '../../data/landmarks';
import { LANDMARK_SPRITES } from '../../data/landmarkAssets';
import { TILE, type Room } from '../../data/rooms';
import type { SimState } from '../../sim/state';
import { worldTileHash } from '../roomTiles';
import { inkCss } from '../vector/draw';
import { addVector, textureScale } from '../vector/textures';
import { drawGround } from './ground';
import { inHollows } from '../../data/hollows';
import { hollowsFrame } from '../hollowsTiles';
import { emberworksFrame } from '../emberworksTiles';
import { inEmberworks } from '../../data/emberworks';
import { inStormcrown } from '../../data/stormcrown';
import { stormcrownFrame } from '../stormcrownTiles';
import { isPlateau } from './plateau';
import { pieceFrame } from '../../sim/tileLook';
import type { Occluders } from '../occluders';
import type { WorldLayer } from '../lighting/WorldLayer';
import type { WorldLife } from '../world/WorldLife';
import { setPieceOnTile } from '../world/decorPlace';
import { variantFrame } from '../world/variants';

// Draws the overworld (017): its ground baked into chunk textures, then every tree, rock, ruin and the foundry's ruin
// as vector sprites sorted by their feet (067: the shrine's barrier dome is gone, its door open from the start); and
// greener ground with a ley ring round a claimed pylon. 053: the round map is too big to bake whole, so each chunk
// (its ground and its standing sprites) is built as the camera nears it and dropped once it's far behind.

const T = TILE_SIZE;

/** 074: `?blend=off` (dev only) bakes the ground without its blending, to measure what blending costs a chunk. */
/** 074: how many chunk bake times are kept for the probe. */
const BAKE_KEPT = 64;

const BLEND = !(import.meta.env.DEV && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('blend') === 'off');

const { safe: SAFE } = SITE_LOOK;

/** A built chunk: its ground image (and texture) and the sprites standing on its tiles. */
interface Chunk {
  key: string;
  objects: GameObjects.Image[];
}

export class OverworldView {
  private readonly scene: Scene;
  /** Built chunks by `cx,cy`. */
  private readonly chunks = new Map<string, Chunk>();
  private readonly safe: GameObjects.Image[] = [];
  private built = false;
  private room: Room | null = null;
  private shown = false;
  private claims = '';
  /** 074: the last BAKE_KEPT chunks' ground bake times, ms, for the probe. */
  readonly bakeMs: number[] = [];
  /** 077: the last BAKE_KEPT chunks' whole build times (the bake, the standing sprites and the decor), ms, for the probe. */
  readonly buildMs: number[] = [];

  private readonly occluders: Occluders | undefined;

  private readonly world: WorldLayer | undefined;

  private readonly life: WorldLife | undefined;

  /**
   * `occluders` (070): the trees and ruin blocks that can hide the player register there. `world` (074): the ground and
   * everything standing take the region's mood and lights. `life` (077): each chunk's plants, vines and set pieces, and
   * the sway of its trees.
   */
  constructor(scene: Scene, occluders?: Occluders, world?: WorldLayer, life?: WorldLife) {
    this.life = life;
    this.world = world;
    this.scene = scene;
    this.occluders = occluders;
  }

  /** Shows the overworld's art, building it the first time; anything else hides it. */
  show(room: Room | null): void {
    if (room && !this.built) this.build(room);
    this.shown = room !== null;
    this.life?.setRoom(room);
    for (const c of this.chunks.values()) for (const o of c.objects) o.setVisible(this.shown);
    for (const o of this.safe) o.setVisible(this.shown);
  }

  /** The chunks built now, as `cx,cy` keys, for the test hook. */
  get builtChunks(): string[] {
    return [...this.chunks.keys()];
  }

  update(sim: SimState): void {
    if (!this.built) return;
    if (this.shown) this.stream();
    const claims = sim.claims.join(',');
    if (claims !== this.claims) {
      this.claims = claims;
      this.drawSafe(sim);
    }
  }

  private build(room: Room): void {
    this.built = true;
    this.room = room;
    this.stream();
  }

  /**
   * Builds the chunks the camera needs and drops the far ones: every chunk the view touches now and the row below it
   * (tall sprites standing there reach up into the view, so a teleport or a KO shows no pop-in along the bottom), one
   * more a frame within `GROUND.ahead` chunks of it, nearest the view first, and none kept past `GROUND.keep` chunks away.
   */
  private stream(): void {
    const room = this.room;
    if (!room) return;
    const C = GROUND.chunk;
    const v = this.scene.cameras.main.worldView;
    const cols = Math.ceil(((room.rows[0]?.length ?? 0) * T) / C);
    const rows = Math.ceil((room.rows.length * T) / C);
    const span = (pad: number) => ({
      x0: Math.max(0, Math.floor(v.x / C) - pad),
      x1: Math.min(cols - 1, Math.floor((v.x + v.width) / C) + pad),
      y0: Math.max(0, Math.floor(v.y / C) - pad),
      y1: Math.min(rows - 1, Math.floor((v.y + v.height) / C) + pad),
    });
    const now = span(0);
    const below = Math.min(rows - 1, now.y1 + 1);
    for (let cy = now.y0; cy <= below; cy++) for (let cx = now.x0; cx <= now.x1; cx++) this.chunk(room, cx, cy);
    const ahead = span(GROUND.ahead);
    const mx = (now.x0 + now.x1) / 2;
    const my = (now.y0 + now.y1) / 2;
    let next: { cx: number; cy: number; d: number } | null = null;
    for (let cy = ahead.y0; cy <= ahead.y1; cy++) {
      for (let cx = ahead.x0; cx <= ahead.x1; cx++) {
        const d = Math.hypot(cx - mx, cy - my);
        if (!this.chunks.has(`${cx},${cy}`) && (!next || d < next.d)) next = { cx, cy, d };
      }
    }
    if (next) this.chunk(room, next.cx, next.cy);
    const keep = span(GROUND.keep);
    for (const [id, c] of this.chunks) {
      const [cx = 0, cy = 0] = id.split(',').map(Number);
      if (cx >= keep.x0 && cx <= keep.x1 && cy >= keep.y0 && cy <= keep.y1) continue;
      for (const o of c.objects) o.destroy();
      this.life?.decor.drop(id);
      if (this.scene.textures.exists(c.key)) this.scene.textures.remove(c.key);
      this.chunks.delete(id);
    }
  }

  /** Builds one chunk if it isn't built: its ground texture and its tiles' standing sprites. True if it built it. */
  private chunk(room: Room, cx: number, cy: number): boolean {
    const id = `${cx},${cy}`;
    if (this.chunks.has(id)) return false;
    const C = GROUND.chunk;
    const scale = Math.min(GROUND.maxScale, textureScale());
    const width = (room.rows[0]?.length ?? 0) * T;
    const height = room.rows.length * T;
    const x0 = cx * C;
    const y0 = cy * C;
    const w = Math.min(C, width - x0);
    const h = Math.min(C, height - y0);
    const key = `${OVERWORLD_TEXTURES.ground}-${cx}-${cy}`;
    const tex = this.scene.textures.exists(key) ? null : this.scene.textures.createCanvas(key, Math.ceil(w * scale), Math.ceil(h * scale));
    const built = performance.now();
    if (tex) {
      const c = tex.context;
      c.setTransform(scale, 0, 0, scale, -x0 * scale, -y0 * scale);
      const started = performance.now();
      drawGround(c, room, x0, y0, w, h, scale, BLEND, !this.life?.off);
      this.bakeMs.push(performance.now() - started);
      if (this.bakeMs.length > BAKE_KEPT) this.bakeMs.shift();
      tex.refresh();
    }
    const objects: GameObjects.Image[] = this.groundTiles(key, x0, y0, w, h, scale);
    // 077: its plants, vines and set pieces first, so its trees can join its sway.
    this.life?.decor.build(room, cx, cy);
    for (let ty = y0 / T; ty < (y0 + h) / T; ty++) {
      const row = room.rows[ty] ?? '';
      for (let tx = x0 / T; tx < (x0 + w) / T; tx++) {
        const image = this.standing(room, row[tx] ?? '', tx, ty, id);
        if (image) objects.push(image.setVisible(this.shown));
      }
    }
    this.chunks.set(id, { key, objects });
    this.buildMs.push(performance.now() - built);
    if (this.buildMs.length > BAKE_KEPT) this.buildMs.shift();
    return true;
  }

  /**
   * 074: a chunk's ground drawn as squares of `GROUND.lightTile` world px, each a frame of its texture: each frame only
   * the squares a light reaches are lit (WorldLayer.lightChunks), so the lighting's cost follows the lights, not the screen.
   */
  private groundTiles(key: string, x0: number, y0: number, w: number, h: number, scale: number): GameObjects.Image[] {
    const S = GROUND.lightTile;
    const texture = this.scene.textures.get(key);
    const out: GameObjects.Image[] = [];
    for (let sy = 0; sy < h; sy += S) {
      for (let sx = 0; sx < w; sx += S) {
        const name = `${sx},${sy}`;
        const px = Math.round(sx * scale);
        const py = Math.round(sy * scale);
        const pw = Math.min(Math.round((sx + S) * scale), texture.source[0]?.width ?? 0) - px;
        const ph = Math.min(Math.round((sy + S) * scale), texture.source[0]?.height ?? 0) - py;
        if (!texture.has(name)) texture.add(name, 0, px, py, pw, ph);
        const image = this.scene.add.image(x0 + px / scale, y0 + py / scale, key, name).setOrigin(0).setScale(1 / scale).setDepth(DEPTHS.floor).setVisible(this.shown);
        out.push(this.world?.addChunk(image) ?? image);
      }
    }
    return out;
  }

  /** A tile's standing sprite, if it has one, at the bottom centre of the tile (077: none under a set piece; a ruin variant on some). */
  private standing(room: Room, symbol: string, tx: number, ty: number, chunk: string): GameObjects.Image | null {
    if (setPieceOnTile(tx, ty)) return null;
    const hash = worldTileHash(tx, ty);
    const x = (tx + 0.5) * T;
    const bottom = (ty + 1) * T;
    // A landmark's own look (032): the Old Grove's old trees, the Quarry's cut blocks, the Husk Hive's nest stones (049).
    const landmark = LANDMARK_LIST.find((l) => tx >= l.area.x0 && tx <= l.area.x1 && ty >= l.area.y0 && ty <= l.area.y1);
    let frame: string | undefined;
    let jitter = 0;
    // Stonefall Hollows' own (034): cliffs, the aqueduct, rubble.
    // 053: the world's cliff edge away from its face is flat plateau in the ground, not sprites.
    const hollows = inHollows(tx, ty) && !isPlateau(room, tx, ty) ? hollowsFrame(symbol, tx, ty, hash, room) : undefined;
    // 060: the Emberworks' own: kilns, chimneys and its cliffs.
    const ember = inEmberworks(tx, ty) && !isPlateau(room, tx, ty) ? emberworksFrame(symbol, tx, ty, hash, room) : undefined;
    // 064: the Stormcrown's own: iron rods, cairns and its cliffs.
    const storm = inStormcrown(tx, ty) && !isPlateau(room, tx, ty) ? stormcrownFrame(symbol, tx, ty, hash, room) : undefined;
    if (hollows) frame = hollows;
    else if (ember) frame = ember;
    else if (storm) frame = storm;
    else if (symbol === TILE.tree && landmark?.look?.trees === 'old') frame = LANDMARK_SPRITES.oldTrees[hash % LANDMARK_SPRITES.oldTrees.length];
    else if (symbol === TILE.tree) {
      frame = OVERWORLD_SPRITES.trees[hash % OVERWORLD_SPRITES.trees.length];
      jitter = ((hash >>> 8) % 9) - 4;
    } else if (symbol === TILE.wall) frame = OVERWORLD_SPRITES.ruinWall;
    else if (symbol === TILE.door) frame = OVERWORLD_SPRITES.entrance;
    // 059: rocks and ruin blocks (a landmark's own, the ruin's columns and stones) by the rule their footprints follow.
    else if (symbol === TILE.rock || symbol === TILE.ruinBlock) frame = pieceFrame(room, tx, ty);
    if (!frame) return null;
    const variant = variantFrame(room.rows, frame, tx, ty);
    if (variant !== frame) this.life?.decor.noteVariant(chunk);
    const image = addVector(this.scene, x + jitter, bottom, variant).setDepth(bottom);
    if (symbol === TILE.tree && (hash >>> 16) % 2 === 0) image.setFlipX(true);
    if (symbol === TILE.tree || symbol === TILE.ruinBlock) this.occluders?.add(image);
    if (symbol === TILE.tree) this.life?.decor.addTree(chunk, image, hash);
    return this.world?.addProp(image) ?? image;
  }

  /** Each claimed pylon's safe ground (032: every claimed pylon, at its own radius): a green wash and a ley ring. */
  private drawSafe(sim: SimState): void {
    for (const o of this.safe) o.destroy();
    this.safe.length = 0;
    const claimed = (this.room?.pylons ?? []).filter((p) => sim.claims.includes(p.site));
    if (claimed.length === 0) return;
    const key = OVERWORLD_TEXTURES.safeGlow;
    if (!this.scene.textures.exists(key)) {
      const size = SAFE.textureSize;
      const tex = this.scene.textures.createCanvas(key, size, size);
      if (!tex) return;
      const c = tex.context;
      const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      g.addColorStop(0, inkCss({ id: SAFE.color, alpha: SAFE.wash }));
      g.addColorStop(0.85, inkCss({ id: SAFE.color, alpha: SAFE.wash * 0.8 }));
      g.addColorStop(0.97, inkCss({ id: SAFE.ringColor, alpha: SAFE.ring }));
      g.addColorStop(1, inkCss({ id: SAFE.ringColor, alpha: 0 }));
      c.fillStyle = g;
      c.fillRect(0, 0, size, size);
      tex.refresh();
    }
    for (const p of claimed) {
      const r = p.safeRadius * T;
      const image = this.scene.add
        .image((p.tx + 0.5) * T, (p.ty + 0.5) * T, key)
        .setDisplaySize(r * 2, r * 2)
        .setDepth(DEPTHS.floor + 0.5)
        .setVisible(this.shown);
      this.safe.push(image);
    }
  }
}
