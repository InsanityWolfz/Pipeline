import type { PathCmd, Shape } from '../../data/art/types';

// Traces vector shape data (016) as the canvas's current path, for filling, stroking or clipping (draw.ts, rim.ts).

export function trace(c: CanvasRenderingContext2D, d: readonly PathCmd[]): void {
  c.beginPath();
  for (const cmd of d) {
    if (cmd[0] === 'M') c.moveTo(cmd[1], cmd[2]);
    else if (cmd[0] === 'L') c.lineTo(cmd[1], cmd[2]);
    else if (cmd[0] === 'Q') c.quadraticCurveTo(cmd[1], cmd[2], cmd[3], cmd[4]);
    else if (cmd[0] === 'C') c.bezierCurveTo(cmd[1], cmd[2], cmd[3], cmd[4], cmd[5], cmd[6]);
    else c.closePath();
  }
}

export function traceShape(c: CanvasRenderingContext2D, s: Shape): void {
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
