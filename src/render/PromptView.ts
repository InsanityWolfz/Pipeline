import type { GameObjects, Scene } from 'phaser';
import { ATLAS_KEY, DEPTHS } from '../data/assets';
import { TILE_SIZE } from '../data/config';
import { TUTORIAL_LAYOUT, TUTORIAL_SPRITES } from '../data/foundryAssets';
import { OBJECTIVES, PROMPT_RANGE, type PromptTarget } from '../data/objectives';
import { FOUNDRY_ROOM } from '../data/rooms';
import { fixtureInReach, pylonInReach } from '../sim/claims';
import { fixtureDef } from '../sim/fixtures';
import { usableInReach } from '../sim/foundryUse';
import { nodeInReach } from '../sim/harvest';
import { currentObjective } from '../sim/objectives';
import { roomById, type SimState } from '../sim/state';
import { stoneInReach } from '../sim/tutorial';
import { GlyphLine } from './glyphLine';

/** A world point, px: where a prompt's target stands. */
type Point = { x: number; y: number };

// A floating key prompt (012): the current objective's key ("E", "C" or "B") over
// the thing it uses, once the player is near it: dimmed while still out of reach,
// full strength once pressing the key would work. Craft prompts float over the
// player anywhere; the build prompt only in the foundry, where building works.
export class PromptView {
  private readonly cap: GameObjects.Image;
  private readonly key: GlyphLine;

  constructor(scene: Scene) {
    this.cap = scene.add.image(0, 0, ATLAS_KEY, TUTORIAL_SPRITES.keyCap).setOrigin(0.5, 1).setDepth(DEPTHS.prompt);
    this.key = new GlyphLine(scene, 0, 0, DEPTHS.prompt + 1, true);
  }

  update(sim: SimState, shown: string): void {
    const i = currentObjective(sim);
    const prompt = i === null ? undefined : OBJECTIVES[i]?.prompt;
    const target = prompt && shown === sim.roomId ? this.target(sim, prompt.over) : undefined;
    const near = target !== undefined && Math.hypot(target.at.x - sim.player.x, target.at.y - sim.player.y) <= PROMPT_RANGE;
    const buildHere = prompt?.key !== 'B' || sim.roomId === FOUNDRY_ROOM;
    const on = near && buildHere;
    this.cap.setVisible(on);
    this.key.setVisible(on);
    if (!on || !prompt || !target) return;
    const alpha = target.usable ? 1 : TUTORIAL_LAYOUT.promptDimAlpha;
    const x = Math.round(target.at.x);
    const bottom = Math.round(target.at.y - TILE_SIZE - TUTORIAL_LAYOUT.promptLift);
    this.cap.setPosition(x, bottom).setAlpha(alpha);
    this.key.set(prompt.key);
    this.key.setAlpha(alpha);
    this.key.moveTo(x - this.cap.width / 2 + TUTORIAL_LAYOUT.keyText.x, bottom - this.cap.height + TUTORIAL_LAYOUT.keyText.y);
  }

  /** Where a prompt floats, and whether its key would work right now; undefined when nothing fits in this room. */
  private target(sim: SimState, over: PromptTarget): { at: Point; usable: boolean } | undefined {
    const room = roomById(sim.roomId);
    const centre = (t: { tx: number; ty: number }): Point => ({ x: (t.tx + 0.5) * TILE_SIZE, y: (t.ty + 0.5) * TILE_SIZE });
    const p = sim.player;
    const nearest = <T extends Point>(list: readonly T[]): T | undefined =>
      [...list].sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    switch (over) {
      case 'player':
        return { at: p, usable: true };
      case 'tubeStone':
        return room.tubeStone && !sim.hasTube ? { at: centre(room.tubeStone), usable: stoneInReach(sim) } : undefined;
      case 'pylon':
        return room.pylon ? { at: centre(room.pylon), usable: pylonInReach(sim) !== undefined } : undefined;
      case 'bench': {
        const bench = sim.fixtures.find((f) => fixtureDef(f.id).kind === 'bench');
        if (!bench || sim.roomId !== FOUNDRY_ROOM) return undefined;
        return { at: centre(fixtureDef(bench.id)), usable: fixtureInReach(sim, 'bench') !== undefined };
      }
      case 'hopper': {
        if (sim.roomId !== FOUNDRY_ROOM) return undefined;
        const hopper = nearest(sim.foundry.pieces.filter((x) => x.kind === 'hopper').map((h) => ({ ...centre(h), id: h.id })));
        return hopper ? { at: hopper, usable: usableInReach(sim)?.id === hopper.id } : undefined;
      }
      case 'node': {
        // Hidden while a harvest runs, so the prompt never sits on the harvest bar (018).
        if (sim.harvest) return undefined;
        const node = nearest(sim.nodes.filter((n) => n.roomId === sim.roomId && n.uses > 0));
        return node ? { at: node, usable: nodeInReach(sim)?.id === node.id } : undefined;
      }
    }
  }
}
