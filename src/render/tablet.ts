import type { GameObjects } from 'phaser';
import { HUD_EDGES, TABLET } from '../data/hudLook';
import { hexToRgb, paletteHex } from '../data/palette';

/** The few Graphics calls a tablet uses, so a test can record them. */
export type TabletGraphics = Pick<GameObjects.Graphics, 'fillStyle' | 'fillRect'>;

const rgbOf = (id: string): [number, number, number] => hexToRgb(paletteHex(id));
const numOf = ([r, g, b]: readonly number[]): number => ((r ?? 0) << 16) | ((g ?? 0) << 8) | (b ?? 0);

/** The stone's bands, top to foot (081): mixed once here, from `top` to `fill`. */
const BANDS: readonly number[] = (() => {
  const [top, foot] = [rgbOf(TABLET.top), rgbOf(TABLET.fill)];
  return Array.from({ length: TABLET.bands }, (_, i) => {
    const t = TABLET.bands > 1 ? i / (TABLET.bands - 1) : 1;
    return numOf(top.map((c, k) => Math.round(c + ((foot[k] ?? 0) - c) * t)));
  });
})();

const C = {
  edge: numOf(rgbOf(TABLET.edge)),
  bevel: numOf(rgbOf(TABLET.bevel)),
  base: numOf(rgbOf(TABLET.base)),
  inner: numOf(rgbOf(TABLET.inner.color)),
  brass: numOf(rgbOf(TABLET.brass)),
  lit: numOf(rgbOf(TABLET.brassLit)),
} as const;

/**
 * Draws a carved stone tablet with brass corners on `g` (020; 081's one look): the look of the HUD's vector tablets
 * (art/hud.ts `tablet()`), for panels whose size changes (menus, readouts, the objective line, names). An ink edge one
 * px round (x, y, w, h); the stone shading from `carve` at the top to `carve-dark` at the foot; a lit top bevel, a
 * dark base and a thin carved inner line; brass brackets lit at their top-left ends. `alpha` scales the whole panel.
 * Draws nothing outside x−1..x+w+1, y−1..y+h+1, and allocates nothing.
 */
export function drawTablet(g: TabletGraphics, x: number, y: number, w: number, h: number, alpha = 1): void {
  const T = TABLET;
  g.fillStyle(C.edge, alpha).fillRect(x - 1, y - 1, w + 2, h + 2);
  // The stone, in bands from the lit top to the dark foot.
  let top = y;
  for (let i = 0; i < BANDS.length; i++) {
    const bottom = i === BANDS.length - 1 ? y + h : y + Math.round(((i + 1) * h) / BANDS.length);
    if (bottom > top) g.fillStyle(BANDS[i] ?? C.edge, T.fillAlpha * alpha).fillRect(x, top, w, bottom - top);
    top = bottom;
  }
  // A thin line carved in round the face, where there's room for it.
  const n = T.inner.inset;
  if (w > 2 * n + 2 && h > 2 * n + 2) {
    g.fillStyle(C.inner, T.inner.alpha * alpha);
    g.fillRect(x + n, y + n, w - 2 * n, 1);
    g.fillRect(x + n, y + h - n - 1, w - 2 * n, 1);
    g.fillRect(x + n, y + n + 1, 1, h - 2 * n - 2);
    g.fillRect(x + w - n - 1, y + n + 1, 1, h - 2 * n - 2);
  }
  g.fillStyle(C.bevel, alpha).fillRect(x + 1, y, w - 2, 1);
  g.fillStyle(C.base, alpha).fillRect(x + 1, y + h - 1, w - 2, 1);
  const arm = Math.min(T.corner, Math.floor(Math.min(w, h) / 3));
  const lit = Math.min(T.lit, arm);
  for (let k = 0; k < 4; k++) {
    // An L of brass in each corner, its arms along the edges; lit for `lit` px at each arm's top-left end.
    const right = k === 1 || k === 3;
    const foot = k >= 2;
    const hx = right ? x + w - arm : x;
    const hy = foot ? y + h - 1 : y;
    const vx = right ? x + w - 1 : x;
    const vy = foot ? y + h - arm : y;
    g.fillStyle(C.brass, alpha).fillRect(hx, hy, arm, 1).fillRect(vx, vy, 1, arm);
    g.fillStyle(C.lit, alpha).fillRect(hx, hy, lit, 1).fillRect(vx, vy, 1, lit);
  }
}

const GLOW = numOf(rgbOf(HUD_EDGES.tabGlow.color));

/**
 * 081: a soft glow round a box (the open tab's brass): rings of `gold-trim` `spread` px out, fading outward. Drawn
 * before the box, so it shows only round it. Allocates nothing.
 */
export function drawGlow(g: TabletGraphics, x: number, y: number, w: number, h: number, alpha = 1): void {
  const G = HUD_EDGES.tabGlow;
  for (let i = 1; i <= G.spread; i++) {
    g.fillStyle(GLOW, (G.alpha * alpha * (G.spread - i + 1)) / G.spread);
    g.fillRect(x - i, y - i, w + 2 * i, 1).fillRect(x - i, y + h + i - 1, w + 2 * i, 1);
    g.fillRect(x - i, y - i + 1, 1, h + 2 * i - 2).fillRect(x + w + i - 1, y - i + 1, 1, h + 2 * i - 2);
  }
}
