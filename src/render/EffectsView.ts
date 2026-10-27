import { type Cameras, type GameObjects, type Scene } from 'phaser';
import {
  animFrames,
  DEPTHS,
  FIRE_BURST,
  DEPOSIT_SWIRL,
  KO_FADE_MS,
  MELEE_SWOOSH,
  MUZZLE_FLASH,
  PICKUP_SPARKLE,
} from '../data/assets';
import { MELEE } from '../data/combat';
import { CAMERA_LERP, DOOR_FADE_MS } from '../data/config';
import { INK_ID, hexToRgb, paletteHex } from '../data/palette';
import { STAGE_SPRITES, SPLIT_FLASH } from '../data/stageAssets';
import { DRAW_HEIGHT } from '../data/tube';
import type { SimEvents } from '../sim/events';
import type { EnemyState } from '../sim/enemies';
import { registerAnim } from './anims';
import { colorOf } from './color';
import { burstTint, tintBurst } from './roundLook';
import { addVector, addVectorSprite } from './vector/textures';
import { settings } from './flow/settingsStore';
import { DissolveView } from './DissolveView';
import type { Particles } from './Particles';

/** Fades both cameras out over `ms` in colour `rgb`, calls `atDark`, and fades back in (SceneCameras.fadeThrough). */
export type FadeThrough = (atDark: () => void, ms: number, rgb: readonly [number, number, number]) => void;

// One-shot effects driven by sim events: deaths (076: dissolving, DissolveView), pickup sparkles,
// fire bursts, muzzle flashes, the punch's swoosh, the deposit swirl, and the KO fade. Nothing here feeds back into the sim.
export class EffectsView {
  private readonly scene: Scene;
  private readonly camera: Cameras.Scene2D.Camera;
  /** What the camera follows, re-followed after a KO. */
  private readonly followed: GameObjects.Image;
  /** Both cameras' fade to dark and back (SceneCameras.fadeThrough), which the KO's fade shares with the doors'. */
  private readonly fadeThrough: FadeThrough;
  /** 076: deaths dissolving; a KO clears them with the rest of the room. */
  readonly dissolves: DissolveView;
  /** Punch swooshes still drawn (023), for the test hook. */
  private live = 0;
  /** Split flashes still drawn (029). */
  private flashes = 0;

  /** `particles`: where the dissolves throw their motes (FeelView's, made after this view); `lastOf`: an enemy as last drawn. */
  constructor(scene: Scene, followed: GameObjects.Image, fadeThrough: FadeThrough, particles: () => Particles | undefined, lastOf: (id: number) => EnemyState | undefined) {
    this.scene = scene;
    this.dissolves = new DissolveView(scene, particles, lastOf);
    this.fadeThrough = fadeThrough;
    this.camera = scene.cameras.main;
    this.followed = followed;
    registerAnim(scene, PICKUP_SPARKLE);
    registerAnim(scene, FIRE_BURST);
    registerAnim(scene, MUZZLE_FLASH);
    registerAnim(scene, DEPOSIT_SWIRL);
  }

  /** Plays the effects for events since the last frame. `player` is where the player stands now. */
  play(events: SimEvents, player: { x: number; y: number }): void {
    for (const d of events.deaths) this.dissolves.start(d);
    this.dissolves.update(this.scene.game.loop.delta * this.scene.tweens.timeScale);
    for (const p of events.pickups) this.pickup(p.x, p.y);
    // 042.10: with Flashes off, no burst, muzzle or Split flash (nor the Cold Burst's frost tint on it).
    const flashes = settings().flashes;
    if (flashes) for (const b of events.bursts) this.burst(b.x, b.y, b.radius, burstTint(b.damageType));
    if (flashes) for (const s of events.shots) this.muzzle(s.x, s.y);
    for (const m of events.melees) this.swoosh(m.x, m.y, m.angle);
    if (flashes) for (const b of events.splits) this.splitFlash(b.x, b.y);
    // Banking (entering the foundry, or a pylon deposit) swirls ley light off the
    // player. Through a door or travel, it waits out the fade so it shows in the new room.
    if (events.banks.length > 0) {
      if (events.roomChanges.length > 0) this.scene.time.delayedCall(DOOR_FADE_MS * 2, () => this.swirl(player));
      else this.swirl(player);
    }
    // A KO's wake, or Continue's (042): the same fade in the foundry.
    if (events.woke) this.koFade(player);
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

  /** Splits still flashing (029), for the test hook. */
  get splitFlashes(): number {
    return this.flashes;
  }

  /** A Split (029): a star of ley light at shot height that swells and fades. */
  private splitFlash(x: number, y: number): void {
    const f = SPLIT_FLASH;
    const flash = addVector(this.scene, x, y - DRAW_HEIGHT, STAGE_SPRITES.splitFlash).setDepth(y + DRAW_HEIGHT);
    const base = flash.scale;
    flash.setScale(base * f.from);
    this.flashes += 1;
    this.scene.tweens.add({
      targets: flash,
      scale: base * f.to,
      alpha: 0,
      duration: f.ms,
      onComplete: () => {
        this.flashes -= 1;
        flash.destroy();
      },
    });
  }

  /** The burst drawn at its real radius, in front of what stands inside it, tinted for its element. */
  private burst(x: number, y: number, radius: number, tint: number | null): void {
    const sprite = addVectorSprite(this.scene, x, y, animFrames(FIRE_BURST)[0] ?? '').setDepth(y + radius);
    // 039.15: a Cold Burst's flash in frost colours.
    tintBurst(sprite, tint);
    sprite.setScale((radius * 2) / sprite.width);
    sprite.play(FIRE_BURST.key);
    sprite.once('animationcomplete', () => sprite.destroy());
  }

  /** The sparkle where an item was picked up; its count shows in the HUD's pickup feed (031), its slide in GroundItemView (021). */
  private pickup(x: number, y: number): void {
    const sparkle = addVectorSprite(this.scene, x, y, animFrames(PICKUP_SPARKLE)[0] ?? '').setDepth(DEPTHS.worldUi);
    sparkle.play(PICKUP_SPARKLE.key);
    sparkle.once('animationcomplete', () => sparkle.destroy());
  }

  /**
   * Fades to dark and back. The sim has already reset, so the camera holds still
   * while it darkens, then jumps to the player at spawn and follows again.
   */
  private koFade(player: { x: number; y: number }): void {
    this.dissolves.clear();
    this.camera.stopFollow();
    // The HUD fades with the world (016: it draws on its own camera); a door's fade asked for meanwhile joins this one.
    this.fadeThrough(() => {
      this.camera.centerOn(player.x, player.y);
      this.camera.startFollow(this.followed, true, CAMERA_LERP, CAMERA_LERP);
    }, KO_FADE_MS, hexToRgb(paletteHex(INK_ID)));
  }
}
