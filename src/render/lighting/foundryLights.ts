import { AMBIENT } from '../../data/juice';
import { FOUNDRY_LIGHTS, type FoundryLight } from '../../data/lights';
import { PROPS } from '../../data/props';
import type { Room } from '../../data/rooms';
import type { ForgeAt } from '../foundry/runningForges';
import { propBase } from '../propBase';
import type { LightCandidate } from './lightPick';

// 079: the foundry's lights as 074's picker takes them (pure): its wall fires (every prop with a `light`, worked out
// once a room: the braziers and the torches), each offered only while its pool reaches the view, the intake's mouth while it glows (1.5 × its glow, breathing and swelling
// with it), and the working forge machines on screen it is given (FoundryMood's running set, never a walk over every
// piece). Fires flicker within their ±share; a light marked steady (the coil) holds still with Flashes off.

/** A wall fire: its light key and where its flame is. */
export interface WallLight {
  key: string;
  x: number;
  y: number;
}

const walls = new WeakMap<Room, WallLight[]>();

/** The room's wall fires, from its props (once a room). */
export function wallLights(room: Room): WallLight[] {
  const had = walls.get(room);
  if (had) return had;
  const width = room.rows[0]?.length ?? 0;
  const out: WallLight[] = [];
  for (const p of room.props ?? []) {
    const key = PROPS[p.propId].light;
    const light = key ? FOUNDRY_LIGHTS.walls[key] : undefined;
    if (!key || !light) continue;
    const at = propBase(p, width);
    out.push({ key, x: at.x, y: at.y - light.rise });
  }
  walls.set(room, out);
  return out;
}

/** A light's ±flicker (two slow waves beating, so it doesn't pulse evenly or jitter), within ±`share`; 1 with none. */
function flicker(l: FoundryLight, time: number, seed: number, flashes: boolean): number {
  if (l.flicker === 0 || (!flashes && l.steadyWithoutFlashes)) return 1;
  const w = (time / 1000) * l.flickerHz * Math.PI * 2;
  return 1 + l.flicker * (0.6 * Math.sin(w + seed) + 0.4 * Math.sin(w * 0.53 + seed * 1.7));
}

/** 014's glow breathing, 0..1. */
const breathe = (time: number): number => (Math.sin((time / AMBIENT.glowBreatheMs) * Math.PI * 2) + 1) / 2;

export interface FoundryLightInput {
  room: Room;
  /** The camera's view: a light is offered only if its pool reaches into it (074's rule). */
  view: { x: number; y: number; width: number; height: number };
  /** Scene ms. */
  time: number;
  flashes: boolean;
  /** Working forge machines on screen. */
  forges: readonly ForgeAt[];
  /** The intake's mouth and its glow's radius now (swelling with a fill), or null while it doesn't glow. */
  intake: { x: number; y: number; glowRadius: number } | null;
}

export function foundryLights(input: FoundryLightInput): LightCandidate[] {
  const { time, flashes, view: v } = input;
  const out: LightCandidate[] = [];
  const near = (x: number, y: number, r: number) => x >= v.x - r && x <= v.x + v.width + r && y >= v.y - r && y <= v.y + v.height + r;
  for (const [i, w] of wallLights(input.room).entries()) {
    const l = FOUNDRY_LIGHTS.walls[w.key];
    if (l && near(w.x, w.y, l.radius)) out.push({ source: 'wall', x: w.x, y: w.y, radius: l.radius, color: l.color, intensity: l.intensity * flicker(l, time, i * 1.9, flashes), priority: l.priority });
  }
  const intake = input.intake;
  if (intake && near(intake.x, intake.y, intake.glowRadius * FOUNDRY_LIGHTS.intake.radius)) {
    const l = FOUNDRY_LIGHTS.intake;
    out.push({ source: 'intake', x: intake.x, y: intake.y - l.rise, radius: intake.glowRadius * l.radius, color: l.color, intensity: l.intensity * (0.75 + 0.25 * breathe(time)), priority: l.priority });
  }
  for (const f of input.forges) {
    const l = FOUNDRY_LIGHTS.machines[f.pieceId];
    if (l) out.push({ source: 'forge', x: f.x, y: f.bottom - l.rise, radius: l.radius, color: l.color, intensity: l.intensity * flicker(l, time, f.id * 0.73, flashes), priority: l.priority });
  }
  return out;
}
