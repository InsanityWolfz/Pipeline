import type { GameObjects, Scene } from 'phaser';
import { ATLAS_KEY, DEPTHS, NODE_SPRITE_DROP } from '../data/assets';
import { HARVEST_BAR } from '../data/hudLayout';
import { nodeDef } from '../data/nodes';
import type { HarvestState } from '../sim/harvest';
import type { NodeState } from '../sim/nodes';
import { colorOf } from './color';

// Draws gathering nodes, full or depleted, sorted by the bottom of their base,
// and the progress bar over the one being harvested.
export class NodeView {
  private readonly sprites = new Map<number, GameObjects.Image>();
  private readonly bar: GameObjects.Graphics;
  private readonly scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
    this.bar = scene.add.graphics().setDepth(DEPTHS.worldUi);
  }

  update(nodes: readonly NodeState[], harvest: HarvestState | null): void {
    const live = new Set<number>();
    for (const n of nodes) {
      live.add(n.id);
      const def = nodeDef(n.nodeId);
      const bottom = n.y + NODE_SPRITE_DROP;
      const sprite = this.sprites.get(n.id) ?? this.create(n.id, bottom);
      sprite.setPosition(n.x, bottom).setDepth(n.y + def.feetBox.h / 2);
      const frame = n.uses > 0 ? def.sprite : def.depletedSprite;
      if (sprite.frame.name !== frame) sprite.setFrame(frame);
    }
    for (const [id, s] of this.sprites) {
      if (live.has(id)) continue;
      s.destroy();
      this.sprites.delete(id);
    }
    this.drawBar(nodes, harvest);
  }

  private create(id: number, bottom: number): GameObjects.Image {
    const sprite = this.scene.add.image(0, bottom, ATLAS_KEY).setOrigin(0.5, 1);
    this.sprites.set(id, sprite);
    return sprite;
  }

  private drawBar(nodes: readonly NodeState[], harvest: HarvestState | null): void {
    this.bar.clear();
    const n = harvest ? nodes.find((node) => node.id === harvest.nodeId) : undefined;
    const sprite = n ? this.sprites.get(n.id) : undefined;
    if (!harvest || !n || !sprite) return;
    const { w, h, gap, border } = HARVEST_BAR;
    const x = Math.round(n.x - w / 2);
    const y = Math.round(sprite.y - sprite.height - gap - h);
    const filled = Math.round((w * harvest.progress) / nodeDef(n.nodeId).harvestTicks);
    this.bar.fillStyle(colorOf(HARVEST_BAR.back)).fillRect(x - border, y - border, w + 2 * border, h + 2 * border);
    this.bar.fillStyle(colorOf(HARVEST_BAR.color)).fillRect(x, y, filled, h);
  }
}
