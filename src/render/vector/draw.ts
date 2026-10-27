import type { Paint, Shape } from '../../data/art/types';
import { INK_ID, paletteHex } from '../../data/palette';
import { inkCss } from './ink';
import { drawRim } from './rim';
import { traceShape } from './trace';

// Draws vector shape data (016) onto a 2D canvas. Pure canvas, no Phaser, so the
// contact sheet page can use it too. Coordinates are whatever the context's
// transform says; `outline` is the ink outline width and `blurScale` turns world
// px of glow into canvas px (shadow blur ignores the transform).

export { inkCss } from './ink';

export interface DrawOpts {
  /** Ink outline width, in the shapes' own units. */
  outline: number;
  /** Canvas pixels per shape unit, for glow blur. */
  blurScale: number;
}

function paintCss(c: CanvasRenderingContext2D, p: Paint): string | CanvasGradient {
  if (typeof p === 'string' || 'id' in p) return inkCss(p);
  const g = 'linear' in p ? c.createLinearGradient(...p.linear) : c.createRadialGradient(p.radial[0], p.radial[1], 0, ...p.radial);
  for (const s of p.stops) g.addColorStop(s.at, inkCss(s.color));
  return g;
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
  if (s.rim) drawRim(c, s);
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
