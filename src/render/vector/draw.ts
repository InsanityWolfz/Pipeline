import type { Ink, Paint, PathCmd, Shape } from '../../data/art/types';
import { hexToRgb, INK_ID, paletteHex } from '../../data/palette';

// Draws vector shape data (016) onto a 2D canvas. Pure canvas, no Phaser, so the
// contact sheet page can use it too. Coordinates are whatever the context's
// transform says; `outline` is the ink outline width and `blurScale` turns world
// px of glow into canvas px (shadow blur ignores the transform).

export interface DrawOpts {
  /** Ink outline width, in the shapes' own units. */
  outline: number;
  /** Canvas pixels per shape unit, for glow blur. */
  blurScale: number;
}

export function inkCss(i: Ink): string {
  if (typeof i === 'string') return paletteHex(i);
  const [r, g, b] = hexToRgb(paletteHex(i.id));
  return `rgba(${r},${g},${b},${i.alpha})`;
}

function paintCss(c: CanvasRenderingContext2D, p: Paint): string | CanvasGradient {
  if (typeof p === 'string' || 'id' in p) return inkCss(p);
  const g = 'linear' in p ? c.createLinearGradient(...p.linear) : c.createRadialGradient(p.radial[0], p.radial[1], 0, ...p.radial);
  for (const s of p.stops) g.addColorStop(s.at, inkCss(s.color));
  return g;
}

function trace(c: CanvasRenderingContext2D, d: readonly PathCmd[]): void {
  c.beginPath();
  for (const cmd of d) {
    if (cmd[0] === 'M') c.moveTo(cmd[1], cmd[2]);
    else if (cmd[0] === 'L') c.lineTo(cmd[1], cmd[2]);
    else if (cmd[0] === 'Q') c.quadraticCurveTo(cmd[1], cmd[2], cmd[3], cmd[4]);
    else if (cmd[0] === 'C') c.bezierCurveTo(cmd[1], cmd[2], cmd[3], cmd[4], cmd[5], cmd[6]);
    else c.closePath();
  }
}

function traceShape(c: CanvasRenderingContext2D, s: Shape): void {
  if (s.kind === 'ellipse') {
    c.beginPath();
    c.ellipse(s.x, s.y, Math.max(0, s.rx), Math.max(0, s.ry), 0, 0, Math.PI * 2);
  } else if (s.kind === 'rect') {
    c.beginPath();
    c.roundRect(s.x, s.y, s.w, s.h, Math.min(s.r ?? 0, s.w / 2, s.h / 2));
  } else if (s.kind === 'path') {
    trace(c, s.d);
  } else {
    const p = s.pts;
    c.beginPath();
    c.moveTo(p[0] ?? 0, p[1] ?? 0);
    if (s.curve && p.length === 8) c.bezierCurveTo(p[2] ?? 0, p[3] ?? 0, p[4] ?? 0, p[5] ?? 0, p[6] ?? 0, p[7] ?? 0);
    else for (let i = 2; i + 1 < p.length; i += 2) c.lineTo(p[i] ?? 0, p[i + 1] ?? 0);
  }
}

/** Draws one shape: glow and fill (or a line's stroke), its own stroke, then the ink outline. */
export function drawShape(c: CanvasRenderingContext2D, s: Shape, o: DrawOpts): void {
  c.save();
  if (s.alpha !== undefined) c.globalAlpha *= s.alpha;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  traceShape(c, s);
  if (s.kind === 'line') {
    if (s.outline) {
      c.strokeStyle = paletteHex(INK_ID);
      c.lineWidth = s.width + o.outline * 2;
      c.stroke();
    }
    if (s.glow) {
      c.shadowColor = paletteHex(s.glow.color);
      c.shadowBlur = s.glow.blur * o.blurScale;
    }
    c.strokeStyle = inkCss(s.color);
    c.lineWidth = s.width;
    c.stroke();
    c.restore();
    return;
  }
  if (s.fill) {
    if (s.glow) {
      c.shadowColor = paletteHex(s.glow.color);
      c.shadowBlur = s.glow.blur * o.blurScale;
    }
    c.fillStyle = paintCss(c, s.fill);
    c.fill();
    c.shadowBlur = 0;
  }
  if (s.stroke) {
    if (s.stroke.dash) c.setLineDash([...s.stroke.dash]);
    c.strokeStyle = inkCss(s.stroke.color);
    c.lineWidth = s.stroke.width;
    c.stroke();
    c.setLineDash([]);
  }
  if (s.outline) {
    c.strokeStyle = paletteHex(INK_ID);
    c.lineWidth = o.outline;
    c.stroke();
  }
  c.restore();
}

export function drawShapes(c: CanvasRenderingContext2D, shapes: readonly Shape[], o: DrawOpts): void {
  for (const s of shapes) drawShape(c, s, o);
}
