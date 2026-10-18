import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { SUPPLY_LOOK } from '../data/art/ground';
import { TILE_SIZE } from '../data/config';
import { OVERWORLD } from '../data/overworld';
import { SAFE_RADIUS } from '../data/population';
import type { SimEvents } from '../sim/events';
import type { SimState } from '../sim/state';
import { colorOf } from './color';
import { harvestTarget } from './nodeStages';

// The claimed pylon's harvest, made visible (018). Each raw the supply port
// produces shows here first: a ley tendril from the pylon to the nearest node of
// that raw in its zone, the node pulsing, then a mote of the raw running along
// the shrine's ley line to the foundry's stairs, where it sinks in. Visual only:
// nodes are never used up, and the sim's port runs as it always has. It assumes
// the prototype's one claimable site, the shrine, so it ignores which port it was.

interface Mote {
  itemId: string;
  /** The node it was drawn from, px; null when the zone holds none of that raw. */
  from: { x: number; y: number } | null;
  ageMs: number;
}

const T = TILE_SIZE;
const centre = (t: { tx: number; ty: number }) => ({ x: (t.tx + 0.5) * T, y: (t.ty + 0.5) * T });
const LINE = OVERWORLD.leyLines.shrine.map(centre);
const SEGMENTS = LINE.slice(1).map((b, i) => {
  const a = LINE[i] ?? b;
  return { a, b, length: Math.hypot(b.x - a.x, b.y - a.y) };
});
const LENGTH = SEGMENTS.reduce((n, s) => n + s.length, 0);

/** The point `d` px along the shrine's ley line from the pylon. */
function along(d: number): { x: number; y: number } {
  let left = d;
  for (const s of SEGMENTS) {
    if (left <= s.length) return { x: s.a.x + ((s.b.x - s.a.x) * left) / s.length, y: s.a.y + ((s.b.y - s.a.y) * left) / s.length };
    left -= s.length;
  }
  return LINE[LINE.length - 1] ?? { x: 0, y: 0 };
}

export class SupplyView {
  private readonly g: GameObjects.Graphics;
  /** The motes' soft halos, added as light over whatever's beneath. */
  private readonly glow: GameObjects.Graphics;
  private motes: Mote[] = [];
  /** Motes started since boot, for the test hook. */
  started = 0;

  constructor(scene: Scene) {
    // Over everything standing in the world, so a stone or tree on the line never hides the haul going home.
    this.glow = scene.add.graphics().setDepth(DEPTHS.supplyLine).setBlendMode(BlendModes.ADD);
    this.g = scene.add.graphics().setDepth(DEPTHS.supplyLine + 1);
  }

  /** Motes on their way, for the test hook: the raw and how far along (0..1, past 1 while sinking). */
  get inFlight(): { itemId: string; progress: number }[] {
    return this.motes.map((m) => ({ itemId: m.itemId, progress: this.travelled(m) / LENGTH }));
  }

  update(sim: SimState, events: SimEvents, shown: string, deltaMs: number): void {
    const pylon = centre(OVERWORLD.shrine.pylon);
    for (const s of events.supplies) {
      const node = harvestTarget(sim.nodes, OVERWORLD.id, s.itemId, pylon, SAFE_RADIUS * T);
      this.motes.push({ itemId: s.itemId, from: node ? { x: node.x, y: node.y } : null, ageMs: 0 });
      this.started += 1;
    }
    const L = SUPPLY_LOOK;
    // A long frame (a hitch, a background tab) moves motes no further than a short one, so none skips its run.
    const step = Math.min(deltaMs, L.maxStepMs);
    for (const m of this.motes) m.ageMs += step;
    this.motes = this.motes.filter((m) => this.travelled(m) < LENGTH || m.ageMs < this.arriveMs() + L.sinkMs);
    this.g.clear();
    this.glow.clear();
    this.g.setVisible(shown === OVERWORLD.id);
    this.glow.setVisible(shown === OVERWORLD.id);
    for (const m of this.motes) this.draw(m, pylon);
  }

  /** Ms from the port's tick until a mote reaches the stairs. */
  private arriveMs(): number {
    return SUPPLY_LOOK.tendrilMs + (LENGTH / SUPPLY_LOOK.moteSpeed) * 1000;
  }

  private travelled(m: Mote): number {
    return Math.max(0, ((m.ageMs - SUPPLY_LOOK.tendrilMs) / 1000) * SUPPLY_LOOK.moteSpeed);
  }

  private draw(m: Mote, pylon: { x: number; y: number }): void {
    const L = SUPPLY_LOOK;
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
    const sink = d >= LENGTH ? Math.min(1, (m.ageMs - this.arriveMs()) / L.sinkMs) : 0;
    const p = along(d);
    const colour = L.moteColors[m.itemId] ?? L.tendrilColor;
    const shrink = 1 - sink * L.sinkShrink;
    this.glow.fillStyle(colorOf(L.halo), L.haloAlpha * (1 - sink)).fillCircle(p.x, p.y, L.haloRadius * shrink);
    g.fillStyle(colorOf(colour), 1 - sink).fillCircle(p.x, p.y, L.moteRadius * shrink);
  }
}
