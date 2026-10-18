import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { ATLAS_KEY, DEPTHS } from '../data/assets';
import { INTAKE_LOOK } from '../data/art/intake';
import { TILE_SIZE } from '../data/config';
import { INTAKE } from '../data/foundry';
import { FACING_ARROWS, FOUNDRY_LAYOUT, INTAKE_SPRITES } from '../data/foundryAssets';
import { FOUNDRY_ROOM } from '../data/rooms';
import { RESERVOIR_CAP } from '../data/tube';
import { attuneBeat } from './attune';
import type { SimEvents } from '../sim/events';
import type { SimState } from '../sim/state';
import { colorOf } from './color';
import { intakeAnchor } from './foundryLayout';
import { addVector, showFrame } from './vector/textures';

// The foundry intake (019): the pipe in the north wall, drawn from vector data,
// with its live lights over it: its ring bands lighting one by one as the tube
// attunes, a gauge column lit in proportion to the reservoir, and a ring of light
// running up into the wall as each item goes in. In build mode, an input arrow
// under each mouth tile.

const AT = intakeAnchor();
/** Just in front of the wall it's built into, behind anything on the floor below. */
const DEPTH = AT.y + FOUNDRY_LAYOUT.onTopNudge;

export class IntakeView {
  private readonly pipe: GameObjects.Image;
  /** Dark rings, drawn normally, under the light added on top (additive light can only brighten). */
  private readonly shade: GameObjects.Graphics;
  private readonly lights: GameObjects.Graphics;
  private readonly arrows: GameObjects.Image[];
  /** Ms since each ring of light set off up the pipe. */
  private pulses: number[] = [];

  constructor(scene: Scene) {
    this.pipe = addVector(scene, AT.x, AT.y, INTAKE_SPRITES.dormant).setDepth(DEPTH);
    this.shade = scene.add.graphics().setDepth(DEPTH + FOUNDRY_LAYOUT.onTopNudge);
    this.lights = scene.add.graphics().setDepth(DEPTH + 2 * FOUNDRY_LAYOUT.onTopNudge).setBlendMode(BlendModes.ADD);
    const reach = TILE_SIZE / 2 + FOUNDRY_LAYOUT.arrowOffset;
    this.arrows = INTAKE.mouth.map((m) =>
      scene.add.image((m.tx + 0.5) * TILE_SIZE, (m.ty + 0.5) * TILE_SIZE + reach, ATLAS_KEY, FACING_ARROWS.in.up).setDepth(DEPTHS.worldUi - 1),
    );
  }

  update(sim: SimState, events: SimEvents, shown: string, building: boolean, deltaMs: number): void {
    const here = shown === FOUNDRY_ROOM;
    for (const o of [this.pipe, this.shade, this.lights]) o.setVisible(here);
    for (const a of this.arrows) a.setVisible(here && building);
    this.pulses.push(...events.refills.map(() => 0));
    this.pulses = this.pulses.map((ms) => ms + deltaMs).filter((ms) => ms < INTAKE.pulseMs);
    this.lights.clear();
    this.shade.clear();
    if (!here) return;
    const { attuned, attunePulse, reservoir } = sim.link;
    // Attuning: once the camera reaches it, the rings light one by one over the dormant pipe, as the tube's did; it turns cyan once they all have.
    const progress = attuned ? attuneBeat(attunePulse).pipe : 0;
    const bands = INTAKE_LOOK.bands.ys.length;
    showFrame(this.pipe, progress >= 1 ? INTAKE_SPRITES.attuned : INTAKE_SPRITES.dormant);
    this.drawBands(progress >= 1 ? bands : Math.floor(progress * (bands + 1)));
    if (attuned) this.drawGauge(Math.round((INTAKE.gaugeRings * reservoir.count) / RESERVOIR_CAP));
    for (const ms of this.pulses) this.drawPulse(ms / INTAKE.pulseMs);
  }

  private drawBands(lit: number): void {
    const b = INTAKE_LOOK.bands;
    for (const [i, y] of b.ys.entries()) {
      const on = i < lit;
      (on ? this.lights : this.shade).fillStyle(colorOf(on ? b.lit : b.dark), on ? b.litAlpha : b.darkAlpha).fillRect(AT.x - b.half, AT.y + y, b.half * 2, b.height);
    }
  }

  private drawGauge(lit: number): void {
    const g = INTAKE_LOOK.gauge;
    for (let i = 0; i < INTAKE.gaugeRings; i++) {
      const on = i < lit;
      const y = AT.y + g.bottom - i * g.step;
      (on ? this.lights : this.shade).fillStyle(colorOf(on ? g.lit : g.dark), on ? g.litAlpha : g.darkAlpha).fillRect(AT.x + g.x - g.half, y, g.half * 2, g.height);
    }
  }

  /** A ring of light `t` (0..1) of the way up the pipe, fading as it goes into the wall. */
  private drawPulse(t: number): void {
    const p = INTAKE_LOOK.pulse;
    const y = AT.y + p.from + (p.to - p.from) * t;
    this.lights.fillStyle(colorOf(p.color), 1 - t).fillRect(AT.x - p.half, y, p.half * 2, p.height);
  }
}
