import { WANDERER, type WandererView } from '../../data/art/wanderer';
import { drawWanderer, type WandererPose } from './wandererRig';
import { sheetPoses } from './wandererPoses';
import { ENEMY_RIGS } from '../../data/art/enemies';
import { vectorFrames } from './catalog';

// The contact sheet (016, dev only): every vector sprite, pose and facing at 4×.

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

const frames = vectorFrames();
const groups = new Map<string, Cell[]>();
for (const f of frames) {
  const group = ENEMY_RIGS.find((r) => f.name.startsWith(`${r.id}-`))?.id ?? 'Projectiles, effects and the tube stone';
  const list = groups.get(group) ?? [];
  list.push({ label: f.name, size: f.size, anchor: f.anchor, draw: (c, px) => f.draw(c, px) });
  groups.set(group, list);
}
for (const [title, cells] of groups) section(title, cells);
