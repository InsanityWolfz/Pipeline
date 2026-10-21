import type { GameObjects } from 'phaser';
import { ENEMY_FX } from '../data/assets';
import { attackOf, enemyDef, type EnemyDef } from '../data/enemies';
import type { EnemyState } from '../sim/enemies';
import { drawPound, drawRise, drawStomp, drawWave } from './bulwarkLook';
import { colorOf } from './color';
import { drawHollowsTelegraph } from './hollowsTelegraphs';

// Each enemy's wind-up telegraph on the ground, filling in as it runs (004, 009, 034, 035):
// a Husk's swipe arc at its real reach and angle, a Wisp's tightening ring and aim line, the
// Warden's slam circle at its real radius, the Bulwark's pound, and Region 2's four's.

/** Draws it; returns whether the Bulwark's back wave was shaded (054), for `ui()`. */
export function drawTelegraph(g: GameObjects.Graphics, e: EnemyState): boolean {
  g.clear();
  const def = enemyDef(e.enemyId);
  // 041: an add rising from the ground, the Bulwark's back wave (beside its other attacks) and its rear stomp.
  drawRise(g, e);
  const waveShaded = drawWave(g, e);
  if (def.kind === 'bulwark' && e.mode === 'stomp-windup') drawStomp(g, e);
  else if (!drawHollowsTelegraph(g, e, def)) drawAttack(g, e, def);
  return waveShaded;
}

/** The enemy's own attack's wind-up. */
function drawAttack(g: GameObjects.Graphics, e: EnemyState, def: EnemyDef): void {
  if (e.mode !== 'windup') return;
  const progress = Math.min(1, e.modeTicks / attackOf(def).windupTicks);
  if (def.kind === 'caster') {
    const { castRing, castLine } = ENEMY_FX;
    const color = colorOf(ENEMY_FX.castColor);
    const top = e.y + def.hurtbox.offsetY;
    g.lineStyle(castRing.width, color, castRing.alphaFrom + (1 - castRing.alphaFrom) * progress);
    g.strokeCircle(e.x, top, castRing.from + (castRing.to - castRing.from) * progress);
    g.lineStyle(castLine.width, color, castLine.alpha);
    g.lineBetween(e.x, e.y, e.x + e.swipeDirX * castLine.length, e.y + e.swipeDirY * castLine.length);
    return;
  }
  if (def.kind === 'slammer') {
    const color = colorOf(ENEMY_FX.telegraphColor);
    g.fillStyle(color, ENEMY_FX.telegraphAlpha).fillCircle(e.x, e.y, def.slam.radius);
    g.fillStyle(color, ENEMY_FX.telegraphFillAlpha).fillCircle(e.x, e.y, def.slam.radius * progress);
    return;
  }
  if (def.kind === 'bulwark') {
    drawPound(g, e);
    return;
  }
  if (def.kind !== 'melee') return;
  const { swipe } = def;
  drawArc(g, e.x, e.y, Math.atan2(e.swipeDirY, e.swipeDirX), swipe.arcDegrees, swipe.reach, progress, ENEMY_FX.telegraphAlpha, ENEMY_FX.telegraphFillAlpha);
}

/** A swipe-style arc (004): the full reach faint, filling out to `progress` of it. */
export function drawArc(g: GameObjects.Graphics, x: number, y: number, angle: number, arcDegrees: number, reach: number, progress: number, alpha: number, fillAlpha: number): void {
  const half = (arcDegrees * Math.PI) / 360;
  const color = colorOf(ENEMY_FX.telegraphColor);
  g.fillStyle(color, alpha);
  g.slice(x, y, reach, angle - half, angle + half, false);
  g.fillPath();
  g.fillStyle(color, fillAlpha);
  g.slice(x, y, reach * progress, angle - half, angle + half, false);
  g.fillPath();
}
