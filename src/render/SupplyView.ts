import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { SUPPLY_LOOK } from '../data/art/ground';
import { TILE_SIZE } from '../data/config';
import { OVERWORLD } from '../data/overworld';
import { SITE_SUPPLY } from '../data/claims';
import type { SimEvents } from '../sim/events';
import type { SimState } from '../sim/state';
import { WORLD } from '../sim/world';
import { colorOf } from './color';
import { harvestTarget } from './nodeStages';

// Each claimed pylon's harvest, made visible (018). Each raw a supply port produces
// (028: one port per raw) shows here first as its own mote: a ley tendril from a claimed
// pylon supplying that raw to the nearest node of it in the pylon's zone, the node
// pulsing, then a mote running along that pylon's ley line to the foundry's stairs, where
// it sinks in. With several pylons supplying a raw (032), its motes leave from each in
// turn. Visual only: nodes are never used up.

/** A ley line home as points with its segments' lengths, px. */
interface Line {
  points: { x: number; y: number }[];
  segments: { a: { x: number; y: number }; b: { x: number; y: number }; length: number }[];
  length: number;
}

interface Mote {
  itemId: string;
  /** The node it was drawn from, px; null when the zone holds none of that raw. */
  from: { x: number; y: number } | null;
  /** The pylon it leaves from, px, and the line it runs home along. */
  pylon: { x: number; y: number };
  line: Line;
  ageMs: number;
}

const T = TILE_SIZE;
const centre = (t: { tx: number; ty: number }) => ({ x: (t.tx + 0.5) * T, y: (t.ty + 0.5) * T });

function lineOf(tiles: readonly { tx: number; ty: number }[]): Line {
  const points = tiles.map(centre);
  const segments = points.slice(1).map((b, i) => {
    const a = points[i] ?? b;
    return { a, b, length: Math.hypot(b.x - a.x, b.y - a.y) };
  });
  return { points, segments, length: segments.reduce((n, sg) => n + sg.length, 0) };
}

/** The point `d` px along a line from its pylon. */
function along(line: Line, d: number): { x: number; y: number } {
  let left = d;
  for (const sg of line.segments) {
    if (left <= sg.length) return { x: sg.a.x + ((sg.b.x - sg.a.x) * left) / sg.length, y: sg.a.y + ((sg.b.y - sg.a.y) * left) / sg.length };
    left -= sg.length;
  }
  return line.points[line.points.length - 1] ?? { x: 0, y: 0 };
}

/** Each pylon's line home, by its site: the shrine's (018) and each landmark's (032), named by their site ids. */
const LINES = new Map<string, Line>(Object.entries(OVERWORLD.leyLines).map(([id, tiles]) => [id, lineOf(tiles)]));

export class SupplyView {
  private readonly g: GameObjects.Graphics;
  /** The motes' soft halos, added as light over whatever's beneath. */
  private readonly glow: GameObjects.Graphics;
  private motes: Mote[] = [];
  /** Motes started since boot, for the test hook. */
  started = 0;
  /** Motes started per raw, to take the supplying pylons in turn. */
  private readonly turns = new Map<string, number>();

  constructor(scene: Scene) {
    // Over everything standing in the world, so a stone or tree on the line never hides the haul going home.
    this.glow = scene.add.graphics().setDepth(DEPTHS.supplyLine).setBlendMode(BlendModes.ADD);
    this.g = scene.add.graphics().setDepth(DEPTHS.supplyLine + 1);
  }

  /** Motes on their way, for the test hook: the raw and how far along (0..1, past 1 while sinking). */
  get inFlight(): { itemId: string; progress: number; site: string }[] {
    return this.motes.map((m) => ({ itemId: m.itemId, progress: this.travelled(m) / m.line.length, site: this.siteOf(m) }));
  }

  private siteOf(m: Mote): string {
    return [...LINES].find(([, l]) => l === m.line)?.[0] ?? '';
  }

  update(sim: SimState, events: SimEvents, shown: string, deltaMs: number): void {
    const pylons = (WORLD[OVERWORLD.id]?.pylons ?? []).filter((p) => sim.claims.includes(p.site));
    for (const s of events.supplies) {
      // The claimed pylons supplying this raw, in turn.
      const from = pylons.filter((p) => SITE_SUPPLY[p.site]?.includes(s.itemId));
      const turn = this.turns.get(s.itemId) ?? 0;
      this.turns.set(s.itemId, turn + 1);
      const p = from[turn % Math.max(1, from.length)];
      const line = p ? LINES.get(p.site) : undefined;
      if (!p || !line) continue;
      const at = centre(p);
      const node = harvestTarget(sim.nodes, OVERWORLD.id, s.itemId, at, p.safeRadius * T);
      this.motes.push({ itemId: s.itemId, from: node ? { x: node.x, y: node.y } : null, pylon: at, line, ageMs: 0 });
      this.started += 1;
    }
    const L = SUPPLY_LOOK;
    // A long frame (a hitch, a background tab) moves motes no further than a short one, so none skips its run.
    const step = Math.min(deltaMs, L.maxStepMs);
    for (const m of this.motes) m.ageMs += step;
    this.motes = this.motes.filter((m) => this.travelled(m) < m.line.length || m.ageMs < this.arriveMs(m) + L.sinkMs);
    this.g.clear();
    this.glow.clear();
    this.g.setVisible(shown === OVERWORLD.id);
    this.glow.setVisible(shown === OVERWORLD.id);
    for (const m of this.motes) this.draw(m);
  }

  /** Ms from the port's tick until a mote reaches the stairs. */
  private arriveMs(m: Mote): number {
    return SUPPLY_LOOK.tendrilMs + (m.line.length / SUPPLY_LOOK.moteSpeed) * 1000;
  }

  private travelled(m: Mote): number {
    return Math.max(0, ((m.ageMs - SUPPLY_LOOK.tendrilMs) / 1000) * SUPPLY_LOOK.moteSpeed);
  }

  private draw(m: Mote): void {
    const L = SUPPLY_LOOK;
    const pylon = m.pylon;
    const g = this.g;
    // The tendril reaches out to the node and fades as the mote sets off, and the node pulses.
    if (m.from && m.ageMs < L.tendrilMs * 2) {
      const reach = Math.min(1, m.ageMs / L.tendrilMs);
      const fade = m.ageMs < L.tendrilMs ? 1 : 2 - m.ageMs / L.tendrilMs;
      const top = { x: pylon.x, y: pylon.y - L.pylonRise };
      const dx = m.from.x - top.x;
      const dy = m.from.y - top.y;
      const len = Math.hypot(dx, dy) || 1;
      g.lineStyle(L.tendrilWidth, colorOf(L.tendrilColor), fade);
      g.beginPath();
      g.moveTo(top.x, top.y);
      const steps = L.tendrilSteps;
      for (let i = 1; i <= Math.round(steps * reach); i++) {
        const k = i / steps;
        const wave = Math.sin(k * Math.PI * 2 * L.waves + m.ageMs / L.waveMs) * L.wobble * Math.sin(k * Math.PI);
        g.lineTo(top.x + dx * k - (dy / len) * wave, top.y + dy * k + (dx / len) * wave);
      }
      g.strokePath();
      const pulse = Math.max(0, (m.ageMs - L.tendrilMs * L.pulseAt) / L.pulseMs);
      if (pulse > 0 && pulse < 1) g.lineStyle(L.pulseWidth, colorOf(L.tendrilColor), 1 - pulse).strokeCircle(m.from.x, m.from.y - L.pulseRise, L.pulseRadius * pulse);
    }
    if (m.ageMs < L.tendrilMs) return;
    // The mote runs along the ley line, then sinks into the stairs.
    const d = this.travelled(m);
    const sink = d >= m.line.length ? Math.min(1, (m.ageMs - this.arriveMs(m)) / L.sinkMs) : 0;
    const p = along(m.line, d);
    const colour = L.moteColors[m.itemId] ?? L.tendrilColor;
    const shrink = 1 - sink * L.sinkShrink;
    this.glow.fillStyle(colorOf(L.halo), L.haloAlpha * (1 - sink)).fillCircle(p.x, p.y, L.haloRadius * shrink);
    g.fillStyle(colorOf(colour), 1 - sink).fillCircle(p.x, p.y, L.moteRadius * shrink);
  }
}
