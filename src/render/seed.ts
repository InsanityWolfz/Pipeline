import { DEFAULT_SEED } from '../data/config';

/** Reads `?seed=` from a URL query string, falling back to the default seed. */
export function parseSeed(search: string): number {
  const param = new URLSearchParams(search).get('seed');
  if (param === null || param.trim() === '') return DEFAULT_SEED;
  const value = Number(param);
  // The RNG seeds from 32 bits, so larger values would silently collide.
  return Number.isInteger(value) && value >= 0 && value <= 0xffffffff ? value : DEFAULT_SEED;
}
