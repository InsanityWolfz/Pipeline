import { describe, expect, it } from 'vitest';
import { CLUSTER } from '../../src/data/tags';
import type { BurstEvent, HitEvent } from '../../src/sim/events';
import { matchImpacts, type MatchEvents, type Track } from '../../src/render/fx/impactMatch';

// 078: render works out which round made which hit from the rounds drawn last frame and this frame and this frame's
// events (getState() includes the events, so the sim adds nothing). A miss falls back to the element's look.

const straight = (id: number, ammoId: string, x0: number, x: number, y = 100, live = true): Track => ({ id, ammoId, kind: 'straight', x0, y0: y, x, y, dx: 1, dy: 0, live, toX: 0, toY: 0 });
const lob = (id: number, ammoId: string, toX: number, toY: number, live = false): Track => ({ id, ammoId, kind: 'lob', x0: toX - 5, y0: toY, x: toX, y: toY, dx: 1, dy: 0, live, toX, toY });
const hit = (id: number, x: number, y = 100, extra: Partial<Extract<HitEvent, { target: 'enemy' }>> = {}): HitEvent => ({ target: 'enemy', id, x, y, damage: 10, damageType: 'physical', ...extra });
const burst = (x: number, y: number): BurstEvent => ({ x, y, radius: 48, damageType: 'physical' });
const none: MatchEvents = { hits: [], bursts: [], mineBursts: [], bombletBursts: [] };
/** Every enemy's hurtbox: centred on its feet, 10 px round, so a round within 18 px of the feet may have hit it. */
const reach = () => ({ offsetY: 0, r: 18, half: 10 });

describe('matchImpacts (078)', () => {
  it('matches a piercing arrow through three enemies to the arrow, each hit once', () => {
    const tracks = [straight(1, 'arrow+steel', 100, 160), straight(2, 'ley-bolt', 0, 5, 300)];
    const m = matchImpacts(tracks, { ...none, hits: [hit(7, 110), hit(8, 130), hit(9, 150)] }, reach, []);
    expect(m.hits.map((h) => (h.kind === 'round' ? h.ammoId : h.kind))).toEqual(['arrow+steel', 'arrow+steel', 'arrow+steel']);
    // Where its path meets each enemy's near side (10 px before its middle), along its flight.
    expect(m.hits.map((h) => (h.kind === 'round' ? [h.x, h.dx] : null))).toEqual([[100, 1], [120, 1], [140, 1]]);
    expect(m.ends).toEqual([]);
  });

  it('gives two rounds hitting one enemy in a frame one hit each', () => {
    const tracks = [straight(1, 'arrow', 90, 120), straight(2, 'ley-bolt+fire', 95, 104, 104, false)];
    const m = matchImpacts(tracks, { ...none, hits: [hit(5, 100), hit(5, 100)] }, reach, []);
    const ids = m.hits.map((h) => (h.kind === 'round' ? h.ammoId : null));
    expect([...ids].sort()).toEqual(['arrow', 'ley-bolt+fire']);
    // The bolt vanished on its hit: no end for it.
    expect(m.ends).toEqual([]);
  });

  it('gives a bomb’s burst the bomb that vanished at its point, and a mine’s burst the armed mine there', () => {
    const tracks = [lob(1, 'bomb+frost', 200, 200), lob(2, 'bomb', 300, 300, true), { ...lob(3, 'landmine+steel', 50, 60, true), kind: 'mine' as const, x: 50, y: 60 }];
    const m = matchImpacts(tracks, { ...none, bursts: [burst(200.5, 199.6), burst(300, 300), burst(10, 10)], mineBursts: [burst(50, 60)] }, reach, []);
    // The live bomb at (300, 300) is still flying, so it isn't the burst there; nothing is at (10, 10).
    expect(m.bursts).toEqual(['bomb+frost', null, null]);
    expect(m.mines).toEqual(['landmine+steel']);
  });

  it('gives a bomblet’s burst its bomblet’s cluster bomb, else the latest cluster burst near it', () => {
    const tracks: Track[] = [{ ...lob(4, 'bomb+stormsteel+fire+cluster', 240, 200), kind: 'bomblet' }];
    const near = 200 + CLUSTER.distance;
    const m = matchImpacts(tracks, { ...none, bombletBursts: [burst(240, 200), burst(200, near), burst(900, 900)] }, reach, [
      { x: 200, y: 200, ammoId: 'bomb+lightning+cluster' },
      { x: 200, y: 201, ammoId: 'bomb+frost+cluster' },
    ]);
    expect(m.bomblets).toEqual(['bomb+stormsteel+fire+cluster', 'bomb+frost+cluster', null]);
  });

  it('plays an end where a straight round vanished with no hit: a wall, or its range', () => {
    const wall = straight(1, 'ley-bolt+glass', 100, 105, 50, false);
    const range = straight(2, 'arrow', 400, 408, 80, false);
    const flying = straight(3, 'arrow', 0, 8, 120, true);
    const m = matchImpacts([wall, range, flying], none, reach, []);
    expect(m.ends).toEqual([
      { ammoId: 'ley-bolt+glass', x: 105, y: 50, dx: 1, dy: 0 },
      { ammoId: 'arrow', x: 408, y: 80, dx: 1, dy: 0 },
    ]);
  });

  it('falls back when no round passed near (several ticks in one frame, a Pool’s burst); skips punches, burns, arcs and the player', () => {
    const m = matchImpacts([straight(1, 'arrow', 0, 10)], {
      ...none,
      hits: [hit(1, 500), hit(2, 5, 100, { melee: true }), hit(3, 5, 100, { burn: true }), hit(4, 5, 100, { arc: true, damageType: 'lightning' }), { target: 'player', x: 0, y: 0, damage: 3 }],
    }, reach, []);
    expect(m.hits.map((h) => h.kind)).toEqual(['fallback', 'skip', 'skip', 'arc', 'skip']);
  });

  it('lets a burst’s own area hits play its blast only: no fallback burst for them', () => {
    const m = matchImpacts([lob(1, 'bomb', 200, 200)], { ...none, bursts: [burst(200, 200)], hits: [hit(5, 230, 210), hit(6, 400, 400)] }, reach, []);
    expect(m.hits.map((h) => h.kind)).toEqual(['blast', 'fallback']);
    const mine = matchImpacts([], { ...none, mineBursts: [{ x: 0, y: 0, radius: 24, damageType: 'physical' }], hits: [hit(5, 20, 0)] }, reach, []);
    expect(mine.hits.map((h) => h.kind)).toEqual(['blast']);
  });

  it('measures from the hurtbox’s centre, its half-size + 8 px', () => {
    const tall = () => ({ offsetY: -20, r: 20, half: 12 });
    const tracks = [straight(1, 'arrow', 0, 100, 82)];
    expect(matchImpacts(tracks, { ...none, hits: [hit(1, 50, 100)] }, tall, []).hits[0]?.kind).toBe('round');
    expect(matchImpacts(tracks, { ...none, hits: [hit(1, 50, 140)] }, tall, []).hits[0]?.kind).toBe('fallback');
  });
});
