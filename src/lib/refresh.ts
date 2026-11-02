/** Delete every Cache Storage entry and unregister the service workers, so the next load fetches the latest build. Sessions and settings (IndexedDB, localStorage) are untouched. */
export async function clearAppCache(): Promise<void> {
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  }
  if ('caches' in globalThis) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
}

/** Counts taps and fires `onDone` on the nth tap in a row; a pause longer than `windowMs` starts the count again. */
export function tapCounter(n: number, onDone: () => void, windowMs = 1500, now: () => number = Date.now) {
  let count = 0;
  let last = 0;
  return () => {
    const t = now();
    count = t - last > windowMs ? 1 : count + 1;
    last = t;
    if (count >= n) {
      count = 0;
      onDone();
    }
  };
}
