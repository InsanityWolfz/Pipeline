import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import type { ForgewrightDef } from '../data/enemies';
import { FORGE_LOOK, FORGE_SPRITES } from '../data/forgewrightAssets';
import type { EnemyState } from '../sim/enemies';
import { bellowsBox, bellowsPoint, forgeDefOf } from '../sim/forgewrightParts';
import type { SimState } from '../sim/state';
import { colorOf } from './color';
import { addVector, showFrame } from './vector/textures';

/** The Forgewright's extras as drawn (060), for `ui().emberworks.forge`: each bellows' look, the pools on show, and whether its core glows. */
export interface ForgeShown {
  bellows: ('whole' | 'broken' | 'patching')[];
  pools: number;
  core: boolean;
}

export const NO_FORGE_SHOWN: ForgeShown = { bellows: [], pools: 0, core: false };

const L = FORGE_LOOK;

/** One Forgewright's pieces: its two bellows, the hoses and small bars, and its core's glow. */
interface Rig {
  bellows: GameObjects.Image[];
  /** Its hoses, just behind its body; its bellows' bars, over the world. */
  hoses: GameObjects.Graphics;
  lines: GameObjects.Graphics;
  core: GameObjects.Graphics;
}

/** A bellows' look: broken, patching over its last ticks, else whole. */
const lookOf = (patch: number): ForgeShown['bellows'][number] => (patch <= 0 ? 'whole' : patch <= L.bellows.patchingTicks ? 'patching' : 'broken');

// The Forgewright's pieces beyond its rig (060): its two bellows standing off its sides, square to its facing (whole,
// broken and slack, or stitched with glowing brass as they patch), joined to it by brass hoses, each with a small health
// bar once hurt (brass, filling back, while broken); its core glowing through the open plating while it vents; and the
// Forge Flood's pools, a flickering molten sheet over the flooded half with tongues of flame along its edge.
export class ForgewrightView {
  private readonly scene: Scene;
  private readonly rigs = new Map<number, Rig>();
  private readonly pools: GameObjects.Graphics;
  private shownState: ForgeShown = NO_FORGE_SHOWN;

  constructor(scene: Scene) {
    this.scene = scene;
    this.pools = scene.add.graphics().setDepth(DEPTHS.groundFx);
  }

  get shown(): ForgeShown {
    return this.shownState;
  }

  update(sim: SimState, shown: string, now: number): void {
    const live = new Set<number>();
    let shownState: ForgeShown = { ...NO_FORGE_SHOWN, pools: this.drawPools(sim, shown, now) };
    for (const e of sim.enemies) {
      const def = forgeDefOf(e);
      if (!def || e.roomId !== shown) continue;
      live.add(e.id);
      const rig = this.rigs.get(e.id) ?? this.make(e.id);
      shownState = { ...shownState, ...this.draw(rig, e, def, now) };
    }
    for (const [id, rig] of this.rigs) {
      if (live.has(id)) continue;
      rig.bellows.forEach((b) => b.destroy());
      rig.lines.destroy();
      rig.hoses.destroy();
      rig.core.destroy();
      this.rigs.delete(id);
    }
    this.shownState = shownState;
  }

  private make(id: number): Rig {
    const rig: Rig = {
      bellows: [0, 1].map(() => addVector(this.scene, 0, 0, FORGE_SPRITES.bellows.whole)),
      hoses: this.scene.add.graphics(),
      lines: this.scene.add.graphics(),
      core: this.scene.add.graphics().setBlendMode(BlendModes.ADD),
    };
    this.rigs.set(id, rig);
    return rig;
  }

  /** Its bellows, hoses, bars and core for the frame. */
  private draw(rig: Rig, e: EnemyState, def: ForgewrightDef, now: number): Pick<ForgeShown, 'bellows' | 'core'> {
    const g = rig.lines.clear();
    const hoses = rig.hoses.clear();
    const bottom = e.y + def.feetBox.h / 2;
    g.setDepth(DEPTHS.worldUi - 1);
    hoses.setDepth(bottom - 1);
    const looks = e.bellows.map((b, i) => {
      const at = bellowsPoint(e, def, i);
      const look = lookOf(b.patch);
      const sprite = rig.bellows[i];
      if (sprite) {
        const frame = FORGE_SPRITES.bellows[look];
        if (sprite.frame.name !== frame) showFrame(sprite, frame);
        // Sorted by its ground point (behind the body on its far side); the left one flipped to face out.
        sprite.setPosition(at.x, at.y).setDepth(at.y).setFlipX(i === 0).setAlpha(e.health > 0 ? 1 : 0);
      }
      this.drawHose(hoses, e.x, bottom, at);
      this.drawBar(g, e, def, i, b.health, b.patch);
      return look;
    });
    // The core glows through its open plating while it vents.
    const c = rig.core.clear();
    const venting = e.vent > 0;
    if (venting) {
      const C = L.core;
      const pulse = (Math.sin((now / C.pulseMs) * Math.PI * 2) + 1) / 2;
      c.setDepth(bottom + DEPTHS.overlayNudge * 2);
      c.fillStyle(colorOf(C.color), C.alpha[0] + (C.alpha[1] - C.alpha[0]) * pulse).fillCircle(e.x, bottom + C.at, C.radius * (1 + C.swell * pulse));
    }
    return { bellows: looks, core: venting };
  }

  /** A brass hose from its side out to a bellows, lifted off the ground. */
  private drawHose(g: GameObjects.Graphics, x: number, bottom: number, to: { x: number; y: number }): void {
    const H = L.hose;
    const y0 = bottom - H.rise * 1.6;
    const y1 = to.y - H.rise;
    g.lineStyle(H.width, colorOf(H.color)).lineBetween(x, y0, to.x, y1);
    g.lineStyle(1, colorOf(H.light), 0.8).lineBetween(x, y0 - 1, to.x, y1 - 1);
  }

  /** A bellows' small bar over its box once it's hurt: its health in ember, or while broken its patch filling back in brass. */
  private drawBar(g: GameObjects.Graphics, e: EnemyState, def: ForgewrightDef, part: number, health: number, patch: number): void {
    const B = L.bellows.bar;
    if (patch <= 0 && health >= def.bellows.health) return;
    const box = bellowsBox(e, def, part);
    const x = Math.round(box.x - B.w / 2);
    const y = Math.round(box.y - box.h / 2 - B.gap - B.h);
    g.fillStyle(colorOf(B.back)).fillRect(x - B.border, y - B.border, B.w + B.border * 2, B.h + B.border * 2);
    const k = patch > 0 ? 1 - patch / def.bellows.patchTicks : health / def.bellows.health;
    g.fillStyle(colorOf(patch > 0 ? B.patch : B.color)).fillRect(x, y, Math.max(1, Math.round(B.w * k)), B.h);
  }

  /** The Forge Flood's pools in the room on screen. Returns how many it drew. */
  private drawPools(sim: SimState, shown: string, now: number): number {
    const g = this.pools.clear();
    const P = L.pools;
    const pools = sim.floodPools.filter((p) => p.roomId === shown);
    const flicker = (Math.sin((now / P.flickerMs) * Math.PI * 2) + 1) / 2;
    for (const p of pools) {
      const w = p.x1 - p.x0;
      const h = p.y1 - p.y0;
      g.fillStyle(colorOf(P.color), P.alpha[0] + (P.alpha[1] - P.alpha[0]) * flicker).fillRect(p.x0, p.y0, w, h);
      g.lineStyle(P.edgeWidth, colorOf(P.bright), 0.9).strokeRect(p.x0, p.y0, w, h);
      // Tongues of flame along its edges, flickering out of step.
      g.fillStyle(colorOf(P.light), 0.7);
      for (let x = p.x0 + P.tongueEvery / 2; x < p.x1; x += P.tongueEvery) {
        const k = (Math.sin(now / P.flickerMs + x) + 1) / 2;
        g.fillTriangle(x - P.tongue / 2, p.y0, x + P.tongue / 2, p.y0, x, p.y0 - P.tongue * (1 + k));
        g.fillTriangle(x - P.tongue / 2, p.y1, x + P.tongue / 2, p.y1, x, p.y1 - P.tongue * (1 + k));
      }
    }
    return pools.length;
  }
}
