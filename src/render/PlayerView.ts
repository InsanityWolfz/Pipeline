import type { GameObjects, Scene, Textures } from 'phaser';
import { TintModes } from 'phaser';
import { PLAYER_HIT_FX, WANDERER_KEY } from '../data/assets';
import { WANDERER, WANDERER_FEEL, type WandererView } from '../data/art/wanderer';
import type { Rarity } from '../data/gear';
import { DYING_TICKS, FEET_BOX, HIT_INVULN_TICKS } from '../data/player';
import { STORM_ENEMY_LOOK } from '../data/stormcrownEnemyAssets';
import { aimFacing } from '../sim/direction';
import { shownFacing } from './playerFacing';
import { isRolling } from '../sim/movement';
import type { Facing, PlayerState } from '../sim/player';
import type { LinkState } from '../sim/link';
import type { TubeState } from '../sim/tube';
import { attuneBeat } from './attune';
import { colorOf } from './color';
import { PlayerClocks } from './playerClocks';
import { textureScale } from './vector/textures';
import { wandererAnim, wandererMotion } from './vector/wandererMotion';
import { drawWanderer, prebakeWanderer, REST_POSE, type WandererMarks, type WandererPose } from './vector/wandererRig';
import { activeScheme } from './wandererScheme';

/** The share of a death, at its end, over which the remains fade out. */
const DEATH_FADE_SHARE = 1 / 3;

const FEEL = WANDERER_FEEL;

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

/** 075: what the test hook's `ui().player` reports: the view and animation, the scheme and trim, the squash, where the hood is (world px from the feet), the mean draw time and whether the sprite is tinted. */
export interface PlayerUi {
  view: WandererView;
  anim: ReturnType<typeof wandererAnim>;
  scheme: string;
  trim: Rarity | null;
  squash: number;
  /** The stride's phase, radians (0 and each π: a contact, the feet furthest apart). */
  stride: number;
  hood: [number, number];
  /** 078: the tube's drawn muzzle, world px (not from the feet), or null with no tube in hand. */
  muzzle: { x: number; y: number } | null;
  drawMs: number;
  /** Whether the sprite carries a tint (only the hit's white flash: armour never tints the body). */
  tinted: boolean;
}

/** 075: read from the drawn texture only when the test hook's `wanderer()` asks: the drawn box (world px from the feet) and the colour at a corner of the cape's hem (the trim), or null where none shows. */
export interface PlayerPixels {
  bounds: { w: number; h: number; left: number; top: number } | null;
  hemColor: [number, number, number] | null;
}

// Draws the player from sim state (016): the wanderer rig posed each frame into a
// canvas texture. It stands on the bottom of the feet box and sorts by that point.
export class PlayerView {
  readonly sprite: GameObjects.Image;
  private readonly canvas: Textures.CanvasTexture;
  private readonly scale: number;
  private pose: WandererPose = { ...REST_POSE };
  private readonly clocks = new PlayerClocks();
  private readonly scheme = activeScheme();
  /** Test hook only: the idle clock held at this many ms (the breath, the sway, the trim's pulse and shimmer), or null to run. */
  pinnedMs: number | null = null;
  private anim: PlayerUi['anim'] = 'idle';
  private stride = 0;
  private marks: WandererMarks = { hood: [0, 0], hem: null, muzzle: null };
  private drawMs = 0;
  private lastX = 0;
  private lastY = 0;
  private lastTime = -1;
  /** The facing drawn last frame, or null before the first. */
  private facing: Facing | null = null;
  /** 065: the slow's wind curls round the legs, and whether they drew last frame (for `ui()`). */
  private readonly swirl: GameObjects.Graphics;
  swirling = false;

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
    this.swirl = scene.add.graphics();
    // 075: the wanderer's parts are baked at boot (in this page's scheme, nothing worn); another trim bakes when first worn.
    prebakeWanderer(this.scheme, null, this.scale);
  }

  /**
   * Draws the player; `shown` false hides them (they're in a room not yet on screen). `hasTube` false (012) draws them
   * empty-handed. 075: `trim` is the sim's worn rarity (render never ranks rarities), `tick` the sim's tick the clocks
   * count by. Armour shows only as the trim: the body is never tinted by its weight.
   */
  update(p: PlayerState, tube: TubeState, link: LinkState, trim: Rarity | null, hasTube: boolean, tick: number, shown = true): void {
    const now = this.sprite.scene.time.now;
    const dt = this.lastTime < 0 ? FEEL.frameMs : Math.min(FEEL.maxFrameMs, now - this.lastTime);
    this.lastTime = now;
    this.sprite.setVisible(shown);
    const bottom = p.y + FEET_BOX.h / 2;
    this.sprite.setPosition(p.x, bottom).setDepth(bottom);
    this.sprite.setAlpha(p.dying > 0 ? Math.min(1, p.dying / (DYING_TICKS * DEATH_FADE_SHARE)) : 1);

    this.pose = this.nextPose(p, tube, link, trim, hasTube, tick, now, dt);
    this.redraw(p);
    this.drawSwirl(p, bottom, now, shown);

    // Hit invulnerability flickers between a white flash and normal, starting white.
    const elapsed = HIT_INVULN_TICKS - p.hurtTicks;
    const white = p.hurtTicks > 0 && Math.floor(elapsed / PLAYER_HIT_FX.flickerTicks) % 2 === 0;
    if (white) this.sprite.setTint(colorOf(PLAYER_HIT_FX.flashColor)).setTintMode(TintModes.FILL);
    else this.sprite.clearTint();
  }

  /** 065: slowed, pale wind curls circle the legs, fading over the slow's last ticks; in front of the legs, behind nothing else. */
  private drawSwirl(p: PlayerState, bottom: number, now: number, shown: boolean): void {
    const S = STORM_ENEMY_LOOK.slow;
    const g = this.swirl.clear();
    this.swirling = shown && p.slowTicks > 0 && p.dying === 0;
    if (!this.swirling) return;
    const alpha = S.alpha * Math.min(1, p.slowTicks / S.fadeTicks);
    const turn = ((now % S.turnMs) / S.turnMs) * Math.PI * 2;
    g.setDepth(bottom + 0.5).lineStyle(S.width, colorOf(S.color), alpha);
    for (let i = 0; i < S.curls; i++) {
      const a = turn + (i * Math.PI * 2) / S.curls;
      g.beginPath();
      for (let k = 0; k <= S.points; k++) {
        const t = a + (k / S.points) * S.len;
        const x = p.x + Math.cos(t) * S.radius;
        const y = bottom - S.lift + Math.sin(t) * S.radius * S.squash - k * S.rise;
        if (k === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.strokePath();
    }
  }

  private nextPose(p: PlayerState, tube: TubeState, link: LinkState, trim: Rarity | null, hasTube: boolean, tick: number, now: number, dt: number): WandererPose {
    const rolling = isRolling(p);
    const dx = p.aimX - p.x;
    const dy = p.aimY - (p.y - FEEL.aimHeight);
    const ax = p.aimX - p.x;
    const ay = p.aimY - p.y;
    let facing = rolling ? p.facing : this.facing === null ? aimFacing(ax, ay, p.facing) : shownFacing(ax, ay, this.facing, FEEL.facingBand);
    // 075: the KO always plays side on, facing the side the aim was on (right when level).
    if (p.dying > 0) facing = ax < 0 ? 'left' : 'right';
    this.facing = facing;
    const view: WandererView = facing === 'up' || facing === 'down' ? facing : 'side';
    const moved = Math.hypot(p.x - this.lastX, p.y - this.lastY);
    this.lastX = p.x;
    this.lastY = p.y;
    const clocks = this.clocks.next({
      p,
      tube,
      hasTube,
      attuned: link.attuned,
      attuning: attuneBeat(link.attunePulse).gun,
      trim,
      scheme: this.scheme,
      tick,
      ms: this.pinnedMs ?? now,
      dtMs: dt,
      facing,
      aim: localAim(view, dx, dy, facing === 'left'),
      moved,
    });
    this.anim = wandererAnim(clocks);
    this.stride = clocks.stride;
    return wandererMotion(clocks);
  }

  /** 078: the tube's drawn muzzle this frame, world px, or null with no tube in hand (or none shown). */
  get muzzle(): { x: number; y: number } | null {
    const m = this.marks.muzzle;
    if (!m || !this.sprite.visible) return null;
    this.muzzleAt.x = this.sprite.x + m[0];
    this.muzzleAt.y = this.sprite.y + m[1];
    return this.muzzleAt;
  }

  private readonly muzzleAt = { x: 0, y: 0 };

  /** 075: what `ui().player` reports. */
  get ui(): PlayerUi {
    return {
      view: this.pose.view,
      anim: this.anim,
      scheme: this.pose.scheme,
      trim: this.pose.trim,
      squash: this.pose.squash,
      stride: this.stride,
      hood: this.marks.hood,
      muzzle: this.muzzle,
      drawMs: this.drawMs,
      tinted: this.sprite.isTinted,
    };
  }

  /** 075: the drawn texture's box and hem colour (scans pixels, so only the test hook's `wanderer()` asks). */
  pixels(): PlayerPixels {
    return { bounds: this.drawnBounds(), hemColor: this.colorAt(this.marks.hem) };
  }

  /** The drawn colour at a point, world px from the feet. */
  private colorAt(at: [number, number] | null): [number, number, number] | null {
    if (!at) return null;
    const s = this.scale;
    const [ax, ay] = WANDERER.box.anchor;
    // The stroke's core, not an anti-aliased edge: the brightest pixel of the 3×3 round the point (the trim is lighter
    // than the cape and outline it lies on).
    const d = this.canvas.context.getImageData(Math.round((at[0] + ax) * s) - 1, Math.round((at[1] + ay) * s) - 1, 3, 3).data;
    let best: [number, number, number] = [0, 0, 0];
    for (let i = 0; i + 2 < d.length; i += 4) {
      const px: [number, number, number] = [d[i] ?? 0, d[i + 1] ?? 0, d[i + 2] ?? 0];
      if (px[0] + px[1] + px[2] > best[0] + best[1] + best[2]) best = px;
    }
    return best;
  }

  /** The drawn pixels' box in world px, from the feet (the texture's alpha above a quarter), or null when nothing shows. */
  private drawnBounds(): PlayerPixels['bounds'] {
    const { width, height } = this.canvas;
    const data = this.canvas.context.getImageData(0, 0, width, height).data;
    let [x0, y0, x1, y1] = [width, height, -1, -1];
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        if ((data[(y * width + x) * 4 + 3] ?? 0) < 64) continue;
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
    if (x1 < 0) return null;
    const s = this.scale;
    const [ax, ay] = WANDERER.box.anchor;
    return { w: (x1 - x0 + 1) / s, h: (y1 - y0 + 1) / s, left: x0 / s - ax, top: y0 / s - ay };
  }

  private redraw(p: PlayerState): void {
    const c = this.canvas.context;
    const s = this.scale;
    const t0 = performance.now();
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
    this.marks = drawWanderer(c, this.pose, s);
    // 075: the wanderer's draw time (the rig's drawing, not the texture's upload), a running mean over about a second of frames.
    this.drawMs += (performance.now() - t0 - this.drawMs) * 0.05;
    this.canvas.refresh();
  }
}
