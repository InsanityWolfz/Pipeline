import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { BOSS_ARENAS } from '../../data/arenas';
import { DEPTHS, SET_PIECE_FRAMES } from '../../data/assets';
import { SWAY } from '../../data/ambient';
import { TILE_SIZE } from '../../data/config';
import { GROUND } from '../../data/art/ground';
import { AMBIENT } from '../../data/juice';
import { OVERWORLD, OVERWORLD_ROOM } from '../../data/overworld';
import type { Room } from '../../data/rooms';
import type { Quality } from '../../data/settings';
import { LIGHTNING_LOOK } from '../../data/stormcrownAssets';
import { WEATHER_LIGHTNING, WEATHER_MARGIN, WEATHER_SEED } from '../../data/weather';
import { WORLD_SHAPE } from '../../data/worldShape';
import { arenaLocked, playerInside } from '../../sim/arenaLock';
import { createRng } from '../../sim/rng';
import type { SimState } from '../../sim/state';
import { boltPoints, drawBolt } from '../bolt';
import type { WorldLayer } from '../lighting/WorldLayer';
import { moodAt } from '../lighting/mood';
import type { Occluders } from '../occluders';
import { showFrame } from '../vector/textures';
import { DECOR_BUCKET, DecorView } from './DecorView';
import { beadsInView } from './leyFlow';
import { poolsInView, RippleModel } from './ripples';
import { SwayStepper } from './sway';
import { WaterLeyView } from './WaterLeyView';
import { LightningClock, lightningActive, strikeTarget, type StrikeTarget } from './weatherLightning';
import { budgetRoom, layerTargets, WeatherModel, weatherWeights } from './weatherModel';
import { WeatherView } from './WeatherView';
import { WindNow } from './wind';
import { lazyWorld, NO_WEATHER, NO_WORLD, type WeatherShown, type WorldShown } from './worldShown';

// 077: the overworld's life, each frame: the wind where the camera is, the sway (only the chunks in view, under the
// tier's cap), set pieces' loops and halos in view, ripples and ley beads in view, the weather (its layers, the shared
// budget, Low's counts in a boss fight) and the Stormcrown's weather lightning (074's flash and light, 064's bolt).
// Render only: it reads sim state and never changes it. The decor itself is made per chunk (DecorView).

const T = TILE_SIZE;
const C = GROUND.chunk;
const L = WEATHER_LIGHTNING;
const BOLT = { glow: LIGHTNING_LOOK.glow, bolt: LIGHTNING_LOOK.color, core: LIGHTNING_LOOK.coreColor, width: L.boltWidth, glowWidth: L.glowWidth };

/** What WorldLife reads from the rest of the scene, as it's made. */
export interface WorldLifeHooks {
  quality(): Quality;
  flashes(): boolean;
  /** Every other live particle (014's bursts, 076's death motes, 078's effects), for the shared budget. */
  particles(): number;
  /** 078: the weather alive now, reported to the scene's particle ledger. */
  weather(live: number): void;
  /** Weather lightning struck: 074's ambient flash and rod-strike light (LightingView.weatherStrike). */
  strike(x: number, y: number): void;
}

const ROD_NODES = OVERWORLD.nodes.filter((n) => n.nodeId === 'storm-rod').map((n) => ({ x: (n.tx + 0.5) * T, y: (n.ty + 0.5) * T }));

export class WorldLife {
  readonly sway = new SwayStepper(C);
  readonly decor: DecorView;
  private readonly hooks: WorldLifeHooks;
  private readonly water: WaterLeyView;
  private readonly weatherView: WeatherView;
  private readonly weather = new WeatherModel(createRng(WEATHER_SEED));
  private readonly ripples = new RippleModel(createRng(WEATHER_SEED + 1));
  private readonly wind = new WindNow(createRng(WEATHER_SEED + 2));
  private readonly strikeRng = createRng(WEATHER_SEED + 3);
  private readonly clock = new LightningClock(createRng(WEATHER_SEED + 4));
  private readonly bolt: GameObjects.Graphics;
  private readonly scene: Scene;
  private room: Room | null = null;
  private time = 0;
  private inView = new Set<string>();
  private forced = false;
  private flash: { target: StrikeTarget; fromX: number; fromY: number; age: number } | null = null;
  private strikes = 0;
  private last: StrikeTarget | null = null;
  private loops = new Map<string, number>();
  /** `?world=off` (dev) or the hook: plants, sway, ripples, ley flow, set-piece loops and weather skipped. */
  off: boolean;
  private shownWorld: WorldShown = NO_WORLD;
  private shownWeather: WeatherShown = NO_WEATHER;

  constructor(scene: Scene, hooks: WorldLifeHooks, world?: WorldLayer, occluders?: Occluders) {
    this.scene = scene;
    this.hooks = hooks;
    this.decor = new DecorView(scene, this.sway, C, world, occluders);
    this.water = new WaterLeyView(scene);
    this.weatherView = new WeatherView(scene);
    this.bolt = scene.add.graphics().setDepth(DEPTHS.motes).setBlendMode(BlendModes.ADD);
    this.off = import.meta.env.DEV && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('world') === 'off';
    this.decor.off = this.off;
  }

  /** The overworld's room (its chunks are built from it). */
  setRoom(room: Room | null): void {
    this.room = room;
    this.decor.setRoomShown(room !== null);
  }

  /** `?world=off` / the hook's toggle. */
  setOff(off: boolean): void {
    this.off = off;
    this.decor.setOff(off);
  }

  /** The test hook: the next weather strike happens now (if one may strike at all). */
  strikeNow(): void {
    this.forced = true;
  }

  get world(): WorldShown {
    return this.shownWorld;
  }

  get weatherShown(): WeatherShown {
    return this.shownWeather;
  }

  update(sim: SimState, shown: string, deltaMs: number): void {
    const dt = Math.min(deltaMs, 100);
    this.time += dt;
    const room = this.room;
    if (shown !== OVERWORLD_ROOM || !room) {
      this.idle();
      return;
    }
    const quality = this.hooks.quality();
    const v = this.scene.cameras.main.worldView;
    const view = { x: v.x, y: v.y, width: v.width, height: v.height };
    const mood = moodAt(Math.hypot(view.x / T + view.width / T / 2 - WORLD_SHAPE.centre.tx - 0.5, view.y / T + view.height / T / 2 - WORLD_SHAPE.centre.ty - 0.5));
    const weights = weatherWeights(mood);
    const wind = this.wind.step(dt, weights);
    this.showChunks(view);
    const step = this.sway.step(view, this.time, wind, this.off ? 0 : SWAY.perFrame[quality]);
    const pieces = this.piecesInView(view, quality);
    // Ripples and ley beads (none on Low or with the world off).
    const still = this.off || quality === 'low';
    const pools = still ? [] : poolsInView(room, view);
    this.ripples.step(dt, pools, still ? 'low' : quality);
    const beads = still ? [] : beadsInView(view, this.time, quality);
    const glinting = quality === 'high' && !this.off ? pools.filter((p) => !p.spring) : [];
    if (still) this.water.hide();
    else this.water.draw(this.ripples.rings, glinting, beads, this.time);
    // The weather: Low's counts in a boss fight; none with the world off.
    const fight = BOSS_ARENAS.some((a) => arenaLocked(sim, a));
    const inArena = BOSS_ARENAS.some((a) => playerInside(sim, a));
    const targets = this.off ? [] : layerTargets(weights, quality, fight);
    const room0 = budgetRoom(quality, this.hooks.particles(), this.weather.count());
    const dead = this.weather.step(dt, view, targets, room0, wind);
    this.hooks.weather(this.weather.count());
    this.weatherView.draw(this.weather, dead, quality);
    this.lightning(sim, room, view, dt, { quality, flashes: this.hooks.flashes(), stormWeight: weights.storm, fight, inArena, overworld: true });
    this.report(step, pieces, beads.length, glinting.length, quality, weights, targets.reduce((n, t) => n + t.count, 0), fight, room0);
  }

  /** The overworld isn't shown: nothing moves or draws. */
  private idle(): void {
    if (this.weather.count() > 0) this.weatherView.clear(this.weather);
    this.water.hide();
    this.bolt.clear();
    this.flash = null;
    this.shownWorld = { ...NO_WORLD, off: this.off };
    this.shownWeather = NO_WEATHER;
  }

  /** The chunks the view (and a margin) touches, for its set pieces; and the plants' squares near it, shown (on a change only). */
  private showChunks(view: { x: number; y: number; width: number; height: number }): void {
    const m = SWAY.margin;
    const now = new Set<string>();
    for (let cy = Math.floor((view.y - m) / C); cy <= Math.floor((view.y + view.height + m) / C); cy++) for (let cx = Math.floor((view.x - m) / C); cx <= Math.floor((view.x + view.width + m) / C); cx++) now.add(`${cx},${cy}`);
    this.inView = now;
    const B = DECOR_BUCKET;
    const squares = new Set<string>();
    for (let by = Math.floor((view.y - m) / B); by <= Math.floor((view.y + view.height + m) / B); by++) for (let bx = Math.floor((view.x - m) / B); bx <= Math.floor((view.x + view.width + m) / B); bx++) squares.add(`${bx},${by}`);
    this.decor.showBuckets(squares);
  }

  /** Set pieces in view: their loops (held on the first frame on Low or with the world off) and their halos breathing. */
  private piecesInView(view: { x: number; y: number; width: number; height: number }, quality: Quality): string[] {
    const ids: string[] = [];
    const hold = this.off || quality === 'low';
    for (const k of this.inView) {
      for (const p of this.decor.chunks.get(k)?.pieces ?? []) {
        const b = p.base;
        if (b.x + p.def.look.w / 2 < view.x || b.x - p.def.look.w / 2 > view.x + view.width || b.y - p.def.look.h > view.y + view.height || b.y < view.y) continue;
        ids.push(p.def.id);
        const frames = SET_PIECE_FRAMES[p.def.id];
        if (p.loop && 'loop' in frames && p.def.loopMs) {
          const f = hold ? 0 : Math.floor(this.time / p.def.loopMs) % frames.loop.length;
          if (this.loops.get(p.def.id) !== f) {
            this.loops.set(p.def.id, f);
            showFrame(p.loop, frames.loop[f] ?? frames.loop[0]);
          }
        }
        for (const [i, h] of p.halos.entries()) {
          const breathe = h.breathe && !this.off ? (Math.sin((this.time / AMBIENT.glowBreatheMs + i * AMBIENT.glowStagger) * Math.PI * 2) + 1) / 2 : 1;
          h.image.setAlpha(AMBIENT.glowAlpha[0] + (AMBIENT.glowAlpha[1] - AMBIENT.glowAlpha[0]) * breathe);
        }
      }
    }
    return ids;
  }

  /** Weather lightning: on its clock (or forced), a bolt to its target, 074's flash and light there; the bolt fading. */
  private lightning(sim: SimState, room: Room, view: { x: number; y: number; width: number; height: number }, dt: number, when: Parameters<typeof lightningActive>[0]): void {
    const active = !this.off && lightningActive(when);
    const due = this.clock.step(dt, active) || (this.forced && active);
    if (this.forced) {
      this.forced = false;
      if (active) this.clock.force();
    }
    if (due) {
      const target = strikeTarget(room, view, sim.player, ROD_NODES, this.strikeRng);
      if (target) {
        this.strikes += 1;
        this.last = target;
        this.flash = { target, fromX: target.x + ((this.strikes * 37) % (2 * L.spread)) - L.spread, fromY: view.y - L.above, age: 0 };
        this.hooks.strike(target.x, target.y);
      }
    }
    this.bolt.clear();
    if (!this.flash) return;
    // On the tween clock, so a screenshot can hold the bolt (tweenSpeed).
    this.flash.age += dt * this.scene.tweens.timeScale;
    if (this.flash.age >= L.boltMs || !this.hooks.flashes()) {
      this.flash = null;
      return;
    }
    const f = this.flash;
    const seed = this.strikes * 101 + Math.floor(f.age / LIGHTNING_LOOK.flickerMs);
    drawBolt(this.bolt, boltPoints(f.fromX, f.fromY, f.target.x, f.target.y, L.step, L.jag, seed), BOLT, 1 - f.age / L.boltMs);
  }

  private report(step: { updated: number; chunks: string[]; sample: number[] }, pieces: string[], beads: number, glints: number, quality: Quality, weights: Record<string, number>, want: number, fight: boolean, room: number): void {
    // The chunks only when the hook reads them: never a walk over every built chunk a frame.
    const decor = this.decor;
    const chunks = () => [...decor.chunks.entries()].map(([key, c]) => ({ key, plants: c.plants, vines: c.vines.length, trees: c.trees, variants: c.variants, setPieces: c.pieces.map((p) => p.def.id), shown: decor.chunkShown(c) }));
    this.shownWorld = lazyWorld({
      off: this.off,
      quality,
      swayUpdated: step.updated,
      swayChunks: step.chunks,
      swaySample: step.sample,
      swayBuilt: this.sway.builtChunks,
      ripples: this.ripples.rings.length,
      glints,
      beads,
      setPiecesInView: pieces,
      loops: Object.fromEntries(this.loops),
    }, chunks);
    const layers: Record<string, number> = {};
    for (const p of this.weather.particles) if (p.fadeLeft === null) layers[p.layer] = (layers[p.layer] ?? 0) + 1;
    this.shownWeather = {
      weights,
      layers,
      live: this.weather.live(),
      fading: this.weather.count() - this.weather.live(),
      want,
      room,
      fight,
      wind: { ...this.wind.now },
      strikes: this.strikes,
      last: this.last,
      bolt: this.flash !== null,
      nextStrikeMs: Math.round(this.clock.wait),
      margin: WEATHER_MARGIN,
    };
  }
}
