import type { GameObjects, Scene } from 'phaser';
import { BlendModes, TintModes } from 'phaser';
import { animFrames, DEPTHS, ENEMY_ANIMS, ENEMY_FX } from '../data/assets';
import { HUSK_RIG, RESIN } from '../data/art/husk';
import { CORE, WARDEN_RIG } from '../data/art/warden';
import { IDLE_SPEED } from '../data/config';
import { enemyDef } from '../data/enemies';
import { CHAMPIONS } from '../data/champions';
import { LANDMARK_LOOK, LANDMARK_SPRITES } from '../data/landmarkAssets';
import { defOf } from '../sim/champions';
import { TextLine } from './textLine';
import type { EnemyState } from '../sim/enemies';
import type { SimState } from '../sim/state';
import type { Facing } from '../sim/player';
import { registerAnim } from './anims';
import { colorOf } from './color';
import { addVector, addVectorSprite, showFrame, textureScale } from './vector/textures';
import { CHILL_TINT, ICE_CRACK_TICKS, STAGE_SPRITES } from '../data/stageAssets';
import { COLD } from '../data/tags';
import { HOLLOWS_LOOK } from '../data/hollowsAssets';
import { bulwarkPose, drawSeam, riseShown } from './bulwarkLook';
import { drawTelegraph } from './telegraphs';
import { destroyHollowsArt, drawHollowsArt, makeHollowsArt, shownOf, type HollowsArt, type HollowsEnemiesShown } from './hollowsEnemyArt';

/** A champion's extras (032): its glow, and its name with its kind under it. */
interface ChampionArt {
  glow: GameObjects.Image;
  name: TextLine;
  kind: TextLine;
}

/** A champion as drawn, for the test hook: its id, the name and kind lines, its scale and glow's alpha. */
export interface ChampionShown {
  id: number;
  name: string;
  kind: string;
  scale: number;
  glow: number;
}

interface Drawn {
  sprite: GameObjects.Sprite;
  /** The sprite's scale at 1× (the bake's), before a champion's. */
  baseScale: number;
  champion?: ChampionArt;
  telegraph: GameObjects.Graphics;
  bar: GameObjects.Graphics;
  /** The ice round it while frozen (029), made on its first freeze. */
  ice?: GameObjects.Image;
  /** A Husk's resin drip and glint, or the Warden's core halo (018), or the Bulwark's seam halo (034). */
  overlay?: GameObjects.Graphics;
  /** A shielded enemy's facing angle last frame (034), and until when (scene ms) a change shows it shuffling round. */
  angle?: number;
  turnUntil?: number;
  /** Region 2's extras (035): a Burrower's ripple. */
  hollows?: HollowsArt | undefined;
}

/** `ui()`'s enemy part before the scene has built its views. */
export const NO_ENEMY_UI: { champions: ChampionShown[]; hollowsEnemies: HollowsEnemiesShown } = { champions: [], hollowsEnemies: { ripples: 0, flares: 0, lasers: [] } };

const viewOf = (f: Facing): 'down' | 'up' | 'side' => (f === 'up' || f === 'down' ? f : 'side');

// Draws live enemies from sim state: the animation for their mode and facing, a
// hit flash, a health bar once damaged, the cold on it (029) and the swipe
// telegraph on the ground.
export class EnemyView {
  private readonly drawn = new Map<number, Drawn>();
  /** Scene time each frozen enemy thaws at. */
  private readonly frozenUntil = new Map<number, number>();
  /** Each enemy as last drawn, for `ui`. */
  private readonly last = new Map<number, EnemyState>();
  private readonly scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
    for (const set of Object.values(ENEMY_ANIMS)) for (const anim of Object.values(set)) if (anim) registerAnim(scene, anim);
  }

  /** Hit-stop (014): holds a struck enemy's sprite still, pose and place, for `ms`. The sim runs on. */
  freeze(id: number, ms: number): void {
    this.frozenUntil.set(id, this.scene.time.now + ms);
  }

  /** `sim` for what an enemy's extras read beyond itself (035: a Sniper's laser runs to the player). */
  update(enemies: readonly EnemyState[], sim: SimState): void {
    const live = new Set<number>();
    const now = this.scene.time.now;
    this.last.clear();
    for (const e of enemies) {
      live.add(e.id);
      this.last.set(e.id, e);
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
      const def = defOf(e);
      const bottom = e.y + def.feetBox.h / 2;
      const anims = ENEMY_ANIMS[def.anims];
      if (!anims) throw new Error(`Unknown enemy anims '${def.anims}'`);
      // A champion (032) is drawn 1.5× its kind.
      d.sprite.setScale(d.baseScale * (e.champion ? CHAMPIONS.scale : 1));
      // An add rising (041) fades up from under the ground.
      const up = riseShown(e);
      d.sprite.setPosition(e.x, bottom + HOLLOWS_LOOK.addRise.sink * (1 - up)).setDepth(bottom).setFlipX(e.facing === 'left').setAlpha(up);
      // Switch only on a change, so a one-shot swipe holds its last frame instead of restarting.
      const view = viewOf(e.facing);
      if (d.angle !== undefined && Math.abs(d.angle - e.angle) > 1e-6) d.turnUntil = now + HOLLOWS_LOOK.turnHoldMs;
      d.angle = e.angle;
      // A shielded enemy (the Bulwark, 034; the Shardback, 035) shuffles round and rocks behind its shield on a block.
      const pose = def.shield ? bulwarkPose(e, now < (d.turnUntil ?? 0)) : poseOf(e);
      // Enemies without a recover pose stand idle through it.
      // Optional poses (`recover`, and the Bulwark's extras, 034) fall back to idle where an enemy has none.
      const anim = anims[`${pose}-${view}`] ?? anims[`idle-${view}`];
      const key = anim.key;
      if (d.sprite.anims.currentAnim?.key !== key) d.sprite.play(key);
      if (e.flash > 0) d.sprite.setTint(colorOf(ENEMY_FX.flashColor)).setTintMode(TintModes.FILL);
      else if (e.blockFlash > 0) d.sprite.setTint(colorOf(HOLLOWS_LOOK.block.color)).setTintMode(TintModes.MULTIPLY);
      else if (e.chill > 0 || e.frozen > 0) d.sprite.setTint(chillTint(e.frozen > 0 ? COLD.stacksToFreeze : e.chill)).setTintMode(TintModes.MULTIPLY);
      else d.sprite.clearTint();
      this.drawIce(d, e, bottom);
      const top = bottom - d.sprite.displayHeight * d.sprite.originY;
      this.drawBar(d.bar, e, top);
      if (d.champion) this.drawChampion(d.champion, e, bottom, top, now);
      drawTelegraph(d.telegraph, e);
      drawHollowsArt(d.hollows, d.sprite, e, def, sim, now);
      if (d.overlay && e.enemyId === RESIN.enemyId) this.drawResin(d.overlay, e, bottom, view, now);
      if (d.overlay && e.enemyId === CORE.enemyId) this.drawCore(d.overlay, e, bottom, view, now);
      if (d.overlay && def.kind === 'bulwark') drawSeam(d.overlay, e, bottom, view, now);
    }
    for (const [id, d] of this.drawn) {
      if (live.has(id)) continue;
      this.frozenUntil.delete(id);
      d.sprite.destroy();
      d.telegraph.destroy();
      d.bar.destroy();
      d.overlay?.destroy();
      d.ice?.destroy();
      destroyHollowsArt(d.hollows);
      d.champion?.glow.destroy();
      d.champion?.name.destroy();
      d.champion?.kind.destroy();
      this.drawn.delete(id);
    }
  }

  private create(e: EnemyState): Drawn {
    const anims = ENEMY_ANIMS[enemyDef(e.enemyId).anims];
    const first = anims ? animFrames(anims['idle-down'])[0] : undefined;
    const sprite = addVectorSprite(this.scene, 0, 0, first ?? '');
    const d: Drawn = {
      sprite,
      baseScale: sprite.scaleX,
      telegraph: this.scene.add.graphics().setDepth(DEPTHS.groundFx),
      bar: this.scene.add.graphics().setDepth(DEPTHS.worldUi),
      hollows: makeHollowsArt(this.scene, enemyDef(e.enemyId)),
    };
    if (e.champion) {
      // The glow sits under the ground decals (telegraphs) and the body, so both stay readable (032).
      const glow = addVector(this.scene, 0, 0, LANDMARK_SPRITES.championGlow).setTint(colorOf(CHAMPIONS.glow.color)).setBlendMode(BlendModes.ADD).setDepth(DEPTHS.glow);
      const name = new TextLine(this.scene, 0, 0, DEPTHS.worldUi, true, 'float').setFill(CHAMPIONS.barColor).set(e.champion.name);
      const kind = new TextLine(this.scene, 0, 0, DEPTHS.worldUi, true, 'label').set(`${enemyDef(e.enemyId).name}${LANDMARK_LOOK.championLabel.kindSuffix}`);
      d.champion = { glow, name, kind };
    }
    if (e.enemyId === RESIN.enemyId) d.overlay = this.scene.add.graphics();
    // The core's halo is light, added over the stone; so is the Bulwark's seam (034).
    if (e.enemyId === CORE.enemyId || enemyDef(e.enemyId).kind === 'bulwark') d.overlay = this.scene.add.graphics().setBlendMode(BlendModes.ADD);
    this.drawn.set(e.id, d);
    return d;
  }

  /** Frozen (029): encased in ice, the casing cracking over its last ticks; hidden otherwise. */
  private drawIce(d: Drawn, e: EnemyState, bottom: number): void {
    if (e.frozen <= 0) {
      d.ice?.setVisible(false);
      return;
    }
    const big = enemyDef(e.enemyId).boss;
    const cracked = e.frozen <= ICE_CRACK_TICKS;
    const frame = big ? (cracked ? STAGE_SPRITES.iceCaseLargeCracked : STAGE_SPRITES.iceCaseLarge) : cracked ? STAGE_SPRITES.iceCaseCracked : STAGE_SPRITES.iceCase;
    d.ice ??= addVector(this.scene, 0, 0, frame);
    if (d.ice.frame.name !== frame) showFrame(d.ice, frame);
    d.ice.setVisible(true).setPosition(e.x, bottom).setDepth(bottom + DEPTHS.overlayNudge);
  }

  /** A slow drop of resin falling from the binding, and a glint on the bead; out of step from Husk to Husk. Hidden from behind. */
  private drawResin(g: GameObjects.Graphics, e: EnemyState, bottom: number, view: 'down' | 'up' | 'side', now: number): void {
    g.clear();
    if (view === 'up') return;
    const k = HUSK_RIG.scale;
    const x = e.x + RESIN.blob[0] * k * (e.facing === 'left' ? -1 : 1);
    const y = bottom + RESIN.blob[1] * k;
    g.setDepth(bottom + DEPTHS.overlayNudge);
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
    g.setDepth(bottom + DEPTHS.overlayNudge);
    g.fillStyle(colorOf(CORE.haloColor), CORE.rest + (CORE.peak - CORE.rest) * pulse).fillCircle(x, y, CORE.halo * k * (1 + CORE.swell * pulse));
  }

  /** What the test hook's `ui()` reads here: the champions (032) and Region 2's four's extras (035). */
  get ui(): { champions: ChampionShown[]; hollowsEnemies: HollowsEnemiesShown } {
    const hollowsEnemies: HollowsEnemiesShown = { ripples: 0, flares: 0, lasers: [] };
    for (const [id, d] of this.drawn) if (this.last.has(id)) shownOf(id, this.last.get(id) as EnemyState, d.hollows, hollowsEnemies);
    return { champions: this.champions, hollowsEnemies };
  }

  /** The champions on show (032), for the test hook. */
  get champions(): ChampionShown[] {
    return [...this.drawn.entries()].flatMap(([id, d]) =>
      d.champion ? [{ id, name: d.champion.name.obj.text, kind: d.champion.kind.obj.text, scale: d.sprite.scaleX / d.baseScale, glow: d.champion.glow.alpha }] : [],
    );
  }

  /** A champion's soft glow round its body, pulsing slowly, and its name with its kind under it, over the health bar. */
  private drawChampion(c: ChampionArt, e: EnemyState, bottom: number, top: number, now: number): void {
    const G = CHAMPIONS.glow;
    const pulse = (Math.sin((now / G.pulseMs) * Math.PI * 2) + 1) / 2;
    const size = (G.radius * CHAMPIONS.scale) / LANDMARK_LOOK.championGlowPx;
    c.glow.setPosition(e.x, (bottom + top) / 2).setScale(size / textureScale()).setAlpha(G.alpha[0] + (G.alpha[1] - G.alpha[0]) * pulse);
    const L = LANDMARK_LOOK.championLabel;
    const { h, gap, border } = ENEMY_FX.healthBar;
    const kindY = Math.round(top - gap - h - border - L.rise - c.kind.lineHeight);
    c.kind.moveTo(Math.round(e.x - c.kind.width / 2), kindY);
    c.name.moveTo(Math.round(e.x - c.name.width / 2), kindY - L.gap - c.name.lineHeight);
  }

  /** A small bar over the sprite, only once the enemy has taken damage; a champion's is in its colour (032). */
  private drawBar(g: GameObjects.Graphics, e: EnemyState, top: number): void {
    g.clear();
    const max = defOf(e).maxHealth;
    if (e.health >= max) return;
    const { w, h, gap, border } = ENEMY_FX.healthBar;
    const x = Math.round(e.x - w / 2);
    const y = Math.round(top - gap - h);
    g.fillStyle(colorOf(ENEMY_FX.healthBarBack)).fillRect(x - border, y - border, w + 2 * border, h + 2 * border);
    g.fillStyle(colorOf(e.champion ? CHAMPIONS.barColor : ENEMY_FX.healthBarColor)).fillRect(x, y, Math.max(1, Math.round((w * e.health) / max)), h);
  }
}

/** A chilled enemy's multiply tint (029): white toward the chill colour, deeper per stack. */
function chillTint(stacks: number): number {
  const k = Math.min(1, stacks * CHILL_TINT.perStack);
  const to = colorOf(CHILL_TINT.color);
  const mix = (shift: number): number => Math.round(255 + (((to >> shift) & 0xff) - 255) * k) << shift;
  return mix(16) | mix(8) | mix(0);
}

function poseOf(e: EnemyState): 'idle' | 'walk' | 'windup' | 'swipe' | 'recover' | 'hit' | 'stun' | 'dig' | 'step' {
  if (e.flash > 0 && e.mode !== 'windup' && e.mode !== 'swipe') return 'hit';
  // 035: a Charger dazed by a wall, a Burrower digging in, a Sniper stepping out of cover.
  if (e.mode === 'stun' || e.mode === 'dig') return e.mode;
  if (e.mode === 'peek') return 'step';
  if (e.mode === 'windup' || e.mode === 'swipe' || e.mode === 'recover') return e.mode;
  return Math.hypot(e.vx, e.vy) >= IDLE_SPEED ? 'walk' : 'idle';
}
