// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { db } from '../src/lib/db.ts';
import { app, initSession } from '../src/lib/session.svelte.ts';
import History from '../src/routes/History.svelte';

const t = new Date().toISOString();
beforeEach(async () => {
  await db.sessions.clear();
  app.session = undefined;
  await initSession();
  app.session!.toolHistory = [{ t, tool: 'items', label: 'Items', text: 'a lantern' }, { t, tool: 'names', label: 'Names', text: 'Kade' }];
  app.session!.trackHistory = [{ t, kind: 'roll', text: 'Lasers 1d6' }];
});
afterEach(cleanup);
const click = (el: HTMLElement) => fireEvent.click(el);

describe('Clear history', () => {
  it('needs two taps, then clears only this history', async () => {
    render(History, { which: 'tools' });
    expect(document.querySelectorAll('.hrow')).toHaveLength(2);
    await click(screen.getByRole('button', { name: 'Clear history' }));
    expect(app.session!.toolHistory).toHaveLength(2);
    await click(screen.getByRole('button', { name: 'Tap again to clear' }));
    expect(app.session!.toolHistory).toEqual([]);
    expect(app.session!.trackHistory).toHaveLength(1);
    expect(document.querySelectorAll('.hrow')).toHaveLength(0);
    expect((screen.getByRole('button', { name: 'Clear history' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('clears Track history from the Track screen', async () => {
    render(History, { which: 'track' });
    await click(screen.getByRole('button', { name: 'Clear history' }));
    await click(screen.getByRole('button', { name: 'Tap again to clear' }));
    expect(app.session!.trackHistory).toEqual([]);
    expect(app.session!.toolHistory).toHaveLength(2);
  });
});
