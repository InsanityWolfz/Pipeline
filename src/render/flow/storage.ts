// Browser storage for the flow (042): every read and write guarded (private windows, blocked site data, a full
// disk). With storage blocked the game plays on with defaults; `storageBlocked()` tells the flow scene, which says so once.

let failed = false;

/** The stored text under `key`, or null (missing, or storage blocked). */
export function readKey(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    failed = true;
    return null;
  }
}

/** Stores `value` under `key`; false when it couldn't (storage full, blocked or missing). */
export function writeKey(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    failed = true;
    return false;
  }
}

export function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    failed = true;
  }
}

/** Whether storage can't be used here: probed once, then any failure since. */
export function storageBlocked(): boolean {
  if (failed) return true;
  const probe = 'pipeline.probe';
  if (!writeKey(probe, '1')) return true;
  removeKey(probe);
  return failed;
}

/** The build these saves and notes come from (042): the branch and commit on CI, "dev" locally and under tests. */
export function buildId(): string {
  const id: unknown = import.meta.env.VITE_BUILD_ID;
  return typeof id === 'string' && id !== '' ? id : 'dev';
}
