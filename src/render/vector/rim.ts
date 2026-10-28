import type { PathCmd, Shape } from '../../data/art/types';
import { inkCss } from './ink';
import { traceShape } from './trace';

// 075: the rim light. A static light from the top left (art.md): the shape's own path, shifted down and right by the
// rim's offset and stroked inside a clip to the shape, leaves a band only along the shape's top and left edges.

const shiftCmd = (cmd: PathCmd, dx: number, dy: number): PathCmd => {
  switch (cmd[0]) {
    case 'M':
    case 'L':
      return [cmd[0], cmd[1] + dx, cmd[2] + dy];
    case 'Q':
      return ['Q', cmd[1] + dx, cmd[2] + dy, cmd[3] + dx, cmd[4] + dy];
    case 'C':
      return ['C', cmd[1] + dx, cmd[2] + dy, cmd[3] + dx, cmd[4] + dy, cmd[5] + dx, cmd[6] + dy];
    default:
      return cmd;
  }
};

/** The shape moved by (dx, dy). */
export function shiftShape(s: Shape, dx: number, dy: number): Shape {
  if (s.kind === 'ellipse' || s.kind === 'rect') return { ...s, x: s.x + dx, y: s.y + dy };
  if (s.kind === 'path') return { ...s, d: s.d.map((cmd) => shiftCmd(cmd, dx, dy)) };
  return { ...s, pts: s.pts.map((v, i) => v + (i % 2 === 0 ? dx : dy)) };
}

/** The path the rim strokes: the shape shifted down and right by its rim's offset (the shape itself without a rim). */
export function rimPath(s: Shape): Shape {
  const o = s.rim?.offset ?? 0;
  return shiftShape(s, o, o);
}

/** Draws a shape's rim band: clipped to the shape, its shifted path stroked in the rim colour. */
export function drawRim(c: CanvasRenderingContext2D, s: Shape): void {
  if (!s.rim || s.kind === 'line') return;
  c.save();
  traceShape(c, s);
  c.clip();
  traceShape(c, rimPath(s));
  c.strokeStyle = inkCss(s.rim.color);
  c.lineWidth = s.rim.width;
  c.stroke();
  c.restore();
}
