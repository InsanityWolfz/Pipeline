import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { CHAMPIONS } from '../data/champions';
import type { EnemyDef } from '../data/enemies';
import { EMBER_ENEMY_LOOK } from '../data/emberworksEnemyAssets';
import { defOf } from '../sim/champions';
import type { EnemyState } from '../sim/enemies';
import type { SimState } from '../sim/state';
import { colorOf } from './color';

// What the Emberworks' enemies (061) show beyond their sprite and ground telegraph, for EnemyView (through
// hollowsEnemyArt.ts): a cinder mote swelling with its wind-up; a kiln-tender's beam in the kiln's orange from its
// nozzle to its target (thin through the wind-up, glowing while it channels), and the soft orange glow on the target.

/** A tender's beam as drawn, for the test hook: its target, and whether it's channelling (else winding up). */
export interface BeamShown {
  target: number;
  channel: boolean;
}

export interface EmberArt {
  /** Light added over the world: the tender's beam and its target's glow. */
  light?: GameObjects.Graphics;
  beam?: BeamShown | null;
}

const B = EMBER_ENEMY_LOOK.beam;

/** The extras an enemy of these kinds needs, made once with its sprite; undefined for any other kind. */
export function makeEmberArt(scene: Scene, def: EnemyDef): EmberArt | undefined {
  if (def.kind === 'mote') return {};
  if (def.kind === 'tender') return { light: scene.add.graphics().setBlendMode(BlendModes.ADD).setDepth(DEPTHS.motes - 2) };
  return undefined;
}

/** Shows the extras for this frame. */
export function drawEmberArt(art: EmberArt, sprite: GameObjects.Sprite, e: EnemyState, def: EnemyDef, sim: SimState, now: number): void {
  // The mote swells as its burst nears.
  if (def.kind === 'mote' && e.mode === 'windup') sprite.setScale(sprite.scaleX * (1 + EMBER_ENEMY_LOOK.swell.grow * Math.min(1, e.modeTicks / def.swell.windupTicks)));
  if (def.kind === 'tender' && art.light) art.beam = drawBeam(art.light, e, sim, now);
}

/** The beam from its nozzle to its target, and the target's glow while it channels; null when it isn't beaming. */
function drawBeam(g: GameObjects.Graphics, e: EnemyState, sim: SimState, now: number): BeamShown | null {
  g.clear();
  if (e.beamTarget < 0 || (e.mode !== 'windup' && e.mode !== 'swipe')) return null;
  const t = sim.enemies.find((o) => o.id === e.beamTarget);
  if (!t || t.roomId !== e.roomId) return null;
  const view = e.facing === 'up' || e.facing === 'down' ? e.facing : 'side';
  const k = e.champion ? CHAMPIONS.scale : 1;
  const nz = B.nozzle[view];
  const x0 = e.x + nz[0] * k * (e.facing === 'left' ? -1 : 1);
  const y0 = e.y + defOf(e).feetBox.h / 2 + nz[1] * k;
  const tdef = defOf(t);
  const x1 = t.x;
  const y1 = t.y + tdef.hurtbox.offsetY;
  const color = colorOf(B.color);
  const channel = e.mode === 'swipe';
  if (!channel) {
    g.lineStyle(B.windupWidth, color, B.windupAlpha).lineBetween(x0, y0, x1, y1);
    return { target: t.id, channel };
  }
  const flicker = B.flicker[0] + B.flicker[1] * Math.sin((now / B.flickerMs) * Math.PI * 2);
  g.lineStyle(B.width + B.glow, color, B.glowAlpha * flicker).lineBetween(x0, y0, x1, y1);
  g.lineStyle(B.width, color, B.alpha * flicker).lineBetween(x0, y0, x1, y1);
  g.lineStyle(B.coreWidth, colorOf(B.core), 1).lineBetween(x0, y0, x1, y1);
  const G = B.targetGlow;
  const pulse = (Math.sin((now / G.pulseMs) * Math.PI * 2) + 1) / 2;
  const r = G.radius * (t.champion ? CHAMPIONS.scale : 1) * Math.max(1, tdef.hurtbox.w / (G.radius * 2));
  g.fillStyle(colorOf(G.color), G.alpha[0] + (G.alpha[1] - G.alpha[0]) * pulse).fillEllipse(x1, y1, r * 2, r * 2 * G.squash);
  return { target: t.id, channel };
}

export function destroyEmberArt(art: EmberArt | undefined): void {
  art?.light?.destroy();
}
