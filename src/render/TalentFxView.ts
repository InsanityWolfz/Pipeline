import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { FEET_BOX } from '../data/player';
import { BURNING_LOOK, KEYSTONE_LOOK, LEVEL_UP, TALENT_SPRITES, levelUpLine } from '../data/talentAssets';
import { settings } from './flow/settingsStore';
import { VIEW_WIDTH } from '../data/config';
import type { SimEvents } from '../sim/events';
import type { SimState } from '../sim/state';
import { rampShare } from '../sim/keystones';
import { burstTint, tintBurst } from './roundLook';
import { tubeSlotBox } from './bottomHud';
import { TextLine } from './textLine';
import { addVector } from './vector/textures';

/** 037's effects as drawn, for `ui().talentFx`: the level-up line and its alpha, rings, ice bursts and Pool-bursts still live, Pools shown, and the heat's alpha. */
export interface TalentFxShown {
  levelLine: string | null;
  lineAlpha: number;
  levelRings: number;
  iceBursts: number;
  poolBursts: number;
  /** 054: a burning arrow's hit flashes still live. */
  burningFlashes: number;
  pools: number;
  heat: number;
}

export const NO_TALENT_FX: TalentFxShown = { levelLine: null, lineAlpha: 0, levelRings: 0, iceBursts: 0, poolBursts: 0, burningFlashes: 0, pools: 0, heat: 0 };

interface Burst {
  image: GameObjects.Image;
  kind: 'ring' | 'ice' | 'pool' | 'burning';
  ms: number;
  look: { ms: number; from: number; to: number };
  /** Made this frame: its clock starts next frame, so a long frame (the hook's stepping) can't run it out unseen. */
  fresh: boolean;
}

// The level-up and the keystones' signs (037): a cyan ring flashing out round the player
// with "Level 7 · talent point (T)" over the bottom HUD (FeelView plays the chime);
// Blastfletch's Pools shimmering where a blast left it; Shatterpoint's ice burst
// on a shattered enemy; and a heat shimmer over the tube's mouth as Overpressure ramps.
// Time on the tween clock, so the test hook can hold them for a screenshot.
export class TalentFxView {
  private readonly scene: Scene;
  private readonly line: TextLine;
  private lineMs = 0;
  private lineFresh = false;
  private bursts: Burst[] = [];
  private readonly pools = new Map<number, GameObjects.Image>();
  private readonly heat: GameObjects.Image;
  /** The heat image's own scale (its texture's bake scale), which the wobble multiplies. */
  private readonly heatScale: number;
  private time = 0;

  constructor(scene: Scene) {
    this.scene = scene;
    this.line = new TextLine(scene, 0, 0, DEPTHS.hud + 2, false, 'title').setFill('cyan-glow').setVisible(false);
    this.heat = addVector(scene, 0, 0, TALENT_SPRITES.heatShimmer).setBlendMode(BlendModes.ADD).setVisible(false);
    this.heatScale = this.heat.scaleX * KEYSTONE_LOOK.heat.scale;
  }

  get shown(): TalentFxShown {
    const live = (kind: Burst['kind']) => this.bursts.filter((b) => b.kind === kind).length;
    return {
      levelLine: this.line.obj.visible ? this.line.obj.text : null,
      lineAlpha: this.line.obj.visible ? Math.round(this.line.obj.alpha * 100) / 100 : 0,
      levelRings: live('ring'),
      iceBursts: live('ice'),
      poolBursts: live('pool'),
      burningFlashes: live('burning'),
      pools: [...this.pools.values()].filter((c) => c.visible).length,
      heat: this.heat.visible ? Math.round(this.heat.alpha * 100) / 100 : 0,
    };
  }

  private burst(kind: Burst['kind'], frame: string, x: number, y: number, depth: number, look: Burst['look'], add = false, tint: number | null = null): void {
    // Drawn plain unless `add`: the ring keeps its cyan over bright grass, the ice its pale blue over a white hit flash.
    const image = addVector(this.scene, x, y, frame).setDepth(depth);
    if (add) image.setBlendMode(BlendModes.ADD);
    // 039.15: a Cold Pool-burst flashes frost.
    tintBurst(image, tint);
    const base = image.scaleX;
    image.setData('base', base).setScale(base * look.from);
    this.bursts.push({ image, kind, ms: 0, look, fresh: true });
  }

  /** `events` are the ticks' since the last draw; `deltaMs` is tween time. */
  update(sim: SimState, events: SimEvents, shown: string, deltaMs: number): void {
    this.time += deltaMs;
    const p = sim.player;
    const here = shown === sim.roomId;
    const feet = p.y + FEET_BOX.h / 2;
    const last = events.levelUps[events.levelUps.length - 1];
    if (last) {
      if (here) this.burst('ring', TALENT_SPRITES.levelRing, p.x, p.y, feet - 0.5, LEVEL_UP.ring);
      this.showLine(levelUpLine(last.level));
    }
    // In front of the shattered enemy (its sprite sorts by its feet).
    if (here) for (const s of events.shatters) this.burst('ice', TALENT_SPRITES.iceBurst, s.x, s.y - KEYSTONE_LOOK.iceBurst.lift, s.y + KEYSTONE_LOOK.iceBurst.depthAbove, KEYSTONE_LOOK.iceBurst);
    // A Pool-burst (Blastfletch): the Pool's ring flashing out at the burst's radius.
    const B = KEYSTONE_LOOK.poolBurst;
    const k = (r: number) => r / KEYSTONE_LOOK.pool.spriteRadius;
    if (here) for (const c of events.poolBursts) this.burst('pool', TALENT_SPRITES.pool, c.x, c.y, c.y + B.depthAbove, { ms: B.ms, from: B.from * k(c.radius), to: B.to * k(c.radius) }, true, burstTint(c.damageType));
    // 054: a burning arrow's hit flashes small and ember-hot on the body it hits (042.10: none with Flashes off).
    const F = BURNING_LOOK.flash;
    if (here && settings().flashes) for (const h of events.hits) if (h.target === 'enemy' && h.burning) this.burst('burning', TALENT_SPRITES.burningFlash, h.x, h.y - F.lift, h.y + F.depthAbove, F, true);
    this.stepBursts(deltaMs);
    this.stepLine(deltaMs);
    this.drawPools(sim, shown);
    this.drawHeat(sim, here);
  }

  private showLine(text: string): void {
    this.lineFresh = true;
    this.line.set(text).setVisible(true).setAlpha(1);
    const slot = tubeSlotBox(1);
    this.line.moveTo(Math.round((VIEW_WIDTH - this.line.width) / 2), slot.y - LEVEL_UP.lineAbove - this.line.lineHeight);
    this.lineMs = 0;
  }

  private stepLine(deltaMs: number): void {
    if (!this.line.obj.visible) return;
    if (!this.lineFresh) this.lineMs += deltaMs;
    this.lineFresh = false;
    const fade = (this.lineMs - LEVEL_UP.holdMs) / LEVEL_UP.fadeMs;
    if (fade >= 1) this.line.setVisible(false);
    else this.line.setAlpha(Math.min(1, 1 - fade));
  }

  private stepBursts(deltaMs: number): void {
    for (const b of this.bursts) {
      if (!b.fresh) b.ms += deltaMs;
      b.fresh = false;
      const t = Math.min(1, b.ms / b.look.ms);
      const base = Number(b.image.getData('base')) || 1;
      b.image.setScale(base * (b.look.from + (b.look.to - b.look.from) * t)).setAlpha(1 - t * t);
    }
    this.bursts = this.bursts.filter((b) => {
      if (b.ms < b.look.ms) return true;
      b.image.destroy();
      return false;
    });
  }

  /** Each Pool in the room on screen, at its radius, breathing. */
  private drawPools(sim: SimState, shown: string): void {
    const C = KEYSTONE_LOOK.pool;
    const live = new Set<number>();
    const breathe = (Math.sin((this.time / C.breatheMs) * Math.PI * 2) + 1) / 2;
    for (const c of sim.pools) {
      if (c.roomId !== shown) continue;
      live.add(c.id);
      let image = this.pools.get(c.id);
      if (!image) {
        image = addVector(this.scene, c.x, c.y, TALENT_SPRITES.pool).setBlendMode(BlendModes.ADD).setDepth(c.y - c.radius);
        image.setScale((image.scaleX * c.radius) / C.spriteRadius);
        this.pools.set(c.id, image);
      }
      image.setAlpha(C.alpha[0] + (C.alpha[1] - C.alpha[0]) * breathe);
    }
    for (const [id, image] of this.pools) {
      if (live.has(id)) continue;
      image.destroy();
      this.pools.delete(id);
    }
  }

  /** Overpressure's heat over the tube's mouth, as strong as the ramp. */
  private drawHeat(sim: SimState, here: boolean): void {
    const H = KEYSTONE_LOOK.heat;
    const ramp = rampShare(sim);
    const on = here && sim.player.dying === 0 && ramp > 0 && ramp >= H.minRamp;
    this.heat.setVisible(on);
    if (!on) return;
    const p = sim.player;
    const dx = p.aimX - p.x;
    const dy = p.aimY - p.y;
    const len = Math.hypot(dx, dy) || 1;
    const wobble = 1 + H.wobble * Math.sin((this.time / H.wobbleMs) * Math.PI * 2);
    this.heat
      .setPosition(p.x + (dx / len) * H.ahead, p.y - H.lift + (dy / len) * H.ahead * H.aheadY)
      .setDepth(p.y + H.depthAbove)
      .setAlpha(H.alpha * Math.min(1, ramp))
      .setScale(this.heatScale * wobble, this.heatScale);
  }
}
