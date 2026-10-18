import type { GameObjects, Scene, Textures } from 'phaser';
import { TintModes } from 'phaser';
import { PLAYER_HIT_FX, WANDERER_KEY } from '../data/assets';
import { WANDERER, type WandererView } from '../data/art/wanderer';
import { IDLE_SPEED } from '../data/config';
import { DYING_TICKS, FEET_BOX, HIT_INVULN_TICKS } from '../data/player';
import { ATTUNE_TICKS } from '../data/tube';
import type { ArmorWeight } from '../data/armor';
import { ARMOR_TINTS } from '../data/hudLayout';
import { aimFacing } from '../sim/direction';
import { isRolling } from '../sim/movement';
import type { Facing, PlayerState } from '../sim/player';
import type { LinkState } from '../sim/link';
import type { TubeState } from '../sim/tube';
import { colorOf } from './color';
import { textureScale } from './vector/textures';
import { drawWanderer, REST_POSE, type WandererPose } from './vector/wandererRig';

/** The share of a death, at its end, over which the remains fade out. */
const DEATH_FADE_SHARE = 1 / 3;

/** A multiply tint that leaves a corner's colour as drawn. */
const UNTINTED = 0xffffff;

/**
 * How the body carries the tube's weight (016): render-side feel, in style-test px
 * and radians. Firing braces (wider stance, crouch, lean back); each shot shoves.
 */
const FEEL = {
  firing: { lean: -0.16, crouch: 2.2, stance: 8.5, push: -2.5 },
  shot: { kick: 3.5, lean: -0.05, push: -1 },
  hit: { lean: 0.2, push: -2 },
  roll: { lean: 0.55, crouch: 9, stance: 3 },
  death: { lean: -1.2, crouch: 10 },
  /** Ease per 60 Hz frame toward the target pose, and kick decay. */
  ease: 0.2,
  kickDecay: 0.7,
  /** Stride radians per world px walked. */
  stride: 0.32,
  /** Cloak flap: speed (radians per ms) and swing at rest, walking and firing. */
  flapSpeed: 0.009,
  flap: { rest: 0.04, walk: 0.08, firing: 0.15 },
  /** Face glow: rest, pulse depth and speed, and on a shot. */
  glow: { rest: 0.78, pulse: 0.12, speed: 0.004, shot: 1 },
  /** Hose and tank flow, px per ms: idle and firing. */
  flow: { idle: 0.01, firing: 0.09 },
  /** The roll's smear: ghost copies this far back along the roll, world px, at this opacity. */
  smear: { steps: [10, 5], alpha: 0.22 },
  /** The tube's aim is limited to this far either side of each view's axis. */
  aimSpread: 0.85,
  /** Aim from this high above the feet, world px. */
  aimHeight: 14,
} as const;

const viewOf = (f: Facing): WandererView => (f === 'up' || f === 'down' ? f : 'side');

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

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
    const canvas = scene.textures.createCanvas(WANDERER_KEY, Math.ceil(w * this.scale), Math.ceil(h * this.scale));
    if (!canvas) throw new Error('Could not create the wanderer canvas');
    this.canvas = canvas;
    this.sprite = scene.add
      .image(0, 0, WANDERER_KEY)
      .setScale(1 / this.scale)
      .setOrigin(WANDERER.box.anchor[0] / w, WANDERER.box.anchor[1] / h);
  }

  /** Draws the player; `shown` false hides them (they're in a room not yet on screen). `hasTube` false (012) draws them empty-handed. */
  update(p: PlayerState, tube: TubeState, link: LinkState, armor: ArmorWeight | null, hasTube: boolean, shown = true): void {
    const now = this.sprite.scene.time.now;
    const dt = this.lastTime < 0 ? 16.7 : Math.min(100, now - this.lastTime);
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
      // Worn armor shades the body below the hood by its weight.
      const body = colorOf(ARMOR_TINTS[armor]);
      this.sprite.setTint(UNTINTED, UNTINTED, body, body).setTintMode(TintModes.MULTIPLY);
    } else this.sprite.clearTint();
  }

  private nextPose(p: PlayerState, tube: TubeState, link: LinkState, hasTube: boolean, dt: number): WandererPose {
    const prev = this.pose;
    const frames = dt / 16.7;
    const k = 1 - Math.pow(1 - FEEL.ease, frames);
    const ease = (from: number, to: number): number => from + (to - from) * k;

    const rolling = isRolling(p);
    const dx = p.aimX - p.x;
    const dy = p.aimY - (p.y - FEEL.aimHeight);
    const facing = rolling ? p.facing : aimFacing(p.aimX - p.x, p.aimY - p.y, p.facing);
    const view = viewOf(facing);
    const flip = facing === 'left';
    const heavy = hasTube && tube.firing && !tube.dry;
    const shot = heavy && tube.shotCount > 0;
    const hit = p.hurtTicks > HIT_INVULN_TICKS - PLAYER_HIT_FX.poseTicks;
    const dying = p.dying > 0 ? 1 - p.dying / DYING_TICKS : 0;

    let target = { lean: 0, crouch: 0, stance: 5, push: 0 };
    if (heavy) target = { ...FEEL.firing };
    if (hit) target = { ...target, lean: FEEL.hit.lean, push: FEEL.hit.push };
    if (rolling) target = { ...target, lean: FEEL.roll.lean, crouch: FEEL.roll.crouch, stance: FEEL.roll.stance, push: 0 };
    if (dying > 0) target = { lean: FEEL.death.lean * dying, crouch: FEEL.death.crouch * dying, stance: 7, push: 0 };

    const moved = Math.hypot(p.x - this.lastX, p.y - this.lastY);
    this.lastX = p.x;
    this.lastY = p.y;
    const walking = !rolling && Math.hypot(p.vx, p.vy) >= IDLE_SPEED;
    this.flapClock += dt * FEEL.flapSpeed;
    const swing = heavy ? FEEL.flap.firing : walking ? FEEL.flap.walk : FEEL.flap.rest;

    return {
      view,
      flip,
      aim: hasTube ? localAim(view, dx, dy, flip) : prev.aim,
      lean: ease(prev.lean, target.lean) + (shot ? FEEL.shot.lean : 0),
      crouch: ease(prev.crouch, target.crouch),
      stance: ease(prev.stance, target.stance),
      push: ease(prev.push, target.push) + (shot ? FEEL.shot.push : 0),
      kick: shot ? FEEL.shot.kick : prev.kick * Math.pow(FEEL.kickDecay, frames),
      stride: walking ? prev.stride + moved * FEEL.stride : prev.stride,
      stepping: ease(prev.stepping, walking ? 1 : 0),
      flap: Math.sin(this.flapClock) * swing,
      flow: prev.flow + dt * (heavy ? FEEL.flow.firing : FEEL.flow.idle),
      glow: (shot ? FEEL.glow.shot : FEEL.glow.rest + FEEL.glow.pulse * Math.sin(this.sprite.scene.time.now * FEEL.glow.speed)) * (1 - dying),
      hasTube,
      attuned: link.attuned,
      attuning: link.attunePulse > 0 ? 1 - link.attunePulse / ATTUNE_TICKS : null,
      muzzle: shot ? 1 : 0.6,
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
