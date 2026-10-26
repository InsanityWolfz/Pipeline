import { THREAT_ARROW } from '../data/threats';
import { entry, grow, type ViewRect } from './waypointPlace';

// Where the off-screen threat arrows go (071). Pure, so tests can check it: each on the view's edge on the line from the
// player to its enemy, stopping short of a HUD box on that line (as 051's waypoint arrow does), and arrows whose tips
// are closer than the merge gap joined into one.

type Point = { x: number; y: number };

/** An arrow's tip (world px) and the way it points, radians (0 east, π/2 south). */
export interface EdgeArrow {
  x: number;
  y: number;
  angle: number;
}

/** A threat to place: its enemy's id and feet (world px), and how strongly it shows (1 live, less as it fades). */
export interface ThreatMark {
  id: number;
  x: number;
  y: number;
  alpha: number;
}

/** An arrow as placed: the threats it stands for (ids ascending) and the strongest of their alphas. */
export interface PlacedThreat extends EdgeArrow {
  ids: number[];
  alpha: number;
}

/** How far an arrow's tip keeps in from the view's edge and out from a HUD box: its inset plus half its width, so no
 * corner of it pokes off screen or under a box, whichever way it points. */
export const ARROW_CLEAR = THREAT_ARROW.edgeInset + THREAT_ARROW.width / 2;

/**
 * The tip where the line from `from` (the player, kept inside the view) toward `to` meets the view's edge `ARROW_CLEAR`
 * in, or first comes `ARROW_CLEAR` short of a HUD box (world rects), pointing along that line.
 */
export function edgeArrow(view: ViewRect, from: Point, to: Point, hud: readonly ViewRect[] = []): EdgeArrow {
  const inner = grow(view, -ARROW_CLEAR);
  const c = { x: Math.min(inner.x1, Math.max(inner.x0, from.x)), y: Math.min(inner.y1, Math.max(inner.y0, from.y)) };
  const d = { x: to.x - from.x, y: to.y - from.y };
  const angle = Math.atan2(d.y, d.x);
  if (d.x === 0 && d.y === 0) return { x: c.x, y: c.y, angle };
  // How far along `d` the line leaves the inset view, on whichever side it meets first.
  const tx = d.x > 0 ? (inner.x1 - c.x) / d.x : d.x < 0 ? (inner.x0 - c.x) / d.x : Infinity;
  const ty = d.y > 0 ? (inner.y1 - c.y) / d.y : d.y < 0 ? (inner.y0 - c.y) / d.y : Infinity;
  const s = Math.min(tx, ty, ...hud.map((b) => entry(c, d, grow(b, ARROW_CLEAR))));
  return { x: c.x + d.x * s, y: c.y + d.y * s, angle };
}

/** An arrow's three corners as drawn: its tip, then its base's two ends `length` back, `width` across. */
export function arrowPoints(a: EdgeArrow): [Point, Point, Point] {
  const ux = Math.cos(a.angle);
  const uy = Math.sin(a.angle);
  const bx = a.x - ux * THREAT_ARROW.length;
  const by = a.y - uy * THREAT_ARROW.length;
  const px = -uy * (THREAT_ARROW.width / 2);
  const py = ux * (THREAT_ARROW.width / 2);
  return [{ x: a.x, y: a.y }, { x: bx + px, y: by + py }, { x: bx - px, y: by - py }];
}

/**
 * Every threat's arrow, merged: arrows whose tips are within `mergeGap` of each other (in a chain) become one, placed
 * along the mean of their directions from the player. In the order of each group's lowest id. Merged arrows aren't
 * checked against each other again: on a straight edge two groups' arrows can't land closer than their nearest members,
 * and a sweep round the view (tests/render/threatPlace.test.ts) finds none at a corner or a HUD box either.
 */
export function placeThreats(view: ViewRect, from: Point, marks: readonly ThreatMark[], hud: readonly ViewRect[] = []): PlacedThreat[] {
  const sorted = [...marks].sort((a, b) => a.id - b.id);
  const tips = sorted.map((m) => edgeArrow(view, from, m, hud));
  const near = (a: Point, b: Point): boolean => Math.hypot(a.x - b.x, a.y - b.y) < THREAT_ARROW.mergeGap;
  // Single-link groups: each tip joins every group it is within the gap of, merging them.
  const groupOf = sorted.map((_, i) => i);
  const root = (i: number): number => (groupOf[i] === i ? i : root(groupOf[i] ?? i));
  for (let i = 0; i < tips.length; i++)
    for (let j = 0; j < i; j++) {
      const a = tips[i];
      const b = tips[j];
      if (a && b && near(a, b)) groupOf[root(i)] = root(j);
    }
  const byRoot = new Map<number, number[]>();
  sorted.forEach((_, i) => byRoot.set(root(i), [...(byRoot.get(root(i)) ?? []), i]));
  const groups = [...byRoot.values()];
  // A group's arrow: a lone tip as placed, or the mean of its members' directions, as a point along it.
  const place = (members: readonly number[]): EdgeArrow => {
    const lone = members.length === 1 ? tips[members[0] ?? 0] : undefined;
    if (lone) return lone;
    let ux = 0;
    let uy = 0;
    for (const i of members) {
      ux += Math.cos(tips[i]?.angle ?? 0);
      uy += Math.sin(tips[i]?.angle ?? 0);
    }
    return edgeArrow(view, from, { x: from.x + ux, y: from.y + uy }, hud);
  };
  const placed = groups.map(place);
  return groups.map((members, g) => ({
    ...(placed[g] ?? { x: from.x, y: from.y, angle: 0 }),
    ids: members.map((i) => sorted[i]?.id ?? -1),
    alpha: Math.max(...members.map((i) => sorted[i]?.alpha ?? 0)),
  }));
}
