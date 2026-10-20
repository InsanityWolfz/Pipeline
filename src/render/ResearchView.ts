import { BlendModes, type GameObjects, type Scene } from 'phaser';
import { CAP_SEAT_Y, INTAKE_INLETS } from '../data/art/intake';
import { TILE_SIZE } from '../data/config';
import { FOUNDRY_LAYOUT } from '../data/foundryAssets';
import { RESEARCH_NODES, researchNode, type ResearchNode } from '../data/research';
import { RESEARCH_LOOK, RESEARCH_SPRITES } from '../data/researchAssets';
import { FOUNDRY_ROOM } from '../data/rooms';
import type { SimEvents } from '../sim/events';
import { diagrams, isRestored, reservoirTier, type Diagram } from '../sim/research';
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
const DEPTH = RESEARCH_LOOK.depth;
const INTAKE_DEPTH = AT.y + DEPTH.intakeNudges * FOUNDRY_LAYOUT.onTopNudge;
/** The sealed wing's node: the one anchored on its door. */
const WING = RESEARCH_NODES.find((n) => n.anchor.kind === 'wing');

/** Each wall panel's art by node (046: the splitter is no longer restored); a wall node missing here is an error, never drawn as another's. */
type WallEffect = keyof typeof RESEARCH_SPRITES.diagramWall;
function wallKey(node: ResearchNode): WallEffect {
  const key = RESEARCH_SPRITES.wallArt[node.id];
  if (!key) throw new Error(`No wall panel art for research node '${node.id}'`);
  return key;
}

/** Where a diagram is drawn, world px, its frame and depth. */
function placeOf(d: Pick<Diagram, 'node' | 'entrance'>): { x: number; y: number; frame: string; depth: number } {
  const node = researchNode(d.node);
  const a = node.anchor;
  if (a.kind === 'entrance') return { x: AT.x + (INTAKE_INLETS[d.entrance ?? 0] ?? 0), y: AT.y + CAP_SEAT_Y, frame: RESEARCH_SPRITES.diagramCap, depth: INTAKE_DEPTH };
  if (a.kind === 'pipe') return { x: AT.x, y: AT.y, frame: RESEARCH_SPRITES.diagramPipe, depth: INTAKE_DEPTH };
  if (a.kind === 'wing') return { x: (a.tx + a.w / 2) * TILE_SIZE, y: (a.ty + 1) * TILE_SIZE, frame: RESEARCH_SPRITES.wingDoor, depth: (a.ty + 1) * TILE_SIZE + DEPTH.wall };
  return { x: (a.tx + 0.5) * TILE_SIZE, y: (a.ty + 1) * TILE_SIZE, frame: RESEARCH_SPRITES.diagramWall[wallKey(node)], depth: (a.ty + 1) * TILE_SIZE + DEPTH.wall + DEPTH.wallDiagram };
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
  /** Nodes a banked schematic revealed whose shimmer waits for the foundry to be on show (banking on the way in fires during the door's fade). */
  private reveals: string[] = [];
  private time = 0;

  constructor(scene: Scene) {
    this.scene = scene;
    for (const n of RESEARCH_NODES) {
      if (n.anchor.kind !== 'wall') continue;
      const at = placeOf({ node: n.id, entrance: null });
      this.panels.set(n.id, addVector(scene, at.x, at.y, RESEARCH_SPRITES.panel).setDepth(at.depth - DEPTH.panelUnder).setVisible(false));
    }
    this.collar = addVector(scene, AT.x, AT.y, RESEARCH_SPRITES.restoredPipe[0]).setDepth(INTAKE_DEPTH - FOUNDRY_LAYOUT.onTopNudge).setVisible(false);
    const at = WING ? placeOf({ node: WING.id, entrance: null }) : null;
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
    const tier = reservoirTier(sim);
    if (tier > 0) showFrame(this.collar, RESEARCH_SPRITES.restoredPipe[Math.min(tier, RESEARCH_SPRITES.restoredPipe.length) - 1] ?? RESEARCH_SPRITES.restoredPipe[0]);
    this.collar.setVisible(here && tier > 0);
    this.wing?.setVisible(here && WING !== undefined && !isRestored(sim, WING.id));
    this.restoredShown = here ? RESEARCH_NODES.filter((n) => (n.anchor.kind === 'wall' || n.anchor.kind === 'pipe') && isRestored(sim, n.id)).map((n) => n.id) : [];
    // Restores: the entrance a restore opened comes with its cap-lift event, in the same order.
    const opened = events.intakeOpens.map((o) => o.entrance);
    for (const r of events.restores) {
      const node = researchNode(r.node);
      this.restoreEffect({ node: r.node, entrance: node.anchor.kind === 'entrance' ? (opened.shift() ?? null) : null });
    }
    // A reveal shimmers once the foundry is on show; a node with no diagram drawn (one waiting on its requires' anchor) has none.
    this.reveals.push(...events.schematicReveals.map((r) => r.node));
    if (!here) return;
    for (const node of this.reveals) {
      const d = list.find((x) => x.node === node);
      if (d) this.shimmer(d);
    }
    this.reveals = [];
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
        { targets: fx, alpha: 1, scale: fx.scale * R.pop, duration: R.fillMs, ease: 'Sine.easeOut' },
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
    const fx = addVector(this.scene, at.x, at.y, at.frame).setDepth(at.depth + DEPTH.effect).setTint(colorOf(color)).setBlendMode(BlendModes.ADD).setAlpha(RESEARCH_LOOK.restore.fromAlpha);
    this.effects.push(fx);
    return fx;
  }

  private drop(fx: GameObjects.Image): void {
    this.effects = this.effects.filter((e) => e !== fx);
    fx.destroy();
  }
}
