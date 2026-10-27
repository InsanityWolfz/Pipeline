import { WEBGL, type GameObjects, type Scene } from 'phaser';
import { DEPTHS } from '../../data/assets';
import { TILE_SIZE, VIEW_HEIGHT, VIEW_WIDTH } from '../../data/config';
import { LIGHT_BUDGET, LIGHT_Z, QUALITY_LOOK, type LightSourceId } from '../../data/lights';
import { OVERWORLD_ROOM } from '../../data/overworld';
import { FOUNDRY_ROOM } from '../../data/rooms';
import type { Quality } from '../../data/settings';
import { WORLD_SHAPE } from '../../data/worldShape';
import type { SimEvents } from '../../sim/events';
import type { SimState } from '../../sim/state';
import { colorOf } from '../color';
import { settings } from '../flow/settingsStore';
import { FogView } from './FogView';
import { CatchView, type CatchShown } from './CatchView';
import { conductorChain, gatherLights } from './lightSources';
import { LightPulses } from './lightPulses';
import type { PlacedLight } from './lightCatch';
import { pickLights } from './lightPick';
import { flashLevel, moodAt, rgbInt, SUNNY_MOOD, withFlash, type MoodNow, type Rgb } from './mood';
import type { WorldLayer } from './WorldLayer';

// 074: the region's light. Each frame: the mood where the camera's centre stands (blended at region edges), the
// lightning flash, the screen wash and fog; the world layer lit by the scene's lights or tinted with the ambient as the
// Graphics quality says (re-set over the registry only on a change); and the lights picked for this frame placed from a
// pool of 16 made once. The foundry keeps its own warm tint (AmbientView) with no lights until 079. Looks only.

/** What `ui().lighting` reports. */
export interface LightingShown {
  quality: Quality;
  /** The quality setting asked for (a Canvas renderer runs as Low whatever it says). */
  setting: Quality;
  renderer: 'webgl' | 'canvas';
  /** `?mood=off` (dev): every mood, light and fog skipped. */
  off: boolean;
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
  fog: number;
  /** Times the world layer's look was set over its registry (it changes only on a change). */
  applied: number;
  /** Light catches drawn now. */
  catches: CatchShown[];
}

export const NO_LIGHTING: LightingShown = { quality: 'medium', setting: 'medium', renderer: 'webgl', off: false, ring: 0, outer: null, blend: 0, ambient: [255, 255, 255], flash: 0, wash: 0, lights: {}, placed: [], lit: 0, tint: null, fog: 0, applied: 0, catches: [] };

const POOL = LIGHT_BUDGET.high;

export class LightingView {
  private readonly scene: Scene;
  private readonly world: WorldLayer;
  private readonly fog: FogView;
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

  constructor(scene: Scene, world: WorldLayer) {
    this.scene = scene;
    this.world = world;
    // `?mood=off` (dev only) skips every mood, light and fog, for the frame-time A/B.
    this.off = import.meta.env.DEV && new URLSearchParams(window.location.search).get('mood') === 'off';
    this.webgl = scene.sys.renderer.type === WEBGL;
    this.fog = new FogView(scene);
    this.catches = new CatchView(scene);
    this.wash = scene.add.rectangle(0, 0, VIEW_WIDTH, VIEW_HEIGHT, 0, 0).setOrigin(0).setScrollFactor(0).setDepth(DEPTHS.mood);
    if (this.webgl) for (let i = 0; i < POOL; i++) this.pool.push(scene.lights.addLight(0, 0, 1, 0xffffff, 0).setVisible(false));
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
    const mood: MoodNow = shown === OVERWORLD_ROOM ? moodAt(Math.hypot(view.centerX / TILE_SIZE - WORLD_SHAPE.centre.tx - 0.5, view.centerY / TILE_SIZE - WORLD_SHAPE.centre.ty - 0.5)) : SUNNY_MOOD;
    const moody = !this.off && !foundry;
    // The wash (014's mood tint): the region's, or none in the foundry, whose own warm tint AmbientView keeps.
    const wash = foundry ? null : this.off ? SUNNY_MOOD.wash : mood.wash;
    this.wash.setFillStyle(wash ? rgbInt(wash.rgb) : 0, wash?.alpha ?? 0);
    this.fog.update(view, moody ? look.fog : 0, mood.fog, deltaMs);
    const flash = moody && look.flash ? flashLevel(this.pulses.sinceStrike, flashes) : 0;
    const lights = moody && look.lights;
    if (lights) this.scene.lights.enable().setAmbientColor(rgbInt(withFlash(mood.ambient, flash)));
    else if (this.webgl) this.scene.lights.disable();
    this.world.apply(moody ? { litGround: lights && look.litGround, litProps: lights && look.litProps, tint: rgbInt(mood.ambient) } : { litGround: false, litProps: false, tint: null });
    const picked = lights ? pickLights(gatherLights({ sim, shown, view, quality, time: this.time, flashes, pulses: this.pulses, chain: conductorChain(sim, shown) }), quality, { x: view.centerX, y: view.centerY }) : [];
    this.placed = picked.map((l) => ({ x: l.x, y: l.y, radius: l.radius, color: l.color, intensity: l.intensity * mood.lightScale }));
    this.world.lightChunks(this.placed, moody ? rgbInt(withFlash(mood.ambient, flash)) : null, view);
    for (const [i, light] of this.pool.entries()) {
      const l = picked[i];
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
      fog: this.fog.layersShown,
      applied: this.world.applied,
      catches: [],
    };
  }

  get shown(): LightingShown {
    return { ...this.report, catches: this.catches.shown };
  }
}

