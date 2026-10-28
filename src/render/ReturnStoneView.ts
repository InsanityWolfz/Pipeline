import type { GameObjects, Scene } from 'phaser';
import { TILE_SIZE } from '../data/config';
import { RETURN_STONE_LOOK } from '../data/foundryAssets';
import { RETURN_STONES, type ReturnStoneDef } from '../data/returnStones';
import type { SimEvents } from '../sim/events';
import { isWoken } from '../sim/returnStones';
import { roomById, type SimState } from '../sim/state';
import { registerAnim } from './anims';
import { addVectorSprite, textureScale } from './vector/textures';

/**
 * One return stone as drawn (072), for `ui().returnStones`: dormant or woken, its wake swell's scale (1 at rest), and its
 * sprite's size on the world, px (its frame's 32 × 48 at rest, whatever the texture's bake scale).
 */
export interface ReturnStoneShown {
  id: string;
  look: 'dormant' | 'woken';
  scale: number;
  w: number;
  h: number;
}

interface StoneParts {
  def: ReturnStoneDef;
  sprite: GameObjects.Sprite;
  /** Ms left of its wake swell, on the tween clock. */
  swellMs: number;
}

const LOOK = RETURN_STONE_LOOK;

// The boss arenas' return stones (072) in whichever room shows them (the overworld, and the sandbox's at the same
// tiles): dormant, dark stone in the waystone's ring; woken, the waystone's shimmer. As one wakes it swells and settles
// (the chime is FeelView's). Each frame only sets a frame, a scale and visibility.
export class ReturnStoneView {
  private readonly stones: StoneParts[];
  shown: ReturnStoneShown[] = [];

  constructor(scene: Scene) {
    registerAnim(scene, LOOK.woken);
    this.stones = RETURN_STONES.map((def) => {
      const bottom = (def.ty + 1) * TILE_SIZE;
      const sprite = addVectorSprite(scene, (def.tx + 0.5) * TILE_SIZE, bottom, LOOK.dormant).setDepth(bottom).setVisible(false);
      return { def, sprite, swellMs: 0 };
    });
  }

  /** `events` are the ticks' since the last draw; `shown` the room on screen; `deltaMs` the frame's time on the tween clock. */
  update(sim: SimState, events: SimEvents, shown: string, deltaMs: number): void {
    const here = roomById(shown).returnStones ?? [];
    this.shown = [];
    for (const s of this.stones) {
      if (events.returnWakes.some((w) => w.id === s.def.id)) s.swellMs = LOOK.wakeMs;
      s.swellMs = Math.max(0, s.swellMs - deltaMs);
      const visible = here.some((h) => h.id === s.def.id);
      s.sprite.setVisible(visible);
      if (!visible) continue;
      const woken = isWoken(sim, s.def.id);
      const playing = s.sprite.anims.isPlaying;
      if (woken && !playing) s.sprite.play(LOOK.woken.key);
      if (!woken && playing) s.sprite.stop();
      if (!woken && s.sprite.frame.name !== LOOK.dormant) s.sprite.setFrame(LOOK.dormant);
      // The swell: up and back down over wakeMs, a half sine.
      const scale = 1 + (LOOK.swell - 1) * Math.sin((Math.PI * s.swellMs) / LOOK.wakeMs);
      // On top of the bake scale's 1 / textureScale(), as showFrame sets it.
      s.sprite.setScale(scale / textureScale());
      this.shown.push({ id: s.def.id, look: woken ? 'woken' : 'dormant', scale, w: s.sprite.displayWidth, h: s.sprite.displayHeight });
    }
  }
}
