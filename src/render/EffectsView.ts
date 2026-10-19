import { type Cameras, type GameObjects, type Scene } from 'phaser';
import {
  animFrames,
  DEPTHS,
  ENEMY_ANIMS,
  ENEMY_FX,
  FIRE_BURST,
  DEPOSIT_SWIRL,
  KO_FADE_MS,
  MELEE_SWOOSH,
  MUZZLE_FLASH,
  PICKUP_POPUP,
  PICKUP_SPARKLE,
} from '../data/assets';
import { MELEE } from '../data/combat';
import { CAMERA_LERP, DOOR_FADE_MS } from '../data/config';
import { enemyDef } from '../data/enemies';
import { ITEMS } from '../data/items';
import { INK_ID, hexToRgb, paletteHex } from '../data/palette';
import { DRAW_HEIGHT } from '../data/tube';
import type { SimEvents } from '../sim/events';
import { registerAnim } from './anims';
import { colorOf } from './color';
import { phaserStyle } from './fonts';
import { addVector, addVectorSprite, textureScale } from './vector/textures';
import { UI_CAMERA } from './scale';

// One-shot effects driven by sim events: corpses, pickup sparkles and popups,
// fire bursts, muzzle flashes, the punch's swoosh, the deposit swirl, and the KO fade. Nothing here feeds back into the sim.
export class EffectsView {
  private readonly scene: Scene;
  private readonly camera: Cameras.Scene2D.Camera;
  /** What the camera follows, re-followed after a KO. */
  private readonly followed: GameObjects.Image;
  /** Corpses still on screen; a KO clears them with the rest of the room. */
  private readonly corpses = new Set<GameObjects.Sprite>();
  /** Punch swooshes still drawn (023), for the test hook. */
  private live = 0;

  constructor(scene: Scene, followed: GameObjects.Image) {
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
    for (const m of events.melees) this.swoosh(m.x, m.y, m.angle);
    // Banking (entering the foundry, or a pylon deposit) swirls ley light off the
    // player. Through a door or travel, it waits out the fade so it shows in the new room.
    if (events.banks.length > 0) {
      if (events.roomChanges.length > 0) this.scene.time.delayedCall(DOOR_FADE_MS * 2, () => this.swirl(player));
      else this.swirl(player);
    }
    if (events.ko) this.koFade(player);
  }

  private corpse(enemyId: string, x: number, y: number, flip: boolean): void {
    const def = enemyDef(enemyId);
    const death = ENEMY_ANIMS[def.anims]?.death;
    if (!death) return;
    const bottom = y + def.feetBox.h / 2;
    const sprite = addVectorSprite(this.scene, x, bottom, animFrames(death)[0] ?? '')
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

  /** Ley light spiralling up off the player's feet as the haul is banked. */
  private swirl(player: { x: number; y: number }): void {
    const sprite = addVectorSprite(this.scene, player.x, player.y, animFrames(DEPOSIT_SWIRL)[0] ?? '');
    sprite.setDepth(player.y + DRAW_HEIGHT);
    sprite.once('animationcomplete', () => sprite.destroy());
    sprite.play(DEPOSIT_SWIRL.key);
  }

  /** How many punch swooshes are still on screen. */
  get swooshes(): number {
    return this.live;
  }

  /** The punch's area (023): a pale slice from the feet at its real reach and arc, over the player and what it hits, fading out. */
  private swoosh(x: number, y: number, angle: number): void {
    const half = (MELEE.arcDegrees * Math.PI) / 360;
    const color = colorOf(MELEE_SWOOSH.color);
    const g = this.scene.add.graphics().setDepth(y + MELEE.reach);
    g.fillStyle(color, MELEE_SWOOSH.fillAlpha);
    g.slice(x, y, MELEE.reach, angle - half, angle + half, false);
    g.fillPath();
    g.lineStyle(MELEE_SWOOSH.rimWidth, color, MELEE_SWOOSH.rimAlpha);
    g.beginPath();
    g.arc(x, y, MELEE.reach, angle - half, angle + half, false);
    g.strokePath();
    this.live += 1;
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: MELEE_SWOOSH.ms,
      onComplete: () => {
        this.live -= 1;
        g.destroy();
      },
    });
  }

  /** A flash at the tube's mouth, at the height shots fly, in front of the player. */
  private muzzle(x: number, y: number): void {
    const sprite = addVectorSprite(this.scene, x, y - DRAW_HEIGHT, animFrames(MUZZLE_FLASH)[0] ?? '').setDepth(y + DRAW_HEIGHT);
    sprite.once('animationcomplete', () => sprite.destroy());
    sprite.play(MUZZLE_FLASH.key);
  }

  /** The burst drawn at its real radius, in front of what stands inside it. */
  private burst(x: number, y: number, radius: number): void {
    const sprite = addVectorSprite(this.scene, x, y, animFrames(FIRE_BURST)[0] ?? '').setDepth(y + radius);
    sprite.setScale((radius * 2) / sprite.width);
    sprite.play(FIRE_BURST.key);
    sprite.once('animationcomplete', () => sprite.destroy());
  }

  private pickup(itemId: string, x: number, y: number, player: { x: number; y: number }, index: number): void {
    const sparkle = addVectorSprite(this.scene, x, y, animFrames(PICKUP_SPARKLE)[0] ?? '').setDepth(DEPTHS.worldUi);
    sparkle.play(PICKUP_SPARKLE.key);
    sparkle.once('animationcomplete', () => sparkle.destroy());

    const icon = ITEMS[itemId]?.icon;
    if (!icon) return;
    // The label and icon rise and fade together.
    const top = Math.round(player.y - PICKUP_POPUP.startHeight - index * PICKUP_POPUP.stack);
    const label = this.scene.add.text(0, top, '+1', phaserStyle('float', textureScale())).setOrigin(0, 0.5);
    const iconImage = addVector(this.scene, 0, top, icon).setOrigin(0, 0.5);
    const width = label.width + PICKUP_POPUP.gap + iconImage.displayWidth;
    const left = Math.round(player.x - width / 2);
    label.setX(left);
    iconImage.setX(left + label.width + PICKUP_POPUP.gap);
    const parts = [label, iconImage];
    for (const p of parts) p.setDepth(DEPTHS.worldUi);
    this.scene.tweens.add({
      targets: parts,
      y: top - PICKUP_POPUP.rise,
      alpha: 0,
      duration: PICKUP_POPUP.durationMs,
      onComplete: () => parts.forEach((p) => p.destroy()),
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
    const [r, g, b] = hexToRgb(paletteHex(INK_ID));
    // The HUD fades with the world (016: it draws on its own camera).
    const ui = this.scene.cameras.getCamera(UI_CAMERA);
    ui?.fadeOut(KO_FADE_MS, r, g, b);
    this.camera.fadeOut(KO_FADE_MS, r, g, b, (_cam: Cameras.Scene2D.Camera, progress: number) => {
      if (progress < 1) return;
      this.camera.centerOn(player.x, player.y);
      this.camera.startFollow(this.followed, true, CAMERA_LERP, CAMERA_LERP);
      this.camera.fadeIn(KO_FADE_MS, r, g, b);
      ui?.fadeIn(KO_FADE_MS, r, g, b);
    });
  }
}
