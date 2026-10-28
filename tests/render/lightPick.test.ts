import { describe, expect, it } from 'vitest';
import { pickLights, type LightCandidate } from '../../src/render/lighting/lightPick';

// 074: render picks the lights in view by priority, then by distance from the camera's centre, up to the tier's budget.

const at = (source: LightCandidate['source'], priority: number, x: number, y = 0): LightCandidate => ({ source, priority, x, y, radius: 40, color: 'cyan', intensity: 1 });
const centre = { x: 0, y: 0 };

describe('pickLights (074)', () => {
  it('places none on Low', () => {
    expect(pickLights([at('face', 0, 0)], 'low', centre)).toEqual([]);
  });

  it('keeps at most 8 on Medium and 16 on High', () => {
    const many = Array.from({ length: 40 }, (_, i) => at('leyLine', 3, i * 10));
    expect(pickLights(many, 'medium', centre)).toHaveLength(8);
    expect(pickLights(many, 'high', centre)).toHaveLength(16);
  });

  it('never drops a higher priority light for a lower one, and breaks ties by distance from the centre', () => {
    const lights = [at('leyLine', 3, 1), ...Array.from({ length: 10 }, (_, i) => at('burst', 2, 500 + i)), at('face', 0, 900)];
    const picked = pickLights(lights, 'medium', centre);
    expect(picked[0]?.source).toBe('face');
    expect(picked.filter((l) => l.source === 'leyLine')).toHaveLength(0);
    expect(picked.slice(1).map((l) => l.x)).toEqual([500, 501, 502, 503, 504, 505, 506]);
  });

  it('places rounds in flight on High only', () => {
    expect(pickLights([at('round', 4, 0)], 'medium', centre)).toEqual([]);
    expect(pickLights([at('round', 4, 0)], 'high', centre)).toHaveLength(1);
  });
});
