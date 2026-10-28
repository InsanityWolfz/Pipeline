import { ellipse, path, type Ink, type Shape, type ShapeStyle, type VectorSprite } from './types';

// 077: shared shape helpers for the world's detail (decor*.ts): grass blades, leaves and petals, pebbles, and a
// sprite maker. World px round each anchor, the plant's foot (or a mark's middle); light from the top left.

export const one = (key: string, size: readonly [number, number], anchor: readonly [number, number], shapes: readonly Shape[]): VectorSprite => ({ key, size, anchor, frames: [shapes] });

/** A soft round shadow under a plant's foot. */
export const footShade = (rx: number, ry = rx * 0.32): Shape => ellipse(0, -0.4, rx, ry, { fill: { id: 'ground-shade', alpha: 0.22 } });

/**
 * A grass blade from its foot at `x`: `h` tall, its tip `lean` px over, `w` wide at the foot, curving, filled with a
 * gradient from `base` at the foot to `tip` at the tip.
 */
export function blade(x: number, h: number, lean: number, w: number, base: Ink, tip: Ink, style: Partial<ShapeStyle> = {}): Shape {
  const tx = x + lean;
  const ty = -h;
  const cx = x + lean * 0.35;
  const cy = -h * 0.55;
  return path(`M ${x - w / 2} 0 Q ${cx - w * 0.35} ${cy} ${tx} ${ty} Q ${cx + w * 0.4} ${cy} ${x + w / 2} 0 Z`, {
    fill: { linear: [x, 0, tx, ty] as const, stops: [{ at: 0, color: base }, { at: 1, color: tip }] },
    ...style,
  });
}

/** A ring of `n` petals round (x, y), each `r` long, in `color`, with a centre dot. */
export function petals(x: number, y: number, n: number, r: number, color: string, centre: string, turn = 0): Shape[] {
  const out: Shape[] = [];
  for (let i = 0; i < n; i++) {
    const a = turn + (i / n) * Math.PI * 2;
    out.push(ellipse(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.45 + 0.25, r * 0.55, r * 0.42, { fill: { id: 'ink', alpha: 0.35 } }));
    out.push(ellipse(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.45, r * 0.55, r * 0.42, { fill: color }));
  }
  out.push(ellipse(x, y, r * 0.42, r * 0.36, { fill: centre }));
  out.push(ellipse(x - r * 0.12, y - r * 0.12, r * 0.15, r * 0.12, { fill: { id: 'snow', alpha: 0.6 } }));
  return out;
}

/** A leaf: an almond from (x0, y0) to (x1, y1), `w` wide, light side up. */
export function leaf(x0: number, y0: number, x1: number, y1: number, w: number, fill: Ink, vein?: Ink, outline = true): Shape[] {
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * w;
  const ny = (dx / len) * w;
  const body = path(`M ${x0} ${y0} Q ${mx + nx} ${my + ny} ${x1} ${y1} Q ${mx - nx} ${my - ny} ${x0} ${y0} Z`, { fill, outline });
  return vein ? [body, path(`M ${x0} ${y0} Q ${mx + nx * 0.15} ${my + ny * 0.15} ${x1} ${y1}`, { stroke: { color: vein, width: 0.4 } })] : [body];
}

/** A small stone, rounded, lit on its top left: (x, y) its middle, `rx` × `ry`. */
export function stone(x: number, y: number, rx: number, ry: number, dark: string, mid: string, light: string, outline = true): Shape[] {
  return [
    ellipse(x + rx * 0.2, y + ry * 0.55, rx * 1.05, ry * 0.5, { fill: { id: 'ground-shade', alpha: 0.25 } }),
    ellipse(x, y, rx, ry, { fill: { linear: [x - rx, y - ry, x + rx, y + ry] as const, stops: [{ at: 0, color: light }, { at: 0.55, color: mid }, { at: 1, color: dark }] }, outline }),
    ellipse(x - rx * 0.35, y - ry * 0.4, rx * 0.35, ry * 0.25, { fill: { id: 'snow', alpha: 0.3 } }),
  ];
}
