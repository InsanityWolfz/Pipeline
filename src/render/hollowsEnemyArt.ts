import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { enemyDef } from '../data/enemies';
import type { EnemyDef } from '../data/enemies';
import { HOLLOWS_ENEMY_LOOK, HOLLOWS_ENEMY_SPRITES } from '../data/hollowsEnemyAssets';
import { CHAMPIONS } from '../data/champions';
import { ENEMY_FX } from '../data/assets';
import type { EnemyState } from '../sim/enemies';
import type { OrbState } from '../sim/orbs';
import { snipeLine } from '../sim/sniperAi';
import type { SimState } from '../sim/state';
import { colorOf } from './color';
import { addVector, showFrame, textureScale } from './vector/textures';
import { tremble, windupPhase } from './enemyMotion';
import { shownPoint, type SpriteLook } from './shownPoint';
import { SNIPER_RIG } from '../data/art/sniper';
import { ENEMY_MOTION } from '../data/art/enemyMotion';
import { destroyEmberArt, drawEmberArt, makeEmberArt, type BeamShown, type EmberArt } from './emberEnemyArt';
import { destroyStormArt, drawStormArt, makeStormArt, type StormArt } from './stormEnemyArt';

// What Region 2's four (035) show beyond their sprite and ground telegraph, for EnemyView:
// a Burrower underground as its ripple, a moving mound of cracked earth, its body hidden;
// a Shardback's shield flaring as it winds up its bash; a Sniper's laser
// sight from its lens (thin while tracking, bright and blinking once locked), and its bolt.

export interface HollowsArt {
  ripple?: GameObjects.Image;
  /** Light added over the sprite: the Shardback's flare, the Sniper's laser. */
  light?: GameObjects.Graphics;
  /** The laser as last drawn, for the test hook. */
  laser?: LaserShown | null;
  /** 061: the Emberworks' enemies' extras (emberEnemyArt.ts). */
  ember?: EmberArt;
  /** 065: the Stormcrown's enemies' extras (stormEnemyArt.ts). */
  storm?: StormArt;
}

/** A Sniper's laser as drawn (035): whether locked, whether its blink is on, and its ends, world px. */
export interface LaserShown {
  locked: boolean;
  on: boolean;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** What `ui()` reports of Region 2's four (035): ripples on show, flares lit, and each laser drawn, by enemy id. */
export interface HollowsEnemiesShown {
  ripples: number;
  flares: number;
  lasers: (LaserShown & { id: number })[];
  /** 054: the Bulwark's back waves whose red shade was drawn this frame (counted by EnemyView from its telegraph). */
  waveShades: number;
  /** 061: each kiln-tender's beam drawn, by the tender's id. */
  beams: (BeamShown & { id: number })[];
  /** 065: gale rams whose gust swirl drew this frame. */
  gusts: number;
}

/** The extras an enemy of these kinds needs, made once with its sprite. */
export function makeHollowsArt(scene: Scene, def: EnemyDef): HollowsArt | undefined {
  if (def.kind === 'burrower') return { ripple: addVector(scene, 0, 0, HOLLOWS_ENEMY_SPRITES.ripple[0]).setVisible(false) };
  if (def.kind === 'shardback') return { light: scene.add.graphics().setBlendMode(BlendModes.ADD) };
  if (def.kind === 'sniper') return { light: scene.add.graphics().setDepth(LASER_DEPTH) };
  const ember = makeEmberArt(scene, def);
  if (ember) return { ember };
  const storm = makeStormArt(scene, def);
  return storm ? { storm } : undefined;
}

/** Shows the extras for this frame; hides the body while it's under the ground. */
export function drawHollowsArt(art: HollowsArt | undefined, sprite: GameObjects.Sprite, e: EnemyState, def: EnemyDef, sim: SimState, now: number, look: SpriteLook): void {
  sprite.setVisible(!e.underground);
  if (art?.ember) drawEmberArt(art.ember, sprite, e, def, sim, now, look);
  if (art?.storm) drawStormArt(art.storm, e, def);
  if (art?.light && def.kind === 'shardback') drawFlare(art.light, e, def.bash.windupTicks, now);
  if (art?.light && def.kind === 'sniper') art.laser = drawLaser(art.light, e, sim, sprite.frame.name, look);
  if (!art?.ripple) return;
  art.ripple.setVisible(e.underground);
  if (!e.underground) return;
  // The mound heaves while it moves; 076: through its wind-up it settles, swells and cracks, and rises trembling.
  const R = HOLLOWS_ENEMY_LOOK.ripple;
  const moving = Math.hypot(e.vx, e.vy) > R.minSpeed;
  const w = def.kind === 'burrower' && e.mode === 'windup' ? rippleWindup(e.modeTicks, def.burrow.windupTicks, now) : null;
  const frame = moving ? Math.floor((now + e.id * R.phaseMs) / R.wobbleMs) % 2 : 0;
  const name = w?.cracked ? HOLLOWS_ENEMY_SPRITES.rippleCracked : (HOLLOWS_ENEMY_SPRITES.ripple[frame] ?? HOLLOWS_ENEMY_SPRITES.ripple[0]);
  if (art.ripple.frame.name !== name) showFrame(art.ripple, name);
  const base = 1 / textureScale();
  art.ripple.setScale(base * (w?.sx ?? 1), base * (w?.sy ?? 1));
  art.ripple.setPosition(Math.round(e.x) + (w?.dx ?? 0), Math.round(e.y + R.drop)).setDepth(DEPTHS.groundFx + R.depth);
}

/** 076: the ripple through a Burrower's wind-up: its scale, the cracked frame, and the peak's tremble. */
export function rippleWindup(modeTicks: number, ticks: number, now: number): { sx: number; sy: number; cracked: boolean; dx: number } {
  const W = HOLLOWS_ENEMY_LOOK.rippleWindup;
  const phase = windupPhase(modeTicks, ticks);
  const p = modeTicks / ticks;
  if (phase === 'gather') return { sx: W.settle[0], sy: W.settle[1], cracked: false, dx: 0 };
  if (phase === 'peak') return { sx: W.peak, sy: W.peak, cracked: true, dx: tremble('peak', now, false).dx };
  const k = 1 + (W.coil - 1) * Math.min(1, (p - ENEMY_MOTION.phases.gather) / (ENEMY_MOTION.phases.peak - ENEMY_MOTION.phases.gather));
  return { sx: k, sy: k, cracked: p >= W.crackAt, dx: 0 };
}

/** The Shardback's shield flaring brass through the wind-up, flickering, brighter as the bash nears. */
function drawFlare(g: GameObjects.Graphics, e: EnemyState, windupTicks: number, now: number): void {
  g.clear();
  if (e.mode !== 'windup') return;
  const F = HOLLOWS_ENEMY_LOOK.flare;
  const k = Math.min(1, e.modeTicks / windupTicks);
  const flicker = 1 - F.flicker + F.flicker * Math.sin((now / F.pulseMs) * Math.PI * 2);
  const x = e.x + Math.cos(e.angle) * F.ahead;
  const y = e.y + (Math.sin(e.angle) * F.ahead) / 2 - F.rise;
  g.setDepth(e.y + DEPTHS.overlayNudge + F.depth);
  g.fillStyle(colorOf(F.color), F.alpha * k * flicker).fillCircle(x, y, F.radius * (F.grow[0] + F.grow[1] * k));
}

/** The laser sits over everything standing in the world, under its UI. */
const LASER_DEPTH = DEPTHS.motes - 1;

/** The laser from its lens (per view, flipped facing left, scaled for a champion) to the end of its sight line, which never runs through a solid. */
function drawLaser(g: GameObjects.Graphics, e: EnemyState, sim: SimState, frame: string, look: SpriteLook): LaserShown | null {
  const def = enemyDef(e.enemyId);
  if (def.kind !== 'sniper') return null;
  g.clear();
  const line = snipeLine(sim, e, def);
  if (!line) return null;
  const L = HOLLOWS_ENEMY_LOOK.laser;
  const locked = e.modeTicks >= def.snipe.trackTicks;
  // Locked, it brightens and blinks: on and off every `blinkTicks` of the lock.
  const on = !locked || Math.floor((e.modeTicks - def.snipe.trackTicks) / L.blinkTicks) % 2 === 0;
  const view = e.facing === 'up' || e.facing === 'down' ? e.facing : 'side';
  // 076: from the lens as the sprite shows it: the wind-up frame it holds, its squash and its tremble.
  const k = e.champion ? CHAMPIONS.scale : 1;
  const lens = shownPoint(SNIPER_RIG, view, frame, view === 'up' ? 'housing' : 'lens', HOLLOWS_ENEMY_LOOK.lens[view], look, e.facing === 'left' ? -1 : 1, k);
  const x0 = e.x + lens[0];
  const y0 = e.y + def.feetBox.h / 2 + lens[1];
  const color = colorOf(ENEMY_FX.telegraphColor);
  const width = locked ? L.lockedWidth : L.width;
  const alpha = locked ? (on ? L.lockedAlpha : L.alpha * L.dim) : L.alpha;
  g.lineStyle(width + L.glow, color, L.glowAlpha * (on ? 1 : L.dim)).lineBetween(x0, y0, line.x1, line.y1);
  g.lineStyle(width, color, alpha).lineBetween(x0, y0, line.x1, line.y1);
  if (locked && on) g.lineStyle(L.coreWidth, colorOf(L.core), 1).lineBetween(x0, y0, line.x1, line.y1);
  g.fillStyle(color, alpha).fillCircle(line.x1, line.y1, width + L.dot);
  return { locked, on, x0, y0, x1: line.x1, y1: line.y1 };
}

/** Folds one enemy's extras into what `ui()` reports. */
export function shownOf(id: number, e: EnemyState, art: HollowsArt | undefined, into: HollowsEnemiesShown): void {
  if (art?.ripple?.visible) into.ripples += 1;
  if (art?.light && !art.laser && e.mode === 'windup' && enemyDef(e.enemyId).kind === 'shardback') into.flares += 1;
  if (art?.laser) into.lasers.push({ id, ...art.laser });
  if (art?.ember?.beam) into.beams.push({ id, ...art.ember.beam });
  if (art?.storm?.gusting) into.gusts += 1;
}

/** Sniper bolts in flight (the Wisp's orbs are SiteView's): a red streak with a white-hot core, raised off its ground point. */
export function drawBolts(g: GameObjects.Graphics, orbs: readonly OrbState[], shown: string): void {
  g.clear();
  const B = HOLLOWS_ENEMY_LOOK.bolt;
  for (const o of orbs) {
    if (o.roomId !== shown || enemyDef(o.enemyId).kind !== 'sniper') continue;
    const y = o.y - B.lift;
    const tx = o.x - o.dx * B.length;
    const ty = y - o.dy * B.length;
    g.lineStyle(B.width, colorOf(B.color), B.alpha).lineBetween(tx, ty, o.x, y);
    g.lineStyle(B.core, colorOf(B.coreColor), 1).lineBetween(tx + o.dx * B.length * B.coreFrom, ty + o.dy * B.length * B.coreFrom, o.x, y);
  }
}

export function destroyHollowsArt(art: HollowsArt | undefined): void {
  art?.ripple?.destroy();
  art?.light?.destroy();
  destroyEmberArt(art?.ember);
  destroyStormArt(art?.storm);
}
