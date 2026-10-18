import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, OVERWORLD_SPRITES, OVERWORLD_TEXTURES } from '../../data/assets';
import { GROUND } from '../../data/art/ground';
import { TILE_SIZE } from '../../data/config';
import { OVERWORLD } from '../../data/overworld';
import { SAFE_RADIUS } from '../../data/population';
import { TILE, type Room } from '../../data/rooms';
import type { SimState } from '../../sim/state';
import { colorOf } from '../color';
import { tileHash } from '../roomTiles';
import { inkCss } from '../vector/draw';
import { addVector, textureScale } from '../vector/textures';
import { drawGround } from './ground';

// Draws the overworld (017): its ground baked once into chunk textures, then
// every tree, rock, ruin and the foundry's mound as vector sprites sorted by
// their feet; the ley barrier dome over the shrine site while its gate is shut;
// and greener ground with a ley ring round a claimed pylon.

const T = TILE_SIZE;

/** The barrier dome over the shrine site: fill and rim opacity, and its fade when the gate opens, ms. */
const DOME = { fill: 0.14, rim: 0.7, rimWidth: 2, fadeMs: 600, color: 'cyan' } as const;
/** The safe zone's look: the green wash's strength and the ley ring's. */
const SAFE = { wash: 0.35, ring: 0.6, ringWidth: 2, color: 'leaf-light', ringColor: 'cyan' } as const;

export class OverworldView {
  private readonly scene: Scene;
  private readonly objects: GameObjects.GameObject[] = [];
  private readonly dome: GameObjects.Graphics;
  private readonly safe: GameObjects.Image[] = [];
  private built = false;
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
    for (const o of this.objects) (o as GameObjects.Image).setVisible(this.shown);
    for (const o of this.safe) o.setVisible(this.shown);
    this.dome.setVisible(this.shown && !this.domeOpen);
  }

  update(sim: SimState): void {
    if (!this.built) return;
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
    this.buildGround(room);
    for (const [ty, row] of room.rows.entries()) for (const [tx, symbol] of [...row].entries()) this.standing(symbol, tx, ty);
    this.drawDome();
  }

  private buildGround(room: Room): void {
    const scale = Math.min(GROUND.maxScale, textureScale());
    const width = (room.rows[0]?.length ?? 0) * T;
    const height = room.rows.length * T;
    let i = 0;
    for (let y0 = 0; y0 < height; y0 += GROUND.chunk) {
      for (let x0 = 0; x0 < width; x0 += GROUND.chunk) {
        const w = Math.min(GROUND.chunk, width - x0);
        const h = Math.min(GROUND.chunk, height - y0);
        const key = `${OVERWORLD_TEXTURES.ground}-${i++}`;
        const tex = this.scene.textures.exists(key) ? null : this.scene.textures.createCanvas(key, Math.ceil(w * scale), Math.ceil(h * scale));
        if (tex) {
          const c = tex.context;
          c.setTransform(scale, 0, 0, scale, -x0 * scale, -y0 * scale);
          drawGround(c, room, x0, y0, w, h, scale);
          tex.refresh();
        }
        this.objects.push(this.scene.add.image(x0, y0, key).setOrigin(0).setScale(1 / scale).setDepth(DEPTHS.floor));
      }
    }
  }

  /** A tile's standing sprite, if it has one, at the bottom centre of the tile. */
  private standing(symbol: string, tx: number, ty: number): void {
    const hash = tileHash(tx, ty);
    const x = (tx + 0.5) * T;
    const bottom = (ty + 1) * T;
    const mound = OVERWORLD.entrance.mound.some((t) => t.tx === tx && t.ty === ty);
    let frame: string | undefined;
    let jitter = 0;
    if (symbol === TILE.tree) {
      frame = OVERWORLD_SPRITES.trees[hash % OVERWORLD_SPRITES.trees.length];
      jitter = ((hash >>> 8) % 9) - 4;
    } else if (symbol === TILE.rock) frame = OVERWORLD_SPRITES.rocks[hash % OVERWORLD_SPRITES.rocks.length];
    else if (symbol === TILE.wall) frame = OVERWORLD_SPRITES.ruinWall;
    else if (symbol === TILE.door) frame = OVERWORLD_SPRITES.entrance;
    else if (symbol === TILE.ruinBlock && !mound) frame = hash % 3 === 0 ? OVERWORLD_SPRITES.column : OVERWORLD_SPRITES.ruinStone;
    if (!frame) return;
    const image = addVector(this.scene, x + jitter, bottom, frame).setDepth(bottom);
    if (symbol === TILE.tree && (hash >>> 16) % 2 === 0) image.setFlipX(true);
    this.objects.push(image);
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

  /** A claimed pylon's safe ground: a green wash and a ley ring at its radius. */
  private drawSafe(sim: SimState): void {
    for (const o of this.safe) o.destroy();
    this.safe.length = 0;
    if (!sim.claims.includes(OVERWORLD.shrine.site)) return;
    const key = OVERWORLD_TEXTURES.safeGlow;
    if (!this.scene.textures.exists(key)) {
      const size = 256;
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
    const p = OVERWORLD.shrine.pylon;
    const r = SAFE_RADIUS * T;
    const image = this.scene.add
      .image((p.tx + 0.5) * T, (p.ty + 0.5) * T, key)
      .setDisplaySize(r * 2, r * 2)
      .setDepth(DEPTHS.floor + 0.5)
      .setVisible(this.shown);
    this.safe.push(image);
  }
}
