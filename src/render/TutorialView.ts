import type { GameObjects, Scene } from 'phaser';
import { ATLAS_KEY, DEPTHS } from '../data/assets';
import { TILE_SIZE } from '../data/config';
import { TUTORIAL_LAYOUT, TUTORIAL_SPRITES } from '../data/foundryAssets';
import type { GateId } from '../data/rooms';
import { roomById, type SimState } from '../sim/state';
import { doorOpen } from '../sim/tutorial';
import { registerAnim } from './anims';
import { addVector, showFrame } from './vector/textures';

// The tutorial's world pieces (012): the tube on its stone (then the bare stone),
// rubble over the foundry door and a ley barrier over the shrine door while their
// gates are shut, crumbling away as each opens.
export class TutorialView {
  private readonly scene: Scene;
  private readonly stone: GameObjects.Image;
  private seals: { gate: GateId; sprite: GameObjects.Sprite; fading: boolean }[] = [];
  private room = '';

  constructor(scene: Scene) {
    this.scene = scene;
    registerAnim(scene, TUTORIAL_SPRITES.barrier);
    this.stone = addVector(scene, 0, 0, TUTORIAL_SPRITES.stone).setVisible(false);
  }

  update(sim: SimState, shown: string): void {
    if (shown !== this.room) this.show(sim, shown);
    const stone = roomById(shown).tubeStone;
    this.stone.setVisible(stone !== undefined);
    if (stone) showFrame(this.stone, sim.hasTube ? TUTORIAL_SPRITES.stoneEmpty : TUTORIAL_SPRITES.stone);
    for (const seal of this.seals) {
      if (!doorOpen(sim, seal.gate) || seal.fading) continue;
      // The gate just opened: the seal crumbles away.
      seal.fading = true;
      this.scene.tweens.add({ targets: seal.sprite, alpha: 0, duration: TUTORIAL_LAYOUT.gateFadeMs, onComplete: () => seal.sprite.setVisible(false) });
    }
  }

  /** Lays the room's stone and seals when it comes on screen. */
  private show(sim: SimState, roomId: string): void {
    this.room = roomId;
    for (const s of this.seals) s.sprite.destroy();
    const room = roomById(roomId);
    this.seals = (room.doorways ?? []).flatMap((d) => {
      if (!d.gate || doorOpen(sim, d.gate)) return [];
      const bottom = (d.ty + 1) * TILE_SIZE;
      const sprite = this.scene.add.sprite(d.tx * TILE_SIZE, bottom, ATLAS_KEY).setOrigin(0, 1).setDepth(bottom + DEPTHS.tubeNudge);
      if (d.gate === 'shrine') sprite.play(TUTORIAL_SPRITES.barrier.key);
      else sprite.setFrame(TUTORIAL_SPRITES.rubble);
      return [{ gate: d.gate, sprite, fading: false }];
    });
    const stone = room.tubeStone;
    if (stone) {
      const bottom = (stone.ty + 1) * TILE_SIZE;
      this.stone.setPosition((stone.tx + 0.5) * TILE_SIZE, bottom).setDepth(bottom);
    }
  }
}
