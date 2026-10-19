import { describe, expect, it } from 'vitest';
import { GROTTO, GROTTO_GROUP } from '../../src/data/grotto';
import { FEET_BOX } from '../../src/data/player';
import { nodeDef } from '../../src/data/nodes';
import { OVERWORLD, ringOf } from '../../src/data/overworld';
import { TILE } from '../../src/data/rooms';
import { generateOverworld } from '../../src/sim/overworldGen';
import { createSim, resetWorld } from '../../src/sim/state';
import { reachable, tileKey } from '../fixtures/reach';
import { die, movePlayer, run, runUntil, SEED } from './fight';

// The Frozen Grotto, minimal (029): a hand-placed clearing in the north-west, three
// rime clusters, a path from the west path's end, and a guard pack that never stays dead.

const room = generateOverworld();
const key = tileKey;

describe('the Frozen Grotto', () => {
  it('sits in ring 2 in the north-west, kept as a clearing, with a path from the west path\'s end', () => {
    expect(GROTTO.area).toEqual({ x0: 9, y0: 5, x1: 19, y1: 13 });
    expect(ringOf(14, 9)).toBe(2);
    expect(OVERWORLD.clearings).toContainEqual(GROTTO.area);
    expect(OVERWORLD.paths).toContainEqual([
      { tx: 12, ty: 27 },
      { tx: 14, ty: 14 },
    ]);
    for (let ty = GROTTO.area.y0; ty <= GROTTO.area.y1; ty++) {
      for (let tx = GROTTO.area.x0; tx <= GROTTO.area.x1; tx++) expect([TILE.tree, TILE.rock, TILE.water]).not.toContain(room.rows[ty]?.[tx]);
    }
  });

  it('holds three rime clusters at the spec tiles, each placed for the Grotto', () => {
    const rime = OVERWORLD.nodes.filter((n) => n.nodeId === 'rime-cluster');
    expect(rime.map(({ tx, ty }) => ({ tx, ty }))).toEqual([
      { tx: 12, ty: 7 },
      { tx: 16, ty: 8 },
      { tx: 14, ty: 11 },
    ]);
    expect(nodeDef('rime-cluster')).toMatchObject({ name: 'Rime cluster', itemId: 'rime-shard', placement: 'frozen-grotto', uses: 3, yield: 1 });
  });

  it('every rime cluster is reachable on foot from the wake tile', () => {
    const seen = reachable(room, OVERWORLD.wake);
    for (const n of OVERWORLD.nodes.filter((x) => x.nodeId === 'rime-cluster')) {
      const beside = [
        { tx: n.tx, ty: n.ty + 1 },
        { tx: n.tx, ty: n.ty - 1 },
        { tx: n.tx + 1, ty: n.ty },
        { tx: n.tx - 1, ty: n.ty },
      ];
      expect(beside.some((t) => seen.has(key(t))), key(n)).toBe(true);
    }
  });

  it('rime clusters drop rime shards', () => {
    const s = createSim(SEED);
    s.enemies = [];
    const index = s.nodes.findIndex((n) => n.nodeId === 'rime-cluster');
    const node = s.nodes[index];
    if (!node) throw new Error('no rime cluster');
    // Just below the cluster, in harvest reach.
    movePlayer(s, node.x, node.y + nodeDef('rime-cluster').feetBox.h / 2 + FEET_BOX.h / 2 + 4);
    run(s, 1, { interact: true });
    runUntil(s, () => s.events.harvests.length > 0, 60);
    expect(s.events.harvests[0]?.itemId).toBe('rime-shard');
    expect(s.groundItems.some((g) => g.itemId === 'rime-shard') || (s.inventory['rime-shard'] ?? 0) > 0).toBe(true);
  });

  it('is held by a hand-placed guard pack in its landmark\'s group (032: frozen-grotto): 3 Husks and a Wisp, back after a KO', () => {
    const guards = OVERWORLD.packs.filter((p) => p.group === GROTTO_GROUP);
    expect(guards.map((p) => p.enemyId).sort()).toEqual(['husk', 'husk', 'husk', 'wisp']);
    for (const g of guards) {
      expect(g.tx >= GROTTO.area.x0 && g.tx <= GROTTO.area.x1 && g.ty >= GROTTO.area.y0 && g.ty <= GROTTO.area.y1).toBe(true);
    }
    const s = createSim(SEED);
    const grotto = () => s.enemies.filter((e) => e.group === GROTTO_GROUP);
    expect(grotto()).toHaveLength(4);
    s.enemies = s.enemies.filter((e) => e.group !== GROTTO_GROUP);
    die(s);
    expect(grotto()).toHaveLength(4);
    // No pylon: it can't be claimed, and even a stray claim id wouldn't change its guards.
    expect(GROTTO_GROUP).toBe('frozen-grotto');
    expect(OVERWORLD.shrine.site).not.toBe(GROTTO_GROUP);
    resetWorld(s);
    expect(grotto()).toHaveLength(4);
  });
});
