import { heldPart, NO_COMMAND, type Command } from '../sim/input';
import { withUi } from './menuRequests';
import { createSim, type SimState } from '../sim/state';
import { summarize, type SimSummary } from '../sim/summary';
import { TILE_SIZE } from '../data/config';
import { FEET_BOX } from '../data/player';
import { isSolid, overlapsRect } from '../sim/collision';
import { roomBodies } from '../sim/bodies';
import { layItem } from '../sim/drops';
import { claim } from '../sim/claims';
import { gainXp } from '../sim/leveling';
import { spawnEnemy } from '../sim/spawn';
import { CHAMPIONS } from '../data/champions';
import { keywordReport } from '../data/keywordReport';
import type { GearPiece } from '../data/gear';
import { GameScene } from './GameScene';
import type { FlowScene } from './flow/FlowScene';
import type { GameUiState } from './testHook';
import { settings } from './flow/settingsStore';

// Dev builds only: lets tests and agents read state and step the sim frame by frame.
// The first step() takes the sim off the real-time loop so tests own the clock.
// 042: it follows whichever game is live across New game, Continue and Quit to title; on the title there is none,
// so getState() is null and the calls that act on a game throw.

/** The game part of ui() on the title: every view's empty value, from a scene that was never started. */
let blankUi: GameUiState | null = null;
function titleUi(): GameUiState {
  blankUi ??= new GameScene(createSim(0)).hoverText();
  return blankUi;
}

export function installTestHook(flow: FlowScene): void {
  const live = (): GameScene => {
    const scene = flow.live;
    if (!scene) throw new Error('No game is running: the title is up');
    return scene;
  };
  /** A call that acts on the live game, returning its summary after. */
  const act =
    <A extends unknown[]>(fn: (sim: SimState, scene: GameScene, ...args: A) => void) =>
    (...args: A): SimSummary => {
      const scene = live();
      fn(scene.sim, scene, ...args);
      return summarize(scene.sim);
    };
  window.__GAME__ = {
    // Null on the title; typed as a summary so the older specs, which always run a game, read it directly.
    getState: () => (flow.live ? summarize(flow.live.sim) : (null as unknown as SimSummary)),
    flow: () => flow.report(),
    step: act((sim, scene, frames: number, command: Partial<Command> = {}) => {
      if (!Number.isInteger(frames) || frames < 0) throw new Error(`step() needs a whole number of frames, got ${frames}`);
      scene.manualStepping = true;
      const held: Command = { ...NO_COMMAND, aimX: sim.player.aimX, aimY: sim.player.aimY, ...command };
      const after = heldPart(held);
      // Building with the mouse and keys works under the hook: the scene's queued actions join each tick.
      for (let i = 0; i < frames; i++) scene.stepOnce(withUi(i === 0 ? held : after, scene.takeUiCommand()));
    }),
    craft: act((_sim, scene, recipeId: string) => scene.craft(recipeId)),
    resume: () => {
      live().manualStepping = false;
    },
    ui: () => {
      const scene = flow.live;
      const game = scene ? scene.hoverText() : { ...titleUi(), ready: flow.ready };
      return { ...game, flow: flow.ui };
    },
    sound: () => ({ muted: settings().muted, volume: settings().master }),
    drop: act((sim, _scene, itemId: string, x: number, y: number) => void layItem(sim, itemId, sim.roomId, x, y)),
    tweenSpeed: (scale) => {
      live().tweens.timeScale = scale;
    },
    claim: act((sim, _scene, site: string) => claim(sim, site)),
    completeObjectives: act((sim, _scene, count: number) => {
      sim.objectives = sim.objectives.map((done, i) => done || i < count);
    }),
    setEnemyHealth: act((sim, _scene, id: number, health: number) => {
      const e = sim.enemies.find((en) => en.id === id);
      if (e) e.health = health;
    }),
    setPlayerHealth: act((sim, _scene, health: number) => {
      sim.player.health = health;
    }),
    revealMap: act((sim) => {
      // 053: every overworld tile seen, for the whole round world's minimap shot.
      sim.fog = sim.fog.map(() => 0xffffffff);
    }),
    spawnChampionPack: act((sim, _scene, enemyIds: string[], champion: number | null = 0) => {
      enemyIds.forEach((enemyId, i) => {
        spawnEnemy(sim, enemyId, { x: sim.player.x + (CHAMPIONS.devPack.ahead + i * CHAMPIONS.devPack.gap) * TILE_SIZE, y: sim.player.y }, sim.roomId, { group: 'dev', champion: i === champion });
      });
    }),
    spawnEnemy: act((sim, _scene, enemyId: string, x: number, y: number, champion = false) => {
      spawnEnemy(sim, enemyId, { x, y }, sim.roomId, { group: 'dev', champion });
    }),
    addGear: act((sim, _scene, piece: Omit<GearPiece, 'id'>) => {
      sim.gear.push({ ...structuredClone(piece), id: sim.nextGearId++ });
    }),
    gainXp: act((sim, _scene, amount: number) => void gainXp(sim, amount, 'kill')),
    keywords: () => keywordReport(),
    summaryRows: () => {
      const scene = live();
      return scene.legibility?.summaryRows(scene.sim) ?? [];
    },
    passable: () => {
      const sim = live().sim;
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
