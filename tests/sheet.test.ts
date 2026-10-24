// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import Harness from './fixtures/SheetHarness.svelte';

afterEach(cleanup);

describe('Sheet', () => {
  it('moves focus into the dialog, labels it, and closes on Escape or the scrim', async () => {
    const onclose = vi.fn();
    render(Harness, { onclose });
    const dialog = screen.getByRole('dialog', { name: 'Test sheet' });
    expect(document.activeElement).toBe(dialog);
    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(onclose).toHaveBeenCalledTimes(1);
    await fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onclose).toHaveBeenCalledTimes(2);
  });

  it('keeps Tab inside the dialog', async () => {
    render(Harness, { onclose: () => {} });
    const first = screen.getByRole('button', { name: 'first' });
    const last = screen.getByRole('button', { name: 'last' });
    last.focus();
    await fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
    first.focus();
    await fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
    screen.getByRole('button', { name: 'outside' }).focus();
    await fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
  });
});
