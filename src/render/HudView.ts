import type { Scene } from 'phaser';
import { playerStats } from '../sim/stats';
import { xpToNext } from '../sim/leveling';
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
import { ResearchList, type ResearchListState } from './ResearchList';
import { PickupFeed } from './PickupFeed';
import { shownKey } from './itemShown';
import { TubeSlotView, type TubeSlotState } from './TubeSlotView';
import { BossBar, type BossBarShown } from './BossBar';
import { NO_TALENT_PANEL, TalentPanel, type TalentPanelState } from './TalentPanel';

/** The bottom HUD as drawn (025), for `ui().hud`: the hotbar row's rect and whether it shows, and the tube slot. */
export interface BottomHudState {
  /** `selected` is the highlighted cell's index (0 for key 1). */
  hotbar: ScreenBox & { shown: boolean; selected: number };
  tubeSlot: TubeSlotState;
}

/** The 031 HUD pieces' part of `ui()`: the inventory panel, the pickup feed and the HP bar. */
export interface HudPanelsState {
  inventory: InventoryShown;
  /** 033: the research list (J). */
  researchList: ResearchListState;
  pickupFeed: { itemId: string; count: number }[];
  health: HealthShown;
  /** 034: the boss bar along the top while a region boss fights. */
  bossBar: BossBarShown;
  /** 037: the tree panel (T). */
  talents: TalentPanelState;
}

/** The 031 part of `ui()` before the scene has built its views. */
export const NO_HUD_PANELS: HudPanelsState = {
  inventory: { open: false, groups: [] },
  researchList: { open: false, groups: [] },
  pickupFeed: [],
  health: { box: { x: 0, y: 0, w: 0, h: 0 }, text: '', low: false, healing: false, chunk: 0, xp: { text: '', fill: 0, pip: false, tick: 0, bar: { x: 0, y: 0, w: 0, h: 0 } } },
  bossBar: null,
  talents: NO_TALENT_PANEL,
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
  /** The research list (033, J). */
  readonly research: ResearchList;
  /** A region boss's bar along the top (034). */
  private readonly boss: BossBar;
  /** The tree panel (037, T). */
  readonly talents: TalentPanel;

  constructor(scene: Scene) {
    this.scene = scene;
    this.edges = new EdgeTint(scene);
    this.hotbar = new HotbarView(scene);
    this.tubeSlot = new TubeSlotView(scene);
    this.health = new HealthBar(scene);
    this.feed = new PickupFeed(scene);
    this.research = new ResearchList(scene);
    this.inventory = new InventoryPanel(scene);
    this.boss = new BossBar(scene);
    this.talents = new TalentPanel(scene);
  }

  /** The tree panel's hover follows the pointer (view px). */
  pointAt(x: number, y: number): void {
    this.talents.pointAt(x, y);
  }

  /** A screen point on any part of the HUD or the open inventory panel: a press there never fires (015). */
  overUi(x: number, y: number): boolean {
    const parts = [this.tubeSlot.box, this.health.box, ...this.feed.boxes];
    if (this.hotbar.visible) parts.push(this.hotbar.box);
    return parts.some((b) => inBox(b, x, y)) || this.inventory.overUi(x, y) || this.talents.overUi(x, y);
  }

  /** What the bottom HUD shows, for the test hook. */
  get bottom(): BottomHudState {
    return { hotbar: { ...this.hotbar.box, shown: this.hotbar.visible, selected: this.hotbar.selected }, tubeSlot: this.tubeSlot.state };
  }

  /** The inventory panel, pickup feed and HP bar as drawn (031), for the test hook. */
  get panels(): HudPanelsState {
    return { inventory: this.inventory.shown, researchList: this.research.shown, pickupFeed: this.feed.shown, health: this.health.shown, bossBar: this.boss.shown, talents: this.talents.shown };
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
    const stats = playerStats(sim);
    const toNext = xpToNext(sim);
    const xp = { level: sim.level, fill: toNext > 0 ? sim.xp / toNext : 1, points: sim.talentPoints, gained: events.xp.length > 0 };
    const input = { health: p.health, max: stats.maxHealth, healing: p.healing !== null, dying: p.dying > 0, armor: stats.armor, xp };
    this.health.update(input, building ? buildBarBox(unlockedPieces(sim)) : null, dt);
    this.edges.update(this.health.shown.low, this.health.pulse);
    this.feed.update(events.pickups.map((p) => shownKey(sim, p.itemId)), dt);
    // A KO closes the panel: the wake panel takes the screen (and the panel can't open again while it shows).
    if (events.ko) {
      this.inventory.setOpen(false);
      this.research.setOpen(false);
      this.talents.setOpen(false);
    }
    this.inventory.update(sim);
    this.research.update(sim);
    this.talents.update(sim);
    this.boss.update(sim);
  }
}
