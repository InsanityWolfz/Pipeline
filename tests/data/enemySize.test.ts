import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ENEMY_RIGS } from '../../src/data/art/enemies';
import { ENEMIES } from '../../src/data/enemies';
import { drawnHeight } from '../../src/render/vector/enemyBounds';

// 076: the redraw keeps every enemy's size. Its feet box, hurtbox and rig scale equal main's, and its idle drawn
// height in each view is within ±10% of main's (enemySize.json, written with RECORD_076=1 on main's rigs).

const FILE = 'tests/data/enemySize.json';
const VIEWS = ['side', 'down', 'up'] as const;
const TOLERANCE = 0.1;

interface Size {
  feetBox: unknown;
  hurtbox: unknown;
  scale: number;
  idle: Record<(typeof VIEWS)[number], number>;
}

function measure(): Record<string, Size> {
  const out: Record<string, Size> = {};
  for (const def of Object.values(ENEMIES)) {
    const rig = ENEMY_RIGS.find((r) => r.id === def.anims);
    const idle = rig?.poses.idle?.[0];
    if (!rig || !idle) throw new Error(def.id);
    const h = Object.fromEntries(VIEWS.map((v) => [v, Math.round(drawnHeight(rig, v, idle) * 10) / 10])) as Size['idle'];
    out[def.id] = { feetBox: def.feetBox, hurtbox: def.hurtbox, scale: rig.scale, idle: h };
  }
  return out;
}

describe('076: enemy size', () => {
  it("keeps main's feet boxes, hurtboxes, scales and idle heights (±10%)", () => {
    const now = measure();
    if (process.env.RECORD_076 === '1') writeFileSync(FILE, `{\n${Object.entries(now).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n')}\n}\n`);
    const main = JSON.parse(readFileSync(FILE, 'utf8')) as Record<string, Size>;
    expect(Object.keys(now).sort()).toEqual(Object.keys(main).sort());
    for (const [id, m] of Object.entries(main)) {
      const n = now[id];
      if (!n) continue;
      expect({ feetBox: n.feetBox, hurtbox: n.hurtbox, scale: n.scale }, id).toEqual({ feetBox: m.feetBox, hurtbox: m.hurtbox, scale: m.scale });
      for (const v of VIEWS) {
        expect(n.idle[v], `${id} ${v}`).toBeGreaterThanOrEqual(m.idle[v] * (1 - TOLERANCE));
        expect(n.idle[v], `${id} ${v}`).toBeLessThanOrEqual(m.idle[v] * (1 + TOLERANCE));
      }
    }
  });
});
