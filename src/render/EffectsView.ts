import { type Cameras, type GameObjects, type Scene } from 'phaser';
import {
  animFrames,
  ATLAS_KEY,
  digitFrame,
  ENEMY_ANIMS,
  ENEMY_FX,
  HUD_DIGITS,
  KO_FADE_MS,
  PICKUP_POPUP,
  PICKUP_SPARKLE,
} from '../data/assets';
import { enemyDef } from '../data/enemies';
import { ITEMS } from '../data/items';
import { OUTLINE_ID, hexToRgb, paletteHex } from '../data/palette';
import type { SimEvents } from '../sim/events';
import { registerAnim } from './anims';

/** Popups float over the world but under the HUD. */
const WORLD_UI_DEPTH = 100_000;

// One-shot effects driven by sim events: corpses, pickup sparkles and popups,
// and the KO fade. Nothing here feeds back into the sim.
export class EffectsView {
  private readonly scene: Scene;
  private readonly camera: Cameras.Scene2D.Camera;

  constructor(scene: Scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
    registerAnim(scene, PICKUP_SPARKLE);
    for (const set of Object.values(ENEMY_ANIMS)) registerAnim(scene, set.death);
  }

  /** Plays the effects for events since the last frame. `player` is where the player stands now. */
  play(events: SimEvents, player: { x: number; y: number }): void {
    for (const d of events.deaths) this.corpse(d.enemyId, d.x, d.y, d.facing === 'left');
    events.pickups.forEach((p, i) => this.pickup(p.itemId, p.x, p.y, player, i));
    if (events.ko) this.koFade(player);
  }

  private corpse(enemyId: string, x: number, y: number, flip: boolean): void {
    const def = enemyDef(enemyId);
    const death = ENEMY_ANIMS[def.anims]?.death;
    if (!death) return;
    const bottom = y + def.feetBox.h / 2;
    const sprite = this.scene.add
      .sprite(x, bottom, ATLAS_KEY, animFrames(death)[0])
      .setOrigin(0.5, 1)
      .setDepth(bottom)
      .setFlipX(flip);
    sprite.play(death.key);
    sprite.once('animationcomplete', () => {
      this.scene.tweens.add({
        targets: sprite,
        alpha: 0,
        delay: ENEMY_FX.corpseLingerMs,
        duration: ENEMY_FX.corpseFadeMs,
        onComplete: () => sprite.destroy(),
      });
    });
  }

  private pickup(itemId: string, x: number, y: number, player: { x: number; y: number }, index: number): void {
    const sparkle = this.scene.add.sprite(x, y, ATLAS_KEY, animFrames(PICKUP_SPARKLE)[0]).setDepth(WORLD_UI_DEPTH);
    sparkle.play(PICKUP_SPARKLE.key);
    sparkle.once('animationcomplete', () => sparkle.destroy());

    const icon = ITEMS[itemId]?.icon;
    if (!icon) return;
    const parts: GameObjects.Image[] = [...'+1'].map((ch, i) =>
      this.scene.add.image(i * HUD_DIGITS.advance, 0, ATLAS_KEY, digitFrame(ch)).setOrigin(0, 0.5),
    );
    parts.push(this.scene.add.image(2 * HUD_DIGITS.advance + PICKUP_POPUP.gap, 0, ATLAS_KEY, icon).setOrigin(0, 0.5));
    const width = 2 * HUD_DIGITS.advance + PICKUP_POPUP.gap + (parts[2]?.width ?? 0);
    const top = Math.round(player.y - PICKUP_POPUP.startHeight - index * PICKUP_POPUP.stack);
    const popup = this.scene.add.container(Math.round(player.x - width / 2), top, parts).setDepth(WORLD_UI_DEPTH);
    this.scene.tweens.add({
      targets: popup,
      y: top - PICKUP_POPUP.rise,
      alpha: 0,
      duration: PICKUP_POPUP.durationMs,
      onComplete: () => popup.destroy(),
    });
  }

  /** Fades to dark and back; the sim has already reset, so re-centre on the player at the dark point. */
  private koFade(player: { x: number; y: number }): void {
    const [r, g, b] = hexToRgb(paletteHex(OUTLINE_ID));
    this.camera.fadeOut(KO_FADE_MS, r, g, b, (_cam: Cameras.Scene2D.Camera, progress: number) => {
      if (progress < 1) return;
      this.camera.centerOn(player.x, player.y);
      this.camera.fadeIn(KO_FADE_MS, r, g, b);
    });
  }
}
