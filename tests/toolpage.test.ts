// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { db } from '../src/lib/db.ts';
import { app, initSession } from '../src/lib/session.svelte.ts';
import ToolPage from '../src/routes/ToolPage.svelte';

beforeEach(async () => {
  await db.sessions.clear();
  app.session = undefined;
  await initSession();
  location.hash = '';
});
afterEach(cleanup);

const shown = () => document.querySelector('.tres .tbig')?.textContent ?? '';
const history = () => app.session!.toolHistory;

describe('tool page', () => {
  it('rolls on open and Reroll never repeats the result on screen', async () => {
    render(ToolPage, { toolId: 'emotions' });
    let prev = shown();
    expect(prev).not.toBe('');
    for (let i = 0; i < 25; i++) {
      await fireEvent.click(screen.getByRole('button', { name: 'Reroll' }));
      const now = shown();
      expect(now).not.toBe(prev);
      prev = now;
    }
    expect(history()).toHaveLength(0);
  });

  it('leaving logs the result on screen once; rerolls are not logged', async () => {
    const { unmount } = render(ToolPage, { toolId: 'items' });
    await fireEvent.click(screen.getByRole('button', { name: 'Reroll' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Reroll' }));
    const last = shown();
    unmount();
    expect(history()).toHaveLength(1);
    expect(history()[0]).toMatchObject({ tool: 'items', label: 'Items', text: last });
  });

  it('the check button logs once, even though leaving also unmounts', async () => {
    const { unmount } = render(ToolPage, { toolId: 'items' });
    const last = shown();
    await fireEvent.click(screen.getByRole('button', { name: 'Keep result' }));
    unmount();
    expect(history()).toHaveLength(1);
    expect(history()[0]!.text).toBe(last);
    expect(location.hash).toBe('#/tools');
  });

  it('remembers modifiers and rerolls when one changes', async () => {
    render(ToolPage, { toolId: 'names' });
    await fireEvent.click(screen.getByRole('button', { name: 'Female' }));
    expect(app.session!.toolModifiers.names).toMatchObject({ gender: 'f' });
    expect(screen.getByRole('button', { name: 'Female' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('family name order re-orders the shown name without rerolling', async () => {
    render(ToolPage, { toolId: 'names' });
    await fireEvent.click(screen.getByRole('button', { name: 'Samurai' }));
    const lastGroup = screen.getByRole('list', { name: 'Last name' });
    await fireEvent.click(lastGroup.querySelectorAll('button')[1]!);
    const box = screen.getByRole('checkbox') as HTMLInputElement;
    expect(box.checked).toBe(true);
    const parts = () => [...document.querySelectorAll('.tres .tbig span')].map(s => s.textContent);
    const before = parts();
    expect(before).toHaveLength(3);
    expect(document.querySelector('.tres .tbig span.ul')).toBe(document.querySelectorAll('.tres .tbig span')[0]);
    await fireEvent.click(box);
    const after = parts();
    expect(after.join('')).not.toBe(before.join(''));
    expect([...after].sort()).toEqual([...before].sort());
    expect(document.querySelectorAll('.tres .tbig span')[2]).toBe(document.querySelector('.tres .tbig span.ul'));
  });

  it('follow-up on adds a description without changing the name; New description changes only it', async () => {
    render(ToolPage, { toolId: 'names' });
    const base = () => document.querySelector('.tres .tbig span')?.textContent;
    const name = base();
    const group = screen.getByRole('list', { name: 'Description' });
    await fireEvent.click(group.querySelectorAll('button')[1]!);
    expect(base()).toBe(name);
    const x = () => document.querySelector('.xtra')?.textContent;
    const first = x();
    expect(first).toMatch(/^ — .+/);
    await fireEvent.click(screen.getByRole('button', { name: /New description/ }));
    expect(x()).not.toBe(first);
    expect(base()).toBe(name);
  });

  it('shows the file to edit for an empty list', () => {
    render(ToolPage, { toolId: 'complication' });
    expect(document.body.textContent).toContain('content/tools/complications.json');
    expect((screen.getByRole('button', { name: 'Reroll' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('letter sheet disables letters with no matching entries', async () => {
    render(ToolPage, { toolId: 'names' });
    await fireEvent.click(screen.getByRole('button', { name: /Starting letter/ }));
    const dialog = screen.getByRole('dialog');
    const letters = [...dialog.querySelectorAll<HTMLButtonElement>('.letters button:not(.any)')];
    expect(letters).toHaveLength(26);
    expect(letters.some(b => b.disabled)).toBe(true);
    expect(letters.some(b => !b.disabled)).toBe(true);
  });

  it('unknown tools say so', () => {
    render(ToolPage, { toolId: 'nope' });
    expect(document.body.textContent).toContain('No tool with id');
  });
});
