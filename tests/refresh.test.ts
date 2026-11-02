import { describe, expect, it, vi } from 'vitest';
import { clearAppCache, tapCounter } from '../src/lib/refresh.ts';

describe('tapCounter', () => {
  it('fires on the third tap in a row, then starts over', () => {
    let t = 0;
    const done = vi.fn();
    const tap = tapCounter(3, done, 1500, () => t);
    tap(); t += 100; tap();
    expect(done).not.toHaveBeenCalled();
    t += 100; tap();
    expect(done).toHaveBeenCalledTimes(1);
    t += 100; tap();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('restarts the count after a pause', () => {
    let t = 0;
    const done = vi.fn();
    const tap = tapCounter(3, done, 1500, () => t);
    tap(); t += 100; tap(); t += 5000; tap(); t += 100; tap();
    expect(done).not.toHaveBeenCalled();
    t += 100; tap();
    expect(done).toHaveBeenCalledTimes(1);
  });
});

describe('clearAppCache', () => {
  it('unregisters service workers and deletes every cache', async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    const del = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('navigator', { serviceWorker: { getRegistrations: async () => [{ unregister }, { unregister }] } });
    vi.stubGlobal('caches', { keys: async () => ['a', 'b', 'c'], delete: del });
    await clearAppCache();
    expect(unregister).toHaveBeenCalledTimes(2);
    expect(del.mock.calls.map((c) => c[0])).toEqual(['a', 'b', 'c']);
    vi.unstubAllGlobals();
  });
});
