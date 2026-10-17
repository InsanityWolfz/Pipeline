// npm run art: renders assets/sprites/*.txt into assets/build.
import { buildArt } from './art/build.ts';

try {
  const names = buildArt('assets/sprites', 'assets/build');
  console.log(`Built ${names.length} frame(s): ${names.join(', ')}`);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
