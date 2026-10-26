import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import type { EnemyDef } from '../data/enemies';
import { STORM_ENEMY_LOOK } from '../data/stormcrownEnemyAssets';
import type { EnemyState } from '../sim/enemies';
import { colorOf } from './color';

// What the Stormcrown's enemies (065) show beyond their sprite and ground telegraph, for EnemyView (through
// hollowsEnemyArt.ts): a gale ram's gust, pale wind curls sweeping out through its cone while its gust's pose holds.

export interface StormArt {
  /** Light added over the world: the ram's gust swirl. */
  light?: GameObjects.Graphics;
  /** Whether the gust's swirl drew this frame, for the test hook. */
  gusting?: boolean;
}

const G = STORM_ENEMY_LOOK.gust;

/** The extras an enemy of these kinds needs, made once with its sprite; undefined for any other kind. */
export function makeStormArt(scene: Scene, def: EnemyDef): StormArt | undefined {
  if (def.kind === 'ram') return { light: scene.add.graphics().setBlendMode(BlendModes.ADD).setDepth(DEPTHS.motes - 2) };
  return undefined;
}

/** Shows the extras for this frame. */
export function drawStormArt(art: StormArt, e: EnemyState, def: EnemyDef): void {
  if (def.kind !== 'ram' || !art.light) return;
  const g = art.light.clear();
  art.gusting = e.mode === 'swipe';
  if (!art.gusting) return;
  const k = Math.min(1, e.modeTicks / def.gust.swipeTicks);
  const dir = Math.atan2(e.swipeDirY, e.swipeDirX);
  const half = (def.gust.arcDegrees * Math.PI) / 360;
  const color = colorOf(G.color);
  for (let i = 0; i < G.streaks; i++) {
    // Each curl rides its own line through the cone, further out as the gust runs.
    const a = dir - half + ((i + 0.5) / G.streaks) * half * 2;
    const r = def.gust.reach * (0.25 + 0.75 * ((k + i / G.streaks) % 1));
    const cx = e.x + Math.cos(a) * r * 0.5;
    const cy = e.y - G.lift + Math.sin(a) * r * 0.5;
    g.lineStyle(G.width, color, G.alpha * (1 - k * 0.6));
    g.beginPath();
    g.arc(cx, cy, r * 0.5, a - G.len / 2, a + G.len / 2, false);
    g.strokePath();
  }
}

export function destroyStormArt(art: StormArt | undefined): void {
  art?.light?.destroy();
}
