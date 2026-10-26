// Device features that may be missing: vibration (not on iOS) and Screen Wake Lock (older browsers).

/** Short haptic tick for a result. No-op where unsupported. */
export function buzz(ms = 12): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // Vibration can throw when blocked by permissions policy.
  }
}

interface Sentinel {
  release(): Promise<void>;
  addEventListener(type: 'release', fn: () => void): void;
}
interface WakeNav {
  wakeLock?: { request(type: 'screen'): Promise<Sentinel> };
}
interface WakeDoc {
  visibilityState: string;
  addEventListener(type: 'visibilitychange', fn: () => void): void;
  removeEventListener(type: 'visibilitychange', fn: () => void): void;
}

/**
 * Keeps the screen on while `set(true)` is in force. The browser drops the lock when the page is hidden,
 * so it is requested again when the page becomes visible.
 */
export function createWakeLock(nav: WakeNav = navigator, doc: WakeDoc = document) {
  let wanted = false;
  let sentinel: Sentinel | null = null;
  let pending = false;

  async function acquire() {
    if (sentinel || pending || !wanted || !nav.wakeLock || doc.visibilityState !== 'visible') return;
    pending = true;
    try {
      const s = await nav.wakeLock.request('screen');
      if (!wanted) {
        await s.release();
        return;
      }
      sentinel = s;
      s.addEventListener('release', () => {
        if (sentinel === s) sentinel = null;
      });
    } catch {
      // Denied (e.g. low battery). The screen just times out as usual.
    } finally {
      pending = false;
    }
  }

  doc.addEventListener('visibilitychange', acquire);

  return {
    set(on: boolean) {
      wanted = on;
      if (on) void acquire();
      else {
        const s = sentinel;
        sentinel = null;
        void s?.release().catch(() => {});
      }
    },
    dispose() {
      this.set(false);
      doc.removeEventListener('visibilitychange', acquire);
    }
  };
}

/** Offers `data` as a downloaded JSON file. Works offline: a Blob URL and a click on a temporary link. */
export function downloadJson(name: string, data: unknown): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
