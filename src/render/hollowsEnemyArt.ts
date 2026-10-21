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
import { addVector, showFrame } from './vector/textures';

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
}

/** The extras an enemy of these kinds needs, made once with its sprite. */
export function makeHollowsArt(scene: Scene, def: EnemyDef): HollowsArt | undefined {
  if (def.kind === 'burrower') return { ripple: addVector(scene, 0, 0, HOLLOWS_ENEMY_SPRITES.ripple[0]).setVisible(false) };
  if (def.kind === 'shardback') return { light: scene.add.graphics().setBlendMode(BlendModes.ADD) };
  if (def.kind === 'sniper') return { light: scene.add.graphics().setDepth(LASER_DEPTH) };
  return undefined;
}

/** Shows the extras for this frame; hides the body while it's under the ground. */
export function drawHollowsArt(art: HollowsArt | undefined, sprite: GameObjects.Sprite, e: EnemyState, def: EnemyDef, sim: SimState, now: number): void {
  sprite.setVisible(!e.underground);
  if (art?.light && def.kind === 'shardback') drawFlare(art.light, e, def.bash.windupTicks, now);
  if (art?.light && def.kind === 'sniper') art.laser = drawLaser(art.light, e, def, sim);
  if (!art?.ripple) return;
  art.ripple.setVisible(e.underground);
  if (!e.underground) return;
  // The mound heaves while it moves, and lies still while its ring grows.
  const R = HOLLOWS_ENEMY_LOOK.ripple;
  const moving = Math.hypot(e.vx, e.vy) > R.minSpeed;
  const frame = moving ? Math.floor((now + e.id * R.phaseMs) / R.wobbleMs) % 2 : 0;
  const name = HOLLOWS_ENEMY_SPRITES.ripple[frame] ?? HOLLOWS_ENEMY_SPRITES.ripple[0];
  if (art.ripple.frame.name !== name) showFrame(art.ripple, name);
  art.ripple.setPosition(Math.round(e.x), Math.round(e.y + R.drop)).setDepth(DEPTHS.groundFx + R.depth);
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
function drawLaser(g: GameObjects.Graphics, e: EnemyState, def: Extract<EnemyDef, { kind: 'sniper' }>, sim: SimState): LaserShown | null {
  g.clear();
  const line = snipeLine(sim, e, def);
  if (!line) return null;
  const L = HOLLOWS_ENEMY_LOOK.laser;
  const locked = e.modeTicks >= def.snipe.trackTicks;
  // Locked, it brightens and blinks: on and off every `blinkTicks` of the lock.
  const on = !locked || Math.floor((e.modeTicks - def.snipe.trackTicks) / L.blinkTicks) % 2 === 0;
  const view = e.facing === 'up' || e.facing === 'down' ? e.facing : 'side';
  const lens = HOLLOWS_ENEMY_LOOK.lens[view];
  const k = e.champion ? CHAMPIONS.scale : 1;
  const x0 = e.x + lens[0] * k * (e.facing === 'left' ? -1 : 1);
  const y0 = e.y + enemyDef(e.enemyId).feetBox.h / 2 + lens[1] * k;
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
}
