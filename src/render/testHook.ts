import { NO_COMMAND, type Command } from '../sim/input';
import type { SimState } from '../sim/state';
import { summarize, type SimSummary } from '../sim/summary';
import { TILE_SIZE } from '../data/config';
import { FEET_BOX } from '../data/player';
import { isSolid, overlapsRect } from '../sim/collision';
import { roomBodies } from '../sim/bodies';
import { layItem } from '../sim/drops';
import type { GameScene } from './GameScene';
import type { CursorState } from './CursorView';
import type { BottomHudState, HudPanelsState } from './HudView';
import type { MadePopupShown } from './MadePopups';
import type { BuildBarState } from './BuildView';
import type { CraftMenuState } from './CraftMenuView';
import type { PromptState } from './PromptView';
import type { PortShown } from './PortView';
import type { StagePanelState } from './StagePanel';
import type { HealingShown } from './HealingView';
import { claim } from '../sim/claims';

export interface GameTestHook {
  getState(): SimSummary;
  /**
   * Steps `frames` ticks holding `command`. Its dodge, interact, ammo
   * select, build toggle, place, pick-up, deposit, withdraw (each with its amount, 022), setFilter, pylon, travel, takeStash, identify, equip and applyStage apply on the first tick only. Without an aim it keeps the player's last aim, as a still mouse would.
   */
  step(frames: number, command?: Partial<Command>): SimSummary;
  /** Crafts a recipe once between ticks, as clicking its menu row does. */
  craft(recipeId: string): SimSummary;
  ui(): UiState;
  /** The sound settings (020: set from the pause menu). */
  sound(): { muted: boolean; volume: number };
  /** Lays an item on the ground at a world point in the player's room, as a drop would land (021: for the pickup screenshots). */
  drop(itemId: string, x: number, y: number): SimSummary;
  /** Scales the speed of every tween (1 is normal), so a screenshot can catch a short effect mid-way. */
  tweenSpeed(scale: number): void;
  /** The player's room as rows of tiles a player can stand on ('.') or not ('#'), solid things included: for test helpers that find paths. */
  passable(): string[];
  /** Claims a site outright, as holding E at its cleared pylon would (028: the e2e's "or set it claimed"). */
  claim(site: string): SimSummary;
  /** Marks the first `count` objectives done (028: to show a later goal in a screenshot without playing the whole run). */
  completeObjectives(count: number): SimSummary;
  /**
   * Sets a live enemy's health (029: a Husk dies to the frost hit that would freeze it, so the frozen-Husk screenshot
   * keeps one topped up between hits).
   */
  setEnemyHealth(id: number, health: number): SimSummary;
  /** Sets the player's health (030: a hurt player for the healing e2e and screenshots, without a fight). */
  setPlayerHealth(health: number): SimSummary;
}

/**
 * What the render shows, for tests: the world name under the cursor and its description (018), the build bar
 * tip's piece; the minimap (017) with its markers in view px; each node's frame by node id; and the claimed
 * pylon's supply motes (018), how many have started and those on their way.
 */
export interface UiState {
  /** The scene has built its views and the fonts are loaded (020): before this, nothing is drawn. */
  ready: boolean;
  /** The craft menu is open (it doesn't pause, 020), and the pause menu is (Esc: the world stops). */
  craftOpen: boolean;
  paused: boolean;
  /** The hopper picker is open. */
  pickerOpen: boolean;
  /** A site menu (a claimed pylon's, the stash's, the bench's or a sorter's) is open (031: it and the inventory take turns). */
  siteOpen: boolean;
  /** The hopper picker's hint line while it shows (022), else null. */
  pickerHint: string | null;
  /** The counts the hopper picker's rows show, top to bottom (022: they update live). */
  pickerCounts: number[];
  hoverName: string | null;
  hoverDescription: string | null;
  buildTip: string | null;
  minimap: { shown: boolean; markers: { kind: string; x: number; y: number }[] };
  nodes: Record<number, string>;
  supply: { started: number; inFlight: { itemId: string; progress: number }[] };
  /** The camera shakes asked for since boot, oldest first (the last 50) (021). */
  shakes: string[];
  /** Which cursor shows (021: the menu pointer or the crosshair), its depth, and the highest depth of anything else. */
  cursor: CursorState | null;
  /** Picked-up items still sliding into the player (021). */
  sliding: number;
  /** How far the latest slide is in, 0 to 1. */
  slideProgress: number;
  /** Punch swooshes still drawn (023). */
  swooshes: number;
  /** The brass caps drawn on the intake's side entrances (024: seated, or still lifting off), and its prompt text while it shows. */
  intakeCaps: number;
  intakePrompt: string | null;
  /** How far the caps are through lifting off, 0 to 1, or null when none are lifting. */
  intakeLift: number | null;
  /** The entrances whose fire pulse is running up the pipe (028), by index, one per pulse. */
  intakeFirePulses: number[];
  /** The supply ports as drawn (028): each one's raw, the icon on its face and its plate's text. */
  ports: PortShown[];
  /** The tutorial's key prompt as drawn (its key, the world point it floats over, whether the key works now), or null (027). */
  prompt: PromptState | null;
  /** The arrow marker, over the intake for the conduit step (027) or over the ports for the port goal (028): the world point its tip bobs over, or null. */
  marker: { x: number; y: number } | null;
  /** The "+ shaft" popups still on screen (027), by text, with each one's box in view px (031: none overlap). */
  madePopups: MadePopupShown[];
  /** The objective line's finished-goal tick, its alpha (0 once faded): screenshots wait for it to go (028). */
  objectiveTick: number;
  /** The centre of the world camera's view, world px (023: screenshots wait for it to settle on the player). */
  camera: { x: number; y: number };
  /** The bottom HUD as drawn (025), view px: the hotbar row (and whether it shows) and the tube slot with each unit's icon frame and text. */
  hud: BottomHudState | null;
  /** The crafting menu as drawn (026): each recipe row's item names and counts with their boxes, and the group headers. */
  craftMenu: CraftMenuState | null;
  /** The build bar as drawn (026): the unlocked pieces' cells, the shown groups' labels and the dividers. */
  buildBar: BuildBarState | null;
  /**
   * 029: the bench's Stages panel as drawn, star burst flashes still showing, and the tagged rounds' trails in flight
   * (how many, and the most points one runs along).
   */
  tagged: { benchStages: StagePanelState | null; starFlashes: number; trails: { count: number; longest: number } };
  /** 030: the Ley Springs drawn, healing motes in the air, the pylon's thread, the foundry's shimmer, and the spring glowing under the player. */
  healing: HealingShown;
  /** 031: the inventory panel (open, and each group's rows: carried count, at risk, home in the stash). */
  inventory: HudPanelsState['inventory'];
  /** 031: the pickup feed's lines, newest first. */
  pickupFeed: HudPanelsState['pickupFeed'];
  /** 031: the HP bar: the block's box (view px), its "72 / 100", low, the healing glow, and the white chunk in HP (0 for none). */
  health: HudPanelsState['health'];
}

declare global {
  interface Window {
    __GAME__?: GameTestHook;
  }
}

// Dev builds only: lets tests and agents read state and step the sim frame by frame.
// The first step() takes the sim off the real-time loop so tests own the clock.
export function installTestHook(sim: SimState, scene: GameScene): void {
  window.__GAME__ = {
    getState: () => summarize(sim),
    step: (frames, command = {}) => {
      if (!Number.isInteger(frames) || frames < 0) throw new Error(`step() needs a whole number of frames, got ${frames}`);
      scene.manualStepping = true;
      const held: Command = { ...NO_COMMAND, aimX: sim.player.aimX, aimY: sim.player.aimY, ...command };
      const after: Command = {
        ...held,
        dodge: false,
        interact: false,
        selectAmmo: null,
        toggleBuild: false,
        place: null,
        pickUp: null,
        deposit: null,
        withdraw: null,
        setFilter: null,
        pylon: null,
        travel: null,
        takeStash: null,
        identify: false,
        equip: null,
        applyStage: null,
      };
      for (let i = 0; i < frames; i++) {
        // Building with the mouse and keys works under the hook: the scene's queued actions join each tick.
        const base = i === 0 ? held : after;
        const ui = scene.takeUiCommand();
        scene.stepOnce({
          ...base,
          toggleBuild: base.toggleBuild || ui.toggleBuild,
          place: base.place ?? ui.place,
          pickUp: base.pickUp ?? ui.pickUp,
          deposit: base.deposit ?? ui.deposit,
          withdraw: base.withdraw ?? ui.withdraw,
          setFilter: base.setFilter ?? ui.setFilter,
          pylon: base.pylon ?? ui.pylon,
          travel: base.travel ?? ui.travel,
          takeStash: base.takeStash ?? ui.takeStash,
          identify: base.identify || ui.identify,
          equip: base.equip ?? ui.equip,
          applyStage: base.applyStage ?? ui.applyStage,
        });
      }
      return summarize(sim);
    },
    craft: (recipeId) => {
      scene.craft(recipeId);
      return summarize(sim);
    },
    ui: () => scene.hoverText(),
    sound: () => scene.soundSettings(),
    drop: (itemId, x, y) => {
      layItem(sim, itemId, sim.roomId, x, y);
      return summarize(sim);
    },
    tweenSpeed: (scale) => {
      scene.tweens.timeScale = scale;
    },
    claim: (site) => {
      claim(sim, site);
      return summarize(sim);
    },
    completeObjectives: (count) => {
      sim.objectives = sim.objectives.map((done, i) => done || i < count);
      return summarize(sim);
    },
    setEnemyHealth: (id, health) => {
      const e = sim.enemies.find((en) => en.id === id);
      if (e) e.health = health;
      return summarize(sim);
    },
    setPlayerHealth: (health) => {
      sim.player.health = health;
      return summarize(sim);
    },
    passable: () => {
      const { room, obstacles } = roomBodies(sim, sim.roomId);
      return room.rows.map((row, ty) =>
        [...row]
          .map((_, tx) => {
            const cx = (tx + 0.5) * TILE_SIZE;
            const cy = (ty + 0.5) * TILE_SIZE;
            return isSolid(room, tx, ty) || obstacles.some((r) => overlapsRect(cx, cy, FEET_BOX, r)) ? '#' : '.';
          })
          .join(''),
      );
    },
  };
}
