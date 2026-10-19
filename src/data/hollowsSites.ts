import { REGION_1_X, type TileStamp } from './hollows';
import type { LandmarkDef } from './landmarks';
import { TILE } from './rooms';
import type { TilePos } from './tiles';

// Stonefall Hollows' landmarks (034): the Ley-iron Cut, the Broken Aqueduct and the
// Cistern Terrace, the region's one claimable site, beside the Cut (the Hollows Ley Spring
// is 030's, in springs.ts). Hand-placed, hidden until found (032), each stamping its own
// tiles over the generated ground. Names are Shaun's placeholders. Tiles throughout.

/** The foundry stairs' front, where every ley line home ends. */
const STAIRS = { tx: REGION_1_X + 41, ty: 21 } as const;

/** The Cut's quarry face: a cliff wall across its back, the seams in its foot. */
const CUT_FACE: readonly TileStamp[] = Array.from({ length: 17 }, (_, i) => ({ tx: 17 + i, ty: 4, symbol: TILE.cliff }));

/** Ley-iron (the first metal): a dense cluster of seams in an open quarry face, and boulders cut loose on its floor. */
const LEY_IRON_CUT: LandmarkDef = {
  id: 'ley-iron-cut',
  name: 'Ley-iron Cut',
  kind: 'resource-site',
  ring: 3,
  area: { x0: 17, y0: 4, x1: 33, y1: 9 },
  features: [
    { kind: 'rocks', cx: 21, cy: 8, r: 2.5 },
    { kind: 'rocks', cx: 29, cy: 8, r: 2.5 },
  ],
  nodes: [
    { nodeId: 'ley-iron-seam', tx: 19, ty: 5 },
    { nodeId: 'ley-iron-seam', tx: 22, ty: 5 },
    { nodeId: 'ley-iron-seam', tx: 25, ty: 5 },
    { nodeId: 'ley-iron-seam', tx: 28, ty: 5 },
    { nodeId: 'ley-iron-seam', tx: 31, ty: 5 },
    { nodeId: 'rubble', tx: 21, ty: 8 },
    { nodeId: 'rubble', tx: 29, ty: 8 },
  ],
  // The Cistern Terrace's guards hold it: its pylon overlooks the Cut and sends its ley-iron and stone.
  guards: [],
  stamps: CUT_FACE,
  marker: 'site',
  look: { quarry: true },
};

/** The aqueduct's pillars along its line, and what spans each bay between two: a standing arch or a fallen span. */
const AQUEDUCT = {
  ty: 20,
  pillars: [4, 8, 12, 16, 20, 24, 28, 32, 35],
  bays: ['fallen', 'arch', 'fallen', 'fallen', 'arch', 'arch', 'fallen', 'arch'],
} as const;

function aqueductStamps(): TileStamp[] {
  const { ty, pillars, bays } = AQUEDUCT;
  const out: TileStamp[] = pillars.map((tx) => ({ tx, ty, symbol: TILE.pillar }));
  bays.forEach((kind, i) => {
    const from = (pillars[i] ?? 0) + 1;
    const to = (pillars[i + 1] ?? 0) - 1;
    for (let tx = from; tx <= to; tx++) out.push({ tx, ty, symbol: kind === 'arch' ? TILE.arch : TILE.fallen });
    // A fallen span spills rubble either side: cover.
    if (kind === 'fallen') out.push({ tx: from + 1, ty: ty + 1, symbol: TILE.rock }, { tx: to, ty: ty - 1, symbol: TILE.rock });
  });
  return out;
}

/** A long fallen span crossing the region: pillars, standing arches you walk under, and fallen bays heaped with rubble. */
const BROKEN_AQUEDUCT: LandmarkDef = {
  id: 'broken-aqueduct',
  name: 'Broken Aqueduct',
  kind: 'ruin',
  ring: 3,
  area: { x0: 4, y0: 18, x1: 35, y1: 22 },
  features: [],
  nodes: [],
  guards: [],
  stamps: aqueductStamps(),
  marker: 'aqueduct',
};

const TERRACE_PYLON: TilePos = { tx: 25, ty: 12 };

/** The region's claimable site: a ruined cistern terrace above the Cut, its pylon held by a fixed pack (035; Husks and Wisps until then). */
const CISTERN_TERRACE: LandmarkDef = {
  id: 'cistern-terrace',
  name: 'Cistern Terrace',
  kind: 'resource-site',
  ring: 3,
  area: { x0: 17, y0: 10, x1: 33, y1: 16 },
  features: [],
  nodes: [],
  guards: [
    { enemyId: 'husk', tx: 21, ty: 13 },
    { enemyId: 'husk', tx: 29, ty: 13 },
    { enemyId: 'husk', tx: 22, ty: 15 },
    { enemyId: 'husk', tx: 28, ty: 15 },
    { enemyId: 'wisp', tx: 20, ty: 11 },
    { enemyId: 'wisp', tx: 30, ty: 11 },
  ],
  pylon: { ...TERRACE_PYLON, site: 'cistern-terrace', supplies: ['ley-iron', 'stone'] },
  // Down the road, out through the gap and along the west path to the stairs.
  leyLine: [TERRACE_PYLON, { tx: 25, ty: 26 }, { tx: 38, ty: 28 }, { tx: REGION_1_X + 12, ty: 28 }, { tx: REGION_1_X + 26, ty: 31 }, { tx: REGION_1_X + 39, ty: 26 }, STAIRS],
  blocks: [
    { tx: 17, ty: 11 },
    { tx: 18, ty: 11 },
    { tx: 32, ty: 11 },
    { tx: 33, ty: 11 },
    { tx: 17, ty: 15 },
    { tx: 33, ty: 15 },
  ],
  marker: 'site',
  look: { paving: 'terrace' },
};

export const HOLLOWS_SITES: readonly LandmarkDef[] = [LEY_IRON_CUT, BROKEN_AQUEDUCT, CISTERN_TERRACE];
