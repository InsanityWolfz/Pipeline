import { TintModes, type GameObjects, type Scene } from 'phaser';
import { DEPTHS, SPRITES } from '../data/assets';
import { NODE_DAPPLE, NODE_GLOW } from '../data/art/nodes';
import { HARVEST_BAR } from '../data/hudLayout';
import { HARVEST_WORK } from '../data/juice';
import { nodeDef } from '../data/nodes';
import type { HarvestState } from '../sim/harvest';
import { harvestable, type NodeState } from '../sim/nodes';
import { colorOf } from './color';
import { nodeFrame } from './nodeStages';
import { addVector, showFrame } from './vector/textures';

interface NodeSprites {
  image: GameObjects.Image;
  dapple?: GameObjects.Ellipse;
  /** 051 (B.4): the pale outline behind a harvestable node, and its glint. */
  glow: GameObjects.Image;
  sparkle: GameObjects.Image;
}

// Draws gathering nodes (018) at their use or regrow stage, sorted by the bottom
// of their base: a tree in its patch of sun, shaking while it's worked; and the
// progress bar over the one being harvested. 051 (B.4): a harvestable node has a
// soft pale outline glow and now and then a glint; a used-up one has neither.
export class NodeView {
  private readonly sprites = new Map<number, NodeSprites>();
  private readonly bar: GameObjects.Graphics;
  private readonly scene: Scene;
  private time = 0;

  /** Each drawn node's frame by node id, for the test hook. */
  get frames(): Record<number, string> {
    return Object.fromEntries([...this.sprites].map(([id, v]) => [id, v.image.frame.name]));
  }

  /** 051: the drawn nodes whose glow shows, by id, for the test hook. */
  get glowing(): number[] {
    return [...this.sprites].filter(([, v]) => v.glow.visible).map(([id]) => id);
  }

  constructor(scene: Scene) {
    this.scene = scene;
    this.bar = scene.add.graphics().setDepth(DEPTHS.worldUi);
  }

  update(nodes: readonly NodeState[], harvest: HarvestState | null, deltaMs: number): void {
    this.time += deltaMs;
    const live = new Set<number>();
    for (const n of nodes) {
      live.add(n.id);
      const bottom = n.y + nodeDef(n.nodeId).feetBox.h / 2;
      const frame = nodeFrame(n);
      const view = this.sprites.get(n.id) ?? this.create(n, frame, bottom);
      if (view.image.frame.name !== frame) showFrame(view.image, frame);
      this.glow(view, n, frame, bottom);
      // A tree being worked shakes.
      const shake =
        harvest?.nodeId === n.id && n.nodeId === HARVEST_WORK.shakeNodeId
          ? Math.sin((this.time / 1000) * HARVEST_WORK.shakeHz * Math.PI * 2) * HARVEST_WORK.shakePx
          : 0;
      view.image.setPosition(n.x + shake, bottom).setDepth(bottom);
      view.glow.setX(n.x + shake);
    }
    for (const [id, v] of this.sprites) {
      if (live.has(id)) continue;
      for (const o of [v.image, v.glow, v.sparkle, v.dapple]) o?.destroy();
      this.sprites.delete(id);
    }
    this.drawBar(nodes, harvest);
  }

  private create(n: NodeState, frame: string, bottom: number): NodeSprites {
    const image = addVector(this.scene, n.x, bottom, frame);
    const glow = addVector(this.scene, n.x, bottom, frame).setTint(colorOf(NODE_GLOW.color)).setTintMode(TintModes.FILL);
    const sparkle = addVector(this.scene, n.x, bottom, SPRITES.nodeSparkle).setVisible(false);
    const d = NODE_DAPPLE;
    const dapple =
      n.nodeId === d.nodeId ? this.scene.add.ellipse(n.x, bottom - d.rise, d.rx * 2, d.ry * 2, colorOf(d.color), d.alpha).setDepth(DEPTHS.shadow) : undefined;
    const view = dapple ? { image, glow, sparkle, dapple } : { image, glow, sparkle };
    this.sprites.set(n.id, view);
    return view;
  }

  /**
   * The glow behind a harvestable node (its frame filled pale, a little bigger round its base, breathing) and its
   * glint: every so often, at its own offset, a star twinkles at a spot on it that changes each time.
   */
  private glow(view: NodeSprites, n: NodeState, frame: string, bottom: number): void {
    const on = harvestable(n);
    view.glow.setVisible(on);
    if (!on) {
      view.sparkle.setVisible(false);
      return;
    }
    const G = NODE_GLOW;
    if (view.glow.frame.name !== frame) showFrame(view.glow, frame);
    const k = view.image.scaleX * (1 + (2 * G.outline) / Math.max(1, view.image.displayWidth));
    const breath = (Math.sin((this.time / G.periodMs) * Math.PI * 2 + n.id) + 1) / 2;
    view.glow.setScale(k).setY(bottom).setDepth(bottom - 0.5).setAlpha(G.alpha.min + (G.alpha.max - G.alpha.min) * breath);
    const S = G.sparkle;
    const t = this.time + n.id * 977;
    const phase = (t % S.everyMs) / S.ms;
    view.sparkle.setVisible(phase < 1);
    if (phase >= 1) return;
    // A spot on the node's upper part, picked from the cycle's number so it moves each time.
    const cycle = Math.floor(t / S.everyMs);
    const w = view.image.displayWidth;
    const h = view.image.displayHeight;
    const fx = ((cycle * 37 + n.id * 11) % 100) / 100 - 0.5;
    const fy = ((cycle * 53 + n.id * 7) % 100) / 100;
    const size = Math.sin(phase * Math.PI) * S.peak;
    showFrame(view.sparkle, SPRITES.nodeSparkle);
    view.sparkle.setScale(view.sparkle.scaleX * size).setPosition(n.x + fx * w * 0.7, bottom - h * (0.3 + fy * 0.6)).setDepth(bottom + 0.5);
  }

  private drawBar(nodes: readonly NodeState[], harvest: HarvestState | null): void {
    this.bar.clear();
    const n = harvest ? nodes.find((node) => node.id === harvest.nodeId) : undefined;
    const image = n ? this.sprites.get(n.id)?.image : undefined;
    if (!harvest || !n || !image) return;
    const { w, h, gap, border } = HARVEST_BAR;
    const x = Math.round(n.x - w / 2);
    const y = Math.round(image.getTopCenter().y - gap - h);
    const filled = Math.round((w * harvest.progress) / nodeDef(n.nodeId).harvestTicks);
    this.bar.fillStyle(colorOf(HARVEST_BAR.back)).fillRect(x - border, y - border, w + 2 * border, h + 2 * border);
    this.bar.fillStyle(colorOf(HARVEST_BAR.color)).fillRect(x, y, filled, h);
  }
}
