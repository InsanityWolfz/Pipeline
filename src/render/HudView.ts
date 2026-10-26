import type { Scene } from 'phaser';
import { playerStats } from '../sim/stats';
import { xpToNext } from '../sim/leveling';
import type { SimEvents } from '../sim/events';
import { unlockedPieces } from '../sim/placement';
import type { SimState } from '../sim/state';
import { hudActive, type HudActive } from '../sim/volley';
import type { ScreenBox } from './bottomHud';
import { EdgeTint } from './EdgeTint';
import { buildBarBox } from './foundryLayout';
import { HealthBar, type HealthShown } from './HealthBar';
import { HotbarView, type CarriedBarShown } from './HotbarView';
import { InventoryPanel, type InventoryShown } from './InventoryPanel';
import { ResearchList, type ResearchListState } from './ResearchList';
import { PickupFeed } from './PickupFeed';
import { sandboxFeedAt } from './sandboxPopout';
import { shownKey } from './itemShown';
import { craftFeed } from './pickupFeedModel';
import { tubeCardLabel } from './tubeCard';
import { readyItem } from '../sim/hotbar';
import { settings } from './flow/settingsStore';
import { TubeSlotView, type TubeSlotState } from './TubeSlotView';
import { CarriedHintView, type CarriedHintShown } from './CarriedHintView';
import { CARRIED_HINT } from '../data/hints';
import { BossBar, type BossBarShown } from './BossBar';
import { NO_TALENT_PANEL, TalentPanel, type TalentPanelState, type TalentTabState } from './TalentPanel';
import type { TipHit } from './tipTypes';
import type { BuildTabState } from './BuildTab';
import type { ChipId } from '../data/legibility';

/** The bottom HUD as drawn (025, 047), for `ui().hud`: the carried bar's rect, whether it shows and its slots, and the intake's bar (the tube slot). */
export interface BottomHudState {
  /** `selected` is the highlighted cell's index (0 for key 1). */
  hotbar: ScreenBox & { shown: boolean; selected: number } & CarriedBarShown;
  tubeSlot: TubeSlotState;
  /** 051 (B.7): the mouse (or bound key) beside the carried bar, and the slot swap as the attune ends. */
  carriedHint: CarriedHintShown;
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
  /** 040: the T panel's tab, and the Build tab's rows while it shows. */
  talentPanel: TalentTabState;
  buildTab: BuildTabState;
}

/** The 031 part of `ui()` before the scene has built its views. */
export const NO_HUD_PANELS: HudPanelsState = {
  inventory: { open: false, mode: null, containerId: null, scroll: 0, rows: 0, slots: [], container: [], stash: [], stashScroll: 0, stashRows: 0, sort: { x: 0, y: 0, w: 0, h: 0 }, footer: [], panel: { x: 0, y: 0, w: 0, h: 0 } },
  researchList: { open: false, groups: [] },
  pickupFeed: [],
  health: { box: { x: 0, y: 0, w: 0, h: 0 }, text: '', low: false, healing: false, chunk: 0, slowed: false, xp: { text: '', fill: 0, pip: false, tick: 0, bar: { x: 0, y: 0, w: 0, h: 0 } } },
  bossBar: null,
  talents: NO_TALENT_PANEL,
  talentPanel: { open: false, tab: 'talents', tabs: [], panel: { x: 0, y: 0, w: 0, h: 0 } },
  buildTab: { rows: [] },
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
  private readonly carriedHint: CarriedHintView;
  /** 051 (B.7): what the intake's bar showed last frame, and the old left-click slot it keeps through the attune. */
  private lastActive: HudActive | null = null;
  private heldActive: HudActive | null = null;
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
    this.carriedHint = new CarriedHintView(scene);
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

  /** The carried bar's slot under a view point (047: a dragged stack lands there), or null. */
  carriedSlotAt(x: number, y: number): number | null {
    return this.hotbar.slotAt(x, y);
  }

  /** What's under a view point for a tip (040): a talent node, an inventory ammo row, the tube slot's round, a hotbar slot. */
  tipAt(x: number, y: number): TipHit | null {
    return this.talents.tipAt(x, y) ?? this.inventory.tipAt(x, y) ?? this.tubeSlot.tipAt(x, y) ?? this.hotbar.tipAt(x, y);
  }

  /** A Build tab row's chip under a view point (040). */
  chipAt(x: number, y: number): ChipId | null {
    return this.talents.chipAt(x, y);
  }

  /** 051: the bottom HUD's fixed boxes (the tube slot, the health bar, the carried bar and its hint), view px. */
  get fixedBoxes(): ScreenBox[] {
    const boxes = [this.tubeSlot.box, this.health.box];
    if (this.hotbar.visible) boxes.push(this.hotbar.box);
    const hint = this.carriedHint.box;
    if (hint) boxes.push(hint);
    return boxes;
  }

  /** A screen point on any part of the HUD or the open inventory panel: a press there never fires (015). */
  overUi(x: number, y: number): boolean {
    const parts = [this.tubeSlot.box, this.health.box, ...this.feed.boxes];
    if (this.hotbar.visible) parts.push(this.hotbar.box);
    const hint = this.carriedHint.box;
    if (hint) parts.push(hint);
    return parts.some((b) => inBox(b, x, y)) || this.inventory.overUi(x, y) || this.talents.overUi(x, y);
  }

  /** What the bottom HUD shows, for the test hook. */
  get bottom(): BottomHudState {
    return { hotbar: { ...this.hotbar.box, shown: this.hotbar.visible, selected: this.hotbar.selected, ...this.hotbar.state }, tubeSlot: this.tubeSlot.state, carriedHint: this.carriedHint.shown };
  }

  /** The inventory panel, pickup feed and HP bar as drawn (031), for the test hook. */
  get panels(): HudPanelsState {
    return { inventory: this.inventory.shown, researchList: this.research.shown, pickupFeed: this.feed.shown, health: this.health.shown, bossBar: this.boss.shown, talents: this.talents.shown, talentPanel: this.talents.tabState, buildTab: this.talents.buildRows };
  }

  /**
   * No tube yet (012): no hotbar row, and the tube slot shows the fist. Building: the build bar takes the row's place,
   * the tube slot rises over its group labels (026), and the HP block rises too if the bar reaches it (031).
   * `events` are every tick's since the last draw (the feed reads their pickups); `deltaMs` is the frame's time.
   * `loadoutOut`: how far the sandbox's Loadout panel is out (057, 0–1): there the feed moves out beside its tab.
   */
  update(sim: SimState, events: SimEvents, deltaMs: number, loadoutOut = 0): void {
    const dt = deltaMs * this.scene.tweens.timeScale;
    const building = sim.building;
    this.hotbar.setVisible(sim.hasTube && !building);
    this.hotbar.update(sim.hotbar, sim.inventory);
    this.carriedHint.update(this.hotbar.visible);
    // 051 (B.7): through the attune the intake's bar keeps the old left-click slot (the carried round); as it ends, that
    // slot shrinks into the carried bar and the intake's appears in its place.
    const active = hudActive(sim);
    if (events.attunes.length > 0 && this.lastActive?.kind === 'carried') this.heldActive = this.lastActive;
    const ending = events.hints.some((h) => h.id === CARRIED_HINT.id);
    const before = this.tubeSlot.state;
    // 070: the fist says when right click has carried rounds to fire.
    const fist = tubeCardLabel(active, { hasTube: sim.hasTube, attuned: sim.link.attuned, carriedReady: readyItem(sim) !== null, building }, settings().bindings.use);
    this.tubeSlot.update(this.heldActive && sim.link.attunePulse > 0 && !ending ? this.heldActive : active, building, fist);
    if (ending) {
      this.carriedHint.swap(before, before.icons[0], sim.hotbar.selected, (a) => this.tubeSlot.setAlpha(a));
      this.heldActive = null;
    }
    this.lastActive = active;
    const p = sim.player;
    const stats = playerStats(sim);
    const toNext = xpToNext(sim);
    const xp = { level: sim.level, fill: toNext > 0 ? sim.xp / toNext : 1, points: sim.talentPoints, gained: events.xp.length > 0 };
    const input = { health: p.health, max: stats.maxHealth, healing: p.healing !== null, dying: p.dying > 0, armor: stats.armor, xp, slowed: p.slowTicks > 0 };
    this.health.update(input, building ? buildBarBox(unlockedPieces(sim)) : null, dt);
    this.edges.update(this.health.shown.low, this.health.pulse);
    // 056.4, 057: in the sandbox the feed sits right of the Loadout tab, which holds the top-left, and moves out with it.
    // 070: a craft max adds one line of everything it made.
    const gained = [...events.pickups.map((p) => ({ key: shownKey(sim, p.itemId), count: 1 })), ...craftFeed(events.crafts).map((c) => ({ key: shownKey(sim, c.itemId), count: c.count }))];
    this.feed.update(gained, dt, sim.sandbox ? sandboxFeedAt(loadoutOut) : null);
    // A KO closes the panel: the wake panel takes the screen (and the panel can't open again while it shows).
    if (events.woke) {
      this.inventory.setOpen(false);
      this.research.setOpen(false);
      this.talents.setOpen(false);
    }
    // 047: a hopper's or crate's screen shows its own slots over the grid.
    const box = sim.foundry.pieces.find((p) => p.id === this.inventory.container);
    this.inventory.update(sim, box?.kind === 'hopper' || box?.kind === 'crate' ? box : undefined);
    this.research.update(sim);
    this.talents.update(sim);
    this.boss.update(sim);
  }
}
