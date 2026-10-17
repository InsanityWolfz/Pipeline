import { DEFAULT_SEED } from '../data/config';

/** Reads `?seed=` from a URL query string, falling back to the default seed. */
export function parseSeed(search: string): number {
  const value = Number(new URLSearchParams(search).get('seed'));
  return Number.isSafeInteger(value) && value !== 0 ? value : DEFAULT_SEED;
}
