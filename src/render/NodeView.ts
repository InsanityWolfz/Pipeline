import type { GameObjects, Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { NODE_DAPPLE } from '../data/art/nodes';
import { HARVEST_BAR } from '../data/hudLayout';
import { HARVEST_WORK } from '../data/juice';
import { nodeDef } from '../data/nodes';
import type { HarvestState } from '../sim/harvest';
import type { NodeState } from '../sim/nodes';
import { colorOf } from './color';
import { nodeFrame } from './nodeStages';
import { addVector, showFrame } from './vector/textures';

// Draws gathering nodes (018) at their use or regrow stage, sorted by the bottom
// of their base: a tree in its patch of sun, shaking while it's worked; and the
// progress bar over the one being harvested.
export class NodeView {
  private readonly sprites = new Map<number, { image: GameObjects.Image; dapple?: GameObjects.Ellipse }>();
  private readonly bar: GameObjects.Graphics;
  private readonly scene: Scene;
  private time = 0;

  /** Each drawn node's frame by node id, for the test hook. */
  get frames(): Record<number, string> {
    return Object.fromEntries([...this.sprites].map(([id, v]) => [id, v.image.frame.name]));
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
      // A tree being worked shakes.
      const shake =
        harvest?.nodeId === n.id && n.nodeId === HARVEST_WORK.shakeNodeId
          ? Math.sin((this.time / 1000) * HARVEST_WORK.shakeHz * Math.PI * 2) * HARVEST_WORK.shakePx
          : 0;
      view.image.setPosition(n.x + shake, bottom).setDepth(bottom);
    }
    for (const [id, v] of this.sprites) {
      if (live.has(id)) continue;
      v.image.destroy();
      v.dapple?.destroy();
      this.sprites.delete(id);
    }
    this.drawBar(nodes, harvest);
  }

  private create(n: NodeState, frame: string, bottom: number): { image: GameObjects.Image; dapple?: GameObjects.Ellipse } {
    const image = addVector(this.scene, n.x, bottom, frame);
    const d = NODE_DAPPLE;
    const dapple =
      n.nodeId === d.nodeId ? this.scene.add.ellipse(n.x, bottom - d.rise, d.rx * 2, d.ry * 2, colorOf(d.color), d.alpha).setDepth(DEPTHS.shadow) : undefined;
    const view = dapple ? { image, dapple } : { image };
    this.sprites.set(n.id, view);
    return view;
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
