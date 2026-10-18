// npm run sound: renders the synth recipes in src/data/sounds.ts into assets/build/sounds.
import { buildSounds } from './sound/build.ts';

try {
  const keys = buildSounds('assets/build/sounds');
  console.log(`Built ${keys.length} sound(s): ${keys.join(', ')}`);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
