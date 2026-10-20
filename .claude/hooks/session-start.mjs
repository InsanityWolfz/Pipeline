// SessionStart hook: installs npm dependencies in Claude Code cloud sessions,
// so the Stop hook's `npm run check` works from the first turn.
// Does nothing on a local machine, where node_modules persists.
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

if (process.env.CLAUDE_CODE_REMOTE !== 'true') process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
if (!existsSync(join(root, 'package.json'))) process.exit(0);

try {
  // npm install, not npm ci: it reuses a cached node_modules.
  execSync('npm install --no-audit --no-fund', { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
} catch (err) {
  process.stderr.write(`npm install failed:\n${`${err.stdout ?? ''}${err.stderr ?? ''}`.slice(-4000)}`);
  process.exit(1);
}
