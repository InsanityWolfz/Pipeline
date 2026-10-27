import { describe, expect, it } from 'vitest';
import { LIGHT_CATCH } from '../../src/data/lights';
import { catchAt, falloff } from '../../src/render/lighting/lightCatch';
import { hexToRgb, paletteHex } from '../../src/data/palette';

const colorOf = (id: string): number => {
  const [r, g, b] = hexToRgb(paletteHex(id));
  return (r << 16) | (g << 8) | b;
};

// 074: the light catch, an additive copy of a sprite's frame in the light's colour, its alpha the falloff at its feet.

const light = (x: number, color = 'cyan', intensity = 1, radius = 40) => ({ x, y: 0, radius, color, intensity });

describe('the light catch (074)', () => {
  it('falls off from 1 at the light to 0 at its radius', () => {
    expect(falloff(0, 40)).toBe(1);
    expect(falloff(20, 40)).toBeCloseTo(0.75, 5);
    expect(falloff(40, 40)).toBe(0);
    expect(falloff(80, 40)).toBe(0);
  });

  it('is none outside every light, and none on Low', () => {
    expect(catchAt(100, 0, [light(0)], 'medium')).toBeNull();
    expect(catchAt(0, 0, [light(0)], 'low')).toBeNull();
  });

  it('takes the light’s colour, at most 0.35 alpha', () => {
    const c = catchAt(0, 0, [light(0, 'cyan', 4)], 'medium');
    expect(c?.color).toBe(colorOf('cyan'));
    expect(c?.alpha).toBe(LIGHT_CATCH.maxAlpha);
    const soft = catchAt(20, 0, [light(0, 'cyan', 0.5)], 'high');
    expect(soft?.alpha).toBeCloseTo(0.75 * 0.5 * LIGHT_CATCH.gain, 5);
  });

  it('mixes only the two nearest lights', () => {
    const two = catchAt(0, 0, [light(5, 'cyan', 0.2), light(-5, 'cyan', 0.2), light(1, 'cinder', 0.2, 1)], 'high');
    const three = catchAt(0, 0, [light(5, 'cyan', 0.2), light(-5, 'cyan', 0.2), light(30, 'cinder', 0.2)], 'high');
    expect(two?.color).toBe(colorOf('cyan'));
    expect(three?.color).toBe(colorOf('cyan'));
    expect(three?.alpha).toBeCloseTo(two?.alpha ?? 0, 5);
  });
});
