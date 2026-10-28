import type { TunnelMark } from './tunnelMarks';
import type { GroundItemShown } from './GroundItemView';
import type { InteractPromptState } from './InteractPrompt';
import type { SimSummary } from '../sim/summary';
import type { Command } from '../sim/input';
import type { FlowReport, FlowUi } from './flow/flowTypes';
import type { CursorState } from './CursorView';
import type { BottomHudState, HudPanelsState } from './HudView';
import type { MadePopupShown } from './MadePopups';
import type { BuildBarState } from './BuildView';
import type { BlueprintUiShown } from './BlueprintUi';
import type { CraftMenuState } from './CraftMenuView';
import type { WaypointShown } from './WaypointView';
import type { FoundryMapShown } from './FoundryMapView';
import type { SubStepShown } from './ObjectiveView';
import type { GuidedShown } from './GuidedView';
import type { PromptState } from './PromptView';
import type { PortShown } from './PortView';
import type { GearPanelState } from './GearPanel';
import type { GearPiece } from '../data/gear';
import type { RelicsShown } from './RelicView';
import type { TalentFxShown } from './TalentFxView';
import type { MinesShown } from './MineView';
import type { HealingShown } from './HealingView';
import type { KeywordReport } from '../data/keywordReport';
import type { ChampionShown } from './EnemyView';
import type { LandmarksShown } from './LandmarkView';
import type { ResearchShown } from './ResearchView';
import type { SchematicsShown } from './SchematicView';
import type { RestorePanelState } from './RestorePanel';
import type { ResearchListState } from './ResearchList';
import type { HollowsShown } from './HollowsView';
import type { EmberworksShown } from './EmberworksView';
import type { StormcrownShown } from './StormcrownView';
import type { ArenaDoorShown } from './ArenaDoorView';
import type { HollowsEnemiesShown } from './hollowsEnemyArt';
import type { EnemyBarShown } from './enemyBar';
import type { EnemyArtUi } from './EnemyView';
import type { Legibility, LegibilityUi } from './Legibility';
import type { SandboxPanelState } from './SandboxPanel';
import type { PlayerPixels, PlayerUi } from './PlayerView';
import type { LightingShown } from './lighting/LightingView';
import type { Quality } from '../data/settings';

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
  /** 074: skips every mood, light and fog (as `?mood=off` does), for the frame-time A/B in one page. */
  lightingOff(off: boolean): void;
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
  /** 075: the wanderer's drawn box and hem colour, read from its texture (null on the title). */
  wanderer(): PlayerPixels | null;
}

/**
 * What the render shows, for tests: the world name under the cursor and its description (018), the build bar
 * tip's piece; the minimap (017) with its markers in view px; each node's frame by node id; and the claimed
 * pylon's supply motes (018), how many have started and those on their way.
 */
export interface UiState {
  /** The scene has built its views and the fonts are loaded (020): before this, nothing is drawn. */
  ready: boolean;
  /** The sim tick the last drawn frame showed (-1 before one): after a step, wait until it matches the state's tick before reading what's drawn. */
  drawnTick: number;
  /** The craft menu is open (it doesn't pause, 020), and the pause menu is (Esc: the world stops). */
  craftOpen: boolean;
  paused: boolean;
  /** A hopper's or crate's screen is open (047; it replaced 022's hopper picker). */
  pickerOpen: boolean;
  /** A site menu (a claimed pylon's, the stash's or the bench's) is open (031: it and the inventory take turns). */
  siteOpen: boolean;
  /** The counts the open hopper's or crate's own slots show, in order (047; they update live). */
  pickerCounts: number[];
  hoverName: string | null;
  hoverDescription: string | null;
  buildTip: string | null;
  /** 017, 051: the minimap, its markers (view px, with the name hovering shows), and the hovered one's name. */
  minimap: { shown: boolean; markers: { kind: string; x: number; y: number; name?: string }[]; hover: string | null };
  /** 051 (B.6): the foundry's minimap while it shows: carriers' lines, pieces' dots and the icons, view px. */
  foundryMap: FoundryMapShown;
  nodes: Record<number, string>;
  /** 051 (B.4): the drawn nodes whose harvestable glow shows, by node id. */
  nodeGlow: number[];
  /** 032: each mote's site, the claimed pylon it left from. */
  supply: { started: number; inFlight: { itemId: string; progress: number; site: string; icon: string; iconShown: boolean }[] };
  /** 053: the overworld's ground chunks built now, as `cx,cy` keys (only those near the camera are). */
  overworldChunks: string[];
  /** 074: each overworld ground chunk's bake time so far, ms. */
  groundBakeMs: readonly number[];
  /** The camera shakes asked for since boot, oldest first (the last 50) (021). */
  shakes: string[];
  /** 060: burn beats' small numbers shown since boot, and enemies drawn with flames on them now. */
  burnNumbers: number;
  enemyFlames: number;
  /** Particles flying now (064); 076: as `live`, with the death motes among them and the deaths dissolving. */
  particles: { live: number; deathMotes: number; thrown: number; dissolving: number };
  /** Which cursor shows (021: the menu pointer or the crosshair), its depth, and the highest depth of anything else. */
  cursor: CursorState | null;
  /** Picked-up items still sliding into the player (021). */
  sliding: number;
  /** 045: the ground items in the shown room as drawn: where, whether shown yet (a cache's wait in the chest), and the name over a bursting one. */
  groundItems: GroundItemShown[];
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
  /** 045 (043.5): the forum seal's hum is looping, and how many drops have played the barrier's collapse. */
  sealSound: { humming: boolean; drops: number };
  /** 045: the in-reach E prompt as drawn (what it's over, its bound key, the world point), or null. */
  interactPrompt: InteractPromptState | null;
  /** The waypoint arrow's tip over a target in the player's room (051; was 027's marker), world px, or null. */
  marker: { x: number; y: number } | null;
  /** 051: the waypoint arrow as drawn: at the screen's edge or over its target, its tip (world px) and angle, through a door or not, and any raw icons. */
  waypoint: WaypointShown | null;
  /**
   * 051 (B.3): the objective line's text and its sub-lines as drawn (raw, words, ticked, box); fix-playtest-ui: the
   * lines its text wraps onto, its band (view px, null while none shows) and the corner map's width it's capped at.
   */
  objective: { text: string; subSteps: SubStepShown[]; lines: number; box: { x: number; y: number; w: number; h: number } | null; capWidth: number };
  /** 058: the guided build's ghosts as drawn (the next first), the remove label and a refused placement's hint. */
  guided: GuidedShown;
  /** 067: the line over a sealed door pushed into or E'd at ("Claim the shrine first") while it shows, else null. */
  sealedDoor: string | null;
  /** The "+ shaft" popups still on screen (027), by text, with each one's box in view px (031: none overlap). */
  madePopups: MadePopupShown[];
  /** The objective line's finished-goal tick, its alpha (0 once faded): screenshots wait for it to go (028). */
  objectiveTick: number;
  /** The centre of the world camera's view, world px (023: screenshots wait for it to settle on the player), and the player's sprite point it follows (042: locked to it). */
  /** 069: `zoom` is the world's zoom over the view (1, or build mode's 0.75 zoomed out). */
  camera: { x: number; y: number; player: { x: number; y: number }; fading: boolean; zoom: number; shaking: boolean };
  /** 065: the slow's wind curls are drawn round the player. */
  slowSwirl: boolean;
  /** 075: the wanderer drawn: view, animation, scheme, trim, squash, hood, draw time and tint. Null before the scene. */
  player: PlayerUi | null;
  /** 070: the player shows as a silhouette (a ruin block, tree, the bench or a machine in front hides them). */
  silhouette: boolean;
  /** The bottom HUD as drawn (025), view px: the hotbar row (and whether it shows) and the tube slot with each unit's icon frame and text. */
  hud: BottomHudState | null;
  /** The crafting menu as drawn (026): each recipe row's item names and counts with their boxes, and the group headers. */
  craftMenu: CraftMenuState | null;
  /** The build bar as drawn (026): the unlocked pieces' cells, the shown groups' labels and the dividers. */
  buildBar: BuildBarState | null;
  /** 063: build mode's tools: the tool in use, the area box and what it counts, its menu's rows, and the Tools cells. */
  blueprints: BlueprintUiShown;
  /** 052: the underground pair's marks on the floor: a pair's tunnel (hovered, or the ghost that would pair) and an entrance's reach while placing. */
  tunnels: TunnelMark[];
  /**
   * 029: Split flashes still showing, and the tagged rounds' trails in flight (how many, and the most points one runs
   * along). 047 removed the bench's Stages panel from here. 054: burning arrows drawn with their flame, and Shards drawn.
   */
  tagged: { splitFlashes: number; trails: { count: number; longest: number }; burning: number; shards: number };
  /** 030: the Ley Springs drawn, healing motes in the air, the pylon's thread, the foundry's shimmer, and the spring glowing under the player. */
  healing: HealingShown;
  /** 031: the inventory panel (open, and each group's rows: carried count, at risk, home in the stash). */
  inventory: HudPanelsState['inventory'];
  /** 031: the pickup feed's lines, newest first. */
  pickupFeed: HudPanelsState['pickupFeed'];
  /** 031: the HP bar: the block's box (view px), its "72 / 100", low, the healing glow, and the white chunk in HP (0 for none). */
  health: HudPanelsState['health'];
  /** 034: the boss bar along the top while a region boss fights: its name and health, or null. */
  bossBar: HudPanelsState['bossBar'];
  /** 032: the discovery banner's name while it shows, each reliquary's frame, and the landmark art drawn. */
  landmarks: LandmarksShown;
  /** 032: champions drawn, each with its name and kind lines, its scale and its glow's alpha. */
  champions: ChampionShown[];
  /** 035: Burrower ripples on show, Shardback flares lit, and each Sniper's laser as drawn (locked, its blink on, its ends). */
  hollowsEnemies: HollowsEnemiesShown;
  /** 054: each drawn enemy's health bar: whether it shows, and whether it reads immune (blue, with the shield). */
  enemyBars: EnemyBarShown[];
  /** 076: each drawn enemy's art: family, pose, wind-up phase, reaction, squash, the frame shown and the tremble. */
  enemyArt: EnemyArtUi[];
  /** 076: the boot's vector bake: wall ms, texture pages, frames and the enemy frames among them. */
  vectorBake: { ms: number; pages: number; frames: number; enemyFrames: number };
  /** 032: the waystone's menu while open (two or more claimed pylons): each row's text and box, view px; else null. */
  waystone: { text: string; x: number; y: number; w: number; h: number }[] | null;
  /** 069: an intake entrance's purge menu while open: its row's text and box, view px; else null. */
  purgeMenu: { text: string; x: number; y: number; w: number; h: number }[] | null;
  /** 033: the diagrams drawn on the foundry, restored parts, running effects and the wing door. */
  research: ResearchShown;
  /** 058: the last few banners that started (discoveries, schematics, recipe unlocks), oldest first. */
  banners: { kind: string; kicker: string; name: string }[];
  /** 058: how strongly the banner showing now shows (0..1; 0 with none). */
  bannerAlpha: number;
  /** 033: the schematics' light pillars and the banner's schematic line. */
  schematics: SchematicsShown;
  /** 033: the restore panel while open (E at a diagram), else null. */
  restorePanel: RestorePanelState | null;
  /** 034: the altar's offering while open (E at an awake altar), in the restore panel's shape (its `node` the altar), else null. */
  altarPanel: RestorePanelState | null;
  /** 033: the research list (J). */
  researchList: ResearchListState;
  /** 034: the Hollows' barrier, the altar's state, the summon's circle and the Bulwark's bombs, as drawn. */
  hollows: HollowsShown;
  /** 060: the Emberworks' barrier across its ramps, as drawn. */
  emberworks: EmberworksShown;
  /** 064: the Stormcrown's barrier. */
  stormcrown: StormcrownShown;
  /** 064: lightning arcs on screen. */
  lightningArcs: number;
  /** 055: each boss arena's door in the room on screen, sealed or open, and 043's seal over it while its boss fights. */
  arenaDoors: ArenaDoorShown[];
  /** 036: the bench's gear panel while open (its cells, tabs, rows with ids and boxes, page and totals), else null. */
  gearPanel: GearPanelState | null;
  /** 036: the relics' effects as drawn: the Wardstone's shimmer (its alpha, 0 when hidden), ward breaks, ember flashes and bench flares live. */
  relics: RelicsShown;
  /** 037: the tree panel (T): open, its header, each node's state and spot, the hover, the reset button while it shows, glowing links. The XP row is `health.xp`. */
  talents: HudPanelsState['talents'];
  /** 037: the level-up line and rings, Shatterpoint's ice bursts, Blastfletch's Pool and Overpressure's heat, as drawn. */
  talentFx: TalentFxShown;
  /** 038: armed mines with their arm rings, bomblets in the air, and mine and bomblet flashes still showing. */
  mines: MinesShown;
  /** 040: the hover tablet (its source, summary or breakdown, chips by keyword, lines and box), the glossary entry, and the enemy hover name's chips. */
  tip: LegibilityUi['tip'];
  /** 040: the T panel's tab (Talents or Build), and the Build tab's rows (each round's chips, final damage, shots/s and sources). */
  talentPanel: HudPanelsState['talentPanel'];
  buildTab: HudPanelsState['buildTab'];
  glossary: LegibilityUi['glossary'];
  hoverChips: string[];
  /** 050: the hover name tag's tablet, world px, while one shows. */
  hoverBox: { x: number; y: number; w: number; h: number } | null;
  /** 050: whether the hover tag draws the name line (not over a champion, whose nameplate names it). */
  hoverNameDrawn: boolean;
  /** 069: the hover readout's lines as drawn over a machine or the intake (each line's text), empty while none shows. */
  hoverLines: string[];
  /** 042: the flow screens as drawn (the title's rows, a card's lines and buttons, Settings, the note). */
  flow: FlowUi;
  /** 044: the Sandbox panel as drawn (056, 057: its tabs, the rows of each panel all the way out with their boxes, the key list, every box drawn), or null outside the sandbox. */
  sandbox: SandboxPanelState | null;
  /** 056: whether any of the sandbox controls' objects is on screen, read from the objects themselves (never outside the sandbox). */
  sandboxDrawn: boolean;
  /** 074: the region's mood and light as drawn: quality, the mood's ring and blend, the ambient and flash, lights by source, lit objects, fog layers, and light catches. */
  lighting: LightingShown;
}

/** ui() without the flow's part: what a GameScene reports. */
export type GameUiState = Omit<UiState, 'flow'>;

declare global {
  interface Window {
    __GAME__?: GameTestHook;
  }
}
