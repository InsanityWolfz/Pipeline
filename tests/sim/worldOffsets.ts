import { ARENAS } from '../../src/data/arenas';
import { EMBERWORKS, EMBERWORKS_GATE, rampTiles } from '../../src/data/emberworks';
import { ANVIL_HALL, SLAG_RIVER_TILES } from '../../src/data/emberworksSites';
import { HOLLOWS } from '../../src/data/hollows';
import { LANDMARK_LIST } from '../../src/data/landmarks';
import { OVERWORLD } from '../../src/data/overworld';
import { ROAD_DEFS, ROADS } from '../../src/data/roads';
import { WORLD_SHAPE } from '../../src/data/worldShape';
import { generateOverworld, overworldPylons } from '../../src/sim/overworldGen';

// 060 slice 1: every hand-placed tile on the round map as an offset from the foundry's door, so growing the grid
// (and moving the centre) can be proved a pure move: the snapshot in worldOffsets.json was taken before it. 064 grew the
// grid again for the Stormcrown and retook the snapshot before that move, now with the Emberworks' places, ramps, gate
// and ground.

/** The span of the grid the snapshot covers round the centre: 060's 230-tile world. */
const SPAN = 115;

const r4 = (n: number): number => Math.round(n * 10000) / 10000;

/** Every `tx`/`ty`, `cx`/`cy` and rect corner in `v`, as offsets from the centre; everything else kept as is. */
export function offsets(v: unknown): unknown {
  const { tx: cx, ty: cy } = WORLD_SHAPE.centre;
  if (Array.isArray(v)) return v.map(offsets);
  if (v === null || typeof v !== 'object') return v;
  const o = v as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(o)) {
    if (typeof val === 'number' && (k === 'tx' || k === 'cx' || k === 'x0' || k === 'x1')) out[k] = r4(val - cx);
    else if (typeof val === 'number' && (k === 'ty' || k === 'cy' || k === 'y0' || k === 'y1')) out[k] = r4(val - cy);
    else out[k] = offsets(val);
  }
  return out;
}

/** A 32-bit FNV-1a hash of a string. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}

/** The generated grid within SPAN of the centre (the tiles within `radius` of it, the rest blanked), hashed, with its symbol counts. */
function ground(radius: number): { hash: number; counts: Record<string, number> } {
  const { tx: cx, ty: cy } = WORLD_SHAPE.centre;
  const rows = generateOverworld()
    .rows.slice(cy - SPAN, cy + SPAN)
    .map((r) => [...r.slice(cx - SPAN, cx + SPAN)]);
  const kept = rows.map((r, j) => r.map((s, i) => (Math.hypot(i - SPAN, j - SPAN) <= radius ? s : ' ')).join(''));
  const counts: Record<string, number> = {};
  for (const r of kept) for (const s of r) if (s !== ' ') counts[s] = (counts[s] ?? 0) + 1;
  return { hash: hash(kept.join('\n')), counts: Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))) };
}

/** The snapshot: landmarks, nodes, packs, roads, ley lines, pylons, arenas and the Hollows' places, by offset; and the ground. */
export function worldOffsets(): unknown {
  // The grid's size is the one thing that grows; the arenas' rooms aren't places.
  const overworld: Record<string, unknown> = { ...OVERWORLD };
  delete overworld.width;
  delete overworld.height;
  return {
    landmarks: offsets(LANDMARK_LIST),
    overworld: offsets(overworld),
    roads: offsets(ROAD_DEFS),
    roadPoints: offsets(ROADS),
    pylons: offsets(overworldPylons()),
    arenas: offsets(ARENAS.map((a) => Object.fromEntries(Object.entries(a).filter(([k]) => k !== 'rooms')))),
    hollows: offsets(HOLLOWS),
    /** Region 1 and its barrier (060's roads and the Emberworks change the Hollows' ground, never Region 1's). */
    region1Ground: ground(WORLD_SHAPE.region1 + 1),
    /** 064: the Emberworks' hand-placed tiles. */
    emberworks: offsets({ gate: EMBERWORKS_GATE, ramps: EMBERWORKS.ramps.map((r) => rampTiles(r)), hall: ANVIL_HALL, river: SLAG_RIVER_TILES }),
    /** 064: every ring's ground out to the Emberworks' outer edge, before the Stormcrown's ramps cut through it. */
    ground: ground(EMBERWORKS.radii.outer - 1),
    /** 064 slice 2: every ring's ground out to the Hollows' outer edge (the Stormcrown's roads change the Emberworks' after slice 1, taken there). */
    hollowsGround: ground(HOLLOWS.radii.outer - 1),
  };
}
