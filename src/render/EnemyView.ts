import type { GameObjects, Scene } from 'phaser';
import { BlendModes, TintModes } from 'phaser';
import { animFrames, DEPTHS, ENEMY_ANIMS, ENEMY_FX } from '../data/assets';
import { HUSK_RIG, RESIN } from '../data/art/husk';
import { CORE, WARDEN_RIG } from '../data/art/warden';
import { IDLE_SPEED } from '../data/config';
import { attackOf, enemyDef } from '../data/enemies';
import type { EnemyState } from '../sim/enemies';
import type { Facing } from '../sim/player';
import { registerAnim } from './anims';
import { colorOf } from './color';
import { addVectorSprite } from './vector/textures';

interface Drawn {
  sprite: GameObjects.Sprite;
  telegraph: GameObjects.Graphics;
  bar: GameObjects.Graphics;
  /** A Husk's resin drip and glint, or the Warden's core halo (018). */
  overlay?: GameObjects.Graphics;
}

const viewOf = (f: Facing): 'down' | 'up' | 'side' => (f === 'up' || f === 'down' ? f : 'side');

// Draws live enemies from sim state: the animation for their mode and facing, a
// hit flash, a health bar once damaged, the cold on it (029) and the swipe
// telegraph on the ground.
export class EnemyView {
  private readonly drawn = new Map<number, Drawn>();
  /** Scene time each frozen enemy thaws at. */
  private readonly frozenUntil = new Map<number, number>();
  private readonly scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
    for (const set of Object.values(ENEMY_ANIMS)) for (const anim of Object.values(set)) if (anim) registerAnim(scene, anim);
  }

  /** Hit-stop (014): holds a struck enemy's sprite still, pose and place, for `ms`. The sim runs on. */
  freeze(id: number, ms: number): void {
    this.frozenUntil.set(id, this.scene.time.now + ms);
  }

  update(enemies: readonly EnemyState[]): void {
    const live = new Set<number>();
    const now = this.scene.time.now;
    for (const e of enemies) {
      live.add(e.id);
      const d = this.drawn.get(e.id) ?? this.create(e);
      const until = this.frozenUntil.get(e.id);
      if (until !== undefined && now < until) {
        d.sprite.anims.pause();
        continue;
      }
      if (until !== undefined) {
        this.frozenUntil.delete(e.id);
        d.sprite.anims.resume();
      }
      const def = enemyDef(e.enemyId);
      const bottom = e.y + def.feetBox.h / 2;
      const anims = ENEMY_ANIMS[def.anims];
      if (!anims) throw new Error(`Unknown enemy anims '${def.anims}'`);
      d.sprite.setPosition(e.x, bottom).setDepth(bottom).setFlipX(e.facing === 'left');
      // Switch only on a change, so a one-shot swipe holds its last frame instead of restarting.
      const view = viewOf(e.facing);
      const pose = poseOf(e);
      // Enemies without a recover pose stand idle through it.
      const anim = pose === 'recover' ? (anims[`recover-${view}`] ?? anims[`idle-${view}`]) : anims[`${pose}-${view}`];
      const key = anim.key;
      if (d.sprite.anims.currentAnim?.key !== key) d.sprite.play(key);
      if (e.flash > 0) d.sprite.setTint(colorOf(ENEMY_FX.flashColor)).setTintMode(TintModes.FILL);
      else d.sprite.clearTint();
      this.drawBar(d.bar, e, bottom - d.sprite.displayHeight * d.sprite.originY);
      this.drawTelegraph(d.telegraph, e);
      if (d.overlay && e.enemyId === RESIN.enemyId) this.drawResin(d.overlay, e, bottom, view, now);
      if (d.overlay && e.enemyId === CORE.enemyId) this.drawCore(d.overlay, e, bottom, view, now);
    }
    for (const [id, d] of this.drawn) {
      if (live.has(id)) continue;
      this.frozenUntil.delete(id);
      d.sprite.destroy();
      d.telegraph.destroy();
      d.bar.destroy();
      d.overlay?.destroy();
      this.drawn.delete(id);
    }
  }

  private create(e: EnemyState): Drawn {
    const anims = ENEMY_ANIMS[enemyDef(e.enemyId).anims];
    const first = anims ? animFrames(anims['idle-down'])[0] : undefined;
    const d: Drawn = {
      sprite: addVectorSprite(this.scene, 0, 0, first ?? ''),
      telegraph: this.scene.add.graphics().setDepth(DEPTHS.groundFx),
      bar: this.scene.add.graphics().setDepth(DEPTHS.worldUi),
    };
    if (e.enemyId === RESIN.enemyId) d.overlay = this.scene.add.graphics();
    // The core's halo is light, added over the stone.
    if (e.enemyId === CORE.enemyId) d.overlay = this.scene.add.graphics().setBlendMode(BlendModes.ADD);
    this.drawn.set(e.id, d);
    return d;
  }

  /** A slow drop of resin falling from the binding, and a glint on the bead; out of step from Husk to Husk. Hidden from behind. */
  private drawResin(g: GameObjects.Graphics, e: EnemyState, bottom: number, view: 'down' | 'up' | 'side', now: number): void {
    g.clear();
    if (view === 'up') return;
    const k = HUSK_RIG.scale;
    const x = e.x + RESIN.blob[0] * k * (e.facing === 'left' ? -1 : 1);
    const y = bottom + RESIN.blob[1] * k;
    g.setDepth(bottom + DEPTHS.flameNudge);
    const { glint: gl, drop } = RESIN;
    const glint = (Math.sin(((now + e.id * RESIN.phase.glint) / RESIN.glintMs) * Math.PI * 2) + 1) / 2;
    g.fillStyle(colorOf(gl.color), glint * gl.alpha).fillCircle(x + gl.at[0] * k, y + gl.at[1] * k, gl.r);
    const t = (now + e.id * RESIN.phase.drip) % RESIN.dripMs;
    if (t >= RESIN.fallMs) return;
    const p = t / RESIN.fallMs;
    g.fillStyle(colorOf(drop.color), 1 - p).fillEllipse(x + drop.at[0] * k, y + drop.at[1] * k + RESIN.fallPx * p * p, drop.size[0], drop.size[1]);
  }

  /** A halo round the Warden's chest core: a faint glow at rest, pulsing hard through the wind-up. Hidden from behind. */
  private drawCore(g: GameObjects.Graphics, e: EnemyState, bottom: number, view: 'down' | 'up' | 'side', now: number): void {
    g.clear();
    if (view === 'up') return;
    const k = WARDEN_RIG.scale;
    const x = e.x + (view === 'side' ? CORE.side * (e.facing === 'left' ? -1 : 1) : CORE.at[0]) * k;
    const y = bottom + CORE.at[1] * k;
    const pulse = e.mode === 'windup' ? (Math.sin((now / CORE.pulseMs) * Math.PI * 2) + 1) / 2 : 0;
    g.setDepth(bottom + DEPTHS.flameNudge);
    g.fillStyle(colorOf(CORE.haloColor), CORE.rest + (CORE.peak - CORE.rest) * pulse).fillCircle(x, y, CORE.halo * k * (1 + CORE.swell * pulse));
  }

  /** A small bar over the sprite, only once the enemy has taken damage. */
  private drawBar(g: GameObjects.Graphics, e: EnemyState, top: number): void {
    g.clear();
    const max = enemyDef(e.enemyId).maxHealth;
    if (e.health >= max) return;
    const { w, h, gap, border } = ENEMY_FX.healthBar;
    const x = Math.round(e.x - w / 2);
    const y = Math.round(top - gap - h);
    g.fillStyle(colorOf(ENEMY_FX.healthBarBack)).fillRect(x - border, y - border, w + 2 * border, h + 2 * border);
    g.fillStyle(colorOf(ENEMY_FX.healthBarColor)).fillRect(x, y, Math.max(1, Math.round((w * e.health) / max)), h);
  }

  /**
   * The wind-up's telegraph, filling in as it runs: a Husk's swipe arc at its
   * real reach and angle, a Wisp's tightening ring and aim line, and the
   * Warden's slam circle at its real radius.
   */
  private drawTelegraph(g: GameObjects.Graphics, e: EnemyState): void {
    g.clear();
    if (e.mode !== 'windup') return;
    const def = enemyDef(e.enemyId);
    const progress = Math.min(1, e.modeTicks / attackOf(def).windupTicks);
    if (def.kind === 'caster') {
      const { castRing, castLine } = ENEMY_FX;
      const color = colorOf(ENEMY_FX.castColor);
      const top = e.y + def.hurtbox.offsetY;
      g.lineStyle(castRing.width, color, castRing.alphaFrom + (1 - castRing.alphaFrom) * progress);
      g.strokeCircle(e.x, top, castRing.from + (castRing.to - castRing.from) * progress);
      g.lineStyle(castLine.width, color, castLine.alpha);
      g.lineBetween(e.x, e.y, e.x + e.swipeDirX * castLine.length, e.y + e.swipeDirY * castLine.length);
      return;
    }
    if (def.kind === 'slammer') {
      const color = colorOf(ENEMY_FX.telegraphColor);
      g.fillStyle(color, ENEMY_FX.telegraphAlpha).fillCircle(e.x, e.y, def.slam.radius);
      g.fillStyle(color, ENEMY_FX.telegraphFillAlpha).fillCircle(e.x, e.y, def.slam.radius * progress);
      return;
    }
    const { swipe } = def;
    const angle = Math.atan2(e.swipeDirY, e.swipeDirX);
    const half = (swipe.arcDegrees * Math.PI) / 360;
    const color = colorOf(ENEMY_FX.telegraphColor);
    g.fillStyle(color, ENEMY_FX.telegraphAlpha);
    g.slice(e.x, e.y, swipe.reach, angle - half, angle + half, false);
    g.fillPath();
    g.fillStyle(color, ENEMY_FX.telegraphFillAlpha);
    g.slice(e.x, e.y, swipe.reach * progress, angle - half, angle + half, false);
    g.fillPath();
  }
}

function poseOf(e: EnemyState): 'idle' | 'walk' | 'windup' | 'swipe' | 'recover' | 'hit' {
  if (e.flash > 0 && e.mode !== 'windup' && e.mode !== 'swipe') return 'hit';
  if (e.mode === 'windup' || e.mode === 'swipe' || e.mode === 'recover') return e.mode;
  return Math.hypot(e.vx, e.vy) >= IDLE_SPEED ? 'walk' : 'idle';
}
