// A stand-in for window.localStorage in Vitest (042's stores): a Map, or one that throws, as a blocked browser's does,
// or one that reads but refuses writes, as a full one does (`full`).

export function installStorage(blocked = false, full = false): Map<string, string> {
  const map = new Map<string, string>();
  const fail = (): never => {
    throw new Error('blocked');
  };
  const storage = {
    getItem: (k: string) => (blocked ? fail() : (map.get(k) ?? null)),
    setItem: (k: string, v: string) => (blocked || full ? fail() : void map.set(k, v)),
    removeItem: (k: string) => (blocked ? fail() : void map.delete(k)),
  };
  Object.defineProperty(globalThis, 'window', { value: { localStorage: storage }, configurable: true, writable: true });
  return map;
}
