// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { longpress } from '../src/lib/longpress.ts';

let node: HTMLElement;
let fn: Mock<() => void>;
let action: { destroy(): void };
const ptr = (type: string, init: Record<string, unknown> = {}) =>
  node.dispatchEvent(Object.assign(new Event(type, { bubbles: true, cancelable: true }), { pointerType: 'touch', button: 0, clientX: 0, clientY: 0 }, init));

beforeEach(() => {
  vi.useFakeTimers();
  node = document.createElement('span');
  fn = vi.fn<() => void>();
  action = longpress(node, fn);
});
afterEach(() => {
  action.destroy();
  vi.useRealTimers();
});

describe('longpress', () => {
  it('fires after holding, once', () => {
    ptr('pointerdown');
    vi.advanceTimersByTime(499);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(fn).toHaveBeenCalledTimes(1);
    ptr('pointerup');
    vi.advanceTimersByTime(2000);
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it('does not fire on a quick tap, a drag, or a cancelled press', () => {
    ptr('pointerdown');
    vi.advanceTimersByTime(200);
    ptr('pointerup');
    vi.advanceTimersByTime(1000);
    ptr('pointerdown');
    ptr('pointermove', { clientX: 30 });
    vi.advanceTimersByTime(1000);
    ptr('pointerdown');
    ptr('pointercancel');
    vi.advanceTimersByTime(1000);
    expect(fn).not.toHaveBeenCalled();
  });
  it('ignores a right mouse button press but opens on the context menu event, and stops the browser menu', () => {
    ptr('pointerdown', { pointerType: 'mouse', button: 2 });
    vi.advanceTimersByTime(1000);
    expect(fn).not.toHaveBeenCalled();
    const ev = new Event('contextmenu', { bubbles: true, cancelable: true });
    node.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it('opens once when a long press fires both the timer and contextmenu', () => {
    ptr('pointerdown');
    vi.advanceTimersByTime(600);
    node.dispatchEvent(new Event('contextmenu', { bubbles: true, cancelable: true }));
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it('opens on Enter and Space', () => {
    node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    node.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    node.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
