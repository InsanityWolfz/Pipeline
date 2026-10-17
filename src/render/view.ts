import { VIEWS, type ViewMode } from '../data/assets';

export type { ViewMode };

/** Reads `?view=34|top` from a URL query string, defaulting to three-quarter. */
export function parseView(search: string): ViewMode {
  const param = new URLSearchParams(search).get('view');
  return VIEWS.find((v) => v === param) ?? '34';
}

export function otherView(view: ViewMode): ViewMode {
  return view === '34' ? 'top' : '34';
}
