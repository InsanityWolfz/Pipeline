import type { GameObjects, Scene } from 'phaser';
import { ATLAS_KEY, DEPTHS } from '../data/assets';
import { TILE_SIZE } from '../data/config';
import { TUTORIAL_LAYOUT, TUTORIAL_SPRITES } from '../data/foundryAssets';
import { OBJECTIVES, PROMPT_RANGE, type PromptTarget } from '../data/objectives';
import { fixtureDef } from '../sim/fixtures';
import { currentObjective } from '../sim/objectives';
import { roomById, type SimState } from '../sim/state';
import { GlyphLine } from './glyphLine';

/** Fixed lift of the key over the top of what it floats above, px. */
const OVER = TILE_SIZE;

// A floating key prompt (012): the current objective's key ("E", "C" or "B") over
// the thing it uses, when that's near the player, or over the player for menus.
export class PromptView {
  private readonly cap: GameObjects.Image;
  private readonly key: GlyphLine;

  constructor(scene: Scene) {
    this.cap = scene.add.image(0, 0, ATLAS_KEY, TUTORIAL_SPRITES.keyCap).setOrigin(0.5, 1).setDepth(DEPTHS.worldUi + 5);
    this.key = new GlyphLine(scene, 0, 0, DEPTHS.worldUi + 6, true);
  }

  update(sim: SimState, shown: string): void {
    const i = currentObjective(sim);
    const prompt = i === null ? undefined : OBJECTIVES[i]?.prompt;
    const at = prompt && shown === sim.roomId ? this.target(sim, prompt.over) : undefined;
    const near = at !== undefined && Math.hypot(at.x - sim.player.x, at.y - sim.player.y) <= PROMPT_RANGE;
    this.cap.setVisible(near);
    this.key.setVisible(near);
    if (!near || !prompt) return;
    const x = Math.round(at.x);
    const bottom = Math.round(at.y - OVER - TUTORIAL_LAYOUT.promptLift);
    this.cap.setPosition(x, bottom);
    this.key.set(prompt.key);
    this.key.moveTo(x - this.cap.width / 2 + TUTORIAL_LAYOUT.keyText.x, bottom - this.cap.height + TUTORIAL_LAYOUT.keyText.y);
  }

  /** Where a prompt floats, world px (a ground point), or undefined when nothing fits in this room. */
  private target(sim: SimState, over: PromptTarget): { x: number; y: number } | undefined {
    const room = roomById(sim.roomId);
    const centre = (t: { tx: number; ty: number }) => ({ x: (t.tx + 0.5) * TILE_SIZE, y: (t.ty + 0.5) * TILE_SIZE });
    if (over === 'player') return { x: sim.player.x, y: sim.player.y };
    if (over === 'tubeStone') return room.tubeStone && !sim.hasTube ? centre(room.tubeStone) : undefined;
    if (over === 'pylon') return room.pylon ? centre(room.pylon) : undefined;
    if (over === 'bench') {
      const bench = sim.fixtures.find((f) => fixtureDef(f.id).kind === 'bench');
      return bench && sim.roomId === 'foundry' ? centre(fixtureDef(bench.id)) : undefined;
    }
    const nodes = sim.nodes.filter((n) => n.roomId === sim.roomId && n.uses > 0);
    const p = sim.player;
    return nodes.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
  }
}
