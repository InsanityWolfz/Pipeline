import type { GameObjects, Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { MINE_LOOK, MINE_SPRITES } from '../data/mineAssets';
import type { BurstEvent, SimEvents } from '../sim/events';
import type { SimState } from '../sim/state';
import { colorOf } from './color';
import { burstTint, roundTint } from './roundLook';
import { addVector } from './vector/textures';

/** 038's live art as drawn, for `ui().mines`: each armed mine's arm time (0..1) and whether it's in its last second, bomblets in the air, and flashes still showing. */
export interface MinesShown {
  armed: { id: number; progress: number; late: boolean }[];
  bomblets: number;
  mineFlashes: number;
  bombletFlashes: number;
}

export const NO_MINES_SHOWN: MinesShown = { armed: [], bomblets: 0, mineFlashes: 0, bombletFlashes: 0 };

interface Flash {
  image: GameObjects.Image;
  kind: 'mine' | 'bomblet';
  ms: number;
  look: { ms: number; from: number; to: number };
  /** Made this frame: its clock starts next frame, so a long frame (the hook's stepping) can't run it out unseen. */
  fresh: boolean;
}

// Landmines and bomblets (038): each armed mine lying flat where it landed with its arm
// ring filling clockwise from the top (red in its last second, its pip blinking faster);
// a cluster bomb's bomblets arcing out from its burst over their delay; and the flashes
// where a mine and a bomblet burst, scaled to their radius. Time on the tween clock, so the
// test hook can hold a flash for a screenshot.
export class MineView {
  private readonly scene: Scene;
  private readonly rings: GameObjects.Graphics;
  private readonly armed = new Map<number, GameObjects.Image>();
  private readonly bomblets = new Map<number, { pellet: GameObjects.Image; shadow: GameObjects.Image }>();
  private flashes: Flash[] = [];
  private shownArmed: MinesShown['armed'] = [];
  private time = 0;

  constructor(scene: Scene) {
    this.scene = scene;
    this.rings = scene.add.graphics().setDepth(DEPTHS.groundFx + MINE_LOOK.depth.ring);
  }

  get shown(): MinesShown {
    const live = (kind: Flash['kind']) => this.flashes.filter((f) => f.kind === kind).length;
    return { armed: this.shownArmed, bomblets: this.bomblets.size, mineFlashes: live('mine'), bombletFlashes: live('bomblet') };
  }

  /** `events` are the ticks' since the last draw; `deltaMs` is tween time. */
  update(sim: SimState, events: SimEvents, shown: string, deltaMs: number): void {
    this.time += deltaMs;
    const here = shown === sim.roomId;
    if (here) {
      for (const m of events.mineBursts) this.flash('mine', MINE_SPRITES.mineFlash, m, MINE_LOOK.mineFlash);
      for (const b of events.bombletBursts) this.flash('bomblet', MINE_SPRITES.bombletFlash, b, MINE_LOOK.bombletFlash);
    }
    this.stepFlashes(deltaMs);
    this.drawArmed(sim, here);
    this.drawBomblets(sim, here);
  }

  private flash(kind: Flash['kind'], frame: string, { x, y, radius, damageType }: BurstEvent, look: { ms: number; from: number; to: number }): void {
    const k = radius / MINE_LOOK.flashRadius;
    const image = addVector(this.scene, x, y, frame).setDepth(y + radius);
    // 039.15: a Cold Burst flashes frost.
    const tint = burstTint(damageType);
    if (tint !== null) image.setTint(tint);
    image.setData('base', image.scaleX).setScale(image.scaleX * look.from * k);
    this.flashes.push({ image, kind, ms: 0, look: { ms: look.ms, from: look.from * k, to: look.to * k }, fresh: true });
  }

  private stepFlashes(deltaMs: number): void {
    for (const f of this.flashes) {
      if (!f.fresh) f.ms += deltaMs;
      f.fresh = false;
      const t = Math.min(1, f.ms / f.look.ms);
      const base = Number(f.image.getData('base')) || 1;
      f.image.setScale(base * (f.look.from + (f.look.to - f.look.from) * t)).setAlpha(1 - t * t);
    }
    this.flashes = this.flashes.filter((f) => {
      if (f.ms < f.look.ms) return true;
      f.image.destroy();
      return false;
    });
  }

  /** An armed mine's image, in its round's tint (039.15: a Frost landmine is pale ice). */
  private armedImage(x: number, y: number, ammoId: string): GameObjects.Image {
    const image = addVector(this.scene, x, y, MINE_SPRITES.armed).setDepth(DEPTHS.groundFx + MINE_LOOK.depth.mine);
    const tint = roundTint(ammoId);
    return tint === null ? image : image.setTint(tint);
  }

  /** Each armed mine in the room on screen, flat on the ground, with its arm ring and blinking pip. */
  private drawArmed(sim: SimState, here: boolean): void {
    const F = MINE_LOOK.armRing;
    const g = this.rings.clear();
    const live = new Set<number>();
    this.shownArmed = [];
    for (const m of here ? sim.mines.armed.filter((x) => x.roomId === sim.roomId) : []) {
      live.add(m.id);
      const image = this.armed.get(m.id) ?? this.armedImage(m.x, m.y, m.ammoId);
      this.armed.set(m.id, image.setPosition(m.x, m.y));
      const progress = Math.min(1, m.elapsed / m.armTicks);
      const late = m.armTicks - m.elapsed <= F.lateTicks;
      this.shownArmed.push({ id: m.id, progress, late });
      const color = colorOf(late ? F.lateColor : F.color);
      g.lineStyle(F.width, color, F.track).strokeCircle(m.x, m.y, F.radius);
      g.lineStyle(F.width, color, F.alpha).beginPath();
      g.arc(m.x, m.y, F.radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2, false).strokePath();
      // The pip flashes the ring's colour for half of each blink, faster in its last second.
      const P = MINE_LOOK.pip;
      const blink = late ? P.lateBlinkMs : P.blinkMs;
      if (this.time % blink < blink / 2) g.fillStyle(color, 1).fillCircle(m.x, m.y, P.radius);
    }
    for (const [id, image] of this.armed) {
      if (live.has(id)) continue;
      image.destroy();
      this.armed.delete(id);
    }
  }

  /** Each bomblet arcing from its cluster bomb's burst to where it lands, over its delay, its shadow on the ground. */
  private drawBomblets(sim: SimState, here: boolean): void {
    const live = new Set<number>();
    for (const b of here ? sim.mines.bomblets.filter((x) => x.roomId === sim.roomId) : []) {
      live.add(b.id);
      let d = this.bomblets.get(b.id);
      if (!d) {
        d = { pellet: addVector(this.scene, b.fromX, b.fromY, MINE_SPRITES.bomblet), shadow: addVector(this.scene, b.fromX, b.fromY, MINE_SPRITES.bombletShadow).setDepth(DEPTHS.shadow) };
        this.bomblets.set(b.id, d);
      }
      const t = 1 - b.ticks / b.delay;
      const x = b.fromX + (b.x - b.fromX) * t;
      const y = b.fromY + (b.y - b.fromY) * t;
      d.shadow.setPosition(x, y);
      d.pellet.setPosition(x, y - 4 * MINE_LOOK.bombletArc * t * (1 - t)).setDepth(y);
    }
    for (const [id, d] of this.bomblets) {
      if (live.has(id)) continue;
      d.pellet.destroy();
      d.shadow.destroy();
      this.bomblets.delete(id);
    }
  }
}
