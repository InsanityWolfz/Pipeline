import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { AMBIENT_FRAMES, DEPTHS } from '../../data/assets';
import { LEY_FLOW, RIPPLES } from '../../data/ambient';
import { colorOf } from '../color';
import { addVector, textureScale } from '../vector/textures';
import type { Bead } from './leyFlow';
import { glints, RippleModel, type Pool, type Ring } from './ripples';

// 077: ripples and ley beads drawn from pools of images made once (at most High's caps), shown, placed and faded each
// frame from the models; the rest hidden. Rings and glints lie on the water just over the ground and glows; beads run
// along the ley seams, additive.

export class WaterLeyView {
  private readonly rings: GameObjects.Image[] = [];
  private readonly glints: GameObjects.Image[] = [];
  private readonly beads: GameObjects.Image[] = [];

  constructor(scene: Scene) {
    const make = (frame: string, depth: number, additive: boolean) => {
      const o = addVector(scene, 0, 0, frame).setDepth(depth).setVisible(false);
      return additive ? o.setBlendMode(BlendModes.ADD) : o;
    };
    const over = RIPPLES.depthOverGlow;
    for (let i = 0; i < RIPPLES.max.high; i++) this.rings.push(make(AMBIENT_FRAMES.ripple, DEPTHS.glow + over.ring, false));
    for (let i = 0; i < RIPPLES.glints.pool; i++) this.glints.push(make(AMBIENT_FRAMES.glint, DEPTHS.glow + over.glint, true));
    for (let i = 0; i < LEY_FLOW.max.high; i++) this.beads.push(make(AMBIENT_FRAMES.bead, DEPTHS.glow + over.bead, true));
  }

  /** Draws this frame's rings, High's glints on the ponds in view (`glinting`), and the beads. */
  draw(rings: readonly Ring[], glinting: readonly Pool[], beads: readonly Bead[], timeMs: number): void {
    const s = textureScale();
    this.rings.forEach((o, i) => {
      const r = rings[i];
      o.setVisible(r !== undefined);
      if (!r) return;
      const look = RippleModel.look(r);
      o.setPosition(r.x, r.y)
        .setScale(look.across / RIPPLES.ringAcross / s)
        .setAlpha(look.alpha)
        .setTint(colorOf(r.spring ? RIPPLES.springColor : RIPPLES.color));
    });
    const gl = glinting.flatMap((p) => glints(p, timeMs));
    this.glints.forEach((o, i) => {
      const g = gl[i];
      o.setVisible(g !== undefined && g.alpha > RIPPLES.glints.minAlpha);
      if (g) o.setPosition(g.x, g.y).setAlpha(g.alpha).setTint(colorOf(RIPPLES.glints.color));
    });
    this.beads.forEach((o, i) => {
      const b = beads[i];
      o.setVisible(b !== undefined);
      if (b) o.setPosition(b.x, b.y).setRotation(b.angle).setAlpha(LEY_FLOW.alpha);
    });
  }

  /** Hides everything (Low, another room, world off). */
  hide(): void {
    for (const o of [...this.rings, ...this.glints, ...this.beads]) if (o.visible) o.setVisible(false);
  }
}
