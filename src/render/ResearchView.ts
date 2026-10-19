import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { CAP_SEAT_Y, INTAKE_INLETS } from '../data/art/intake';
import { TILE_SIZE } from '../data/config';
import { FOUNDRY_LAYOUT } from '../data/foundryAssets';
import { RESEARCH_NODES, researchNode, type ResearchNode } from '../data/research';
import { RESEARCH_LOOK, RESEARCH_SPRITES } from '../data/researchAssets';
import { FOUNDRY_ROOM } from '../data/rooms';
import type { SimEvents } from '../sim/events';
import { diagrams, isRestored, type Diagram } from '../sim/research';
import type { SimState } from '../sim/state';
import { colorOf } from './color';
import { intakeAnchor } from './foundryLayout';
import { addVector, showFrame } from './vector/textures';

/** What the research view shows, for the test hook. */
export interface ResearchShown {
  /** Each diagram drawn: its node, the capped entrance it's on (or null), its alpha now, and whether it's dimmed. */
  diagrams: { node: string; entrance: number | null; alpha: number; dimmed: boolean }[];
  /** The nodes drawn restored: wall panels in brass, the pipe's collars. */
  restored: string[];
  /** Restore and reveal effects still running. */
  effects: number;
  /** The sealed wing's door drawn. */
  wingDoor: boolean;
}

export const NO_RESEARCH_SHOWN: ResearchShown = { diagrams: [], restored: [], effects: 0, wingDoor: false };

const AT = intakeAnchor();
/** Over the intake's caps (IntakeView draws them at its depth + 4 nudges). */
const INTAKE_DEPTH = AT.y + 6 * FOUNDRY_LAYOUT.onTopNudge;
/** A wall piece sits on its wall's face: a little over the wall, like a wall prop (014). */
const WALL_NUDGE = 0.6;

type WallEffect = 'machineSpeed' | 'splitter' | 'merger';
const wallKey = (node: ResearchNode): WallEffect => (node.effect.kind === 'machineSpeed' ? 'machineSpeed' : node.effect.kind === 'unlockPiece' && node.effect.piece === 'merger' ? 'merger' : 'splitter');

/** Where a diagram is drawn, world px, its frame and depth. */
function placeOf(d: Pick<Diagram, 'node' | 'entrance'>): { x: number; y: number; frame: string; depth: number } {
  const node = researchNode(d.node);
  const a = node.anchor;
  if (a.kind === 'entrance') return { x: AT.x + (INTAKE_INLETS[d.entrance ?? 0] ?? 0), y: AT.y + CAP_SEAT_Y, frame: RESEARCH_SPRITES.diagramCap, depth: INTAKE_DEPTH };
  if (a.kind === 'pipe') return { x: AT.x, y: AT.y, frame: RESEARCH_SPRITES.diagramPipe, depth: INTAKE_DEPTH };
  if (a.kind === 'wing') return { x: (a.tx + a.w / 2) * TILE_SIZE, y: (a.ty + 1) * TILE_SIZE, frame: RESEARCH_SPRITES.wingDoor, depth: (a.ty + 1) * TILE_SIZE + WALL_NUDGE };
  return { x: (a.tx + 0.5) * TILE_SIZE, y: (a.ty + 1) * TILE_SIZE, frame: RESEARCH_SPRITES.diagramWall[wallKey(node)], depth: (a.ty + 1) * TILE_SIZE + WALL_NUDGE + 0.1 };
}

const keyOf = (d: Pick<Diagram, 'node' | 'entrance'>): string => `${d.node}:${d.entrance ?? ''}`;

// The foundry's lost parts as faint diagrams (033): cyan linework breathing over each
// capped entrance's cap, round the intake pipe and in each wall panel, dimmed while what
// it requires isn't restored; the sealed wing's door in the north wall's notch. A
// restore fills the linework solid cyan, then the part solidifies (a wall panel in brass,
// the pipe's brass collars; a cap lifts, IntakeView's); a banked schematic's new diagram
// shimmers in. Its time runs on the tween clock, so the test hook can hold an effect.
export class ResearchView {
  private readonly scene: Scene;
  private readonly drawn = new Map<string, GameObjects.Image>();
  private readonly panels = new Map<string, GameObjects.Image>();
  private readonly collar: GameObjects.Image;
  private readonly wing: GameObjects.Image | null;
  private effects: GameObjects.Image[] = [];
  private shownDiagrams: ResearchShown['diagrams'] = [];
  private restoredShown: string[] = [];
  private time = 0;

  constructor(scene: Scene) {
    this.scene = scene;
    for (const n of RESEARCH_NODES) {
      if (n.anchor.kind !== 'wall') continue;
      const at = placeOf({ node: n.id, entrance: null });
      this.panels.set(n.id, addVector(scene, at.x, at.y, RESEARCH_SPRITES.panel).setDepth(at.depth - 0.05).setVisible(false));
    }
    this.collar = addVector(scene, AT.x, AT.y, RESEARCH_SPRITES.restoredPipe[0]).setDepth(INTAKE_DEPTH - FOUNDRY_LAYOUT.onTopNudge).setVisible(false);
    const wing = RESEARCH_NODES.find((n) => n.anchor.kind === 'wing');
    const at = wing ? placeOf({ node: wing.id, entrance: null }) : null;
    this.wing = at ? addVector(scene, at.x, at.y, at.frame).setDepth(at.depth).setVisible(false) : null;
  }

  get shown(): ResearchShown {
    return {
      diagrams: this.shownDiagrams,
      restored: this.restoredShown,
      effects: this.effects.length,
      wingDoor: this.wing?.visible ?? false,
    };
  }

  /** `events` are the ticks' since the last draw; `deltaMs` is the frame's time on the tween clock. */
  update(sim: SimState, events: SimEvents, shown: string, deltaMs: number): void {
    const here = shown === FOUNDRY_ROOM;
    this.time += deltaMs;
    const L = RESEARCH_LOOK.diagram;
    const breathe = (Math.sin((this.time / L.pulseMs) * Math.PI * 2) + 1) / 2;
    const live = new Set<string>();
    const list = here ? diagrams(sim).filter((d) => researchNode(d.node).anchor.kind !== 'wing') : [];
    this.shownDiagrams = [];
    for (const d of list) {
      const key = keyOf(d);
      live.add(key);
      const at = placeOf(d);
      const image = this.drawn.get(key) ?? addVector(this.scene, at.x, at.y, at.frame).setDepth(at.depth);
      this.drawn.set(key, image);
      const alpha = (L.alpha[0] + (L.alpha[1] - L.alpha[0]) * breathe) * (d.dimmed ? L.dimmed : 1);
      image.setVisible(true).setAlpha(alpha);
      this.shownDiagrams.push({ node: d.node, entrance: d.entrance, alpha, dimmed: d.dimmed });
    }
    for (const [key, image] of this.drawn) if (!live.has(key)) image.setVisible(false);
    for (const [id, panel] of this.panels) {
      const node = researchNode(id);
      showFrame(panel, isRestored(sim, id) ? RESEARCH_SPRITES.restoredWall[wallKey(node)] : RESEARCH_SPRITES.panel);
      panel.setVisible(here);
    }
    const tier = Math.max(0, ...RESEARCH_NODES.map((n) => (n.effect.kind === 'reservoir' && isRestored(sim, n.id) ? n.effect.tier : 0)));
    if (tier > 0) showFrame(this.collar, RESEARCH_SPRITES.restoredPipe[Math.min(tier, RESEARCH_SPRITES.restoredPipe.length) - 1] ?? RESEARCH_SPRITES.restoredPipe[0]);
    this.collar.setVisible(here && tier > 0);
    this.wing?.setVisible(here && !isRestored(sim, 'sealed-wing'));
    this.restoredShown = here ? RESEARCH_NODES.filter((n) => (n.anchor.kind === 'wall' || n.anchor.kind === 'pipe') && isRestored(sim, n.id)).map((n) => n.id) : [];
    // Restores: the entrance a restore opened comes with its cap-lift event, in the same order.
    const opened = events.intakeOpens.map((o) => o.entrance);
    for (const r of events.restores) {
      const node = researchNode(r.node);
      this.restoreEffect({ node: r.node, entrance: node.anchor.kind === 'entrance' ? (opened.shift() ?? null) : null });
    }
    for (const rev of events.schematicReveals) {
      const d = list.find((x) => x.node === rev.node);
      if (d) this.shimmer(d);
    }
  }

  /** The linework fills solid cyan, then the part solidifies: the copy fades as a restored wall panel fades in. */
  private restoreEffect(d: Pick<Diagram, 'node' | 'entrance'>): void {
    const R = RESEARCH_LOOK.restore;
    const at = placeOf(d);
    const fx = this.effect(at, R.fillColor);
    const panel = this.panels.get(d.node);
    panel?.setAlpha(0);
    this.scene.tweens.chain({
      tweens: [
        { targets: fx, alpha: 1, scale: fx.scale * 1.08, duration: R.fillMs, ease: 'Sine.easeOut' },
        { targets: fx, alpha: 0, duration: R.solidMs, ease: 'Sine.easeIn', onStart: () => panel && this.scene.tweens.add({ targets: panel, alpha: 1, duration: R.solidMs }) },
      ],
      onComplete: () => this.drop(fx),
    });
  }

  /** A newly revealed diagram shimmers in: a bright copy flashing up and away. */
  private shimmer(d: Diagram): void {
    const V = RESEARCH_LOOK.reveal;
    const fx = this.effect(placeOf(d), V.color);
    this.scene.tweens.add({ targets: fx, alpha: V.alpha, duration: V.ms / 2, yoyo: true, ease: 'Sine.easeInOut', onComplete: () => this.drop(fx) });
  }

  private effect(at: { x: number; y: number; frame: string; depth: number }, color: string): GameObjects.Image {
    const fx = addVector(this.scene, at.x, at.y, at.frame).setDepth(at.depth + 0.01).setTint(colorOf(color)).setBlendMode(BlendModes.ADD).setAlpha(0.3);
    this.effects.push(fx);
    return fx;
  }

  private drop(fx: GameObjects.Image): void {
    this.effects = this.effects.filter((e) => e !== fx);
    fx.destroy();
  }
}
