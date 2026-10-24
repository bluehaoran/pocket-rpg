import { describe, expect, it, vi } from 'vitest';
import { buzz, createWakeLock } from '../src/lib/device.ts';

function fakes(visible = true) {
  const released: (() => void)[] = [];
  const sentinel = () => ({
    release: vi.fn(async () => {}),
    addEventListener: (_: 'release', fn: () => void) => void released.push(fn)
  });
  const request = vi.fn(async () => sentinel());
  const listeners: (() => void)[] = [];
  const doc = {
    visibilityState: visible ? 'visible' : 'hidden',
    addEventListener: (_: 'visibilitychange', fn: () => void) => void listeners.push(fn),
    removeEventListener: () => {}
  };
  return { nav: { wakeLock: { request } }, doc, request, released, fire: () => listeners.forEach(f => f()) };
}
const tick = () => new Promise(r => setTimeout(r, 0));

describe('buzz', () => {
  it('does nothing without navigator.vibrate', () => {
    expect(() => buzz()).not.toThrow();
  });
});

describe('wake lock', () => {
  it('requests once while wanted and releases when not', async () => {
    const f = fakes();
    const w = createWakeLock(f.nav, f.doc);
    w.set(true);
    w.set(true);
    await tick();
    expect(f.request).toHaveBeenCalledTimes(1);
    w.set(false);
  });

  it('re-requests when the page becomes visible after a release', async () => {
    const f = fakes();
    const w = createWakeLock(f.nav, f.doc);
    w.set(true);
    await tick();
    f.released[0]!();
    f.fire();
    await tick();
    expect(f.request).toHaveBeenCalledTimes(2);
  });

  it('does not request while hidden or when unwanted', async () => {
    const f = fakes(false);
    const w = createWakeLock(f.nav, f.doc);
    w.set(true);
    await tick();
    expect(f.request).not.toHaveBeenCalled();
    f.doc.visibilityState = 'visible';
    w.set(false);
    f.fire();
    await tick();
    expect(f.request).not.toHaveBeenCalled();
  });

  it('is a no-op without the API or when the request is denied', async () => {
    const w = createWakeLock({}, fakes().doc);
    expect(() => w.set(true)).not.toThrow();
    const f = fakes();
    f.request.mockRejectedValueOnce(new Error('denied'));
    createWakeLock(f.nav, f.doc).set(true);
    await tick();
  });
});
