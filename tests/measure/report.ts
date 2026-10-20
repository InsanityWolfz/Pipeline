import { TICK_RATE } from '../../src/data/config';

// Balance measurements (process rule 4): scripted-bot targets over many seeds are printed
// by `npm run measure`, never asserted. Each measurement logs its per-seed table and records
// a summary row on its test's meta; tests/measure/reporter.ts prints those rows at the end.

/** One measurement's summary row: what it measures, its target, what it came to, and whether the target was met (null: recorded, no target). */
export interface Measured {
  name: string;
  target: string;
  result: string;
  met: boolean | null;
}

declare module 'vitest' {
  interface TaskMeta {
    measure?: Measured;
  }
}

type Cell = string | number | boolean;

/** A plain text table, each column padded to its widest cell. */
export function table(headers: readonly string[], rows: readonly (readonly Cell[])[]): string {
  const text = [headers, ...rows].map((row) => row.map((c) => (typeof c === 'boolean' ? (c ? 'yes' : 'no') : String(c))));
  const widths = headers.map((_, i) => Math.max(...text.map((row) => row[i]?.length ?? 0)));
  const line = (row: readonly string[]): string => row.map((c, i) => c.padEnd(widths[i] ?? 0)).join('  ').trimEnd();
  const [head, ...body] = text;
  return [line(head ?? []), widths.map((w) => '-'.repeat(w)).join('  '), ...body.map(line)].join('\n');
}

/** Logs a measurement's per-seed table under its name and records its summary row on the test's meta. */
export function report(task: { meta: { measure?: Measured } }, measured: Measured, detail: string): void {
  console.log(`${measured.name}\ntarget: ${measured.target}\n${detail}\n=> ${measured.result} (${verdict(measured.met)})\n`);
  task.meta.measure = measured;
}

/** A summary row's verdict. */
export const verdict = (met: boolean | null): string => (met === null ? 'recorded' : met ? 'met' : 'MISSED');

/** Ticks as seconds, one decimal. */
export const seconds = (ticks: number): number => Math.round((ticks / TICK_RATE) * 10) / 10;

/** Seconds as ticks. */
export const ticks = (s: number): number => s * TICK_RATE;

/** The seeds a five-seed measurement runs. */
export const SEEDS = [1, 2, 3, 4, 5] as const;
