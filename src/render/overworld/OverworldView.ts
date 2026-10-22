import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, OVERWORLD_SPRITES, OVERWORLD_TEXTURES } from '../../data/assets';
import { GROUND, SITE_LOOK } from '../../data/art/ground';
import { TILE_SIZE } from '../../data/config';
import { OVERWORLD } from '../../data/overworld';
import { LANDMARK_LIST } from '../../data/landmarks';
import { LANDMARK_SPRITES } from '../../data/landmarkAssets';
import { TILE, type Room } from '../../data/rooms';
import type { SimState } from '../../sim/state';
import { colorOf } from '../color';
import { tileHash } from '../roomTiles';
import { inkCss } from '../vector/draw';
import { addVector, textureScale } from '../vector/textures';
import { drawGround } from './ground';
import { inHollows } from '../../data/hollows';
import { hollowsFrame } from '../hollowsTiles';
import { isPlateau } from './plateau';
import { pieceFrame } from '../../sim/tileLook';

// Draws the overworld (017): its ground baked into chunk textures, then every tree, rock, ruin and the foundry's ruin
// as vector sprites sorted by their feet; the ley barrier dome over the shrine site while its gate is shut; and
// greener ground with a ley ring round a claimed pylon. 053: the round map is too big to bake whole, so each chunk
// (its ground and its standing sprites) is built as the camera nears it and dropped once it's far behind.

const T = TILE_SIZE;

const { dome: DOME, safe: SAFE } = SITE_LOOK;

/** A built chunk: its ground image (and texture) and the sprites standing on its tiles. */
interface Chunk {
  key: string;
  objects: GameObjects.Image[];
}

export class OverworldView {
  private readonly scene: Scene;
  /** Built chunks by `cx,cy`. */
  private readonly chunks = new Map<string, Chunk>();
  private readonly dome: GameObjects.Graphics;
  private readonly safe: GameObjects.Image[] = [];
  private built = false;
  private room: Room | null = null;
  private shown = false;
  private domeOpen = false;
  private claims = '';

  constructor(scene: Scene) {
    this.scene = scene;
    this.dome = scene.add.graphics().setVisible(false);
  }

  /** Shows the overworld's art, building it the first time; anything else hides it. */
  show(room: Room | null): void {
    if (room && !this.built) this.build(room);
    this.shown = room !== null;
    for (const c of this.chunks.values()) for (const o of c.objects) o.setVisible(this.shown);
    for (const o of this.safe) o.setVisible(this.shown);
    this.dome.setVisible(this.shown && !this.domeOpen);
  }

  /** The chunks built now, as `cx,cy` keys, for the test hook. */
  get builtChunks(): string[] {
    return [...this.chunks.keys()];
  }

  update(sim: SimState): void {
    if (!this.built) return;
    if (this.shown) this.stream();
    if (!this.domeOpen && sim.gates.shrine) {
      this.domeOpen = true;
      this.scene.tweens.add({ targets: this.dome, alpha: 0, duration: DOME.fadeMs, onComplete: () => this.dome.setVisible(false) });
    }
    const claims = sim.claims.join(',');
    if (claims !== this.claims) {
      this.claims = claims;
      this.drawSafe(sim);
    }
  }

  private build(room: Room): void {
    this.built = true;
    this.room = room;
    this.drawDome();
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
    if (tex) {
      const c = tex.context;
      c.setTransform(scale, 0, 0, scale, -x0 * scale, -y0 * scale);
      drawGround(c, room, x0, y0, w, h, scale);
      tex.refresh();
    }
    const objects: GameObjects.Image[] = [this.scene.add.image(x0, y0, key).setOrigin(0).setScale(1 / scale).setDepth(DEPTHS.floor).setVisible(this.shown)];
    for (let ty = y0 / T; ty < (y0 + h) / T; ty++) {
      const row = room.rows[ty] ?? '';
      for (let tx = x0 / T; tx < (x0 + w) / T; tx++) {
        const image = this.standing(row[tx] ?? '', tx, ty);
        if (image) objects.push(image.setVisible(this.shown));
      }
    }
    this.chunks.set(id, { key, objects });
    return true;
  }

  /** A tile's standing sprite, if it has one, at the bottom centre of the tile. */
  private standing(symbol: string, tx: number, ty: number): GameObjects.Image | null {
    const hash = tileHash(tx, ty);
    const x = (tx + 0.5) * T;
    const bottom = (ty + 1) * T;
    // A landmark's own look (032): the Old Grove's old trees, the Quarry's cut blocks, the Husk Hive's nest stones (049).
    const landmark = LANDMARK_LIST.find((l) => tx >= l.area.x0 && tx <= l.area.x1 && ty >= l.area.y0 && ty <= l.area.y1);
    let frame: string | undefined;
    let jitter = 0;
    // Stonefall Hollows' own (034): cliffs, the aqueduct, rubble.
    // 053: the world's cliff edge away from its face is flat plateau in the ground, not sprites.
    const hollows = inHollows(tx, ty) && !(this.room && isPlateau(this.room, tx, ty)) ? hollowsFrame(symbol, tx, ty, hash, this.room) : undefined;
    if (hollows) frame = hollows;
    else if (symbol === TILE.tree && landmark?.look?.trees === 'old') frame = LANDMARK_SPRITES.oldTrees[hash % LANDMARK_SPRITES.oldTrees.length];
    else if (symbol === TILE.tree) {
      frame = OVERWORLD_SPRITES.trees[hash % OVERWORLD_SPRITES.trees.length];
      jitter = ((hash >>> 8) % 9) - 4;
    } else if (symbol === TILE.wall) frame = OVERWORLD_SPRITES.ruinWall;
    else if (symbol === TILE.door) frame = OVERWORLD_SPRITES.entrance;
    // 059: rocks and ruin blocks (a landmark's own, the ruin's columns and stones) by the rule their footprints follow.
    else if (this.room && (symbol === TILE.rock || symbol === TILE.ruinBlock)) frame = pieceFrame(this.room, tx, ty);
    if (!frame) return null;
    const image = addVector(this.scene, x + jitter, bottom, frame).setDepth(bottom);
    if (symbol === TILE.tree && (hash >>> 16) % 2 === 0) image.setFlipX(true);
    return image;
  }

  /** The ley barrier: a translucent dome over the shrine site, sealing its gap until the first line fills the tube. */
  private drawDome(): void {
    const a = OVERWORLD.shrine.area;
    const cx = ((a.x0 + a.x1 + 1) / 2) * T;
    const cy = ((a.y0 + a.y1 + 1) / 2) * T;
    const rx = ((a.x1 - a.x0 + 3) / 2) * T;
    const ry = ((a.y1 - a.y0 + 3) / 2) * T;
    const color = colorOf(DOME.color);
    this.dome.clear();
    this.dome.fillStyle(color, DOME.fill).fillEllipse(cx, cy, rx * 2, ry * 2);
    this.dome.lineStyle(DOME.rimWidth, color, DOME.rim).strokeEllipse(cx, cy, rx * 2, ry * 2);
    this.dome.setDepth(DEPTHS.worldUi - 1);
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
