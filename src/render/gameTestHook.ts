import type { SimSummary } from '../sim/summary';
import type { Command } from '../sim/input';
import type { FlowReport } from './flow/flowTypes';
import type { GearPiece } from '../data/gear';
import type { KeywordReport } from '../data/keywordReport';
import type { Legibility } from './Legibility';
import type { Quality } from '../data/settings';
import type { PlayerPixels } from './PlayerView';
import type { UiState } from './testHook';

// window.__GAME__ (dev builds): what tests drive the game through. Split from testHook (078), which holds what ui() reports.

export interface GameTestHook {
  /** The live game's summary; null on the title (042). */
  getState(): SimSummary;
  /** 042: the flow's state, the save slot's status, saves written this session, and stored notes. */
  flow(): FlowReport;
  /**
   * Steps `frames` ticks holding `command`. Its dodge, interact, carried slot
   * select and assign (047), build toggle, place, pick-up, deposit, withdraw (each with its amount, 022), sortInventory (047), pylon, travel, takeStash, identify, equip, restore (033), summon, takeTalent and respec (037) apply on the first tick only. Without an aim it keeps the player's last aim, as a still mouse would.
   */
  step(frames: number, command?: Partial<Command>): SimSummary;
  /** Crafts a recipe once between ticks, as clicking its menu row does (070: `max`, as a Shift-click does). */
  craft(recipeId: string, max?: boolean): SimSummary;
  /** Hands the ticks back to the game loop after step() took them (050: a test of what a live key press reaches the sim). */
  resume(): void;
  ui(): UiState;
  /** The sound settings (020: set from the pause menu). */
  sound(): { muted: boolean; volume: number };
  /** Lays an item on the ground at a world point in the player's room, as a drop would land (021: for the pickup screenshots). */
  drop(itemId: string, x: number, y: number): SimSummary;
  /** Scales the speed of every tween (1 is normal), so a screenshot can catch a short effect mid-way. */
  tweenSpeed(scale: number): void;
  /** 074: sets the Graphics quality and Flashes, as their Settings rows do (stored, applied live). */
  setLook(look: { quality?: Quality; flashes?: boolean }): void;
  /** 078: opens every intake entrance and fills each with a round (999 of it), or empties it with null: a volley anywhere. */
  loadEntrances(rounds: (string | null)[]): SimSummary;
  /** 078: skips the shot effects (trails, impacts, marks, sparks), as `?fx=off` does, for the probe's A/B in one page. */
  fxOff(off: boolean): void;
  /** 078: holds the trail cap at `cap` (null: the tier's again), so a test can fly more rounds than it allows. */
  trailCap(cap: number | null): void;
  /** 074: skips every mood, light and fog (as `?mood=off` does), for the frame-time A/B in one page. */
  lightingOff(off: boolean): void;
  /** 077: skips plants, sway, ripples, ley flow, set-piece loops and weather (as `?world=off`); and the next weather strike now. */
  worldLifeOff(off: boolean): void;
  strikeWeather(): void;
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
  /** Reveals the whole overworld on the minimap, as if every tile had been on screen (053: the round world's shot). */
  revealMap(): SimSummary;
  /**
   * Spawns a pack near the player (032: to fight a champion): `enemyIds` in a row 6 tiles right of the player, a
   * tile and a half apart, member `champion` (or none, for null) a champion named with the seeded RNG.
   */
  spawnChampionPack(enemyIds: string[], champion?: number | null): SimSummary;
  /**
   * Puts one enemy at a world point in the player's room, homed there (035: a test pack of each of Region 2's kinds
   * in the `?start=hollows` sandbox), a champion named with the seeded RNG if `champion`.
   */
  spawnEnemy(enemyId: string, x: number, y: number, champion?: boolean): SimSummary;
  /** Gives the player an identified piece, unworn, under the next id (036: a relic for the screenshots, without the roll). */
  addGear(piece: Omit<GearPiece, 'id'>): SimSummary;
  /** Gives the player XP as a kill would, levels and points included (037: a later level for the screenshots, without the fights). */
  gainXp(amount: number): SimSummary;
  /** 039: the rendered keyword list and every content line, as the game shows them. */
  keywords(): KeywordReport;
  /** 040: every summary the game can show (each round, talent, stage and gear piece), laid out as drawn: its rows (at most four), whether a line was cut, its size. */
  summaryRows(): ReturnType<Legibility['summaryRows']>;
  /** 075: the wanderer's drawn box and hem colour, read from its texture (null on the title); 078: its muzzle mark and its drawn edge along `along`. */
  wanderer(along?: number): PlayerPixels | null;
  /** 075: holds the wanderer's idle clock (breath, sway, trim pulse and shimmer) at `ms`, or lets it run again with null, so a pixel check samples a still frame. */
  wandererClock(ms: number | null): void;
}

declare global {
  interface Window {
    __GAME__?: GameTestHook;
  }
}
