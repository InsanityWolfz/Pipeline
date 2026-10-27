import { WANDERER_SCHEMES, type WandererSchemeId, type WandererView } from '../../data/art/wanderer';
import { RARITY_ORDER, type Rarity } from '../../data/gear';
import { STILL, wandererMotion, type WandererClocks } from './wandererMotion';
import type { WandererPose } from './wandererPose';

// The contact sheet's wanderer (016, redone for 075): every pose and strip the spec's table lists, per view, each
// sampled from `wandererMotion` at fixed clocks, so the sheet shows exactly what the game draws.

const AIM: Record<WandererView, number> = { side: 0.15, down: Math.PI / 2, up: -Math.PI / 2 };

export interface SheetStrip {
  title: string;
  cells: { label: string; pose: WandererPose }[];
}

/** The strips for one view, in the table's order. */
export function sheetSections(view: WandererView): SheetStrip[] {
  const base: WandererClocks = { ...STILL, view, aim: AIM[view] };
  const at = (c: Partial<WandererClocks>): WandererPose => wandererMotion({ ...base, ...c });
  const running: Partial<WandererClocks> = { moving: 30, speed: 1 };
  const firing: Partial<WandererClocks> = { firing: 30, shots: [12], shotCount: 4 };
  const strip = (title: string, cells: [string, Partial<WandererClocks>][]): SheetStrip => ({ title, cells: cells.map(([label, c]) => ({ label, pose: at(c) })) });
  const strips: SheetStrip[] = [
    strip('idle breath', [0, 1, 2, 3].map((i) => [`breath ${i}`, { ms: i * 600 }])),
    strip('run cycle', [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [`run ${i}`, { ...running, stride: (i * Math.PI) / 4 }])),
    strip('strafe walk', [0, 1, 2, 3].map((i) => [`strafe ${i}`, { ...running, ...firing, speed: 0.6, stride: (i * Math.PI) / 2, ms: i * 80 }])),
    strip('stop settle', [['settle 0', { stopped: 1, stride: Math.PI / 2 }], ['settle 1', { stopped: 4, stride: Math.PI / 2 }]]),
    strip('firing brace', [['dip', { firing: 1, shots: [1] }], ['overshoot', { firing: 6, shots: [6] }], ['held', { firing: 30, shots: [12] }]]),
    strip('shot recoil', [0, 1, 3, 6].map((t) => [`recoil ${t}`, { ...firing, shots: [t] }])),
    strip('barrel spin', [0, 1, 2].map((i) => [`spin ${i}`, { ...firing, spin: (i * Math.PI * 2) / 9 }])),
    strip('muzzle flash', [0, 1, 2].map((t) => [`flash ${t}`, { ...firing, shots: [t], shotCount: 1 }])),
    strip('hose pulse', [1, 4, 7].map((t) => [`pulse ${t}`, { ...firing, shots: [t] }])),
    strip('roll', [1, 4, 7, 10, 13, 17].map((r) => [`roll ${r}`, { roll: r }])),
    strip('hit', [0, 2, 5].map((h) => [`hit ${h}`, { hit: h }])),
    strip('ko', [5, 16, 27, 33, 40, 59].map((k) => [`ko ${k}`, { ko: k }])),
    strip('tube states', [
      ['dormant', { attuned: false }],
      ['attuning', { attuned: false, attuning: 0.55 }],
      ['no tube', { hasTube: false }],
      ['tube jab', { jab: 1 }],
      ['punch', { hasTube: false, jab: 1 }],
    ]),
  ];
  if (view === 'side') {
    strips.push(
      strip('facing left', [
        ['idle', { flip: true }],
        ['run', { flip: true, ...running, stride: Math.PI / 4 }],
        ['shot', { flip: true, ...firing, shots: [0] }],
        ['hit', { flip: true, hit: 0 }],
        ['ko', { flip: true, ko: 59 }],
      ]),
    );
  }
  strips.push(
    strip('rarity trim', ([null, ...RARITY_ORDER] as (Rarity | null)[]).map((r) => [r ?? 'none', { trim: r, ms: 250 }])),
    strip('schemes', (Object.keys(WANDERER_SCHEMES) as WandererSchemeId[]).map((s) => [s, { scheme: s }])),
  );
  return strips;
}
