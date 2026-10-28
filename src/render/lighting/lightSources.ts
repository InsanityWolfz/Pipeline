import { TILE_SIZE } from '../../data/config';
import { GROUND } from '../../data/art/ground';
import { AMBIENT, GLOWS } from '../../data/juice';
import { LIGHT_SOURCES, ROUND_LIGHTS, SET_PIECE_BREATHE, SET_PIECE_LIGHTS } from '../../data/lights';
import { SET_PIECES, setPieceAnchor } from '../../data/setPieces';
import { PROPS } from '../../data/props';
import type { Quality } from '../../data/settings';
import { SPRING_LOOK } from '../../data/springAssets';
import { isClaimed } from '../../sim/claims';
import { ventState, type NodeState } from '../../sim/nodes';
import { roomById, type SimState } from '../../sim/state';
import { chainSegments } from '../../sim/conductorAi';
import { conductorDefOf } from '../../sim/conductorRods';
import { firePoints, leyLinePoints, springPoints } from './fixedLights';
import type { LightCandidate } from './lightPick';
import type { LightPulses } from './lightPulses';

// 074: the lights a frame could place, from what is in or near the view: the face glow, fires (flaring vents, burning
// ground, braziers), ley glows (crystals, live veins, claimed pylons, springs) and ley lines, the Forgewright venting and
// its flood, the Conductor's rod chain while it runs, rounds in flight, and the event pulses. Nodes are bucketed by
// chunk once, so no frame walks every node.

type View = { x: number; y: number; width: number; height: number };

const S = LIGHT_SOURCES;
const T = TILE_SIZE;
const C = GROUND.chunk;

export interface SourceInput {
  sim: SimState;
  shown: string;
  view: View;
  quality: Quality;
  /** Scene ms, for breathing and flicker. */
  time: number;
  flashes: boolean;
  pulses: LightPulses;
  /** The Conductor's rod chain while it runs, as segments, or none. */
  chain: readonly { x0: number; y0: number; x1: number; y1: number }[];
}

/** How far past the view a light may stand and still be placed: its pool reaches in. */
const PAD = 96;

const near = (v: View, x: number, y: number, pad = PAD): boolean => x >= v.x - pad && x <= v.x + v.width + pad && y >= v.y - pad && y <= v.y + v.height + pad;

/** Today's glow breathing (014), 0..1, for a light's intensity. */
const breathe = (time: number, i: number): number => (Math.sin((time / AMBIENT.glowBreatheMs + i * AMBIENT.glowStagger) * Math.PI * 2) + 1) / 2;

/** A fire's ±flicker (two waves, so it doesn't pulse evenly), within ±`flicker`. */
const flicker = (time: number, seed: number): number => 1 + S.fire.flicker * (0.6 * Math.sin((time / 1000) * S.fire.flickerHz * Math.PI * 2 + seed) + 0.4 * Math.sin((time / 1000) * S.fire.flickerHz * 2.3 * Math.PI * 2 + seed * 1.7));

/** The node indices that give light (live veins, cinder vents), by chunk, for one node list. */
let nodeBuckets: { of: readonly NodeState[]; length: number; map: Map<string, number[]> } | null = null;

/** Every steady light near the view this frame, plus the pulses alive. */
export function gatherLights(input: SourceInput): LightCandidate[] {
  const { sim, shown, view: v, quality, time } = input;
  const out: LightCandidate[] = [...input.pulses.lights()];
  const add = (source: LightCandidate['source'], x: number, y: number, radius: number, color: string, intensity: number, priority: number) => {
    if (near(v, x, y, radius)) out.push({ source, x, y, radius, color, intensity, priority });
  };
  const p = sim.player;
  if (shown === sim.roomId && p.dying === 0) {
    const flare = input.flashes && input.pulses.sinceShot < S.face.flareMs ? S.face.flare : 1;
    add('face', p.x, p.y - S.face.rise, S.face.radius, S.face.color, S.face.intensity * flare, S.face.priority);
  }
  const room = roomById(shown);
  // Ley glows: the room's crystal, claimed pylons, live veins, springs.
  const ley = (x: number, y: number, glow: { color: string; radius: number }, i: number) => add('ley', x, y, glow.radius * S.ley.radius, glow.color, S.ley.intensity * (0.75 + 0.25 * breathe(time, i)), S.ley.priority);
  if (room.crystal) ley((room.crystal.tx + 0.5) * T, (room.crystal.ty + 0.5) * T, GLOWS.crystal, 0);
  for (const [i, pylon] of (room.pylons ?? []).entries()) if (isClaimed(sim, pylon.site)) ley((pylon.tx + 0.5) * T, (pylon.ty + 0.5) * T, GLOWS.pylon, i);
  // Braziers and any other prop that glows with fire; ley-coloured props glow as ley.
  for (const [i, prop] of (room.props ?? []).entries()) {
    const glow = PROPS[prop.propId].glow;
    // 079: a prop with its own light (the foundry's braziers and torches) is the foundry's (foundryLights.ts).
    if (!glow || PROPS[prop.propId].light) continue;
    const x = (prop.tx + 0.5) * T;
    const y = (prop.ty + 0.5) * T;
    if (glow.color === S.fire.color) add('fire', x, y, S.fire.radii.brazier, S.fire.color, S.fire.intensity * flicker(time, i), S.fire.priority);
    else ley(x, y, glow, i);
  }
  for (const n of nodesNear(sim.nodes, shown, v)) {
    if (n.nodeId === 'ley-vein' && n.uses > 0) ley(n.x, n.y, GLOWS.vein, n.id);
    if (n.nodeId === 'cinder-vent' && ventState(n) === 'open') add('fire', n.x, n.y - 8, S.fire.radii.vent, S.fire.color, S.fire.intensity * flicker(time, n.id), S.fire.priority);
  }
  if (room.terrain) {
    for (const s of springPoints(v, PAD)) add('ley', s.x, s.y, SPRING_LOOK.light.radius * S.ley.radius, SPRING_LOOK.light.color, S.ley.intensity * (0.75 + 0.25 * breathe(time, 3)), S.ley.priority);
    for (const l of leyLinePoints(v, quality, PAD)) add('leyLine', l.x, l.y, S.leyLine.radius, S.leyLine.color, S.leyLine.intensity, S.leyLine.priority);
    // 074.7: the Emberworks' kiln mouths and chimney tops burn.
    for (const f of firePoints(room.rows, v, PAD)) add('fire', f.x, f.y, f.radius, S.fire.color, f.intensity * flicker(time, f.x * 0.37 + f.y), S.fire.priority);
    // 077: the set pieces that give light (the Ley Tower's crystal breathing, the Great Furnace's and Crucible's fires).
    for (const p of SET_PIECES) {
      const l = SET_PIECE_LIGHTS[p.id];
      if (!l || !p.lightAt) continue;
      const a = setPieceAnchor(p, T);
      const x = a.x + p.lightAt[0];
      const y = a.y + p.lightAt[1];
      const k = l.flicker ? flicker(time, x * 0.37 + y) : SET_PIECE_BREATHE.floor + (1 - SET_PIECE_BREATHE.floor) * breathe(time, SET_PIECE_BREATHE.stagger);
      add(l.source, x, y, l.radius, l.color, l.intensity * k, l.priority);
    }
  }
  // Burning ground: a cinder mote's pool, a hound's trail; the Forgewright's flood is its own (a boss attack).
  for (const pool of sim.floodPools) {
    if (pool.roomId !== shown) continue;
    if (pool.shape === 'rect') {
      for (const [fx, fy] of [[0.25, 0.3], [0.75, 0.3], [0.25, 0.75], [0.75, 0.75]] as const) add('forgewright', pool.x0 + (pool.x1 - pool.x0) * fx, pool.y0 + (pool.y1 - pool.y0) * fy, S.forgewright.radius, S.forgewright.color, S.forgewright.intensity * flicker(time, fx * 10 + fy), S.forgewright.priority);
      continue;
    }
    add('fire', (pool.x0 + pool.x1) / 2, (pool.y0 + pool.y1) / 2, Math.max(S.fire.radii.ground, pool.r * 1.5), S.fire.color, S.fire.intensity * flicker(time, pool.age), S.fire.priority);
  }
  // A Pool left by a burst (Blastfletch) burns too.
  for (const pool of sim.pools) if (pool.roomId === shown) add('fire', pool.x, pool.y, Math.max(S.fire.radii.ground, pool.radius), S.fire.color, S.fire.intensity * flicker(time, pool.id), S.fire.priority);
  for (const [id, at] of input.pulses.venting) add('forgewright', at.x, at.y - 40, S.forgewright.radius, S.forgewright.color, S.forgewright.intensity * flicker(time, id), S.forgewright.priority);
  for (const s of input.chain) add('conductor', (s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2, S.conductor.radius, S.conductor.color, S.conductor.intensity, S.conductor.priority);
  if (quality === 'high') {
    for (const a of sim.arrows) {
      if (a.roomId !== shown) continue;
      const color = ROUND_LIGHTS.byType[a.damageType] ?? ROUND_LIGHTS.byAmmo[a.ammoId.split('+')[0] ?? ''];
      if (color) add('round', a.x, a.y, ROUND_LIGHTS.radius, color, ROUND_LIGHTS.intensity, ROUND_LIGHTS.priority);
    }
  }
  return out;
}

/** The glowing nodes (veins, vents) in the room near the view, from their chunk buckets. */
function nodesNear(nodes: readonly NodeState[], roomId: string, v: View): NodeState[] {
  if (!nodeBuckets || nodeBuckets.of !== nodes || nodeBuckets.length !== nodes.length) {
    const map = new Map<string, number[]>();
    nodes.forEach((n, i) => {
      if (n.nodeId !== 'ley-vein' && n.nodeId !== 'cinder-vent') return;
      const k = `${n.roomId}|${Math.floor(n.x / C)},${Math.floor(n.y / C)}`;
      const list = map.get(k);
      if (list) list.push(i);
      else map.set(k, [i]);
    });
    nodeBuckets = { of: nodes, length: nodes.length, map };
  }
  const out: NodeState[] = [];
  for (let cy = Math.floor((v.y - PAD) / C); cy <= Math.floor((v.y + v.height + PAD) / C); cy++) {
    for (let cx = Math.floor((v.x - PAD) / C); cx <= Math.floor((v.x + v.width + PAD) / C); cx++) {
      for (const i of nodeBuckets.map.get(`${roomId}|${cx},${cy}`) ?? []) {
        const n = nodes[i];
        if (n) out.push(n);
      }
    }
  }
  return out;
}

/** The Conductor's rod chain while it runs in the room on screen, as segments (none otherwise), as ConductorView finds it. */
export function conductorChain(sim: SimState, shown: string): { x0: number; y0: number; x1: number; y1: number }[] {
  const c = sim.enemies.find((e) => e.roomId === shown && e.health > 0 && conductorDefOf(e) !== null);
  return c && c.conductor.attack === 2 && c.mode === 'swipe' ? chainSegments(c) : [];
}
