import { describe, expect, it } from 'vitest';
import { FOUNDRY_FX_CAP, FORGE_FX_MAX, HEAT, LEY_PULSE, QUENCH, SPARKS, STEAM } from '../../src/data/foundryFx';
import { DEATH_MOTES, PARTICLE_BUDGET, AMBIENT } from '../../src/data/juice';
import { FOUNDRY_LIGHTS } from '../../src/data/lights';
import { FOUNDRY_MOOD } from '../../src/data/moods';
import { paletteHex } from '../../src/data/palette';
import { PIECES } from '../../src/data/pieces';
import { PROPS } from '../../src/data/props';
import { STATIC_ROOMS, TILE } from '../../src/data/rooms';
import * as juice from '../../src/data/juice';
import { QUALITY_TIERS } from '../../src/data/settings';

// 079: the foundry's mood, lights, heat, steam, sparks and ley pulses as data: palette ids, the wash under 074's cap,
// real machines, the particle cap inside the shared budget, and the torches on the foundry's side walls.

const isPaletteId = (id: string): boolean => {
  try {
    paletteHex(id);
    return true;
  } catch {
    return false;
  }
};

const foundry = STATIC_ROOMS.foundry;
if (!foundry) throw new Error('no foundry');

describe('the foundry’s mood (079)', () => {
  it('is warm resin air at 0.55, a 0.05 flame-dark wash (under 074’s 0.06 cap) and no fog', () => {
    expect(FOUNDRY_MOOD.ambient).toEqual({ color: 'resin', darkness: 0.55 });
    expect(FOUNDRY_MOOD.wash).toEqual({ color: 'flame-dark', alpha: 0.05 });
    expect(FOUNDRY_MOOD.wash.alpha).toBeLessThanOrEqual(0.06);
    expect(FOUNDRY_MOOD.fog).toBeNull();
    expect(FOUNDRY_MOOD.lightScale).toBe(1);
  });

  it('retires 014’s room tint: ROOM_MOOD is gone', () => {
    expect('ROOM_MOOD' in juice).toBe(false);
  });

  it('uses palette ids for every colour in the mood, the lights and the effects', () => {
    const lights = [...Object.values(FOUNDRY_LIGHTS.walls), FOUNDRY_LIGHTS.intake, ...Object.values(FOUNDRY_LIGHTS.machines)];
    const ids = [
      FOUNDRY_MOOD.ambient.color,
      FOUNDRY_MOOD.wash.color,
      FOUNDRY_MOOD.lights.ley,
      FOUNDRY_MOOD.lights.fire,
      FOUNDRY_MOOD.lights.accent,
      ...lights.map((l) => l.color),
      HEAT.glow.color,
      ...STEAM.colors,
      ...QUENCH.colors,
      LEY_PULSE.color,
    ];
    for (const id of ids) expect(isPaletteId(id), id).toBe(true);
  });

  it('names real machines, all of them in the Forge group, and gives each running-hot machine its points', () => {
    const forge = (id: string) => {
      const p = PIECES[id];
      return p?.kind === 'machine' && p.category === 'forge';
    };
    for (const id of [...HEAT.machines, ...SPARKS.machines, ...Object.keys(FOUNDRY_LIGHTS.machines)]) expect(forge(id), id).toBe(true);
    for (const id of HEAT.machines) expect(HEAT.fire[id], id).toBeDefined();
    for (const id of SPARKS.machines) expect(SPARKS.at[id], id).toBeDefined();
    // The coil burns no fire: no heat or steam, but its light and sparks.
    expect(HEAT.machines).not.toContain('tempering-coil');
    expect(SPARKS.machines).toContain('tempering-coil');
  });

  it('keeps walls before machines, and every flicker within ±15%', () => {
    for (const w of Object.values(FOUNDRY_LIGHTS.walls)) expect(w.priority).toBeLessThan(Math.min(...Object.values(FOUNDRY_LIGHTS.machines).map((m) => m.priority)));
    expect(FOUNDRY_LIGHTS.intake.priority).toBe(2);
    for (const l of [...Object.values(FOUNDRY_LIGHTS.walls), ...Object.values(FOUNDRY_LIGHTS.machines)]) expect(l.flicker).toBeLessThanOrEqual(0.15);
    expect(FOUNDRY_LIGHTS.machines['tempering-coil']?.steadyWithoutFlashes).toBe(true);
  });

  it('fits the foundry’s particles in weather’s share: cap plus the death motes’ cap within the budget, the motes inside it', () => {
    for (const q of QUALITY_TIERS) {
      expect(FOUNDRY_FX_CAP[q] + DEATH_MOTES.liveCap[q], q).toBeLessThanOrEqual(PARTICLE_BUDGET[q]);
      expect(AMBIENT.motes, q).toBeLessThan(FOUNDRY_FX_CAP[q]);
    }
    expect(FOUNDRY_FX_CAP).toEqual({ low: 40, medium: 100, high: 160 });
    expect(FORGE_FX_MAX).toEqual({ low: 4, medium: 8, high: 12 });
  });

  it('keeps steam soft (alpha at most 0.35) and the shimmer faint (at most 0.25, none on Low)', () => {
    expect(Math.max(...STEAM.alpha, ...QUENCH.alpha)).toBeLessThanOrEqual(0.35);
    expect(HEAT.shimmer.alpha.low).toBe(0);
    for (const q of QUALITY_TIERS) expect(HEAT.shimmer.alpha[q]).toBeLessThanOrEqual(0.25);
    expect(LEY_PULSE.live.low).toBe(0);
  });

  it('gives every prop light a light, and only fires carry one', () => {
    for (const [id, def] of Object.entries(PROPS)) {
      if (!def.light) continue;
      expect(FOUNDRY_LIGHTS.walls[def.light], id).toBeDefined();
      expect(def.glow?.color, id).toBe('cinder');
    }
    expect(PROPS.brazier.light).toBe('brazier');
    expect(PROPS.torch.light).toBe('torch');
  });

  it('stands the four torches on the foundry’s side walls, with floor beside them', () => {
    const torches = (foundry.props ?? []).filter((p) => p.propId === 'torch');
    expect(torches.map((t) => [t.tx, t.ty])).toEqual([
      [0, 4],
      [0, 11],
      [23, 6],
      [23, 13],
    ]);
    for (const t of torches) {
      const row = foundry.rows[t.ty] ?? '';
      expect(row[t.tx], `${t.tx},${t.ty}`).toBe(TILE.wall);
      const inward = t.tx === 0 ? 1 : t.tx - 1;
      expect(row[inward], `${t.tx},${t.ty}`).toBe(TILE.floor);
    }
  });
});
