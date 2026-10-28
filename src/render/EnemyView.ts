import type { GameObjects, Scene } from 'phaser';
import { settings } from './flow/settingsStore';
import { BlendModes, TintModes } from 'phaser';
import { animFrames, DEPTHS, ENEMY_ANIMS, ENEMY_FX } from '../data/assets';
import { RESIN } from '../data/art/husk';
import { CORE } from '../data/art/warden';
import { enemyDef } from '../data/enemies';
import { CHAMPIONS } from '../data/champions';
import { LANDMARK_LOOK, LANDMARK_SPRITES } from '../data/landmarkAssets';
import { defOf } from '../sim/champions';
import { TextLine } from './textLine';
import type { CatchView } from './lighting/CatchView';
import type { EnemyState } from '../sim/enemies';
import type { SimState } from '../sim/state';
import type { HitEvent } from '../sim/events';
import type { Facing } from '../sim/player';
import { registerAnim } from './anims';
import { colorOf } from './color';
import { addVector, addVectorSprite, showFrame } from './vector/textures';
import { COLD } from '../data/tags';
import { HOLLOWS_LOOK } from '../data/hollowsAssets';
import { drawSeam, riseShown } from './bulwarkLook';
import { chillTint, drawChampion, drawCore, drawFlames, drawIce, drawResin } from './enemyOverlays';
import { enemyArt, type EnemyArtShown } from './enemyArt';
import { introShort } from '../sim/bossIntro';
import { attacking, staggeredInTick } from './enemyReaction';
import { drawTelegraph } from './telegraphs';
import { destroyEnemyBar, drawEnemyBar, makeEnemyBar, type EnemyBar, type EnemyBarShown } from './enemyBar';
import { destroyHollowsArt, drawHollowsArt, makeHollowsArt, shownOf, type HollowsArt, type HollowsEnemiesShown } from './hollowsEnemyArt';

/** A champion's extras (032): its glow, and its name with its kind under it. */
export interface ChampionArt {
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
  bar: EnemyBar;
  /** The ice round it while frozen (029), made on its first freeze. */
  ice?: GameObjects.Image;
  /** The flames on it while burning (060), made on its first burn. */
  flames?: GameObjects.Image;
  /** A Husk's resin drip and glint, or the Warden's core halo (018), or the Bulwark's seam halo (034). */
  overlay?: GameObjects.Graphics;
  /** A shielded enemy's facing angle last frame (034), and until when (scene ms) a change shows it shuffling round. */
  angle?: number;
  turnUntil?: number;
  /** Region 2's extras (035): a Burrower's ripple. */
  hollows?: HollowsArt | undefined;
  /** Whether its telegraph last drew the Bulwark's back wave shaded (054). */
  waveShaded?: boolean;
  /**
   * 076: ms its stagger has run, or null: on the tween clock (a review shot can slow it), and held with the sprite
   * through hit-stop and freezing. The art it showed last frame, and the frame or anim it shows.
   */
  staggerMs: number | null;
  art?: EnemyArtShown;
  shown: string;
}

/** 076: an enemy's art as `ui().enemyArt` reports it. */
export interface EnemyArtUi {
  id: number;
  family: string;
  pose: string;
  phase: string | null;
  reaction: string | null;
  squash: number;
  frame: string;
  dx: number;
}

/** `ui()`'s enemy part before the scene has built its views. */
export const NO_ENEMY_UI: { champions: ChampionShown[]; hollowsEnemies: HollowsEnemiesShown; enemyBars: EnemyBarShown[]; enemyFlames: number; enemyArt: EnemyArtUi[] } = {
  champions: [],
  hollowsEnemies: { ripples: 0, flares: 0, lasers: [], waveShades: 0, beams: [], gusts: 0 },
  enemyBars: [],
  enemyFlames: 0,
  enemyArt: [],
};

/** No squash and no tremble: what a beam or laser starts from before its enemy's art is first worked out. */
const STILL = { squash: 0, dx: 0, dy: 0 } as const;
const viewOf = (f: Facing): 'down' | 'up' | 'side' => (f === 'up' || f === 'down' ? f : 'side');

// Draws live enemies from sim state: the animation for their mode and facing, a
// hit flash, a health bar once damaged, the cold on it (029) and the swipe
// telegraph on the ground.
export class EnemyView {
  private readonly drawn = new Map<number, Drawn>();
  /** 078: hit-stop holds since boot, and the last one's length (ms), for the hit feedback check. */
  holds = 0;
  holdMs = 0;
  /** Scene time each frozen enemy thaws at. */
  private readonly frozenUntil = new Map<number, number>();
  /** Each enemy as last drawn, for `ui`. */
  private readonly last = new Map<number, EnemyState>();
  private readonly scene: Scene;
  /** 076: enemies a tick's hits staggered since the last draw, until `update` starts their staggers. */
  private readonly staggered = new Set<number>();

  constructor(scene: Scene) {
    this.scene = scene;
    for (const set of Object.values(ENEMY_ANIMS)) for (const anim of Object.values(set)) if (anim) registerAnim(scene, anim);
  }

  /** Hit-stop (014): holds a struck enemy's sprite still, pose and place, for `ms`. The sim runs on. */
  freeze(id: number, ms: number): void {
    this.holds += 1;
    this.holdMs = ms;
    this.frozenUntil.set(id, this.scene.time.now + ms);
  }

  /** 080: an enemy's sprite as drawn (the boss phase looks sit on its frame), or undefined. */
  spriteOf(id: number): GameObjects.Sprite | undefined {
    return this.drawn.get(id)?.sprite;
  }

  /** An enemy as last drawn (076: a death's dissolve reads the Forgewright's bellows off it). */
  lastOf(id: number): EnemyState | undefined {
    return this.last.get(id);
  }

  /** 076: one sim tick's hits (review 7: weighed per tick, never summed over a slow frame), for `update`'s staggers. */
  react(hits: readonly HitEvent[], enemies: readonly EnemyState[]): void {
    const of = (id: number) => {
      const e = enemies.find((x) => x.id === id);
      return e && { maxHealth: defOf(e).maxHealth, boss: enemyDef(e.enemyId).boss };
    };
    for (const id of staggeredInTick(hits, of)) this.staggered.add(id);
  }

  /** `sim` for what an enemy's extras read beyond itself (035: a Sniper's laser runs to the player). */
  update(enemies: readonly EnemyState[], sim: SimState, catcher?: CatchView): void {
    const live = new Set<number>();
    const now = this.scene.time.now;
    const dt = this.scene.game.loop.delta * this.scene.tweens.timeScale;
    this.last.clear();
    for (const e of enemies) {
      live.add(e.id);
      this.last.set(e.id, e);
      const d = this.drawn.get(e.id) ?? this.create(e);
      // 076: a heavy frame's hits or a punch stagger it (its hit-stop holds the start); a wind-up or an attack cuts a stagger off at once.
      if (this.staggered.has(e.id)) d.staggerMs = -dt;
      if (attacking(e.mode)) d.staggerMs = null;
      const until = this.frozenUntil.get(e.id);
      if (until !== undefined && now < until) {
        d.sprite.anims.pause();
        catcher?.offer(d.sprite, d.sprite.x, d.sprite.y, 'enemy', e.id);
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
      const view = viewOf(e.facing);
      if (d.angle !== undefined && Math.abs(d.angle - e.angle) > 1e-6) d.turnUntil = now + HOLLOWS_LOOK.turnHoldMs;
      d.angle = e.angle;
      // Freezing (029) holds the sprite, pose and all, as hit-stop does.
      if (d.staggerMs !== null && e.frozen <= 0) d.staggerMs += dt;
      // Review 8: written into its own art object, kept from frame to frame.
      const art = e.frozen > 0 && d.art ? d.art : enemyArt(e, def, anims, view, now < (d.turnUntil ?? 0), d.staggerMs, now, d.art, e.mode === 'intro' && introShort(sim, e));
      d.art = art;
      this.show(d, art, e.frozen > 0);
      // A champion (032) is drawn 1.5× its kind; 076: squashed about its feet.
      const k = d.baseScale * (e.champion ? CHAMPIONS.scale : 1);
      d.sprite.setScale(k * (1 + art.squash), k * (1 - art.squash));
      // An add rising (041) fades up from under the ground. The peak's tremble is the sprite's own (076).
      const up = riseShown(e);
      d.sprite.setPosition(e.x + art.dx, bottom + HOLLOWS_LOOK.addRise.sink * (1 - up) + art.dy).setDepth(bottom).setFlipX(e.facing === 'left').setAlpha(up);
      // 042.10: with Flashes off the white hit flash becomes a short, dim tint.
      if (e.flash > 0 && settings().flashes) d.sprite.setTint(colorOf(ENEMY_FX.flashColor)).setTintMode(TintModes.FILL);
      else if (e.flash > 0) d.sprite.setTint(colorOf(ENEMY_FX.dimFlashColor)).setTintMode(TintModes.MULTIPLY);
      else if (e.blockFlash > 0) d.sprite.setTint(colorOf(HOLLOWS_LOOK.block.color)).setTintMode(TintModes.MULTIPLY);
      else if (e.chill > 0 || e.frozen > 0) d.sprite.setTint(chillTint(e.frozen > 0 ? COLD.stacksToFreeze : e.chill)).setTintMode(TintModes.MULTIPLY);
      else d.sprite.clearTint();
      drawIce(this.scene, d, e, bottom);
      drawFlames(this.scene, d, e, bottom, now);
      // 076: the bar and labels sit on its unsquashed height, so they don't bob.
      const top = bottom - d.sprite.height * d.baseScale * (e.champion ? CHAMPIONS.scale : 1) * d.sprite.originY;
      drawEnemyBar(this.scene, d.bar, e, top);
      if (d.champion) drawChampion(d.champion, e, bottom, top, now);
      d.waveShaded = drawTelegraph(d.telegraph, e);
      drawHollowsArt(d.hollows, d.sprite, e, def, sim, now, d.art ?? STILL);
      if (d.overlay && e.enemyId === RESIN.enemyId) drawResin(d.overlay, e, bottom, view, now);
      if (d.overlay && e.enemyId === CORE.enemyId) drawCore(d.overlay, e, bottom, view, now);
      if (d.overlay && def.kind === 'bulwark') drawSeam(d.overlay, e, bottom, view, now);
      // 074: a light near its feet catches on it, as posed this frame.
      catcher?.offer(d.sprite, e.x, bottom, 'enemy', e.id);
    }
    this.staggered.clear();
    for (const [id, d] of this.drawn) {
      if (live.has(id)) continue;
      this.frozenUntil.delete(id);
      d.sprite.destroy();
      d.telegraph.destroy();
      destroyEnemyBar(d.bar);
      d.overlay?.destroy();
      d.ice?.destroy();
      d.flames?.destroy();
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
      bar: makeEnemyBar(this.scene, e.id),
      hollows: makeHollowsArt(this.scene, enemyDef(e.enemyId)),
      staggerMs: null,
      shown: '',
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

  /** Plays its anim, or holds its strip or stagger frame (076), changing only on a change so a one-shot swipe holds its last frame. */
  private show(d: Drawn, art: EnemyArtShown, held: boolean): void {
    if (held) {
      d.sprite.anims.pause();
      return;
    }
    if (art.frame !== null) {
      if (d.shown !== art.frame) {
        d.sprite.anims.stop();
        showFrame(d.sprite, art.frame);
        d.shown = art.frame;
      }
      return;
    }
    if (d.shown !== art.anim.key || !d.sprite.anims.isPlaying) {
      if (d.shown === art.anim.key && d.sprite.anims.isPaused) d.sprite.anims.resume();
      else d.sprite.play(art.anim.key);
      d.shown = art.anim.key;
    }
  }

  /** What the test hook's `ui()` reads here: the champions (032), Region 2's four's extras (035) and the bars (054). */
  get ui(): typeof NO_ENEMY_UI {
    const hollowsEnemies: HollowsEnemiesShown = { ripples: 0, flares: 0, lasers: [], waveShades: 0, beams: [], gusts: 0 };
    for (const [id, d] of this.drawn) {
      if (this.last.has(id)) shownOf(id, this.last.get(id) as EnemyState, d.hollows, hollowsEnemies);
      if (d.waveShaded && d.telegraph.visible) hollowsEnemies.waveShades += 1;
    }
    const enemyFlames = [...this.drawn.values()].filter((d) => d.flames?.visible === true).length;
    return { champions: this.champions, hollowsEnemies, enemyBars: [...this.drawn.values()].map((d) => ({ ...d.bar.shown })), enemyFlames, enemyArt: this.art };
  }

  /** 076: each enemy's art as drawn: family, pose, wind-up phase, reaction, squash, frame and tremble. */
  get art(): EnemyArtUi[] {
    return [...this.drawn.entries()].flatMap(([id, d]) =>
      d.art ? [{ id, family: d.art.family, pose: d.art.pose, phase: d.art.phase, reaction: d.art.reaction, squash: d.art.squash, frame: d.sprite.frame.name, dx: d.art.dx }] : [],
    );
  }

  /** The champions on show (032), for the test hook. */
  get champions(): ChampionShown[] {
    return [...this.drawn.entries()].flatMap(([id, d]) =>
      d.champion ? [{ id, name: d.champion.name.obj.text, kind: d.champion.kind.obj.text, scale: d.sprite.scaleX / d.baseScale, glow: d.champion.glow.alpha }] : [],
    );
  }
}
