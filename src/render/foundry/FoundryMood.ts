import type { Scene } from 'phaser';
import { FOUNDRY_FX_CAP, FOUNDRY_FX_SEED, HEAT, LEY_PULSE, QUENCH, SPARKS, STEAM } from '../../data/foundryFx';
import { FOUNDRY_ROOM, STATIC_ROOMS } from '../../data/rooms';
import type { Quality } from '../../data/settings';
import type { SimEvents } from '../../sim/events';
import { createRng } from '../../sim/rng';
import type { SimState } from '../../sim/state';
import { machineSparkColors } from '../fx/machineSparks';
import { intakeAnchor } from '../foundryLayout';
import type { ParticleLedger } from '../particleBudget';
import { burstCount, forgeOnScreen, pickFx, SteamClock } from './forgeFx';
import { ForgeFxView } from './ForgeFxView';
import { ForgeParticles } from './forgeParticles';
import { foundryInlays, LeyPulses, type Inlay } from './leyPulse';
import { LeyPulseView } from './LeyPulseView';
import { RunningForges, type ForgeAt } from './runningForges';

// 079: the foundry's life, each frame it is shown: the running forge machines (a small set FoundryView keeps as it
// draws), their glow on every tier, shimmer and steam on the tier's nearest few, sparks (and a Smelter's quench) on each
// craft on screen, and ley pulses over the inlays as the line feeds the intake. Steam and sparks are live particles in
// weather's share of 076's budget with 014's room motes, reported to the scene's ledger and gated by it. `?mood=off`
// skips it all. Render only: nothing feeds back into the sim.

export interface FoundryMoodHooks {
  ledger: ParticleLedger;
  quality(): Quality;
  flashes(): boolean;
  /** `?mood=off` or the hook's lightingOff: the mood, lights and every effect here skipped. */
  off(): boolean;
  /** 014's room motes now. */
  motes(): number;
}

/** What `ui().foundryMood` reports. */
export interface FoundryMoodShown {
  shown: boolean;
  off: boolean;
  quality: Quality;
  /** Working forge machines (the running set), and those on screen now. */
  running: number[];
  onScreen: number[];
  /** Each on-screen running machine's effects: its glow, shimmer and steam. */
  effects: { id: number; pieceId: string; glow: boolean; shimmer: boolean; steam: boolean }[];
  /** Machines the effects stepped this frame. */
  visited: number;
  /** The foundry's live particles (motes, steam and sparks) against its cap, and the ledger's total. */
  particles: { live: number; motes: number; steam: number; sparks: number; cap: number; total: number };
  /** Since boot: steam puffs, quench puffs, sparks thrown, and bursts thinned by the budget. */
  puffs: number;
  quenches: number;
  sparks: number;
  thinned: number;
  /** Ley pulses live, started since boot, the inlays lit now (by index, farthest from the intake first), and by pulse. */
  pulses: { live: number; started: number; lit: number[]; byPulse: { id: number; lit: number[] }[] };
  inlays: { tx: number; ty: number; dist: number }[];
  shimmer: { id: number; alpha: number; frame: string }[];
  glows: { x: number; y: number; alpha: number }[];
}

export const NO_FOUNDRY_MOOD: FoundryMoodShown = { shown: false, off: false, quality: 'medium', running: [], onScreen: [], effects: [], visited: 0, particles: { live: 0, motes: 0, steam: 0, sparks: 0, cap: 0, total: 0 }, puffs: 0, quenches: 0, sparks: 0, thinned: 0, pulses: { live: 0, started: 0, lit: [], byPulse: [] }, inlays: [], shimmer: [], glows: [] };

const HOT = new Set(HEAT.machines);
const SPARKING = new Set(SPARKS.machines);

export class FoundryMood {
  readonly forges = new RunningForges();
  private readonly scene: Scene;
  private readonly hooks: FoundryMoodHooks;
  private readonly model = new ForgeParticles(createRng(FOUNDRY_FX_SEED));
  private readonly steam = new SteamClock(createRng(FOUNDRY_FX_SEED + 1));
  private readonly fx: ForgeFxView;
  private inlays: Inlay[] = [];
  private pulses: LeyPulses | null = null;
  private pulseView: LeyPulseView | null = null;
  private time = 0;
  private counts = { puffs: 0, quenches: 0, sparks: 0, thinned: 0 };
  private report: FoundryMoodShown = NO_FOUNDRY_MOOD;

  constructor(scene: Scene, hooks: FoundryMoodHooks) {
    this.scene = scene;
    this.hooks = hooks;
    this.fx = new ForgeFxView(scene);
  }

  /** The working forge machines on screen now (for their lights): only the running set is looked at. */
  onScreen(): ForgeAt[] {
    const v = this.scene.cameras.main.worldView;
    const out: ForgeAt[] = [];
    for (const f of this.forges.running.values()) if (forgeOnScreen(f, v)) out.push(f);
    return out;
  }

  update(sim: SimState, events: SimEvents, shown: string, deltaMs: number): void {
    const dt = Math.min(deltaMs, 100);
    this.time += dt;
    const quality = this.hooks.quality();
    const off = this.hooks.off();
    if (shown !== FOUNDRY_ROOM || off) {
      this.fx.hide(this.model.clear());
      this.steam.step(0, []);
      this.pulses?.clear();
      this.pulseView?.draw([], this.inlays.length, intakeAnchor(), 1);
      if (shown === FOUNDRY_ROOM) this.hooks.ledger.set('weather', this.hooks.motes());
      this.report = { ...NO_FOUNDRY_MOOD, shown: shown === FOUNDRY_ROOM, off, quality, running: [...this.forges.running.keys()] };
      return;
    }
    const v = this.scene.cameras.main.worldView;
    const view = { x: v.x, y: v.y, width: v.width, height: v.height };
    const pick = pickFx(this.forges.running.values(), view, quality);
    const hot = pick.onScreen.filter((f) => HOT.has(f.pieceId));
    const heat = this.fx.heat(hot, pick.fx, quality, this.time);
    const ledger = this.hooks.ledger;
    const report = () => ledger.set('weather', this.hooks.motes() + this.model.count);
    report();
    // What the budget lets the foundry spawn now: weather's share less what is alive, within the whole budget.
    let room = ledger.room('weather', 'cue', quality);
    const spawn = (count: Readonly<Record<Quality, number>>): number => {
      const n = burstCount(count, quality, room);
      if (n < count[quality]) this.counts.thinned += 1;
      room -= n;
      return n;
    };
    const byId = new Map(pick.fx.map((f) => [f.id, f]));
    for (const id of this.steam.step(dt, pick.fx.map((f) => f.id))) {
      const f = byId.get(id);
      if (!f) continue;
      const n = spawn(STEAM.count);
      this.model.puff(f.x + HEAT.vent.x, f.bottom - HEAT.vent.rise, STEAM, n);
      if (n > 0) this.counts.puffs += 1;
    }
    for (const made of events.made) {
      const f = this.forges.known.get(made.id);
      if (!f || !SPARKING.has(f.pieceId) || !forgeOnScreen(f, view)) continue;
      const at = SPARKS.at[f.pieceId] ?? { x: 0, rise: 10 };
      const n = spawn(SPARKS.count);
      this.model.sparks(f.x + at.x, f.bottom - at.rise, machineSparkColors(f.pieceId) ?? [], n);
      this.counts.sparks += n;
      if (f.pieceId !== 'smelter') continue;
      const q = spawn(QUENCH.count);
      this.model.puff(f.x + QUENCH.at.x, f.bottom - QUENCH.at.rise, QUENCH, q);
      if (q > 0) this.counts.quenches += 1;
    }
    const dead = this.model.step(dt);
    this.fx.draw(this.model, dead, quality);
    report();
    this.stepPulses(events, quality, dt);
    this.report = this.shownNow(pick, heat.shimmers, quality);
  }

  /** The ley pulses: their pool is made on the first foundry show; none on Low (the model runs none). */
  private stepPulses(events: SimEvents, quality: Quality, dt: number): void {
    const room = STATIC_ROOMS[FOUNDRY_ROOM];
    if (!room) return;
    const mouth = intakeAnchor();
    if (!this.pulses) {
      this.inlays = foundryInlays(room, mouth);
      this.pulses = new LeyPulses(this.inlays, mouth);
      this.pulseView = new LeyPulseView(this.scene, this.inlays);
    }
    this.pulses.step(dt, { triggers: events.refills.length + events.entranceFires.length, quality, shown: true });
    this.pulseView?.draw(this.pulses.lit(), this.inlays.length, mouth, this.hooks.flashes() ? 1 : LEY_PULSE.flashesOff);
  }

  private shownNow(pick: ReturnType<typeof pickFx>, shimmers: number, quality: Quality): FoundryMoodShown {
    const fx = new Set(pick.fx.map((f) => f.id));
    const counts = this.model.counts;
    const motes = this.hooks.motes();
    const lit = this.pulses?.lit() ?? [];
    return {
      shown: true,
      off: false,
      quality,
      running: [...this.forges.running.keys()],
      onScreen: pick.onScreen.map((f) => f.id),
      effects: pick.onScreen.map((f) => ({ id: f.id, pieceId: f.pieceId, glow: HOT.has(f.pieceId), shimmer: fx.has(f.id) && shimmers > 0, steam: fx.has(f.id) })),
      visited: pick.visited,
      particles: { live: motes + this.model.count, motes, steam: counts.steam, sparks: counts.sparks, cap: FOUNDRY_FX_CAP[quality], total: this.hooks.ledger.total },
      ...this.counts,
      pulses: {
        live: this.pulses?.live.length ?? 0,
        started: this.pulses?.started ?? 0,
        lit: lit.map((l) => l.index),
        byPulse: (this.pulses?.live ?? []).map((p, i) => ({ id: p.id, lit: lit.filter((l) => l.pulse === i).map((l) => l.index) })),
      },
      inlays: this.inlays.map((t) => ({ tx: t.tx, ty: t.ty, dist: Math.round(t.dist) })),
      shimmer: this.fx.shimmerShown,
      glows: this.fx.glowShown,
    };
  }

  get shown(): FoundryMoodShown {
    return this.report;
  }
}
