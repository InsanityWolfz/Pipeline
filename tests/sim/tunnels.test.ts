import { describe, expect, it } from 'vitest';
import { CONDUIT_TICKS, TUNNEL_REACH } from '../../src/data/foundry';
import { BUILD_BAR, isSolidPiece, pieceDef } from '../../src/data/pieces';
import { feedsIntake } from '../../src/sim/intake';
import { conduitInFrom, pickUp, unlockedPieces } from '../../src/sim/placement';
import type { ConduitState, CrateState, HopperState, TunnelInState, TunnelOutState } from '../../src/sim/pieces';
import type { Facing } from '../../src/sim/player';
import type { SimState } from '../../src/sim/state';
import { summarize } from '../../src/sim/summary';
import { tunnelReach } from '../../src/sim/tunnels';
import { run } from './fight';
import { foundry, put } from './foundryKit';

// The underground pair (052, C.1): an entrance takes items from its back and sends them under the floor to its exit,
// which faces the same way, up to TUNNEL_REACH tiles on in a straight line; anything can stand on the tiles between.
// A tunnel holds as many items as the tiles it spans, like a conduit that long (052.1). Picking up one end leaves the
// other unpaired until a new end is placed in reach (052.2).

const IN = 'underground-entrance';
const OUT = 'underground-exit';

function hopper(s: SimState, tx: number, ty: number, facing: Facing, item: string, n: number): HopperState {
  const h = put<HopperState>(s, 'hopper', tx, ty, facing);
  h.item = item;
  h.count = n;
  return h;
}

/** A conduit holding `item`, ready to hand it on. */
function ready(s: SimState, tx: number, ty: number, facing: Facing, item: string): ConduitState {
  const c = put<ConduitState>(s, 'conduit', tx, ty, facing);
  c.item = item;
  c.progress = CONDUIT_TICKS;
  return c;
}

describe('the pieces', () => {
  it('are logistics, unlocked from the start beside the splitter, flat underfoot', () => {
    const s = foundry(false);
    expect(unlockedPieces(s)).toEqual(expect.arrayContaining([IN, OUT]));
    expect(BUILD_BAR.slice(0, 4)).toEqual(['conduit', 'splitter', IN, OUT]);
    expect([pieceDef(IN).kind, pieceDef(OUT).kind]).toEqual(['tunnel-in', 'tunnel-out']);
    expect([pieceDef(IN).category, pieceDef(OUT).category]).toEqual(['logistics', 'logistics']);
    expect([isSolidPiece(IN), isSolidPiece(OUT)]).toEqual([false, false]);
    expect(TUNNEL_REACH).toBe(5);
  });
});

describe('pairing', () => {
  it('an exit placed in line ahead, facing the same way, pairs with the entrance, up to 5 tiles between', () => {
    for (let between = 0; between <= TUNNEL_REACH; between++) {
      const s = foundry();
      const a = put<TunnelInState>(s, IN, 3, 5, 'right');
      const b = put<TunnelOutState>(s, OUT, 4 + between, 5, 'right');
      expect([a.pair, b.pair], `${between} between`).toEqual([b.id, a.id]);
      expect(a.tunnel).toHaveLength(between);
    }
  });

  it('6 tiles between, another facing, out of line or behind it: no pair', () => {
    const cases: [number, number, Facing][] = [
      [3 + TUNNEL_REACH + 2, 5, 'right'],
      [6, 5, 'left'],
      [6, 6, 'right'],
      [1, 5, 'right'],
    ];
    for (const [tx, ty, facing] of cases) {
      const s = foundry();
      const a = put<TunnelInState>(s, IN, 3, 5, 'right');
      const b = put<TunnelOutState>(s, OUT, tx, ty, facing);
      expect([a.pair, b.pair], `${tx},${ty} ${facing}`).toEqual([null, null]);
    }
  });

  it('works whichever end is placed second, in every direction', () => {
    for (const facing of ['up', 'down', 'left', 'right'] as const) {
      const s = foundry();
      const step = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[facing];
      const b = put<TunnelOutState>(s, OUT, 10 + 3 * (step[0] ?? 0), 7 + 3 * (step[1] ?? 0), facing);
      const a = put<TunnelInState>(s, IN, 10, 7, facing);
      expect([a.pair, b.pair], facing).toEqual([b.id, a.id]);
      expect(a.tunnel).toHaveLength(2);
    }
  });

  it('pairs the nearest free end, and never one already paired', () => {
    const s = foundry();
    const a = put<TunnelInState>(s, IN, 3, 5, 'right');
    const far = put<TunnelOutState>(s, OUT, 7, 5, 'right');
    expect(a.pair).toBe(far.id);
    // A second entrance behind the first: the first's exit is taken, so it finds nothing.
    const b = put<TunnelInState>(s, IN, 2, 5, 'right');
    expect(b.pair).toBeNull();
    // Two free exits ahead: a new entrance pairs the nearer.
    const t = foundry();
    const farOut = put<TunnelOutState>(t, OUT, 8, 5, 'right');
    const near = put<TunnelOutState>(t, OUT, 5, 5, 'right');
    const c = put<TunnelInState>(t, IN, 3, 5, 'right');
    expect([c.pair, near.pair, farOut.pair]).toEqual([near.id, c.id, null]);
  });

  it('lets anything stand on the tiles between', () => {
    const s = foundry();
    put(s, IN, 3, 5, 'right');
    put(s, 'conduit', 4, 5, 'up');
    put(s, 'crate', 5, 5);
    const b = put<TunnelOutState>(s, OUT, 6, 5, 'right');
    expect(b.pair).not.toBeNull();
  });

  it('marks the tiles an entrance reaches: the 6 ahead of it, up to the wall', () => {
    expect(tunnelReach({ tx: 3, ty: 5, facing: 'right' })).toEqual([4, 5, 6, 7, 8, 9].map((tx) => ({ tx, ty: 5 })));
    expect(tunnelReach({ tx: 4, ty: 3, facing: 'up' })).toEqual([
      { tx: 4, ty: 2 },
      { tx: 4, ty: 1 },
    ]);
  });
});

describe('items through a tunnel', () => {
  it('pass under the tiles between and come out the exit, in order', () => {
    const s = foundry();
    hopper(s, 2, 5, 'right', 'wood', 3);
    put(s, IN, 3, 5, 'right');
    put(s, OUT, 7, 5, 'right');
    const crate = put<CrateState>(s, 'crate', 8, 5);
    run(s, 200);
    expect(crate.contents).toEqual({ wood: 3 });
  });

  it('take as long as a conduit that long, and hold as many items as the tiles they span (052.1)', () => {
    const s = foundry();
    hopper(s, 2, 5, 'right', 'stone', 20);
    const a = put<TunnelInState>(s, IN, 3, 5, 'right');
    const b = put<TunnelOutState>(s, OUT, 7, 5, 'right');
    // Nothing takes from the exit: the pair fills up, 5 tiles spanned, 5 items held.
    run(s, 400);
    const held = (a.item ? 1 : 0) + a.tunnel.filter((x) => x !== null).length + (b.item ? 1 : 0);
    expect(held).toBe(5);
    // Timing: the same items through a 5-tile conduit run reach a crate on the same tick.
    const timeTo = (build: (t: SimState) => void): number => {
      const t = foundry();
      hopper(t, 2, 5, 'right', 'stone', 1);
      build(t);
      const c = put<CrateState>(t, 'crate', 8, 5);
      for (let i = 1; i < 300; i++) {
        run(t, 1);
        if (c.contents.stone) return i;
      }
      return -1;
    };
    const tunnel = timeTo((t) => {
      put(t, IN, 3, 5, 'right');
      put(t, OUT, 7, 5, 'right');
    });
    const conduits = timeTo((t) => {
      for (let tx = 3; tx <= 7; tx++) put(t, 'conduit', tx, 5, 'right');
    });
    expect(tunnel).toBeGreaterThan(0);
    expect(tunnel).toBe(conduits);
  });

  it('an unpaired entrance holds its item; the exit takes nothing from its neighbours', () => {
    const s = foundry();
    hopper(s, 2, 5, 'right', 'wood', 3);
    const a = put<TunnelInState>(s, IN, 3, 5, 'right');
    run(s, 100);
    expect([a.item, a.progress]).toEqual(['wood', CONDUIT_TICKS]);
    const t = foundry();
    const b = put<TunnelOutState>(t, OUT, 5, 5, 'right');
    const behind = ready(t, 4, 5, 'right', 'wood');
    const side = ready(t, 5, 4, 'down', 'stone');
    run(t, CONDUIT_TICKS);
    expect([b.item, behind.item, side.item]).toEqual([null, 'wood', 'stone']);
  });

  it('an entrance takes only from its back, and hands nothing out its front', () => {
    const s = foundry();
    const a = put<TunnelInState>(s, IN, 5, 5, 'right');
    const side = ready(s, 5, 4, 'down', 'wood');
    run(s, CONDUIT_TICKS);
    expect([a.item, side.item]).toEqual([null, 'wood']);
    // A conduit beside an entrance's front never joins it as a corner (the entrance hands nothing out its front).
    const u = foundry();
    put(u, IN, 5, 5, 'down');
    expect(conduitInFrom(u, 5, 6, 'right')).toBe('left');
    const t = foundry();
    put(t, IN, 12, 2, 'up');
    expect(feedsIntake(t.foundry)).toBe(false);
  });

  it('an exit can feed the intake', () => {
    const s = foundry();
    put(s, IN, 12, 4, 'up');
    put(s, OUT, 12, 1, 'up');
    expect(feedsIntake(s.foundry)).toBe(true);
  });
});

describe('picking up an end (052.2)', () => {
  it('gives back what it and the tunnel hold, and leaves the other end unpaired', () => {
    const s = foundry();
    hopper(s, 2, 5, 'right', 'stone', 20);
    const a = put<TunnelInState>(s, IN, 3, 5, 'right');
    const b = put<TunnelOutState>(s, OUT, 7, 5, 'right');
    run(s, 400);
    const before = s.inventory.stone ?? 0;
    pickUp(s, 7, 5);
    // The exit's item and the three under the floor come back; the entrance keeps its own.
    expect((s.inventory.stone ?? 0) - before).toBe(4);
    expect([a.pair, a.tunnel, a.item]).toEqual([null, [], 'stone']);
    expect(s.foundry.pieces).not.toContain(b);
    // A new exit in reach pairs again.
    const c = put<TunnelOutState>(s, OUT, 5, 5, 'right');
    expect([a.pair, c.pair]).toEqual([c.id, a.id]);
    pickUp(s, 3, 5);
    expect(c.pair).toBeNull();
  });
});

describe("Shaun's case: an arrow line and a bomb line that cross", () => {
  /**
   * The arrow line (wood, stone and fiber into an assembler at 12,4, arrows into a crate at 12,3) takes its fiber from a
   * hopper east of it along row 7. The bomb line (casing, fuse and ley dust into a packer at 16,12, bombs into a crate
   * at 16,13) takes its stone from a hopper north of it down column 16, which crosses row 7: the stone goes under the
   * fiber in a tunnel from (16,6) to (16,8).
   */
  function crossing(): { s: SimState; arrows: CrateState; bombs: CrateState } {
    const s = foundry();
    s.link.attuned = true;
    // The arrow line.
    hopper(s, 11, 6, 'up', 'wood', 6);
    hopper(s, 12, 6, 'up', 'stone', 6);
    put(s, 'cutter', 11, 5, 'up');
    put(s, 'knapper', 12, 5, 'up');
    put(s, 'spinner', 13, 5, 'up');
    put(s, 'assembler', 12, 4, 'up');
    const arrows = put<CrateState>(s, 'crate', 12, 3);
    hopper(s, 19, 7, 'left', 'fiber', 6);
    for (let tx = 18; tx >= 14; tx--) put(s, 'conduit', tx, 7, 'left');
    put(s, 'conduit', 13, 7, 'up');
    put(s, 'conduit', 13, 6, 'up');
    // The bomb line.
    hopper(s, 16, 3, 'down', 'stone', 6);
    put(s, 'conduit', 16, 4, 'down');
    put(s, 'conduit', 16, 5, 'down');
    put(s, IN, 16, 6, 'down');
    put(s, OUT, 16, 8, 'down');
    put(s, 'conduit', 16, 9, 'down');
    put(s, 'conduit', 16, 10, 'down');
    hopper(s, 15, 10, 'down', 'husk-resin', 6);
    hopper(s, 17, 10, 'down', 'ley-crystal', 6);
    put(s, 'fuse-maker', 15, 11, 'down');
    put(s, 'shaper', 16, 11, 'down');
    put(s, 'grinder', 17, 11, 'down');
    put(s, 'packer', 16, 12, 'down');
    const bombs = put<CrateState>(s, 'crate', 16, 13);
    return { s, arrows, bombs };
  }

  it('the fiber run crosses over the stone tunnel, and both lines make rounds', () => {
    const { s, arrows, bombs } = crossing();
    // The fiber conduit stands on the tunnel's middle tile.
    expect(s.foundry.pieces.find((p) => p.tx === 16 && p.ty === 7)?.kind).toBe('conduit');
    run(s, 60 * 60);
    expect(arrows.contents.arrow ?? 0).toBeGreaterThan(0);
    expect(bombs.contents.bomb ?? 0).toBeGreaterThan(0);
  });

  it('is deterministic', () => {
    const a = crossing();
    const b = crossing();
    run(a.s, 1500);
    run(b.s, 1500);
    expect(summarize(a.s).foundry).toEqual(summarize(b.s).foundry);
  });

  it('getState reports both ends with their pair and the tunnel', () => {
    const s = foundry();
    const a = put<TunnelInState>(s, IN, 3, 5, 'right');
    const b = put<TunnelOutState>(s, OUT, 6, 5, 'right');
    expect(summarize(s).foundry.pieces).toEqual([
      expect.objectContaining({ kind: 'tunnel-in', item: null, pair: b.id, tunnel: [null, null] }),
      expect.objectContaining({ kind: 'tunnel-out', item: null, pair: a.id }),
    ]);
  });
});
