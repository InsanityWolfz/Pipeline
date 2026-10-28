// 2D affine matrices for the wanderer rig (075), as the canvas's [a, b, c, d, e, f]: x' = a x + c y + e, y' = b x + d y + f.
// The rig carries points between its frames (the feet, the figure, the torso, the tank, the tube) with these, so the
// hose can run from the bouncing tank to the tube and the KO's dropped tube can lie on the ground. Pure.

export type Mat = readonly [number, number, number, number, number, number];
export type Pt = readonly [number, number];

export const IDENTITY: Mat = [1, 0, 0, 1, 0, 0];

/** `m` then `n`: a point goes through `n` first, then `m` (as canvas transform calls compose). */
export function mul(m: Mat, n: Mat): Mat {
  return [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
}

export const translate = (x: number, y: number): Mat => [1, 0, 0, 1, x, y];
export const scale = (sx: number, sy: number): Mat => [sx, 0, 0, sy, 0, 0];
export const rotate = (a: number): Mat => [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0];

/** Turns by `a` about `p`. */
export const rotateAbout = (a: number, p: Pt): Mat => mul(translate(p[0], p[1]), mul(rotate(a), translate(-p[0], -p[1])));

/** Scales by (sx, sy) about `p`. */
export const scaleAbout = (sx: number, sy: number, p: Pt): Mat => mul(translate(p[0], p[1]), mul(scale(sx, sy), translate(-p[0], -p[1])));

/** Composes left to right: chain(a, b, c) = a · b · c. */
export const chain = (...ms: Mat[]): Mat => ms.reduce((acc, m) => mul(acc, m), IDENTITY);

export function apply(m: Mat, [x, y]: Pt): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

export function invert(m: Mat): Mat {
  const det = m[0] * m[3] - m[1] * m[2];
  const [a, b, c, d] = [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det];
  return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])];
}

/** The angle the matrix turns the x axis to. */
export const angleOf = (m: Mat): number => Math.atan2(m[1], m[0]);

/** Sets `m` on the canvas on top of its current transform (inside the caller's save/restore). */
export function useMat(c: CanvasRenderingContext2D, m: Mat): void {
  c.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
}
