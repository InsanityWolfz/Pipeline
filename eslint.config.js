import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'test-results/', 'playwright-report/', 'assets/build/', '.claude/worktrees/'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: { '@typescript-eslint/no-explicit-any': 'error' },
  },
  {
    // The sim is pure and deterministic: no Phaser, no render code, no real time or Math.random.
    files: ['src/sim/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['phaser', 'phaser/*', '**/render/**'], message: 'src/sim must not import Phaser or render code.' }] },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use the seeded RNG in src/sim/rng.ts.' },
        { object: 'Date', property: 'now', message: 'The sim advances by fixed ticks, never real time.' },
        { object: 'performance', property: 'now', message: 'The sim advances by fixed ticks, never real time.' },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: "NewExpression[callee.name='Date']", message: 'The sim advances by fixed ticks, never real time.' },
      ],
    },
  },
);
