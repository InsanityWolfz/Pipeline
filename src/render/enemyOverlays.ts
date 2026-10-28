import type { GameObjects, Scene } from 'phaser';
import { DEPTHS, ENEMY_FX } from '../data/assets';
import { LANDMARK_LOOK } from '../data/landmarkAssets';
import type { ChampionArt } from './EnemyView';
import { HUSK_RIG, RESIN } from '../data/art/husk';
import { CORE, WARDEN_RIG } from '../data/art/warden';
import { BURN_FLAMES, burnFlamesFrame, CHILL_TINT, ICE_CRACK_TICKS, STAGE_SPRITES } from '../data/stageAssets';
import { CHAMPIONS } from '../data/champions';
import { enemyDef } from '../data/enemies';
import { addVector, showFrame, textureScale } from './vector/textures';
import type { EnemyState } from '../sim/enemies';
import { colorOf } from './color';

// Lights and drips drawn over an enemy's baked frames (018), split out of EnemyView in 076: a Husk's resin drip and
// glint, the Warden's core halo, a chilled enemy's tint and its ice (029), and the flames on a burning one (060).

/** What an enemy's ice and flames are drawn on, made on first need. */
export interface Iced {
  baseScale: number;
  ice?: GameObjects.Image;
  flames?: GameObjects.Image;
}

/** A slow drop of resin falling from the binding, and a glint on the bead; out of step from Husk to Husk. Hidden from behind. */
export function drawResin(g: GameObjects.Graphics, e: EnemyState, bottom: number, view: 'down' | 'up' | 'side', now: number): void {
  g.clear();
  if (view === 'up') return;
  const k = HUSK_RIG.scale;
  const x = e.x + RESIN.blob[0] * k * (e.facing === 'left' ? -1 : 1);
  const y = bottom + RESIN.blob[1] * k;
  g.setDepth(bottom + DEPTHS.overlayNudge);
  const { glint: gl, drop } = RESIN;
  const glint = (Math.sin(((now + e.id * RESIN.phase.glint) / RESIN.glintMs) * Math.PI * 2) + 1) / 2;
  g.fillStyle(colorOf(gl.color), glint * gl.alpha).fillCircle(x + gl.at[0] * k, y + gl.at[1] * k, gl.r);
  const t = (now + e.id * RESIN.phase.drip) % RESIN.dripMs;
  if (t >= RESIN.fallMs) return;
  const p = t / RESIN.fallMs;
  g.fillStyle(colorOf(drop.color), 1 - p).fillEllipse(x + drop.at[0] * k, y + drop.at[1] * k + RESIN.fallPx * p * p, drop.size[0], drop.size[1]);
}

/** A halo round the Warden's chest core: a faint glow at rest, pulsing hard through the wind-up. Hidden from behind. */
export function drawCore(g: GameObjects.Graphics, e: EnemyState, bottom: number, view: 'down' | 'up' | 'side', now: number): void {
  g.clear();
  if (view === 'up') return;
  const k = WARDEN_RIG.scale;
  const x = e.x + (view === 'side' ? CORE.side * (e.facing === 'left' ? -1 : 1) : CORE.at[0]) * k;
  const y = bottom + CORE.at[1] * k;
  const pulse = e.mode === 'windup' ? (Math.sin((now / CORE.pulseMs) * Math.PI * 2) + 1) / 2 : 0;
  g.setDepth(bottom + DEPTHS.overlayNudge);
  g.fillStyle(colorOf(CORE.haloColor), CORE.rest + (CORE.peak - CORE.rest) * pulse).fillCircle(x, y, CORE.halo * k * (1 + CORE.swell * pulse));
}

/** A chilled enemy's multiply tint (029): white toward the chill colour, deeper per stack. */
export function chillTint(stacks: number): number {
  const k = Math.min(1, stacks * CHILL_TINT.perStack);
  const to = colorOf(CHILL_TINT.color);
  const mix = (shift: number): number => Math.round(255 + (((to >> shift) & 0xff) - 255) * k) << shift;
  return mix(16) | mix(8) | mix(0);
}

/** Frozen (029): encased in ice, the casing cracking over its last ticks; hidden otherwise. */
export function drawIce(scene: Scene, d: Iced, e: EnemyState, bottom: number): void {
  if (e.frozen <= 0) {
    d.ice?.setVisible(false);
    return;
  }
  const big = enemyDef(e.enemyId).boss;
  const cracked = e.frozen <= ICE_CRACK_TICKS;
  const frame = big ? (cracked ? STAGE_SPRITES.iceCaseLargeCracked : STAGE_SPRITES.iceCaseLarge) : cracked ? STAGE_SPRITES.iceCaseCracked : STAGE_SPRITES.iceCase;
  d.ice ??= addVector(scene, 0, 0, frame);
  if (d.ice.frame.name !== frame) showFrame(d.ice, frame);
  d.ice.setVisible(true).setPosition(e.x, bottom).setDepth(bottom + DEPTHS.overlayNudge);
}

/** Burning (060): flames lick round it, flickering out of step from enemy to enemy, bigger on a boss; hidden otherwise. */
export function drawFlames(scene: Scene, d: Iced, e: EnemyState, bottom: number, now: number): void {
  if (e.burnTicks <= 0) {
    d.flames?.setVisible(false);
    return;
  }
  const frame = burnFlamesFrame(Math.floor((now + e.id * BURN_FLAMES.phaseMs) / BURN_FLAMES.frameMs));
  d.flames ??= addVector(scene, 0, 0, frame).setAlpha(BURN_FLAMES.alpha);
  if (d.flames.frame.name !== frame) showFrame(d.flames, frame);
  const k = enemyDef(e.enemyId).boss ? BURN_FLAMES.big : 1;
  d.flames.setVisible(true).setScale(d.baseScale * k * (e.champion ? CHAMPIONS.scale : 1)).setPosition(e.x, bottom).setDepth(bottom + DEPTHS.overlayNudge);
}

/** A champion's soft glow round its body, pulsing slowly, and its name with its kind under it, over the health bar (032; out of EnemyView in 080). */
export function drawChampion(c: ChampionArt, e: EnemyState, bottom: number, top: number, now: number): void {
  const G = CHAMPIONS.glow;
  const pulse = (Math.sin((now / G.pulseMs) * Math.PI * 2) + 1) / 2;
  const size = (G.radius * CHAMPIONS.scale) / LANDMARK_LOOK.championGlowPx;
  c.glow.setPosition(e.x, (bottom + top) / 2).setScale(size / textureScale()).setAlpha(G.alpha[0] + (G.alpha[1] - G.alpha[0]) * pulse);
  const L = LANDMARK_LOOK.championLabel;
  const { h, gap, border } = ENEMY_FX.healthBar;
  const kindY = Math.round(top - gap - h - border - L.rise - c.kind.lineHeight);
  c.kind.moveTo(Math.round(e.x - c.kind.width / 2), kindY);
  c.name.moveTo(Math.round(e.x - c.name.width / 2), kindY - L.gap - c.name.lineHeight);
}
