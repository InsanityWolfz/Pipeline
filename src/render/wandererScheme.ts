import { WANDERER_SCHEME, WANDERER_SCHEMES, type WandererSchemeId } from '../data/art/wanderer';

// 075: `?scheme=cobalt`, `?scheme=rust` or `?scheme=bone` swaps the wanderer's colour scheme at boot, to compare them
// in the preview build. A dev and preview convenience only: render reads it, the sim never does. A missing or bad
// value reads as the default.

export function schemeFromQuery(search: string): WandererSchemeId {
  const want = new URLSearchParams(search).get('scheme');
  return want !== null && Object.hasOwn(WANDERER_SCHEMES, want) ? (want as WandererSchemeId) : WANDERER_SCHEME;
}

/** The scheme this page asks for (the default outside a browser). */
export function activeScheme(): WandererSchemeId {
  return typeof window === 'undefined' ? WANDERER_SCHEME : schemeFromQuery(window.location.search);
}
