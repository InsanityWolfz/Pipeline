// Renders every sprite grid into one atlas (PNG + Phaser JSON Hash) and writes
// review images: the palette swatch sheet and each sprite at 4x.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { PALETTE } from '../../src/data/palette.ts';
import { parseSprite } from './parse.ts';
import { encodePng } from './png.ts';

const ATLAS_NAME = 'sprites';
const ATLAS_MAX_WIDTH = 512;
const PADDING = 1;
const REVIEW_SCALE = 4;
const REVIEW_BACKGROUND = 'slate-dark';
const SWATCH = { size: 32, gap: 4, columns: 6 };

interface Frame {
  name: string;
  width: number;
  height: number;
  pixels: Uint8Array;
}

interface Image {
  width: number;
  height: number;
  pixels: Uint8Array;
}

function rgb(id: string): number[] {
  const hex = PALETTE.find((c) => c.id === id)?.hex ?? '#000000';
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

function blit(target: Image, source: Image, left: number, top: number, scale = 1): void {
  for (let y = 0; y < source.height * scale; y++) {
    for (let x = 0; x < source.width * scale; x++) {
      const from = (Math.floor(y / scale) * source.width + Math.floor(x / scale)) * 4;
      if ((source.pixels[from + 3] ?? 0) === 0) continue;
      target.pixels.set(source.pixels.subarray(from, from + 4), ((top + y) * target.width + left + x) * 4);
    }
  }
}

function filled(width: number, height: number, color: number[]): Image {
  const pixels = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) pixels.set([...color, 255], i * 4);
  return { width, height, pixels };
}

/** Shelf-packs frames left to right, tallest first. */
function pack(frames: Frame[]): { atlas: Image; placed: Map<string, { x: number; y: number }> } {
  const sorted = [...frames].sort((a, b) => b.height - a.height || a.name.localeCompare(b.name));
  const placed = new Map<string, { x: number; y: number }>();
  let x = 0;
  let y = 0;
  let shelf = 0;
  let width = 0;
  for (const frame of sorted) {
    if (x > 0 && x + frame.width > ATLAS_MAX_WIDTH) {
      x = 0;
      y += shelf + PADDING;
      shelf = 0;
    }
    placed.set(frame.name, { x, y });
    x += frame.width + PADDING;
    shelf = Math.max(shelf, frame.height);
    width = Math.max(width, x - PADDING);
  }
  const atlas = { width: Math.max(width, 1), height: Math.max(y + shelf, 1), pixels: new Uint8Array() };
  atlas.pixels = new Uint8Array(atlas.width * atlas.height * 4);
  for (const frame of sorted) {
    const at = placed.get(frame.name);
    if (at) blit(atlas, frame, at.x, at.y);
  }
  return { atlas, placed };
}

function paletteSheet(): Image {
  const rows = Math.ceil(PALETTE.length / SWATCH.columns);
  const step = SWATCH.size + SWATCH.gap;
  const sheet = filled(SWATCH.columns * step + SWATCH.gap, rows * step + SWATCH.gap, rgb('outline'));
  PALETTE.forEach((color, i) => {
    const swatch = filled(SWATCH.size, SWATCH.size, rgb(color.id));
    blit(sheet, swatch, SWATCH.gap + (i % SWATCH.columns) * step, SWATCH.gap + Math.floor(i / SWATCH.columns) * step);
  });
  return sheet;
}

export function buildArt(spritesDir: string, outDir: string): string[] {
  const frames: Frame[] = [];
  const reviewDir = join(outDir, 'review');
  mkdirSync(reviewDir, { recursive: true });

  const files = readdirSync(spritesDir).filter((f) => f.endsWith('.txt')).sort();
  for (const file of files) {
    const key = basename(file, '.txt');
    const sprite = parseSprite(readFileSync(join(spritesDir, file), 'utf8'), file);
    sprite.frames.forEach((pixels, i) => {
      const name = sprite.frames.length === 1 ? key : `${key}/${i}`;
      frames.push({ name, width: sprite.width, height: sprite.height, pixels });
    });

    // Review strip: every frame side by side at 4x on a dark background.
    const cell = { width: sprite.width * REVIEW_SCALE, height: sprite.height * REVIEW_SCALE };
    const review = filled((cell.width + 8) * sprite.frames.length + 8, cell.height + 16, rgb(REVIEW_BACKGROUND));
    sprite.frames.forEach((pixels, i) => {
      blit(review, { width: sprite.width, height: sprite.height, pixels }, 8 + i * (cell.width + 8), 8, REVIEW_SCALE);
    });
    writeFileSync(join(reviewDir, `${key}.png`), encodePng(review.width, review.height, review.pixels));
  }

  const { atlas, placed } = pack(frames);
  const json = {
    frames: Object.fromEntries(
      frames.map((f) => {
        const at = placed.get(f.name) ?? { x: 0, y: 0 };
        return [
          f.name,
          {
            frame: { x: at.x, y: at.y, w: f.width, h: f.height },
            rotated: false,
            trimmed: false,
            spriteSourceSize: { x: 0, y: 0, w: f.width, h: f.height },
            sourceSize: { w: f.width, h: f.height },
          },
        ];
      }),
    ),
    meta: { image: `${ATLAS_NAME}.png`, size: { w: atlas.width, h: atlas.height }, scale: '1' },
  };
  writeFileSync(join(outDir, `${ATLAS_NAME}.png`), encodePng(atlas.width, atlas.height, atlas.pixels));
  writeFileSync(join(outDir, `${ATLAS_NAME}.json`), `${JSON.stringify(json, null, 2)}\n`);

  const sheet = paletteSheet();
  writeFileSync(join(reviewDir, 'palette.png'), encodePng(sheet.width, sheet.height, sheet.pixels));
  return frames.map((f) => f.name);
}
