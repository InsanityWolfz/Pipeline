// Stop hook: runs `npm run check` and blocks finishing (exit 2) while it fails.
// Skips when there's nothing to check yet, or when only docs/ changed.
import { execSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

function git(args) {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  return r.status === 0 ? r.stdout : '';
}

function changedFiles() {
  const files = new Set();
  for (const line of git(['status', '--porcelain']).split('\n')) {
    const path = line.slice(3).trim();
    if (path) files.add(path.split(' -> ').pop());
  }
  const base = git(['merge-base', 'HEAD', 'origin/main']).trim();
  if (base) {
    for (const path of git(['diff', '--name-only', base, 'HEAD']).split('\n')) {
      if (path) files.add(path);
    }
  }
  return [...files];
}

if (!existsSync(join(root, 'package.json'))) process.exit(0);
if (!changedFiles().some((f) => !f.startsWith('docs/'))) process.exit(0);

try {
  execSync('npm run check', { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
} catch (err) {
  const output = `${err.stdout ?? ''}${err.stderr ?? ''}`.slice(-8000);
  process.stderr.write(`npm run check failed. Fix these before finishing:\n${output}`);
  process.exit(2);
}
