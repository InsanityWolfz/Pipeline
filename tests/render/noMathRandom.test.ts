import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// 077: placement is a pure function of the map and its hashes, and weather, ripples and lightning come from a seeded
// render-side stream: none of 077's files calls Math.random.

const root = join(__dirname, '../..');
const dir = (d: string) => readdirSync(join(root, d)).filter((f) => f.endsWith('.ts')).map((f) => join(d, f));
const FILES = [
  ...dir('src/render/world'),
  'src/data/decor.ts',
  'src/data/setPieces.ts',
  'src/data/ambient.ts',
  'src/data/weather.ts',
  'src/data/worldArtAssets.ts',
  ...readdirSync(join(root, 'src/data/art')).filter((f) => /^(decor|setPieces|worldArt)/.test(f)).map((f) => join('src/data/art', f)),
];

describe('no Math.random in 077’s files', () => {
  it('lists the world-life files', () => {
    expect(FILES.length).toBeGreaterThan(12);
  });

  it.each(FILES)('%s', (f) => {
    expect(readFileSync(join(root, f), 'utf8')).not.toMatch(/Math\.random/);
  });
});
