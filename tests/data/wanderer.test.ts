import { describe, expect, it } from 'vitest';
import { RARITIES, RARITY_ORDER, type Rarity } from '../../src/data/gear';
import { DAYLIGHT_PALETTE } from '../../src/data/palette';
import { inksOf, type LimbStyle, type Shape } from '../../src/data/art/types';
import { TUBE_PARTS, WANDERER, WANDERER_SCHEME, WANDERER_SCHEMES, WANDERER_TRIM, WANDERER_TRIM_FX, wandererViews, type WandererSchemeId } from '../../src/data/art/wanderer';
import { WANDERER_MOTION } from '../../src/data/art/wandererMotion';
import { PLAYER_HIT_FX } from '../../src/data/assets';
import { DYING_TICKS, ROLL_TICKS } from '../../src/data/player';

// 075: the arcane ranger's data: schemes, trim and motion numbers, every colour in the palette.

const daylight = new Set(DAYLIGHT_PALETTE.map((c) => c.id));
const SCHEMES = Object.keys(WANDERER_SCHEMES) as WandererSchemeId[];
const TRIMS: (Rarity | null)[] = [null, ...RARITY_ORDER];
const inkId = (i: LimbStyle['color']): string => (typeof i === 'string' ? i : i.id);

describe('the wanderer schemes (075)', () => {
  it('are A cobalt, B rust and C bone, with cobalt the default', () => {
    expect(SCHEMES).toEqual(['cobalt', 'rust', 'bone']);
    expect(WANDERER_SCHEME).toBe('cobalt');
    expect(WANDERER_SCHEMES.cobalt.cloth).toEqual({ dark: 'cobalt-dark', mid: 'cobalt', light: 'cobalt-light' });
    expect(WANDERER_SCHEMES.cobalt.jerkin).toEqual({ dark: 'leather', mid: 'hide', light: 'hide-light' });
    expect(WANDERER_SCHEMES.rust.cloth).toEqual({ dark: 'rust-dark', mid: 'rust', light: 'rust-light' });
    expect(WANDERER_SCHEMES.rust.jerkin).toEqual({ dark: 'leather', mid: 'hide', light: 'hide-light' });
    expect(WANDERER_SCHEMES.bone.cloth).toEqual({ dark: 'bone-dark', mid: 'bone', light: 'bone-light' });
    expect(WANDERER_SCHEMES.bone.jerkin).toEqual({ dark: 'leather-dark', mid: 'leather', light: 'strap' });
  });

  it('each have all six ids, each in the palette, and none a threat colour', () => {
    for (const s of SCHEMES) {
      const ids = [...Object.values(WANDERER_SCHEMES[s].cloth), ...Object.values(WANDERER_SCHEMES[s].jerkin)];
      expect(ids).toHaveLength(6);
      for (const id of ids) {
        expect(daylight, id).toContain(id);
        expect(['danger', 'hit-red', 'wisp', 'wisp-dark', 'cinder', 'flame-dark']).not.toContain(id);
      }
    }
  });
});

describe('the rarity trim (075)', () => {
  it('covers every rarity and none, in the bench frames\' colours', () => {
    expect(Object.keys(WANDERER_TRIM).sort()).toEqual(['none', ...Object.keys(RARITIES)].sort());
    for (const r of RARITY_ORDER) expect(WANDERER_TRIM[r].color).toBe(RARITIES[r].color);
    expect(WANDERER_TRIM.none).toMatchObject({ color: null, glow: null, pulse: false, shimmer: false });
    expect(WANDERER_TRIM.common.glow).toBeNull();
    expect(WANDERER_TRIM.fine.glow).toEqual({ color: 'cyan', blur: 2 });
    expect(WANDERER_TRIM.rare).toMatchObject({ glow: { color: 'gold-trim', blur: 2.5 }, pulse: true, shimmer: false });
    expect(WANDERER_TRIM.relic).toMatchObject({ glow: { color: 'wisp', blur: 3.5 }, pulse: true, shimmer: true });
    expect(WANDERER_TRIM_FX.pulse).toMatchObject({ min: 0.8, max: 1, periodMs: 2000 });
  });

  it('draws the hem, the hood edge and the clasp in the trim colour, the cloth light with nothing worn', () => {
    for (const s of SCHEMES)
      for (const t of TRIMS) {
        const views = wandererViews(s, t);
        const want = WANDERER_TRIM[t ?? 'none'].color ?? WANDERER_SCHEMES[s].cloth.light;
        for (const [name, v] of Object.entries(views)) {
          const ids = new Set(v.parts.map((p) => p.id));
          for (const id of v.trimParts) {
            expect(ids, `${name}: ${id}`).toContain(id);
            const shapes = v.parts.find((p) => p.id === id)?.shapes ?? [];
            for (const sh of shapes) expect(inksOf(sh)[0], `${s}/${t}/${name}/${id}`).toBe(want);
          }
          // Every view shows the hem and the hood's edge; the clasp shows from the front and side.
          expect(v.trimParts).toContain('cape-hem');
          expect(v.trimParts).toContain('hood-edge');
        }
      }
  });
});

describe('the arcane ranger\'s colours (075)', () => {
  it('come only from the palette, in every scheme and trim', () => {
    const fixed: Shape[] = [...Object.values(WANDERER.boot), WANDERER.hand, WANDERER.rivet, ...TUBE_PARTS.flash.frames.flat(), ...TUBE_PARTS.housing];
    const used = [
      ...SCHEMES.flatMap((s) =>
        TRIMS.flatMap((t) =>
          Object.values(wandererViews(s, t)).flatMap((v) => [...v.parts.flatMap((p) => p.shapes), ...(v.glow ? [v.glow] : []), ...(v.window ? [v.window.bubble] : [])].flatMap(inksOf)),
        ),
      ),
      ...fixed.flatMap(inksOf),
      ...(Object.values(WANDERER.limbs) as LimbStyle[]).flatMap((l) => [inkId(l.color), ...(l.bands ? [inkId(l.bands.color)] : [])]),
      TUBE_PARTS.flutes.lit,
      TUBE_PARTS.flutes.dormant,
      TUBE_PARTS.sling.color,
      WANDERER_TRIM_FX.shimmer.color,
      WANDERER_TRIM_FX.shimmer.glow.color,
    ];
    for (const id of used) expect(daylight, id).toContain(id);
    expect(used).toContain('rim-light');
  });

  it('puts the rim light on the hood, cowl, cape, jerkin and tank', () => {
    for (const [name, v] of Object.entries(WANDERER.views))
      for (const id of ['hood', 'cape', 'jerkin', 'tank', 'cowl']) {
        const part = v.parts.find((p) => p.id === id);
        expect(part?.shapes.some((s) => s.rim !== undefined), `${name}: ${id}`).toBe(true);
      }
  });
});

describe('the wanderer motion numbers (075)', () => {
  it('match the sim\'s own timings and the spec\'s starting values', () => {
    const M = WANDERER_MOTION;
    expect(M.hit.frames).toBe(PLAYER_HIT_FX.poseTicks);
    expect(M.roll.turnEnd).toBeLessThan(ROLL_TICKS);
    expect(M.ko.out).toBeLessThan(DYING_TICKS);
    expect(M.ko.flat).toBe(36);
    expect(M.run.radPerPx).toBe(0.32);
    expect(M.cape.run).toBe(0.35);
    expect(M.spin).toMatchObject({ upFrames: 15, downFrames: 30 });
    expect(M.flashFrames).toBe(3);
    expect(M.pulseFrames * M.frameMs).toBeCloseTo(150, 0);
    expect(M.idle.breathMs).toBe(2400);
  });
});
