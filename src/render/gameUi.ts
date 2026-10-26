import { fontsReady } from './fonts';
import { NO_SITE_UI } from './SiteMenus';
import { NO_HOVER_UI } from './HoverView';
import { NO_ROOM_UI } from './RoomViews';
import { NO_TUTORIAL_UI } from './TutorialUi';
import { NO_HUD_PANELS } from './HudView';
import { NO_ENEMY_UI } from './EnemyView';
import { NO_LEGIBILITY_UI } from './Legibility';
import type { GameScene } from './GameScene';
import { NO_BLUEPRINT_UI } from './BlueprintUi';
import type { GameUiState } from './testHook';

// What a game scene shows, for the test hook's ui() (split from GameScene in 042). Every view may be missing (before
// the scene is created, or on the title's blank), so each falls back to its empty value.

export function gameUi(g: GameScene): GameUiState {
  const main = g.cameras?.main?.worldView;
  return {
    ready: g.effects !== undefined && fontsReady(),
    drawnTick: g.drawnTick,
    craftOpen: g.menu?.isOpen ?? false,
    paused: g.pause?.isOpen ?? false,
    pickerOpen: (g.hud?.inventory.container ?? null) !== null,
    ...(g.siteMenus?.ui ?? NO_SITE_UI),
    pickerCounts: (g.hud?.panels.inventory.container ?? []).map((s) => s.count),
    ...(g.hover?.ui ?? NO_HOVER_UI),
    buildTip: g.buildView?.tipShown ?? null,
    ...(g.roomViews?.state ?? NO_ROOM_UI),
    sealSound: { humming: g.feel?.seal.humming ?? false, drops: g.feel?.seal.drops ?? 0 },
    nodes: g.nodeView?.frames ?? {},
    nodeGlow: g.nodeView?.glowing ?? [],
    shakes: [...(g.feel?.juice.shakes ?? [])],
    burnNumbers: g.feel?.juice.burnNumbers ?? 0,
    particles: g.feel?.juice.particles.count ?? 0,
    cursor: g.cursorView?.state ?? null,
    sliding: g.groundItemView?.sliding ?? 0,
    groundItems: g.groundItemView?.shown ?? [],
    slideProgress: g.groundItemView?.slideProgress ?? 0,
    swooshes: g.effects?.swooshes ?? 0,
    ...(g.tutorial?.state ?? NO_TUTORIAL_UI),
    // 042: the camera locks to the player: its centre, and the player's sprite point.
    // 046: `fading` while a door's fade runs, so screenshots can wait it out on state.
    camera: { x: main?.centerX ?? 0, y: main?.centerY ?? 0, player: { x: g.playerView?.sprite.x ?? 0, y: g.playerView?.sprite.y ?? 0 }, fading: g.cameras?.main?.fadeEffect.isRunning ?? false },
    // 065: the slow's wind curls round the player.
    slowSwirl: g.playerView?.swirling ?? false,
    // 070: the player's silhouette shows (a prop in front hides them).
    silhouette: g.silhouette?.shown ?? false,
    hud: g.hud?.bottom ?? null,
    ...(g.hud?.panels ?? NO_HUD_PANELS),
    craftMenu: g.menu?.state ?? null,
    buildBar: g.buildView?.state ?? null,
    blueprints: g.blueprintUi?.shown ?? NO_BLUEPRINT_UI,
    tunnels: g.tunnelView?.marks ?? [],
    tagged: { splitFlashes: g.effects?.splitFlashes ?? 0, trails: g.arrowView?.trails ?? { count: 0, longest: 0 }, burning: g.arrowView?.burning ?? 0, shards: g.arrowView?.shards ?? 0 },
    ...(g.enemyView?.ui ?? NO_ENEMY_UI),
    ...(g.legibility?.ui ?? NO_LEGIBILITY_UI),
    sandbox: g.sim.sandbox ? (g.sandboxPanel?.state ?? { open: false, rows: [], keys: [], boxes: [], tabs: [], sliding: false }) : null,
    sandboxDrawn: g.sandboxPanel?.drawn ?? false,
  };
}
