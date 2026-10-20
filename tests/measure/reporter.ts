import type { Reporter, TestModule } from 'vitest/node';
import { table, verdict, type Measured } from './report';

/** Prints every measurement's summary row after the run, as one table (the per-seed tables are in each test's log above). */
export default class MeasureReporter implements Reporter {
  onTestRunEnd(modules: ReadonlyArray<TestModule>): void {
    const rows: Measured[] = [];
    for (const m of modules) {
      for (const t of m.children.allTests()) {
        const got = t.meta().measure;
        if (got) rows.push(got);
      }
    }
    if (rows.length === 0) return;
    const missed = rows.filter((r) => r.met === false).length;
    const targets = rows.filter((r) => r.met !== null).length;
    console.log(`\nBalance measurements (report only; a missed target doesn't fail the run)\n`);
    console.log(table(['measurement', 'target', 'result', 'verdict'], rows.map((r) => [r.name, r.target, r.result, verdict(r.met)])));
    console.log(`\n${targets - missed} of ${targets} targets met, ${rows.length - targets} recorded without a target.\n`);
  }
}
