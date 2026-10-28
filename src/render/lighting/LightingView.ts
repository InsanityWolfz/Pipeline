import { WEBGL, type GameObjects, type Scene } from 'phaser';
import { DEPTHS } from '../../data/assets';
import { TILE_SIZE, VIEW_HEIGHT, VIEW_WIDTH } from '../../data/config';
import { LIGHT_BUDGET, LIGHT_Z, QUALITY_LOOK, type LightSourceId } from '../../data/lights';
import { OVERWORLD_ROOM } from '../../data/overworld';
import { FOUNDRY_MOOD, LIGHTNING_FLASH, REGION_MOODS } from '../../data/moods';
import { FOUNDRY_ROOM, STATIC_ROOMS } from '../../data/rooms';
import type { Quality } from '../../data/settings';
import { WORLD_SHAPE } from '../../data/worldShape';
import type { SimEvents } from '../../sim/events';
import type { SimState } from '../../sim/state';
import { colorOf } from '../color';
import { settings } from '../flow/settingsStore';
import { FogView } from './FogView';
import { CatchView, type CatchShown } from './CatchView';
import { PoolView } from './PoolView';
import { conductorChain, gatherLights } from './lightSources';
import { LightPulses } from './lightPulses';
import type { PlacedLight } from './lightCatch';
import { pickLights, type LightCandidate } from './lightPick';
import { flashLevel, moodAt, moodLooks, rgbInt, SUNNY_MOOD, withFlash, type MoodNow, type Rgb } from './mood';
import { foundryLights } from './foundryLights';
import type { ForgeAt } from '../foundry/runningForges';
import type { WorldLayer } from './WorldLayer';

// 074: the region's light. Each frame: the mood where the camera's centre stands (blended at region edges), the
// lightning flash, the screen wash and fog; the world layer lit by the scene's lights or tinted with the ambient as the
// Graphics quality says (re-set over the registry only on a change); and the lights picked for this frame placed from a
// pool of 16 made once. 079: the foundry takes its own mood (FOUNDRY_MOOD: warm resin air, a light wash, no fog) and
// places its own lights (its wall fires, the intake, working forge machines on screen); with the mood off it keeps
// only the room's wash, its own tint as 014's was. Looks only.

/** What `ui().lighting` reports. */
export interface LightingShown {
  quality: Quality;
  /** The quality setting asked for (a Canvas renderer runs as Low whatever it says). */
  setting: Quality;
  renderer: 'webgl' | 'canvas';
  /** `?mood=off` (dev): every mood, light and fog skipped. */
  off: boolean;
  /** 079: the mood's name (a region's, or `foundry`). */
  mood: string;
  ring: number;
  outer: number | null;
  blend: number;
  ambient: Rgb;
  flash: number;
  wash: number;
  /** Lights placed now, by source, and each one. */
  lights: Partial<Record<LightSourceId, number>>;
  placed: { source: LightSourceId; x: number; y: number; radius: number; color: string; intensity: number }[];
  /** World objects with lighting on, and the world layer's tint (0xrrggbb) or null. */
  lit: number;
  tint: number | null;
  /** The tint on the ground chunks no light reaches (the ambient, a lightning flash included), or null. */
  groundTint: number | null;
  fog: number;
  /** Medium's light pools on the ground drawn now. */
  pools: number;
  /** Times the world layer's look was set over its registry (it changes only on a change). */
  applied: number;
  /** Light catches drawn now. */
  catches: CatchShown[];
}

export const NO_LIGHTING: LightingShown = { quality: 'medium', setting: 'medium', renderer: 'webgl', off: false, mood: 'sunny', ring: 0, outer: null, blend: 0, ambient: [255, 255, 255], flash: 0, wash: 0, lights: {}, placed: [], lit: 0, tint: null, groundTint: null, fog: 0, pools: 0, applied: 0, catches: [] };

const POOL = LIGHT_BUDGET.high;

/** 079: the foundry's mood as drawn (no blend: it is one room). */
const FOUNDRY_NOW: MoodNow = { ring: 0, outer: null, blend: 0, ...moodLooks(FOUNDRY_MOOD) };

/** 079: what the foundry's lights read from the rest of the scene. */
export interface FoundryLightHooks {
  onScreen(): ForgeAt[];
  intake(sim: SimState): { x: number; y: number; glowRadius: number } | null;
}

export class LightingView {
  private readonly scene: Scene;
  private readonly world: WorldLayer;
  private readonly fog: FogView;
  private readonly pools: PoolView;
  private readonly wash: GameObjects.Rectangle;
  private readonly pool: GameObjects.Light[] = [];
  private readonly pulses = new LightPulses();
  private readonly webgl: boolean;
  /** The light catch on enemies, the player and ground items (begun here each frame; views offer their sprites). */
  readonly catches: CatchView;
  /** `?mood=off` (dev only), or set by the test hook for the A/B probe. */
  off: boolean;
  private roomId = '';
  private time = 0;
  private placed: PlacedLight[] = [];
  private report: LightingShown = NO_LIGHTING;

  /** 079: the foundry's running forge machines on screen and its intake's glow, for their lights. */
  private readonly foundry: FoundryLightHooks | undefined;

  constructor(scene: Scene, world: WorldLayer, foundry?: FoundryLightHooks) {
    this.scene = scene;
    this.world = world;
    this.foundry = foundry;
    // `?mood=off` (dev only) skips every mood, light and fog, for the frame-time A/B.
    this.off = import.meta.env.DEV && new URLSearchParams(window.location.search).get('mood') === 'off';
    this.webgl = scene.sys.renderer.type === WEBGL;
    this.fog = new FogView(scene);
    this.pools = new PoolView(scene);
    this.catches = new CatchView(scene);
    this.wash = scene.add.rectangle(0, 0, VIEW_WIDTH, VIEW_HEIGHT, 0, 0).setOrigin(0).setScrollFactor(0).setDepth(DEPTHS.mood);
    if (this.webgl) for (let i = 0; i < POOL; i++) this.pool.push(scene.lights.addLight(0, 0, 1, 0xffffff, 0).setVisible(false));
  }

  /** 077: weather lightning struck at (x, y): 074's ambient flash and rod-strike light, as a rod strike's. */
  weatherStrike(x: number, y: number): void {
    this.pulses.strike(x, y, settings().flashes);
  }

  /** The lights placed now (intensity × the mood's scale), for the light catch. */
  get lightsNow(): readonly PlacedLight[] {
    return this.placed;
  }

  /** The quality drawn now. */
  get quality(): Quality {
    return this.webgl ? settings().quality : 'low';
  }

  update(sim: SimState, events: SimEvents, shown: string, deltaMs: number): void {
    this.time += deltaMs;
    if (shown !== this.roomId) {
      this.roomId = shown;
      this.pulses.clear();
    }
    const quality = this.quality;
    const look = QUALITY_LOOK[quality];
    const flashes = settings().flashes;
    const cam = this.scene.cameras.main;
    const view = cam.worldView;
    const here = shown === sim.roomId;
    this.pulses.update(events, deltaMs, flashes, here, view);
    const foundry = shown === FOUNDRY_ROOM;
    const mood: MoodNow = shown === OVERWORLD_ROOM ? moodAt(Math.hypot(view.centerX / TILE_SIZE - WORLD_SHAPE.centre.tx - 0.5, view.centerY / TILE_SIZE - WORLD_SHAPE.centre.ty - 0.5)) : foundry ? FOUNDRY_NOW : SUNNY_MOOD;
    const moody = !this.off;
    // The wash (014's mood tint): the region's; the foundry keeps its own with the mood off (the room's tint, as 014's).
    const wash = this.off && !foundry ? SUNNY_MOOD.wash : mood.wash;
    this.wash.setFillStyle(wash ? rgbInt(wash.rgb) : 0, wash?.alpha ?? 0);
    this.fog.update(view, moody ? look.fog : 0, mood.fog, deltaMs);
    const flash = moody && look.flash ? flashLevel(this.pulses.sinceStrike, flashes) : 0;
    // What carries the ambient as a tint takes the flash in a few steps (props are set again only on a change).
    const stepped = Math.round(flash * LIGHTNING_FLASH.steps) / LIGHTNING_FLASH.steps;
    const tint = rgbInt(withFlash(mood.ambient, stepped));
    const lights = moody && look.lights;
    // Phaser's per-pixel lighting only where the tier lights the ground or props with it (High); Medium lays pools.
    const perPixel = lights && (look.litGround || look.litProps);
    if (perPixel) this.scene.lights.enable().setAmbientColor(rgbInt(withFlash(mood.ambient, flash)));
    else if (this.webgl) this.scene.lights.disable();
    this.world.apply(moody ? { litGround: perPixel && look.litGround, litProps: perPixel && look.litProps, tint } : { litGround: false, litProps: false, tint: null });
    const picked = lights ? pickLights(this.candidates(sim, shown, quality, flashes), quality, { x: view.centerX, y: view.centerY }) : [];
    this.placed = picked.map((l) => ({ x: l.x, y: l.y, radius: l.radius, color: l.color, intensity: l.intensity * mood.lightScale, source: l.source }));
    this.world.lightChunks(this.placed, moody ? tint : null, view);
    this.world.lightProps(perPixel ? this.placed : [], view);
    this.pools.place(lights && look.pools ? this.placed : []);
    for (const [i, light] of this.pool.entries()) {
      const l = perPixel ? picked[i] : undefined;
      const p = this.placed[i];
      if (!l || !p) {
        light.setVisible(false);
        continue;
      }
      light.setVisible(true).setPosition(l.x, l.y);
      light.setRadius(l.radius).setColor(colorOf(l.color)).setIntensity(p.intensity).setZ(l.radius * LIGHT_Z);
    }
    this.catches.begin(this.placed, quality, view);
    const bySource: Partial<Record<LightSourceId, number>> = {};
    for (const l of picked) bySource[l.source] = (bySource[l.source] ?? 0) + 1;
    this.report = {
      quality,
      setting: settings().quality,
      renderer: this.webgl ? 'webgl' : 'canvas',
      off: this.off,
      mood: foundry ? FOUNDRY_MOOD.name : REGION_MOODS[mood.ring].name,
      ring: mood.ring,
      outer: mood.outer,
      blend: mood.blend,
      ambient: mood.ambient,
      flash,
      wash: wash?.alpha ?? 0,
      lights: bySource,
      placed: picked.map((l, i) => ({ source: l.source, x: l.x, y: l.y, radius: l.radius, color: l.color, intensity: this.placed[i]?.intensity ?? 0 })),
      lit: this.world.litCount,
      tint: this.world.current.tint,
      groundTint: this.world.groundTint,
      fog: this.fog.layersShown,
      pools: this.pools.shown,
      applied: this.world.applied,
      catches: [],
    };
  }

  /** Every light that could be placed this frame: 074's sources, and in the foundry its own (079). */
  private candidates(sim: SimState, shown: string, quality: Quality, flashes: boolean): LightCandidate[] {
    const view = this.scene.cameras.main.worldView;
    const out = gatherLights({ sim, shown, view, quality, time: this.time, flashes, pulses: this.pulses, chain: conductorChain(sim, shown) });
    const room = STATIC_ROOMS[FOUNDRY_ROOM];
    if (shown !== FOUNDRY_ROOM || !room) return out;
    return [...out, ...foundryLights({ room, time: this.time, flashes, forges: this.foundry?.onScreen() ?? [], intake: this.foundry?.intake(sim) ?? null })];
  }

  get shown(): LightingShown {
    return { ...this.report, catches: this.catches.shown };
  }
}

