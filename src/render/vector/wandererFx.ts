import type { PathCmd, Shape } from '../../data/art/types';
import { TUBE_PARTS, WANDERER_TRIM_FX } from '../../data/art/wanderer';
import { WANDERER } from '../../data/art/wanderer';
import { drawShape, drawShapes, type DrawOpts } from './draw';
import { inkCss } from './ink';
import { paletteHex } from '../../data/palette';
import { traceShape } from './trace';
import type { WandererPose } from './wandererPose';

// The tube and the wanderer's effects (075): the barrel's spinning flutes and attuning rings, the muzzle flash, the
// hose pulses and the relic trim's shimmer. Drawn in the frame the rig sets.

/** The tube in gun-local px (the rig has set its frame): housing, barrel, flutes, rings, muzzle and its glow. */
export function drawTube(c: CanvasRenderingContext2D, pose: WandererPose, lit: boolean, o: DrawOpts): void {
  drawShapes(c, TUBE_PARTS.housing, o);
  drawShapes(c, lit ? TUBE_PARTS.barrel.lit : TUBE_PARTS.barrel.dormant, o);
  // Three etched flutes round the barrel: each shows on the near half of its turn, brightest facing out.
  const F = TUBE_PARTS.flutes;
  for (let k = 0; k < F.count; k++) {
    const a = pose.spin + (k * Math.PI * 2) / F.count;
    const face = Math.cos(a);
    if (face <= 0) continue;
    const y = F.radius * Math.sin(a);
    c.save();
    c.globalAlpha *= 0.35 + 0.65 * face;
    drawShape(c, { kind: 'line', pts: [F.from, y, F.to, y], width: F.width, color: lit ? F.lit : F.dormant }, o);
    c.restore();
  }
  const n = TUBE_PARTS.rings.length;
  TUBE_PARTS.rings.forEach((x, i) => {
    const ring =
      pose.attuning !== null ? (pose.attuning >= (i + 1) / (n + 1) ? TUBE_PARTS.ring.glowing : TUBE_PARTS.ring.dormant) : lit ? TUBE_PARTS.ring.lit : TUBE_PARTS.ring.dormant;
    c.save();
    c.translate(x, 0);
    drawShape(c, ring, o);
    c.restore();
  });
  drawShape(c, lit ? TUBE_PARTS.muzzle.lit : TUBE_PARTS.muzzle.dormant, o);
  if (lit && pose.muzzle > 0) {
    c.save();
    c.globalAlpha *= pose.muzzle;
    drawShape(c, TUBE_PARTS.muzzleGlow, o);
    c.restore();
  }
}

/** The muzzle flash's frame (the rig has set the tube's frame). */
export function drawFlash(c: CanvasRenderingContext2D, flash: NonNullable<WandererPose['flash']>, o: DrawOpts): void {
  const frame = TUBE_PARTS.flash.frames[flash.frame];
  if (!frame) return;
  c.save();
  c.translate(TUBE_PARTS.flash.at[0], TUBE_PARTS.flash.at[1]);
  c.rotate(flash.angle);
  drawShapes(c, frame, o);
  c.restore();
}

/** A hose pulse: a bright bulge 1.4× the hose's width. */
export function drawPulse(c: CanvasRenderingContext2D, x: number, y: number, o: DrawOpts): void {
  const r = (WANDERER.limbs.hose.width * 1.4) / 2;
  const s: Shape = { kind: 'ellipse', x, y, rx: r, ry: r, fill: 'cyan-glow', outline: true, glow: { color: 'cyan', blur: 3 } };
  drawShape(c, s, o);
}

/** The tank window flaring as a pulse leaves: the window's own shape washed in glowing cyan. */
export function drawWindowFlare(c: CanvasRenderingContext2D, window: Shape, flare: number, o: DrawOpts): void {
  if (flare <= 0) return;
  c.save();
  c.globalAlpha *= flare * 0.75;
  drawShape(c, { ...window, fill: 'cyan-glow', outline: false, glow: { color: 'cyan', blur: 4 } }, o);
  c.restore();
}

/** The length of a hem made of straight segments. */
function lengthOf(d: readonly PathCmd[]): number {
  let len = 0;
  let last: [number, number] | null = null;
  for (const cmd of d) {
    if (cmd[0] !== 'M' && cmd[0] !== 'L') continue;
    if (last && cmd[0] === 'L') len += Math.hypot(cmd[1] - last[0], cmd[2] - last[1]);
    last = [cmd[1], cmd[2]];
  }
  return len;
}

/** The relic's shimmer: a short bright run travelling along the hem, `at` of the way along (0..1). */
export function drawShimmer(c: CanvasRenderingContext2D, hem: readonly PathCmd[], at: number, o: DrawOpts): void {
  const S = WANDERER_TRIM_FX.shimmer;
  const len = lengthOf(hem);
  c.save();
  traceShape(c, { kind: 'path', d: hem });
  c.setLineDash([S.length, len + S.length * 2]);
  c.lineDashOffset = -(at * (len + S.length)) + S.length;
  c.lineCap = 'round';
  c.shadowColor = paletteHex(S.glow.color);
  c.shadowBlur = S.glow.blur * o.blurScale;
  c.strokeStyle = inkCss(S.color);
  c.lineWidth = S.width;
  c.stroke();
  c.restore();
}
