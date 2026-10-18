// Shelf packing for baked vector frames (016): left to right in rows, a new page when one fills.

export interface Placed {
  page: number;
  x: number;
  y: number;
}

/** Places boxes of `sizes` (px) on pages of `pageSize` square, with `pad` px between. */
export function shelfPack(sizes: readonly (readonly [number, number])[], pageSize: number, pad: number): { placed: Placed[]; pages: { w: number; h: number }[] } {
  const placed: Placed[] = [];
  const pages: { w: number; h: number }[] = [{ w: 0, h: 0 }];
  let x = 0;
  let y = 0;
  let rowH = 0;
  for (const [w, h] of sizes) {
    if (w > pageSize || h > pageSize) throw new Error(`A ${w}×${h} frame can't fit a ${pageSize} px page`);
    if (x + w > pageSize) {
      x = 0;
      y += rowH + pad;
      rowH = 0;
    }
    if (y + h > pageSize) {
      pages.push({ w: 0, h: 0 });
      x = 0;
      y = 0;
      rowH = 0;
    }
    const page = pages.length - 1;
    placed.push({ page, x, y });
    const p = pages[page];
    if (p) {
      p.w = Math.max(p.w, x + w);
      p.h = Math.max(p.h, y + h);
    }
    x += w + pad;
    rowH = Math.max(rowH, h);
  }
  return { placed, pages };
}
