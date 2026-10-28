import { describe, expect, it } from 'vitest';
import { AMMO } from '../../src/data/ammo';
import { AMMO_FX, type AmmoFxTables, type FxBurst } from '../../src/data/ammoFx';
import { DEPTHS } from '../../src/data/assets';
import { FX_LOOK } from '../../src/data/fxQuality';
import { paletteHex } from '../../src/data/palette';
import { roundBase, roundTags, roundTier } from '../../src/data/tags';
import { bombletFx, burstDepth, fxCount, lingers, roundFx, shardFx, shownLook, type RoundLook } from '../../src/render/fx/roundFx';

// 078: a round's look is composed from its family, element, shape and tier rows: the family sets the shape, the
// element the colour, the tier the core and glints. Render has no per-ammo code.

const ALL = Object.keys(AMMO);

/** The look as data, without its id (two rounds share a look if these match). */
const sig = (l: RoundLook) => JSON.stringify({ ...l, id: '' });

function bursts(l: RoundLook): FxBurst[] {
  return [...l.impact.bursts, ...(l.end?.bursts ?? []), ...l.muzzle, ...l.shed.map((s) => s.burst), ...(l.landing ? [l.landing] : [])];
}

function colours(l: RoundLook): string[] {
  const i = l.impact;
  return [
    l.trail.color,
    l.trail.core,
    ...(l.trail.edge ? [l.trail.edge] : []),
    ...bursts(l).flatMap((b) => b.colors),
    ...[i.ring, i.tick, i.star, l.end?.ring].flatMap((f) => (f ? [f.color] : [])),
    ...(i.mark ? [i.mark.color] : []),
    ...(i.shock ? [i.shock.color, ...(i.shock.core ? [i.shock.core] : [])] : []),
  ];
}

describe('roundFx (078)', () => {
  it('resolves every ammo, the Shard and the bomblet to a full look in palette ids, never the telegraph reds', () => {
    const looks = [...ALL.map((id) => roundFx(id)), shardFx('physical', 'stone'), shardFx('cold', 'glass'), bombletFx('bomb+steel+fire+cluster')];
    expect(looks.length).toBeGreaterThan(60);
    for (const l of looks) {
      expect(l.trail.kind, l.id).toBeTruthy();
      expect(l.impact.kind, l.id).toBeTruthy();
      expect(l.impact.bursts.length, l.id).toBeGreaterThan(0);
      expect(l.end === null || l.end.bursts.length > 0, l.id).toBe(true);
      expect(Array.isArray(l.muzzle), l.id).toBe(true);
      expect(l.fallback, l.id).toMatch(/^hit/);
      for (const c of colours(l)) {
        expect(() => paletteHex(c), `${l.id} ${c}`).not.toThrow();
        expect(['danger', 'hit-red'], l.id).not.toContain(c);
      }
    }
  });

  it('reads the family, element, shape and tier off the id', () => {
    const l = roundFx('arrow+stormsteel+frost');
    expect([l.family, l.element, l.shape, l.tier]).toEqual(['arrow', 'frost', null, 'stormsteel']);
    // The spec's example: a water-light streak with a storm-pale core, frost flakes and violet glints.
    expect(l.trail).toMatchObject({ kind: 'streak', color: 'water-light', core: 'storm-pale', edge: 'storm-glow' });
    expect(l.shed.map((s) => s.burst.colors)).toContainEqual(['foam', 'snow', 'water-light']);
    expect(l.impact.bursts.flatMap((b) => b.colors)).toContain('storm-glow');
    for (const id of ALL) {
      const x = roundFx(id);
      expect(x.family).toBe(roundBase(id));
      expect(x.tier).toBe(roundTier(id));
      expect([x.element, x.shape].filter((t) => t !== null)).toEqual(roundTags(id));
    }
  });

  it('keeps the families apart by trail and impact kind, each element by trail colour, each tier by core and glints', () => {
    const kinds = ['arrow', 'ley-bolt', 'bomb', 'landmine'].map((f) => roundFx(f));
    expect(new Set(kinds.map((k) => k.trail.kind)).size).toBe(4);
    expect(new Set(kinds.map((k) => k.impact.kind)).size).toBe(4);
    for (const base of ['arrow', 'ley-bolt', 'bomb', 'landmine']) {
      const colors = ['', '+frost', '+fire', '+lightning'].map((e) => roundFx(base + e).trail.color);
      expect(new Set(colors).size, base).toBe(4);
    }
    for (const [base, tiers] of [['arrow', ['steel', 'stormsteel']], ['bomb', ['steel', 'stormsteel']], ['landmine', ['steel', 'stormsteel']], ['ley-bolt', ['glass', 'storm-glass']]] as const) {
      const stone = roundFx(base);
      for (const t of tiers) {
        const l = roundFx(`${base}+${t}`);
        expect(l.trail.core, `${base}+${t}`).not.toBe(stone.trail.core);
        expect(l.impact.bursts.length, `${base}+${t}`).toBeGreaterThan(stone.impact.bursts.length);
        expect(l.muzzle.length, `${base}+${t}`).toBeGreaterThan(stone.muzzle.length);
      }
    }
  });

  it('never gives two rounds that differ in family, element or tier the same look', () => {
    const seen = new Map<string, string>();
    for (const id of ALL) {
      const s = sig(roundFx(id));
      const twin = seen.get(s);
      expect(twin, `${id} looks like ${twin}`).toBeUndefined();
      seen.set(s, id);
    }
  });

  it('gives homing a wake twice as long, a Split its star and a cluster its bomblets', () => {
    expect(roundFx('ley-bolt+homing').trail.length).toBe(2 * roundFx('ley-bolt').trail.length);
    expect(roundFx('ley-bolt+homing').trail.length).toBe(44);
    expect(roundFx('ley-bolt+split').impact.split).toBe(true);
    expect(roundFx('ley-bolt+split').impact.kind).toBe('ley-splash');
    expect(roundFx('bomb+cluster').impact.cluster).toBe(true);
    expect(roundFx('bomb+cluster').impact.kind).toBe('blast');
  });

  it('takes a Shard’s and a bomblet’s element and tier from its parent', () => {
    expect(shardFx('cold', 'storm-glass')).toMatchObject({ family: 'shard', element: 'frost', tier: 'storm-glass' });
    expect(shardFx('cold', 'storm-glass').trail.color).toBe('water-light');
    expect(shardFx('physical', 'stone').trail.color).toBe('cyan');
    expect(bombletFx('bomb+steel+fire+cluster')).toMatchObject({ family: 'bomblet', element: 'fire', tier: 'steel', shape: null });
  });

  it('changes a blast by element: frost mist and rime, fire’s darker smoke and scorch, lightning’s sparks', () => {
    const smoke = (id: string) => roundFx(id).impact.bursts.find((b) => b.role === 'smoke')?.colors;
    expect(smoke('bomb')).toEqual(['ash-light', 'ash-pale']);
    expect(smoke('bomb+frost')).toEqual(['foam', 'snow', 'water-light']);
    expect(smoke('bomb+fire')).toEqual(['ash', 'ash-dark']);
    expect(roundFx('bomb+frost').impact.mark?.look).toBe('rime');
    expect(roundFx('bomb+fire').impact.mark?.alpha).toBe(0.45);
    expect(roundFx('bomb+lightning').impact.bursts.length).toBe(roundFx('bomb').impact.bursts.length + 1);
    expect(roundFx('bomb+lightning').impact.star).toBeUndefined();
    expect(roundFx('arrow+lightning').impact.star?.look).toBe('star');
    expect(roundFx('ley-bolt+frost').impact.mark?.look).toBe('rime');
    expect(roundFx('bomb+steel').impact.shock?.core).toBe('iron-light');
  });

  it('gives a made-up tag row and tier row their looks with no code change', () => {
    const tables: AmmoFxTables = {
      ...AMMO_FX,
      elements: { ...AMMO_FX.elements, acid: { trail: { color: 'leaf-light', core: 'sun' }, shed: null, impact: [{ colors: ['leaf-light'], count: 4, speed: [20, 60], gravity: 100, lifeMs: [200, 300], size: 2 }], blast: { add: [] }, muzzle: 'leaf-light' } },
      tiers: { ...AMMO_FX.tiers, mithril: { core: 'gold-trim', edge: 'snow', impact: [{ colors: ['gold-trim'], count: 3, speed: [20, 60], gravity: 0, lifeMs: [100, 200], size: 1 }], muzzle: [] } },
    };
    const l = roundFx('arrow+mithril+acid', tables);
    expect([l.family, l.element, l.tier]).toEqual(['arrow', 'acid', 'mithril']);
    expect(l.trail).toMatchObject({ color: 'leaf-light', core: 'gold-trim', edge: 'snow' });
    expect(l.impact.bursts.flatMap((b) => b.colors)).toEqual(expect.arrayContaining(['leaf-light', 'gold-trim']));
    expect(sig(roundFx('ley-bolt+acid', tables))).not.toBe(sig(roundFx('ley-bolt', tables)));
    expect(() => roundFx('arrow+nonsense')).toThrow();
  });

  it('scales counts by tier: Low ×0.5 rounded down (an impact keeps 1), Medium as given, High ×1.25 rounded', () => {
    expect([fxCount(5, 'low', true), fxCount(5, 'medium', true), fxCount(5, 'high', true)]).toEqual([2, 5, 6]);
    expect([fxCount(1, 'low', true), fxCount(1, 'low', false)]).toEqual([1, 0]);
    expect([fxCount(14, 'low', false), fxCount(14, 'high', false), fxCount(10, 'high', true)]).toEqual([7, 18, 13]);
  });

  it('with Flashes off draws no 078 flash, crackle or flicker, and keeps everything else', () => {
    for (const id of ['arrow+lightning', 'ley-bolt+fire', 'arrow', 'ley-bolt']) {
      const on = roundFx(id);
      const off = shownLook(on, false);
      expect(off.impact.ring ?? off.impact.tick ?? off.impact.star ?? off.end?.ring, id).toBeUndefined();
      expect([off.trail.flicker, off.trail.jitter], id).toEqual([0, 0]);
      expect(off.impact.bursts, id).toEqual(on.impact.bursts);
      expect(off.trail.color, id).toBe(on.trail.color);
      expect(shownLook(on, true), id).toBe(on);
    }
    expect(roundFx('arrow+lightning').trail.jitter).toBe(1.5);
    expect(roundFx('arrow+fire').trail.flicker).toBe(0.15);
  });

  it('puts every lingering bit under the telegraphs; short sparks sort behind the struck enemy, ends and blasts at their ground point', () => {
    for (const id of ALL) {
      const l = roundFx(id);
      for (const b of bursts(l)) {
        const d = burstDepth(b, 300, 320);
        if (b.lifeMs[1] > FX_LOOK.sparkMs) expect(d, id).toBe(DEPTHS.shotTrail);
        else expect(d, id).toBe(320 - FX_LOOK.behind);
        expect(burstDepth(b, 300, null), id).toBe(lingers(b) ? DEPTHS.shotTrail : 300);
      }
    }
    expect(lingers(roundFx('bomb').impact.bursts[1] as FxBurst)).toBe(true);
    expect(lingers(roundFx('arrow').impact.bursts[0] as FxBurst)).toBe(false);
    expect(DEPTHS.shotTrail).toBeLessThan(DEPTHS.groundFx);
    expect(DEPTHS.shotMark).toBeLessThan(DEPTHS.groundFx);
  });
});
