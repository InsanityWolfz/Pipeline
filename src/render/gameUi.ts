import { fontsReady } from './fonts';
import { UI_CAMERA } from './scale';
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
import { NO_LIGHTING } from './lighting/LightingView';
import type { GameObjects } from 'phaser';
import { MENU_MOTION_SHOWN } from './menuCurves';
import { hoverRims } from './menuFeedback';
import { NO_AMMO_FX } from './fx/ammoFxShown';
import { bakeReport } from './vector/textures';
import { NO_BOSS_SHOW } from './bossShow';

import { NO_WEATHER, NO_WORLD } from './world/worldShown';

// What a game scene shows, for the test hook's ui() (split from GameScene in 042). Every view may be missing (before
// the scene is created, or on the title's blank), so each falls back to its empty value.

/** 069: the world's zoom over the view: the main camera's over the UI camera's (both carry the screen fit). */
function worldZoom(g: GameScene): number {
  const main = g.cameras?.main;
  const ui = g.cameras?.getCamera(UI_CAMERA);
  return main && ui ? main.zoom / ui.zoom : 1;
}

/** 064, 076, 078: the particles flying, by kind and priority, and the pool. */
function particlesUi(g: GameScene): GameUiState['particles'] {
  const p = g.feel?.juice.particles;
  return {
    // 077: the weather counts as live particles too.
    live: (p?.count ?? 0) + (g.worldLife?.weatherCount ?? 0),
    deathMotes: p?.deathMotes ?? 0,
    thrown: p?.motesThrown ?? 0,
    dissolving: g.effects?.dissolves.count ?? 0,
    dissolveDoneMs: g.effects?.dissolves.lastDoneMs ?? -1,
    weather: g.ledger.live.weather,
    effects: g.ledger.live.effect,
    byPriority: p?.byPriority ?? { cue: 0, shot: 0, soft: 0 },
    pool: { created: p?.created ?? 0 },
  };
}

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
    // 080: the intro shakes and every real shake of the world camera; the intro and the phase looks as drawn.
    introShakes: [...(g.feel?.juice.introShakes ?? [])],
    cameraShakes: g.feel?.juice.cameraShakes ?? 0,
    ...(g.bossShow?.ui ?? NO_BOSS_SHOW),
    burnNumbers: g.feel?.juice.burnNumbers ?? 0,
    particles: particlesUi(g),
    cursor: g.cursorView?.state ?? null,
    sliding: g.groundItemView?.sliding ?? 0,
    groundItems: g.groundItemView?.shown ?? [],
    slideProgress: g.groundItemView?.slideProgress ?? 0,
    swooshes: g.effects?.swooshes ?? 0,
    ...(g.tutorial?.state ?? NO_TUTORIAL_UI),
    // 042: the camera locks to the player: its centre, and the player's sprite point.
    // 046: `fading` while a door's fade runs, so screenshots can wait it out on state. 075: `shaking` while a shake runs.
    camera: { x: main?.centerX ?? 0, y: main?.centerY ?? 0, player: { x: g.playerView?.sprite.x ?? 0, y: g.playerView?.sprite.y ?? 0 }, fading: g.cameras?.main?.fadeEffect.isRunning ?? false, zoom: worldZoom(g), shaking: g.cameras?.main?.shakeEffect.isRunning ?? false },
    // 065: the slow's wind curls round the player.
    slowSwirl: g.playerView?.swirling ?? false,
    // 075: the wanderer's view, animation, scheme, trim and squash, hood, drawn bounds and draw time.
    player: g.playerView?.ui ?? null,
    // 070: the player's silhouette shows (a prop in front hides them).
    silhouette: g.silhouette?.shown ?? false,
    hud: g.hud?.bottom ?? null,
    ...(g.hud?.panels ?? NO_HUD_PANELS),
    craftMenu: g.menu?.state ?? null,
    buildBar: g.buildView?.state ?? null,
    blueprints: g.blueprintUi?.shown ?? NO_BLUEPRINT_UI,
    tunnels: g.tunnelView?.marks ?? [],
    tagged: { splitFlashes: g.effects?.splitFlashes ?? 0, trails: g.shots?.arrows.trailsShown ?? { count: 0, longest: 0 }, burning: g.shots?.arrows.burning ?? 0, shards: g.shots?.arrows.shards ?? 0 },
    ...(g.enemyView?.ui ?? NO_ENEMY_UI),
    ...(g.legibility?.ui ?? NO_LEGIBILITY_UI),
    sandbox: g.sim.sandbox ? (g.sandboxPanel?.state ?? { open: false, rows: [], keys: [], boxes: [], tabs: [], sliding: false }) : null,
    sandboxDrawn: g.sandboxPanel?.drawn ?? false,
    lighting: g.lighting?.shown ?? NO_LIGHTING,
    menuMotion: { ...MENU_MOTION_SHOWN, rims: hoverRims() },
    hudDraws: { bossBar: 0, hpFill: 0, xp: 0, tubeCard: 0, ...g.hud?.draws, tweens: g.tweens?.getTweens().length ?? 0, objects: objectCount(g.children?.list ?? []) },
    ammoFx: g.shots?.fx.shown ?? NO_AMMO_FX,
    hitFeedback: { numbers: g.feel?.juice.numbers ?? 0, holds: g.enemyView?.holds ?? 0, holdMs: g.enemyView?.holdMs ?? 0 },
    vectorBake: { ...bakeReport() },

    world: g.worldLife?.world ?? NO_WORLD,
    weather: g.worldLife?.weatherShown ?? NO_WEATHER,
  };
}

/** 081: every game object in the scene, containers' children counted. */
function objectCount(list: readonly GameObjects.GameObject[]): number {
  let n = 0;
  for (const o of list) n += 1 + ('list' in o && Array.isArray(o.list) ? objectCount(o.list as GameObjects.GameObject[]) : 0);
  return n;
}
