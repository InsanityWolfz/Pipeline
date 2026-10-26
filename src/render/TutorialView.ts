import type { GameObjects, Scene, Tweens } from 'phaser';
import { DEPTHS } from '../data/assets';
import { TILE_SIZE } from '../data/config';
import { TUTORIAL_LAYOUT, TUTORIAL_SPRITES } from '../data/foundryAssets';
import type { GateId } from '../data/rooms';
import { roomById, type SimState } from '../sim/state';
import { doorOpen } from '../sim/tutorial';
import { addVector, addVectorSprite, showFrame } from './vector/textures';

// The tutorial's world pieces (012): the tube on its stone (then the bare stone), and (067) a pulsing ley shimmer
// over the foundry's stairs while its gate is shut, fading away as it opens.
export class TutorialView {
  private readonly scene: Scene;
  private readonly stone: GameObjects.Image;
  private seals: { gate: GateId; sprite: GameObjects.Sprite; fading: boolean; pulse: Tweens.Tween }[] = [];
  private room = '';

  constructor(scene: Scene) {
    this.scene = scene;
    this.stone = addVector(scene, 0, 0, TUTORIAL_SPRITES.stone).setVisible(false);
  }

  update(sim: SimState, shown: string): void {
    if (shown !== this.room) this.show(sim, shown);
    const stone = roomById(shown).tubeStone;
    this.stone.setVisible(stone !== undefined);
    if (stone) showFrame(this.stone, sim.hasTube ? TUTORIAL_SPRITES.stoneEmpty : TUTORIAL_SPRITES.stone);
    for (const seal of this.seals) {
      if (!doorOpen(sim, seal.gate) || seal.fading) continue;
      // The gate just opened: the seal fades away.
      seal.fading = true;
      seal.pulse.stop();
      this.scene.tweens.add({ targets: seal.sprite, alpha: 0, duration: TUTORIAL_LAYOUT.gateFadeMs, onComplete: () => seal.sprite.setVisible(false) });
    }
  }

  /** Lays the room's stone and seals when it comes on screen. */
  private show(sim: SimState, roomId: string): void {
    this.room = roomId;
    for (const s of this.seals) {
      s.pulse.stop();
      s.sprite.destroy();
    }
    const room = roomById(roomId);
    this.seals = (room.doorways ?? []).flatMap((d) => {
      if (!d.gate || doorOpen(sim, d.gate)) return [];
      const bottom = (d.ty + 1) * TILE_SIZE;
      const [low, high] = TUTORIAL_LAYOUT.shimmerAlpha;
      const sprite = addVectorSprite(this.scene, d.tx * TILE_SIZE, bottom, TUTORIAL_SPRITES.shimmer).setOrigin(0, 1).setDepth(bottom + DEPTHS.tubeNudge).setAlpha(high);
      const pulse = this.scene.tweens.add({ targets: sprite, alpha: low, duration: TUTORIAL_LAYOUT.shimmerMs, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      return [{ gate: d.gate, sprite, fading: false, pulse }];
    });
    const stone = room.tubeStone;
    if (stone) {
      const bottom = (stone.ty + 1) * TILE_SIZE;
      this.stone.setPosition((stone.tx + 0.5) * TILE_SIZE, bottom).setDepth(bottom);
    }
  }
}
