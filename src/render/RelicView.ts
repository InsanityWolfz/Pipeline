import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { TILE_SIZE } from '../data/config';
import { GEAR_SPRITES, RELIC_LOOK } from '../data/gearAssets';
import { FEET_BOX } from '../data/player';
import { FOUNDRY_ROOM } from '../data/rooms';
import type { SimEvents } from '../sim/events';
import { fixtureDef } from '../sim/fixtures';
import { wardReady } from '../sim/relics';
import type { SimState } from '../sim/state';
import { addVector } from './vector/textures';

/** The relics' effects as drawn, for `ui().relics`: the ward shimmer's alpha (0 when hidden), and the bursts still live. */
export interface RelicsShown {
  shimmer: number;
  /** 050: where the ring sits (world px) and whether the shield shows on it, while the ward is ready. */
  ring: { x: number; y: number } | null;
  shield: boolean;
  wardBreaks: number;
  emberFlashes: number;
  benchFlares: number;
}

export const NO_RELICS_SHOWN: RelicsShown = { shimmer: 0, ring: null, shield: false, wardBreaks: 0, emberFlashes: 0, benchFlares: 0 };

/** A burst playing out: its image, which kind, its age and how it grows. */
interface Burst {
  image: GameObjects.Image;
  kind: 'ward' | 'ember' | 'flare';
  ms: number;
  total: number;
  from: number;
  to: number;
  /** Px it rises over its life. */
  rise: number;
  y: number;
}

// The relics' signs (036): the Wardstone's faint violet shimmer at the player's feet
// while its ward is ready, with a small shield on it (050), the ring bursting outward when it blocks a hit, Last Ember's
// flash when it saves the player, and a violet flare over the bench when a relic is
// identified. Time on the tween clock, so the test hook can hold them for a screenshot.
// FeelView plays their sounds.
export class RelicView {
  private readonly scene: Scene;
  private readonly shimmer: GameObjects.Image;
  private readonly shield: GameObjects.Image;
  private bursts: Burst[] = [];
  private time = 0;

  constructor(scene: Scene) {
    this.scene = scene;
    this.shimmer = addVector(scene, 0, 0, GEAR_SPRITES.wardShimmer).setBlendMode(BlendModes.ADD).setVisible(false);
    this.shield = addVector(scene, 0, 0, GEAR_SPRITES.wardShield).setVisible(false);
  }

  get shown(): RelicsShown {
    const live = (kind: Burst['kind']) => this.bursts.filter((b) => b.kind === kind).length;
    const ring = this.shimmer.visible ? { x: this.shimmer.x, y: this.shimmer.y } : null;
    return { shimmer: this.shimmer.visible ? this.shimmer.alpha : 0, ring, shield: this.shield.visible, wardBreaks: live('ward'), emberFlashes: live('ember'), benchFlares: live('flare') };
  }

  private burst(kind: Burst['kind'], frame: string, x: number, y: number, depth: number, look: { ms: number; from: number; to: number }, rise = 0): void {
    const image = addVector(this.scene, x, y, frame).setBlendMode(BlendModes.ADD).setDepth(depth).setScale(look.from);
    this.bursts.push({ image, kind, ms: 0, total: look.ms, from: look.from, to: look.to, rise, y });
  }

  /** `events` are the ticks' since the last draw; `deltaMs` is tween time. */
  update(sim: SimState, events: SimEvents, shown: string, deltaMs: number): void {
    this.time += deltaMs;
    const p = sim.player;
    const here = shown === sim.roomId;
    const feet = p.y + FEET_BOX.h / 2;
    const S = RELIC_LOOK.shimmer;
    const ready = here && p.dying === 0 && wardReady(sim);
    const breathe = (Math.sin((this.time / S.breatheMs) * Math.PI * 2) + 1) / 2;
    // 050 (A.16): on the player's own point, unrounded as the sprite is, so the two never drift a pixel apart as they
    // walk (the ring shook); the shield stands on its front edge.
    this.shimmer
      .setVisible(ready)
      .setPosition(p.x, p.y - S.lift)
      .setDepth(feet - S.depthBelow)
      .setAlpha(S.alpha[0] + (S.alpha[1] - S.alpha[0]) * breathe);
    this.shield
      .setVisible(ready)
      .setPosition(p.x, p.y - S.lift + RELIC_LOOK.shield.drop)
      .setDepth(feet + RELIC_LOOK.shield.depthAbove);
    if (here) {
      for (const w of events.wardBlocks) this.burst('ward', GEAR_SPRITES.wardShimmer, w.x, w.y - S.lift, feet + RELIC_LOOK.wardBreak.depthAbove, RELIC_LOOK.wardBreak);
      const E = RELIC_LOOK.ember;
      for (const e of events.emberSaves) this.burst('ember', GEAR_SPRITES.emberFlash, e.x, e.y - E.lift, feet + E.depthAbove, E);
    }
    if (shown === FOUNDRY_ROOM && events.identifies.some((piece) => piece.relic !== null)) {
      const bench = fixtureDef('identification-bench');
      const x = (bench.tx + 0.5) * TILE_SIZE;
      const y = bench.ty * TILE_SIZE;
      this.burst('flare', GEAR_SPRITES.relicFlare, x, y, (bench.ty + 1) * TILE_SIZE + RELIC_LOOK.flare.depthAbove, RELIC_LOOK.flare, RELIC_LOOK.flare.rise);
    }
    for (const b of this.bursts) {
      b.ms += deltaMs;
      const t = Math.min(1, b.ms / b.total);
      b.image.setScale(b.from + (b.to - b.from) * t).setAlpha(1 - t * t).setY(b.y - b.rise * t);
    }
    this.bursts = this.bursts.filter((b) => {
      if (b.ms < b.total) return true;
      b.image.destroy();
      return false;
    });
  }
}
