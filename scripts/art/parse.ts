// Parses a sprite grid file: optional `#` comment lines, then rows of palette
// symbols (one per pixel, `.` transparent). Animation frames are separated by `---`.
import { hexToRgb, PIXEL_PALETTE, TRANSPARENT } from '../../src/data/palette.ts';

export interface ParsedSprite {
  width: number;
  height: number;
  /** One RGBA buffer per frame, width * height * 4 bytes. */
  frames: Uint8Array[];
}

const COLORS = new Map(PIXEL_PALETTE.map((c) => [c.char, hexToRgb(c.hex)]));

interface Row {
  text: string;
  line: number;
}

export function parseSprite(source: string, file: string): ParsedSprite {
  const groups: Row[][] = [[]];
  source.split(/\r?\n/).forEach((text, index) => {
    const line = index + 1;
    if (text.startsWith('#') || text.trim() === '') return;
    if (text.trim() === '---') {
      groups.push([]);
      return;
    }
    groups[groups.length - 1]?.push({ text: text.trimEnd(), line });
  });

  const rowsPerFrame = groups.filter((rows) => rows.length > 0);
  const first = rowsPerFrame[0];
  if (!first || rowsPerFrame.length !== groups.length) {
    throw new Error(`${file}: every frame needs at least one row`);
  }
  const width = first[0]?.text.length ?? 0;
  const height = first.length;

  const frames = rowsPerFrame.map((rows, frameIndex) => {
    if (rows.length !== height) {
      throw new Error(`${file}: frame ${frameIndex} is ${rows.length} rows tall, expected ${height}`);
    }
    const pixels = new Uint8Array(width * height * 4);
    rows.forEach((row, y) => {
      if (row.text.length !== width) {
        throw new Error(`${file}:${row.line}: row is ${row.text.length} pixels wide, expected ${width}`);
      }
      [...row.text].forEach((char, x) => {
        if (char === TRANSPARENT) return;
        const rgb = COLORS.get(char);
        if (!rgb) throw new Error(`${file}:${row.line}:${x + 1}: unknown palette character '${char}'`);
        pixels.set([...rgb, 255], (y * width + x) * 4);
      });
    });
    return pixels;
  });

  return { width, height, frames };
}
