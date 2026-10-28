import { WANDERER, type WandererView } from '../../data/art/wanderer';
import { drawWanderer, type WandererPose } from './wandererRig';
import { sheetSections } from './wandererPoses';
import { ENEMY_RIGS } from '../../data/art/enemies';
import { vectorFrames } from './catalog';
import { MACHINE_IDS } from '../../data/foundryAssets';
import { animFrames, ENEMY_ANIMS } from '../../data/assets';
import { ENEMY_FAMILIES } from '../../data/art/enemyFamilies';
import { WINDUP_STRIPS } from '../../data/art/enemyMotion';
import { ENEMIES } from '../../data/enemies';
import type { EnemyPoseName } from '../../data/art/enemyRig';
import { poseOfAnim } from './catalog';

import { RUIN_VARIANTS } from '../../data/decor';

// The contact sheet (016, dev only): every vector sprite, pose and facing at 4×, grouped by family (020).

const ZOOM = 4;

interface Cell {
  label: string;
  size: readonly [number, number];
  anchor: readonly [number, number];
  draw(c: CanvasRenderingContext2D, pxPerUnit: number): void;
}

function figure(cell: Cell): HTMLElement {
  const fig = document.createElement('figure');
  const canvas = document.createElement('canvas');
  canvas.width = cell.size[0] * ZOOM;
  canvas.height = cell.size[1] * ZOOM;
  const c = canvas.getContext('2d');
  if (c) {
    c.scale(ZOOM, ZOOM);
    c.translate(cell.anchor[0], cell.anchor[1]);
    cell.draw(c, ZOOM);
  }
  const cap = document.createElement('figcaption');
  cap.textContent = cell.label;
  fig.append(canvas, cap);
  return fig;
}

function section(title: string, cells: readonly Cell[]): void {
  const root = document.getElementById('sheet');
  if (!root) return;
  const h = document.createElement('h2');
  h.textContent = title;
  const row = document.createElement('div');
  row.className = 'row';
  row.append(...cells.map(figure));
  root.append(h, row);
}

const wandererCell = (label: string, pose: WandererPose): Cell => ({
  label,
  size: WANDERER.box.size,
  anchor: WANDERER.box.anchor,
  draw: (c, px) => {
    drawWanderer(c, pose, px);
  },
});

// 075: one section per strip of the spec's table, per view, each sampled from the motion.
for (const view of ['side', 'down', 'up'] as const satisfies readonly WandererView[]) {
  for (const strip of sheetSections(view)) section(`Wanderer ${view}: ${strip.title}`, strip.cells.map((c) => wandererCell(c.label, c.pose)));
}

// Grouped for review (020): each machine on its own row, then each family of sprites. A dev-only page: it groups
// by frame-name prefixes rather than the asset tables, which is fine for a review sheet that ships in no build.
/** 077's ruin variants (named `ow-` like the frames they replace). */
const VARIANT_NAMES = new Set(RUIN_VARIANTS.flatMap((v) => v.base.flatMap((b) => v.frames(b))));

const FAMILIES: readonly [title: string, test: (name: string) => boolean][] = [
  ['Boss phase parts (080): the Bulwark’s runes, chipped rim, red crack and spikes; the Forgewright’s plates and crest; the Conductor’s dome and halo', (n) => n.startsWith('boss-phase-')],
  ['Set pieces (077): each base, its loop frames and the Colossus\'s ivy', (n) => n.startsWith('setpiece-')],
  ['World detail (077): plants, ground scatter, ruin variants, the ripple ring, glint and ley bead', (n) => /^(decor-|scatter-|fx-ripple|fx-ley-bead)/.test(n) || VARIANT_NAMES.has(n)],
  ...MACHINE_IDS.map((id): [string, (n: string) => boolean] => [`Machine: ${id} (idle, jammed, working)`, (n) => n.startsWith(`machine-${id}-`)]),
  ['The storm tier (066): stormsteel, storm glass, the stormsteel parts, every storm round, in flight and armed', (n) => /^(item-stormsteel|item-storm-glass|icon-[a-z-]*-(stormsteel|storm-glass)|arrow-stormsteel|bomb-stormsteel|landmine-stormsteel|landmine-armed-stormsteel|ley-bolt-storm-glass)/.test(n)],
  ['Material tiers (062): ley-steel, ley glass, the steel parts, every steel and glass round, in flight and armed', (n) => /^(item-ley-steel|item-ley-glass|item-steel-|icon-[a-z-]*-(steel|glass)|arrow-steel|bomb-steel|landmine-steel|landmine-armed-steel|ley-bolt-glass)/.test(n)],
  ['Cold and the Split', (n) => n.startsWith('ice-case') || n.startsWith('split-') || n.startsWith('shard')],
  ['Restoration (033): diagrams, wall panels, the sealed wing, the splitter, research items, the pillar', (n) => /^(research-|splitter-|schematic-|map-schematic|item-ancient|item-aqueduct|item-bulwark|item-schematic|emblem-splitter)/.test(n)],
  ['Stonefall Hollows (034): cliffs, the aqueduct, rubble, ley-iron, the altar, the enemy bomb, the map icon', (n) => /^(ow-cliff|ow-aqueduct|ow-fallen|ow-rubble|item-ley-iron|node-ley-iron|altar-|enemy-bomb|map-aqueduct)/.test(n)],
  ['Frost rounds on every family (039): the base icon with the frost badge', (n) => /^icon-(bomb|ley-bolt|landmine)-frost/.test(n)],
  ['Landmines and cluster bombs (038): the mine in flight and armed, its icon, the iron plate, bomblets, the flashes, the cluster bomb', (n) => /^(landmine|icon-landmine|item-iron-plate|bomblet|mine-flash|icon-bomb-cluster)/.test(n)],
  ['The Husk Hive (049): nest stones, the resin seep at each use, bare and regrowing', (n) => /^(ow-hive|node-resin-seep)/.test(n)],
  ['Boss arena doors (055): each width, sealed and open', (n) => n.startsWith('arena-door-')],
  ['Conduits and the underground pair (052)', (n) => n.startsWith('conduit-') || n.startsWith('tunnel-') || n.startsWith('emblem-tunnel')],
  ['Hoppers and crates', (n) => n.startsWith('hopper-') || n === 'crate'],
  ['Build arrows and status markers', (n) => n.includes('-arrow-') || n.startsWith('status-')],
  ['Items, ammo and emblems', (n) => n.startsWith('item-') || n.startsWith('icon-') || n.startsWith('emblem-')],
  ['Fixtures, the pylon and the foundry', (n) => /^(identification-bench|stash|supply-port|doorway-side|waystone|pylon-|door-shimmer|ley-crystal|intake-|floor-|wall|prop-|ruin-)/.test(n)],
  ['Gathering nodes', (n) => n.startsWith('node-')],
  ['Ley Springs', (n) => n.startsWith('ley-spring') || n.startsWith('spring-')],
  ['Landmarks (032): cut blocks, old trees, the marsh, hollow lips, the reliquary, map icons, the champion glow', (n) => /^(ow-cut-block|ow-old-tree|ow-marsh|ow-lily|ow-hollow|cache-|map-|champion-)/.test(n)],
  ['Overworld', (n) => n.startsWith('ow-')],
  ['HUD and menus', (n) => n.startsWith('hud-') || n.startsWith('craft-') || n.startsWith('menu-') || n === 'key-cap' || n === 'crosshair' || n === 'pointer' || n === 'objective-tick'],
];

// 076: enemies under their family, every frame of a wind-up strip labelled with its phase.
const enemyGroup = (rigId: string): string => {
  const def = Object.values(ENEMIES).find((d) => d.anims === rigId);
  const fam = def && ENEMY_FAMILIES.find((f) => f.members.includes(def.id));
  return fam ? `${fam.name} (${fam.region}): ${rigId}` : rigId;
};
const phaseLabel = new Map<string, string>();
for (const rig of ENEMY_RIGS) {
  for (const anim of Object.values(ENEMY_ANIMS[rig.id] ?? {})) {
    if (!anim) continue;
    const { pose } = poseOfAnim(rig, anim);
    const names = animFrames(anim);
    if (WINDUP_STRIPS.includes(pose as EnemyPoseName)) names.forEach((n, i) => phaseLabel.set(n, i === 0 ? 'gather' : i === names.length - 1 ? 'peak' : 'coil'));
    if (pose === 'stagger') names.forEach((n, i) => phaseLabel.set(n, i === 0 ? 'reel' : 'recover'));
    if (pose === 'death') names.forEach((n) => phaseLabel.set(n, 'struck'));
  }
}
const groups = new Map<string, Cell[]>();
for (const f of vectorFrames()) {
  const rig = ENEMY_RIGS.find((r) => f.name.startsWith(`${r.id}-`));
  const group = rig ? enemyGroup(rig.id) : (FAMILIES.find(([, test]) => test(f.name))?.[0] ?? 'Projectiles, effects and the tube stone');
  const list = groups.get(group) ?? [];
  const phase = phaseLabel.get(f.name);
  list.push({ label: phase ? `${f.name} (${phase})` : f.name, size: f.size, anchor: f.anchor, draw: (c, px) => f.draw(c, px) });
  groups.set(group, list);
}
for (const [title, cells] of groups) section(title, cells);
