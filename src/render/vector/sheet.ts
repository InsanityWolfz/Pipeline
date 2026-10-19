import { WANDERER, type WandererView } from '../../data/art/wanderer';
import { drawWanderer, type WandererPose } from './wandererRig';
import { sheetPoses } from './wandererPoses';
import { ENEMY_RIGS } from '../../data/art/enemies';
import { vectorFrames } from './catalog';
import { MACHINE_IDS } from '../../data/foundryAssets';

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
  draw: (c, px) => drawWanderer(c, pose, px),
});

for (const view of ['side', 'down', 'up'] as const satisfies readonly WandererView[]) {
  section(`Wanderer: ${view}`, sheetPoses(view).map((p) => wandererCell(p.label, p.pose)));
}
const sideIdle = sheetPoses('side')[0];
if (sideIdle) section('Wanderer: facing left', [wandererCell('idle', { ...sideIdle.pose, flip: true })]);

// Grouped for review (020): each machine on its own row, then each family of sprites. A dev-only page: it groups
// by frame-name prefixes rather than the asset tables, which is fine for a review sheet that ships in no build.
const FAMILIES: readonly [title: string, test: (name: string) => boolean][] = [
  ...MACHINE_IDS.map((id): [string, (n: string) => boolean] => [`Machine: ${id} (idle, jammed, working)`, (n) => n.startsWith(`machine-${id}-`)]),
  ['Cold and the star split', (n) => n.startsWith('ice-case') || n.startsWith('star-')],
  ['Restoration (033): diagrams, wall panels, the sealed wing, the splitter and merger, research items, the pillar', (n) => /^(research-|splitter-|merger-|schematic-|map-schematic|item-ancient|item-aqueduct|item-bulwark|item-schematic|emblem-splitter|emblem-merger)/.test(n)],
  ['Stonefall Hollows (034): cliffs, the aqueduct, rubble, ley-iron, the altar, the enemy bomb, the map icon', (n) => /^(ow-cliff|ow-aqueduct|ow-fallen|ow-rubble|item-ley-iron|node-ley-iron|altar-|enemy-bomb|map-aqueduct)/.test(n)],
  ['Landmines and cluster bombs (038): the mine in flight and armed, its icon, the iron plate, bomblets, the flashes, the cluster bomb', (n) => /^(landmine|icon-landmine|item-iron-plate|bomblet|mine-flash|icon-bomb-cluster)/.test(n)],
  ['Conduits and sorters', (n) => n.startsWith('conduit-') || n.startsWith('sorter-')],
  ['Hoppers and crates', (n) => n.startsWith('hopper-') || n === 'crate'],
  ['Build arrows and status markers', (n) => n.includes('-arrow-') || n.startsWith('status-')],
  ['Items, ammo and emblems', (n) => n.startsWith('item-') || n.startsWith('icon-') || n.startsWith('emblem-')],
  ['Fixtures, the pylon and the foundry', (n) => /^(identification-bench|stash|supply-port|doorway-side|waystone|pylon-|door-rubble|ley-crystal|intake-|floor-|wall|prop-|ruin-)/.test(n)],
  ['Gathering nodes', (n) => n.startsWith('node-')],
  ['Ley Springs', (n) => n.startsWith('ley-spring') || n.startsWith('spring-')],
  ['Landmarks (032): cut blocks, old trees, the marsh, hollow lips, the reliquary, map icons, the champion glow', (n) => /^(ow-cut-block|ow-old-tree|ow-marsh|ow-lily|ow-hollow|cache-|map-|champion-)/.test(n)],
  ['Overworld', (n) => n.startsWith('ow-')],
  ['HUD and menus', (n) => n.startsWith('hud-') || n.startsWith('craft-') || n.startsWith('menu-') || n === 'key-cap' || n === 'crosshair' || n === 'pointer' || n === 'objective-tick'],
];

const groups = new Map<string, Cell[]>();
for (const f of vectorFrames()) {
  const group =
    ENEMY_RIGS.find((r) => f.name.startsWith(`${r.id}-`))?.id ?? FAMILIES.find(([, test]) => test(f.name))?.[0] ?? 'Projectiles, effects and the tube stone';
  const list = groups.get(group) ?? [];
  list.push({ label: f.name, size: f.size, anchor: f.anchor, draw: (c, px) => f.draw(c, px) });
  groups.set(group, list);
}
for (const [title, cells] of groups) section(title, cells);
