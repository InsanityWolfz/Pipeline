import { describe, expect, it } from 'vitest';
import { CHAMPIONS } from '../../src/data/champions';
import { CLAIM_TICKS, SUPPLY_TICKS } from '../../src/data/claims';
import { enemyDef } from '../../src/data/enemies';
import { landmarkDef } from '../../src/data/landmarks';
import { nodeDef, REGROW_STAGES } from '../../src/data/nodes';
import { OVERWORLD_ROOM } from '../../src/data/overworld';
import { SHRINE_SITE } from '../../src/data/rooms';
import { claim } from '../../src/sim/claims';
import { fixtureDef, portFront } from '../../src/sim/fixtures';
import { place } from '../../src/sim/placement';
import type { CrateState } from '../../src/sim/pieces';
import { scaledDef } from '../../src/sim/ringScale';
import { createSim, type SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { die, movePlayer, run, runUntil, SEED } from './fight';
import { foundry, put } from './foundryKit';

// 049: the Husk Hive in play. Its guards (Husks, one a champion, at ring 2), its resin seeps (harvested with E, used up,
// grown back), and its pylon: claimed, it sends Husk resin up the resin port, so a bomb line runs from supply alone.

const HIVE = landmarkDef('husk-hive');
const PYLON = HIVE.pylon ?? { tx: 0, ty: 0 };
const guards = (s: SimState) => s.enemies.filter((e) => e.group === HIVE.id);
const resinPort = (s: SimState) => s.fixtures.find((f) => fixtureDef(f.id).raw === 'husk-resin');

describe("the Hive's guards", () => {
  it('are Husks at ring 2 scaling, one a named champion with a ring 2 champion\'s health', () => {
    const s = createSim(SEED);
    const pack = guards(s);
    expect(pack).toHaveLength(HIVE.guards.length);
    for (const e of pack) {
      expect(e.enemyId).toBe('husk');
      expect(e.ring).toBe(2);
    }
    const champs = pack.filter((e) => e.champion !== null);
    expect(champs).toHaveLength(1);
    const champ = champs[0];
    if (!champ) throw new Error('no champion');
    expect(CHAMPIONS.names.husk).toContain(champ.champion?.name);
    expect(champ.health).toBe(scaledDef(enemyDef('husk'), 2, true).maxHealth);
    const plain = pack.find((e) => e.champion === null);
    expect(plain?.health).toBe(scaledDef(enemyDef('husk'), 2, false).maxHealth);
  });

  it('come back after a KO, champion and all, until the pylon is claimed', () => {
    const s = createSim(SEED);
    s.enemies = s.enemies.filter((e) => e.group !== HIVE.id);
    die(s);
    expect(guards(s)).toHaveLength(HIVE.guards.length);
    expect(guards(s).filter((e) => e.champion !== null)).toHaveLength(1);
    claim(s, SHRINE_SITE);
    claim(s, HIVE.id);
    die(s);
    expect(guards(s)).toEqual([]);
  });

  it('seal the pylon while any lives; with them gone, held E claims it', () => {
    const s = createSim(SEED);
    claim(s, SHRINE_SITE);
    const below = tileCentre({ tx: PYLON.tx, ty: PYLON.ty + 1 });
    s.roomId = OVERWORLD_ROOM;
    movePlayer(s, below.x, below.y);
    run(s, 1, { interact: true });
    expect(s.events.sealed).toEqual([{ site: HIVE.id }]);
    s.enemies = s.enemies.filter((e) => e.group !== HIVE.id);
    run(s, 1, { interact: true });
    run(s, CLAIM_TICKS);
    expect(s.claims).toContain(HIVE.id);
  });
});

describe('discovery', () => {
  it('is hidden until any of it comes into view, then found once', () => {
    const s = createSim(SEED);
    expect(s.discovered).not.toContain(HIVE.id);
    s.enemies = [];
    const c = tileCentre({ tx: Math.round((HIVE.area.x0 + HIVE.area.x1) / 2), ty: Math.round((HIVE.area.y0 + HIVE.area.y1) / 2) });
    movePlayer(s, c.x, c.y);
    run(s, 1);
    expect(s.discovered).toContain(HIVE.id);
    expect(summarize(s).landmarks.find((l) => l.id === HIVE.id)).toMatchObject({ discovered: true, claimed: false });
  });
});

describe('a resin seep', () => {
  it('harvests with E into Husk resin, is used up after its uses, then grows back through its stages', () => {
    const s = createSim(SEED);
    s.enemies = [];
    s.inventory = {};
    const i = s.nodes.findIndex((n) => n.nodeId === 'resin-seep');
    const n = s.nodes[i];
    if (!n) throw new Error('no seep');
    const def = nodeDef('resin-seep');
    for (let k = 0; k < def.uses; k++) {
      movePlayer(s, n.x, n.y + 16);
      run(s, 1, { interact: true });
      run(s, def.harvestTicks);
      runUntil(s, () => s.groundItems.length === 0, 10);
    }
    expect(s.inventory['husk-resin']).toBe(def.uses);
    expect(n.uses).toBe(0);
    expect(n.regrow).toBeGreaterThan(def.regrowTicks - 10);
    expect(summarize(s).nodes[i]).toMatchObject({ nodeId: 'resin-seep', uses: 0 });
    expect(REGROW_STAGES).toBeGreaterThan(0);
    run(s, def.regrowTicks);
    expect(n.uses).toBe(def.uses);
  });
});

describe("the Hive's pylon", () => {
  it('raises the resin port once claimed, at ×1 and 15 a minute, like any pylon (028)', () => {
    const s = foundry();
    claim(s, SHRINE_SITE);
    expect(resinPort(s)).toBeUndefined();
    expect(summarize(s).ports.some((p) => p.raw === 'husk-resin')).toBe(false);
    claim(s, HIVE.id);
    expect(summarize(s).ports.find((p) => p.raw === 'husk-resin')).toMatchObject({ id: 'husk-resin-port', pylons: 1, perMinute: 15 });
  });

  it('pushes Husk resin into the piece in front of the port every SUPPLY_TICKS', () => {
    const s = foundry();
    claim(s, SHRINE_SITE);
    claim(s, HIVE.id);
    const port = resinPort(s);
    if (!port) throw new Error('no resin port');
    const front = portFront(port);
    const crate = put<CrateState>(s, 'crate', front.tx, front.ty);
    run(s, SUPPLY_TICKS * 2);
    expect(crate.contents).toEqual({ 'husk-resin': 2 });
  });

  it('lets a bomb line run from supply alone: the stone, resin and ley crystal ports into a packer', () => {
    const s = foundry();
    claim(s, SHRINE_SITE);
    claim(s, HIVE.id);
    s.inventory = {};
    // Each port feeds its machine straight from the wall; conduits carry the parts to the packer's three back cells.
    const stone = s.fixtures.find((f) => fixtureDef(f.id).raw === 'stone');
    const ley = s.fixtures.find((f) => fixtureDef(f.id).raw === 'ley-crystal');
    const resin = resinPort(s);
    if (!stone || !ley || !resin) throw new Error('missing a port');
    const [st, ly, rs] = [portFront(stone), portFront(ley), portFront(resin)];
    put(s, 'packer', 8, ly.ty, 'right');
    const crate = put<CrateState>(s, 'crate', 9, ly.ty);
    put(s, 'grinder', ly.tx, ly.ty);
    put(s, 'fuse-maker', rs.tx, rs.ty);
    for (let x = ly.tx + 1; x < 8; x++) put(s, 'conduit', x, ly.ty);
    for (let x = rs.tx + 1; x < 8; x++) put(s, 'conduit', x, rs.ty);
    // Stone comes down from its higher port to the packer's top cell.
    const top = ly.ty - 1;
    put(s, 'shaper', st.tx, st.ty);
    for (let y = st.ty; y < top; y++) put(s, 'conduit', st.tx + 1, y, 'down');
    if (!place(s, 'conduit', st.tx + 1, top, 'right', { inFrom: 'up' })) throw new Error('no corner');
    for (let x = st.tx + 2; x < 8; x++) put(s, 'conduit', x, top);
    runUntil(s, () => (crate.contents.bomb ?? 0) >= 4, SUPPLY_TICKS * 6);
    expect(crate.contents.bomb).toBeGreaterThanOrEqual(4);
    // Nothing came from the player.
    expect(s.inventory).toEqual({});
  });

  it('replays identically', () => {
    const play = () => {
      const s = createSim(SEED);
      claim(s, SHRINE_SITE);
      claim(s, HIVE.id);
      run(s, SUPPLY_TICKS * 2 + 3);
      return summarize(s);
    };
    const a = play();
    expect(a.claims).toEqual([SHRINE_SITE, HIVE.id]);
    expect(a).toEqual(play());
  });
});
