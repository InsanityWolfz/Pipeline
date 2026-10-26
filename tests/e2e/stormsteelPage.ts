import type { Page } from '@playwright/test';
import { boot } from './helpers';

// 066's e2e scene, with ?playtest (every machine unlocked, plenty of raws and stormglass; the kit leaves the tier parts
// out, so ley-steel is smelted by hand first): a stormsteel arrow line built into the intake's open entrance.

/**
 * Boots ?playtest, smelts ley-steel at the bench, walks into the foundry and builds, through the sim's commands as the
 * build bar would, a stormsteel arrow line into the intake's open entrance (its mouth at tile 12, 0):
 * - the assembler across tiles 11–13 of row 1, facing up into the mouth;
 * - behind it, a hopper of shafts, the knapper and a hopper of rope;
 * - the Tempering coil behind the knapper, fed ley-steel by a hopper behind it and stormglass by a hopper at its side.
 * The hoppers are filled by hand (E), and it runs until the entrance holds stormsteel arrows. Returns the coil's id.
 */
export async function stormsteelArrowLine(page: Page): Promise<number> {
  await boot(page, '?playtest');
  return page.evaluate(() => {
    const g = window.__GAME__;
    const h = window.__helpers;
    if (!g || !h) throw new Error('no game');
    for (let i = 0; i < 10; i++) g.craft('ley-steel');
    h.toFoundry();
    h.walkTo(16.5 * 32, 7.5 * 32);
    const pieces: [string, number, number, 'up' | 'right'][] = [
      ['assembler', 12, 1, 'up'],
      ['hopper', 11, 2, 'up'],
      ['knapper', 12, 2, 'up'],
      ['hopper', 13, 2, 'up'],
      ['tempering-coil', 12, 3, 'up'],
      ['hopper', 12, 4, 'up'],
      ['hopper', 11, 3, 'right'],
    ];
    for (const [pieceId, tx, ty, facing] of pieces) g.step(1, { place: { pieceId, tx, ty, facing } });
    let s = g.step(1);
    if (s.foundry.pieces.length !== pieces.length) throw new Error(`placed ${s.foundry.pieces.length}: ${JSON.stringify(s.events)}`);
    const at = (tx: number, ty: number) => s.foundry.pieces.find((p) => p.tx === tx && p.ty === ty);
    // Each hopper filled from beside it, in reach for E.
    const fills: [number, number, string, number, number][] = [
      [11, 2, 'shaft', 10.2, 2.5],
      [13, 2, 'rope', 14.8, 2.5],
      [12, 4, 'ley-steel', 13.8, 4.5],
      [11, 3, 'stormglass', 10.2, 3.5],
    ];
    for (const [tx, ty, itemId, wx, wy] of fills) {
      h.walkTo(wx * 32, wy * 32);
      s = g.step(1, { deposit: { id: at(tx, ty)?.id ?? -1, itemId, amount: 'half' } });
    }
    // Clear of the line, below and beside it, so the camera holds the whole line.
    h.walkTo(8.5 * 32, 5.5 * 32);
    for (let t = 0; t < 1200 && !s.intake.entrances.some((e) => e.ammo === 'arrow+stormsteel' && e.count > 0); t++) s = g.step(1);
    if (!s.intake.entrances.some((e) => e.ammo === 'arrow+stormsteel')) throw new Error(`no stormsteel arrows reached the intake: ${JSON.stringify(s.intake)}`);
    return at(12, 3)?.id ?? -1;
  });
}
