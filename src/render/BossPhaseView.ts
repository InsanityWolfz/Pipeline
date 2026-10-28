import type { GameObjects, Scene } from 'phaser';
import { BlendModes, TintModes } from 'phaser';
import { BOSS_PHASE_SPRITES } from '../data/arenaAssets';
import { BOSS_PHASE_LOOK, type PhaseLayer, type PhasePart } from '../data/art/bossPhases';
import type { ParticleBurst } from '../data/juice';
import { emitWithin } from './bossBurst';
import type { Quality } from '../data/settings';
import type { EnemyState } from '../sim/enemies';
import { posedPoint } from './vector/enemyPose';
import { posedFrame } from './vector/posedFrames';
import { showFrame, textureScale } from './vector/textures';
import { bossPhase, type BossPhaseShown } from './bossPhase';
import { awakeShare } from './bossIntro';
import { colorOf } from './color';
import { settings } from './flow/settingsStore';
import type { JuiceView } from './JuiceView';

// 080: each boss phase the sim already has, shown on the body (docs/specs/080-boss-intros.md "Phase changes, as
// drawn"): a colour layer (an additive copy of the sprite's frame, tinted), part sprites placed on the frame's posed
// geometry, glows and particles, and a transition when a flag flips between frames. Render clocks only (the tween
// clock, so a review shot can slow them); a reset puts the calm look straight back.

const L = BOSS_PHASE_LOOK;
const FLARE_BOSSES: readonly string[] = ['forgewright', 'conductor'];
/** Looks a boss is reset to: they show at once, with no transition. */
const CALM: readonly string[] = ['calm', 'heat', 'shielded'];

/** `ui().bossPhase`: each region boss's look as drawn, with whether a transition plays now. */
export type BossPhaseUi = (BossPhaseShown & { id: number; flare: boolean; dome: number })[];

/** One boss's overlays and its clocks, ms (Infinity: nothing running). */
interface Drawn {
  layer: GameObjects.Image;
  parts: Map<string, GameObjects.Image>;
  glow: GameObjects.Graphics;
  prev: BossPhaseShown;
  /** Since the last look change (the transition), the enrage's flare, the shield's break or return. */
  since: number;
  flare: number;
  shield: number;
  /** The Forgewright's seams, eased between heat bands: the band's alpha now, and the time to its next ember. */
  band: number;
  ember: number;
  clock: number;
}

export class BossPhaseView {
  private readonly scene: Scene;
  private readonly drawn = new Map<number, Drawn>();
  private readonly juice: () => JuiceView | undefined;
  private readonly quality: () => Quality;
  ui: BossPhaseUi = [];

  constructor(scene: Scene, juice: () => JuiceView | undefined, quality: () => Quality) {
    this.scene = scene;
    this.juice = juice;
    this.quality = quality;
  }

  update(enemies: readonly EnemyState[], spriteOf: (id: number) => GameObjects.Sprite | undefined, deltaMs: number, introShort: (e: EnemyState) => boolean): void {
    const dt = deltaMs * this.scene.tweens.timeScale;
    const live = new Set<number>();
    this.ui = [];
    for (const e of enemies) {
      const look = e.health > 0 ? bossPhase(e) : null;
      const sprite = spriteOf(e.id);
      if (!look || !sprite) continue;
      live.add(e.id);
      const d = this.drawn.get(e.id) ?? this.create(e.id, look);
      this.transition(d, look, e);
      d.since += dt;
      d.flare += dt;
      d.shield += dt;
      d.clock += dt;
      const dome = this.draw(d, look, e, sprite, dt, awakeShare(e.mode, e.modeTicks, e.mode === 'intro' && introShort(e)));
      this.ui.push({ ...look, id: e.id, flare: d.flare < L.flare.ms || d.since < this.transitionMs(look), dome });
    }
    for (const [id, d] of this.drawn) {
      if (live.has(id)) continue;
      d.layer.destroy();
      d.glow.destroy();
      for (const p of d.parts.values()) p.destroy();
      this.drawn.delete(id);
    }
  }

  private create(id: number, look: BossPhaseShown): Drawn {
    const d: Drawn = {
      layer: this.scene.add.image(0, 0, '').setBlendMode(BlendModes.ADD).setVisible(false),
      parts: new Map(),
      glow: this.scene.add.graphics(),
      prev: look,
      since: Infinity,
      flare: Infinity,
      shield: Infinity,
      band: 0,
      ember: 0,
      clock: 0,
    };
    this.drawn.set(id, d);
    return d;
  }

  /** How long the current look's transition runs, ms. */
  private transitionMs(look: BossPhaseShown): number {
    if (look.boss === 'bulwark' && look.look === 'called') return L.bulwark.called.transitionMs;
    if (look.boss === 'conductor') return look.shield ? L.conductor.dome.returnMs : look.grounded ? L.conductor.grounded.arcMs : L.conductor.dome.breakMs;
    return 0;
  }

  /** A flag flipped since the last frame: its transition starts. A reset (back to calm) shows the calm look at once. */
  private transition(d: Drawn, look: BossPhaseShown, e: EnemyState): void {
    const was = d.prev;
    d.prev = look;
    if (was.look !== look.look) d.since = CALM.includes(look.look) ? Infinity : 0;
    if (look.enraged && !was.enraged && FLARE_BOSSES.includes(look.boss)) {
      d.flare = 0;
      this.burst({ ...L.flareBurst, colors: L.flareColors[look.boss] ?? ['snow'] }, e.x, e.y);
    }
    if (!look.enraged && was.enraged) d.flare = Infinity;
    if (look.boss === 'bulwark' && look.look === 'called' && was.look === 'calm') this.burst(L.bulwark.called.burst, e.x, e.y);
    if (look.boss === 'bulwark' && look.roar && !was.roar) this.burst(L.bulwark.enraged.steam, e.x, e.y);
    if (look.boss === 'conductor' && look.shield !== was.shield) {
      d.shield = 0;
      if (!look.shield) this.burst(L.conductor.shards, e.x, e.y);
    }
  }

  /** Draws its look; returns the dome's alpha (the Conductor's; 0 for the others). `awake`: 0 dormant to 1 awake. */
  private draw(d: Drawn, look: BossPhaseShown, e: EnemyState, sprite: GameObjects.Sprite, dt: number, awake: number): number {
    const flashes = settings().flashes;
    d.glow.clear().setDepth(sprite.depth + 0.003);
    this.drawLayer(d, look, sprite, flashes, dt);
    const want = new Map<string, number>();
    for (const part of this.partsOf(look)) want.set(part.key, this.place(d, part, sprite, look));
    for (const [key, img] of d.parts) if (!want.has(key)) img.setVisible(false);
    if (look.boss === 'bulwark' && look.roar) this.drawRoarRing(d, e, flashes);
    if (look.boss === 'forgewright') this.drawForge(d, look, e, sprite, flashes, dt);
    return look.boss === 'conductor' ? this.drawConductor(d, look, e, sprite, flashes, awake) : 0;
  }

  /** The colour layer: an additive copy of the sprite's frame in the phase's tint, at its alpha (steady with Flashes off). */
  private drawLayer(d: Drawn, look: BossPhaseShown, sprite: GameObjects.Sprite, flashes: boolean, dt: number): void {
    let layer: PhaseLayer | null = null;
    if (look.boss === 'bulwark') layer = look.enraged ? L.bulwark.enraged.layer : look.look === 'called' ? L.bulwark.called.layer : null;
    if (look.boss === 'conductor' && look.enraged) layer = L.conductor.enraged.layer;
    if (look.boss === 'forgewright') {
      const band = L.forgewright.bands[look.heatBand ?? 0] ?? L.forgewright.bands[0];
      // Each band eases in over easeMs.
      d.band += ((band?.alpha ?? 0) - d.band) * Math.min(1, dt / L.forgewright.easeMs);
      layer = look.enraged ? L.forgewright.enraged.layer : { color: band?.color ?? 'cinder', alpha: d.band };
    }
    const flare = d.flare < L.flare.ms ? L.flare.alpha * Math.sin((d.flare / L.flare.ms) * Math.PI) : 0;
    if (!layer && flare <= 0) {
      d.layer.setVisible(false);
      return;
    }
    const pulse = layer?.pulseTo !== undefined && layer.pulseMs !== undefined && flashes ? (layer.pulseTo - layer.alpha) * ((Math.sin((d.clock / layer.pulseMs) * Math.PI * 2) + 1) / 2) : 0;
    // A called Bulwark's veins brighten over the transition.
    const ramp = look.look === 'called' && !look.enraged ? Math.min(1, d.since / L.bulwark.called.transitionMs) : 1;
    const alpha = ((layer?.alpha ?? 0) + pulse) * ramp + flare;
    showFrame(d.layer, sprite.frame.name);
    d.layer
      .setPosition(sprite.x, sprite.y)
      .setScale(sprite.scaleX * (1 + L.flare.swell * (flare / L.flare.alpha)), sprite.scaleY)
      .setFlipX(sprite.flipX)
      .setTint(colorOf(layer?.color ?? 'snow'))
      .setTintMode(TintModes.FILL)
      .setAlpha(flashes ? alpha : Math.min(alpha, L.dimGlow))
      .setDepth(sprite.depth + 0.002)
      .setVisible(sprite.visible);
  }

  private partsOf(look: BossPhaseShown): readonly PhasePart[] {
    if (look.boss === 'bulwark') return [...(look.look === 'called' || look.enraged ? L.bulwark.called.parts : []), ...(look.enraged ? L.bulwark.enraged.parts : [])];
    if (look.boss === 'forgewright') return [...(look.vent ? L.forgewright.vent.parts : []), ...(look.enraged ? L.forgewright.enraged.parts : [])];
    if (look.boss === 'conductor') return look.enraged ? L.conductor.enraged.parts : [];
    return [];
  }

  /** A part on the frame's posed geometry (076's posedPoint), mirrored with the sprite; the runes light one by one. */
  private place(d: Drawn, part: PhasePart, sprite: GameObjects.Sprite, look: BossPhaseShown): number {
    const posed = posedFrame(sprite.frame.name);
    let img = d.parts.get(part.key);
    if (!img) {
      img = this.scene.add.image(0, 0, '').setVisible(false);
      if (part.add) img.setBlendMode(BlendModes.ADD);
      d.parts.set(part.key, img);
    }
    if (!posed || (part.views && !part.views.includes(posed.view))) {
      img.setVisible(false);
      return 0;
    }
    const at = posedPoint(posed.rig, posed.view, posed.pose, part.part, part.at[posed.view]);
    if (!at) {
      img.setVisible(false);
      return 0;
    }
    const k = sprite.scaleX * textureScale();
    const flip = sprite.flipX ? -1 : 1;
    let frame: string = part.key;
    if (part.key === BOSS_PHASE_SPRITES.runes) {
      const lit = look.look === 'called' && !look.enraged ? Math.min(2, Math.floor((d.since / L.bulwark.called.transitionMs) * 3)) : 2;
      frame = `${part.key}/${lit}`;
    }
    if (part.key === BOSS_PHASE_SPRITES.halo) frame = `${part.key}/${Math.floor(d.clock / L.conductor.enraged.haloFrameMs) % 2}`;
    showFrame(img, frame);
    img.setPosition(sprite.x + at[0] * flip * k, sprite.y + at[1] * k).setFlipX(sprite.flipX).setDepth(sprite.depth + 0.004).setVisible(sprite.visible);
    return 1;
  }

  /** The roar's red ring, expanding from the Bulwark over its middle (no damage, no shake). */
  private drawRoarRing(d: Drawn, e: EnemyState, flashes: boolean): void {
    const R = L.bulwark.enraged.ring;
    const k = (d.since - R.delayMs) / R.ms;
    if (k <= 0 || k >= 1) return;
    d.glow.lineStyle(R.width, colorOf(R.color), (flashes ? R.alpha : L.dimGlow) * (1 - k)).strokeEllipse(e.x, e.y - R.rise, R.radius * 2 * k, R.radius * 2 * R.squash * k);
  }

  /** The Forgewright: embers off its glowing hammer once enraged, and at white heat (Medium and High) a shimmer over its back. */
  private drawForge(d: Drawn, look: BossPhaseShown, e: EnemyState, sprite: GameObjects.Sprite, flashes: boolean, dt: number): void {
    const flip = sprite.flipX ? -1 : 1;
    if (look.enraged) {
      d.ember -= dt;
      if (d.ember <= 0) {
        d.ember = L.forgewright.enraged.emberMs;
        const [ex, ey] = L.forgewright.enraged.emberAt;
        this.burst(L.forgewright.enraged.embers, e.x + ex * flip, e.y + ey);
      }
    }
    const S = L.forgewright.shimmer;
    if (look.heatBand === S.band && this.quality() !== 'low') {
      const wave = flashes ? Math.sin((d.clock / 1000) * S.hz * Math.PI * 2) * S.px : 0;
      d.glow.lineStyle(S.width, colorOf(S.color), S.alpha);
      for (let i = 0; i < S.lines; i++) {
        const y = e.y - S.rise - i * S.gap;
        d.glow.lineBetween(e.x - S.w / 2 + wave, y, e.x + S.w / 2 - wave, y - S.slope);
      }
    }
  }

  /** The Conductor: its storm-glass dome (fading out as it breaks, back as it returns) and, grounded, arcs into the floor. */
  private drawConductor(d: Drawn, look: BossPhaseShown, e: EnemyState, sprite: GameObjects.Sprite, flashes: boolean, awake: number): number {
    const D = L.conductor.dome;
    // 080 review: none while it sleeps or stirs (its slack, dark look), gathering through the rise.
    const k = awake * (look.shield ? Math.min(1, d.shield / D.returnMs) : 1 - Math.min(1, d.shield / D.breakMs));
    let dome = d.parts.get(D.key);
    if (!dome) {
      dome = this.scene.add.image(0, 0, '').setBlendMode(BlendModes.ADD);
      d.parts.set(D.key, dome);
    }
    showFrame(dome, D.key);
    dome.setPosition(e.x, sprite.y - D.rise).setAlpha(D.alphaCap * k).setDepth(sprite.depth + 0.005).setVisible(k > 0 && sprite.visible);
    if (look.grounded) {
      const G = L.conductor.grounded;
      const grow = Math.min(1, d.since / G.arcMs);
      d.glow.lineStyle(G.width, colorOf(G.color), flashes ? G.alpha : L.dimGlow);
      for (let i = 0; i < G.arcs; i++) {
        const x0 = e.x + (i - (G.arcs - 1) / 2) * G.spacing;
        const jag = flashes ? (Math.floor(d.clock / G.flickerMs + i) % 2 === 0 ? G.jag : -G.jag) : G.dimJag;
        const mid = e.y + G.top + G.drop * grow;
        d.glow.lineBetween(x0, e.y + G.top, x0 + jag, mid);
        d.glow.lineBetween(x0 + jag, mid, x0 - jag * 0.5, e.y + G.foot * grow);
      }
    }
    return dome.visible ? dome.alpha : 0;
  }

  /** A burst at the tier's count, thinned to what PARTICLE_BUDGET has left (bossBurst.ts). */
  private burst(b: ParticleBurst, x: number, y: number): void {
    emitWithin(this.juice()?.particles, b, L.quality, this.quality(), x, y);
  }
}
