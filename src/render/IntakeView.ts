import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { CAP_SEAT_Y, ENTRANCE_GAUGE_COLORS, INTAKE_INLETS, INTAKE_LOOK } from '../data/art/intake';
import { TILE_SIZE } from '../data/config';
import { ENTRANCE_CAP, INTAKE } from '../data/foundry';
import { FACING_ARROWS, FOUNDRY_LAYOUT, INTAKE_SPRITES } from '../data/foundryAssets';
import { FOUNDRY_ROOM } from '../data/rooms';
import { attuneBeat } from './attune';
import type { SimEvents } from '../sim/events';
import type { EntranceState } from '../sim/link';
import type { SimState } from '../sim/state';
import { colorOf } from './color';
import { intakeAnchor } from './foundryLayout';
import { addVector, showFrame } from './vector/textures';

// The foundry intake (019, 024): the pipe in the north wall, drawn from vector
// data, with its live lights over it: its ring bands lighting one by one as the
// tube attunes, one gauge column per entrance lit in proportion to its count in
// its ammo's colour, and a ring of light running up into the wall as each item
// goes in. A brass cap sits over each capped side entrance until a warden core
// opens it, when it lifts off with a ring of light. In build mode, an input arrow
// under each open entrance.

const AT = intakeAnchor();
/** Just in front of the wall it's built into, behind anything on the floor below. */
const DEPTH = AT.y + FOUNDRY_LAYOUT.onTopNudge;

export class IntakeView {
  private readonly scene: Scene;
  private readonly pipe: GameObjects.Image;
  /** Dark rings, drawn normally, under the light added on top (additive light can only brighten). */
  private readonly shade: GameObjects.Graphics;
  private readonly lights: GameObjects.Graphics;
  /** The entrances' lit gauge rings, drawn normally over the lit bands so each ammo's colour reads true. */
  private readonly gauges: GameObjects.Graphics;
  private readonly arrows: GameObjects.Image[];
  /** The brass caps, one per entrance (only shown while it's capped). */
  private readonly caps: GameObjects.Image[];
  /** Ms since each ring of light set off up the pipe. */
  private pulses: number[] = [];
  /** Caps lifting off: which entrance, and how far through (0..1), driven by a tween so a stopped tween holds it. */
  private lifts: { entrance: number; t: number; done: boolean }[] = [];

  constructor(scene: Scene) {
    this.scene = scene;
    this.pipe = addVector(scene, AT.x, AT.y, INTAKE_SPRITES.dormant).setDepth(DEPTH);
    this.shade = scene.add.graphics().setDepth(DEPTH + FOUNDRY_LAYOUT.onTopNudge);
    this.lights = scene.add.graphics().setDepth(DEPTH + 2 * FOUNDRY_LAYOUT.onTopNudge).setBlendMode(BlendModes.ADD);
    this.gauges = scene.add.graphics().setDepth(DEPTH + 3 * FOUNDRY_LAYOUT.onTopNudge);
    const reach = TILE_SIZE / 2 + FOUNDRY_LAYOUT.arrowOffset;
    this.arrows = INTAKE.entrances.map((m) =>
      addVector(scene, (m.tx + 0.5) * TILE_SIZE, (m.ty + 0.5) * TILE_SIZE + reach, FACING_ARROWS.in.up).setDepth(DEPTHS.worldUi - 1),
    );
    this.caps = INTAKE_INLETS.map((x) => addVector(scene, AT.x + x, AT.y + CAP_SEAT_Y, INTAKE_SPRITES.cap).setDepth(DEPTH + 4 * FOUNDRY_LAYOUT.onTopNudge));
  }

  /** Caps still drawn on the pipe (seated or lifting), for the test hook. */
  get capsShown(): number {
    return this.caps.filter((c) => c.visible).length;
  }

  /** How far the caps lifting off are (0..1), or null when none are, for the test hook. */
  get liftShown(): number | null {
    return this.lifts.length > 0 ? Math.max(...this.lifts.map((l) => l.t)) : null;
  }

  update(sim: SimState, events: SimEvents, shown: string, building: boolean, deltaMs: number): void {
    const here = shown === FOUNDRY_ROOM;
    const { entrances } = sim.link;
    for (const o of [this.pipe, this.shade, this.lights, this.gauges]) o.setVisible(here);
    for (const [i, a] of this.arrows.entries()) a.setVisible(here && building && (entrances[i]?.open ?? false));
    this.pulses.push(...events.refills.map(() => 0));
    this.pulses = this.pulses.map((ms) => ms + deltaMs).filter((ms) => ms < INTAKE.pulseMs);
    for (const open of events.intakeOpens) for (const entrance of open.entrances) this.liftCap(entrance);
    this.lifts = this.lifts.filter((l) => !l.done);
    this.placeCaps(entrances, here);
    this.lights.clear();
    this.shade.clear();
    this.gauges.clear();
    if (!here) return;
    const { attuned, attunePulse } = sim.link;
    // Attuning: once the camera reaches it, the rings light one by one over the dormant pipe, as the tube's did; it turns cyan once they all have.
    const progress = attuned ? attuneBeat(attunePulse).pipe : 0;
    const bands = INTAKE_LOOK.bands.ys.length;
    showFrame(this.pipe, progress >= 1 ? INTAKE_SPRITES.attuned : INTAKE_SPRITES.dormant);
    this.drawBands(progress >= 1 ? bands : Math.floor(progress * (bands + 1)));
    if (attuned) for (const [i, e] of entrances.entries()) this.drawGauge(i, e);
    for (const ms of this.pulses) this.drawPulse(ms / INTAKE.pulseMs);
    for (const l of this.lifts) this.drawLiftRing(l.entrance, l.t);
  }

  /** A seated cap shows on each capped entrance; an open one has none, unless it's still lifting off. */
  private placeCaps(entrances: readonly EntranceState[], here: boolean): void {
    for (const [i, cap] of this.caps.entries()) {
      const lifting = this.lifts.some((l) => l.entrance === i);
      cap.setVisible(here && (!(entrances[i]?.open ?? true) || lifting));
    }
  }

  /** The cap on `entrance` rises and fades away. */
  private liftCap(entrance: number): void {
    const cap = this.caps[entrance];
    const x = INTAKE_INLETS[entrance];
    if (!cap || x === undefined) return;
    const lift = { entrance, t: 0, done: false };
    this.lifts.push(lift);
    const L = INTAKE_LOOK.capLift;
    const seat = AT.y + CAP_SEAT_Y;
    cap.setPosition(AT.x + x, seat).setAlpha(1);
    this.scene.tweens.add({
      targets: lift,
      t: 1,
      duration: L.ms,
      ease: 'Cubic.easeOut',
      onUpdate: () => cap.setY(seat - L.rise * lift.t).setAlpha(1 - lift.t),
      onComplete: () => {
        lift.done = true;
      },
    });
  }

  private drawBands(lit: number): void {
    const b = INTAKE_LOOK.bands;
    for (const [i, y] of b.ys.entries()) {
      const on = i < lit;
      (on ? this.lights : this.shade).fillStyle(colorOf(on ? b.lit : b.dark), on ? b.litAlpha : b.darkAlpha).fillRect(AT.x - b.half, AT.y + y, b.half * 2, b.height);
    }
  }

  /** Entrance `i`'s gauge column: rings lit from the bottom in proportion to its count, in its ammo's colour. A capped entrance's stays dark. */
  private drawGauge(i: number, e: EntranceState): void {
    const g = INTAKE_LOOK.gauge;
    const x = AT.x + (g.xs[i] ?? 0);
    const lit = Math.round((INTAKE.gaugeRings * e.count) / ENTRANCE_CAP);
    const color = colorOf(ENTRANCE_GAUGE_COLORS[e.ammoId ?? ''] ?? g.dark);
    for (let r = 0; r < INTAKE.gaugeRings; r++) {
      const y = AT.y + g.bottom - r * g.step;
      if (r < lit) {
        // Lit rings are drawn normally, over the bands, so the ammo's colour reads on the cyan pipe, with a soft glow added round them.
        this.gauges.fillStyle(color, g.litAlpha).fillRect(x - g.half, y, g.half * 2, g.height);
        this.lights.fillStyle(color, g.glowAlpha).fillRect(x - g.half - 1, y - 1, g.half * 2 + 2, g.height + 2);
      } else {
        this.shade.fillStyle(colorOf(g.dark), g.darkAlpha).fillRect(x - g.half, y, g.half * 2, g.height);
      }
    }
  }

  /** A ring of light `t` (0..1) of the way up the pipe, fading as it goes into the wall. */
  private drawPulse(t: number): void {
    const p = INTAKE_LOOK.pulse;
    const y = AT.y + p.from + (p.to - p.from) * t;
    this.lights.fillStyle(colorOf(p.color), 1 - t).fillRect(AT.x - p.half, y, p.half * 2, p.height);
  }

  /** The ring of light round an inlet as its cap lifts off, `t` (0..1) of the way through: it grows and fades. */
  private drawLiftRing(entrance: number, t: number): void {
    const L = INTAKE_LOOK.capLift;
    const x = INTAKE_INLETS[entrance];
    if (x === undefined) return;
    const grow = L.ringFrom + t;
    this.lights.lineStyle(L.ringWidth, colorOf(L.ring), 1 - t).strokeEllipse(AT.x + x, AT.y + CAP_SEAT_Y, L.ringRadius * 2 * grow, L.ringRadius * grow);
  }
}
