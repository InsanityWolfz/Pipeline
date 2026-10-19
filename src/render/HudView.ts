import type { Scene } from 'phaser';
import { MAX_HEALTH } from '../data/player';
import { worn } from '../sim/armor';
import type { SimEvents } from '../sim/events';
import { unlockedPieces } from '../sim/placement';
import type { SimState } from '../sim/state';
import { hudActive } from '../sim/volley';
import type { ScreenBox } from './bottomHud';
import { EdgeTint } from './EdgeTint';
import { buildBarBox } from './foundryLayout';
import { HealthBar, type HealthShown } from './HealthBar';
import { HotbarView } from './HotbarView';
import { InventoryPanel, type InventoryShown } from './InventoryPanel';
import { PickupFeed } from './PickupFeed';
import { TubeSlotView, type TubeSlotState } from './TubeSlotView';

/** The bottom HUD as drawn (025), for `ui().hud`: the hotbar row's rect and whether it shows, and the tube slot. */
export interface BottomHudState {
  /** `selected` is the highlighted cell's index (0 for key 1). */
  hotbar: ScreenBox & { shown: boolean; selected: number };
  tubeSlot: TubeSlotState;
}

/** The 031 HUD pieces' part of `ui()`: the inventory panel, the pickup feed and the HP bar. */
export interface HudPanelsState {
  inventory: InventoryShown;
  pickupFeed: { itemId: string; count: number }[];
  health: HealthShown;
}

/** The 031 part of `ui()` before the scene has built its views. */
export const NO_HUD_PANELS: HudPanelsState = {
  inventory: { open: false, groups: [] },
  pickupFeed: [],
  health: { box: { x: 0, y: 0, w: 0, h: 0 }, text: '', low: false, healing: false, chunk: 0 },
};

const inBox = (b: ScreenBox, x: number, y: number): boolean => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;

// The HUD: along the bottom (025), the hotbar row centred with the tube slot above
// it showing what the next press fires; bottom-left the HP bar with the armor value
// (031), red screen edges when low; top-left the pickup feed; and the inventory panel
// (I or Tab). Fixed to the screen; reads sim state only. Its motion runs on tween time,
// so the test hook's tween speed slows it with every other effect.
export class HudView {
  private readonly scene: Scene;
  private readonly hotbar: HotbarView;
  private readonly tubeSlot: TubeSlotView;
  private readonly health: HealthBar;
  private readonly edges: EdgeTint;
  private readonly feed: PickupFeed;
  readonly inventory: InventoryPanel;

  constructor(scene: Scene) {
    this.scene = scene;
    this.edges = new EdgeTint(scene);
    this.hotbar = new HotbarView(scene);
    this.tubeSlot = new TubeSlotView(scene);
    this.health = new HealthBar(scene);
    this.feed = new PickupFeed(scene);
    this.inventory = new InventoryPanel(scene);
  }

  /** A screen point on any part of the HUD or the open inventory panel: a press there never fires (015). */
  overUi(x: number, y: number): boolean {
    const parts = [this.tubeSlot.box, this.health.box, ...this.feed.boxes];
    if (this.hotbar.visible) parts.push(this.hotbar.box);
    return parts.some((b) => inBox(b, x, y)) || this.inventory.overUi(x, y);
  }

  /** What the bottom HUD shows, for the test hook. */
  get bottom(): BottomHudState {
    return { hotbar: { ...this.hotbar.box, shown: this.hotbar.visible, selected: this.hotbar.selected }, tubeSlot: this.tubeSlot.state };
  }

  /** The inventory panel, pickup feed and HP bar as drawn (031), for the test hook. */
  get panels(): HudPanelsState {
    return { inventory: this.inventory.shown, pickupFeed: this.feed.shown, health: this.health.shown };
  }

  /**
   * No tube yet (012): no hotbar row, and the tube slot shows the fist. Building: the build bar takes the row's place,
   * the tube slot rises over its group labels (026), and the HP block rises too if the bar reaches it (031).
   * `events` are every tick's since the last draw (the feed reads their pickups); `deltaMs` is the frame's time.
   */
  update(sim: SimState, events: SimEvents, deltaMs: number): void {
    const dt = deltaMs * this.scene.tweens.timeScale;
    const building = sim.building;
    this.hotbar.setVisible(sim.hasTube && !building);
    this.hotbar.update(sim.tube, sim.inventory);
    this.tubeSlot.update(hudActive(sim), building);
    const p = sim.player;
    const input = { health: p.health, max: MAX_HEALTH, healing: p.healing !== null, dying: p.dying > 0, worn: worn(sim) };
    this.health.update(input, building ? buildBarBox(unlockedPieces(sim)) : null, dt);
    this.edges.update(this.health.shown.low, this.health.pulse);
    this.feed.update(events.pickups, dt);
    this.inventory.update(sim);
  }
}
