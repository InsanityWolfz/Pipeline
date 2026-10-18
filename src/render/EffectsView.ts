import { type Cameras, type GameObjects, type Scene } from 'phaser';
import {
  animFrames,
  ATLAS_KEY,
  DEPTHS,
  digitFrame,
  ENEMY_ANIMS,
  ENEMY_FX,
  FIRE_BURST,
  HUD_DIGITS,
  DEPOSIT_SWIRL,
  KO_FADE_MS,
  MUZZLE_FLASH,
  PICKUP_POPUP,
  PICKUP_SPARKLE,
} from '../data/assets';
import { CAMERA_LERP } from '../data/config';
import { enemyDef } from '../data/enemies';
import { ITEMS } from '../data/items';
import { OUTLINE_ID, hexToRgb, paletteHex } from '../data/palette';
import { DRAW_HEIGHT } from '../data/tube';
import type { SimEvents } from '../sim/events';
import { registerAnim } from './anims';

// One-shot effects driven by sim events: corpses, pickup sparkles and popups,
// fire bursts, muzzle flashes, the deposit swirl, and the KO fade. Nothing here feeds back into the sim.
export class EffectsView {
  private readonly scene: Scene;
  private readonly camera: Cameras.Scene2D.Camera;
  /** What the camera follows, re-followed after a KO. */
  private readonly followed: GameObjects.Sprite;
  /** Corpses still on screen; a KO clears them with the rest of the room. */
  private readonly corpses = new Set<GameObjects.Sprite>();

  constructor(scene: Scene, followed: GameObjects.Sprite) {
    this.scene = scene;
    this.camera = scene.cameras.main;
    this.followed = followed;
    registerAnim(scene, PICKUP_SPARKLE);
    registerAnim(scene, FIRE_BURST);
    registerAnim(scene, MUZZLE_FLASH);
    registerAnim(scene, DEPOSIT_SWIRL);
    for (const set of Object.values(ENEMY_ANIMS)) registerAnim(scene, set.death);
  }

  /** Plays the effects for events since the last frame. `player` is where the player stands now. */
  play(events: SimEvents, player: { x: number; y: number }): void {
    for (const d of events.deaths) this.corpse(d.enemyId, d.x, d.y, d.facing === 'left');
    events.pickups.forEach((p, i) => this.pickup(p.itemId, p.x, p.y, player, i));
    for (const b of events.bursts) this.burst(b.x, b.y, b.radius);
    for (const s of events.shots) this.muzzle(s.x, s.y);
    if (events.stashDeposits.length > 0) this.swirl(player);
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
    this.corpses.add(sprite);
    sprite.once('destroy', () => this.corpses.delete(sprite));
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

  /** Ley light spiralling up off the player's feet as the haul goes home. */
  private swirl(player: { x: number; y: number }): void {
    const sprite = this.scene.add.sprite(player.x, player.y, ATLAS_KEY, animFrames(DEPOSIT_SWIRL)[0]);
    sprite.setOrigin(0.5, 1).setDepth(player.y + DRAW_HEIGHT);
    sprite.once('animationcomplete', () => sprite.destroy());
    sprite.play(DEPOSIT_SWIRL.key);
  }

  /** A flash at the tube's mouth, at the height shots fly, in front of the player. */
  private muzzle(x: number, y: number): void {
    const sprite = this.scene.add.sprite(x, y - DRAW_HEIGHT, ATLAS_KEY, animFrames(MUZZLE_FLASH)[0]).setDepth(y + DRAW_HEIGHT);
    sprite.once('animationcomplete', () => sprite.destroy());
    sprite.play(MUZZLE_FLASH.key);
  }

  /** The burst drawn at its real radius, in front of what stands inside it. */
  private burst(x: number, y: number, radius: number): void {
    const sprite = this.scene.add.sprite(x, y, ATLAS_KEY, animFrames(FIRE_BURST)[0]).setDepth(y + radius);
    sprite.setScale((radius * 2) / sprite.width);
    sprite.play(FIRE_BURST.key);
    sprite.once('animationcomplete', () => sprite.destroy());
  }

  private pickup(itemId: string, x: number, y: number, player: { x: number; y: number }, index: number): void {
    const sparkle = this.scene.add.sprite(x, y, ATLAS_KEY, animFrames(PICKUP_SPARKLE)[0]).setDepth(DEPTHS.worldUi);
    sparkle.play(PICKUP_SPARKLE.key);
    sparkle.once('animationcomplete', () => sparkle.destroy());

    const icon = ITEMS[itemId]?.icon;
    if (!icon) return;
    const text = '+1';
    const iconX = text.length * HUD_DIGITS.advance + PICKUP_POPUP.gap;
    const glyphs = [...text].map((ch, i) =>
      this.scene.add.image(i * HUD_DIGITS.advance, 0, ATLAS_KEY, digitFrame(ch)).setOrigin(0, 0.5),
    );
    const iconImage = this.scene.add.image(iconX, 0, ATLAS_KEY, icon).setOrigin(0, 0.5);
    const parts: GameObjects.Image[] = [...glyphs, iconImage];
    const width = iconX + iconImage.width;
    const top = Math.round(player.y - PICKUP_POPUP.startHeight - index * PICKUP_POPUP.stack);
    const popup = this.scene.add.container(Math.round(player.x - width / 2), top, parts).setDepth(DEPTHS.worldUi);
    this.scene.tweens.add({
      targets: popup,
      y: top - PICKUP_POPUP.rise,
      alpha: 0,
      duration: PICKUP_POPUP.durationMs,
      onComplete: () => popup.destroy(),
    });
  }

  /**
   * Fades to dark and back. The sim has already reset, so the camera holds still
   * while it darkens, then jumps to the player at spawn and follows again.
   */
  private koFade(player: { x: number; y: number }): void {
    for (const corpse of this.corpses) {
      this.scene.tweens.killTweensOf(corpse);
      corpse.destroy();
    }
    this.camera.stopFollow();
    const [r, g, b] = hexToRgb(paletteHex(OUTLINE_ID));
    this.camera.fadeOut(KO_FADE_MS, r, g, b, (_cam: Cameras.Scene2D.Camera, progress: number) => {
      if (progress < 1) return;
      this.camera.centerOn(player.x, player.y);
      this.camera.startFollow(this.followed, true, CAMERA_LERP, CAMERA_LERP);
      this.camera.fadeIn(KO_FADE_MS, r, g, b);
    });
  }
}
