// PostToolUse hook: runs ESLint with autofix on the file Claude just edited.
// Remaining errors are left for the Stop hook's `npm run check`.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

let input = '';
for await (const chunk of process.stdin) input += chunk;

let filePath;
try {
  filePath = JSON.parse(input).tool_input?.file_path;
} catch {
  process.exit(0);
}
if (!filePath || !/\.(ts|tsx|js|mjs)$/.test(filePath)) process.exit(0);

const rel = relative(root, resolve(root, filePath));
if (rel.startsWith('..') || rel.startsWith('node_modules') || !existsSync(resolve(root, rel))) process.exit(0);

spawnSync('npx', ['eslint', '--fix', rel], { cwd: root, stdio: 'ignore', shell: process.platform === 'win32' });
