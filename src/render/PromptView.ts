import type { GameObjects, Scene } from 'phaser';
import { DEPTHS } from '../data/assets';
import { TILE_SIZE } from '../data/config';
import { INTAKE } from '../data/foundry';
import { TUTORIAL_LAYOUT, TUTORIAL_SPRITES } from '../data/foundryAssets';
import { PROMPT_RANGE, type MarkerTarget, type PromptTarget } from '../data/objectives';
import { FOUNDRY_ROOM } from '../data/rooms';
import { fixtureInReach, pylonInReach } from '../sim/claims';
import { fixtureDef } from '../sim/fixtures';
import { usableInReach } from '../sim/foundryUse';
import { nodeInReach } from '../sim/harvest';
import { currentObjectiveDef } from '../sim/objectives';
import { roomById, type SimState } from '../sim/state';
import { stoneInReach } from '../sim/tutorial';
import { Pulse } from './pulse';
import { TextLine } from './textLine';
import { addVector } from './vector/textures';

/** A world point, px: where a prompt's target stands. */
type Point = { x: number; y: number };

/**
 * Where an arrow marker's tip goes: over the middle one of the intake's open entrances, just above the mouth tile's
 * bottom (027); or over the first of the supply ports standing, clear of its head (028): the plates hang between the
 * ports, so only above the first is there room without covering one. Null with none there.
 */
function markerPoint(sim: SimState, target: MarkerTarget): Point | null {
  const L = TUTORIAL_LAYOUT.marker;
  const middle = <T>(list: readonly T[]): T | undefined => list[Math.floor((list.length - 1) / 2)];
  if (target === 'intake') {
    const mouth = middle(INTAKE.entrances.filter((_, i) => sim.link.entrances[i]?.open));
    return mouth ? { x: (mouth.tx + 0.5) * TILE_SIZE, y: (mouth.ty + 1) * TILE_SIZE - L.lift } : null;
  }
  const port = sim.fixtures
    .map((f) => fixtureDef(f.id))
    .filter((d) => d.kind === 'port')
    .sort((a, b) => a.ty - b.ty)[0];
  return port ? { x: (port.tx + 0.5) * TILE_SIZE, y: (port.ty + 1) * TILE_SIZE - L.portLift } : null;
}

/** A key prompt as drawn, for the test hook: its key, the world point it floats over, and whether the key would work now. */
export interface PromptState extends Point {
  key: string;
  usable: boolean;
}

// A floating key prompt (012): the current objective's key ("E", "C" or "B") over
// the thing it uses, once the player is near it: dimmed while still out of reach,
// full strength once pressing the key would work. Craft prompts float over the
// player anywhere; the build prompt only in the foundry, where building works.
// The foundry's conduit step (027) has an arrow marker over the intake instead,
// bobbing over its open entrance anywhere in the foundry; the supply port goal
// (028) has one over the ports, bobbing over the first (northmost) one.
export class PromptView {
  private readonly bob: Pulse;
  private readonly cap: GameObjects.Image;
  private readonly key: TextLine;
  private readonly marker: GameObjects.Image;
  /** What shows, for the test hook. */
  shown: PromptState | null = null;
  markerAt: Point | null = null;

  constructor(scene: Scene) {
    this.bob = new Pulse(scene, 0, TUTORIAL_LAYOUT.marker.bob, TUTORIAL_LAYOUT.marker.bobMs);
    this.cap = addVector(scene, 0, 0, TUTORIAL_SPRITES.keyCap).setOrigin(0.5, 1).setDepth(DEPTHS.prompt);
    this.key = new TextLine(scene, 0, 0, DEPTHS.prompt + 1, true);
    this.marker = addVector(scene, 0, 0, TUTORIAL_SPRITES.marker).setDepth(DEPTHS.prompt).setVisible(false);
  }

  update(sim: SimState, shown: string): void {
    const def = currentObjectiveDef(sim);
    const inFoundry = shown === FOUNDRY_ROOM && sim.roomId === FOUNDRY_ROOM;
    this.showMarker(inFoundry && def?.marker ? markerPoint(sim, def.marker) : null);
    const prompt = def?.prompt;
    const target = prompt && shown === sim.roomId ? this.target(sim, prompt.over) : undefined;
    const near = target !== undefined && Math.hypot(target.at.x - sim.player.x, target.at.y - sim.player.y) <= PROMPT_RANGE;
    const buildHere = prompt?.key !== 'B' || sim.roomId === FOUNDRY_ROOM;
    const on = near && buildHere;
    this.cap.setVisible(on);
    this.key.setVisible(on);
    this.shown = on && prompt && target ? { key: prompt.key, x: target.at.x, y: target.at.y, usable: target.usable } : null;
    if (!on || !prompt || !target) return;
    const alpha = target.usable ? 1 : TUTORIAL_LAYOUT.promptDimAlpha;
    const x = Math.round(target.at.x);
    const bottom = Math.round(target.at.y - TILE_SIZE - TUTORIAL_LAYOUT.promptLift);
    this.cap.setPosition(x, bottom).setAlpha(alpha);
    this.key.set(prompt.key);
    this.key.setAlpha(alpha);
    // The letter centred on the cap's face.
    this.key.moveTo(Math.round(x - this.key.width / 2), bottom - this.cap.displayHeight + TUTORIAL_LAYOUT.keyText.y);
  }

  /** The arrow with its tip at `at`, bobbing; hidden for null. */
  private showMarker(at: Point | null): void {
    this.markerAt = at;
    this.marker.setVisible(this.markerAt !== null);
    if (!this.markerAt) return;
    this.marker.setPosition(this.markerAt.x, Math.round(this.markerAt.y - this.bob.value));
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
      case 'newestHopper': {
        // The hopper placed last (027: "put wood in the hopper" means the one just built).
        if (sim.roomId !== FOUNDRY_ROOM) return undefined;
        const hopper = sim.foundry.pieces.filter((x) => x.kind === 'hopper').sort((a, b) => b.id - a.id)[0];
        return hopper ? { at: centre(hopper), usable: usableInReach(sim)?.id === hopper.id } : undefined;
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
