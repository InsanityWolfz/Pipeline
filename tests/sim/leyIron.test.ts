import { describe, expect, it } from 'vitest';
import { FIXTURES, SITE_SUPPLY } from '../../src/data/claims';
import { HOLLOWS } from '../../src/data/hollows';
import { ITEMS } from '../../src/data/items';
import { nodeDef, REGROW_STAGES } from '../../src/data/nodes';
import { OVERWORLD } from '../../src/data/overworld';
import { HOLLOWS_START } from '../../src/data/playtest';
import { FOUNDRY_ROOM, SHRINE_SITE } from '../../src/data/rooms';
import { claim, claimedPylons, portPylons } from '../../src/sim/claims';
import { createSim } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { movePlayer, run, runUntil } from './fight';

// Ley-iron (034): the first metal, gathered with E at seams in the Hollows' cliff faces,
// and sent home by the Cistern Terrace's pylon with its area's stone.

const TERRACE = 'cistern-terrace';

describe('ley-iron', () => {
  it('is a raw item, gathered from ley-iron seams at cliff faces (018 uses, regrowth and remains)', () => {
    expect(ITEMS['ley-iron']).toMatchObject({ kind: 'raw', group: 'raw', name: 'Ley-iron' });
    expect(nodeDef('ley-iron-seam')).toMatchObject({ itemId: 'ley-iron', placement: 'cliff-seam', uses: 3, yield: 1 });
    expect(OVERWORLD.nodes.filter((n) => n.nodeId === 'ley-iron-seam').length).toBeGreaterThanOrEqual(5);
  });

  it('harvests with E, depletes after its uses, then grows back', () => {
    const s = createSim(3, { start: HOLLOWS_START });
    s.enemies = [];
    const i = s.nodes.findIndex((n) => n.nodeId === 'ley-iron-seam');
    const n = s.nodes[i];
    if (!n) throw new Error('no seam');
    s.inventory = {};
    const def = nodeDef('ley-iron-seam');
    for (let k = 0; k < def.uses; k++) {
      movePlayer(s, n.x, n.y + 16);
      run(s, 1, { interact: true });
      run(s, def.harvestTicks);
      runUntil(s, () => s.groundItems.length === 0, 10);
    }
    expect(s.inventory['ley-iron']).toBe(def.uses);
    expect(n.uses).toBe(0);
    // Regrowing: its remains show from the last harvest on (018).
    expect(n.regrow).toBeGreaterThan(def.regrowTicks - 10);
    expect(summarize(s).nodes[i]).toMatchObject({ nodeId: 'ley-iron-seam', uses: 0 });
    run(s, def.regrowTicks);
    expect(n.uses).toBe(def.uses);
    expect(REGROW_STAGES).toBeGreaterThan(0);
  });
});

describe('the Cistern Terrace', () => {
  it("sends its area's ley-iron and stone, each with a node in its 7-tile zone", () => {
    expect(SITE_SUPPLY[TERRACE]).toEqual(['ley-iron', 'stone']);
  });

  it('is dormant until the shrine is claimed, sealed while its guards live, then claimed by held E', () => {
    const dormant = createSim(3);
    const below = tileCentre({ tx: 87, ty: 171 });
    dormant.enemies = [];
    movePlayer(dormant, below.x, below.y);
    run(dormant, 1, { interact: true });
    expect(dormant.claimHold).toBeNull();
    const s = createSim(3, { start: HOLLOWS_START });
    expect(claimedPylons(s).map((p) => p.pylon.site)).toEqual([SHRINE_SITE]);
    const room = OVERWORLD.id;
    movePlayer(s, below.x, below.y);
    run(s, 1, { interact: true });
    expect(s.events.sealed).toEqual([{ site: TERRACE }]);
    s.enemies = s.enemies.filter((e) => e.group !== TERRACE);
    run(s, 1, { interact: true });
    run(s, 130);
    expect(s.claims).toContain(TERRACE);
    expect(s.roomId).toBe(room);
  });

  it('adds the ley-iron port on the west wall and a pylon to the stone port; the waystone lists it', () => {
    const s = createSim(3);
    claim(s, SHRINE_SITE);
    expect(s.fixtures.some((f) => f.id === 'ley-iron-port')).toBe(false);
    claim(s, TERRACE);
    expect(s.fixtures.some((f) => f.id === 'ley-iron-port')).toBe(true);
    expect(FIXTURES.find((f) => f.id === 'ley-iron-port')).toMatchObject({ tx: 1, ty: 3, raw: 'ley-iron', facing: 'right' });
    expect(portPylons(s.claims, 'stone')).toBe(2);
    expect(portPylons(s.claims, 'ley-iron')).toBe(1);
    expect(summarize(s).ports.find((x) => x.raw === 'ley-iron')).toMatchObject({ pylons: 1, perMinute: 15 });
    expect(claimedPylons(s).map((x) => [x.pylon.site, x.pylon.name])).toEqual([
      [SHRINE_SITE, 'Shrine'],
      [TERRACE, 'Cistern Terrace'],
    ]);
  });

  it('carries the player from the waystone to it, and sends ley-iron up its port', () => {
    const s = createSim(3);
    claim(s, SHRINE_SITE);
    claim(s, TERRACE);
    s.roomId = FOUNDRY_ROOM;
    const way = tileCentre({ tx: 22, ty: 5 });
    movePlayer(s, way.x, way.y);
    run(s, 1, { travel: TERRACE });
    expect(s.roomId).toBe(OVERWORLD.id);
    expect({ x: s.player.x, y: s.player.y }).toEqual(tileCentre({ tx: 87, ty: 171 }));
    runUntil(s, () => s.events.supplies.some((e) => e.itemId === 'ley-iron'), 300);
  });

  it('can be claimed before the Bulwark falls (it lives on in its forum)', () => {
    const s = createSim(3, { start: HOLLOWS_START });
    claim(s, TERRACE);
    expect(s.claims).toEqual([SHRINE_SITE, TERRACE]);
    expect(s.enemies.some((e) => e.enemyId === 'bulwark')).toBe(true);
    expect(HOLLOWS.arena.boss).toBe('bulwark');
  });
});
