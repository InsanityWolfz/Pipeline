import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { DEPTHS } from '../../data/assets';
import { FOUNDRY_FX_FRAMES } from '../../data/foundryAssets';
import { LEY_PULSE } from '../../data/foundryFx';
import { addVector } from '../vector/textures';
import type { Inlay, LitInlay } from './leyPulse';

// 079: the ley flow pulses drawn: a lit rune (with its halo) over each inlay a pulse has lit, and a bead sliding from
// it toward the intake, additive, over the floor and under conduits. Both come from a pool made once on the first
// foundry show (the inlays × the most live pulses); a frame touches only what was lit last frame or is lit now.

export class LeyPulseView {
  private readonly runes: GameObjects.Image[] = [];
  private readonly beads: GameObjects.Image[] = [];
  private shown = new Set<number>();

  constructor(scene: Scene, inlays: readonly Inlay[]) {
    const n = inlays.length * LEY_PULSE.live.high;
    const make = (frame: string) => addVector(scene, 0, 0, frame).setBlendMode(BlendModes.ADD).setDepth(DEPTHS.leyPulse).setVisible(false);
    for (let i = 0; i < n; i++) {
      const t = inlays[i % inlays.length];
      this.runes.push(make(FOUNDRY_FX_FRAMES.rune).setPosition(t?.x ?? 0, t?.y ?? 0));
      this.beads.push(make(FOUNDRY_FX_FRAMES.bead));
    }
  }

  /** Shows what is lit now (`scale`: Flashes off dims them), hiding what was lit last frame and isn't now. */
  draw(lit: readonly LitInlay[], inlayCount: number, mouth: { x: number; y: number }, scale: number): void {
    const now = new Set<number>();
    for (const l of lit) {
      const i = l.pulse * inlayCount + l.index;
      const rune = this.runes[i];
      const bead = this.beads[i];
      if (!rune || !bead) continue;
      now.add(i);
      rune.setVisible(true).setAlpha(LEY_PULSE.alpha * scale * l.alpha);
      bead
        .setVisible(l.bead.alpha > 0)
        .setPosition(l.bead.x, l.bead.y)
        .setRotation(Math.atan2(mouth.y - l.bead.y, mouth.x - l.bead.x))
        .setAlpha(LEY_PULSE.alpha * scale * l.bead.alpha);
    }
    for (const i of this.shown) {
      if (now.has(i)) continue;
      this.runes[i]?.setVisible(false);
      this.beads[i]?.setVisible(false);
    }
    this.shown = now;
  }

  /** Runes lit now. */
  get litCount(): number {
    return this.shown.size;
  }
}
