import { describe, expect, it } from 'vitest';
import { CLAIM_TICKS, SITE_SAFE_RADIUS, SITE_SUPPLY, SUPPLY_TICKS } from '../../src/data/claims';
import { GROTTO, GROTTO_GROUP } from '../../src/data/grotto';
import { landmarkDef } from '../../src/data/landmarks';
import { OVERWORLD, OVERWORLD_ROOM } from '../../src/data/overworld';
import { SHRINE_SITE } from '../../src/data/rooms';
import { claim, dormant } from '../../src/sim/claims';
import { fixtureDef, portFront } from '../../src/sim/fixtures';
import type { CrateState } from '../../src/sim/pieces';
import { createSim, type SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { tileCentre } from '../../src/sim/tiles';
import { WORLD } from '../../src/sim/world';
import { die, movePlayer, run, SEED } from './fight';
import { foundry, put } from './foundryKit';

// 055 (D.6, Shaun: "let's get a rimestone pylon… so if you claim it, you get rimestone sent to your base"): the Frozen
// Grotto (029) gets a pylon, guarded by its pack like any site (032), that sends rimestone up a port at 028's rate.

const GROTTO_SITE = landmarkDef(GROTTO_GROUP);
const PYLON = GROTTO_SITE.pylon ?? { tx: 0, ty: 0, site: '', supplies: [] };
const guards = (s: SimState) => s.enemies.filter((e) => e.group === GROTTO_GROUP);
const rimePort = (s: SimState) => s.fixtures.find((f) => fixtureDef(f.id).raw === 'rimestone');

describe("the Grotto's pylon", () => {
  it('stands in the Grotto, claims the Grotto, and sends only rimestone, with a rime outcrop in its safe zone', () => {
    expect(PYLON).toMatchObject({ site: GROTTO_GROUP, supplies: ['rimestone'] });
    expect(PYLON.tx >= GROTTO.area.x0 && PYLON.tx <= GROTTO.area.x1 && PYLON.ty >= GROTTO.area.y0 && PYLON.ty <= GROTTO.area.y1).toBe(true);
    expect(SITE_SUPPLY[GROTTO_GROUP]).toEqual(['rimestone']);
    expect(GROTTO.nodes.some((n) => Math.hypot(n.tx - PYLON.tx, n.ty - PYLON.ty) <= SITE_SAFE_RADIUS)).toBe(true);
    for (const t of [...GROTTO.nodes, ...GROTTO.pack]) expect({ tx: t.tx, ty: t.ty }).not.toEqual({ tx: PYLON.tx, ty: PYLON.ty });
    const pylon = (WORLD[OVERWORLD_ROOM]?.pylons ?? []).find((p) => p.site === GROTTO_GROUP);
    expect(pylon).toMatchObject({ tx: PYLON.tx, ty: PYLON.ty, name: 'Frozen Grotto', safeRadius: SITE_SAFE_RADIUS, wakes: SHRINE_SITE });
  });

  it('is dormant until the shrine is claimed', () => {
    const s = createSim(SEED);
    const pylon = (WORLD[OVERWORLD_ROOM]?.pylons ?? []).find((p) => p.site === GROTTO_GROUP);
    if (!pylon) throw new Error('no pylon');
    expect(dormant(s, pylon)).toBe(true);
    claim(s, SHRINE_SITE);
    expect(dormant(s, pylon)).toBe(false);
  });

  it('is sealed while its guards live; with them gone, held E claims it', () => {
    const s = createSim(SEED);
    claim(s, SHRINE_SITE);
    s.roomId = OVERWORLD_ROOM;
    const below = tileCentre({ tx: PYLON.tx, ty: PYLON.ty + 1 });
    movePlayer(s, below.x, below.y);
    run(s, 1, { interact: true });
    expect(s.events.sealed).toEqual([{ site: GROTTO_GROUP }]);
    s.enemies = s.enemies.filter((e) => e.group !== GROTTO_GROUP);
    run(s, 1, { interact: true });
    run(s, CLAIM_TICKS);
    expect(s.claims).toContain(GROTTO_GROUP);
  });

  it("keeps its guards coming back after a KO until it's claimed (029), then not (032)", () => {
    const s = createSim(SEED);
    s.enemies = s.enemies.filter((e) => e.group !== GROTTO_GROUP);
    die(s);
    expect(guards(s)).toHaveLength(GROTTO.pack.length);
    claim(s, SHRINE_SITE);
    claim(s, GROTTO_GROUP);
    die(s);
    expect(guards(s)).toEqual([]);
  });

  it('has a ley line home from the pylon (053)', () => {
    const line = OVERWORLD.leyLines[GROTTO_GROUP];
    expect(line?.[0]).toEqual({ tx: PYLON.tx, ty: PYLON.ty });
  });
});

describe('the rimestone port', () => {
  it('stands once the Grotto is claimed, at ×1 and 15 a minute, like any pylon (028)', () => {
    const s = foundry();
    claim(s, SHRINE_SITE);
    expect(rimePort(s)).toBeUndefined();
    claim(s, GROTTO_GROUP);
    expect(summarize(s).ports.find((p) => p.raw === 'rimestone')).toMatchObject({ id: 'rimestone-port', pylons: 1, perMinute: 15 });
  });

  it('pushes rimestone into the piece in front of it every SUPPLY_TICKS', () => {
    const s = foundry();
    claim(s, SHRINE_SITE);
    claim(s, GROTTO_GROUP);
    const port = rimePort(s);
    if (!port) throw new Error('no rimestone port');
    const front = portFront(port);
    const crate = put<CrateState>(s, 'crate', front.tx, front.ty);
    run(s, SUPPLY_TICKS * 2);
    expect(crate.contents).toEqual({ rimestone: 2 });
  });

  it('replays identically', () => {
    const play = () => {
      const s = createSim(SEED);
      claim(s, SHRINE_SITE);
      claim(s, GROTTO_GROUP);
      run(s, SUPPLY_TICKS * 2 + 3);
      return summarize(s);
    };
    const a = play();
    expect(a.claims).toEqual([SHRINE_SITE, GROTTO_GROUP]);
    expect(a).toEqual(play());
  });
});
