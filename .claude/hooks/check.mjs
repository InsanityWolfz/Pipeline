// Stop hook: runs `npm run check` and blocks finishing (exit 2) while it fails.
// Skips when there's nothing to check yet, when only docs/ changed, or when the tree is the one it last passed on.
import { execSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
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

/** The commit, uncommitted changes and untracked files' contents, hashed: a talk-only reply leaves it unchanged (2026-10-29). */
function treeKey() {
  const h = createHash('sha256');
  h.update(git(['rev-parse', 'HEAD']));
  h.update(git(['diff', 'HEAD', '--binary']));
  for (const f of git(['ls-files', '--others', '--exclude-standard']).split('\n').filter(Boolean)) {
    h.update(f);
    try {
      h.update(readFileSync(join(root, f)));
    } catch {
      // A file gone mid-read changes nothing worth checking twice.
    }
  }
  return h.digest('hex');
}

const passedFile = join(root, git(['rev-parse', '--git-dir']).trim() || '.git', 'claude-check-passed');
const key = treeKey();
if (existsSync(passedFile) && readFileSync(passedFile, 'utf8') === key) process.exit(0);

try {
  execSync('npm run check', { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
  writeFileSync(passedFile, key);
} catch (err) {
  const output = `${err.stdout ?? ''}${err.stderr ?? ''}`.slice(-8000);
  process.stderr.write(`npm run check failed. Fix these before finishing:\n${output}`);
  process.exit(2);
}
