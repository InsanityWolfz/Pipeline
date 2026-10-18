import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { buildArt } from '../../scripts/art/build';
import { parseSprite } from '../../scripts/art/parse';
import { ATLAS_KEY } from '../../src/data/assets';
import { encodePng } from '../../scripts/art/png';
import { PIXEL_PALETTE } from '../../src/data/palette';

const a = PIXEL_PALETTE[0]?.char ?? '';
const b = PIXEL_PALETTE[1]?.char ?? '';

describe('sprite grid parser', () => {
  it('reads a single-frame sprite, skipping comments', () => {
    const sprite = parseSprite(`# a comment\n${a}${b}.\n.${a}${b}\n`, 'one.txt');
    expect(sprite.width).toBe(3);
    expect(sprite.height).toBe(2);
    expect(sprite.frames).toHaveLength(1);
  });

  it('reads animation frames separated by ---', () => {
    const sprite = parseSprite(`${a}${a}\n${b}${b}\n---\n${b}${b}\n${a}${a}\n`, 'anim.txt');
    expect(sprite.frames).toHaveLength(2);
    expect(sprite.width).toBe(2);
    expect(sprite.height).toBe(2);
  });

  it('turns grids into RGBA pixels with transparency', () => {
    const sprite = parseSprite(`${a}.\n`, 'px.txt');
    const pixels = sprite.frames[0];
    const hex = PIXEL_PALETTE[0]?.hex ?? '';
    expect(pixels?.[0]).toBe(parseInt(hex.slice(1, 3), 16));
    expect(pixels?.[3]).toBe(255);
    expect(pixels?.[7]).toBe(0);
  });

  it('rejects an unknown character with file, line and column', () => {
    expect(() => parseSprite(`# c\n${a}${a}\n${a}~\n`, 'bad.txt')).toThrow(/bad\.txt:3:2.*'~'/);
  });

  it('rejects ragged rows', () => {
    expect(() => parseSprite(`${a}${a}\n${a}\n`, 'ragged.txt')).toThrow(/ragged\.txt:2/);
  });

  it('rejects frames of different sizes', () => {
    expect(() => parseSprite(`${a}${a}\n---\n${a}\n`, 'frames.txt')).toThrow(/frames\.txt/);
  });
});

describe('png encoder', () => {
  it('writes a PNG with the right size and pixels', () => {
    const rgba = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 255, 0]);
    const png = encodePng(3, 1, rgba);
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(png.subarray(12, 16).toString('ascii')).toBe('IHDR');
    expect(png.readUInt32BE(16)).toBe(3);
    expect(png.readUInt32BE(20)).toBe(1);
    const idatLength = png.readUInt32BE(33);
    expect(png.subarray(37, 41).toString('ascii')).toBe('IDAT');
    const raw = inflateSync(png.subarray(41, 41 + idatLength));
    expect([...raw]).toEqual([0, ...rgba]);
  });
});

describe('art build', () => {
  it('packs single and animated sprites into an atlas', () => {
    const dir = mkdtempSync(join(tmpdir(), 'art-'));
    const sprites = join(dir, 'sprites');
    mkdirSync(sprites);
    writeFileSync(join(sprites, 'dot.txt'), `${a}\n`);
    writeFileSync(join(sprites, 'blink.txt'), `${a}${b}\n---\n${b}${a}\n`);
    const names = buildArt(sprites, join(dir, 'build'));

    expect(names.sort()).toEqual(['blink/0', 'blink/1', 'dot']);
    const atlas = JSON.parse(readFileSync(join(dir, 'build', `${ATLAS_KEY}.json`), 'utf8')) as {
      frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
    };
    expect(atlas.frames['blink/1']?.frame).toMatchObject({ w: 2, h: 1 });
    expect(atlas.frames.dot?.frame).toMatchObject({ w: 1, h: 1 });
    rmSync(dir, { recursive: true });
  });

  it('matches the committed atlas, so sprites were rebuilt after editing', () => {
    const out = mkdtempSync(join(tmpdir(), 'art-'));
    buildArt('assets/sprites', out);
    for (const file of [`${ATLAS_KEY}.png`, `${ATLAS_KEY}.json`]) {
      expect(readFileSync(join(out, file)).equals(readFileSync(join('assets/build', file))), `${file} is stale: run npm run art`).toBe(true);
    }
    rmSync(out, { recursive: true });
  });
});
