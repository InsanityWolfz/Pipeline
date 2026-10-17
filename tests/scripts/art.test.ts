import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { parseSprite } from '../../scripts/art/parse';
import { encodePng } from '../../scripts/art/png';
import { PALETTE } from '../../src/data/palette';

const a = PALETTE[0]?.char ?? '';
const b = PALETTE[1]?.char ?? '';

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
    const hex = PALETTE[0]?.hex ?? '';
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
