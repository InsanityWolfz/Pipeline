import type { GameObjects, Scene } from 'phaser';
import { arenaDoorFrames } from '../data/arenaAssets';
import { TILE_SIZE } from '../data/config';
import { HOLLOWS_LOOK } from '../data/hollowsAssets';
import { ARENAS, arenaLocked, doorUnlocked, type Arena } from '../sim/arenaLock';
import type { SimState } from '../sim/state';
import { drawCurtain } from './leyCurtain';
import { addVector, showFrame } from './vector/textures';

/** One arena's door as drawn (055), for `ui().arenaDoors`. */
export interface ArenaDoorShown {
  id: string;
  /** Its frame: sealed until its gate opens, then open (E goes in). */
  door: 'sealed' | 'open';
  /** 043's seal over it: shut while the boss fights, fading as it drops, or down; and its alpha. */
  seal: 'shut' | 'fading' | 'down';
  sealAlpha: number;
}

const T = TILE_SIZE;
const B = HOLLOWS_LOOK.barrier;

interface DoorParts {
  arena: Arena;
  image: GameObjects.Image;
  seal: GameObjects.Graphics;
  /** The door's span, px, and its row. */
  x0: number;
  x1: number;
  ty: number;
  sealState: ArenaDoorShown['seal'];
  fadeMs: number;
}

// The boss arenas' doors (055): each door's sprite over its tiles in whichever room shows it (the overworld, and the
// sandbox's forum), sealed or open; and over it while the boss fights, 043's seal, the Hollows barrier's curtain lying
// across the door, fading as it drops.
export class ArenaDoorView {
  private readonly doors: DoorParts[];
  private time = 0;
  shown: ArenaDoorShown[] = [];

  constructor(scene: Scene) {
    this.doors = ARENAS.map((arena) => {
      const tiles = arena.door.tiles;
      const x0 = Math.min(...tiles.map((t) => t.tx)) * T;
      const x1 = (Math.max(...tiles.map((t) => t.tx)) + 1) * T;
      const ty = tiles[0]?.ty ?? 0;
      const bottom = (ty + 1) * T;
      const image = addVector(scene, (x0 + x1) / 2, bottom, arenaDoorFrames(tiles.length).sealed).setDepth(bottom).setVisible(false);
      const seal = scene.add.graphics().setVisible(false);
      return { arena, image, seal, x0, x1, ty, sealState: 'down', fadeMs: 0 };
    });
  }

  /** `shown` is the room on screen; `deltaMs` the frame's time on the tween clock. */
  update(sim: SimState, shown: string, deltaMs: number): void {
    this.time += deltaMs;
    this.shown = [];
    for (const d of this.doors) {
      const here = d.arena.rooms.includes(shown);
      const open = doorUnlocked(sim, d.arena, shown);
      const frames = arenaDoorFrames(d.arena.door.tiles.length);
      d.image.setVisible(here);
      if (here) showFrame(d.image, open ? frames.open : frames.sealed);
      const sealAlpha = this.drawSeal(d, here, here && arenaLocked(sim, d.arena, shown), deltaMs);
      if (here) this.shown.push({ id: d.arena.id, door: open ? 'open' : 'sealed', seal: d.sealState, sealAlpha });
    }
  }

  /** 043's seal: the barrier's curtain across the door while `sealed`; as it drops it fades as the barrier collapses. Returns its alpha. */
  private drawSeal(d: DoorParts, here: boolean, sealed: boolean, deltaMs: number): number {
    const g = d.seal;
    g.clear();
    if (sealed) d.sealState = 'shut';
    else if (d.sealState === 'shut') {
      d.sealState = 'fading';
      d.fadeMs = 0;
    }
    if (d.sealState === 'fading') {
      d.fadeMs += deltaMs;
      if (d.fadeMs >= B.collapseMs) d.sealState = 'down';
    }
    if (!here || d.sealState === 'down') {
      g.setVisible(false);
      return 0;
    }
    // It stands on the door row's middle, its curtain's footprint as deep as the barrier's is wide, in front of the door.
    const half = (T * B.width) / 2;
    const bottom = (d.ty + 0.5) * T + half;
    const k = d.sealState === 'fading' ? d.fadeMs / B.collapseMs : 0;
    const alpha = d.sealState === 'fading' ? Math.max(0, 1 - k) : 1;
    g.setVisible(true).setDepth(Math.max(bottom, (d.ty + 1) * T) + 1);
    drawCurtain(g, { x0: d.x0, x1: d.x1, top: bottom - 2 * half - B.height, bottom }, this.time, k, alpha);
    return alpha;
  }
}
