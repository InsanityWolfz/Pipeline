import type { GameObjects, Scene, Textures } from 'phaser';
import { TintModes } from 'phaser';
import { PLAYER_HIT_FX, WANDERER_KEY } from '../data/assets';
import { WANDERER, WANDERER_FEEL, type WandererView } from '../data/art/wanderer';
import { MELEE } from '../data/combat';
import { IDLE_SPEED } from '../data/config';
import { DYING_TICKS, FEET_BOX, HIT_INVULN_TICKS } from '../data/player';
import { ARMOR_TINTS } from '../data/hudLayout';
import { aimFacing } from '../sim/direction';
import { wornPieces, wornRelic } from '../sim/stats';
import type { SimState } from '../sim/state';
import { isRolling } from '../sim/movement';
import type { Facing, PlayerState } from '../sim/player';
import type { LinkState } from '../sim/link';
import type { TubeState } from '../sim/tube';
import { attuneBeat } from './attune';
import { colorOf } from './color';
import { textureScale } from './vector/textures';
import { drawWanderer, REST_POSE, type WandererPose } from './vector/wandererRig';

/** The share of a death, at its end, over which the remains fade out. */
const DEATH_FADE_SHARE = 1 / 3;

/** A multiply tint that leaves a corner's colour as drawn. */
const UNTINTED = 0xffffff;

const FEEL = WANDERER_FEEL;

const viewOf = (f: Facing): WandererView => (f === 'up' || f === 'down' ? f : 'side');

/** How the worn body piece shades the body (010): by its weight, Featherplate (036) without heavy plate's slow look. */
export type BodyLook = keyof typeof ARMOR_TINTS;

/** The worn body piece's look, or null with no body piece worn. */
export function bodyLook(sim: Pick<SimState, 'gear' | 'equipped'>): BodyLook | null {
  const body = wornPieces(sim).find((p) => p.slot === 'body');
  if (!body?.weight) return null;
  return wornRelic(sim, 'feather') ? 'feather' : body.weight;
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** How far out a punch (023) is, 0..1, from the sim's melee cooldown: full on its tick, easing back over `FEEL.jab.ticks`. */
function jabOf(tube: Pick<TubeState, 'meleeCooldown'>): number {
  if (tube.meleeCooldown <= 0) return 0;
  const t = (MELEE.cooldownTicks - tube.meleeCooldown) / FEEL.jab.ticks;
  return t >= 1 ? 0 : 1 - t * t;
}

/** The tube's local angle for the view: side aims within ±spread of level, down and up around straight down and up. */
function localAim(view: WandererView, dx: number, dy: number, flip: boolean): number {
  const a = FEEL.aimSpread;
  if (view === 'side') return clamp(Math.atan2(dy, flip ? -dx : dx), -a, a);
  const angle = Math.atan2(dy, dx);
  const axis = view === 'down' ? Math.PI / 2 : -Math.PI / 2;
  let off = angle - axis;
  while (off > Math.PI) off -= Math.PI * 2;
  while (off < -Math.PI) off += Math.PI * 2;
  return axis + clamp(off, -a, a);
}

// Draws the player from sim state (016): the wanderer rig posed each frame into a
// canvas texture. It stands on the bottom of the feet box and sorts by that point.
export class PlayerView {
  readonly sprite: GameObjects.Image;
  private readonly canvas: Textures.CanvasTexture;
  private readonly scale: number;
  private pose: WandererPose = { ...REST_POSE };
  private lastX = 0;
  private lastY = 0;
  private flapClock = 0;
  private lastTime = -1;

  constructor(scene: Scene) {
    this.scale = textureScale();
    const [w, h] = WANDERER.box.size;
    // Textures are the game's, not the scene's: an earlier game's (before Quit to title) is still there.
    if (scene.textures.exists(WANDERER_KEY)) scene.textures.remove(WANDERER_KEY);
    const canvas = scene.textures.createCanvas(WANDERER_KEY, Math.ceil(w * this.scale), Math.ceil(h * this.scale));
    if (!canvas) throw new Error('Could not create the wanderer canvas');
    this.canvas = canvas;
    this.sprite = scene.add
      .image(0, 0, WANDERER_KEY)
      .setScale(1 / this.scale)
      .setOrigin(WANDERER.box.anchor[0] / w, WANDERER.box.anchor[1] / h);
  }

  /** Draws the player; `shown` false hides them (they're in a room not yet on screen). `hasTube` false (012) draws them empty-handed. */
  update(p: PlayerState, tube: TubeState, link: LinkState, armor: BodyLook | null, hasTube: boolean, shown = true): void {
    const now = this.sprite.scene.time.now;
    const dt = this.lastTime < 0 ? FEEL.frameMs : Math.min(FEEL.maxFrameMs, now - this.lastTime);
    this.lastTime = now;
    this.sprite.setVisible(shown);
    const bottom = p.y + FEET_BOX.h / 2;
    this.sprite.setPosition(p.x, bottom).setDepth(bottom);
    this.sprite.setAlpha(p.dying > 0 ? Math.min(1, p.dying / (DYING_TICKS * DEATH_FADE_SHARE)) : 1);

    this.pose = this.nextPose(p, tube, link, hasTube, dt);
    this.redraw(p);

    // Hit invulnerability flickers between a white flash and normal, starting white.
    const elapsed = HIT_INVULN_TICKS - p.hurtTicks;
    const white = p.hurtTicks > 0 && Math.floor(elapsed / PLAYER_HIT_FX.flickerTicks) % 2 === 0;
    if (white) this.sprite.setTint(colorOf(PLAYER_HIT_FX.flashColor)).setTintMode(TintModes.FILL);
    else if (armor) {
      // A worn body piece shades the body below the hood by its weight (Featherplate, 036, as light: no slow look).
      const body = colorOf(ARMOR_TINTS[armor]);
      this.sprite.setTint(UNTINTED, UNTINTED, body, body).setTintMode(TintModes.MULTIPLY);
    } else this.sprite.clearTint();
  }

  private nextPose(p: PlayerState, tube: TubeState, link: LinkState, hasTube: boolean, dt: number): WandererPose {
    const prev = this.pose;
    const frames = dt / FEEL.frameMs;
    const k = 1 - Math.pow(1 - FEEL.ease, frames);
    const ease = (from: number, to: number): number => from + (to - from) * k;

    const rolling = isRolling(p);
    const dx = p.aimX - p.x;
    const dy = p.aimY - (p.y - FEEL.aimHeight);
    const facing = rolling ? p.facing : aimFacing(p.aimX - p.x, p.aimY - p.y, p.facing);
    const view = viewOf(facing);
    const flip = facing === 'left';
    const heavy = hasTube && tube.firing;
    const shot = heavy && tube.shotCount > 0;
    const hit = p.hurtTicks > HIT_INVULN_TICKS - PLAYER_HIT_FX.poseTicks;
    const dying = p.dying > 0 ? 1 - p.dying / DYING_TICKS : 0;
    const jab = rolling || dying > 0 ? 0 : jabOf(tube);

    let target: { lean: number; crouch: number; stance: number; push: number } = { lean: 0, crouch: 0, stance: WANDERER.rig.restStance, push: 0 };
    if (heavy) target = { ...FEEL.firing };
    if (hit) target = { ...target, lean: FEEL.hit.lean, push: FEEL.hit.push };
    if (rolling) target = { ...target, lean: FEEL.roll.lean, crouch: FEEL.roll.crouch, stance: FEEL.roll.stance, push: 0 };
    if (dying > 0) target = { lean: FEEL.death.lean * dying, crouch: FEEL.death.crouch * dying, stance: FEEL.death.stance, push: 0 };

    const moved = Math.hypot(p.x - this.lastX, p.y - this.lastY);
    this.lastX = p.x;
    this.lastY = p.y;
    const walking = !rolling && Math.hypot(p.vx, p.vy) >= IDLE_SPEED;
    this.flapClock += dt * FEEL.flapSpeed;
    const swing = heavy ? FEEL.flap.firing : walking ? FEEL.flap.walk : FEEL.flap.rest;

    return {
      view,
      flip,
      aim: localAim(view, dx, dy, flip),
      lean: ease(prev.lean, target.lean) + (shot ? FEEL.shot.lean : 0) + jab * FEEL.jab.lean,
      crouch: ease(prev.crouch, target.crouch),
      stance: ease(prev.stance, target.stance),
      push: ease(prev.push, target.push) + (shot ? FEEL.shot.push : 0) + jab * FEEL.jab.push,
      kick: shot ? FEEL.shot.kick : prev.kick * Math.pow(FEEL.kickDecay, frames),
      stride: walking ? prev.stride + moved * FEEL.stride : prev.stride,
      stepping: ease(prev.stepping, walking ? 1 : 0),
      flap: Math.sin(this.flapClock) * swing,
      flow: prev.flow + dt * (heavy ? FEEL.flow.firing : FEEL.flow.idle),
      glow: (shot ? FEEL.glow.shot : FEEL.glow.rest + FEEL.glow.pulse * Math.sin(this.sprite.scene.time.now * FEEL.glow.speed)) * (1 - dying),
      hasTube,
      attuned: link.attuned,
      attuning: attuneBeat(link.attunePulse).gun,
      muzzle: shot ? FEEL.muzzle.shot : FEEL.muzzle.rest,
      jab,
    };
  }

  private redraw(p: PlayerState): void {
    const c = this.canvas.context;
    const s = this.scale;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    c.setTransform(s, 0, 0, s, WANDERER.box.anchor[0] * s, WANDERER.box.anchor[1] * s);
    if (isRolling(p)) {
      // The roll's smear: fading copies trail behind along the roll.
      for (const back of FEEL.smear.steps) {
        c.save();
        c.globalAlpha = FEEL.smear.alpha;
        c.translate(-p.rollDirX * back, -p.rollDirY * back);
        drawWanderer(c, this.pose, s);
        c.restore();
      }
    }
    drawWanderer(c, this.pose, s);
    this.canvas.refresh();
  }
}
